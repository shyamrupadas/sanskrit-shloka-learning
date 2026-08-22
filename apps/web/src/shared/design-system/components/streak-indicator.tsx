import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

import { strings } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { routePaths } from "@/shared/model/routes";

import { Typography } from "./typography";

export type StreakIndicatorProps = {
  continuedToday: boolean;
  days: number;
};

export type StreakIconProps = {
  muted?: boolean;
  size?: "button" | "hero";
};

export function StreakIndicator({ continuedToday, days }: StreakIndicatorProps) {
  const formattedDays = formatStreakDays(days);
  const isMuted = days === 0 || !continuedToday;

  return (
    <div className="flex justify-end">
      <Link
        aria-label={`${strings.streak.openLabel}: ${formattedDays}`}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-transparent px-2 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        to={routePaths.streak}
      >
        <StreakIcon muted={isMuted} />
        <Typography as="span" tone="inherit" variant="h2">
          {days}
        </Typography>
      </Link>
    </div>
  );
}

export function StreakIcon({
  muted = false,
  size = "button",
}: StreakIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "hero" ? "size-16" : "size-7",
        muted ? "text-[var(--disabled-foreground)]" : "text-primary",
      )}
    >
      <Zap className="size-6" />
    </span>
  );
}

export function StreakCounter({ days }: { days: number }) {
  return (
    <Typography
      as="p"
      style={{ fontSize: "var(--component-streak-counter-size)" }}
      variant="h1"
    >
      {formatStreakDays(days)}
    </Typography>
  );
}

function formatStreakDays(days: number): string {
  const lastTwoDigits = days % 100;
  const lastDigit = days % 10;
  const dayForm =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? strings.dashboard.streakDaysMany
      : lastDigit === 1
        ? strings.dashboard.streakDay
        : lastDigit >= 2 && lastDigit <= 4
          ? strings.dashboard.streakDaysFew
          : strings.dashboard.streakDaysMany;

  return `${days} ${dayForm} ${strings.dashboard.streakConsecutive}`;
}
