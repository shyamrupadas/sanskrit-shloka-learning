import type { Migration } from "../migration-runner.js";
import { initialAuthMigration } from "./0001-initial-auth.js";
import { catalogMigration } from "./0002-catalog.js";

export const migrations: readonly Migration[] = [initialAuthMigration, catalogMigration];
