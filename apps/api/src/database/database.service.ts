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
}

function toClientReleaseError(error: unknown): Error | boolean {
  return error instanceof Error ? error : true;
}
