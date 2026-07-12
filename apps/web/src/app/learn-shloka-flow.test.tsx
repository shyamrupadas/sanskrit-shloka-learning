import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { App } from "@/app/App";
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
  it("shows the accepted title-and-four-lines skeleton without bottom navigation", async () => {
    mockApi((request) => {
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
  });

  it("opens from the to-learn card and returns there without a completion request", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request, {
        libraryShlokas: [learningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt("/library?tab=learning");

    const card = await screen.findByRole("article", {
      name: learningShloka.displayTitle,
    });
    await user.click(within(card).getByRole("button", { name: "Учить" }));

    await expectPath("/library/shlokas/gita-1-1/learn");
    expect(
      await screen.findByRole("heading", {
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре\s+самавета юютсавах\s+мамаках пандавашчаива\s+кимакурвата санджая/,
    );
    expect(
      screen.getByRole("link", { name: "Советы по заучиванию" }),
    ).toHaveAttribute("href", routePaths.learning);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Не выучил" }));

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=learning");
    expect(
      await screen.findByRole("tab", { name: "Буду учить" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      requests.some(
        ({ method, path }) =>
          method === "POST" && path.endsWith("/complete-learning"),
      ),
    ).toBe(false);
  });

  it("completes learning and offers the dashboard action", async () => {
    const user = userEvent.setup();
    const completionRequests: MockApiRequest[] = [];
    mockApi((request) => {
      if (
        request.method === "POST" &&
        request.path === "/api/library/items/gita-1-1/complete-learning"
      ) {
        completionRequests.push(request);
      }

      return learningApi(request, { remainingLearningShlokas: [] });
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionRequests).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Выучить еще" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "На дашборд" }));

    await expectPath(routePaths.dashboard);
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
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
        await screen.findByRole("heading", { name: expectedTitle }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    }
  });
});

function learningApi(
  request: MockApiRequest,
  options: {
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
  if (request.method === "GET" && request.path === "/api/dashboard") {
    return {
      status: 200,
      body: {
        hasPersonalShlokas: false,
        primaryAction: { label: "Добавить", target: routePaths.library },
        showReviewBlock: false,
        showStreak: false,
      } satisfies ApiTypes.EmptyDashboardDto,
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
