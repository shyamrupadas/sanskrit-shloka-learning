import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";

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
