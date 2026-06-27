import type { Migration } from "../migration-runner.js";

export const userShlokasMigration: Migration = {
  id: "0005_user_shlokas",
  statements: [
    `
      create table if not exists user_shlokas (
        account_id text not null references accounts(id) on delete cascade,
        shloka_code text not null references shlokas(code) on delete cascade,
        status text not null check (status in ('learning', 'reviewing')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (account_id, shloka_code)
      )
    `,
    "create index if not exists user_shlokas_account_status_idx on user_shlokas(account_id, status)",
  ],
};
