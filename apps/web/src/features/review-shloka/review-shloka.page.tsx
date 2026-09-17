import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  SanskritTypography,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { segmentGraphemes } from "@/shared/lib/unicode";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader } from "@/shared/ui/card";

type ReviewStage = "hidden" | "hint-one" | "hint-two" | "full" | "result";
type FullTextOutcome = "self" | "hint" | "forgot";

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
        <ReviewStatus
          description={getApiErrorMessage(
            shlokaQuery.error ?? candidatesQuery.error,
            strings.reviewShloka.loadError,
          )}
          title={strings.common.error}
        />
      );
    }

    return <ReviewSkeleton />;
  }

  const currentFlow = flow;
  const currentShloka = currentFlow.items[currentFlow.currentIndex];
  if (!currentShloka) {
    return null;
  }

  const completeAndAdvance = (result: ApiTypes.ReviewResult): void => {
    completionMutation.mutate(
      { result, shlokaCode: currentShloka.code },
      { onSuccess: advance },
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

  if (stage === "result") {
    return (
      <ResultStep
        isPending={completionMutation.isPending}
        onComplete={completeAndAdvance}
        saveError={completionMutation.error}
      />
    );
  }

  const RecallTypography =
    stage === "hidden" ? Typography : SanskritTypography;

  return (
    <section className="flex h-dvh min-h-0 min-w-0 flex-none flex-col">
      <div className="min-h-0 min-w-0 flex-1 space-y-[18px] overflow-y-auto px-5 pt-5 pb-[18px]">
        <header className="space-y-2">
          <Typography variant="h1">
            {strings.reviewShloka.title}
          </Typography>
          <Typography tone="brand" variant="p2" weight="bold">
            {stageLabel(stage)}
          </Typography>
        </header>

        <article className="space-y-3.5 rounded-xl border border-border bg-card p-[18px] shadow-[var(--shadow-low)]">
          <SanskritTypography
            className="break-words [overflow-wrap:anywhere]"
            variant="h2"
          >
            {currentShloka.displayTitle}
          </SanskritTypography>
          <RecallTypography
            aria-label={recallBodyLabel(stage)}
            as="div"
            className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            variant="p4"
            weight="bold"
          >
            {recallBody(currentShloka.text, stage)}
          </RecallTypography>
        </article>

        <Typography tone="muted" variant="p2">
          {strings.reviewShloka.instruction}
        </Typography>

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
          <ReviewButton
            disabled={completionMutation.isPending}
            onClick={() => setStage("result")}
          >
            {strings.reviewShloka.evaluate}
          </ReviewButton>
        ) : null}
        {stage === "full" && fullTextOutcome === "hint" ? (
          <ReviewButton
            disabled={completionMutation.isPending}
            onClick={() => completeAndAdvance("remembered_with_hint")}
          >
            {completionMutation.isPending
              ? strings.reviewShloka.completing
              : strings.reviewShloka.completeHinted}
          </ReviewButton>
        ) : null}
        {stage === "full" && fullTextOutcome === "forgot" ? (
          <ReviewButton
            disabled={completionMutation.isPending}
            onClick={advance}
          >
            {strings.reviewShloka.next}
          </ReviewButton>
        ) : null}
      </div>
    </section>
  );
}

function ResultStep({
  isPending,
  onComplete,
  saveError,
}: {
  isPending: boolean;
  onComplete: (result: ApiTypes.ReviewResult) => void;
  saveError: Error | null;
}) {
  return (
    <section className="flex h-dvh min-h-0 min-w-0 flex-none flex-col">
      <div className="min-h-0 min-w-0 flex-1 space-y-[18px] overflow-y-auto px-5 pt-5 pb-[18px]">
        <Typography variant="h1">
          {strings.reviewShloka.resultTitle}
        </Typography>
        <Typography tone="muted" variant="p3">
          {strings.reviewShloka.resultDescription}
        </Typography>
        {saveError ? (
          <Typography role="alert" tone="danger" variant="p2">
            {getApiErrorMessage(saveError, strings.reviewShloka.saveError)}
          </Typography>
        ) : null}
        <Typography tone="muted" variant="p2">
          {strings.reviewShloka.finishHint}
        </Typography>
      </div>

      <div className="sticky bottom-0 mt-auto shrink-0 space-y-2.5 bg-card px-5 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom))] shadow-[var(--component-bottom-nav-shadow)]">
        <ReviewButton
          disabled={isPending}
          onClick={() => onComplete("remembered_without_error")}
        >
          {isPending
            ? strings.reviewShloka.completing
            : strings.reviewShloka.recallCorrect}
        </ReviewButton>
        <ReviewButton
          disabled={isPending}
          onClick={() => onComplete("remembered_with_error")}
          variant="outline"
        >
          {strings.reviewShloka.recallWithError}
        </ReviewButton>
      </div>
    </section>
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
      className="h-[52px] w-full text-[16px] font-bold"
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
  };
}

function recallBody(text: string, stage: ReviewStage): string {
  if (stage === "hidden") {
    return `${strings.reviewShloka.textHidden}\n\n${strings.reviewShloka.recallPrompt}`;
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
