import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { EmptyState } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export function DashboardPage() {
  const auth = useSession();
  const dashboardQuery = useQuery({
    queryFn: () => auth.apiClient.getDashboard(),
    queryKey: ["dashboard"],
  });

  useUnauthorizedRedirect(dashboardQuery.error);

  if (dashboardQuery.isPending || dashboardQuery.error) {
    return (
      <section className="space-y-5">
        <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
          {strings.dashboard.title}
        </h1>
        {dashboardQuery.isPending ? (
          <StatusCard title={strings.common.loading} />
        ) : (
          <StatusCard
            description={getApiErrorMessage(
              dashboardQuery.error,
              strings.dashboard.loadError,
            )}
            title={strings.common.error}
          />
        )}
      </section>
    );
  }

  return <EmptyDashboard dashboard={dashboardQuery.data} />;
}

function EmptyDashboard({
  dashboard,
}: {
  dashboard: ApiTypes.EmptyDashboardDto;
}) {
  if (dashboard.hasPersonalShlokas) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <h1 className="font-heading text-[length:var(--font-size-section-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.dashboard.wantToLearnTitle}
      </h1>
      <EmptyState
        action={
          <Link to={dashboard.primaryAction.target}>
            {dashboard.primaryAction.label}
          </Link>
        }
        description={strings.dashboard.emptyDescription}
        title={strings.dashboard.emptyTitle}
      />
    </section>
  );
}

function StatusCard({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}
