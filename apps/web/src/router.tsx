import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import type { AuthContextValue } from "@/auth/auth-context";
import { AdminPage, AdminShlokaEditPage, AdminShlokaPage, AdminSourceEditPage, AdminSourcePage } from "@/pages/admin-pages";
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

const adminRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.auth);
  },
  component: AdminPage,
  getParentRoute: () => rootRoute,
  path: "admin",
});

const adminSourceRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.auth);
  },
  component: AdminSourcePage,
  getParentRoute: () => rootRoute,
  path: "admin/sources/new",
});

const adminSourceEditRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.auth);
  },
  component: AdminSourceEditRoute,
  getParentRoute: () => rootRoute,
  path: "admin/sources/$sourceCode/edit",
});

const adminShlokaRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.auth);
  },
  component: AdminShlokaPage,
  getParentRoute: () => rootRoute,
  path: "admin/shlokas/new",
});

const adminShlokaEditRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.auth);
  },
  component: AdminShlokaEditRoute,
  getParentRoute: () => rootRoute,
  path: "admin/shlokas/$shlokaCode/edit",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  libraryRoute,
  adminRoute,
  adminSourceRoute,
  adminSourceEditRoute,
  adminShlokaRoute,
  adminShlokaEditRoute,
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

function AdminSourceEditRoute() {
  const { sourceCode } = adminSourceEditRoute.useParams();
  return <AdminSourceEditPage sourceCode={sourceCode} />;
}

function AdminShlokaEditRoute() {
  const { shlokaCode } = adminShlokaEditRoute.useParams();
  return <AdminShlokaEditPage shlokaCode={shlokaCode} />;
}

function requireAdmin(auth: AuthContextValue): void {
  if (!auth.hasSession) {
    throw redirect({ to: "/login" });
  }

  if (!auth.account?.roles.includes("admin")) {
    throw redirect({ to: "/dashboard" });
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
