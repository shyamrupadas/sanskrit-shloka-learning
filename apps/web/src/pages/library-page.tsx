import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Plus, X, type LucideIcon } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

export function LibraryPage() {
  const auth = useSession();
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
  );
}

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
  const shlokaPath = routePaths.libraryShloka;

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
          <div className="flex items-center gap-2">
            <span className="w-fit rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
              {statusLabels[shloka.personalStatus]}
            </span>
            <Button
              asChild
              aria-label={`${strings.library.openShloka} ${shloka.displayTitle}`}
              size="icon"
              variant="outline"
            >
              <Link params={{ shlokaCode: shloka.code }} to={shlokaPath}>
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link
          className="block rounded-md text-sm leading-6 outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          params={{ shlokaCode: shloka.code }}
          to={shlokaPath}
        >
          {excerpt}
        </Link>
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
