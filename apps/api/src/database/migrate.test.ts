import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

import type pg from "pg";

import { type ApiConfig, loadApiConfig } from "../shared/env.js";
import {
  migrate,
  migrationTimeouts,
  runMigrationCommand,
} from "./migrate.js";
import type { MigrationExecutor, MigrationRunResult } from "./migration-runner.js";

const directDatabaseUrl =
  "postgresql://api:direct-secret@ep-direct.neon.tech/app?sslmode=require";

const productionConfig = {
  databaseDirectUrl: directDatabaseUrl,
  databasePoolMax: 5,
  databaseUrl:
    "postgresql://api:pool-secret@ep-pooler.neon.tech/app?sslmode=require",
  environment: "production",
  frontendOrigin: "https://app.example.com",
  host: "0.0.0.0",
  port: 3000,
} satisfies ApiConfig;

const silentLogger = {
  error: (_message: string) => undefined,
  log: (_message: string) => undefined,
};

describe("migrate", () => {
  test("connects to the explicit direct URL and configures bounded migration waits", async () => {
    const client = new FakeMigrationClient();
    let connectionConfig: pg.ClientConfig | undefined;
    let runnerCalls = 0;

    await migrate({
      createClient: (config) => {
        connectionConfig = config;
        return client;
      },
      loadConfig: () => productionConfig,
      logger: silentLogger,
      run: async (): Promise<MigrationRunResult> => {
        runnerCalls += 1;
        return { applied: [], skipped: [] };
      },
    });

    assert.equal(
      connectionConfig?.connectionString,
      "postgresql://api:direct-secret@ep-direct.neon.tech/app",
    );
    assert.equal(connectionConfig?.connectionTimeoutMillis, migrationTimeouts.connectionMillis);
    assert.equal(connectionConfig?.query_timeout, migrationTimeouts.statementMillis + 5_000);
    assert.deepEqual(client.sessionConfigurationValues, [
      `${migrationTimeouts.lockMillis}ms`,
      `${migrationTimeouts.statementMillis}ms`,
    ]);
    assert.equal(client.connectCount, 1);
    assert.equal(client.endCount, 1);
    assert.equal(runnerCalls, 1);
  });
});

describe("production migration command", () => {
  test("fails before creating a client when production direct URL is missing", async () => {
    const errors: string[] = [];
    let clientCreated = false;
    const environment: NodeJS.ProcessEnv = {
      DATABASE_POOL_MAX: "5",
      DATABASE_URL:
        "postgresql://api:pool-secret@ep-pooler.neon.tech/app?sslmode=require",
      FRONTEND_ORIGIN: "https://app.example.com",
      NODE_ENV: "production",
      PORT: "3000",
    };

    const exitCode = await runMigrationCommand(
      () =>
        migrate({
          createClient: () => {
            clientCreated = true;
            return new FakeMigrationClient();
          },
          loadConfig: () => loadApiConfig(environment),
          logger: silentLogger,
        }),
      { error: (message) => errors.push(message) },
    );

    assert.equal(exitCode, 1);
    assert.equal(clientCreated, false);
    assert.match(errors[0] ?? "", /DATABASE_DIRECT_URL is required/);
    assert.doesNotMatch(errors[0] ?? "", /pool-secret|postgres(?:ql)?:\/\//);
  });

  test("uses compiled JavaScript and returns a safe non-zero result after failure", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };
    const errors: string[] = [];

    const exitCode = await runMigrationCommand(
      async () => {
        throw new Error(`Could not connect to ${directDatabaseUrl}`);
      },
      { error: (message) => errors.push(message) },
    );

    assert.equal(
      packageJson.scripts?.["db:migrate:production"],
      "node dist/database/migrate.js",
    );
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? "", /Database migration failed/);
    assert.match(errors[0] ?? "", /\[redacted database URL\]/);
    assert.doesNotMatch(errors[0] ?? "", /direct-secret|postgres(?:ql)?:\/\//);
  });
});

class FakeMigrationClient implements MigrationExecutor {
  connectCount = 0;
  endCount = 0;
  sessionConfigurationValues: readonly unknown[] | undefined;

  async connect(): Promise<void> {
    this.connectCount += 1;
  }

  async end(): Promise<void> {
    this.endCount += 1;
  }

  on(_event: "error", _listener: (error: Error) => void): this {
    return this;
  }

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    if (normalizeSql(text).startsWith("select set_config('lock_timeout'")) {
      this.sessionConfigurationValues = values;
    }

    return result([]);
  }
}

function normalizeSql(text: string): string {
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
