import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  ApiClientError,
  type ApiTypes,
} from "@sanskrit-shloka-learning/api-contract";

import {
  SanskritTypography,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import {
  routePaths,
  type LearnShlokaReturnTo,
  type LibraryTabRoute,
} from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import {
  LearnShlokaAdviceDialog,
} from "./learn-shloka-advice";
import { clearLearnShlokaAdviceAttempt } from "./learn-shloka-advice-history";

type CompletionRecovery = "idle" | "checking" | "retry" | "unknown";
type HelperPhase = "check" | "read" | "recall";

type HelperState = {
  fragmentIndex: number;
  phase: HelperPhase;
  shlokaCode: string;
};

const attemptTitleTypography = {
  "--typography-h1-size": "var(--component-learning-attempt-title-size)",
  "--typography-heading-line-height":
    "var(--component-learning-attempt-title-line-height)",
} as CSSProperties;

const attemptCanonicalTextTypography = {
  "--typography-body-line-height":
    "var(--component-learning-attempt-canonical-text-line-height)",
  "--typography-p4-size":
    "var(--component-learning-attempt-canonical-text-size)",
} as CSSProperties;

const attemptStateTitleTypography = {
  "--typography-h1-size":
    "var(--component-learning-attempt-state-title-size)",
  "--typography-heading-line-height":
    "var(--component-learning-attempt-title-line-height)",
} as CSSProperties;

const attemptRecoveryBannerTypography = {
  "--typography-p2-size":
    "var(--component-learning-attempt-recovery-banner-text-size)",
} as CSSProperties;

const helperMemoryPromptTypography = {
  "--typography-h1-size":
    "var(--component-learning-helper-memory-prompt-size)",
  "--typography-heading-line-height":
    "var(--component-learning-helper-memory-prompt-line-height)",
} as CSSProperties;

const disabledCompletionAction = {
  backgroundColor: "var(--disabled-background)",
  color: "var(--disabled-foreground)",
  opacity: 0.8,
} as CSSProperties;

export function LearnShlokaPage({
  returnTo,
  shlokaCode,
}: {
  returnTo: LearnShlokaReturnTo;
  shlokaCode: string;
}) {
  const auth = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeZone = getBrowserTimeZone();
  const [completionRecovery, setCompletionRecovery] =
    useState<CompletionRecovery>("idle");
  const [completionResult, setCompletionResult] =
    useState<ApiTypes.CompleteLearningDto>();
  const [verificationError, setVerificationError] = useState<unknown>();
  const [helperState, setHelperState] = useState<HelperState>();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
    refetchOnMount: "always",
  });
  const completeMutation = useMutation({
    mutationFn: () =>
      auth.apiClient.completeLearning(shlokaCode, { timeZone }),
    onError: (error) => {
      if (isConfirmedCompletionError(error)) {
        if (isMounted.current) {
          setCompletionRecovery("retry");
        }
        return;
      }

      void checkCompletionStatus();
    },
    onSuccess: acceptCompletion,
  });

  useUnauthorizedRedirect(
    shlokaQuery.error ?? completeMutation.error ?? verificationError,
  );

  function acceptCompletion(result: ApiTypes.CompleteLearningDto): void {
    void queryClient.invalidateQueries({
      exact: true,
      queryKey: ["library"],
    });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (!isMounted.current) {
      return;
    }

    setCompletionResult(result);
    clearLearnShlokaAdviceAttempt();
  }

  async function checkCompletionStatus(): Promise<void> {
    if (isMounted.current) {
      setCompletionRecovery("checking");
      setVerificationError(undefined);
    }

    try {
      const currentShloka = await auth.apiClient.getItem(shlokaCode);

      if (currentShloka.personalStatus === "reviewing") {
        const library = await auth.apiClient.getLibrary();
        queryClient.setQueryData(["library"], library);
        acceptCompletion({
          remainingLearningShlokas: library.allShlokas.filter(
            (candidate) => candidate.personalStatus === "learning",
          ),
          shloka: currentShloka,
        });
        queryClient.setQueryData(
          ["library", "shloka", shlokaCode],
          currentShloka,
        );
        return;
      }

      queryClient.setQueryData(
        ["library", "shloka", shlokaCode],
        currentShloka,
      );
      if (currentShloka.personalStatus === "learning") {
        if (isMounted.current) {
          setCompletionRecovery("retry");
        }
        return;
      }

      if (isMounted.current) {
        setCompletionRecovery("idle");
      }
    } catch (error) {
      if (isMounted.current) {
        setVerificationError(error);
        setCompletionRecovery("unknown");
      }
    }
  }

  const completeLearning = (): void => {
    setCompletionRecovery("idle");
    setVerificationError(undefined);
    completeMutation.reset();
    completeMutation.mutate();
  };

  useEffect(() => {
    if (completionResult) {
      return;
    }

    if (!shlokaQuery.isFetchedAfterMount) {
      return;
    }

    const status = shlokaQuery.data?.personalStatus;
    if (!status || status === "learning" || status === "reviewing") {
      return;
    }

    clearLearnShlokaAdviceAttempt();
    void navigateToReturnTo(navigate, returnTo);
  }, [
    completionResult,
    navigate,
    returnTo,
    shlokaQuery.data?.personalStatus,
    shlokaQuery.isFetchedAfterMount,
  ]);

  const cancel = () => {
    clearLearnShlokaAdviceAttempt();
    void navigateToReturnTo(navigate, returnTo);
  };

  if (
    shlokaQuery.isPending ||
    shlokaQuery.isFetching ||
    !shlokaQuery.isFetchedAfterMount
  ) {
    return <LearnShlokaSkeleton onCancel={cancel} />;
  }
  if (completionResult) {
    return (
      <CompletedLearning
        completedShloka={completionResult.shloka}
        remainingLearningShlokas={completionResult.remainingLearningShlokas}
        returnTo={returnTo}
      />
    );
  }
  if (shlokaQuery.error) {
    return (
      <LearnShlokaLoadError
        onCancel={cancel}
        onRetry={() => {
          void shlokaQuery.refetch();
        }}
      />
    );
  }
  if (shlokaQuery.data.personalStatus === "reviewing") {
    return <LearnShlokaStatusGuard onReturn={cancel} />;
  }
  if (shlokaQuery.data.personalStatus !== "learning") {
    return null;
  }

  const activeHelperState =
    helperState?.shlokaCode === shlokaCode ? helperState : undefined;

  if (activeHelperState) {
    return (
      <LearnShlokaHelper
        onChange={(nextState) => {
          setHelperState({ ...nextState, shlokaCode });
        }}
        onReturn={() => {
          setHelperState(undefined);
        }}
        padas={shlokaQuery.data.padas}
        state={activeHelperState}
      />
    );
  }

  const actionsDisabled =
    completeMutation.isPending || completionRecovery === "checking";
  const completionAction = getCompletionAction(
    completeMutation.isPending,
    completionRecovery,
  );

  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <LearnShlokaHeader
        adviceShlokaCode={shlokaCode}
        actionsDisabled={actionsDisabled}
        onCancel={cancel}
      />

      <div className="flex min-w-0 flex-1 flex-col px-5 pt-6 pb-4">
        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <Typography
              as="p"
              className="tracking-[0.09em] uppercase"
              tone="brand"
              variant="p1"
              weight="bold"
            >
              {strings.learnShloka.eyebrow}
            </Typography>
            <SanskritTypography
              className="break-words [overflow-wrap:anywhere]"
              style={attemptTitleTypography}
              variant="h1"
            >
              {shlokaQuery.data.displayTitle}
            </SanskritTypography>
          </div>

          <SanskritTypography
            aria-label={strings.shloka.canonicalText}
            as="div"
            className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            style={attemptCanonicalTextTypography}
            variant="p4"
            weight="bold"
          >
            {shlokaQuery.data.text}
          </SanskritTypography>

          {completionRecovery === "retry" ? (
            <Typography
              className="rounded-xl border px-3 py-[var(--component-learning-attempt-recovery-banner-padding-y)] [border-color:var(--danger-border)] bg-[var(--danger-background)]"
              role="alert"
              style={attemptRecoveryBannerTypography}
              tone="danger"
              variant="p2"
            >
              {strings.learnShloka.completionConfirmedError}
            </Typography>
          ) : null}
          {completionRecovery === "unknown" ? (
            <Typography
              className="rounded-xl border px-3 py-[var(--component-learning-attempt-recovery-banner-padding-y)] [border-color:var(--warning-border)] bg-[var(--warning-background)]"
              role="alert"
              style={attemptRecoveryBannerTypography}
              tone="warning"
              variant="p2"
            >
              {strings.learnShloka.completionUnknown}
            </Typography>
          ) : null}

          <Button
            className="h-[52px] w-full text-[15px] text-primary"
            disabled={actionsDisabled}
            onClick={() => {
              setHelperState({
                fragmentIndex: 0,
                phase: "read",
                shlokaCode,
              });
            }}
            type="button"
            variant="outline"
          >
            {strings.learnShloka.helper}
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]">
        <Button
          className="h-[52px] w-full text-[16px] font-bold"
          disabled={actionsDisabled}
          onClick={
            completionRecovery === "unknown"
              ? () => {
                  void checkCompletionStatus();
                }
              : completeLearning
          }
          style={actionsDisabled ? disabledCompletionAction : undefined}
          type="button"
        >
          {completionAction}
        </Button>
      </div>
    </section>
  );
}

