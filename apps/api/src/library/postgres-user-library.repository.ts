import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
  type ClearUserShlokaStatusInput,
  type SetUserShlokaStatusInput,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "./user-library.repository.js";

interface UserShlokaStatusRow {
  shloka_code: string;
  status: string;
}

@Injectable()
export class PostgresUserLibraryRepository implements UserLibraryRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<void> {
    await this.database.idempotentWriteQuery(
      `
        delete from user_shlokas
        where account_id = $1 and shloka_code = $2
      `,
      [input.accountId, input.shlokaCode],
    );
  }

  async listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]> {
    const result = await this.database.fastReadQuery<UserShlokaStatusRow>(
      `
        select shloka_code, status
        from user_shlokas
        where account_id = $1
      `,
      [accountId],
    );

    return result.rows.map(mapStatusRow);
  }

  async setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void> {
    await this.database.idempotentWriteQuery(
      `
        insert into user_shlokas (account_id, shloka_code, status)
        values ($1, $2, $3)
        on conflict (account_id, shloka_code)
        do update set status = excluded.status, updated_at = now()
      `,
      [input.accountId, input.shlokaCode, input.status],
    );
  }
}

function mapStatusRow(row: UserShlokaStatusRow): UserShlokaStatusRecord {
  if (row.status !== "learning" && row.status !== "reviewing") {
    throw new Error(`Unknown user shloka status: ${row.status}`);
  }

  return {
    shlokaCode: row.shloka_code,
    status: row.status,
  };
}
