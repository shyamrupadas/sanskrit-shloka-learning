import pg from "pg";

export interface PostgresConnectionOptions {
  connectionTimeoutMillis?: number;
  keepAlive?: boolean;
  keepAliveInitialDelayMillis?: number;
  queryTimeoutMillis?: number;
}

export interface PostgresPoolOptions extends PostgresConnectionOptions {
  max: number;
}

const defaultConnectionOptions = {
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  queryTimeoutMillis: 30_000,
} satisfies Required<PostgresConnectionOptions>;

const runtimePoolIdleTimeoutMillis = 4 * 60_000;

export function createPoolConfig(
  databaseUrl: string,
  options: PostgresPoolOptions,
): pg.PoolConfig {
  return {
    ...createConnectionConfig(databaseUrl, options),
    max: options.max,
    min: 0,
    idleTimeoutMillis: runtimePoolIdleTimeoutMillis,
  };
}

export function createConnectionConfig(
  databaseUrl: string,
  options: PostgresConnectionOptions = {},
): pg.ClientConfig {
  const resolvedOptions = { ...defaultConnectionOptions, ...options };
  const config: pg.PoolConfig = {
    connectionString: stripSslMode(databaseUrl),
    connectionTimeoutMillis: resolvedOptions.connectionTimeoutMillis,
    keepAlive: resolvedOptions.keepAlive,
    keepAliveInitialDelayMillis: resolvedOptions.keepAliveInitialDelayMillis,
    query_timeout: resolvedOptions.queryTimeoutMillis,
  };

  if (shouldUseSsl(databaseUrl)) {
    config.ssl = { rejectUnauthorized: true };
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
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  return (
    url.hostname === "neon.tech" ||
    url.hostname.endsWith(".neon.tech") ||
    (sslMode !== null && sslMode !== "disable")
  );
}

function stripSslMode(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}