function LearnShlokaHelper({
  onChange,
  onReturn,
  padas,
  state,
}: {
  onChange: (state: Pick<HelperState, "fragmentIndex" | "phase">) => void;
  onReturn: () => void;
  padas: string[];
  state: HelperState;
}) {
  const fragments = [
    {
      label: strings.learnShloka.helperPada(1),
      text: padas.slice(0, 1).join("\n"),
    },
    {
      label: strings.learnShloka.helperPada(2),
      text: padas.slice(1, 2).join("\n"),
    },
    {
      label: strings.learnShloka.helperPadas(1, 2),
      text: padas.slice(0, 2).join("\n"),
    },
    {
      label: strings.learnShloka.helperPada(3),
      text: padas.slice(2, 3).join("\n"),
    },
    {
      label: strings.learnShloka.helperPada(4),
      text: padas.slice(3, 4).join("\n"),
    },
    {
      label: strings.learnShloka.helperPadas(3, 4),
      text: padas.slice(2, 4).join("\n"),
    },
    { label: strings.learnShloka.helperWholeShloka, text: padas.join("\n") },
  ] as const;
  const fragment = fragments[state.fragmentIndex] ?? fragments[0];
  const position = state.fragmentIndex + 1;
  const isLastFragment = position === fragments.length;
  const phaseLabel = {
    check: strings.learnShloka.helperPhaseCheck,
    read: strings.learnShloka.helperPhaseRead,
    recall: strings.learnShloka.helperPhaseRecall,
  }[state.phase];
  const actionLabel =
    state.phase === "read"
      ? strings.learnShloka.helperHide
      : state.phase === "recall"
        ? strings.learnShloka.helperShow
        : isLastFragment
          ? strings.learnShloka.helperReturn
          : strings.learnShloka.helperNext;

  const advance = (): void => {
    if (state.phase === "read") {
      onChange({ fragmentIndex: state.fragmentIndex, phase: "recall" });
      return;
    }
    if (state.phase === "recall") {
      onChange({ fragmentIndex: state.fragmentIndex, phase: "check" });
      return;
    }
    if (isLastFragment) {
      onReturn();
      return;
    }

    onChange({ fragmentIndex: state.fragmentIndex + 1, phase: "read" });
  };

  return (
    <section
      aria-labelledby="learn-shloka-helper-title"
      className="flex h-dvh min-h-0 min-w-0 flex-none flex-col"
    >
      <header className="grid h-[52px] shrink-0 grid-cols-[100px_1fr_100px] items-center px-5">
        <button
          className="w-fit rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={onReturn}
          type="button"
        >
          {strings.learnShloka.helperBack}
        </button>
        <Typography
          as="h1"
          className="text-center"
          id="learn-shloka-helper-title"
          variant="p2"
          weight="bold"
        >
          {strings.learnShloka.helper}
        </Typography>
        <span aria-hidden="true" />
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-5 pb-[18px]">
        <div className="flex h-[22px] shrink-0 items-center justify-between">
          <Typography tone="muted" variant="p1" weight="bold">
            {fragment.label}
          </Typography>
          <Typography tone="muted" variant="p1" weight="bold">
            {position} / {fragments.length}
          </Typography>
        </div>

        <div
          aria-label={strings.learnShloka.helperProgress}
          aria-valuemax={fragments.length}
          aria-valuemin={1}
          aria-valuenow={position}
          aria-valuetext={`${fragment.label}, ${position} / ${fragments.length}`}
          className="flex h-[5px] shrink-0 gap-[5px]"
          role="progressbar"
        >
          {fragments.map((candidate, index) => (
            <span
              aria-hidden="true"
              className={`h-[5px] min-w-0 flex-1 rounded-full ${
                index < state.fragmentIndex
                  ? "bg-primary"
                  : index === state.fragmentIndex
                    ? "bg-[var(--info-border)]"
                    : "bg-border"
              }`}
              key={candidate.label}
            />
          ))}
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full min-w-0 flex-col items-center justify-center gap-4 py-4 text-center">
            <Typography
              aria-live="polite"
              className="tracking-[0.09em] uppercase"
              role="status"
              tone="brand"
              variant="p1"
              weight="bold"
            >
              {phaseLabel}
            </Typography>
            {state.phase === "recall" ? (
              <SanskritTypography
                as="p"
                className="w-full"
                style={helperMemoryPromptTypography}
                variant="h1"
              >
                {strings.learnShloka.helperMemoryPrompt}
              </SanskritTypography>
            ) : (
              <SanskritTypography
                aria-label={strings.learnShloka.helperCurrentFragment}
                as="div"
                className="w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
                style={attemptCanonicalTextTypography}
                variant="p4"
                weight="bold"
              >
                {fragment.text}
              </SanskritTypography>
            )}
          </div>
        </div>
      </div>

      <div
        aria-label={strings.learnShloka.helperAction}
        className="sticky bottom-0 mt-auto bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]"
        role="group"
      >
        <Button
          className="h-[52px] w-full text-[16px] font-bold"
          onClick={advance}
          type="button"
        >
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}

function LearnShlokaHeader({
  actionsDisabled = false,
  adviceShlokaCode,
  onCancel,
}: {
  actionsDisabled?: boolean;
  adviceShlokaCode?: string;
  onCancel: () => void;
}) {
  return (
    <header className="grid h-[52px] shrink-0 grid-cols-[100px_1fr_100px] items-center border-b border-border px-5">
      <button
        className="w-fit rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-[var(--disabled-foreground)]"
        disabled={actionsDisabled}
        onClick={onCancel}
        type="button"
      >
        {strings.learnShloka.cancel}
      </button>
      <Typography as="span" className="text-center" variant="p2" weight="bold">
        {strings.learnShloka.title}
      </Typography>
      {adviceShlokaCode ? (
        <LearnShlokaAdviceDialog
          disabled={actionsDisabled}
          shlokaCode={adviceShlokaCode}
        />
      ) : null}
    </header>
  );
}

function getCompletionAction(
  isPending: boolean,
  recovery: CompletionRecovery,
): string {
  if (isPending) {
    return strings.learnShloka.completing;
  }
  if (recovery === "checking") {
    return strings.learnShloka.checkingStatus;
  }
  if (recovery === "retry") {
    return strings.learnShloka.retryCompletion;
  }
  if (recovery === "unknown") {
    return strings.learnShloka.checkStatus;
  }

  return strings.learnShloka.complete;
}

function isConfirmedCompletionError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 400 || error.status === 401 || error.status === 404)
  );
}

