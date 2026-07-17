import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type pg from "pg";

import {
  calculateMigrationChecksum,
  type Migration,
  type MigrationExecutor,
  runMigrations,
} from "./migration-runner.js";

const silentLogger = { log: () => undefined };

describe("runMigrations", () => {
  test("applies pending migrations in order", async () => {
    const client = new FakeMigrationClient();
    const migrations = [
      migration("0001_first", ["create table first_table"]),
      migration("0002_second", ["create table second_table"]),
    ];

    const result = await runMigrations(client, migrations, silentLogger);

    assert.deepEqual(result, { applied: ["0001_first", "0002_second"], skipped: [] });
    assert.deepEqual([...client.appliedMigrations.keys()], ["0001_first", "0002_second"]);
    assert.ok(
      client.executedStatements.indexOf("create table first_table") <
        client.executedStatements.indexOf("create table second_table"),
    );
    assert.ok(
      client.queries.indexOf("select pg_try_advisory_lock($1) as acquired") <
        client.queries.indexOf("select id, checksum from schema_migrations order by id"),
    );
    assert.equal(client.unlockCount, 1);
  });

  test("skips already applied migrations with the same checksum", async () => {
    const client = new FakeMigrationClient();
    const alreadyApplied = migration("0001_first", ["create table first_table"]);
    const pending = migration("0002_second", ["create table second_table"]);
    client.appliedMigrations.set(alreadyApplied.id, calculateMigrationChecksum(alreadyApplied));

    const result = await runMigrations(client, [alreadyApplied, pending], silentLogger);

    assert.deepEqual(result, { applied: ["0002_second"], skipped: ["0001_first"] });
    assert.equal(client.executedStatements.filter((statement) => statement === "create table first_table").length, 0);
    assert.equal(client.executedStatements.filter((statement) => statement === "create table second_table").length, 1);
  });

  test("rejects applied migrations with changed checksums", async () => {
    const client = new FakeMigrationClient();
    client.appliedMigrations.set("0001_first", "old-checksum");

    await assert.rejects(
      runMigrations(client, [migration("0001_first", ["create table first_table"])], silentLogger),
      /Migration checksum mismatch for 0001_first/,
    );
  });

  test("rolls back and does not record a failed migration", async () => {
    const client = new FakeMigrationClient({ failOnStatement: "create table broken_table" });

    await assert.rejects(
      runMigrations(client, [migration("0001_first", ["create table broken_table"])], silentLogger),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Failed to apply database migration 0001_first as a transactional batch/);
        assert.match(error.message, /Failed statement: create table broken_table/);
        return true;
      },
    );

    assert.equal(client.rollbackCount, 1);
    assert.equal(client.commitCount, 0);
    assert.equal(client.appliedMigrations.has("0001_first"), false);
  });

  test("sends each migration transaction in one database round trip", async () => {
    const client = new FakeMigrationClient();

    await runMigrations(
      client,
      [migration("0001_first", ["create table first_table", "create index first_index"])],
      silentLogger,
    );

    assert.equal(client.migrationBatches.length, 1);
    assert.match(
      client.migrationBatches[0] ?? "",
      /^begin; create table first_table; create index first_index; insert into schema_migrations .*; commit$/,
    );
  });

  test("rejects a concurrent runner before reading migration history", async () => {
    const client = new FakeMigrationClient({ lockAcquired: false });

    await assert.rejects(
      runMigrations(
        client,
        [migration("0001_first", ["create table first_table"])],
        silentLogger,
      ),
      /Database migration lock is held by another runner/,
    );

    assert.deepEqual(client.queries, ["select pg_try_advisory_lock($1) as acquired"]);
    assert.equal(client.migrationBatches.length, 0);
    assert.equal(client.unlockCount, 0);
  });
});

class FakeMigrationClient implements MigrationExecutor {
  readonly appliedMigrations = new Map<string, string>();
  readonly executedStatements: string[] = [];
  readonly migrationBatches: string[] = [];
  readonly queries: string[] = [];
  commitCount = 0;
  rollbackCount = 0;
  unlockCount = 0;

  constructor(
    private readonly options: {
      failOnStatement?: string;
      lockAcquired?: boolean;
    } = {},
  ) {}

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    _values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    const statement = normalizeSql(text);
    this.queries.push(statement);

    if (statement === "rollback") {
      this.rollbackCount += 1;
      return result([]);
    }
    if (statement === "select pg_try_advisory_lock($1) as acquired") {
      return result([
        { acquired: this.options.lockAcquired ?? true },
      ] as unknown as Row[]);
    }
    if (statement === "select pg_advisory_unlock($1) as released") {
      this.unlockCount += 1;
      return result([{ released: true }] as unknown as Row[]);
    }
    if (statement.startsWith("create table if not exists schema_migrations")) {
      return result([]);
    }
    if (statement === "select id, checksum from schema_migrations order by id") {
      const rows = [...this.appliedMigrations.entries()].map(([id, checksum]) => ({
        id,
        checksum,
      }));
      return result(rows as unknown as Row[]);
    }
    if (statement.startsWith("begin;")) {
      this.migrationBatches.push(statement);
      const migrationStatements = [...statement.matchAll(/create (?:table|index) [a-z0-9_]+/g)]
        .map((match) => match[0])
        .filter((migrationStatement) => !migrationStatement.includes("schema_migrations"));
      this.executedStatements.push(...migrationStatements);

      if (this.options.failOnStatement && migrationStatements.includes(this.options.failOnStatement)) {
        throw new Error(`Failed statement: ${this.options.failOnStatement}`);
      }

      const record = statement.match(
        /insert into schema_migrations \(id, checksum\) values \('((?:''|[^'])*)', '((?:''|[^'])*)'\)/,
      );
      if (!record) {
        throw new Error("Migration batch does not record its checksum");
      }

      this.appliedMigrations.set(unquoteSqlLiteral(record[1] ?? ""), unquoteSqlLiteral(record[2] ?? ""));
      this.commitCount += 1;
      return result([]);
    }

    this.executedStatements.push(statement);
    return result([]);
  }
}

function migration(id: string, statements: readonly string[]): Migration {
  return { id, statements };
}

function normalizeSql(text: string): string {
  return text.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function unquoteSqlLiteral(value: string): string {
  return value.replaceAll("''", "'");
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
