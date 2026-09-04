import { useEffect, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  SanskritTypography,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import {
  learnShlokaReturnTo,
  routePaths,
  type LearnShlokaReturnTo,
  type LibraryTabRoute,
} from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

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
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
    refetchOnMount: "always",
  });
  const completeMutation = useMutation({
    mutationFn: () =>
      auth.apiClient.completeLearning(shlokaCode, { timeZone }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        exact: true,
        queryKey: ["library"],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useUnauthorizedRedirect(shlokaQuery.error ?? completeMutation.error);

  useEffect(() => {
    if (completeMutation.data) {
      return;
    }

    if (!shlokaQuery.isFetchedAfterMount) {
      return;
    }

    const status = shlokaQuery.data?.personalStatus;
    if (!status || status === "learning" || status === "reviewing") {
      return;
    }

    void navigateToReturnTo(navigate, returnTo);
  }, [
    completeMutation.data,
    navigate,
    returnTo,
    shlokaQuery.data?.personalStatus,
    shlokaQuery.isFetchedAfterMount,
  ]);

  const cancel = () => {
    void navigateToReturnTo(navigate, returnTo);
  };

  if (
    shlokaQuery.isPending ||
    shlokaQuery.isFetching ||
    !shlokaQuery.isFetchedAfterMount
  ) {
    return <LearnShlokaSkeleton onCancel={cancel} />;
  }
  if (completeMutation.data) {
    return (
      <CompletedLearning
        remainingLearningShlokas={
          completeMutation.data.remainingLearningShlokas
        }
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

  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <LearnShlokaHeader
        cancelDisabled={completeMutation.isPending}
        onCancel={cancel}
        showAdvice
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

          <Button
            className="h-[52px] w-full text-[15px] text-primary"
            disabled
            type="button"
            variant="outline"
          >
            {strings.learnShloka.helper}
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto bg-card px-5 py-3 shadow-[var(--component-bottom-nav-shadow)]">
        <Button
          className="h-[52px] w-full text-[15px] font-medium"
          disabled={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
          type="button"
        >
          {completeMutation.isPending
            ? strings.learnShloka.completing
            : strings.learnShloka.complete}
        </Button>
      </div>
    </section>
  );
}

function LearnShlokaHeader({
  cancelDisabled = false,
  onCancel,
  showAdvice = false,
}: {
  cancelDisabled?: boolean;
  onCancel: () => void;
  showAdvice?: boolean;
}) {
  return (
    <header className="grid h-[52px] shrink-0 grid-cols-[100px_1fr_100px] items-center border-b border-border px-5">
      <button
        className="w-fit rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        disabled={cancelDisabled}
        onClick={onCancel}
        type="button"
      >
        {strings.learnShloka.cancel}
      </button>
      <Typography as="span" className="text-center" variant="p2" weight="bold">
        {strings.learnShloka.title}
      </Typography>
      {showAdvice ? (
        <Link
          aria-label={strings.learnShloka.openTips}
          className="justify-self-end rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50"
          to={routePaths.learning}
        >
          {strings.learnShloka.advice}
        </Link>
      ) : null}
    </header>
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
  remainingLearningShlokas,
}: {
  remainingLearningShlokas: ApiTypes.LibraryShlokaDto[];
}) {
  const navigate = useNavigate();

  return (
    <section className="flex min-h-dvh min-w-0 flex-1 flex-col px-5 py-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
        <Check aria-hidden="true" className="size-6.5" />
      </div>
      <Typography
        className="mt-4 break-words [overflow-wrap:anywhere]"
        variant="h1"
      >
        {strings.learnShloka.completedTitle}
      </Typography>

      <div className="mt-auto space-y-2.5 pt-6">
        <Button
          className="h-11 w-full text-[15px] font-semibold"
          onClick={() => {
            void navigate({ to: routePaths.dashboard });
          }}
          type="button"
        >
          {strings.learnShloka.toDashboard}
        </Button>
        <Button
          className="h-11 w-full text-[15px] font-semibold text-primary"
          onClick={() => {
            void navigateToMoreLearning(navigate, remainingLearningShlokas);
          }}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" />
          {strings.learnShloka.learnMore}
        </Button>
      </div>
    </section>
  );
}

async function navigateToMoreLearning(
  navigate: ReturnType<typeof useNavigate>,
  remainingLearningShlokas: ApiTypes.LibraryShlokaDto[],
): Promise<void> {
  if (remainingLearningShlokas.length > 1) {
    await navigate({
      search: { tab: "learning" },
      to: routePaths.library,
    });
    return;
  }

  const remainingShloka = remainingLearningShlokas[0];
  if (remainingShloka) {
    await navigate({
      params: { shlokaCode: remainingShloka.code },
      search: { returnTo: learnShlokaReturnTo.dashboard },
      to: routePaths.learnShloka,
    });
    return;
  }

  await navigate({ search: { tab: "all" }, to: routePaths.library });
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
