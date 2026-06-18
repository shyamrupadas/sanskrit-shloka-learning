import pg from "pg";

export interface PostgresConnectionOptions {
  connectionTimeoutMillis?: number;
  lockTimeoutMillis?: number;
  queryTimeoutMillis?: number;
  statementTimeoutMillis?: number;
}

const defaultConnectionOptions = {
  connectionTimeoutMillis: 10_000,
  lockTimeoutMillis: 10_000,
  queryTimeoutMillis: 30_000,
  statementTimeoutMillis: 30_000,
} satisfies Required<PostgresConnectionOptions>;

export function createPoolConfig(
  databaseUrl: string,
  options: PostgresConnectionOptions = {},
): pg.PoolConfig {
  return createConnectionConfig(databaseUrl, options);
}

export function createConnectionConfig(
  databaseUrl: string,
  options: PostgresConnectionOptions = {},
): pg.ClientConfig {
  const resolvedOptions = { ...defaultConnectionOptions, ...options };
  const config: pg.PoolConfig = {
    connectionString: stripSslMode(databaseUrl),
    connectionTimeoutMillis: resolvedOptions.connectionTimeoutMillis,
    lock_timeout: resolvedOptions.lockTimeoutMillis,
    query_timeout: resolvedOptions.queryTimeoutMillis,
    statement_timeout: resolvedOptions.statementTimeoutMillis,
  };

  if (shouldUseSsl(databaseUrl)) {
    config.ssl = true;
  }

  return config;
}

export function resolveMigrationDatabaseUrl(databaseUrl: string): string {
  const directDatabaseUrl = process.env.DATABASE_DIRECT_URL;
  if (directDatabaseUrl) {
    return directDatabaseUrl;
  }

  const url = new URL(databaseUrl);
  if (url.hostname.endsWith(".neon.tech") && url.hostname.includes("-pooler")) {
    url.hostname = url.hostname.replace("-pooler", "");
    return url.toString();
  }

  return databaseUrl;
}

function shouldUseSsl(databaseUrl: string): boolean {
  return databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech");
}

function stripSslMode(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}
