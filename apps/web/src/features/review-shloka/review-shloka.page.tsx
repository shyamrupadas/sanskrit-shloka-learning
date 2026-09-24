import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  PageHeader,
  SanskritTypography,
  ShlokaTranslation,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { segmentGraphemes } from "@/shared/lib/unicode";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader } from "@/shared/ui/card";
import { Tooltip } from "@/shared/ui/tooltip";

type ReviewStage = "hidden" | "hint-one" | "hint-two" | "full" | "completed";
type FullTextOutcome = "self" | "hint" | "forgot";

const completedTitleTypography = {
  "--typography-h1-size":
    "var(--component-learning-attempt-state-title-size)",
  "--typography-heading-line-height":
    "var(--component-learning-attempt-title-line-height)",
} as CSSProperties;

interface ReviewFlow {
  currentIndex: number;
  items: ApiTypes.DashboardShlokaDto[];
}

export function ReviewShlokaPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeZone = getBrowserTimeZone();
  const [activeFlow, setActiveFlow] = useState<ReviewFlow>();
  const initialFlow = useRef<ReviewFlow | undefined>(undefined);
  const [stage, setStage] = useState<ReviewStage>("hidden");
  const [fullTextOutcome, setFullTextOutcome] =
    useState<FullTextOutcome>();
  const shlokaQuery = useQuery({
    enabled: !activeFlow,
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
  });
  const candidatesQuery = useQuery({
    enabled: !activeFlow,
    queryFn: () => auth.apiClient.getReviewShlokas(timeZone),
    queryKey: [
      "review-flow",
      "candidates",
      auth.account?.id,
      timeZone,
      shlokaCode,
    ],
  });
  const completionMutation = useMutation({
    mutationFn: ({
      result,
      shlokaCode: completedShlokaCode,
    }: {
      result: ApiTypes.ReviewResult;
      shlokaCode: string;
    }) =>
      auth.apiClient.completeReview(completedShlokaCode, {
        result,
        timeZone,
      }),
  });

  useUnauthorizedRedirect(
    shlokaQuery.error ?? candidatesQuery.error ?? completionMutation.error,
  );

  useEffect(() => {
    if (activeFlow || !shlokaQuery.data) {
      return;
    }
    if (shlokaQuery.data.personalStatus !== "reviewing") {
      void navigate({
        replace: true,
        search: {
          tab:
            shlokaQuery.data.personalStatus === "learning"
              ? "learning"
              : "all",
        },
        to: routePaths.library,
      });
    }
  }, [activeFlow, navigate, shlokaQuery.data]);

  const initialShloka = shlokaQuery.data;
  if (
    !initialFlow.current &&
    initialShloka?.personalStatus === "reviewing" &&
    candidatesQuery.data
  ) {
    initialFlow.current = {
      currentIndex: 0,
      items: [
        toDashboardShloka(initialShloka),
        ...candidatesQuery.data.items.filter(
          (candidate) => candidate.code !== initialShloka.code,
        ),
      ],
    };
  }

  const flow = activeFlow ?? initialFlow.current;

  if (!flow) {
    if (shlokaQuery.error || candidatesQuery.error) {
      return (
        <ReviewLayout>
          <ReviewStatus
            description={getApiErrorMessage(
              shlokaQuery.error ?? candidatesQuery.error,
              strings.reviewShloka.loadError,
            )}
            title={strings.common.error}
          />
        </ReviewLayout>
      );
    }

    return (
      <ReviewLayout>
        <ReviewSkeleton />
      </ReviewLayout>
    );
  }

  const currentFlow = flow;
  const currentShloka = currentFlow.items[currentFlow.currentIndex];
  if (!currentShloka) {
    return null;
  }

  const completeReview = (result: ApiTypes.ReviewResult): void => {
    completionMutation.mutate(
      { result, shlokaCode: currentShloka.code },
      {
        onSuccess: () => {
          markReviewQueriesStale();
          finishReview();
        },
      },
    );
  };
  const revealAfterFailure = (): void => {
    completionMutation.mutate(
      { result: "forgot", shlokaCode: currentShloka.code },
      {
        onSuccess: () => {
          markReviewQueriesStale();
          setFullTextOutcome("forgot");
          setStage("full");
        },
      },
    );
  };

  function markReviewQueriesStale(): void {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function finishReview(): void {
    if (currentFlow.currentIndex + 1 < currentFlow.items.length) {
      setStage("completed");
    } else {
      void navigate({ replace: true, to: routePaths.dashboard });
    }
  }

  function advance(): void {
    markReviewQueriesStale();
    const nextIndex = currentFlow.currentIndex + 1;
    const nextShloka = currentFlow.items[nextIndex];

    if (!nextShloka) {
      void navigate({ to: routePaths.dashboard });
      return;
    }

    completionMutation.reset();
    setActiveFlow({ ...currentFlow, currentIndex: nextIndex });
    setFullTextOutcome(undefined);
    setStage("hidden");
    void navigate({
      params: { shlokaCode: nextShloka.code },
      replace: true,
      to: routePaths.reviewShloka,
    });
  }

  if (stage === "completed") {
    return (
      <ReviewLayout>
        <CompletedReview
          displayTitle={currentShloka.displayTitle}
          onNext={advance}
        />
      </ReviewLayout>
    );
  }

  const RecallTypography =
    stage === "hidden" ? Typography : SanskritTypography;

  return (
    <ReviewLayout>
      <div className="min-h-0 min-w-0 flex-1 space-y-[18px] overflow-y-auto px-5 pt-5 pb-[18px]">
        {stage === "full" && fullTextOutcome === "self" ? (
          <ReviewAssessmentHelp />
        ) : (
          <Typography tone="brand" variant="p2" weight="bold">
            {stageLabel(stage)}
          </Typography>
        )}

        <article className="space-y-3.5 rounded-xl border border-border bg-card p-[18px] shadow-[var(--shadow-low)]">
          <SanskritTypography
            as="h2"
            className="break-words [overflow-wrap:anywhere]"
            variant="h1"
          >
            {currentShloka.displayTitle}
          </SanskritTypography>
          <RecallTypography
            aria-label={recallBodyLabel(stage)}
            as="div"
            className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            tone={stage === "hidden" ? "muted" : "default"}
            variant={stage === "hidden" ? "p2" : "p4"}
            weight={stage === "hidden" ? "normal" : "medium"}
          >
            {recallBody(currentShloka.text, stage)}
          </RecallTypography>
        </article>

        {stage === "full" ? (
          <ShlokaTranslation text={currentShloka.fullTranslation} />
        ) : null}

        {completionMutation.error ? (
          <Typography role="alert" tone="danger" variant="p2">
            {getApiErrorMessage(
              completionMutation.error,
              strings.reviewShloka.saveError,
            )}
          </Typography>
        ) : null}
      </div>

      <div className="sticky bottom-0 mt-auto shrink-0 space-y-2.5 bg-card px-5 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom))] shadow-[var(--component-bottom-nav-shadow)]">
        {stage === "hidden" ? (
          <>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={() => {
                setFullTextOutcome("self");
                setStage("full");
              }}
            >
              {strings.reviewShloka.recall}
            </ReviewButton>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={() => setStage("hint-one")}
              variant="outline"
            >
              {strings.reviewShloka.needHint}
            </ReviewButton>
          </>
        ) : null}
        {stage === "hint-one" || stage === "hint-two" ? (
          <>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={() => {
                setFullTextOutcome("hint");
                setStage("full");
              }}
            >
              {strings.reviewShloka.recall}
            </ReviewButton>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={
                stage === "hint-one"
                  ? () => setStage("hint-two")
                  : revealAfterFailure
              }
              variant="outline"
            >
              {completionMutation.isPending
                ? strings.reviewShloka.completing
                : stage === "hint-one"
                  ? strings.reviewShloka.nextHint
                  : strings.reviewShloka.forgot}
            </ReviewButton>
          </>
        ) : null}
        {stage === "full" && fullTextOutcome === "self" ? (
          <>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={() => completeReview("remembered_without_error")}
            >
              {completionMutation.isPending
                ? strings.reviewShloka.completing
                : strings.reviewShloka.recallCorrect}
            </ReviewButton>
            <ReviewButton
              disabled={completionMutation.isPending}
              onClick={() => completeReview("remembered_with_error")}
              variant="outline"
            >
              {strings.reviewShloka.recallWithError}
            </ReviewButton>
          </>
        ) : null}
        {stage === "full" && fullTextOutcome === "hint" ? (
          <ReviewButton
            disabled={completionMutation.isPending}
            onClick={() => completeReview("remembered_with_hint")}
          >
            {completionMutation.isPending
              ? strings.reviewShloka.completing
              : strings.reviewShloka.complete}
          </ReviewButton>
        ) : null}
        {stage === "full" && fullTextOutcome === "forgot" ? (
          <ReviewButton
            disabled={completionMutation.isPending}
            onClick={finishReview}
          >
            {strings.reviewShloka.complete}
          </ReviewButton>
        ) : null}
      </div>
    </ReviewLayout>
  );
}

