import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { segmentGraphemes } from "@/shared/lib/unicode";
import { cn } from "@/shared/lib/utils";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

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

  return (
    <section className="mx-auto w-full max-w-[390px] space-y-[18px]">
      <header className="space-y-2">
        <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
          {strings.reviewShloka.title}
        </h1>
        <p className="text-sm font-bold text-primary">
          {currentFlow.currentIndex + 1} из {currentFlow.items.length} · {stageLabel(stage)}
        </p>
      </header>

      <article className="space-y-3.5 rounded-xl border border-border bg-card p-[18px] shadow-[var(--shadow-low)]">
        <h2 className="font-sanskrit-title break-words text-lg leading-[var(--line-height-title)] font-extrabold [overflow-wrap:anywhere]">
          {currentShloka.displayTitle}
        </h2>
        <div
          aria-label={recallBodyLabel(stage)}
          className={cn(
            "break-words whitespace-pre-wrap text-[21px] leading-[1.35] font-bold [overflow-wrap:anywhere]",
            stage !== "hidden" && "font-sanskrit-text",
          )}
        >
          {recallBody(currentShloka.text, stage)}
        </div>
      </article>

      <p className="text-sm leading-[1.35] text-muted-foreground">
        {strings.reviewShloka.instruction}
      </p>

      {completionMutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(
            completionMutation.error,
            strings.reviewShloka.saveError,
          )}
        </p>
      ) : null}

      <div className="space-y-2.5">
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
    <section className="mx-auto w-full max-w-[390px] space-y-[18px]">
      <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.reviewShloka.resultTitle}
      </h1>
      <p className="text-[15px] leading-[1.35] text-muted-foreground">
        {strings.reviewShloka.resultDescription}
      </p>
      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(saveError, strings.reviewShloka.saveError)}
        </p>
      ) : null}
      <div className="space-y-2.5">
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
      <p className="text-sm leading-[1.35] text-muted-foreground">
        {strings.reviewShloka.finishHint}
      </p>
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
      className="h-11 w-full text-[15px] font-semibold"
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
      className="mx-auto w-full max-w-[390px] animate-pulse space-y-4"
      role="status"
    >
      <span className="sr-only">{strings.reviewShloka.loading}</span>
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
    <Card className="mx-auto w-full max-w-[390px] rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
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
