import {
  type ListReviewHistorySummariesInput,
  type ReviewHistoryRepository,
  type ReviewHistorySummary,
} from "./review-history.repository.js";

export class InMemoryReviewHistoryRepository
  implements ReviewHistoryRepository
{
  private readonly summariesByAccount = new Map<
    string,
    ReviewHistorySummary[]
  >();

  async listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]> {
    return (this.summariesByAccount.get(input.accountId) ?? []).map(
      (summary) => ({
        ...summary,
        lastCompletedAt: new Date(summary.lastCompletedAt),
      }),
    );
  }

  setSummaries(
    accountId: string,
    summaries: readonly ReviewHistorySummary[],
  ): void {
    this.summariesByAccount.set(
      accountId,
      summaries.map((summary) => ({
        ...summary,
        lastCompletedAt: new Date(summary.lastCompletedAt),
      })),
    );
  }
}
