import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  SanskritTypography,
  ShlokaTranslation,
  StatusCard,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

export function ShlokaPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getItem(shlokaCode),
    queryKey: ["library", "shloka", shlokaCode],
  });

  useUnauthorizedRedirect(shlokaQuery.error);

  return (
    <section className="min-w-0 space-y-4">
      <Link
        activeOptions={{ exact: true }}
        className="inline-flex w-fit items-center gap-2 rounded-md text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50"
        to={routePaths.library}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        {strings.shloka.backToLibrary}
      </Link>

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
          <SanskritTypography
            className="break-words [overflow-wrap:anywhere]"
            variant="h1"
          >
            {shlokaQuery.data.displayTitle}
          </SanskritTypography>

          <SanskritTypography
            aria-label={strings.shloka.canonicalText}
            as="div"
            className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            variant="p4"
            weight="medium"
          >
            {shlokaQuery.data.text}
          </SanskritTypography>
          <ShlokaTranslation text={shlokaQuery.data.fullTranslation} />
        </article>
      )}
    </section>
  );
}
