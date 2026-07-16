import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
  type CreateReviewHistoryRecordInput,
  type ListReviewHistorySummariesInput,
  type ReviewHistoryRepository,
  type ReviewHistorySummary,
  type ReviewResult,
} from "./review-history.repository.js";

interface ReviewHistorySummaryRow {
  completed_today: boolean;
  last_completed_at: Date;
  last_result: string;
  shloka_code: string;
}

interface ReviewActivityDayRow {
  user_day: string;
}

@Injectable()
export class PostgresReviewHistoryRepository
  implements ReviewHistoryRepository
{
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async create(input: CreateReviewHistoryRecordInput): Promise<void> {
    await this.database.writeQuery(
      `
        insert into shloka_reviews (
          id,
          account_id,
          shloka_code,
          completed_at,
          user_day,
          result
        )
        values ($1, $2, $3, $4, $5::date, $6)
        on conflict (id) do nothing
      `,
      [
        input.id,
        input.accountId,
        input.shlokaCode,
        input.completedAt,
        input.userDay,
        input.result,
      ],
    );
  }

  async listActivityDays(accountId: string): Promise<string[]> {
    const result = await this.database.readQuery<ReviewActivityDayRow>(
      `
        select distinct user_day::text as user_day
        from shloka_reviews
        where account_id = $1
        order by user_day desc
      `,
      [accountId],
    );

    return result.rows.map(({ user_day }) => user_day);
  }

  async listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]> {
    const result = await this.database.readQuery<ReviewHistorySummaryRow>(
      `
        select distinct on (shloka_code)
          shloka_code,
          completed_at as last_completed_at,
          result as last_result,
          bool_or(user_day = $2::date) over (
            partition by shloka_code
          ) as completed_today
        from shloka_reviews
        where account_id = $1
        order by shloka_code, completed_at desc, id desc
      `,
      [input.accountId, input.userDay],
    );

    return result.rows.map((row) => ({
      completedToday: row.completed_today,
      lastCompletedAt: row.last_completed_at,
      lastResult: toReviewResult(row.last_result),
      shlokaCode: row.shloka_code,
    }));
  }
}

function toReviewResult(value: string): ReviewResult {
  if (
    value === "remembered_without_error" ||
    value === "remembered_with_error" ||
    value === "remembered_with_hint" ||
    value === "forgot"
  ) {
    return value;
  }

  throw new Error(`Unknown review result: ${value}`);
}
