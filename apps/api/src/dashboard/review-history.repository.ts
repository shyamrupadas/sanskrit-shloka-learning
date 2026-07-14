export type ReviewResult =
  | "remembered_without_error"
  | "remembered_with_error"
  | "remembered_with_hint"
  | "forgot";

export interface ReviewHistorySummary {
  completedToday: boolean;
  lastCompletedAt: Date;
  lastResult: ReviewResult;
  shlokaCode: string;
}

export interface ReviewHistoryRecord {
  accountId: string;
  completedAt: Date;
  id: string;
  result: ReviewResult;
  shlokaCode: string;
  userDay: string;
}

export type CreateReviewHistoryRecordInput = ReviewHistoryRecord;

export interface ListReviewHistorySummariesInput {
  accountId: string;
  userDay: string;
}

export interface ReviewHistoryRepository {
  create(input: CreateReviewHistoryRecordInput): Promise<void>;
  listActivityDays(accountId: string): Promise<string[]>;
  listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]>;
}

export const REVIEW_HISTORY_REPOSITORY = Symbol("REVIEW_HISTORY_REPOSITORY");
