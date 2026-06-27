import type { Migration } from "../migration-runner.js";

export const accountSettingsMigration: Migration = {
  id: "0004_account_settings",
  statements: [
    "alter table accounts add column if not exists hard_mode boolean not null default false",
  ],
};