function LearnShlokaLoadError({
  onCancel,
  onRetry,
}: {
  onCancel: () => void;
  onRetry: () => void;
}) {
  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col" role="alert">
      <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-6">
        <div className="flex size-[58px] items-center justify-center rounded-2xl bg-red-100">
          <Typography
            as="span"
            style={attemptStateTitleTypography}
            tone="danger"
            variant="h1"
          >
            !
          </Typography>
        </div>
        <Typography style={attemptStateTitleTypography} variant="h1">
          {strings.learnShloka.loadErrorTitle}
        </Typography>
        <Typography tone="muted" variant="p2">
          {strings.learnShloka.loadErrorDescription}
        </Typography>
      </div>
      <div className="space-y-2.5 bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]">
        <Button className="h-[52px] w-full" onClick={onRetry} type="button">
          {strings.learnShloka.retryLoad}
        </Button>
        <Button
          className="h-[52px] w-full text-primary"
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          {strings.learnShloka.cancelAndReturn}
        </Button>
      </div>
    </section>
  );
}

function LearnShlokaStatusGuard({ onReturn }: { onReturn: () => void }) {
  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col" role="status">
      <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-6">
        <div className="flex size-[58px] items-center justify-center rounded-2xl bg-green-100">
          <Typography
            as="span"
            style={attemptStateTitleTypography}
            tone="success"
            variant="h1"
          >
            ✓
          </Typography>
        </div>
        <Typography style={attemptStateTitleTypography} variant="h1">
          {strings.learnShloka.alreadyReviewing}
        </Typography>
      </div>
      <div className="bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]">
        <Button className="h-[52px] w-full" onClick={onReturn} type="button">
          {strings.learnShloka.returnAction}
        </Button>
      </div>
    </section>
  );
}

