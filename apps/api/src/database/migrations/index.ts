import type { Migration } from "../migration-runner.js";
import { initialAuthMigration } from "./0001-initial-auth.js";
import { catalogMigration } from "./0002-catalog.js";
import { sourceChapterCodeScopeMigration } from "./0003-source-chapter-code-scope.js";
import { accountSettingsMigration } from "./0004-account-settings.js";
import { userShlokasMigration } from "./0005-user-shlokas.js";
import { reviewingStartedAtMigration } from "./0006-reviewing-started-at.js";
import { reviewHistoryMigration } from "./0007-review-history.js";

export const migrations: readonly Migration[] = [
  initialAuthMigration,
  catalogMigration,
  sourceChapterCodeScopeMigration,
  accountSettingsMigration,
  userShlokasMigration,
  reviewingStartedAtMigration,
  reviewHistoryMigration,
];
