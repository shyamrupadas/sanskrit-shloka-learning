import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Shield } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { AppShell } from "@/app/layouts/app-shell";
import { getApiErrorMessage } from "@/shared/api/errors";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Switch } from "@/shared/ui/switch";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

export function SettingsPage() {
  const auth = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryKey = ["account", auth.account?.id, "settings"] as const;
  const settingsQuery = useQuery({
    queryFn: () => auth.apiClient.getSettings(),
    queryKey,
  });
  const settingsMutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateAccountSettingsRequest) =>
      auth.apiClient.updateSettings(request),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKey, settings);
    },
  });

  useUnauthorizedRedirect(settingsQuery.error);
  useUnauthorizedRedirect(settingsMutation.error);

  const hardMode = settingsMutation.isPending
    ? settingsMutation.variables.hardMode
    : (settingsQuery.data?.hardMode ?? false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await auth.logout();
      await router.navigate({ replace: true, to: routePaths.login });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <AppShell>
      <section className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">
            {strings.settings.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {strings.settings.subtitle}
          </p>
        </div>

        {settingsQuery.isPending ? (
          <StatusCard title={strings.common.loading} />
        ) : settingsQuery.error ? (
          <StatusCard
            description={getApiErrorMessage(
              settingsQuery.error,
              strings.settings.loadError,
            )}
            title={strings.common.error}
          />
        ) : (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle id="hard-mode-title">{strings.settings.hardMode}</CardTitle>
              <CardAction>
                <Switch
                  aria-labelledby="hard-mode-title"
                  checked={hardMode}
                  disabled={settingsMutation.isPending}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({ hardMode: checked })
                  }
                />
              </CardAction>
            </CardHeader>
            {settingsMutation.isSuccess || settingsMutation.error ? (
              <CardContent>
                {settingsMutation.isSuccess ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {strings.settings.saved}
                  </p>
                ) : null}
                {settingsMutation.error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {getApiErrorMessage(
                      settingsMutation.error,
                      strings.settings.saveError,
                    )}
                  </p>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        )}

        {auth.account?.roles.includes("admin") ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>{strings.settings.adminTitle}</CardTitle>
              <CardDescription>{strings.settings.adminDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="h-10 w-full sm:w-auto">
                <Link to={routePaths.admin}>
                  <Shield />
                  {strings.settings.adminAction}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{strings.settings.accountTitle}</CardTitle>
            <CardDescription>{auth.account?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-10 w-full sm:w-auto"
              disabled={isLoggingOut}
              onClick={handleLogout}
              type="button"
              variant="destructive"
            >
              <LogOut />
              {strings.auth.logout}
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
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
