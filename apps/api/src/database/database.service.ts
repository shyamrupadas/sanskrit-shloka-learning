import { Logger, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import pg from "pg";

export interface DatabaseExecutor {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<T>>;
}

export type DatabaseErrorCategory =
  | "transient_connection"
  | "client_query_timeout"
  | "sql"
  | "unknown";

interface DatabaseErrorClassification {
  category: DatabaseErrorCategory;
  code?: string;
}

type DatabaseUnavailableCategory = Extract<
  DatabaseErrorCategory,
  "transient_connection" | "client_query_timeout"
>;

export interface DatabaseWarningLog {
  attempt: number;
  category: DatabaseErrorCategory;
  durationMs: number;
  errorCode?: string;
  event:
    | "database_pool_error"
    | "database_read_retry"
    | "database_transaction_client_error"
    | "database_unavailable";
  level: "warn";
  pool: {
    idle: number;
    total: number;
    waiting: number;
  };
}

interface DatabaseLogger {
  warn(message: string): void;
}

export interface DatabaseServiceOptions {
  logger?: DatabaseLogger;
  now?: () => number;
  retryDelay?: (delayMs: number) => Promise<void>;
}

const transientConnectionErrorCodes = new Set([
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "ETIMEDOUT",
]);
const transientConnectionErrorMessages = [
  "client has encountered a connection error",
  "connection terminated",
  "couldn't connect to compute node",
  "early eof",
  "network issue",
  "terminating connection due to administrator command",
  "timeout exceeded when trying to connect",
];
const clientQueryTimeoutMessage = "Query read timeout";
const readQueryTimeoutMillis = 5_000;
const readRetryDelayMillis = 50;

interface QueryConfigWithTimeout extends pg.QueryConfig<unknown[]> {
  query_timeout: number;
}

export class DatabaseUnavailableError extends ServiceUnavailableException {
  readonly category: DatabaseUnavailableCategory;

  constructor(category: DatabaseUnavailableCategory = "transient_connection") {
    super("Database temporarily unavailable");
    this.name = "DatabaseUnavailableError";
    this.category = category;
  }
}

export class DatabaseService implements OnModuleDestroy {
  private readonly logger: DatabaseLogger;
  private readonly now: () => number;
  private readonly pool: pg.Pool;
  private readonly retryDelay: (delayMs: number) => Promise<void>;

  constructor(pool: pg.Pool, options: DatabaseServiceOptions = {}) {
    this.logger = options.logger ?? new Logger(DatabaseService.name);
    this.now = options.now ?? Date.now;
    this.pool = pool;
    this.retryDelay = options.retryDelay ?? delay;

    this.pool.on("error", (error) => {
      this.warn("database_pool_error", error, this.now(), 0);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async readQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    const firstAttemptStartedAt = this.now();

    try {
      return await this.queryWithTimeout<T>(text, values, readQueryTimeoutMillis);
    } catch (error) {
      const category = classifyDatabaseError(error).category;
      if (category === "client_query_timeout") {
        this.warn("database_unavailable", error, firstAttemptStartedAt, 1);
        throw new DatabaseUnavailableError(category);
      }
      if (category !== "transient_connection") {
        throw error;
      }

      this.warn("database_read_retry", error, firstAttemptStartedAt, 2);
      await this.retryDelay(readRetryDelayMillis);
    }

    const secondAttemptStartedAt = this.now();
    try {
      return await this.queryWithTimeout<T>(text, values, readQueryTimeoutMillis);
    } catch (error) {
      const category = classifyDatabaseError(error).category;
      if (category === "transient_connection" || category === "client_query_timeout") {
        this.warn("database_unavailable", error, secondAttemptStartedAt, 2);
        throw new DatabaseUnavailableError(category);
      }

      throw error;
    }
  }

  async writeQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    const startedAt = this.now();

    try {
      return await this.pool.query<T>(text, [...values]);
    } catch (error) {
      const category = classifyDatabaseError(error).category;
      if (category === "transient_connection" || category === "client_query_timeout") {
        this.warn("database_unavailable", error, startedAt, 1);
        throw new DatabaseUnavailableError(category);
      }

      throw error;
    }
  }

  async transaction<T>(operation: (client: DatabaseExecutor) => Promise<T>): Promise<T> {
    const startedAt = this.now();
    let client: pg.PoolClient;

    try {
      client = await this.pool.connect();
    } catch (error) {
      if (classifyDatabaseError(error).category === "transient_connection") {
        this.warn("database_unavailable", error, startedAt, 1);
        throw new DatabaseUnavailableError();
      }

      throw error;
    }

    let brokenClientError: Error | undefined;
    let transactionStarted = false;
    const handleClientError = (error: Error): void => {
      if (brokenClientError) {
        return;
      }

      brokenClientError = error;
      this.warn("database_transaction_client_error", error, startedAt, 1);
    };
    const executor: DatabaseExecutor = {
      query: <Row extends pg.QueryResultRow = pg.QueryResultRow>(
        text: string,
        values: readonly unknown[] = [],
      ) => client.query<Row>(text, [...values]),
    };

    client.on("error", handleClientError);

    try {
      await client.query("begin");
      transactionStarted = true;
      const result = await operation(executor);
      if (brokenClientError) {
        throw brokenClientError;
      }

      await client.query("commit");
      transactionStarted = false;
      if (brokenClientError) {
        throw brokenClientError;
      }

      return result;
    } catch (error) {
      const connectionErrorBeforeRollback = brokenClientError;
      const classification = classifyDatabaseError(error);
      if (classification.category === "transient_connection" && !brokenClientError) {
        brokenClientError = toClientReleaseError(error);
        this.warn("database_unavailable", error, startedAt, 1);
      }

      if (transactionStarted && !brokenClientError) {
        try {
          await client.query("rollback");
          transactionStarted = false;
        } catch (rollbackError) {
          brokenClientError = toClientReleaseError(rollbackError);
          this.warn("database_transaction_client_error", rollbackError, startedAt, 1);
        }
      }

      if (
        classification.category === "transient_connection" ||
        (connectionErrorBeforeRollback &&
          classifyDatabaseError(connectionErrorBeforeRollback).category === "transient_connection")
      ) {
        throw new DatabaseUnavailableError();
      }
      if (classification.category === "client_query_timeout") {
        this.warn("database_unavailable", error, startedAt, 1);
        throw new DatabaseUnavailableError(classification.category);
      }

      throw error;
    } finally {
      client.off("error", handleClientError);
      client.release(brokenClientError);
    }
  }

  private async queryWithTimeout<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[],
    queryTimeoutMillis: number,
  ): Promise<pg.QueryResult<T>> {
    const queryConfig: QueryConfigWithTimeout = {
      text,
      values: [...values],
      query_timeout: queryTimeoutMillis,
    };

    return this.pool.query<T>(queryConfig);
  }

  private warn(
    event: DatabaseWarningLog["event"],
    error: unknown,
    startedAt: number,
    attempt: number,
  ): void {
    const classification = classifyDatabaseError(error);
    const entry: DatabaseWarningLog = {
      attempt,
      category: classification.category,
      durationMs: Math.max(0, this.now() - startedAt),
      ...(classification.code ? { errorCode: classification.code } : {}),
      event,
      level: "warn",
      pool: {
        idle: this.pool.idleCount,
        total: this.pool.totalCount,
        waiting: this.pool.waitingCount,
      },
    };

    this.logger.warn(JSON.stringify(entry));
  }
}

function classifyDatabaseError(error: unknown): DatabaseErrorClassification {
  if (error instanceof DatabaseUnavailableError) {
    return { category: error.category };
  }

  const message = errorMessage(error);
  if (message === clientQueryTimeoutMessage) {
    return { category: "client_query_timeout" };
  }

  const code = safeErrorCode(error);
  if (
    (code && (transientConnectionErrorCodes.has(code) || code.startsWith("08"))) ||
    transientConnectionErrorMessages.some((fragment) => message.toLowerCase().includes(fragment))
  ) {
    return {
      category: "transient_connection",
      ...(code ? { code } : {}),
    };
  }

  if (code && /^[0-9A-Z]{5}$/.test(code)) {
    return { category: "sql", code };
  }

  return { category: "unknown" };
}

function safeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string" && /^[A-Z0-9_]{2,32}$/.test(code) ? code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function toClientReleaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Database client failed");
}

async function delay(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
