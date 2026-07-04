import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus, X, type LucideIcon } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
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

import {
  getLibraryCardAction,
  getVisibleShlokas,
  type LibraryCardAction,
} from "../lib/library";
import type { LibraryModel } from "../model/use-library";
import { StatusCard } from "./status-card";

export function LibraryView({ model }: { model: LibraryModel }) {
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

      {model.isLoading ? (
        <StatusCard title={strings.common.loading} />
      ) : model.loadError ? (
        <StatusCard
          description={getApiErrorMessage(
            model.loadError,
            strings.library.loadError,
          )}
          title={strings.common.error}
        />
      ) : model.data ? (
        <Tabs
          onValueChange={(value) =>
            model.setActiveTab(value as ApiTypes.LibraryTab)
          }
          value={model.activeTab}
        >
          <TabsList className="grid w-full grid-cols-3">
            {model.data.tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {model.data.tabs.map((tab) => (
            <TabsContent className="pt-3" key={tab.id} value={tab.id}>
              <LibraryTabPanel
                mutationError={model.updateError}
                onSearchChange={model.setSearchQuery}
                onStatusChange={model.updateStatus}
                searchQuery={model.searchQuery}
                shlokas={model.data?.allShlokas ?? []}
                tab={tab}
                updatingShlokaCode={model.updatingShlokaCode}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </section>
  );
}

function LibraryTabPanel({
  mutationError,
  onSearchChange,
  onStatusChange,
  searchQuery,
  shlokas,
  tab,
  updatingShlokaCode,
}: {
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
              isUpdating={updatingShlokaCode === shloka.code}
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
              {isSearchEmpty
                ? strings.library.noSearchResultsTitle
                : tab.emptyTitle}
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
  const action = getLibraryCardAction(tabId, shloka.personalStatus);
  const actionPresentation = action
    ? cardActionPresentations[action.kind]
    : undefined;
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
          <p className="text-sm leading-6 text-muted-foreground">
            {shloka.fullTranslation}
          </p>
        ) : null}
        {action && actionPresentation ? (
          <Button
            disabled={isUpdating}
            onClick={() => onStatusChange(shloka.code, action.nextStatus)}
            type="button"
            variant={actionPresentation.variant}
          >
            <actionPresentation.Icon />
            {isUpdating ? strings.library.saving : actionPresentation.label}
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

const cardActionPresentations: Record<
  LibraryCardAction["kind"],
  {
    Icon: LucideIcon;
    label: string;
    variant: "default" | "outline";
  }
> = {
  "add-to-learning": {
    Icon: Plus,
    label: strings.library.addToLearning,
    variant: "default",
  },
  "remove-from-learning": {
    Icon: X,
    label: strings.library.removeFromLearning,
    variant: "outline",
  },
};
