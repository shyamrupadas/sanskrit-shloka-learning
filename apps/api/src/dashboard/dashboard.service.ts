import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { notFoundError, validationError } from "../auth/api-error.js";
import { CatalogService } from "../catalog/catalog.service.js";
import {
  USER_LIBRARY_REPOSITORY,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "../library/user-library.repository.js";
import {
  createUserDayFormatter,
  formatUserDay,
  getUserDay,
} from "../shared/user-day.js";
import {
  REVIEW_HISTORY_REPOSITORY,
  type ReviewHistoryRepository,
  type ReviewHistorySummary,
  type ReviewResult,
} from "./review-history.repository.js";

const fiveDaysInMilliseconds = 5 * 24 * 60 * 60 * 1_000;

export type DashboardClock = () => Date;
export const DASHBOARD_CLOCK = Symbol("DASHBOARD_CLOCK");

interface RankedReviewCandidate {
  effectiveLastAt: Date;
  priority: number;
  shloka: ApiTypes.DashboardShlokaDto;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(USER_LIBRARY_REPOSITORY)
    private readonly userLibrary: UserLibraryRepository,
    @Inject(REVIEW_HISTORY_REPOSITORY)
    private readonly reviewHistory: ReviewHistoryRepository,
    @Inject(DASHBOARD_CLOCK) private readonly now: DashboardClock,
  ) {}

  async completeReview(
    accountId: string,
    shlokaCode: string,
    result: ReviewResult,
    timeZone: string,
  ): Promise<
    | { status: 201; body: ApiTypes.CompletedReviewDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 404; body: ApiTypes.ApiError }
  > {
    const [shloka, statuses] = await Promise.all([
      this.catalog.getLibraryShloka(shlokaCode),
      this.userLibrary.listShlokaStatuses(accountId),
    ]);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }
    if (
      statuses.find((status) => status.shlokaCode === shlokaCode)?.status !==
      "reviewing"
    ) {
      return {
        status: 400,
        body: validationError([
          "Только шлоку в статусе «повторяю» можно завершить как повторение",
        ]),
      };
    }

    const completedAt = this.now();
    const userDay = getUserDay(completedAt, timeZone);
    await this.reviewHistory.create({
      accountId,
      completedAt,
      id: randomUUID(),
      result,
      shlokaCode,
      userDay,
    });

    return {
      status: 201,
      body: {
        completedAt: completedAt.toISOString(),
        result,
        shlokaCode,
        userDay,
      },
    };
  }

  async getLearningShlokas(
    accountId: string,
    limit?: number,
  ): Promise<ApiTypes.DashboardLearningShlokaListDto> {
    const [catalogShlokas, statuses] = await Promise.all([
      this.catalog.listLibraryShlokas(),
      this.userLibrary.listShlokaStatuses(accountId),
    ]);
    const shlokaByCode = new Map(
      catalogShlokas.map((shloka) => [shloka.code, shloka]),
    );
    const allItems = statuses
      .filter((status) => status.status === "learning")
      .sort(compareLearningStatuses)
      .map((status) => shlokaByCode.get(status.shlokaCode))
      .filter((shloka): shloka is ApiTypes.LibraryShlokaDto => Boolean(shloka))
      .map(toDashboardShloka);
    const items = applyLimit(allItems, limit);

    return {
      hasLearningShlokas: allItems.length > 0,
      items,
      remainingCount: allItems.length - items.length,
    };
  }

  async getReviewShlokas(
    accountId: string,
    timeZone: string,
    limit?: number,
  ): Promise<ApiTypes.DashboardReviewShlokaListDto> {
    const now = this.now();
    const formatter = createUserDayFormatter(timeZone);
    const userDay = formatUserDay(now, formatter);
    const [catalogShlokas, statuses, summaries] = await Promise.all([
      this.catalog.listLibraryShlokas(),
      this.userLibrary.listShlokaStatuses(accountId),
      this.reviewHistory.listSummaries({ accountId, userDay }),
    ]);
    const shlokaByCode = new Map(
      catalogShlokas.map((shloka) => [shloka.code, shloka]),
    );
    const summaryByCode = new Map(
      summaries.map((summary) => [summary.shlokaCode, summary]),
    );
    const reviewingStatuses = statuses.filter(
      (
        status,
      ): status is UserShlokaStatusRecord & { reviewingStartedAt: Date } =>
        status.status === "reviewing" && Boolean(status.reviewingStartedAt),
    );
    const candidates = reviewingStatuses
      .filter(
        (status) =>
          formatUserDay(status.reviewingStartedAt, formatter) !== userDay &&
          !summaryByCode.get(status.shlokaCode)?.completedToday,
      )
      .map((status) => {
        const shloka = shlokaByCode.get(status.shlokaCode);
        if (!shloka) {
          return undefined;
        }

        return rankCandidate(
          toDashboardShloka(shloka),
          status.reviewingStartedAt,
          summaryByCode.get(status.shlokaCode),
          now,
        );
      })
      .filter(
        (candidate): candidate is RankedReviewCandidate => Boolean(candidate),
      )
      .sort(compareReviewCandidates);
    const allItems = candidates.map((candidate) => candidate.shloka);
    const items = applyLimit(allItems, limit);
    const completedToday = reviewingStatuses.some(
      (status) => summaryByCode.get(status.shlokaCode)?.completedToday,
    );

    return {
      hasReviewingShlokas: reviewingStatuses.length > 0,
      items,
      remainingCount: allItems.length - items.length,
      state:
        allItems.length > 0
          ? "active"
          : completedToday
            ? "completed"
            : "empty",
    };
  }
}

function rankCandidate(
  shloka: ApiTypes.DashboardShlokaDto,
  reviewingStartedAt: Date,
  summary: ReviewHistorySummary | undefined,
  now: Date,
): RankedReviewCandidate {
  const effectiveLastAt = summary?.lastCompletedAt ?? reviewingStartedAt;

  return {
    effectiveLastAt,
    priority: reviewPriority(
      summary?.lastResult,
      reviewingStartedAt,
      effectiveLastAt,
      now,
    ),
    shloka,
  };
}

function reviewPriority(
  lastResult: ReviewResult | undefined,
  reviewingStartedAt: Date,
  effectiveLastAt: Date,
  now: Date,
): number {
  if (lastResult === "forgot") {
    return 0;
  }
  if (lastResult === "remembered_with_error") {
    return 1;
  }
  if (lastResult === "remembered_with_hint") {
    return 2;
  }
  if (now.getTime() - reviewingStartedAt.getTime() < fiveDaysInMilliseconds) {
    return 3;
  }
  if (now.getTime() - effectiveLastAt.getTime() > fiveDaysInMilliseconds) {
    return 4;
  }

  return 5;
}

function compareReviewCandidates(
  left: RankedReviewCandidate,
  right: RankedReviewCandidate,
): number {
  return (
    left.priority - right.priority ||
    left.effectiveLastAt.getTime() - right.effectiveLastAt.getTime() ||
    left.shloka.code.localeCompare(right.shloka.code)
  );
}

function compareLearningStatuses(
  left: UserShlokaStatusRecord,
  right: UserShlokaStatusRecord,
): number {
  return (
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.shlokaCode.localeCompare(right.shlokaCode)
  );
}

function applyLimit<T>(items: T[], limit: number | undefined): T[] {
  return limit === undefined ? items : items.slice(0, limit);
}

function toDashboardShloka(
  shloka: ApiTypes.LibraryShlokaDto,
): ApiTypes.DashboardShlokaDto {
  return {
    code: shloka.code,
    displayTitle: shloka.displayTitle,
    text: shloka.text,
  };
}
