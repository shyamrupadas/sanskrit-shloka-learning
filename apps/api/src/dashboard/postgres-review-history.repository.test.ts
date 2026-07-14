import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type pg from "pg";

import type { DatabaseService } from "../database/database.service.js";
import { PostgresReviewHistoryRepository } from "./postgres-review-history.repository.js";
import type { ReviewHistoryRecord } from "./review-history.repository.js";

describe("PostgresReviewHistoryRepository", () => {
  test("persists every completed review field", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const database = {
      idempotentWriteQuery: async (sql: string, values: readonly unknown[]) => {
        calls.push({ sql, values });
        return emptyQueryResult();
      },
    } as unknown as DatabaseService;
    const repository = new PostgresReviewHistoryRepository(database);
    const record = {
      accountId: "account-1",
      completedAt: new Date("2026-07-12T00:30:00.000Z"),
      id: "review-1",
      result: "remembered_with_hint",
      shlokaCode: "gita-1-1",
      userDay: "2026-07-11",
    } satisfies ReviewHistoryRecord;

    await repository.create(record);

    assert.equal(calls.length, 1);
    assert.match(calls[0]?.sql ?? "", /insert into shloka_reviews/);
    assert.deepEqual(calls[0]?.values, [
      record.id,
      record.accountId,
      record.shlokaCode,
      record.completedAt,
      record.userDay,
      record.result,
    ]);
  });

  test("returns distinct local activity days for streak calculation", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const database = {
      fastReadQuery: async (sql: string, values: readonly unknown[]) => {
        calls.push({ sql, values });
        return {
          ...emptyQueryResult(),
          rows: [{ user_day: "2026-07-12" }, { user_day: "2026-07-11" }],
        };
      },
    } as unknown as DatabaseService;
    const repository = new PostgresReviewHistoryRepository(database);

    assert.deepEqual(await repository.listActivityDays("account-1"), [
      "2026-07-12",
      "2026-07-11",
    ]);
    assert.match(calls[0]?.sql ?? "", /select distinct user_day::text/);
    assert.deepEqual(calls[0]?.values, ["account-1"]);
  });
});

function emptyQueryResult(): pg.QueryResult {
  return {
    command: "INSERT",
    fields: [],
    oid: 0,
    rowCount: 1,
    rows: [],
  };
}
