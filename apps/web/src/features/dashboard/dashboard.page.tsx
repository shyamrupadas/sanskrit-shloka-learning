import { useId } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  EmptyState,
  ShlokaCard,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

const initialReviewLimit = 5;
const initialLearningLimit = 3;

export function DashboardPage() {
  const auth = useSession();
  const timeZone = getBrowserTimeZone();
  const reviewQuery = useQuery({
    queryFn: () =>
      auth.apiClient.getReviewShlokas(timeZone, initialReviewLimit),
    queryKey: [
      "dashboard",
      "review-shlokas",
      auth.account?.id,
      timeZone,
      initialReviewLimit,
    ],
  });
  const learningQuery = useQuery({
    queryFn: () => auth.apiClient.getLearningShlokas(initialLearningLimit),
    queryKey: [
      "dashboard",
      "learning-shlokas",
      auth.account?.id,
      initialLearningLimit,
    ],
  });
  const streakQuery = useQuery({
    queryFn: () => auth.apiClient.getStreak(timeZone),
    queryKey: ["dashboard", "streak", auth.account?.id, timeZone],
  });
  const reviewExpansion = useMutation({
    mutationFn: () => auth.apiClient.getReviewShlokas(timeZone),
  });
  const learningExpansion = useMutation({
    mutationFn: () => auth.apiClient.getLearningShlokas(),
  });
  const authorizationError =
    reviewQuery.error ??
    learningQuery.error ??
    streakQuery.error ??
    reviewExpansion.error ??
    learningExpansion.error;

  useUnauthorizedRedirect(authorizationError);

  if (
    reviewQuery.isPending ||
    learningQuery.isPending ||
    streakQuery.isPending
  ) {
    return <DashboardStatus title={strings.common.loading} />;
  }
  if (reviewQuery.error || learningQuery.error || streakQuery.error) {
    return (
      <DashboardStatus
        description={getApiErrorMessage(
          reviewQuery.error ?? learningQuery.error ?? streakQuery.error,
          strings.dashboard.loadError,
        )}
        title={strings.common.error}
      />
    );
  }

  const reviewList = reviewExpansion.data ?? reviewQuery.data;
  const learningList = learningExpansion.data ?? learningQuery.data;
  const hasPersonalShlokas =
    reviewList.hasReviewingShlokas || learningList.hasLearningShlokas;

  return (
    <section className="space-y-6">
      {streakQuery.data.days > 0 ? (
        <StreakIndicator streak={streakQuery.data} />
      ) : null}
      {hasPersonalShlokas ? (
        <>
          <ReviewBlock
            isExpanded={Boolean(reviewExpansion.data)}
            isExpanding={reviewExpansion.isPending}
            list={reviewList}
            onExpand={() => reviewExpansion.mutate()}
          />
          <LearningBlock
            isExpanded={Boolean(learningExpansion.data)}
            isExpanding={learningExpansion.isPending}
            list={learningList}
            onExpand={() => learningExpansion.mutate()}
          />
        </>
      ) : (
        <LearningEmptyState />
      )}
    </section>
  );
}

