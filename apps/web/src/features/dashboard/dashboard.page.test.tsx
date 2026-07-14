import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { routePaths, routeSegments } from "@/shared/model/routes";
import {
  expectPath,
  mockApi,
  renderWithTestProviders,
  type MockApiResponse,
} from "@/shared/test/harness";

import { DashboardPage } from "./dashboard.page";

const reviewItems = dashboardShlokas("Повторение", 8);
const learningItems = dashboardShlokas("Заучивание", 5);

describe("dashboard page", () => {
  it("shows the loading state while an initial list request is pending", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard/review-shlokas") {
        return new Promise<MockApiResponse>(() => undefined);
      }
      if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
        return { status: 200, body: learningList([]) };
      }
      if (method === "GET" && path === "/api/dashboard/streak") {
        return { status: 200, body: streak() };
      }

      throw unhandled(method, path);
    });

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Дашборд" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Загрузка...")).toBeInTheDocument();
  });

  it("shows an initial list error without making real network calls", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard/review-shlokas") {
        return {
          status: 500,
          body: {
            code: "DASHBOARD_UNAVAILABLE",
            message: "Дашборд временно недоступен",
          },
        };
      }
      if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
        return { status: 200, body: learningList([]) };
      }
      if (method === "GET" && path === "/api/dashboard/streak") {
        return { status: 200, body: streak() };
      }

      throw unhandled(method, path);
    });

    renderDashboard();

    expect(
      await screen.findByText("Дашборд временно недоступен"),
    ).toBeInTheDocument();
    expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
  });

  it("shows the new-user empty state and opens the shared library", async () => {
    const user = userEvent.setup();
    mockDashboardLists(reviewList([]), learningList([]));

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Выучите шлоки" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Повторите шлоки")).not.toBeInTheDocument();
    expect(screen.getByText("У вас нет шлок для заучивания")).toBeInTheDocument();
    expect(
      screen.getByText("Добавьте шлоки для заучивания из библиотеки."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /дней подряд/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Добавить" }));

    await expectPath(routePaths.library);
    expect(
      screen.getByRole("heading", { name: "Общая библиотека" }),
    ).toBeInTheDocument();
  });

  it("opens the learning flow when a to-learn shloka is selected", async () => {
    const user = userEvent.setup();
    const learningShloka = learningItems[0]!;
    mockDashboardLists(reviewList([]), learningList([learningShloka]));

    renderDashboard();

    const card = await screen.findByRole("article", {
      name: learningShloka.displayTitle,
    });
    expect(
      within(card).queryByText("первая строка 1"),
    ).not.toBeInTheDocument();
    await user.click(
      within(card).getByRole("link", {
        name: learningShloka.displayTitle,
      }),
    );

    await expectPath(
      `/library/shlokas/${encodeURIComponent(learningShloka.code)}/learn`,
    );
    expect(
      screen.getByRole("heading", { name: "Заучивание шлоки" }),
    ).toBeInTheDocument();
  });

  it.each([
    {
      continuedToday: false,
      stateLabel: "Серия ожидает продолжения сегодня",
    },
    {
      continuedToday: true,
      stateLabel: "Серия продолжена сегодня",
    },
  ])("shows a non-zero streak when $stateLabel", async ({
    continuedToday,
    stateLabel,
  }) => {
    mockDashboardLists(
      reviewList(reviewItems.slice(0, 1)),
      learningList([]),
      streak({ continuedToday, days: 7 }),
    );

    renderDashboard();

    expect(
      await screen.findByRole("status", {
        name: `7 дней подряд. ${stateLabel}`,
      }),
    ).toBeInTheDocument();
  });

  it("requests initial limits and expands both authoritative lists in place", async () => {
    const user = userEvent.setup();
    let reviewRequestCount = 0;
    let learningRequestCount = 0;
    const fetchMock = mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard/review-shlokas") {
        reviewRequestCount += 1;
        return {
          status: 200,
          body:
            reviewRequestCount === 1
              ? reviewList(reviewItems.slice(0, 5), 3)
              : reviewList(reviewItems),
        };
      }
      if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
        learningRequestCount += 1;
        return {
          status: 200,
          body:
            learningRequestCount === 1
              ? learningList(learningItems.slice(0, 3), 2)
              : learningList(learningItems),
        };
      }
      if (method === "GET" && path === "/api/dashboard/streak") {
        return { status: 200, body: streak() };
      }

      throw unhandled(method, path);
    });

    renderDashboard();

    await screen.findByRole("heading", { name: "Повторите шлоки" });
    const reviewSection = sectionNamed("Повторите шлоки");
    const learningSection = sectionNamed("Выучите шлоки");
    expect(within(reviewSection).getAllByRole("article")).toHaveLength(5);
    expect(within(learningSection).getAllByRole("article")).toHaveLength(3);
    const firstReviewCard = within(reviewSection).getByRole("article", {
      name: reviewItems[0]!.displayTitle,
    });

    const initialReviewUrl = requestedUrls(fetchMock).find(
      (url) =>
        url.includes("/api/dashboard/review-shlokas") &&
        new URL(url, window.location.origin).searchParams.has("limit"),
    );
    const initialLearningUrl = requestedUrls(fetchMock).find(
      (url) =>
        url.includes("/api/dashboard/learning-shlokas") &&
        new URL(url, window.location.origin).searchParams.has("limit"),
    );
    expect(new URL(initialReviewUrl ?? "", window.location.origin).searchParams.get("limit")).toBe("5");
    expect(new URL(initialReviewUrl ?? "", window.location.origin).searchParams.get("timeZone")).not.toBe("");
    expect(new URL(initialLearningUrl ?? "", window.location.origin).searchParams.get("limit")).toBe("3");

    await user.click(
      within(reviewSection).getByRole("button", { name: "Показать еще 3" }),
    );

    expect(
      await within(reviewSection).findByRole("article", {
        name: reviewItems[7]!.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(within(reviewSection).getAllByRole("article")).toHaveLength(8);
    expect(
      within(reviewSection).getByRole("article", {
        name: reviewItems[0]!.displayTitle,
      }),
    ).toBe(firstReviewCard);
    expect(
      within(reviewSection).queryByRole("button", { name: /Показать еще/ }),
    ).not.toBeInTheDocument();

    await user.click(
      within(learningSection).getByRole("button", { name: "Показать все" }),
    );

    expect(
      await within(learningSection).findByRole("article", {
        name: learningItems[4]!.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(within(learningSection).getAllByRole("article")).toHaveLength(5);
    expect(
      within(learningSection).queryByRole("button", { name: "Показать все" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/приоритет|не смог вспомнить|5 дней/i)).not.toBeInTheDocument();

    const fullReviewUrl = requestedUrls(fetchMock).find((url) => {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname === "/api/dashboard/review-shlokas" && !parsed.searchParams.has("limit");
    });
    const fullLearningUrl = requestedUrls(fetchMock).find((url) => {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname === "/api/dashboard/learning-shlokas" && !parsed.searchParams.has("limit");
    });
    expect(fullReviewUrl).toBeDefined();
    expect(fullLearningUrl).toBeDefined();
  });

  it("keeps current cards visible and disables the action during silent expansion", async () => {
    const user = userEvent.setup();
    let reviewRequestCount = 0;
    let resolveFullReview: ((response: MockApiResponse) => void) | undefined;
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard/review-shlokas") {
        reviewRequestCount += 1;
        if (reviewRequestCount === 1) {
          return {
            status: 200,
            body: reviewList(reviewItems.slice(0, 5), 3),
          };
        }

        return new Promise<MockApiResponse>((resolve) => {
          resolveFullReview = resolve;
        });
      }
      if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
        return { status: 200, body: learningList(learningItems.slice(0, 3)) };
      }
      if (method === "GET" && path === "/api/dashboard/streak") {
        return { status: 200, body: streak() };
      }

      throw unhandled(method, path);
    });
    renderDashboard();
    await screen.findByRole("heading", { name: "Повторите шлоки" });
    const reviewSection = sectionNamed("Повторите шлоки");
    const expand = within(reviewSection).getByRole("button", {
      name: "Показать еще 3",
    });

    await user.click(expand);

    expect(expand).toBeDisabled();
    expect(within(reviewSection).getAllByRole("article")).toHaveLength(5);
    expect(screen.queryByText("Загрузка...")).not.toBeInTheDocument();

    resolveFullReview?.({ status: 200, body: reviewList(reviewItems) });

    expect(
      await within(reviewSection).findByRole("article", {
        name: reviewItems[7]!.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(within(reviewSection).getAllByRole("article")).toHaveLength(8);
  });

  it("shows the review empty state when only learning shlokas exist", async () => {
    mockDashboardLists(
      reviewList([], 0, { hasReviewingShlokas: false, state: "empty" }),
      learningList(learningItems.slice(0, 1)),
    );

    renderDashboard();

    expect(
      await screen.findByText("Нет шлок для повторения"),
    ).toBeInTheDocument();
    expect(screen.getByText("На сегодня повторений нет.")).toBeInTheDocument();
  });

  it("shows the inline completion state and the learning empty state", async () => {
    mockDashboardLists(
      reviewList([], 0, { hasReviewingShlokas: true, state: "completed" }),
      learningList([]),
    );

    renderDashboard();

    expect(
      await screen.findByText("Все повторения на сегодня завершены"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Если есть время, выберите шлоку из списка «Буду учить»."),
    ).toBeInTheDocument();
    expect(screen.getByText("У вас нет шлок для заучивания")).toBeInTheDocument();
  });
});

function mockDashboardLists(
  review: ApiTypes.DashboardReviewShlokaListDto,
  learning: ApiTypes.DashboardLearningShlokaListDto,
  currentStreak: ApiTypes.DashboardStreakDto = streak(),
) {
  return mockApi(({ method, path }) => {
    if (method === "GET" && path === "/api/dashboard/review-shlokas") {
      return { status: 200, body: review };
    }
    if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
      return { status: 200, body: learning };
    }
    if (method === "GET" && path === "/api/dashboard/streak") {
      return { status: 200, body: currentStreak };
    }

    throw unhandled(method, path);
  });
}

function streak(
  overrides: Partial<ApiTypes.DashboardStreakDto> = {},
): ApiTypes.DashboardStreakDto {
  return {
    continuedToday: false,
    days: 0,
    ...overrides,
  };
}

function reviewList(
  items: ApiTypes.DashboardShlokaDto[],
  remainingCount = 0,
  overrides: Partial<ApiTypes.DashboardReviewShlokaListDto> = {},
): ApiTypes.DashboardReviewShlokaListDto {
  return {
    hasReviewingShlokas: items.length > 0,
    items,
    remainingCount,
    state: items.length > 0 ? "active" : "empty",
    ...overrides,
  };
}

function learningList(
  items: ApiTypes.DashboardShlokaDto[],
  remainingCount = 0,
): ApiTypes.DashboardLearningShlokaListDto {
  return {
    hasLearningShlokas: items.length > 0,
    items,
    remainingCount,
  };
}

function dashboardShlokas(
  titlePrefix: string,
  count: number,
): ApiTypes.DashboardShlokaDto[] {
  return Array.from({ length: count }, (_, index) => ({
    code: `${titlePrefix.toLowerCase()}-${index + 1}`,
    displayTitle: `${titlePrefix} ${index + 1}`,
    text: `первая строка ${index + 1}\nвторая строка ${index + 1}`,
  }));
}

function sectionNamed(name: string): HTMLElement {
  const section = screen.getByRole("heading", { name }).closest("section");
  if (!section) {
    throw new Error(`Section not found: ${name}`);
  }

  return section;
}

function requestedUrls(fetchMock: ReturnType<typeof mockApi>): string[] {
  return fetchMock.mock.calls.map(([input]) =>
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
}

function unhandled(method: string, path: string): Error {
  return new Error(`Unhandled test API request: ${method} ${path}`);
}

function renderDashboard() {
  window.history.pushState({}, "", routePaths.dashboard);
  const router = createDashboardTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createDashboardTestRouter() {
  const rootRoute = createRootRoute({ component: Outlet });
  const dashboardRoute = createRoute({
    component: DashboardPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.dashboard,
  });
  const libraryRoute = createRoute({
    component: LibraryStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.library,
  });
  const shlokaRoute = createRoute({
    component: ShlokaStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.libraryShloka,
  });
  const learnShlokaRoute = createRoute({
    component: LearnShlokaStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.learnShloka,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      dashboardRoute,
      learnShlokaRoute,
      libraryRoute,
      shlokaRoute,
    ]),
  });
}

function LibraryStub() {
  return <h1>Общая библиотека</h1>;
}

function ShlokaStub() {
  return <h1>Шлока</h1>;
}

function LearnShlokaStub() {
  return <h1>Заучивание шлоки</h1>;
}
