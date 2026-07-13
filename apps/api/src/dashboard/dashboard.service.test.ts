import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import type { CatalogService } from "../catalog/catalog.service.js";
import type {
  UserLibraryRepository,
  UserShlokaStatusRecord,
} from "../library/user-library.repository.js";
import { DashboardService } from "./dashboard.service.js";
import { InMemoryReviewHistoryRepository } from "./in-memory-review-history.repository.js";
import type {
  CreateReviewHistoryRecordInput,
  ListReviewHistorySummariesInput,
  ReviewHistoryRepository,
  ReviewHistorySummary,
} from "./review-history.repository.js";

const accountId = "account-1";
const now = new Date("2026-07-12T12:00:00.000Z");

describe("DashboardService review candidates", () => {
  test("excludes ineligible shlokas and applies every priority with deterministic ordering", async () => {
    const statuses = [
      reviewing("forgot-new", 20),
      reviewing("forgot-old", 20),
      reviewing("error-old", 20),
      reviewing("error-tie-b", 20),
      reviewing("error-tie-a", 20),
      reviewing("hint", 20),
      reviewing("young", 3),
      reviewing("overdue", 20),
      reviewing("other", 20),
      reviewing("started-today", 0, "2026-07-12T01:00:00.000Z"),
      reviewing("completed-today", 20),
      learning("not-reviewing", 30),
    ];
    const summaries: ReviewHistorySummary[] = [
      summary("forgot-old", "forgot", 8),
      summary("forgot-new", "forgot", 2),
      summary("error-old", "remembered_with_error", 6),
      summary("error-tie-a", "remembered_with_error", 3),
      summary("error-tie-b", "remembered_with_error", 3),
      summary("hint", "remembered_with_hint", 4),
      summary("young", "remembered_without_error", 1),
      summary("overdue", "remembered_without_error", 7),
      summary("other", "remembered_without_error", 2),
      { ...summary("completed-today", "forgot", 0), completedToday: true },
    ];
    const service = createService(statuses, summaries);

    const list = await service.getReviewShlokas(accountId, "UTC");

    assert.deepEqual(
      list.items.map(({ code }) => code),
      [
        "forgot-old",
        "forgot-new",
        "error-old",
        "error-tie-a",
        "error-tie-b",
        "hint",
        "young",
        "overdue",
        "other",
      ],
    );
    assert.equal(list.hasReviewingShlokas, true);
    assert.equal(list.remainingCount, 0);
    assert.equal(list.state, "active");
  });

  test("returns the initial five, remaining count, and then the authoritative full list", async () => {
    const statuses = Array.from({ length: 8 }, (_, index) =>
      reviewing(`review-${index + 1}`, 20 - index),
    );
    const service = createService(statuses);

    const initial = await service.getReviewShlokas(accountId, "UTC", 5);
    const full = await service.getReviewShlokas(accountId, "UTC");

    assert.deepEqual(
      initial.items.map(({ code }) => code),
      ["review-1", "review-2", "review-3", "review-4", "review-5"],
    );
    assert.equal(initial.remainingCount, 3);
    assert.deepEqual(
      full.items.map(({ code }) => code),
      statuses.map(({ shlokaCode }) => shlokaCode),
    );
    assert.equal(full.remainingCount, 0);
  });

  test("uses the IANA local day and removes any manually completed review from the count", async () => {
    const history = new TrackingReviewHistoryRepository();
    const statuses = [
      reviewing("same-local-day", 1, "2026-07-11T23:00:00.000Z"),
      reviewing("candidate-1", 10),
      reviewing("candidate-2", 9),
    ];
    const service = createService(statuses, [], history, () =>
      new Date("2026-07-12T00:30:00.000Z"),
    );

    const beforeManualReview = await service.getReviewShlokas(
      accountId,
      "America/Los_Angeles",
      1,
    );
    history.summaries = [
      {
        ...summary("candidate-2", "remembered_without_error", 0),
        completedToday: true,
      },
    ];
    const afterManualReview = await service.getReviewShlokas(
      accountId,
      "America/Los_Angeles",
      1,
    );

    assert.equal(history.lastInput?.userDay, "2026-07-11");
    assert.deepEqual(
      beforeManualReview.items.map(({ code }) => code),
      ["candidate-1"],
    );
    assert.equal(beforeManualReview.remainingCount, 1);
    assert.deepEqual(
      afterManualReview.items.map(({ code }) => code),
      ["candidate-1"],
    );
    assert.equal(afterManualReview.remainingCount, 0);
  });
});

