import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AdminPage, AdminShlokaEditPage, AdminShlokaPage, AdminSourceEditPage, AdminSourcePage } from "@/pages/admin-pages";
import { DashboardPage } from "@/pages/dashboard-page";
import { LibraryPage, ShlokaPage } from "@/pages/library-page";
import { LoginPage } from "@/features/auth/login.page";
import { RegisterPage } from "@/features/auth/register.page";
import { SettingsPage } from "@/pages/settings-page";
import { routePaths, routeSegments } from "@/shared/model/routes";
import type { SessionContextValue } from "@/shared/session";

interface RouterContext {
  session: SessionContextValue;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
});

const indexRoute = createRoute({
  beforeLoad: ({ context }) => {
    throw redirect({
      to: context.session.hasSession ? routePaths.dashboard : routePaths.login,
    });
  },
  getParentRoute: () => rootRoute,
  path: routeSegments.root,
});

const loginRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (context.session.hasSession) {
      throw redirect({ to: routePaths.dashboard });
    }
  },
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.login,
});

const registerRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (context.session.hasSession) {
      throw redirect({ to: routePaths.dashboard });
    }
  },
  component: RegisterPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.register,
});

const dashboardRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.session.hasSession) {
      throw redirect({ to: routePaths.login });
    }
  },
  component: DashboardPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.dashboard,
});

const libraryRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.session.hasSession) {
      throw redirect({ to: routePaths.login });
    }
  },
  component: LibraryPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.library,
});

const shlokaRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.session.hasSession) {
      throw redirect({ to: routePaths.login });
    }
  },
  component: ShlokaRoute,
  getParentRoute: () => rootRoute,
  path: routeSegments.libraryShloka,
});

const settingsRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (!context.session.hasSession) {
      throw redirect({ to: routePaths.login });
    }
  },
  component: SettingsPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.settings,
});

const adminRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.admin,
});

const adminSourceRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminSourcePage,
  getParentRoute: () => rootRoute,
  path: routeSegments.adminSourceNew,
});

const adminSourceEditRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminSourceEditRoute,
  getParentRoute: () => rootRoute,
  path: routeSegments.adminSourceEdit,
});

const adminShlokaRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminShlokaPage,
  getParentRoute: () => rootRoute,
  path: routeSegments.adminShlokaNew,
});

const adminShlokaEditRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminShlokaEditRoute,
  getParentRoute: () => rootRoute,
  path: routeSegments.adminShlokaEdit,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  libraryRoute,
  shlokaRoute,
  settingsRoute,
  adminRoute,
  adminSourceRoute,
  adminSourceEditRoute,
  adminShlokaRoute,
  adminShlokaEditRoute,
]);

export function createAppRouter() {
  return createRouter({
    context: {
      session: undefined as unknown as SessionContextValue,
    },
    routeTree,
  });
}

function RootRoute() {
  return <Outlet />;
}

function AdminSourceEditRoute() {
  const { sourceCode } = adminSourceEditRoute.useParams();
  return <AdminSourceEditPage sourceCode={sourceCode} />;
}

function ShlokaRoute() {
  const { shlokaCode } = shlokaRoute.useParams();
  return <ShlokaPage shlokaCode={shlokaCode} />;
}

function AdminShlokaEditRoute() {
  const { shlokaCode } = adminShlokaEditRoute.useParams();
  return <AdminShlokaEditPage shlokaCode={shlokaCode} />;
}

function requireAdmin(session: SessionContextValue): void {
  if (!session.hasSession) {
    throw redirect({ to: routePaths.login });
  }

  if (!session.account?.roles.includes("admin")) {
    throw redirect({ to: routePaths.dashboard });
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
