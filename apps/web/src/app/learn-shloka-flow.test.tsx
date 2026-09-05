import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { App } from "@/app/App";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import {
  expectPath,
  mockApi,
  session,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

const learningShloka = shloka({
  code: "gita-1-1",
  displayTitle: "Бхагавад-гита 1.1",
  text: "дхарма-кшетре куру-кшетре\nсамавета юютсавах\nмамаках пандавашчаива\nкимакурвата санджая",
});
const secondLearningShloka = shloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
});
const thirdLearningShloka = shloka({
  code: "gita-4-8",
  displayTitle: "Бхагавад-гита 4.8",
});

describe("app learn shloka flow", () => {
  it("shows the accepted loading shell and lets the user cancel to the dashboard", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (isSessionRequest(request)) {
        return { status: 200, body: session };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw unhandled(request);
    });
    storeTestSession(session);

    renderAppAt("/library/shlokas/gita-1-1/learn");

    expect(
      await screen.findByRole("status", { name: "Загрузка шлоки" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(routePaths.dashboard);
    expect(window.history.length).toBe(historyLength);
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it.each([
    {
      entryPath: routePaths.dashboard,
      expectedReturnTo: routePaths.dashboard,
      expectedSearch: "",
      label: "dashboard",
    },
    {
      entryPath: "/library?tab=learning",
      expectedReturnTo: "/library?tab=learning",
      expectedSearch: "?tab=learning",
      label: "to-learn library tab",
    },
    {
      entryPath: "/library?tab=all",
      expectedReturnTo: "/library?tab=all",
      expectedSearch: "?tab=all",
      label: "all library tab",
    },
  ])("round-trips the $label origin without a mutation", async ({
    entryPath,
    expectedReturnTo,
    expectedSearch,
  }) => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request, {
        dashboardLearningShlokas: [learningShloka],
        libraryShlokas: [learningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt(entryPath);

    if (entryPath === routePaths.dashboard) {
      await user.click(
        await screen.findByRole("link", {
          name: `Учить ${learningShloka.displayTitle}`,
        }),
      );
    } else {
      const card = await screen.findByRole("article", {
        name: learningShloka.displayTitle,
      });
      await user.click(within(card).getByRole("button", { name: "Учить" }));
    }

    await expectPath("/library/shlokas/gita-1-1/learn");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
      expectedReturnTo,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Канонический текст шлоки")).toHaveLength(
      1,
    );
    expect(screen.getByLabelText("Канонический текст шлоки").textContent).toBe(
      learningShloka.text,
    );
    expect(
      screen.getByRole("button", { name: "Совет" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
    expect(
      screen.getByRole("button", { name: "Помощник" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выучил" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(new URL(entryPath, window.location.origin).pathname);
    expect(window.location.search).toBe(expectedSearch);
    expect(window.history.length).toBe(historyLength);
    expect(
      requests.some(
        ({ method, path }) =>
          method === "POST" && path.endsWith("/complete-learning"),
      ),
    ).toBe(false);
  });

  it.each([
    ["missing", ""],
    ["external", "https://example.com/phishing"],
    ["auth", "/login"],
    ["admin", "/admin"],
    ["cyclic", "/library/shlokas/gita-1-1/learn"],
    ["unknown", "/not-a-route"],
    ["invalid query", "/library?tab=learning&unsafe=true"],
  ])("normalizes a %s returnTo to the dashboard", async (_, returnTo) => {
    const user = userEvent.setup();
    mockApi((request) => learningApi(request));
    storeTestSession(session);
    const search = returnTo
      ? `?${new URLSearchParams({ returnTo }).toString()}`
      : "";
    renderAppAt(`/library/shlokas/gita-1-1/learn${search}`);

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
        routePaths.dashboard,
      );
    });
    await screen.findByRole("heading", {
      level: 1,
      name: learningShloka.displayTitle,
    });
    await user.click(
      screen.getByRole("button", { name: "Отмена" }),
    );

    await expectPath(routePaths.dashboard);
  });

  it("retries a failed load once and opens the active attempt", async () => {
    const user = userEvent.setup();
    let itemGetCount = 0;
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        itemGetCount += 1;
        return itemGetCount === 1
          ? { status: 500 }
          : { status: 200, body: learningShloka };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Не удалось загрузить шлоку",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отмена и возврат" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Попробовать снова" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(itemGetCount).toBe(2);
  });

  it("returns from a load error without sending a mutation", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return { status: 500 };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt(
      "/library/shlokas/gita-1-1/learn?returnTo=%2Flibrary%3Ftab%3Dlearning",
    );

    const historyLength = window.history.length;
    await user.click(
      await screen.findByRole("button", { name: "Отмена и возврат" }),
    );

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=learning");
    expect(window.history.length).toBe(historyLength);
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
  });

  it("keeps a non-repeating advice series across the complete dialog focus lifecycle", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    const adviceTrigger = await screen.findByRole("button", {
      name: "Совет",
    });
    await user.click(adviceTrigger);

    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    const closeButton = within(dialog).getByRole("button", {
      name: "Закрыть совет",
    });
    const anotherAdviceButton = within(dialog).getByRole("button", {
      name: "Другой совет",
    });
    const allAdviceLink = within(dialog).getByRole("link", {
      name: "Все советы",
    });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
    expect(
      screen.queryByRole("button", { name: "Выучил" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(strings.learning.tips[0]!.text),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Совет 1 из 3")).toBeInTheDocument();

    await user.tab();
    expect(anotherAdviceButton).toHaveFocus();
    await user.tab();
    expect(allAdviceLink).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(anotherAdviceButton);
    expect(
      within(dialog).getByText(strings.learning.tips[1]!.text),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Совет 2 из 3")).toBeInTheDocument();
    await user.click(closeButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(adviceTrigger).toHaveFocus();
    await user.click(adviceTrigger);

    const reopenedDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(reopenedDialog).getByText(strings.learning.tips[1]!.text),
    ).toBeInTheDocument();
    await user.click(
      within(reopenedDialog).getByRole("button", {
        name: "Другой совет",
      }),
    );

    expect(
      within(reopenedDialog).getByText(strings.learning.tips[2]!.text),
    ).toBeInTheDocument();
    expect(
      within(reopenedDialog).queryByText(/Совет \d из \d/),
    ).not.toBeInTheDocument();
    expect(
      within(reopenedDialog).getByRole("button", {
        name: "Других советов нет",
      }),
    ).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(adviceTrigger).toHaveFocus();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("restores the unfinished attempt and advice series after native Back", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request);
    });
    storeTestSession(session);
    const attemptPath = "/library/shlokas/gita-1-1/learn";
    renderAppAt(attemptPath);

    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("link", { name: "Все советы" }),
    );

    await expectPath(routePaths.learning);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Советы" }),
    ).toBeInTheDocument();
    act(() => {
      window.history.back();
    });

    await expectPath(attemptPath);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Совет" }));

    const restoredDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(restoredDialog).getByText(strings.learning.tips[1]!.text),
    ).toBeInTheDocument();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("starts a fresh advice series for a new attempt", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request, {
        dashboardLearningShlokas: [learningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Закрыть совет" }),
    );
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(routePaths.dashboard);
    await user.click(
      await screen.findByRole("link", {
        name: `Учить ${learningShloka.displayTitle}`,
      }),
    );
    await expectPath("/library/shlokas/gita-1-1/learn");
    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );

    const freshDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(freshDialog).getByText(strings.learning.tips[0]!.text),
    ).toBeInTheDocument();
    expect(within(freshDialog).getByText("Совет 1 из 3")).toBeInTheDocument();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("shows a reviewing status guard and returns without a mutation", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return {
          status: 200,
          body: { ...learningShloka, personalStatus: "reviewing" },
        };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    const returnTo = "/library?tab=all";
    renderAppAt(
      `/library/shlokas/gita-1-1/learn?${new URLSearchParams({ returnTo }).toString()}`,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока уже в повторении",
      }),
    ).toBeInTheDocument();
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Вернуться" }));

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=all");
    expect(window.history.length).toBe(historyLength);
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
  });

  it("safely leaves an attempt whose current status is unavailable", async () => {
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return {
          status: 200,
          body: { ...learningShloka, personalStatus: "available" },
        };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await expectPath(routePaths.dashboard);
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 1,
          name: learningShloka.displayTitle,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("completes learning and offers the dashboard action", async () => {
    const user = userEvent.setup();
    const completionRequests: MockApiRequest[] = [];
    let completedLearning = false;
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/dashboard/streak"
      ) {
        return {
          status: 200,
          body: streak(completedLearning),
        };
      }
      if (
        request.method === "POST" &&
        request.path === "/api/library/items/gita-1-1/complete-learning"
      ) {
        completionRequests.push(request);
        completedLearning = true;
      }

      return learningApi(request, { remainingLearningShlokas: [] });
    });
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    expect(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Библиотека" }));
    await user.click(
      await screen.findByRole("tab", { name: "Буду учить" }),
    );
    const learningCard = await screen.findByRole("article", {
      name: learningShloka.displayTitle,
    });
    await user.click(within(learningCard).getByRole("button", { name: "Учить" }));

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionRequests).toHaveLength(1);
    expect(completionRequests[0]?.body).toEqual({
      timeZone: expect.any(String),
    });
    expect(
      screen.getByRole("button", { name: "Выучить еще" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "На дашборд" }));

    await expectPath(routePaths.dashboard);
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
    const streakLink = screen.getByRole("link", {
      name: "Открыть страницу серии дней: 1 день подряд",
    });
    expect(streakLink).toBeInTheDocument();

    await user.click(streakLink);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Подряд" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1 день подряд")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ты в ударе! Возвращайся завтра, чтобы продолжить серию.",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    {
      expectedPath: routePaths.library,
      expectedTab: "learning",
      label: "opens the to-learn selection when several shlokas remain",
      remaining: [secondLearningShloka, thirdLearningShloka],
    },
    {
      expectedPath: "/library/shlokas/gita-4-7/learn",
      expectedTitle: secondLearningShloka.displayTitle,
      label: "opens the only remaining shloka directly",
      remaining: [secondLearningShloka],
    },
    {
      expectedPath: routePaths.library,
      expectedTab: "all",
      label: "opens all shlokas when none remain",
      remaining: [],
    },
  ])("$label", async ({ expectedPath, expectedTab, expectedTitle, remaining }) => {
    const user = userEvent.setup();
    mockApi((request) =>
      learningApi(request, {
        libraryShlokas: remaining,
        remainingLearningShlokas: remaining,
      }),
    );
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Выучить еще" }),
    );

    await expectPath(expectedPath);
    if (expectedTab) {
      expect(window.location.search).toBe(`?tab=${expectedTab}`);
      expect(
        await screen.findByRole("tab", {
          name: expectedTab === "learning" ? "Буду учить" : "Все",
        }),
      ).toHaveAttribute("aria-selected", "true");
    }
    if (expectedTitle) {
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: expectedTitle,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    }
  });
});

