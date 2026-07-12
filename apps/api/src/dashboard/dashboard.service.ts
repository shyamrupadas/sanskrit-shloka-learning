import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { CatalogService } from "../catalog/catalog.service.js";
import {
  USER_LIBRARY_REPOSITORY,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "../library/user-library.repository.js";
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

export function isValidTimeZone(timeZone: string): boolean {
  try {
    createUserDayFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
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

function createUserDayFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
}

function formatUserDay(
  date: Date,
  formatter: Intl.DateTimeFormat,
): string {
  const parts = new Map(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}
