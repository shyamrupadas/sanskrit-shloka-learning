import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  USER_LIBRARY_REPOSITORY,
  type UserLibraryRepository,
} from "../library/user-library.repository.js";
import { getUserDay } from "../shared/user-day.js";
import {
  REVIEW_HISTORY_REPOSITORY,
  type ReviewHistoryRepository,
} from "./review-history.repository.js";

const millisecondsPerCalendarDay = 24 * 60 * 60 * 1_000;

export type StreakClock = () => Date;
export const STREAK_CLOCK = Symbol("STREAK_CLOCK");

@Injectable()
export class StreakService {
  constructor(
    @Inject(USER_LIBRARY_REPOSITORY)
    private readonly userLibrary: UserLibraryRepository,
    @Inject(REVIEW_HISTORY_REPOSITORY)
    private readonly reviewHistory: ReviewHistoryRepository,
    @Inject(STREAK_CLOCK) private readonly now: StreakClock,
  ) {}

  async getStreak(
    accountId: string,
    timeZone: string,
  ): Promise<ApiTypes.DashboardStreakDto> {
    const [statuses, reviewDays] = await Promise.all([
      this.userLibrary.listShlokaStatuses(accountId),
      this.reviewHistory.listActivityDays(accountId),
    ]);
    const learningDays = statuses.flatMap(({ reviewingStartedUserDay }) =>
      reviewingStartedUserDay ? [reviewingStartedUserDay] : [],
    );

    return calculateStreak(
      [...reviewDays, ...learningDays],
      getUserDay(this.now(), timeZone),
    );
  }
}

function calculateStreak(
  activityDays: readonly string[],
  today: string,
): ApiTypes.DashboardStreakDto {
  const todayTime = parseUserDay(today);
  const orderedDayTimes = [...new Set(activityDays)]
    .map(parseUserDay)
    .filter((dayTime) => dayTime <= todayTime)
    .sort((left, right) => right - left);
  const latestTime = orderedDayTimes[0];

  if (
    latestTime === undefined ||
    todayTime - latestTime > millisecondsPerCalendarDay
  ) {
    return { continuedToday: false, days: 0 };
  }

  let days = 0;
  let expectedTime = latestTime;
  for (const dayTime of orderedDayTimes) {
    if (dayTime !== expectedTime) {
      break;
    }

    days += 1;
    expectedTime -= millisecondsPerCalendarDay;
  }

  return {
    continuedToday: latestTime === todayTime,
    days,
  };
}

function parseUserDay(userDay: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(userDay);
  if (!match) {
    throw new Error(`Invalid user day: ${userDay}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid user day: ${userDay}`);
  }

  return date.getTime();
}
