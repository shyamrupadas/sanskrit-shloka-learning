import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { strings } from "@/shared/i18n";
import { getBrowserTimeZone } from "@/shared/lib/time-zone";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

export function LearnShlokaPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeZone = getBrowserTimeZone();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
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

    const status = shlokaQuery.data?.personalStatus;
    if (!status || status === "learning") {
      return;
    }

    void navigate({
      replace: true,
      search: { tab: status === "reviewing" ? "reviewing" : "all" },
      to: routePaths.library,
    });
  }, [completeMutation.data, navigate, shlokaQuery.data?.personalStatus]);

  if (shlokaQuery.isPending) {
    return <LearnShlokaSkeleton />;
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
  if (shlokaQuery.error || shlokaQuery.data.personalStatus !== "learning") {
    return null;
  }

  return (
    <section className="flex min-h-[calc(100dvh-2.5rem)] min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h1 className="break-words font-heading text-2xl leading-[1.2] font-extrabold [overflow-wrap:anywhere]">
          {shlokaQuery.data.displayTitle}
        </h1>
        <Button
          asChild
          aria-label={strings.learnShloka.openTips}
          className="size-9 shrink-0 rounded-full border-primary/20 bg-primary/5 text-xl font-extrabold text-primary hover:bg-accent"
          size="icon-lg"
          variant="outline"
        >
          <Link to={routePaths.learning}>?</Link>
        </Button>
      </div>

      <div
        aria-label={strings.shloka.canonicalText}
        className="mt-4 break-words whitespace-pre-wrap font-[family-name:var(--font-family-sanskrit-token)] text-[length:var(--font-size-sanskrit)] leading-[1.32] font-extrabold [overflow-wrap:anywhere]"
      >
        {shlokaQuery.data.text}
      </div>

      <div className="mt-auto space-y-2.5 pt-6">
        <Button
          className="h-11 w-full text-[15px] font-semibold"
          disabled={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
          type="button"
        >
          {completeMutation.isPending
            ? strings.learnShloka.completing
            : strings.learnShloka.complete}
        </Button>
        <Button
          className="h-11 w-full text-[15px] font-semibold text-primary"
          onClick={() => {
            void navigate({
              search: { tab: "learning" },
              to: routePaths.library,
            });
          }}
          type="button"
          variant="outline"
        >
          {strings.learnShloka.notComplete}
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
    <section className="flex min-h-[calc(100dvh-2.5rem)] min-w-0 flex-1 flex-col">
      <div className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
        <Check aria-hidden="true" className="size-6.5" />
      </div>
      <h1 className="mt-4 break-words font-heading text-[length:var(--font-size-screen-title)] leading-[1.1] font-extrabold [overflow-wrap:anywhere]">
        {strings.learnShloka.completedTitle}
      </h1>

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
      to: routePaths.learnShloka,
    });
    return;
  }

  await navigate({ search: { tab: "all" }, to: routePaths.library });
}

function LearnShlokaSkeleton() {
  return (
    <section
      aria-label={strings.learnShloka.loading}
      className="min-w-0 animate-pulse space-y-4"
      role="status"
    >
      <span className="sr-only">{strings.learnShloka.loading}</span>
      <div aria-hidden="true" className="h-7 w-2/3 rounded bg-muted" />
      <div className="space-y-2.5" role="presentation">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            aria-hidden="true"
            className="h-6 rounded bg-muted last:w-4/5"
            key={index}
          />
        ))}
      </div>
    </section>
  );
}
