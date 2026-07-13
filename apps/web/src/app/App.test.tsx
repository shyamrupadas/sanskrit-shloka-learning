import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import {
  expectPath,
  expectStoredSessionCleared,
  mockApi,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

import { App } from "./App";

const session = {
  account: {
    id: "account-1",
    email: "learner@example.com",
    roles: [],
  },
  accessToken: "access-token-1",
} satisfies ApiTypes.AuthSessionDto;

const adminSession = {
  account: {
    id: "account-2",
    email: "admin@example.com",
    roles: ["admin"],
  },
  accessToken: "access-token-2",
} satisfies ApiTypes.AuthSessionDto;

const emptyDashboard = {
  hasPersonalShlokas: false,
  showStreak: false,
  showReviewBlock: false,
  primaryAction: {
    label: "Добавить",
    target: "/library",
  },
} satisfies ApiTypes.EmptyDashboardDto;

const emptyDashboardReviewList = {
  hasReviewingShlokas: false,
  items: [],
  remainingCount: 0,
  state: "empty",
} satisfies ApiTypes.DashboardReviewShlokaListDto;

const emptyDashboardLearningList = {
  hasLearningShlokas: false,
  items: [],
  remainingCount: 0,
} satisfies ApiTypes.DashboardLearningShlokaListDto;

const defaultSettings = {
  hardMode: false,
} satisfies ApiTypes.AccountSettingsDto;

const emptyLibrary = {
  defaultTab: "reviewing",
  allShlokas: [],
  tabs: [
    {
      id: "reviewing",
      label: "Повторяю",
      emptyTitle: "Пока нет шлок в повторении",
      emptyDescription:
        "Добавьте первую шлоку из общей библиотеки, чтобы начать повторение.",
    },
    {
      id: "learning",
      label: "Буду учить",
      emptyTitle: "Пока нет шлок для заучивания",
      emptyDescription:
        "Выберите шлоку из общего списка и добавьте ее в личную библиотеку.",
    },
    {
      id: "all",
      label: "Все",
      emptyTitle: "Библиотека пока пуста",
      emptyDescription:
        "Опубликованные шлоки появятся здесь после наполнения каталога.",
    },
  ],
} satisfies ApiTypes.LibraryResponseDto;

const shlokaDetail = {
  code: "gita-chapter-2-2-47",
  displayTitle: "Бхагавад-гита, Глава 2 2.47",
  sourceTitle: "Бхагавад-гита",
  number: "2.47",
  text: "карманй эвадхикарас те\nма пхалешу кадачана\nма кармапхалахетур бхур\nма те санго сту акармани",
  personalStatus: "learning",
  fullTranslation: "Только на действие у тебя право.",
} satisfies ApiTypes.LibraryShlokaDto;

describe("App auth and empty shell", () => {
  it("redirects the root route by session state", async () => {
    mockApi(successfulApi);

    const unauthenticatedView = renderAppAt("/");

    await expectPath("/login");

    unauthenticatedView.unmount();
    storeTestSession(session);

    renderAppAt("/");

    await expectPath("/dashboard");
    const navigation = await screen.findByRole("navigation");
    expect(
      within(navigation).getByRole("link", { name: "Дашборд" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each(["/login", "/register"])(
    "redirects authenticated auth route %s to the dashboard",
    async (path) => {
      mockApi(successfulApi);
      storeTestSession(session);

      renderAppAt(path);

      await expectPath("/dashboard");
      const navigation = await screen.findByRole("navigation");
      expect(
        within(navigation).getByRole("link", { name: "Дашборд" }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  it("navigates between the product sections", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);
    storeTestSession(session);

    renderAppAt("/dashboard");

    const navigation = await screen.findByRole("navigation", {
      name: "Основная навигация",
    });
    const dashboardLink = within(navigation).getByRole("link", {
      name: "Дашборд",
    });
    const libraryLink = within(navigation).getByRole("link", {
      name: "Библиотека",
    });
    const learningLink = within(navigation).getByRole("link", {
      name: "Обучение",
    });
    const settingsLink = within(navigation).getByRole("link", {
      name: "Настройки",
    });

    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(libraryLink).toHaveAttribute("href", "/library");
    expect(learningLink).toHaveAttribute("href", "/learning");
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(within(navigation).getAllByRole("link")).toHaveLength(4);
    expectActiveNavigationLink(navigation, dashboardLink);

    await user.click(learningLink);
    await expectPath("/learning");
    const learningNavigation = await screen.findByRole("navigation", {
      name: "Основная навигация",
    });
    const currentLibraryLink = within(learningNavigation).getByRole("link", {
      name: "Библиотека",
    });
    expectActiveNavigationLink(
      learningNavigation,
      within(learningNavigation).getByRole("link", { name: "Обучение" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Советы" }),
    ).toBeInTheDocument();

    await user.click(currentLibraryLink);
    await expectPath("/library");
    await screen.findByRole("heading", { name: "Библиотека" });
    const libraryNavigation = screen.getByRole("navigation", {
      name: "Основная навигация",
    });
    expectActiveNavigationLink(
      libraryNavigation,
      within(libraryNavigation).getByRole("link", { name: "Библиотека" }),
    );

    await user.click(
      within(libraryNavigation).getByRole("link", { name: "Настройки" }),
    );
    await expectPath("/settings");
    await screen.findByRole("heading", { name: "Настройки" });
    const settingsNavigation = screen.getByRole("navigation", {
      name: "Основная навигация",
    });
    expectActiveNavigationLink(
      settingsNavigation,
      within(settingsNavigation).getByRole("link", { name: "Настройки" }),
    );

    await user.click(
      within(settingsNavigation).getByRole("link", { name: "Дашборд" }),
    );
    await expectPath("/dashboard");
    const dashboardNavigation = await screen.findByRole("navigation", {
      name: "Основная навигация",
    });
    expectActiveNavigationLink(
      dashboardNavigation,
      within(dashboardNavigation).getByRole("link", { name: "Дашборд" }),
    );
  });

  it("clears an invalid saved session and redirects to login", async () => {
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return {
          status: 401,
          body: { code: "UNAUTHORIZED", message: "Сессия недействительна" },
        };
      }

      return successfulApi(request);
    });
    storeTestSession(session);

    renderAppAt("/dashboard");

    await expectPath("/login");
    expectStoredSessionCleared();
  });

  it.each([
    "/dashboard",
    "/library",
    "/library/shlokas/gita-chapter-2-2-47/learn",
    "/library/shlokas/gita-chapter-2-2-47/review",
    "/learning",
    "/settings",
    "/admin",
  ])(
    "redirects unauthenticated %s visits to login",
    async (path) => {
      mockApi(successfulApi);

      renderAppAt(path);

      await expectPath("/login");
    },
  );

  it("opens library routes inside the authenticated layout", async () => {
    mockApi(successfulApi);
    storeTestSession(session);

    const libraryView = renderAppAt("/library");

    const libraryNavigation = await screen.findByRole("navigation");
    expect(
      within(libraryNavigation).getByRole("link", {
        name: "Библиотека",
      }),
    ).toHaveAttribute("aria-current", "page");

    libraryView.unmount();
    renderAppAt("/library/shlokas/gita-chapter-2-2-47");

    const shlokaNavigation = await screen.findByRole("navigation");
    expect(
      within(shlokaNavigation).getByRole("link", {
        name: "Библиотека",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each(["/admin", "/admin/sources/gita/edit", "/admin/shlokas/gita-chapter-2-2-47/edit", "/admin/sources/new"])(
    "redirects regular users away from direct admin route %s",
    async (path) => {
      mockApi(successfulApi);
      storeTestSession(session);

      renderAppAt(path);

      await expectPath("/dashboard");
      const navigation = await screen.findByRole("navigation");
      expect(
        within(navigation).getByRole("link", { name: "Дашборд" }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  it("opens the catalog inside the existing admin guard and layout", async () => {
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/admin/catalog"
      ) {
        return { status: 200, body: { sources: [] } };
      }

      return successfulApi(request);
    });
    storeTestSession(adminSession);

    renderAppAt("/admin");

    await screen.findByRole("main");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function expectActiveNavigationLink(
  navigation: HTMLElement,
  expectedLink: HTMLElement,
) {
  const activeLinks = within(navigation)
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");

  expect(activeLinks).toEqual([expectedLink]);
}

function successfulApi({ method, path }: MockApiRequest): MockApiResponse {
  if (method === "POST" && path === "/api/auth/register") {
    return { status: 201, body: session };
  }

  if (method === "POST" && path === "/api/auth/login") {
    return { status: 200, body: session };
  }

  if (method === "GET" && path === "/api/auth/session") {
    return { status: 200, body: session };
  }

  if (method === "POST" && path === "/api/auth/logout") {
    return { status: 204 };
  }

  if (method === "GET" && path === "/api/dashboard") {
    return { status: 200, body: emptyDashboard };
  }

  if (method === "GET" && path === "/api/dashboard/review-shlokas") {
    return { status: 200, body: emptyDashboardReviewList };
  }

  if (method === "GET" && path === "/api/dashboard/learning-shlokas") {
    return { status: 200, body: emptyDashboardLearningList };
  }

  if (method === "GET" && path === "/api/account/settings") {
    return { status: 200, body: defaultSettings };
  }

  if (method === "PATCH" && path === "/api/account/settings") {
    return { status: 200, body: defaultSettings };
  }

  if (method === "GET" && path === "/api/library") {
    return {
      status: 200,
      body: {
        ...emptyLibrary,
        allShlokas: [
          {
            code: "gita-chapter-2-2-47",
            displayTitle: "Бхагавад-гита, Глава 2 2.47",
            sourceTitle: "Бхагавад-гита",
            number: "2.47",
            text: "карманй эвадхикарас те\nма пхалешу кадачана",
            personalStatus: "available",
          },
        ],
      },
    };
  }

  if (method === "GET" && path === "/api/library/items/gita-chapter-2-2-47") {
    return { status: 200, body: shlokaDetail };
  }

  return {
    status: 404,
    body: {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${path}`,
    },
  };
}