function StreakIndicator({
  streak,
}: {
  streak: ApiTypes.DashboardStreakDto;
}) {
  const gradientId = useId();
  const stateLabel = streak.continuedToday
    ? strings.dashboard.streakActive
    : strings.dashboard.streakPending;
  const gradientStart = streak.continuedToday
    ? "var(--streak-flame-start)"
    : "var(--disabled-foreground)";
  const gradientEnd = streak.continuedToday
    ? "var(--streak-flame-end)"
    : "var(--border-strong)";

  return (
    <div className="flex justify-end">
      <div
        aria-label={`${formatStreakDays(streak.days)}. ${stateLabel}`}
        className="flex items-center gap-1.5"
        role="status"
      >
        <svg
          aria-hidden="true"
          className="size-[25px]"
          style={
            streak.continuedToday
              ? {
                  filter:
                    "drop-shadow(0 2px 4px var(--shadow-streak-color))",
                }
              : undefined
          }
          viewBox="0 0 48 48"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="1" y2="0">
              <stop offset="0" stopColor={gradientStart} />
              <stop offset="1" stopColor={gradientEnd} />
            </linearGradient>
          </defs>
          <path
            d="M24 2c-3 7-8 11-9 19-1 10 5 18 11 18 7 0 12-6 11-15-1-6-5-10-8-14-1 5-4 7-7 10 0-6 2-18 2-18z"
            fill={`url(#${gradientId})`}
          />
          <path
            d="M25 18c-3 6-4 9-4 14 0 4 3 8 6 8 4 0 7-4 6-9-1-4-4-7-5-12-1 4-3 7-4 9-1-4 1-10 1-10z"
            fill={
              streak.continuedToday
                ? "var(--streak-flame-inner)"
                : "var(--disabled-background)"
            }
          />
        </svg>
        <span className="font-heading text-[length:var(--font-size-card-title)] leading-[var(--line-height-title)] font-extrabold">
          {streak.days}
        </span>
      </div>
    </div>
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

function ReviewBlock({
  isExpanded,
  isExpanding,
  list,
  onExpand,
}: {
  isExpanded: boolean;
  isExpanding: boolean;
  list: ApiTypes.DashboardReviewShlokaListDto;
  onExpand: () => void;
}) {
  return (
    <section className="space-y-2.5">
      <h1 className="font-heading text-[length:var(--font-size-section-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.dashboard.reviewTitle}
      </h1>
      {list.state === "completed" ? (
        <div className="space-y-2.5 rounded-xl bg-green-100 p-4">
          <h2 className="font-heading text-[length:var(--font-size-card-title)] leading-[var(--line-height-title)] font-extrabold text-green-700">
            {strings.dashboard.reviewCompletedTitle}
          </h2>
          <p className="text-[length:var(--font-size-body-sm)] leading-[var(--line-height-body)]">
            {strings.dashboard.reviewCompletedDescription}
          </p>
        </div>
      ) : list.items.length === 0 ? (
        <EmptyState
          description={strings.dashboard.reviewEmptyDescription}
          title={strings.dashboard.reviewEmptyTitle}
        />
      ) : (
        <DashboardShlokaList
          items={list.items}
          openLabel={strings.library.startReview}
          openTo={routePaths.reviewShloka}
        />
      )}
      <ExpansionActionSlot
        isExpanded={isExpanded}
        isExpanding={isExpanding}
        label={`${strings.dashboard.showMore} ${list.remainingCount}`}
        onExpand={onExpand}
        showAction={list.remainingCount > 0}
      />
    </section>
  );
}

function LearningBlock({
  isExpanded,
  isExpanding,
  list,
  onExpand,
}: {
  isExpanded: boolean;
  isExpanding: boolean;
  list: ApiTypes.DashboardLearningShlokaListDto;
  onExpand: () => void;
}) {
  return (
    <section className="space-y-2.5">
      <h1 className="font-heading text-[length:var(--font-size-section-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.dashboard.wantToLearnTitle}
      </h1>
      {list.items.length > 0 ? (
        <DashboardShlokaList
          items={list.items}
          openLabel={strings.library.startLearning}
          openTo={routePaths.learnShloka}
        />
      ) : (
        <LearningEmptyState showSectionTitle={false} />
      )}
      <ExpansionActionSlot
        isExpanded={isExpanded}
        isExpanding={isExpanding}
        label={strings.dashboard.showAll}
        onExpand={onExpand}
        showAction={list.remainingCount > 0}
      />
    </section>
  );
}

function DashboardShlokaList({
  items,
  openLabel = strings.library.openShloka,
  openTo = routePaths.libraryShloka,
}: {
  items: ApiTypes.DashboardShlokaDto[];
  openLabel?: string;
  openTo?:
    | typeof routePaths.libraryShloka
    | typeof routePaths.learnShloka
    | typeof routePaths.reviewShloka;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((shloka) => (
        <ShlokaCard
          key={shloka.code}
          openLabel={`${openLabel} ${shloka.displayTitle}`}
          openTo={openTo}
          shlokaCode={shloka.code}
          title={shloka.displayTitle}
        />
      ))}
    </div>
  );
}

function ExpansionActionSlot({
  isExpanded,
  isExpanding,
  label,
  onExpand,
  showAction,
}: {
  isExpanded: boolean;
  isExpanding: boolean;
  label: string;
  onExpand: () => void;
  showAction: boolean;
}) {
  if (!showAction && !isExpanded) {
    return null;
  }

  return (
    <div className="min-h-5">
      {showAction && !isExpanded ? (
        <button
          className="rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
          disabled={isExpanding}
          onClick={onExpand}
          type="button"
        >
          {label}
        </button>
      ) : null}
    </div>
  );
}

function LearningEmptyState({
  showSectionTitle = true,
}: {
  showSectionTitle?: boolean;
}) {
  return (
    <section className="space-y-2.5">
      {showSectionTitle ? (
        <h1 className="font-heading text-[length:var(--font-size-section-title)] leading-[var(--line-height-title)] font-extrabold">
          {strings.dashboard.wantToLearnTitle}
        </h1>
      ) : null}
      <EmptyState
        action={<Link to={routePaths.library}>{strings.dashboard.add}</Link>}
        description={strings.dashboard.emptyDescription}
        headingLevel={2}
        title={strings.dashboard.emptyTitle}
      />
    </section>
  );
}

function DashboardStatus({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <section className="space-y-5">
      <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.dashboard.title}
      </h1>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      </Card>
    </section>
  );
}
