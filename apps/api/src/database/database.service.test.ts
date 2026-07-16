import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, test } from "node:test";

import type pg from "pg";

import {
  DatabaseService,
  DatabaseUnavailableError,
  type DatabaseWarningLog,
} from "./database.service.js";

describe("DatabaseService reads and writes", () => {
  test("runs an ordinary safe read once with the bounded client timeout", async () => {
    const pool = new FakeQueryPool([result([{ value: "ok" }])]);
    const { database, logs } = databaseHarness(pool);

    const queryResult = await database.readQuery<{ value: string }>("select 1", ["input"]);

    assert.deepEqual(queryResult.rows, [{ value: "ok" }]);
    assert.deepEqual(pool.queries, ["select 1"]);
    assert.deepEqual(pool.values, [["input"]]);
    assert.deepEqual(pool.queryTimeouts, [5_000]);
    assert.deepEqual(logs, []);
  });

  test("retries a classified connection failure once and writes only safe diagnostics", async () => {
    const connectionError = new Error("Connection terminated unexpectedly: private-value");
    const pool = new FakeQueryPool([connectionError, result([{ value: "ok" }])]);
    const { database, delays, logs } = databaseHarness(pool);

    const queryResult = await database.readQuery<{ value: string }>(
      "select private_column from accounts",
      ["private-value"],
    );

    assert.deepEqual(queryResult.rows, [{ value: "ok" }]);
    assert.equal(pool.queries.length, 2);
    assert.deepEqual(delays, [50]);
    assert.deepEqual(logs, [
      {
        attempt: 2,
        category: "transient_connection",
        durationMs: 1,
        event: "database_read_retry",
        level: "warn",
        pool: { idle: 2, total: 4, waiting: 1 },
      },
    ]);
    assert.doesNotMatch(JSON.stringify(logs), /private-value|private_column|accounts/);
  });

  test("returns one database-unavailable error after the only safe retry is exhausted", async () => {
    const pool = new FakeQueryPool([
      Object.assign(new Error("socket closed"), { code: "ECONNRESET" }),
      Object.assign(new Error("socket still closed"), { code: "08006" }),
    ]);
    const { database, logs } = databaseHarness(pool);

    await assert.rejects(
      database.readQuery("select 1"),
      DatabaseUnavailableError,
    );

    assert.equal(pool.queries.length, 2);
    assert.deepEqual(logs.map(({ event, attempt, category }) => ({ event, attempt, category })), [
      { attempt: 2, category: "transient_connection", event: "database_read_retry" },
      { attempt: 2, category: "transient_connection", event: "database_unavailable" },
    ]);
  });

  test("does not retry client timeouts and maps them directly to database unavailability", async () => {
    const timeoutError = new Error("Query read timeout");
    const pool = new FakeQueryPool([timeoutError, result([{ value: "unexpected" }])]);
    const { database, logs } = databaseHarness(pool);

    await assert.rejects(
      database.readQuery("select slow"),
      (error) => error instanceof DatabaseUnavailableError &&
        error.category === "client_query_timeout",
    );
    assert.equal(pool.queries.length, 1);
    assert.equal(logs[0]?.category, "client_query_timeout");
    assert.equal(logs[0]?.attempt, 1);
  });

  test("does not retry or remap SQL and unknown errors", async () => {
    const sqlError = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const unknownError = new Error("unexpected driver failure");

    for (const expectedError of [sqlError, unknownError]) {
      const pool = new FakeQueryPool([expectedError, result([{ value: "unexpected" }])]);
      const { database, logs } = databaseHarness(pool);

      await assert.rejects(
        database.readQuery("select broken"),
        (error) => error === expectedError,
      );
      assert.equal(pool.queries.length, 1);
      assert.deepEqual(logs, []);
    }
  });

  test("runs writes once without retrying timeout or connection failures", async () => {
    const timeoutError = new Error("Query read timeout");
    const timeoutPool = new FakeQueryPool([timeoutError, result([])]);
    const timeoutHarness = databaseHarness(timeoutPool);

    await assert.rejects(
      timeoutHarness.database.writeQuery("insert into user_shlokas values ($1)", ["input"]),
      (error) => error instanceof DatabaseUnavailableError &&
        error.category === "client_query_timeout",
    );
    assert.equal(timeoutPool.queries.length, 1);

    const connectionPool = new FakeQueryPool([
      Object.assign(new Error("socket closed"), { code: "ECONNRESET" }),
      result([]),
    ]);
    const connectionHarness = databaseHarness(connectionPool);

    await assert.rejects(
      connectionHarness.database.writeQuery("insert into shloka_reviews values ($1)", ["input"]),
      DatabaseUnavailableError,
    );
    assert.equal(connectionPool.queries.length, 1);
    assert.equal(connectionHarness.logs[0]?.attempt, 1);
  });

  test("logs pool connection errors with category and counters, then closes the pool", async () => {
    const pool = new FakeQueryPool();
    const { database, logs } = databaseHarness(pool);

    pool.emit("error", Object.assign(new Error("secret connection details"), { code: "08006" }));
    await database.onModuleDestroy();

    assert.equal(pool.endCalls, 1);
    assert.deepEqual(logs, [
      {
        attempt: 0,
        category: "transient_connection",
        durationMs: 1,
        errorCode: "08006",
        event: "database_pool_error",
        level: "warn",
        pool: { idle: 2, total: 4, waiting: 1 },
      },
    ]);
    assert.doesNotMatch(JSON.stringify(logs), /secret connection details/);
  });
});

