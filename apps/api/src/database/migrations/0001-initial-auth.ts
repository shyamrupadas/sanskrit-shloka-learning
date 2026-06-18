import type { Migration } from "../migration-runner.js";

export const initialAuthMigration: Migration = {
  id: "0001_initial_auth",
  statements: [
    `
      create table if not exists accounts (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        created_at timestamptz not null default now()
      )
    `,
    `
      create table if not exists auth_sessions (
        id text primary key,
        account_id text not null references accounts(id) on delete cascade,
        token_hash text not null unique,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null
      )
    `,
    `
      create table if not exists account_roles (
        account_id text not null references accounts(id) on delete cascade,
        role text not null check (role in ('admin')),
        created_at timestamptz not null default now(),
        primary key (account_id, role)
      )
    `,
    "create index if not exists auth_sessions_account_id_idx on auth_sessions(account_id)",
    "create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at)",
  ],
};
