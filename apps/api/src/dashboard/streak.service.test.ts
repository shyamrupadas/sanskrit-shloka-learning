import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  UserLibraryRepository,
  UserShlokaStatusRecord,
} from "../library/user-library.repository.js";
import type { ReviewHistoryRepository } from "./review-history.repository.js";
import { StreakService } from "./streak.service.js";

const accountId = "account-1";

describe("StreakService", () => {
  test("counts the first activity once even when review and learning activities share a day", async () => {
    const service = createService({
      learningDays: ["2026-07-12"],
      now: "2026-07-12T12:00:00.000Z",
      reviewDays: ["2026-07-12", "2026-07-12"],
    });

    assert.deepEqual(await service.getStreak(accountId, "UTC"), {
      continuedToday: true,
      days: 1,
      history: [
        { hasActivity: false, userDay: "2026-07-08" },
        { hasActivity: false, userDay: "2026-07-09" },
        { hasActivity: false, userDay: "2026-07-10" },
        { hasActivity: false, userDay: "2026-07-11" },
        { hasActivity: true, userDay: "2026-07-12" },
      ],
    });
  });

  test("preserves consecutive days before today's first activity and activates after it", async () => {
    const pending = createService({
      now: "2026-07-12T12:00:00.000Z",
      reviewDays: ["2026-07-09", "2026-07-10", "2026-07-11"],
    });
    const active = createService({
      learningDays: ["2026-07-12"],
      now: "2026-07-12T12:00:00.000Z",
      reviewDays: ["2026-07-09", "2026-07-10", "2026-07-11"],
    });

    assert.deepEqual(await pending.getStreak(accountId, "UTC"), {
      continuedToday: false,
      days: 3,
      history: [
        { hasActivity: false, userDay: "2026-07-08" },
        { hasActivity: true, userDay: "2026-07-09" },
        { hasActivity: true, userDay: "2026-07-10" },
        { hasActivity: true, userDay: "2026-07-11" },
        { hasActivity: false, userDay: "2026-07-12" },
      ],
    });
    assert.deepEqual(await active.getStreak(accountId, "UTC"), {
      continuedToday: true,
      days: 4,
      history: [
        { hasActivity: false, userDay: "2026-07-08" },
        { hasActivity: true, userDay: "2026-07-09" },
        { hasActivity: true, userDay: "2026-07-10" },
        { hasActivity: true, userDay: "2026-07-11" },
        { hasActivity: true, userDay: "2026-07-12" },
      ],
    });
  });

  test("preserves the series during the grace period and continues it on new activity", async () => {
    const pending = createService({
      now: "2026-07-12T12:00:00.000Z",
      reviewDays: ["2026-07-08", "2026-07-09", "2026-07-10"],
    });
    const continued = createService({
      now: "2026-07-12T12:00:00.000Z",
      reviewDays: ["2026-07-08", "2026-07-09", "2026-07-10", "2026-07-12"],
    });

    assert.deepEqual(await pending.getStreak(accountId, "UTC"), {
      continuedToday: false,
      days: 3,
      history: [
        { hasActivity: true, userDay: "2026-07-08" },
        { hasActivity: true, userDay: "2026-07-09" },
        { hasActivity: true, userDay: "2026-07-10" },
        { hasActivity: false, userDay: "2026-07-11" },
        { hasActivity: false, userDay: "2026-07-12" },
      ],
    });
    assert.deepEqual(await continued.getStreak(accountId, "UTC"), {
      continuedToday: true,
      days: 4,
      history: [
        { hasActivity: true, userDay: "2026-07-08" },
        { hasActivity: true, userDay: "2026-07-09" },
        { hasActivity: true, userDay: "2026-07-10" },
        { hasActivity: false, userDay: "2026-07-11" },
        { hasActivity: true, userDay: "2026-07-12" },
      ],
    });
  });

  test("uses the user's IANA day across the UTC date boundary", async () => {
    const service = createService({
      now: "2026-07-12T00:30:00.000Z",
      reviewDays: ["2026-07-10", "2026-07-11", "2026-07-12"],
    });

    assert.deepEqual(
      await service.getStreak(accountId, "America/Los_Angeles"),
      {
        continuedToday: true,
        days: 2,
        history: [
          { hasActivity: false, userDay: "2026-07-07" },
          { hasActivity: false, userDay: "2026-07-08" },
          { hasActivity: false, userDay: "2026-07-09" },
          { hasActivity: true, userDay: "2026-07-10" },
          { hasActivity: true, userDay: "2026-07-11" },
        ],
      },
    );
  });
});

function createService({
  learningDays = [],
  now,
  reviewDays = [],
}: {
  learningDays?: string[];
  now: string;
  reviewDays?: string[];
}): StreakService {
  const statuses = learningDays.map(reviewingStatus);
  const userLibrary = {
    listShlokaStatuses: async () => statuses,
  } as unknown as UserLibraryRepository;
  const reviewHistory = {
    listActivityDays: async () => [...reviewDays],
  } as unknown as ReviewHistoryRepository;

  return new StreakService(
    userLibrary,
    reviewHistory,
    () => new Date(now),
  );
}

function reviewingStatus(
  reviewingStartedUserDay: string,
  index: number,
): UserShlokaStatusRecord {
  return {
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    reviewingStartedAt: new Date("2026-07-01T00:00:00.000Z"),
    reviewingStartedUserDay,
    shlokaCode: `shloka-${index + 1}`,
    status: "reviewing",
  };
}
