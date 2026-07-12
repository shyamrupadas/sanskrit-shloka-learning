import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export type LibraryCardAction =
  | { kind: "start-learning" }
  | {
      kind: "add-to-learning" | "remove-from-learning";
      nextStatus: ApiTypes.UpdateLibraryShlokaStatus;
    };

export function getVisibleShlokas(
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

export function getLibraryCardActions(
  tabId: ApiTypes.LibraryTab,
  personalStatus: ApiTypes.LibraryShlokaStatus,
): LibraryCardAction[] {
  if (personalStatus === "available" && tabId === "all") {
    return [{
      kind: "add-to-learning",
      nextStatus: "learning",
    }];
  }

  if (personalStatus === "learning") {
    const removeAction = {
      kind: "remove-from-learning",
      nextStatus: "available",
    } as const;

    return tabId === "learning"
      ? [{ kind: "start-learning" }, removeAction]
      : [removeAction];
  }

  return [];
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}
