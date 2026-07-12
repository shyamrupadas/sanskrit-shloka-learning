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
  adminSession,
  expectPath,
  expectStoredSessionCleared,
  mockApi,
  renderWithTestProviders,
  session,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

import { SettingsPage } from "./settings.page";

describe("settings page", () => {
  it("loads and saves hard mode for a regular account", async () => {
    const user = userEvent.setup();
    let hardMode = false;
    let updateBody: unknown;
    const fetchMock = mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/account/settings") {
        return { status: 200, body: { hardMode } };
      }

      if (
        request.method === "PATCH" &&
        request.path === "/api/account/settings"
      ) {
        updateBody = request.body;
        hardMode = (
          request.body as ApiTypes.UpdateAccountSettingsRequest
        ).hardMode;
        return { status: 200, body: { hardMode } };
      }

      return successfulSettingsApi(request);
    });
    storeTestSession(session);

    const settingsView = renderSettings();

    expect(await screen.findByText(session.account.email)).toBeInTheDocument();
    const hardModeToggle = await screen.findByRole("switch", {
      name: "Интенсивный режим повторения",
    });
    expect(hardModeToggle).not.toBeChecked();
    expect(screen.queryByText("Транслитерация")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Админка" }),
    ).not.toBeInTheDocument();

    await user.click(hardModeToggle);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Настройка сохранена",
    );
    expect(hardModeToggle).toBeChecked();
    expect(updateBody).toEqual({ hardMode: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/settings",
      expect.objectContaining({ method: "PATCH" }),
    );

    settingsView.unmount();
    renderSettings();

    expect(
      await screen.findByRole("switch", {
        name: "Интенсивный режим повторения",
      }),
    ).toBeChecked();
  });

  it("preserves the pending value and shows a save error", async () => {
    const user = userEvent.setup();
    let resolveUpdate!: (response: MockApiResponse) => void;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/account/settings") {
        return { status: 200, body: { hardMode: false } };
      }

      if (
        request.method === "PATCH" &&
        request.path === "/api/account/settings"
      ) {
        return new Promise<MockApiResponse>((resolve) => {
          resolveUpdate = resolve;
        });
      }

      return successfulSettingsApi(request);
    });
    storeTestSession(session);
    renderSettings();

    const hardModeToggle = await screen.findByRole("switch", {
      name: "Интенсивный режим повторения",
    });
    await user.click(hardModeToggle);

    expect(hardModeToggle).toBeChecked();
    expect(hardModeToggle).toBeDisabled();

    resolveUpdate({
      status: 500,
      body: {
        code: "SETTINGS_UNAVAILABLE",
        message: "Настройки временно недоступны",
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Настройки временно недоступны",
    );
    expect(hardModeToggle).not.toBeChecked();
    expect(hardModeToggle).toBeEnabled();
  });

  it("shows the admin action only to an admin account", async () => {
    const user = userEvent.setup();
    mockApi(successfulSettingsApi);
    storeTestSession(adminSession);
    renderSettings();

    expect(
      await screen.findByText(adminSession.account.email),
    ).toBeInTheDocument();
    const adminAction = screen.getByRole("link", { name: "Админка" });
    expect(adminAction).toHaveAttribute("href", routePaths.admin);

    await user.click(adminAction);

    await expectPath(routePaths.admin);
    expect(
      screen.getByRole("heading", { name: "Admin catalog" }),
    ).toBeInTheDocument();
  });

  it("logs out, clears the session, and opens the login route", async () => {
    const user = userEvent.setup();
    mockApi(successfulSettingsApi);
    storeTestSession(session);
    renderSettings();

    expect(await screen.findByText(session.account.email)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Выйти" }));

    await expectPath(routePaths.login);
    expectStoredSessionCleared();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});

function renderSettings() {
  window.history.pushState({}, "", routePaths.settings);
  const router = createSettingsTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createSettingsTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const settingsRoute = createRoute({
    component: SettingsPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.settings,
  });
  const adminRoute = createRoute({
    component: AdminStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.admin,
  });
  const loginRoute = createRoute({
    component: LoginStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.login,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([settingsRoute, adminRoute, loginRoute]),
  });
}

function AdminStub() {
  return <h1>Admin catalog</h1>;
}

function LoginStub() {
  return <h1>Login</h1>;
}

function successfulSettingsApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
  if (method === "GET" && path === "/api/account/settings") {
    return { status: 200, body: { hardMode: false } };
  }

  if (method === "POST" && path === "/api/auth/logout") {
    return { status: 204 };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}