function ReviewAssessmentHelp() {
  return (
    <div className="flex h-8 items-center gap-2">
      <Typography tone="brand" variant="p2" weight="bold">
        {strings.reviewShloka.resultTitle}
      </Typography>
      <Tooltip
        content={strings.reviewShloka.resultDescription}
        label={strings.reviewShloka.resultHelp}
      />
    </div>
  );
}

function ReviewLayout({ children }: { children: React.ReactNode }) {
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <section className="flex h-dvh min-h-0 min-w-0 flex-none flex-col">
      <div className="shrink-0 px-5 pt-5">
        <PageHeader
          backAction={{
            label: strings.common.back,
            onClick: () => {
              if (canGoBack) {
                router.history.back();
              } else {
                void navigate({ replace: true, to: routePaths.dashboard });
              }
            },
          }}
          title={strings.reviewShloka.title}
        />
      </div>
      {children}
    </section>
  );
}

function CompletedReview({
  displayTitle,
  onNext,
}: {
  displayTitle: string;
  onNext: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between overflow-y-auto px-5 pt-[34px] pb-5">
        <div className="min-w-0 space-y-6">
          <div className="flex size-[60px] items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check aria-hidden="true" className="size-7" />
          </div>

          <div className="space-y-2.5">
            <Typography
              as="p"
              className="tracking-[0.09em] uppercase"
              tone="brand"
              variant="p1"
              weight="bold"
            >
              {strings.reviewShloka.completedEyebrow}
            </Typography>
            <Typography
              as="h2"
              className="break-words [overflow-wrap:anywhere]"
              style={completedTitleTypography}
              variant="h1"
            >
              {strings.reviewShloka.completedTitle}
            </Typography>
            <Typography tone="muted" variant="p2">
              {strings.reviewShloka.completedDescription(displayTitle)}
            </Typography>
          </div>

          <div className="space-y-2.5 border-t border-border pt-[18px]">
            <Typography variant="p3" weight="bold">
              {strings.reviewShloka.continueTitle}
            </Typography>
            <Button
              className="h-[52px] w-full text-[15px] font-medium text-primary"
              onClick={onNext}
              type="button"
              variant="outline"
            >
              {strings.reviewShloka.reviewNext}
            </Button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto shrink-0 bg-card px-5 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom))] shadow-[var(--component-bottom-nav-shadow)]">
        <ReviewButton
          disabled={false}
          onClick={() => {
            void navigate({ replace: true, to: routePaths.dashboard });
          }}
        >
          {strings.reviewShloka.finish}
        </ReviewButton>
      </div>
    </div>
  );
}

