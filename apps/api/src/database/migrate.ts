import { pathToFileURL } from "node:url";

import pg from "pg";

import { loadApiConfig } from "../shared/env.js";
import { runMigrations } from "./migration-runner.js";
import { migrations } from "./migrations/index.js";
import { createConnectionConfig, resolveMigrationDatabaseUrl } from "./postgres-connection.js";

const { Client } = pg;

const migrationConnectionOptions = {
  connectionTimeoutMillis: 30_000,
};

export async function migrate(): Promise<void> {
  const apiConfig = loadApiConfig();

  const databaseUrl = resolveMigrationDatabaseUrl(apiConfig.databaseUrl);
  const connectionConfig = createConnectionConfig(databaseUrl, migrationConnectionOptions);
  delete connectionConfig.query_timeout;
  const client = new Client(connectionConfig);
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
