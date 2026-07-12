import { BookOpen, Plus, Search, X, type LucideIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import {
  EmptyState,
  LibraryTabs,
  ShlokaCard,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { Input } from "@/shared/ui/input";

import {
  getLibraryCardActions,
  getVisibleShlokas,
  type LibraryCardAction,
} from "../lib/library";
import type { LibraryModel } from "../model/use-library";
import { routePaths } from "@/shared/model/routes";
import { StatusCard } from "./status-card";

export function LibraryView({ model }: { model: LibraryModel }) {
  return (
    <section className="space-y-3.5">
      <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.library.title}
      </h1>

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
        <LibraryTabs
          activeTab={model.activeTab}
          onTabChange={model.setActiveTab}
          renderPanel={(tabId) => {
            const tab = model.data?.tabs.find(
              (candidate) => candidate.id === tabId,
            );

            return tab ? (
              <LibraryTabPanel
                mutationError={model.updateError}
                onSearchChange={model.setSearchQuery}
                onStatusChange={model.updateStatus}
                searchQuery={model.searchQuery}
                shlokas={model.data?.allShlokas ?? []}
                tab={tab}
                updatingShlokaCode={model.updatingShlokaCode}
              />
            ) : null;
          }}
          tabs={model.data.tabs}
        />
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
    <div className="space-y-3.5">
      {tab.id === "all" && shlokas.length > 0 ? (
        <div className="relative">
          <label className="sr-only" htmlFor="library-search">
            {strings.library.searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-[var(--input-height)] rounded-[var(--input-radius)] bg-card pr-[var(--input-padding-x)] pl-10 text-[length:var(--input-text-size)] placeholder:text-[color:var(--placeholder)]"
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
        <div className="space-y-2.5">
          {visibleShlokas.map((shloka) => (
            <LibraryShlokaCard
              isUpdating={updatingShlokaCode === shloka.code}
              key={shloka.code}
              onStatusChange={onStatusChange}
              shloka={shloka}
              tabId={tab.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description={
            isSearchEmpty
              ? strings.library.noSearchResultsDescription
              : tab.emptyDescription
          }
          title={
            isSearchEmpty
              ? strings.library.noSearchResultsTitle
              : tab.emptyTitle
          }
        />
      )}
    </div>
  );
}

function LibraryShlokaCard({
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
  const navigate = useNavigate();
  const excerpt =
    shloka.text
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.trim() ?? "";
  const actions = getLibraryCardActions(tabId, shloka.personalStatus);

  return (
    <ShlokaCard
      actions={actions.map((action) => {
        const presentation = cardActionPresentations[action.kind];

        return {
          disabled: action.kind === "start-learning" ? false : isUpdating,
          Icon: presentation.Icon,
          label:
            action.kind !== "start-learning" && isUpdating
              ? strings.library.saving
              : presentation.label,
          onClick: () => {
            if (action.kind === "start-learning") {
              void navigate({
                params: { shlokaCode: shloka.code },
                to: routePaths.learnShloka,
              });
              return;
            }

            onStatusChange(shloka.code, action.nextStatus);
          },
          variant: presentation.variant,
        };
      })}
      excerpt={excerpt}
      openLabel={`${strings.library.openShloka} ${shloka.displayTitle}`}
      shlokaCode={shloka.code}
      status={statusLabels[shloka.personalStatus]}
      title={shloka.displayTitle}
    />
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
  "start-learning": {
    Icon: BookOpen,
    label: strings.library.startLearning,
    variant: "default",
  },
  "remove-from-learning": {
    Icon: X,
    label: strings.library.removeFromLearning,
    variant: "outline",
  },
};
