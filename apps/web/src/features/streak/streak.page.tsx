import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  PageHeader,
  StatusCard,
  StreakCounter,
  StreakIcon,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

const weekdayLetters = ["В", "П", "В", "С", "Ч", "П", "С"] as const;
const accessibleDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const accessibleWeekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  weekday: "long",
});

export function StreakPage() {
  const auth = useSession();
  const navigate = useNavigate();
  const timeZone = getBrowserTimeZone();
  const streakQuery = useQuery({
    queryFn: () => auth.apiClient.getStreak(timeZone),
    queryKey: ["dashboard", "streak", auth.account?.id, timeZone],
  });

  useUnauthorizedRedirect(streakQuery.error);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        backAction={{
          label: strings.streak.backToDashboard,
          onClick: () => {
            void navigate({ to: routePaths.dashboard });
          },
        }}
        title={strings.streak.title}
      />
      {streakQuery.isPending ? (
        <div className="pt-5">
          <StatusCard title={strings.common.loading} />
        </div>
      ) : streakQuery.error ? (
        <div className="pt-5">
          <StatusCard
            description={getApiErrorMessage(
              streakQuery.error,
              strings.streak.loadError,
            )}
            title={strings.common.error}
          />
        </div>
      ) : (
        <StreakContent streak={streakQuery.data} />
      )}
    </section>
  );
}

function StreakContent({ streak }: { streak: ApiTypes.DashboardStreakDto }) {
  const message =
    streak.days === 0
      ? strings.streak.startMessage
      : streak.continuedToday
        ? strings.streak.continuedMessage
        : strings.streak.continueMessage;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7">
      <div className="flex w-full flex-col items-center gap-5">
        <div className="flex size-26 items-center justify-center rounded-full bg-secondary">
          <StreakIcon size="hero" />
        </div>
        <StreakCounter days={streak.days} />
      </div>
      <StreakHistory history={streak.history} />
      <Typography className="w-full max-w-80 text-center" variant="p3">
        {message}
      </Typography>
    </div>
  );
}

function StreakHistory({
  history,
}: {
  history: ApiTypes.DashboardStreakHistoryDayDto[];
}) {
  return (
    <ul
      aria-label={strings.streak.historyLabel}
      className="m-0 flex w-60 list-none justify-between p-0"
    >
      {history.map((day, index) => {
        const calendarDay = parseUserDay(day.userDay);
        const isToday = index === history.length - 1;
        const activityLabel = day.hasActivity
          ? "активность была"
          : "активности не было";

        return (
          <li
            aria-label={`${accessibleDateFormatter.format(calendarDay)}, ${accessibleWeekdayFormatter.format(calendarDay)}: ${activityLabel}`}
            className="flex w-10 flex-col items-center gap-1.5"
            key={day.userDay}
          >
            <Typography
              as="span"
              tone={isToday ? "default" : "muted"}
              variant="p2"
              weight={isToday ? "bold" : "medium"}
            >
              {weekdayLetters[calendarDay.getUTCDay()]}
            </Typography>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 items-center justify-center rounded-full border",
                day.hasActivity
                  ? "border-[var(--success-border)] bg-[var(--success-background)] [color:var(--success)]"
                  : "border-[var(--border-strong)] bg-card",
              )}
            >
              {day.hasActivity ? <Check className="size-4.5" /> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function parseUserDay(userDay: string): Date {
  return new Date(`${userDay}T00:00:00.000Z`);
}
