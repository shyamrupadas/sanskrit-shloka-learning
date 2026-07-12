import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { getLibraryCardActions, getVisibleShlokas } from "./library";

const shlokas = [
  {
    code: "amrita-1",
    displayTitle: "Амрита 1",
    sourceTitle: "Амрита",
    number: "1",
    text: "первая пада",
    personalStatus: "reviewing",
  },
  {
    code: "gita-chapter-1-2",
    displayTitle: "Бхагавад-гита, Глава 1 2",
    sourceTitle: "Бхагавад-гита",
    number: "2",
    text: "вторая пада",
    personalStatus: "available",
  },
  {
    code: "gita-chapter-2-10",
    displayTitle: "Бхагавад-гита, Глава 2 2.10",
    sourceTitle: "Бхагавад-гита",
    number: "2.10",
    text: "третья пада",
    personalStatus: "learning",
  },
] satisfies ApiTypes.LibraryShlokaDto[];

describe("library rules", () => {
  it.each([
    ["reviewing", ["amrita-1"]],
    ["learning", ["gita-chapter-2-10"]],
  ] as const)("filters the %s tab by personal status", (tabId, expectedCodes) => {
    expect(
      getVisibleShlokas(tabId, shlokas, "").map((shloka) => shloka.code),
    ).toEqual(expectedCodes);
  });

  it.each([
    [" амРИТА ", ["amrita-1"]],
    ["бхагавад-ГИТА", ["gita-chapter-1-2", "gita-chapter-2-10"]],
    ["2.10", ["gita-chapter-2-10"]],
    ["нет совпадений", []],
  ] as const)("searches all shlokas by %s", (searchQuery, expectedCodes) => {
    expect(
      getVisibleShlokas("all", shlokas, searchQuery).map(
        (shloka) => shloka.code,
      ),
    ).toEqual(expectedCodes);
  });

  it("returns the add action only for an available shloka on the all tab", () => {
    expect(getLibraryCardActions("all", "available")).toEqual([{
      kind: "add-to-learning",
      nextStatus: "learning",
    }]);
    expect(getLibraryCardActions("learning", "available")).toEqual([]);
    expect(getLibraryCardActions("reviewing", "available")).toEqual([]);
  });

  it("adds the learn exception before remove on the to-learn tab", () => {
    expect(getLibraryCardActions("learning", "learning")).toEqual([
      { kind: "start-learning" },
      { kind: "remove-from-learning", nextStatus: "available" },
    ]);
    expect(getLibraryCardActions("all", "learning")).toEqual([
      { kind: "remove-from-learning", nextStatus: "available" },
    ]);
  });

  it("does not offer an action for a reviewing shloka", () => {
    for (const tabId of ["reviewing", "learning", "all"] as const) {
      expect(getLibraryCardActions(tabId, "reviewing")).toEqual([]);
    }
  });
});
