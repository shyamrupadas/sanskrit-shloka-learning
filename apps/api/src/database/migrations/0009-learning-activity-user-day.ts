import type { Migration } from "../migration-runner.js";

export const learningActivityUserDayMigration: Migration = {
  id: "0009_learning_activity_user_day",
  statements: [
    `
      alter table user_shlokas
      add column if not exists reviewing_started_user_day date
    `,
  ],
};
