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
  const reviewExpansion = useMutation({
    mutationFn: () => auth.apiClient.getReviewShlokas(timeZone),
  });
  const learningExpansion = useMutation({
    mutationFn: () => auth.apiClient.getLearningShlokas(),
  });
  const authorizationError =
    reviewQuery.error ??
    learningQuery.error ??
    reviewExpansion.error ??
    learningExpansion.error;

  useUnauthorizedRedirect(authorizationError);

  if (reviewQuery.isPending || learningQuery.isPending) {
    return <DashboardStatus title={strings.common.loading} />;
  }
  if (reviewQuery.error || learningQuery.error) {
    return (
      <DashboardStatus
        description={getApiErrorMessage(
          reviewQuery.error ?? learningQuery.error,
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

  if (!hasPersonalShlokas) {
    return <LearningEmptyState />;
  }

  return (
    <section className="space-y-6">
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
