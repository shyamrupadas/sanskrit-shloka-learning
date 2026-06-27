import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, type LucideIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { strings } from "@/shared/i18n";

export function LibraryPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApiTypes.LibraryTab>("reviewing");
  const [searchQuery, setSearchQuery] = useState("");
  const didApplyDefaultTab = useRef(false);
  const libraryQuery = useQuery({
    queryFn: () => auth.apiClient.getLibrary(),
    queryKey: ["library"],
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({
      personalStatus,
      shlokaCode,
    }: {
      personalStatus: ApiTypes.UpdateLibraryShlokaStatus;
      shlokaCode: string;
    }) => auth.apiClient.updateItem(shlokaCode, { personalStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  useUnauthorizedRedirect(libraryQuery.error);

  useEffect(() => {
    if (libraryQuery.data && !didApplyDefaultTab.current) {
      didApplyDefaultTab.current = true;
      setActiveTab(libraryQuery.data.defaultTab);
    }
  }, [libraryQuery.data]);

  return (
    <AppShell>
      <section className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">
            {strings.library.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {strings.library.subtitle}
          </p>
        </div>

        {libraryQuery.isPending ? (
          <StatusCard title={strings.common.loading} />
        ) : libraryQuery.error ? (
          <StatusCard
            description={getApiErrorMessage(
              libraryQuery.error,
              strings.library.loadError,
            )}
            title={strings.common.error}
          />
        ) : (
          <Tabs onValueChange={(value) => setActiveTab(value as ApiTypes.LibraryTab)} value={activeTab}>
            <TabsList className="grid w-full grid-cols-3">
              {libraryQuery.data.tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {libraryQuery.data.tabs.map((tab) => (
              <TabsContent className="pt-3" key={tab.id} value={tab.id}>
                <LibraryTabPanel
                  isUpdating={updateStatusMutation.isPending}
                  mutationError={updateStatusMutation.error}
                  onSearchChange={setSearchQuery}
                  onStatusChange={(shlokaCode, personalStatus) =>
                    updateStatusMutation.mutate({ personalStatus, shlokaCode })
                  }
                  searchQuery={searchQuery}
                  shlokas={libraryQuery.data.allShlokas}
                  tab={tab}
                  updatingShlokaCode={updateStatusMutation.variables?.shlokaCode}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>
    </AppShell>
  );
}

function LibraryTabPanel({
  isUpdating,
  mutationError,
  onSearchChange,
  onStatusChange,
  searchQuery,
  shlokas,
  tab,
  updatingShlokaCode,
}: {
  isUpdating: boolean;
  mutationError: Error | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (
    shlokaCode: string,
    personalStatus: ApiTypes.UpdateLibraryShlokaStatus,
  ) => void;
  searchQuery: string;
  shlokas: ApiTypes.LibraryShlokaDto[];
  tab: ApiTypes.LibraryTabDto;
  updatingShlokaCode: string | undefined;
}) {
  const visibleShlokas = getVisibleShlokas(tab.id, shlokas, searchQuery);
  const isSearchEmpty =
    tab.id === "all" && shlokas.length > 0 && visibleShlokas.length === 0;

  return (
    <div className="space-y-3">
      {tab.id === "all" && shlokas.length > 0 ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="library-search">
            {strings.library.searchLabel}
          </label>
          <Input
            id="library-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={strings.library.searchPlaceholder}
            type="search"
            value={searchQuery}
          />
        </div>
      ) : null}
      {mutationError ? (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(mutationError, strings.library.saveError)}
        </p>
      ) : null}
      {visibleShlokas.length > 0 ? (
        <div className="space-y-3">
          {visibleShlokas.map((shloka) => (
            <ShlokaCard
              isUpdating={isUpdating && updatingShlokaCode === shloka.code}
              key={shloka.code}
              onStatusChange={onStatusChange}
              shloka={shloka}
              tabId={tab.id}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>
              {isSearchEmpty ? strings.library.noSearchResultsTitle : tab.emptyTitle}
            </CardTitle>
            <CardDescription>
              {isSearchEmpty
                ? strings.library.noSearchResultsDescription
                : tab.emptyDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function getVisibleShlokas(
  tabId: ApiTypes.LibraryTab,
  shlokas: ApiTypes.LibraryShlokaDto[],
  searchQuery: string,
): ApiTypes.LibraryShlokaDto[] {
  if (tabId === "reviewing") {
    return shlokas.filter((shloka) => shloka.personalStatus === "reviewing");
  }

  if (tabId === "learning") {
    return shlokas.filter((shloka) => shloka.personalStatus === "learning");
  }

  const normalizedSearch = normalizeSearch(searchQuery);
  if (!normalizedSearch) {
    return shlokas;
  }

  return shlokas.filter((shloka) =>
    normalizeSearch(
      `${shloka.displayTitle} ${shloka.sourceTitle} ${shloka.number}`,
    ).includes(normalizedSearch),
  );
}

function ShlokaCard({
  isUpdating,
  onStatusChange,
  shloka,
  tabId,
}: {
  isUpdating: boolean;
  onStatusChange: (
    shlokaCode: string,
    personalStatus: ApiTypes.UpdateLibraryShlokaStatus,
  ) => void;
  shloka: ApiTypes.LibraryShlokaDto;
  tabId: ApiTypes.LibraryTab;
}) {
  const excerpt = shloka.text.split("\n").filter(Boolean).slice(0, 2).join(" / ");
  const action = getCardAction(tabId, shloka.personalStatus);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{shloka.displayTitle}</CardTitle>
            <CardDescription>
              {shloka.sourceTitle} · {shloka.number}
            </CardDescription>
          </div>
          <span className="w-fit rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
            {statusLabels[shloka.personalStatus]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6">{excerpt}</p>
        {shloka.fullTranslation ? (
          <p className="text-sm leading-6 text-muted-foreground">{shloka.fullTranslation}</p>
        ) : null}
        {action ? (
          <Button
            disabled={isUpdating}
            onClick={() => onStatusChange(shloka.code, action.nextStatus)}
            type="button"
            variant={action.variant}
          >
            <action.Icon />
            {isUpdating ? strings.library.saving : action.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

const statusLabels: Record<ApiTypes.LibraryShlokaStatus, string> = {
  available: "Доступна",
  learning: "Буду учить",
  reviewing: "Повторяю",
};

function getCardAction(
  tabId: ApiTypes.LibraryTab,
  personalStatus: ApiTypes.LibraryShlokaStatus,
):
  | {
      Icon: LucideIcon;
      label: string;
      nextStatus: ApiTypes.UpdateLibraryShlokaStatus;
      variant: "default" | "outline";
    }
  | undefined {
  if (personalStatus === "available" && tabId === "all") {
    return {
      Icon: Plus,
      label: strings.library.addToLearning,
      nextStatus: "learning",
      variant: "default",
    };
  }

  if (personalStatus === "learning") {
    return {
      Icon: X,
      label: strings.library.removeFromLearning,
      nextStatus: "available",
      variant: "outline",
    };
  }

  return undefined;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
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
