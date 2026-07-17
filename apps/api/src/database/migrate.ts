import { pathToFileURL } from "node:url";

import pg from "pg";

import { loadApiConfig } from "../shared/env.js";
import { type MigrationExecutor, runMigrations } from "./migration-runner.js";
import { migrations } from "./migrations/index.js";
import { createConnectionConfig } from "./postgres-connection.js";

const { Client } = pg;

export const migrationTimeouts = {
  connectionMillis: 15_000,
  lockMillis: 5_000,
  statementMillis: 60_000,
} as const;

const migrationConnectionOptions = {
  connectionTimeoutMillis: migrationTimeouts.connectionMillis,
  queryTimeoutMillis: migrationTimeouts.statementMillis + 5_000,
} as const;

interface MigrationClient extends MigrationExecutor {
  connect(): Promise<void>;
  end(): Promise<void>;
  on(event: "error", listener: (error: Error) => void): this;
}

interface MigrationDependencies {
  createClient?: (config: pg.ClientConfig) => MigrationClient;
  loadConfig?: typeof loadApiConfig;
  logger?: Pick<Console, "error" | "log">;
  run?: typeof runMigrations;
}

export async function migrate(dependencies: MigrationDependencies = {}): Promise<void> {
  const loadConfig = dependencies.loadConfig ?? loadApiConfig;
  const createClient = dependencies.createClient ?? ((config) => new Client(config));
  const logger = dependencies.logger ?? console;
  const run = dependencies.run ?? runMigrations;
  const apiConfig = loadConfig();

  const connectionConfig = createConnectionConfig(
    apiConfig.databaseDirectUrl,
    migrationConnectionOptions,
  );
  const client = createClient(connectionConfig);
  let connected = false;
  let closing = false;

  client.on("error", (error: Error) => {
    if (!closing) {
      logger.error(`PostgreSQL migration connection error: ${safeErrorMessage(error)}`);
    }
  });

  try {
    await client.connect();
    connected = true;
    await configureMigrationSession(client);

    const result = await run(client, migrations, logger);
    if (result.applied.length === 0) {
      logger.log("No pending database migrations");
    }
  } finally {
    closing = true;
    if (connected) {
      await client.end();
    }
  }
}

export async function runMigrationCommand(
  command: () => Promise<void> = migrate,
  logger: Pick<Console, "error"> = console,
): Promise<number> {
  try {
    await command();
    return 0;
  } catch (error) {
    logger.error(`Database migration failed: ${safeErrorMessage(error)}`);
    return 1;
  }
}

async function configureMigrationSession(client: MigrationExecutor): Promise<void> {
  await client.query(
    `select
      set_config('lock_timeout', $1, false),
      set_config('statement_timeout', $2, false)`,
    [`${migrationTimeouts.lockMillis}ms`, `${migrationTimeouts.statementMillis}ms`],
  );
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(/postgres(?:ql)?:\/\/[^\s)]+/gi, "[redacted database URL]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runMigrationCommand();
}
