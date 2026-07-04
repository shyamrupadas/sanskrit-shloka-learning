import { Outlet, RouterProvider, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { routePaths, routeSegments } from "@/shared/model/routes";
import { useSession, type SessionContextValue } from "@/shared/session";
import {
  expectPath,
  mockApi,
  renderWithTestProviders,
  session,
  successfulAuthApi,
} from "@/shared/test/harness";

import { LoginPage } from "./login.page";
import { RegisterPage } from "./register.page";

describe("auth pages", () => {
  it("validates registration password fields before calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(successfulAuthApi);

    renderAuthAt(routePaths.register);

    await user.type(await screen.findByLabelText("Email"), "learner@example.com");
    await user.type(screen.getByLabelText("Пароль", { selector: "input" }), "123");
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "123",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Пароль должен быть не короче 6 символов",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Пароль", { selector: "input" }));
    await user.clear(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
    );
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "different-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    expect(
      await screen.findByText("Пароль и подтверждение должны совпадать"),
    ).toHaveAttribute("role", "alert");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generic login error for invalid credentials", async () => {
    const user = userEvent.setup();
    mockApi(({ method, path }) => {
      if (method === "POST" && path === "/api/auth/login") {
        return {
          status: 401,
          body: {
            code: "INVALID_CREDENTIALS",
            message: "Неверный email или пароль",
          },
        };
      }

      return successfulAuthApi({ method, path });
    });

    renderAuthAt(routePaths.login);

    await user.type(await screen.findByLabelText("Email"), "learner@example.com");
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "wrong-password",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Неверный email или пароль",
    );
    expect(window.location.pathname).toBe(routePaths.login);
  });

  it("toggles the login password field visibility", async () => {
    const user = userEvent.setup();
    mockApi(successfulAuthApi);

    renderAuthAt(routePaths.login);

    const password = (await screen.findByLabelText("Пароль", {
      selector: "input",
    })) as HTMLInputElement;

    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(password.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(password.type).toBe("password");
  });

  it("toggles the register password and confirmation fields together", async () => {
    const user = userEvent.setup();
    mockApi(successfulAuthApi);

    renderAuthAt(routePaths.register);

    const password = (await screen.findByLabelText("Пароль", {
      selector: "input",
    })) as HTMLInputElement;
    const passwordConfirmation = screen.getByLabelText("Подтверждение пароля", {
      selector: "input",
    }) as HTMLInputElement;

    expect(password.type).toBe("password");
    expect(passwordConfirmation.type).toBe("password");

    await user.click(screen.getByRole("button", { name: "Показать пароль" }));

    expect(password.type).toBe("text");
    expect(passwordConfirmation.type).toBe("text");
  });

  it("navigates from successful registration to the authenticated route", async () => {
    const user = userEvent.setup();
    mockApi(successfulAuthApi);

    renderAuthAt(routePaths.register);

    await user.type(await screen.findByLabelText("Email"), session.account.email);
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "correct-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    await expectPath(routePaths.dashboard);
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("navigates from successful login to the authenticated route", async () => {
    const user = userEvent.setup();
    mockApi(successfulAuthApi);

    renderAuthAt(routePaths.login);

    await user.type(await screen.findByLabelText("Email"), session.account.email);
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await expectPath(routePaths.dashboard);
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});

function renderAuthAt(path: string) {
  window.history.pushState({}, "", path);
  const router = createAuthTestRouter();

  return renderWithTestProviders(<AuthTestRouter router={router} />);
}

type AuthTestRouterInstance = ReturnType<typeof createAuthTestRouter>;

function AuthTestRouter({ router }: { router: AuthTestRouterInstance }) {
  const sessionContext = useSession();

  return <RouterProvider router={router} context={{ session: sessionContext }} />;
}

function createAuthTestRouter() {
  const rootRoute = createRootRouteWithContext<{
    session: SessionContextValue;
  }>()({
    component: Outlet,
  });
  const loginRoute = createRoute({
    component: LoginPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.login,
  });
  const registerRoute = createRoute({
    component: RegisterPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.register,
  });
  const dashboardRoute = createRoute({
    component: DashboardStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.dashboard,
  });

  return createRouter({
    context: {
      session: undefined as unknown as SessionContextValue,
    },
    routeTree: rootRoute.addChildren([loginRoute, registerRoute, dashboardRoute]),
  });
}

function DashboardStub() {
  return <h1>Dashboard</h1>;
}
