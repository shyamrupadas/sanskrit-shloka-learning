import type { Migration } from "../migration-runner.js";

export const reviewingStartedAtMigration: Migration = {
  id: "0006_reviewing_started_at",
  statements: [
    "alter table user_shlokas add column reviewing_started_at timestamptz",
    `
      update user_shlokas
      set reviewing_started_at = updated_at
      where status = 'reviewing' and reviewing_started_at is null
    `,
    `
      alter table user_shlokas
      add constraint user_shlokas_reviewing_started_at_check
      check (
        (status = 'learning' and reviewing_started_at is null)
        or (status = 'reviewing' and reviewing_started_at is not null)
      )
    `,
    `
      create index user_shlokas_account_reviewing_started_at_idx
      on user_shlokas(account_id, reviewing_started_at)
      where status = 'reviewing'
    `,
  ],
};
