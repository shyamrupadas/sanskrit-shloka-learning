import {
  type ClearUserShlokaStatusInput,
  type MarkShlokaLearnedInput,
  type MarkShlokaLearnedResult,
  type SetUserShlokaStatusInput,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "./user-library.repository.js";

export class InMemoryUserLibraryRepository implements UserLibraryRepository {
  private readonly statuses = new Map<string, UserShlokaStatusRecord>();

  async clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<boolean> {
    const key = statusKey(input.accountId, input.shlokaCode);
    if (this.statuses.get(key)?.status !== "learning") {
      return false;
    }

    return this.statuses.delete(key);
  }

  async listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]> {
    return [...this.statuses.entries()]
      .filter(([key]) => key.startsWith(`${accountId}:`))
      .map(([, status]) => ({
        ...status,
        createdAt: new Date(status.createdAt),
        ...(status.reviewingStartedAt
          ? { reviewingStartedAt: new Date(status.reviewingStartedAt) }
          : {}),
        ...(status.reviewingStartedUserDay
          ? { reviewingStartedUserDay: status.reviewingStartedUserDay }
          : {}),
      }));
  }

  async markShlokaLearned(
    input: MarkShlokaLearnedInput,
  ): Promise<MarkShlokaLearnedResult> {
    const key = statusKey(input.accountId, input.shlokaCode);
    const current = this.statuses.get(key);

    if (current?.status === "reviewing" && current.reviewingStartedAt) {
      return {
        kind: "already-reviewing",
        reviewingStartedAt: new Date(current.reviewingStartedAt),
        ...(current.reviewingStartedUserDay
          ? { reviewingStartedUserDay: current.reviewingStartedUserDay }
          : {}),
      };
    }
    if (current?.status !== "learning") {
      return { kind: "not-learning" };
    }

    const reviewingStartedAt = new Date(input.reviewingStartedAt);
    this.statuses.set(key, {
      createdAt: new Date(current.createdAt),
      reviewingStartedAt,
      reviewingStartedUserDay: input.reviewingStartedUserDay,
      shlokaCode: input.shlokaCode,
      status: "reviewing",
    });

    return {
      kind: "transitioned",
      reviewingStartedAt: new Date(reviewingStartedAt),
      reviewingStartedUserDay: input.reviewingStartedUserDay,
    };
  }

  async setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void> {
    const key = statusKey(input.accountId, input.shlokaCode);
    if (this.statuses.get(key)?.status === "reviewing") {
      return;
    }

    this.statuses.set(key, {
      createdAt: new Date(input.createdAt),
      shlokaCode: input.shlokaCode,
      status: input.status,
    });
  }
}

function statusKey(accountId: string, shlokaCode: string): string {
  return `${accountId}:${shlokaCode}`;
}
