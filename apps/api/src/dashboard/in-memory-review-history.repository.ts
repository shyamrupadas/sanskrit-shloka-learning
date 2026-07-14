import {
  type CreateReviewHistoryRecordInput,
  type ListReviewHistorySummariesInput,
  type ReviewHistoryRepository,
  type ReviewHistoryRecord,
  type ReviewHistorySummary,
} from "./review-history.repository.js";

export class InMemoryReviewHistoryRepository
  implements ReviewHistoryRepository
{
  private readonly summariesByAccount = new Map<
    string,
    ReviewHistorySummary[]
  >();
  private readonly recordsByAccount = new Map<string, ReviewHistoryRecord[]>();

  async create(input: CreateReviewHistoryRecordInput): Promise<void> {
    const records = this.recordsByAccount.get(input.accountId) ?? [];
    records.push(cloneRecord(input));
    this.recordsByAccount.set(input.accountId, records);
  }

  async listActivityDays(accountId: string): Promise<string[]> {
    return [
      ...new Set(
        (this.recordsByAccount.get(accountId) ?? []).map(
          ({ userDay }) => userDay,
        ),
      ),
    ];
  }

  async listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]> {
    const summaries = new Map(
      (this.summariesByAccount.get(input.accountId) ?? []).map((summary) => [
        summary.shlokaCode,
        {
          ...summary,
          lastCompletedAt: new Date(summary.lastCompletedAt),
        },
      ]),
    );

    for (const record of this.recordsByAccount.get(input.accountId) ?? []) {
      const previous = summaries.get(record.shlokaCode);
      const isLatest =
        !previous || record.completedAt.getTime() >= previous.lastCompletedAt.getTime();

      summaries.set(record.shlokaCode, {
        completedToday:
          previous?.completedToday === true || record.userDay === input.userDay,
        lastCompletedAt: isLatest
          ? new Date(record.completedAt)
          : new Date(previous.lastCompletedAt),
        lastResult: isLatest ? record.result : previous.lastResult,
        shlokaCode: record.shlokaCode,
      });
    }

    return [...summaries.values()];
  }

  listRecords(accountId: string): ReviewHistoryRecord[] {
    return (this.recordsByAccount.get(accountId) ?? []).map(cloneRecord);
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

function cloneRecord(record: ReviewHistoryRecord): ReviewHistoryRecord {
  return {
    ...record,
    completedAt: new Date(record.completedAt),
  };
}
