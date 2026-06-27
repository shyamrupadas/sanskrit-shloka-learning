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
  });
});

class WriteTrackingDatabase {
  readonly directQueries: string[] = [];
  readonly idempotentWriteQueries: string[] = [];

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    _values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.directQueries.push(normalizeQuery(text));
    return result<Row>([]);
  }

  async idempotentWriteQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    _values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.idempotentWriteQueries.push(normalizeQuery(text));
    return result<Row>([]);
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
