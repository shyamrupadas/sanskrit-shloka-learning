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
        assert.match(error.message, /Failed to apply database migration 0001_first at statement 1/);
        assert.match(error.message, /create table broken_table/);
        assert.match(error.message, /Failed statement: create table broken_table/);
        return true;
      },
    );

    assert.equal(client.rollbackCount, 1);
    assert.equal(client.commitCount, 0);
    assert.equal(client.appliedMigrations.has("0001_first"), false);
  });
});

class FakeMigrationClient implements MigrationExecutor {
  readonly appliedMigrations = new Map<string, string>();
  readonly executedStatements: string[] = [];
  commitCount = 0;
  rollbackCount = 0;

  constructor(private readonly options: { failOnStatement?: string } = {}) {}

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    const statement = normalizeSql(text);
    this.executedStatements.push(statement);

    if (statement === "begin") {
      return result([]);
    }
    if (statement === "commit") {
      this.commitCount += 1;
      return result([]);
    }
    if (statement === "rollback") {
      this.rollbackCount += 1;
      return result([]);
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
    if (statement === "insert into schema_migrations (id, checksum) values ($1, $2)") {
      this.appliedMigrations.set(String(values[0]), String(values[1]));
      return result([]);
    }
    if (this.options.failOnStatement && statement === this.options.failOnStatement) {
      throw new Error(`Failed statement: ${statement}`);
    }

    return result([]);
  }
}

function migration(id: string, statements: readonly string[]): Migration {
  return { id, statements };
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
