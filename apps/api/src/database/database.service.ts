import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import pg from "pg";

import { requireEnv } from "../shared/env.js";
import { createPoolConfig } from "./postgres-connection.js";

const { Pool } = pg;

export interface DatabaseExecutor {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<T>>;
}

const transientConnectionErrorCodes = new Set(["57P01", "08003", "08006"]);
const transientConnectionErrorMessages = [
  "Connection terminated unexpectedly",
  "Connection terminated due to connection timeout",
  "Client has encountered a connection error and is not queryable",
  "terminating connection due to administrator command",
  "Couldn't connect to compute node",
  "network issue",
  "early eof",
];

const fastReadQueryTimeoutMillis = 5_000;

interface QueryConfigWithTimeout extends pg.QueryConfig<unknown[]> {
  query_timeout: number;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy, DatabaseExecutor {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: pg.Pool;

  constructor() {
    const databaseUrl = requireEnv("DATABASE_URL");
    this.pool = new Pool(createPoolConfig(databaseUrl));
    this.pool.on("error", (error) => {
      this.logger.warn(`PostgreSQL idle client error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, [...values]);
  }

  async readQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    try {
      return await this.query<T>(text, values);
    } catch (error) {
      if (!isTransientPostgresConnectionError(error)) {
        throw error;
      }

      this.logger.warn(
        `Retrying read-only PostgreSQL query after transient connection error: ${errorMessage(error)}`,
      );
      return this.query<T>(text, values);
    }
  }

  async fastReadQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    try {
      return await this.queryWithTimeout<T>(text, values, fastReadQueryTimeoutMillis);
    } catch (error) {
      if (!isFastReadRetriablePostgresError(error)) {
        throw error;
      }

      this.logger.warn(
        `Retrying fast read-only PostgreSQL query after transient read error: ${errorMessage(error)}`,
      );
      return this.queryWithTimeout<T>(text, values, fastReadQueryTimeoutMillis);
    }
  }

  async transaction<T>(operation: (client: DatabaseExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let clientConnectionError: Error | undefined;
    let released = false;
    const handleClientError = (error: Error): void => {
      clientConnectionError ??= error;
      this.logger.warn(`PostgreSQL transaction client error: ${error.message}`);
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
      const result = await operation(executor);
      await client.query("commit");
      return result;
    } catch (error) {
      if (!clientConnectionError) {
        try {
          await client.query("rollback");
        } catch (rollbackError) {
          released = true;
          client.release(toClientReleaseError(rollbackError));
          throw error;
        }
      }

      throw error;
    } finally {
      client.off("error", handleClientError);
      if (!released) {
        if (clientConnectionError) {
          client.release(clientConnectionError);
        } else {
          client.release();
        }
      }
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
}

function toClientReleaseError(error: unknown): Error | boolean {
  return error instanceof Error ? error : true;
}

function isTransientPostgresConnectionError(error: unknown): boolean {
  const code = errorCode(error);
  if (code && transientConnectionErrorCodes.has(code)) {
    return true;
  }

  const message = errorMessage(error);
  if (message === "Query read timeout") {
    return false;
  }

  return transientConnectionErrorMessages.some((transientMessage) => message.includes(transientMessage));
}

function isFastReadRetriablePostgresError(error: unknown): boolean {
  return isTransientPostgresConnectionError(error) || errorMessage(error) === "Query read timeout";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
