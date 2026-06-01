import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import type { AuthContextValue } from "@/auth/auth-context";
import { DashboardPage } from "@/pages/dashboard-page";
import { LibraryPage } from "@/pages/library-page";
import { LoginPage, RegisterPage } from "@/pages/auth-pages";

interface RouterContext {
  auth: AuthContextValue;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
});

const indexRoute = createRoute({
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.auth.hasSession ? "/dashboard" : "/login" });
  },
  getParentRoute: () => rootRoute,
  path: "/",
});

const loginRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (context.auth.hasSession) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: "login",
});

const registerRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (context.auth.hasSession) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterPage,
  getParentRoute: () => rootRoute,
  path: "register",
});

const dashboardRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.auth.hasSession) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
  getParentRoute: () => rootRoute,
  path: "dashboard",
});

const libraryRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.auth.hasSession) {
      throw redirect({ to: "/login" });
    }
  },
  component: LibraryPage,
  getParentRoute: () => rootRoute,
  path: "library",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  libraryRoute,
]);

export function createAppRouter() {
  return createRouter({
    context: {
      auth: undefined as unknown as AuthContextValue,
    },
    routeTree,
  });
}

export const router = createAppRouter();

function RootRoute() {
  return <Outlet />;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
