import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import pg from "pg";

import { requireEnv } from "../shared/env.js";

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor() {
    const databaseUrl = requireEnv("DATABASE_URL");
    this.pool = new Pool(createPoolConfig(databaseUrl));
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
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

  private async ensureSchema(): Promise<void> {
    await this.query(`
      create table if not exists accounts (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists auth_sessions (
        id text primary key,
        account_id text not null references accounts(id) on delete cascade,
        token_hash text not null unique,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null
      );

      create index if not exists auth_sessions_account_id_idx on auth_sessions(account_id);
      create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at);
    `);
  }
}

function shouldUseSsl(databaseUrl: string): boolean {
  return databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech");
}

function createPoolConfig(databaseUrl: string): pg.PoolConfig {
  const poolConfig: pg.PoolConfig = {
    connectionString: stripSslMode(databaseUrl),
  };

  if (shouldUseSsl(databaseUrl)) {
    poolConfig.ssl = true;
  }

  return poolConfig;
}

function stripSslMode(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
}
