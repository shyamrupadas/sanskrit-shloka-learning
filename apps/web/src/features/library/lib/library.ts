import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export interface LibraryCardAction {
  kind: "add-to-learning" | "remove-from-learning";
  nextStatus: ApiTypes.UpdateLibraryShlokaStatus;
}

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

export function getLibraryCardAction(
  tabId: ApiTypes.LibraryTab,
  personalStatus: ApiTypes.LibraryShlokaStatus,
): LibraryCardAction | undefined {
  if (personalStatus === "available" && tabId === "all") {
    return {
      kind: "add-to-learning",
      nextStatus: "learning",
    };
  }

  if (personalStatus === "learning") {
    return {
      kind: "remove-from-learning",
      nextStatus: "available",
    };
  }

  return undefined;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}
