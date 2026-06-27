import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/api/errors";
import { useAuth } from "@/auth/auth-context";
import { useUnauthorizedRedirect } from "@/auth/use-unauthorized-redirect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { strings } from "@/shared/i18n";

export function DashboardPage() {
  const auth = useAuth();
  const dashboardQuery = useQuery({
    queryFn: () => auth.apiClient.getDashboard(),
    queryKey: ["dashboard"],
  });

  useUnauthorizedRedirect(dashboardQuery.error);

  return (
    <AppShell>
      <section className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">
            {strings.dashboard.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {strings.dashboard.subtitle}
          </p>
        </div>

        {dashboardQuery.isPending ? (
          <StatusCard title={strings.common.loading} />
        ) : dashboardQuery.error ? (
          <StatusCard
            description={getApiErrorMessage(
              dashboardQuery.error,
              strings.dashboard.loadError,
            )}
            title={strings.common.error}
          />
        ) : (
          <EmptyDashboard dashboard={dashboardQuery.data} />
        )}
      </section>
    </AppShell>
  );
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
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{strings.dashboard.emptyTitle}</CardTitle>
        <CardDescription>{strings.dashboard.emptyDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="h-10 w-full sm:w-auto">
          <Link to={dashboard.primaryAction.target}>
            <Plus />
            {dashboard.primaryAction.label}
          </Link>
        </Button>
      </CardContent>
    </Card>
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
