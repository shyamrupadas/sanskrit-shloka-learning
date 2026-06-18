import { pathToFileURL } from "node:url";

import pg from "pg";

import { loadApiEnv, requireEnv } from "../shared/env.js";
import { runMigrations } from "./migration-runner.js";
import { migrations } from "./migrations/index.js";
import { createConnectionConfig, resolveMigrationDatabaseUrl } from "./postgres-connection.js";

const { Client } = pg;

const migrationConnectionOptions = {
  connectionTimeoutMillis: 30_000,
  lockTimeoutMillis: 30_000,
  queryTimeoutMillis: 120_000,
  statementTimeoutMillis: 120_000,
};

export async function migrate(): Promise<void> {
  loadApiEnv();

  const databaseUrl = resolveMigrationDatabaseUrl(requireEnv("DATABASE_URL"));
  const client = new Client(createConnectionConfig(databaseUrl, migrationConnectionOptions));
  let connected = false;
  let closing = false;

  client.on("error", (error) => {
    if (!closing) {
      console.error(`PostgreSQL migration connection error: ${error.message}`);
    }
  });

  try {
    await client.connect();
    connected = true;
    await client.query("set lock_timeout to '30s'");
    await client.query("set statement_timeout to '120s'");

    const result = await runMigrations(client, migrations);
    if (result.applied.length === 0) {
      console.log("No pending database migrations");
    }
  } finally {
    closing = true;
    if (connected) {
      await client.end();
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
