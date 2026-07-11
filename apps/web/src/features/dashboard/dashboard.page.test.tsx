import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen } from "@testing-library/react";
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

const emptyDashboard = {
  hasPersonalShlokas: false,
  showStreak: false,
  showReviewBlock: false,
  primaryAction: {
    label: "Добавить",
    target: routePaths.library,
  },
} satisfies ApiTypes.EmptyDashboardDto;

describe("dashboard page", () => {
  it("shows the loading state while the dashboard request is pending", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard") {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Дашборд" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Загрузка...")).toBeInTheDocument();
  });

  it("shows the API error state", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard") {
        return {
          status: 500,
          body: {
            code: "DASHBOARD_UNAVAILABLE",
            message: "Дашборд временно недоступен",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });

    renderDashboard();

    expect(
      await screen.findByText("Дашборд временно недоступен"),
    ).toBeInTheDocument();
    expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
  });

  it("shows the empty state and opens the shared library", async () => {
    const user = userEvent.setup();
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/dashboard") {
        return { status: 200, body: emptyDashboard };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Выучите шлоки" }),
    ).toBeInTheDocument();
    expect(screen.getByText("У вас нет шлок для заучивания")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Добавьте шлоки для заучивания из библиотеки.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Добавить" }));

    await expectPath(routePaths.library);
    expect(
      screen.getByRole("heading", { name: "Общая библиотека" }),
    ).toBeInTheDocument();
  });
});

function renderDashboard() {
  window.history.pushState({}, "", routePaths.dashboard);
  const router = createDashboardTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createDashboardTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
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

  return createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute, libraryRoute]),
  });
}

function LibraryStub() {
  return <h1>Общая библиотека</h1>;
}
