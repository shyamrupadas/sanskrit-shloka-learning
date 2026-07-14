import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type pg from "pg";

import type { DatabaseService } from "../database/database.service.js";
import { PostgresUserLibraryRepository } from "./postgres-user-library.repository.js";

describe("PostgresUserLibraryRepository", () => {
  test("runs status writes as retryable idempotent database writes", async () => {
    const database = new WriteTrackingDatabase();
    const repository = new PostgresUserLibraryRepository(database as unknown as DatabaseService);

    await repository.setShlokaStatus({
      accountId: "account-1",
      createdAt: new Date("2026-07-12T09:00:00.000Z"),
      shlokaCode: "bg-1-1",
      status: "learning",
    });
    await repository.clearShlokaStatus({
      accountId: "account-1",
      shlokaCode: "bg-1-1",
    });

    assert.equal(database.directQueries.length, 0);
    assert.equal(database.idempotentWriteQueries.length, 2);
    assert.ok(database.idempotentWriteQueries[0]?.includes("insert into user_shlokas"));
    assert.ok(database.idempotentWriteQueries[1]?.includes("delete from user_shlokas"));
    assert.ok(database.idempotentWriteQueries[1]?.includes("status = 'learning'"));
  });

  test("stores the reviewing transition time without overwriting it on retries", async () => {
    const learnedAt = new Date("2026-07-12T09:30:00.000Z");
    const database = new WriteTrackingDatabase([
      {
        reviewing_started_at: learnedAt,
        reviewing_started_user_day: "2026-07-12",
        transitioned: true,
      },
    ]);
    const repository = new PostgresUserLibraryRepository(database as unknown as DatabaseService);

    const transition = await repository.markShlokaLearned({
      accountId: "account-1",
      reviewingStartedAt: learnedAt,
      reviewingStartedUserDay: "2026-07-12",
      shlokaCode: "bg-1-1",
    });

    assert.deepEqual(transition, {
      kind: "transitioned",
      reviewingStartedAt: learnedAt,
      reviewingStartedUserDay: "2026-07-12",
    });
    assert.ok(database.idempotentWriteQueries[0]?.includes("status = 'reviewing'"));
    assert.ok(database.idempotentWriteQueries[0]?.includes("reviewing_started_at = $3"));
    assert.ok(
      database.idempotentWriteQueries[0]?.includes(
        "reviewing_started_user_day = $4::date",
      ),
    );
    assert.ok(database.idempotentWriteQueries[0]?.includes("status = 'learning'"));
    assert.deepEqual(database.idempotentWriteValues[0], [
      "account-1",
      "bg-1-1",
      learnedAt,
      "2026-07-12",
    ]);
  });

  test("reads the persisted learning activity day for streak calculation", async () => {
    const learnedAt = new Date("2026-07-12T00:30:00.000Z");
    const database = {
      fastReadQuery: async (sql: string, values: readonly unknown[]) => {
        assert.match(sql, /reviewing_started_user_day::text/);
        assert.deepEqual(values, ["account-1"]);
        return result([
          {
            created_at: new Date("2026-07-01T00:00:00.000Z"),
            reviewing_started_at: learnedAt,
            reviewing_started_user_day: "2026-07-11",
            shloka_code: "bg-1-1",
            status: "reviewing",
          },
        ]);
      },
    } as unknown as DatabaseService;
    const repository = new PostgresUserLibraryRepository(database);

    assert.deepEqual(await repository.listShlokaStatuses("account-1"), [
      {
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        reviewingStartedAt: learnedAt,
        reviewingStartedUserDay: "2026-07-11",
        shlokaCode: "bg-1-1",
        status: "reviewing",
      },
    ]);
  });
});

class WriteTrackingDatabase {
  readonly directQueries: string[] = [];
  readonly idempotentWriteQueries: string[] = [];
  readonly idempotentWriteValues: unknown[][] = [];

  constructor(
    private readonly idempotentRows: Array<Record<string, unknown>> = [],
  ) {}

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    _values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.directQueries.push(normalizeQuery(text));
    return result<Row>([]);
  }

  async idempotentWriteQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.idempotentWriteQueries.push(normalizeQuery(text));
    this.idempotentWriteValues.push([...values]);
    return result<Row>(this.idempotentRows.splice(0) as unknown as Row[]);
  }
}

function normalizeQuery(text: string): string {
  return text.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function result<Row extends pg.QueryResultRow>(rows: Row[]): pg.QueryResult<Row> {
  return {
    command: "",
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows,
  };
}
