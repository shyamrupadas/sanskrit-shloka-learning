import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
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

@Injectable()
export class PostgresReviewHistoryRepository
  implements ReviewHistoryRepository
{
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]> {
    const result = await this.database.fastReadQuery<ReviewHistorySummaryRow>(
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