describe("DatabaseService transaction", () => {
  test("uses one client for begin, operations, commit, and healthy release", async () => {
    const client = new FakePoolClient();
    const { database } = databaseHarness(new FakeQueryPool([], client));

    const value = await database.transaction(async (executor) => {
      await executor.query("select 1");
      return "created";
    });

    assert.equal(value, "created");
    assert.deepEqual(client.queries, ["begin", "select 1", "commit"]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
    assert.equal(client.listenerCount("error"), 0);
  });

  test("rolls back operation errors and keeps a healthy client reusable", async () => {
    const client = new FakePoolClient();
    const operationError = Object.assign(new Error("conflict"), { code: "23505" });
    const { database } = databaseHarness(new FakeQueryPool([], client));

    await assert.rejects(
      database.transaction(async (executor) => {
        await executor.query("insert into shloka_sources");
        throw operationError;
      }),
      (error) => error === operationError,
    );

    assert.deepEqual(client.queries, ["begin", "insert into shloka_sources", "rollback"]);
    assert.equal(client.releaseError, undefined);
  });

  test("discards a transaction client after a connection error", async () => {
    const connectionError = Object.assign(new Error("Connection terminated unexpectedly"), {
      code: "08006",
    });
    const client = new FakePoolClient({
      connectionErrorOnQuery: { error: connectionError, query: "select disconnect" },
    });
    const { database, logs } = databaseHarness(new FakeQueryPool([], client));

    await assert.rejects(
      database.transaction(async (executor) => {
        await executor.query("select disconnect");
      }),
      DatabaseUnavailableError,
    );

    assert.deepEqual(client.queries, ["begin", "select disconnect"]);
    assert.equal(client.releaseError, connectionError);
    assert.equal(client.listenerCount("error"), 0);
    assert.deepEqual(logs.map(({ event }) => event), ["database_transaction_client_error"]);
  });

  test("discards the client but preserves the operation error when rollback fails", async () => {
    const operationError = Object.assign(new Error("constraint conflict"), { code: "23505" });
    const rollbackError = new Error("rollback failed");
    const client = new FakePoolClient({
      queryErrors: new Map([["rollback", rollbackError]]),
    });
    const { database } = databaseHarness(new FakeQueryPool([], client));

    await assert.rejects(
      database.transaction(async () => {
        throw operationError;
      }),
      (error) => error === operationError,
    );

    assert.deepEqual(client.queries, ["begin", "rollback"]);
    assert.equal(client.releaseError, rollbackError);
    assert.equal(client.listenerCount("error"), 0);
  });
});

function databaseHarness(pool = new FakeQueryPool()) {
  const delays: number[] = [];
  const logs: DatabaseWarningLog[] = [];
  let now = 100;
  const database = new DatabaseService(pool as unknown as pg.Pool, {
    logger: {
      warn: (message) => logs.push(JSON.parse(message) as DatabaseWarningLog),
    },
    now: () => now++,
    retryDelay: async (delayMs) => {
      delays.push(delayMs);
    },
  });

  return { database, delays, logs };
}

class FakeQueryPool extends EventEmitter {
  readonly idleCount = 2;
  readonly queries: string[] = [];
  readonly queryTimeouts: Array<number | undefined> = [];
  readonly totalCount = 4;
  readonly values: unknown[][] = [];
  readonly waitingCount = 1;
  endCalls = 0;

  constructor(
    private readonly responses: Array<Error | pg.QueryResult<pg.QueryResultRow>> = [result([])],
    private readonly client = new FakePoolClient(),
  ) {
    super();
  }

  async connect(): Promise<FakePoolClient> {
    return this.client;
  }

  async end(): Promise<void> {
    this.endCalls += 1;
  }

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
  releaseError: Error | undefined;

  constructor(
    private readonly options: {
      connectionErrorOnQuery?: { error: Error; query: string };
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

  release(error?: Error): void {
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
