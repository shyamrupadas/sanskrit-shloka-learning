import { createHash } from "node:crypto";

import type pg from "pg";

export interface Migration {
  id: string;
  statements: readonly string[];
}

export interface MigrationExecutor {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<T>>;
}

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}

interface AppliedMigrationRow extends pg.QueryResultRow {
  id: string;
  checksum: string;
}

interface AdvisoryLockRow extends pg.QueryResultRow {
  acquired: boolean;
}

interface AdvisoryUnlockRow extends pg.QueryResultRow {
  released: boolean;
}

// A fixed int8 key gives every deploy of this service the same session-level lock.
// PostgreSQL releases session-level advisory locks automatically when the connection closes.
const migrationAdvisoryLockKey = "8247761928473107201";

export async function runMigrations(
  client: MigrationExecutor,
  migrations: readonly Migration[],
  logger: Pick<Console, "log"> = console,
): Promise<MigrationRunResult> {
  validateMigrations(migrations);
  await acquireMigrationLock(client);

  let migrationError: unknown;

  try {
    return await runLockedMigrations(client, migrations, logger);
  } catch (error) {
    migrationError = error;
    throw error;
  } finally {
    try {
      await releaseMigrationLock(client);
    } catch (releaseError) {
      if (migrationError === undefined) {
        throw releaseError;
      }
    }
  }
}

async function runLockedMigrations(
  client: MigrationExecutor,
  migrations: readonly Migration[],
  logger: Pick<Console, "log">,
): Promise<MigrationRunResult> {
  await ensureSchemaMigrationsTable(client);

  const appliedRows = await client.query<AppliedMigrationRow>(
    "select id, checksum from schema_migrations order by id",
  );
  const appliedById = new Map(appliedRows.rows.map((row) => [row.id, row.checksum]));
  const result: MigrationRunResult = { applied: [], skipped: [] };

  for (const migration of migrations) {
    const checksum = calculateMigrationChecksum(migration);
    const appliedChecksum = appliedById.get(migration.id);

    if (appliedChecksum) {
      if (appliedChecksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${migration.id}`);
      }

      result.skipped.push(migration.id);
      continue;
    }

    logger.log(`Applying database migration ${migration.id}`);
    await applyMigration(client, migration, checksum);
    logger.log(`Applied database migration ${migration.id}`);
    result.applied.push(migration.id);
  }

  return result;
}

async function acquireMigrationLock(client: MigrationExecutor): Promise<void> {
  const lockResult = await client.query<AdvisoryLockRow>(
    "select pg_try_advisory_lock($1) as acquired",
    [migrationAdvisoryLockKey],
  );

  if (lockResult.rows[0]?.acquired !== true) {
    throw new Error("Database migration lock is held by another runner");
  }
}

async function releaseMigrationLock(client: MigrationExecutor): Promise<void> {
  const unlockResult = await client.query<AdvisoryUnlockRow>(
    "select pg_advisory_unlock($1) as released",
    [migrationAdvisoryLockKey],
  );

  if (unlockResult.rows[0]?.released !== true) {
    throw new Error("Failed to release database migration lock");
  }
}

export function calculateMigrationChecksum(migration: Migration): string {
  return createHash("sha256").update(migration.statements.join("\n\n")).digest("hex");
}

async function ensureSchemaMigrationsTable(client: MigrationExecutor): Promise<void> {
  await client.query(`
    create table if not exists schema_migrations (
      id text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function applyMigration(
  client: MigrationExecutor,
  migration: Migration,
  checksum: string,
): Promise<void> {
  const batch = renderMigrationBatch(migration, checksum);

  try {
    await client.query(batch);
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      throw new Error(
        `Failed to roll back database migration ${migration.id}: ${formatError(rollbackError)}`,
        { cause: error },
      );
    }

    throw new Error(
      `Failed to apply database migration ${migration.id} as a transactional batch: ${formatError(error)}`,
      { cause: error },
    );
  }
}

function renderMigrationBatch(migration: Migration, checksum: string): string {
  return [
    "begin",
    ...migration.statements,
    `insert into schema_migrations (id, checksum) values (${quoteSqlLiteral(migration.id)}, ${quoteSqlLiteral(checksum)})`,
    "commit",
  ].join(";\n");
}

function quoteSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function validateMigrations(migrations: readonly Migration[]): void {
  const ids = new Set<string>();
  let previousId = "";

  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate database migration id: ${migration.id}`);
    }
    if (previousId && migration.id <= previousId) {
      throw new Error(`Database migrations must be sorted by id: ${migration.id}`);
    }

    ids.add(migration.id);
    previousId = migration.id;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
