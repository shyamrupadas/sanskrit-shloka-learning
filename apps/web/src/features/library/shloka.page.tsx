import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { StatusCard } from "./ui/status-card";

export function ShlokaPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
  });

  useUnauthorizedRedirect(shlokaQuery.error);

  return (
    <section className="space-y-5">
      <div>
        <Button asChild size="sm" variant="outline">
          <Link activeOptions={{ exact: true }} to={routePaths.library}>
            <ArrowLeft />
            {strings.shloka.backToLibrary}
          </Link>
        </Button>
      </div>

      {shlokaQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : shlokaQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(
            shlokaQuery.error,
            strings.shloka.loadError,
          )}
          title={strings.common.error}
        />
      ) : (
        <article className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-normal">
              {shlokaQuery.data.displayTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {shlokaQuery.data.sourceTitle} · {shlokaQuery.data.number}
            </p>
          </div>

          <div
            aria-label={strings.shloka.canonicalText}
            className="whitespace-pre-line text-lg leading-8"
          >
            {shlokaQuery.data.text}
          </div>
        </article>
      )}
    </section>
  );
}
