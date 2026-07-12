import type { Migration } from "../migration-runner.js";

export const reviewHistoryMigration: Migration = {
  id: "0007_review_history",
  statements: [
    `
      create table if not exists shloka_reviews (
        id text primary key,
        account_id text not null references accounts(id) on delete cascade,
        shloka_code text not null references shlokas(code) on delete cascade,
        completed_at timestamptz not null,
        user_day date not null,
        result text not null check (
          result in (
            'remembered_without_error',
            'remembered_with_error',
            'remembered_with_hint',
            'forgot'
          )
        )
      )
    `,
    `
      create index if not exists shloka_reviews_account_day_idx
      on shloka_reviews(account_id, user_day, shloka_code)
    `,
    `
      create index if not exists shloka_reviews_account_shloka_completed_idx
      on shloka_reviews(account_id, shloka_code, completed_at desc)
    `,
  ],
};