function CompletedLearning({
  completedShloka,
  remainingLearningShlokas,
  returnTo,
}: {
  completedShloka: ApiTypes.LibraryShlokaDto;
  remainingLearningShlokas: ApiTypes.LibraryShlokaDto[];
  returnTo: LearnShlokaReturnTo;
}) {
  const navigate = useNavigate();
  const nextShloka = remainingLearningShlokas[0];

  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 flex-1 flex-col justify-between px-5 pt-[34px] pb-5">
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
              {strings.learnShloka.completedEyebrow}
            </Typography>
            <Typography
              className="break-words [overflow-wrap:anywhere]"
              style={attemptStateTitleTypography}
              variant="h1"
            >
              {strings.learnShloka.completedTitle}
            </Typography>
            <Typography tone="muted" variant="p2">
              {strings.learnShloka.completedDescription(
                completedShloka.displayTitle,
              )}
            </Typography>
          </div>

          <div className="space-y-2.5 border-t border-border pt-[18px]">
            <Typography variant="p3" weight="bold">
              {strings.learnShloka.continueTitle}
            </Typography>
            {nextShloka ? (
              <Button
                className="h-[52px] w-full text-[15px] font-medium text-primary"
                onClick={() => {
                  void navigate({
                    params: { shlokaCode: nextShloka.code },
                    replace: true,
                    search: { returnTo },
                    to: routePaths.learnShloka,
                  });
                }}
                type="button"
                variant="outline"
              >
                {strings.learnShloka.learnNext}
              </Button>
            ) : (
              <Typography tone="muted" variant="p2">
                {strings.learnShloka.noNextShloka}
              </Typography>
            )}
            <Button
              className={
                nextShloka
                  ? "h-10 w-full text-[14px] font-bold text-primary"
                  : "h-[52px] w-full text-[15px] font-medium text-primary"
              }
              onClick={() => {
                void navigate({
                  replace: true,
                  search: { tab: "all" },
                  to: routePaths.library,
                });
              }}
              type="button"
              variant={nextShloka ? "ghost" : "outline"}
            >
              {strings.learnShloka.chooseAnother}
            </Button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]">
        <Button
          className="h-[52px] w-full text-[16px] font-bold"
          onClick={() => {
            void navigateToReturnTo(navigate, returnTo);
          }}
          type="button"
        >
          {strings.learnShloka.finish}
        </Button>
      </div>
    </section>
  );
}

