import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import type pg from "pg";

import { DatabaseService } from "../database/database.service.js";
import { PostgresLearningTipRepository } from "./postgres-learning-tip.repository.js";

test("moves adjacent tips in both directions under the append lock and rolls back failures", async () => {
  const { repository, failNextRead } = tipDatabase();
  const original = await repository.list("ru");
  assert.equal(await repository.move("missing", "up"), "not-found");
  assert.equal(await repository.move("first", "up"), "edge");
  assert.equal(await repository.move("last", "down"), "edge");
  assert.deepEqual(await repository.move("first", "down"), [original[1], original[0], original[2]]);
  assert.deepEqual(await repository.list("ru"), [original[1], original[0], original[2]]);
  assert.deepEqual(await repository.move("first", "up"), original);
  failNextRead();
  await assert.rejects(repository.move("last", "up"), /read failed/);
  assert.deepEqual(await repository.list("ru"), original);
});

test("deletes all translations atomically, preserves survivor order and permits deleting the last tip", async () => {
  const { repository, failNextRead } = tipDatabase();
  const original = await repository.list("ru");
  const english = await repository.list("en");
  failNextRead();
  await assert.rejects(repository.delete("middle"), /read failed/);
  assert.deepEqual(await repository.list("ru"), original);
  assert.deepEqual(await repository.list("en"), english);
  assert.equal(await repository.delete("missing"), undefined);
  assert.deepEqual(await repository.delete("middle"), [original[0], original[2]]);
  assert.deepEqual(await repository.list("en"), [english[0], english[2]]);
  await repository.delete("first");
  assert.deepEqual(await repository.delete("last"), []);
  assert.deepEqual(await repository.list("ru"), []);
  assert.deepEqual(await repository.list("en"), []);
});

// Model transaction visibility and the existing FK cascade at the executor boundary.
function tipDatabase() {
  let tips = ["first", "middle", "last"].map((id, index) => ({ id, sort_order: index * 10 }));
  let translations = tips.flatMap(({ id }) => ["ru", "en"].map((locale) => ({ tip_id: id, locale, title: `${id} ${locale}`, text: `Text ${id}` })));
  let snapshot: { tips: typeof tips; translations: typeof translations } | undefined;
  let locked = false;
  let failRead = false;
  const client = {
    on() {}, off() {}, release() {},
    async query(input: string | pg.QueryConfig, values: readonly unknown[] = []) {
      const sql = typeof input === "string" ? input : input.text;
      values = typeof input === "string" ? values : input.values ?? [];
      if (sql === "begin") snapshot = structuredClone({ tips, translations });
      else if (sql === "commit") { snapshot = undefined; locked = false; }
      else if (sql === "rollback") { ({ tips, translations } = snapshot!); snapshot = undefined; locked = false; }
      else if (sql === "lock table learning_tips in exclusive mode") { assert.ok(snapshot); locked = true; }
      else if (sql.includes("select id, sort_order")) {
        assert.ok(locked, "read positions only after acquiring the shared append/move/delete lock");
        assert.match(sql, /order by sort_order, id/);
        return { rows: structuredClone([...tips].sort((a, b) => a.sort_order - b.sort_order)) };
      } else if (sql.includes("update learning_tips")) {
        assert.ok(locked);
        // Untyped CASE results resolve to text in PostgreSQL, incompatible with sort_order.
        assert.match(sql, /case id when \$1 then \$4::integer when \$2 then \$3::integer end/);
        assert.match(sql, /where id in \(\$1, \$2\)/);
        tips.find((tip) => tip.id === values[0])!.sort_order = values[3] as number;
        tips.find((tip) => tip.id === values[1])!.sort_order = values[2] as number;
      } else if (sql.includes("delete from learning_tips")) {
        assert.ok(locked);
        assert.match(sql, /where id = \$1 returning id/);
        const deleted = tips.filter((tip) => tip.id === values[0]);
        tips = tips.filter((tip) => tip.id !== values[0]);
        translations = translations.filter((translation) => translation.tip_id !== values[0]);
        return { rows: deleted };
      } else if (sql.includes("join learning_tip_translations")) {
        if (failRead) { failRead = false; throw new Error("read failed"); }
        return { rows: [...tips].sort((a, b) => a.sort_order - b.sort_order).flatMap((tip) => translations
          .filter((translation) => translation.tip_id === tip.id && translation.locale === values[0])
          .map(({ title, text }) => ({ id: tip.id, title, text }))) };
      } else throw new Error(`Unexpected query: ${sql}`);
      return { rows: [] };
    },
  };
  const database = new DatabaseService({ on() {}, query: client.query, connect: async () => client } as unknown as pg.Pool);
  return { repository: new PostgresLearningTipRepository(database), failNextRead: () => { failRead = true; } };
}

test("reads only the requested translation in stable global order", async () => {
  const items = [{ id: "stable-id", title: "Совет", text: "Текст" }];
  const database = {
    async readQuery(sql: string, values: unknown[]) {
      assert.match(sql, /join learning_tip_translations translation on translation.tip_id = tip.id/);
      assert.match(sql, /where translation.locale = \$1/);
      assert.match(sql, /order by tip.sort_order, tip.id/);
      assert.deepEqual(values, ["ru"]);
      return { rows: items };
    },
  } as unknown as DatabaseService;
  assert.deepEqual(await new PostgresLearningTipRepository(database).list("ru"), items);
});

test("appends a tip and its Russian version in one transaction, rolling back failed translation writes", async () => {
  for (const failTranslation of [false, true]) {
    const calls: string[] = [];
    const body = { title: "Совет", text: "Строка\n\nТекст" };
    let createdId: unknown;
    const client = {
      on() {}, off() {}, release() {},
      async query(sql: string, values: unknown[] = []) {
        calls.push(sql);
        if (sql.includes("insert into learning_tips")) {
          assert.ok(calls.some((query) => /lock table learning_tips in exclusive mode/.test(query)));
          assert.match(sql, /coalesce\(max\(sort_order\), -1\) \+ 1/);
          createdId = values[0];
          assert.equal(typeof createdId, "string");
        }
        if (sql.includes("insert into learning_tip_translations")) {
          assert.deepEqual(values, [createdId, "ru", body.title, body.text]);
          if (failTranslation) throw new Error("translation failed");
        }
        return { rows: [] };
      },
    };
    const database = new DatabaseService({ on() {}, connect: async () => client } as unknown as pg.Pool);
    const repository = new PostgresLearningTipRepository(database);
    if (failTranslation) {
      await assert.rejects(repository.create(body), /translation failed/);
      assert.equal(calls.at(-1), "rollback");
      assert.ok(!calls.includes("commit"));
    } else {
      assert.deepEqual(await repository.create(body), { id: createdId, ...body });
      assert.equal(calls.at(-1), "commit");
    }
    assert.equal(calls[0], "begin");
  }
});

test("updates title and text together in one statement and reports missing tips", async () => {
  const body = { title: "Изменённый", text: "Новый текст" };
  let rows = [{ id: "tip", ...body }];
  const database = {
    async writeQuery(sql: string, values: unknown[]) {
      assert.match(sql, /update learning_tip_translations/);
      assert.match(sql, /set title = \$3, text = \$4/);
      assert.match(sql, /where tip_id = \$1 and locale = \$2/);
      assert.deepEqual(values, ["tip", "ru", body.title, body.text]);
      return { rows };
    },
  } as unknown as DatabaseService;
  const repository = new PostgresLearningTipRepository(database);
  assert.deepEqual(await repository.update("tip", body), rows[0]);
  rows = [];
  assert.equal(await repository.update("tip", body), undefined);
});