function learningApi(
  request: MockApiRequest,
  options: {
    dashboardLearningShlokas?: ApiTypes.LibraryShlokaDto[];
    libraryShlokas?: ApiTypes.LibraryShlokaDto[];
    remainingLearningShlokas?: ApiTypes.LibraryShlokaDto[];
  } = {},
): MockApiResponse {
  if (isSessionRequest(request)) {
    return { status: 200, body: session };
  }
  if (request.method === "GET" && request.path === "/api/library") {
    return {
      status: 200,
      body: library(options.libraryShlokas ?? [learningShloka]),
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/review-shlokas"
  ) {
    return {
      status: 200,
      body: {
        hasReviewingShlokas: false,
        items: [],
        remainingCount: 0,
        state: "empty",
      } satisfies ApiTypes.DashboardReviewShlokaListDto,
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/learning-shlokas"
  ) {
    const items = options.dashboardLearningShlokas ?? [];

    return {
      status: 200,
      body: {
        hasLearningShlokas: items.length > 0,
        items,
        remainingCount: 0,
      } satisfies ApiTypes.DashboardLearningShlokaListDto,
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/streak"
  ) {
    return {
      status: 200,
      body: streak(true),
    };
  }

  const itemMatch = request.path.match(/^\/api\/library\/items\/([^/]+)$/);
  if (request.method === "GET" && itemMatch) {
    const code = decodeURIComponent(itemMatch[1] ?? "");
    const item = [
      learningShloka,
      secondLearningShloka,
      thirdLearningShloka,
    ].find((candidate) => candidate.code === code);

    if (item) {
      return { status: 200, body: item };
    }
  }
  if (
    request.method === "POST" &&
    request.path === "/api/library/items/gita-1-1/complete-learning"
  ) {
    return {
      status: 200,
      body: {
        remainingLearningShlokas:
          options.remainingLearningShlokas ?? [],
        shloka: { ...learningShloka, personalStatus: "reviewing" },
      } satisfies ApiTypes.CompleteLearningDto,
    };
  }

  throw unhandled(request);
}

function streak(continuedToday: boolean): ApiTypes.DashboardStreakDto {
  return {
    continuedToday,
    days: continuedToday ? 1 : 0,
    history: [
      { hasActivity: false, userDay: "2026-07-08" },
      { hasActivity: false, userDay: "2026-07-09" },
      { hasActivity: false, userDay: "2026-07-10" },
      { hasActivity: false, userDay: "2026-07-11" },
      { hasActivity: continuedToday, userDay: "2026-07-12" },
    ],
  };
}

function library(
  allShlokas: ApiTypes.LibraryShlokaDto[],
): ApiTypes.LibraryResponseDto {
  return {
    allShlokas,
    defaultTab: "reviewing",
    tabs: [
      {
        emptyDescription: "Добавьте первую шлоку из общей библиотеки.",
        emptyTitle: "Пока нет шлок в повторении",
        id: "reviewing",
        label: "Повторяю",
      },
      {
        emptyDescription: "Выберите шлоку из общего списка.",
        emptyTitle: "Пока нет шлок для заучивания",
        id: "learning",
        label: "Буду учить",
      },
      {
        emptyDescription: "Опубликованные шлоки появятся здесь.",
        emptyTitle: "Библиотека пока пуста",
        id: "all",
        label: "Все",
      },
    ],
  };
}

function shloka(
  overrides: Partial<ApiTypes.LibraryShlokaDto> = {},
): ApiTypes.LibraryShlokaDto {
  return {
    code: "shloka-1",
    displayTitle: "Шлока 1",
    number: "1",
    personalStatus: "learning",
    sourceTitle: "Источник",
    text: "первая строка\nвторая строка\nтретья строка\nчетвертая строка",
    ...overrides,
  };
}

function isSessionRequest({ method, path }: MockApiRequest): boolean {
  return method === "GET" && path === "/api/auth/session";
}

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function unhandled({ method, path }: MockApiRequest): Error {
  return new Error(`Unhandled test API request: ${method} ${path}`);
}