function ReviewButton({
  children,
  disabled,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  variant?: "outline";
}) {
  return (
    <Button
      className={cn(
        "h-[52px] w-full text-[16px] font-bold",
        variant === "outline" && "bg-card text-primary",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant={variant}
    >
      {children}
    </Button>
  );
}

function ReviewSkeleton() {
  return (
    <section
      aria-label={strings.reviewShloka.loading}
      className="w-full animate-pulse space-y-4 p-5"
      role="status"
    >
      <Typography as="span" className="sr-only" variant="p2">
        {strings.reviewShloka.loading}
      </Typography>
      <div aria-hidden="true" className="h-8 w-1/2 rounded bg-muted" />
      <div aria-hidden="true" className="h-4 w-1/3 rounded bg-muted" />
      <div aria-hidden="true" className="h-40 rounded-xl bg-muted" />
    </section>
  );
}

function ReviewStatus({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="p-5">
      <Card className="w-full rounded-lg">
        <CardHeader>
          <Typography as="div" variant="h3">
            {title}
          </Typography>
          {description ? (
            <Typography tone="muted" variant="p2">
              {description}
            </Typography>
          ) : null}
        </CardHeader>
      </Card>
    </div>
  );
}

function toDashboardShloka(
  shloka: ApiTypes.LibraryShlokaDto,
): ApiTypes.DashboardShlokaDto {
  return {
    code: shloka.code,
    displayTitle: shloka.displayTitle,
    text: shloka.text,
    ...(shloka.fullTranslation ? { fullTranslation: shloka.fullTranslation } : {}),
  };
}

function recallBody(text: string, stage: ReviewStage): string {
  if (stage === "hidden") {
    return strings.reviewShloka.textHidden;
  }

  const firstLine = firstTextLine(text);
  if (stage === "hint-one") {
    const graphemes = segmentGraphemes(firstLine);
    return `${graphemes.slice(0, Math.ceil(graphemes.length / 2)).join("").trimEnd()}...`;
  }
  if (stage === "hint-two") {
    return `${firstLine}\n...`;
  }

  return text;
}

function recallBodyLabel(stage: ReviewStage): string {
  return stage === "hidden"
    ? strings.reviewShloka.textHidden
    : strings.shloka.canonicalText;
}

function firstTextLine(text: string): string {
  return text
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim() ?? "";
}

function stageLabel(stage: ReviewStage): string {
  if (stage === "hint-one") {
    return strings.reviewShloka.hintOne;
  }
  if (stage === "hint-two") {
    return strings.reviewShloka.hintTwo;
  }
  if (stage === "full") {
    return strings.reviewShloka.fullText;
  }

  return strings.reviewShloka.selfRecall;
}
