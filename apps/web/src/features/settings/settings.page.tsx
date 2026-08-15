import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Shield } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  SettingsRow,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";

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
    <section className="min-w-0 space-y-4">
      <Typography variant="h1">{strings.settings.title}</Typography>

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
        <SettingsRow
          action={
            <div className="flex h-7 w-12 items-center justify-center">
              <Switch
                aria-labelledby="hard-mode-title"
                checked={hardMode}
                className="scale-150"
                disabled={settingsMutation.isPending}
                onCheckedChange={(checked) =>
                  settingsMutation.mutate({ hardMode: checked })
                }
              />
            </div>
          }
          feedback={
            settingsMutation.isSuccess || settingsMutation.error ? (
              <>
                {settingsMutation.isSuccess ? (
                  <Typography role="status" tone="muted" variant="p2">
                    {strings.settings.saved}
                  </Typography>
                ) : null}
                {settingsMutation.error ? (
                  <Typography role="alert" tone="danger" variant="p2">
                    {getApiErrorMessage(
                      settingsMutation.error,
                      strings.settings.saveError,
                    )}
                  </Typography>
                ) : null}
              </>
            ) : null
          }
          title={strings.settings.hardMode}
          titleId="hard-mode-title"
        />
      )}

      {auth.account?.roles.includes("admin") ? (
        <SettingsRow
          action={
            <Button
              asChild
              className="h-[var(--button-height)] px-4 text-[length:var(--button-font-size)]"
              variant="outline"
            >
              <Link to={routePaths.admin}>
                <Shield />
                {strings.settings.adminAction}
              </Link>
            </Button>
          }
          title={strings.settings.adminTitle}
        />
      ) : null}

      <SettingsRow
        action={
          <Button
            className="h-[var(--button-height)] px-4 text-[length:var(--button-font-size)]"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
            variant="destructive"
          >
            <LogOut />
            {strings.auth.logout}
          </Button>
        }
        description={auth.account?.email}
        title={strings.settings.accountTitle}
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
  return <SettingsRow description={description} title={title} />;
}
