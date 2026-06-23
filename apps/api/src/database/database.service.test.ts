import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, test } from "node:test";

import type pg from "pg";

import { DatabaseService } from "./database.service.js";

describe("DatabaseService readQuery", () => {
  test("retries transient connection errors once", async () => {
    const connectionError = new Error("Connection terminated unexpectedly");
    const pool = new FakeQueryPool([connectionError, result([{ value: "ok" }])]);
    const { logger, readQuery } = readQueryHarness(pool);

    const queryResult = await readQuery<{ value: string }>("select 1", ["input"]);

    assert.deepEqual(queryResult.rows, [{ value: "ok" }]);
    assert.deepEqual(pool.queries, ["select 1", "select 1"]);
    assert.deepEqual(pool.values, [["input"], ["input"]]);
    assert.deepEqual(logger.warnings, [
      "Retrying read-only PostgreSQL query after transient connection error: Connection terminated unexpectedly",
    ]);
  });

  test("does not retry ordinary query calls", async () => {
    const connectionError = new Error("Connection terminated unexpectedly");
    const pool = new FakeQueryPool([connectionError, result([{ value: "ok" }])]);
    const { query } = readQueryHarness(pool);

    await assert.rejects(query("select 1"), (error) => error === connectionError);

    assert.deepEqual(pool.queries, ["select 1"]);
  });

  test("does not retry non-transient read errors", async () => {
    const queryError = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const pool = new FakeQueryPool([queryError, result([{ value: "ok" }])]);
    const { logger, readQuery } = readQueryHarness(pool);

    await assert.rejects(readQuery("select missing_table"), (error) => error === queryError);

    assert.deepEqual(pool.queries, ["select missing_table"]);
    assert.deepEqual(logger.warnings, []);
  });

  test("does not retry query read timeouts", async () => {
    const queryTimeoutError = new Error("Query read timeout");
    const pool = new FakeQueryPool([queryTimeoutError, result([{ value: "ok" }])]);
    const { logger, readQuery } = readQueryHarness(pool);

    await assert.rejects(readQuery("select slow"), (error) => error === queryTimeoutError);

    assert.deepEqual(pool.queries, ["select slow"]);
    assert.deepEqual(logger.warnings, []);
  });

  test("retries fast read query timeouts once with a short per-query timeout", async () => {
    const queryTimeoutError = new Error("Query read timeout");
    const pool = new FakeQueryPool([queryTimeoutError, result([{ value: "ok" }])]);
    const { fastReadQuery, logger } = readQueryHarness(pool);

    const queryResult = await fastReadQuery<{ value: string }>("select fast", ["input"]);

    assert.deepEqual(queryResult.rows, [{ value: "ok" }]);
    assert.deepEqual(pool.queries, ["select fast", "select fast"]);
    assert.deepEqual(pool.values, [["input"], ["input"]]);
    assert.deepEqual(pool.queryTimeouts, [5_000, 5_000]);
    assert.deepEqual(logger.warnings, [
      "Retrying fast read-only PostgreSQL query after transient read error: Query read timeout",
    ]);
  });
});

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

function readQueryHarness(pool = new FakeQueryPool()) {
  const logger = new FakeLogger();
  const database = Object.assign(Object.create(DatabaseService.prototype), {
    logger,
    pool,
  }) as DatabaseService;

  return {
    fastReadQuery: DatabaseService.prototype.fastReadQuery.bind(database),
    logger,
    query: DatabaseService.prototype.query.bind(database),
    readQuery: DatabaseService.prototype.readQuery.bind(database),
  };
}

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

class FakeQueryPool {
  readonly queries: string[] = [];
  readonly queryTimeouts: Array<number | undefined> = [];
  readonly values: unknown[][] = [];

  constructor(
    private readonly responses: Array<Error | pg.QueryResult<pg.QueryResultRow>> = [result([])],
  ) {}

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string | (pg.QueryConfig<unknown[]> & { query_timeout?: number }),
    values: unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    if (typeof text === "string") {
      this.queries.push(normalizeQuery(text));
      this.values.push(values);
      this.queryTimeouts.push(undefined);
    } else {
      this.queries.push(normalizeQuery(text.text));
      this.values.push(text.values ?? []);
      this.queryTimeouts.push(text.query_timeout);
    }

    const response = this.responses.shift() ?? result([]);
    if (response instanceof Error) {
      throw response;
    }

    return response as pg.QueryResult<Row>;
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