async function navigateToReturnTo(
  navigate: ReturnType<typeof useNavigate>,
  returnTo: LearnShlokaReturnTo,
): Promise<void> {
  if (returnTo === routePaths.dashboard) {
    await navigate({ replace: true, search: {}, to: routePaths.dashboard });
    return;
  }

  if (returnTo === routePaths.library) {
    await navigate({ replace: true, search: {}, to: routePaths.library });
    return;
  }

  const tab = returnTo.slice(
    `${routePaths.library}?tab=`.length,
  ) as LibraryTabRoute;
  await navigate({
    replace: true,
    search: { tab },
    to: routePaths.library,
  });
}

function LearnShlokaSkeleton({ onCancel }: { onCancel: () => void }) {
  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <LearnShlokaHeader onCancel={onCancel} />
      <div
        aria-label={strings.learnShloka.loading}
        className="min-w-0 flex-1 animate-pulse space-y-4 px-5 py-6"
        role="status"
      >
        <Typography as="span" className="sr-only" variant="p2">
          {strings.learnShloka.loading}
        </Typography>
        <div aria-hidden="true" className="h-3 w-[150px] rounded-md bg-border" />
        <div aria-hidden="true" className="h-8 w-[230px] rounded-lg bg-border" />
        <div aria-hidden="true" className="h-[18px] w-full rounded-md bg-border" />
        <div aria-hidden="true" className="h-[150px] w-full rounded-xl bg-border" />
      </div>
    </section>
  );
}
