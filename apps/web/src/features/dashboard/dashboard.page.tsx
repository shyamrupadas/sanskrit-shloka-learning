import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  EmptyState,
  ShlokaCard,
  StatusCard,
  StreakIndicator,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

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
      <StreakIndicator
        continuedToday={streakQuery.data.continuedToday}
        days={streakQuery.data.days}
      />
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
      <Typography variant="h1">
        {strings.dashboard.reviewTitle}
      </Typography>
      {list.state === "completed" ? (
        <div className="space-y-2.5 rounded-xl bg-green-100 p-4">
          <Typography tone="success" variant="h2">
            {strings.dashboard.reviewCompletedTitle}
          </Typography>
          <Typography variant="p2">
            {strings.dashboard.reviewCompletedDescription}
          </Typography>
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
      <Typography variant="h1">
        {strings.dashboard.wantToLearnTitle}
      </Typography>
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
        <Typography variant="h1">
          {strings.dashboard.wantToLearnTitle}
        </Typography>
      ) : null}
      <EmptyState
        action={<Link to={routePaths.library}>{strings.dashboard.add}</Link>}
        description={strings.dashboard.emptyDescription}
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
      <Typography variant="h1">
        {strings.dashboard.title}
      </Typography>
      <StatusCard description={description} title={title} />
    </section>
  );
}
