import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
  type ClearUserShlokaStatusInput,
  type MarkShlokaLearnedInput,
  type MarkShlokaLearnedResult,
  type SetUserShlokaStatusInput,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "./user-library.repository.js";

interface UserShlokaStatusRow {
  reviewing_started_at: Date | null;
  shloka_code: string;
  status: string;
}

interface MarkShlokaLearnedRow {
  reviewing_started_at: Date;
  transitioned: boolean;
}

@Injectable()
export class PostgresUserLibraryRepository implements UserLibraryRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<boolean> {
    const result = await this.database.idempotentWriteQuery(
      `
        delete from user_shlokas
        where account_id = $1 and shloka_code = $2 and status = 'learning'
      `,
      [input.accountId, input.shlokaCode],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]> {
    const result = await this.database.fastReadQuery<UserShlokaStatusRow>(
      `
        select shloka_code, status, reviewing_started_at
        from user_shlokas
        where account_id = $1
      `,
      [accountId],
    );

    return result.rows.map(mapStatusRow);
  }

  async markShlokaLearned(
    input: MarkShlokaLearnedInput,
  ): Promise<MarkShlokaLearnedResult> {
    const result = await this.database.idempotentWriteQuery<MarkShlokaLearnedRow>(
      `
        with transitioned as (
          update user_shlokas
          set status = 'reviewing', reviewing_started_at = $3, updated_at = $3
          where account_id = $1 and shloka_code = $2 and status = 'learning'
          returning reviewing_started_at
        )
        select reviewing_started_at, true as transitioned
        from transitioned
        union all
        select reviewing_started_at, false as transitioned
        from user_shlokas
        where account_id = $1
          and shloka_code = $2
          and status = 'reviewing'
          and not exists (select 1 from transitioned)
        limit 1
      `,
      [input.accountId, input.shlokaCode, input.reviewingStartedAt],
    );
    const row = result.rows[0];

    if (!row) {
      return { kind: "not-learning" };
    }

    return {
      kind: row.transitioned ? "transitioned" : "already-reviewing",
      reviewingStartedAt: row.reviewing_started_at,
    };
  }

  async setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void> {
    await this.database.idempotentWriteQuery(
      `
        insert into user_shlokas (account_id, shloka_code, status)
        values ($1, $2, $3)
        on conflict (account_id, shloka_code)
        do nothing
      `,
      [input.accountId, input.shlokaCode, input.status],
    );
  }
}

function mapStatusRow(row: UserShlokaStatusRow): UserShlokaStatusRecord {
  if (row.status !== "learning" && row.status !== "reviewing") {
    throw new Error(`Unknown user shloka status: ${row.status}`);
  }
  if (row.status === "reviewing" && !row.reviewing_started_at) {
    throw new Error("Reviewing user shloka status is missing reviewing_started_at");
  }
  if (row.status === "learning" && row.reviewing_started_at) {
    throw new Error("Learning user shloka status unexpectedly has reviewing_started_at");
  }

  return {
    ...(row.reviewing_started_at
      ? { reviewingStartedAt: row.reviewing_started_at }
      : {}),
    shlokaCode: row.shloka_code,
    status: row.status,
  };
}
