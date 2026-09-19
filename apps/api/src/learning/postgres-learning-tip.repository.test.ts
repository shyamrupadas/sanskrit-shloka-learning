import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import type pg from "pg";

import { DatabaseService } from "../database/database.service.js";
import { PostgresLearningTipRepository } from "./postgres-learning-tip.repository.js";

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