describe("DashboardService review completion", () => {
  for (const result of [
    "remembered_without_error",
    "remembered_with_error",
    "remembered_with_hint",
    "forgot",
  ] as const) {
    test(`stores ${result} with the account, completion time, and local user day`, async () => {
      const history = new InMemoryReviewHistoryRepository();
      const completedAt = new Date("2026-07-12T00:30:00.000Z");
      const service = createService(
        [reviewing("review-1", 10)],
        [],
        history,
        () => new Date(completedAt),
      );

      const response = await service.completeReview(
        accountId,
        "review-1",
        result,
        "America/Los_Angeles",
      );

      assert.deepEqual(response, {
        status: 201,
        body: {
          completedAt: completedAt.toISOString(),
          result,
          shlokaCode: "review-1",
          userDay: "2026-07-11",
        },
      });
      const records = history.listRecords(accountId);
      assert.equal(records.length, 1);
      assert.equal(records[0]?.accountId, accountId);
      assert.equal(records[0]?.shlokaCode, "review-1");
      assert.equal(records[0]?.result, result);
      assert.equal(records[0]?.completedAt.toISOString(), completedAt.toISOString());
      assert.equal(records[0]?.userDay, "2026-07-11");
      assert.ok(records[0]?.id);

      const candidates = await service.getReviewShlokas(
        accountId,
        "America/Los_Angeles",
      );
      assert.deepEqual(candidates.items, []);
      assert.equal(candidates.state, "completed");
    });
  }

  test("rejects completion for a shloka outside reviewing status", async () => {
    const history = new InMemoryReviewHistoryRepository();
    const service = createService([learning("learn-1", 2)], [], history);

    const response = await service.completeReview(
      accountId,
      "learn-1",
      "remembered_without_error",
      "UTC",
    );

    assert.equal(response.status, 400);
    assert.deepEqual(history.listRecords(accountId), []);
  });
});

describe("DashboardService learning shlokas", () => {
  test("returns three oldest learning shlokas and the stable full list", async () => {
    const statuses = [
      learning("learn-d", 2),
      learning("learn-b", 4),
      learning("learn-a", 4),
      learning("learn-c", 3),
      reviewing("not-learning", 20),
    ];
    const service = createService(statuses);

    const initial = await service.getLearningShlokas(accountId, 3);
    const full = await service.getLearningShlokas(accountId);

    assert.deepEqual(
      initial.items.map(({ code }) => code),
      ["learn-a", "learn-b", "learn-c"],
    );
    assert.equal(initial.remainingCount, 1);
    assert.deepEqual(
      full.items.map(({ code }) => code),
      ["learn-a", "learn-b", "learn-c", "learn-d"],
    );
    assert.equal(full.remainingCount, 0);
    assert.equal(full.hasLearningShlokas, true);
  });
});

function createService(
  statuses: UserShlokaStatusRecord[],
  summaries: ReviewHistorySummary[] = [],
  history: ReviewHistoryRepository = reviewHistory(summaries),
  clock: () => Date = () => new Date(now),
): DashboardService {
  const shlokaCodes = [...new Set(statuses.map(({ shlokaCode }) => shlokaCode))];
  const catalogShlokas = shlokaCodes.map(shloka);
  const catalog = {
    getLibraryShloka: async (shlokaCode: string) =>
      catalogShlokas.find((candidate) => candidate.code === shlokaCode),
    listLibraryShlokas: async () => catalogShlokas,
  } as unknown as CatalogService;
  const userLibrary = {
    listShlokaStatuses: async () => cloneStatuses(statuses),
  } as unknown as UserLibraryRepository;

  return new DashboardService(catalog, userLibrary, history, clock);
}

function reviewHistory(
  summaries: ReviewHistorySummary[],
): ReviewHistoryRepository {
  const repository = new InMemoryReviewHistoryRepository();
  repository.setSummaries(accountId, summaries);
  return repository;
}

class TrackingReviewHistoryRepository implements ReviewHistoryRepository {
  lastInput: ListReviewHistorySummariesInput | undefined;
  summaries: ReviewHistorySummary[] = [];

  async create(_input: CreateReviewHistoryRecordInput): Promise<void> {
    throw new Error("Unexpected review history write");
  }

  async listSummaries(
    input: ListReviewHistorySummariesInput,
  ): Promise<ReviewHistorySummary[]> {
    this.lastInput = input;
    return this.summaries.map((item) => ({
      ...item,
      lastCompletedAt: new Date(item.lastCompletedAt),
    }));
  }
}

function reviewing(
  shlokaCode: string,
  createdDaysAgo: number,
  reviewingStartedAt = daysAgo(createdDaysAgo).toISOString(),
): UserShlokaStatusRecord {
  return {
    createdAt: daysAgo(createdDaysAgo + 2),
    reviewingStartedAt: new Date(reviewingStartedAt),
    shlokaCode,
    status: "reviewing",
  };
}

function learning(
  shlokaCode: string,
  createdDaysAgo: number,
): UserShlokaStatusRecord {
  return {
    createdAt: daysAgo(createdDaysAgo),
    shlokaCode,
    status: "learning",
  };
}

function summary(
  shlokaCode: string,
  lastResult: ReviewHistorySummary["lastResult"],
  completedDaysAgo: number,
): ReviewHistorySummary {
  return {
    completedToday: false,
    lastCompletedAt: daysAgo(completedDaysAgo),
    lastResult,
    shlokaCode,
  };
}

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1_000);
}

function shloka(code: string): ApiTypes.LibraryShlokaDto {
  return {
    code,
    displayTitle: code,
    number: code,
    personalStatus: "available",
    sourceTitle: "Источник",
    text: `${code} первая строка\n${code} вторая строка`,
  };
}

function cloneStatuses(
  statuses: UserShlokaStatusRecord[],
): UserShlokaStatusRecord[] {
  return statuses.map((status) => ({
    ...status,
    createdAt: new Date(status.createdAt),
    ...(status.reviewingStartedAt
      ? { reviewingStartedAt: new Date(status.reviewingStartedAt) }
      : {}),
  }));
}
