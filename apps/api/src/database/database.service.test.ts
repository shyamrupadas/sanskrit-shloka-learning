import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, test } from "node:test";

import type pg from "pg";

import { DatabaseService } from "./database.service.js";

describe("DatabaseService transaction", () => {
  test("commits and releases a successful transaction", async () => {
    const { client, transaction } = transactionHarness();

    const result = await transaction(async (executor) => {
      await executor.query("select 1");
      return "created";
    });

    assert.equal(result, "created");
    assert.deepEqual(client.queries, ["begin", "select 1", "commit"]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
    assert.equal(client.listenerCount("error"), 0);
  });

  test("rolls back operation errors and keeps the client reusable", async () => {
    const { client, transaction } = transactionHarness();
    const operationError = new Error("write failed");

    await assert.rejects(
      transaction(async (executor) => {
        await executor.query("insert into shloka_sources");
        throw operationError;
      }),
      (error) => error === operationError,
    );

    assert.deepEqual(client.queries, ["begin", "insert into shloka_sources", "rollback"]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
    assert.equal(client.listenerCount("error"), 0);
  });

  test("releases checked-out clients as broken when the connection emits an error", async () => {
    const connectionError = new Error("Connection terminated unexpectedly");
    const { client, logger, transaction } = transactionHarness(
      new FakePoolClient({ connectionErrorOnQuery: { query: "select disconnect", error: connectionError } }),
    );

    await assert.rejects(
      transaction(async (executor) => {
        await executor.query("select disconnect");
      }),
      (error) => error === connectionError,
    );

    assert.deepEqual(client.queries, ["begin", "select disconnect"]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, connectionError);
    assert.deepEqual(logger.warnings, ["PostgreSQL transaction client error: Connection terminated unexpectedly"]);
    assert.equal(client.listenerCount("error"), 0);
  });

  test("throws the original operation error when rollback fails", async () => {
    const operationError = new Error("operation failed");
    const rollbackError = new Error("rollback failed");
    const { client, transaction } = transactionHarness(
      new FakePoolClient({ queryErrors: new Map([["rollback", rollbackError]]) }),
    );

    await assert.rejects(
      transaction(async () => {
        throw operationError;
      }),
      (error) => error === operationError,
    );

    assert.deepEqual(client.queries, ["begin", "rollback"]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, rollbackError);
    assert.equal(client.listenerCount("error"), 0);
  });
});

function transactionHarness(client = new FakePoolClient()) {
  const logger = new FakeLogger();
  const database = {
    logger,
    pool: {
      connect: async () => client,
    },
  } as unknown as DatabaseService;

  return {
    client,
    logger,
    transaction: DatabaseService.prototype.transaction.bind(database),
  };
}

class FakeLogger {
  readonly warnings: string[] = [];

  warn(message: string): void {
    this.warnings.push(message);
  }
}

class FakePoolClient extends EventEmitter {
  readonly queries: string[] = [];
  released = false;
  releaseError: Error | boolean | undefined;

  constructor(
    private readonly options: {
      connectionErrorOnQuery?: { query: string; error: Error };
      queryErrors?: Map<string, Error>;
    } = {},
  ) {
    super();
  }

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(text: string): Promise<pg.QueryResult<Row>> {
    const query = normalizeQuery(text);
    this.queries.push(query);

    if (this.options.connectionErrorOnQuery?.query === query) {
      this.emit("error", this.options.connectionErrorOnQuery.error);
      throw this.options.connectionErrorOnQuery.error;
    }

    const queryError = this.options.queryErrors?.get(query);
    if (queryError) {
      throw queryError;
    }

    return result([]);
  }

  release(error?: Error | boolean): void {
    this.released = true;
    this.releaseError = error;
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
