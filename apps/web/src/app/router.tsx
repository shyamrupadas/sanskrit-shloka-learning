import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import {
  AdminLayout,
  AuthenticatedLayout,
} from "@/app/layouts/protected-layouts";
import { LoginPage } from "@/features/auth/login.page";
import { RegisterPage } from "@/features/auth/register.page";
import { DashboardPage } from "@/features/dashboard/dashboard.page";
import { SettingsPage } from "@/features/settings/settings.page";
import { AdminPage, AdminShlokaEditPage, AdminShlokaPage, AdminSourceEditPage, AdminSourcePage } from "@/pages/admin-pages";
import { LibraryPage, ShlokaPage } from "@/pages/library-page";
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

const authenticatedRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAuthentication(context.session);
  },
  component: AuthenticatedLayout,
  getParentRoute: () => rootRoute,
  id: "authenticated",
});

const dashboardRoute = createRoute({
  component: DashboardPage,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.dashboard,
});

const libraryRoute = createRoute({
  component: LibraryPage,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.library,
});

const shlokaRoute = createRoute({
  component: ShlokaRoute,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.libraryShloka,
});

const settingsRoute = createRoute({
  component: SettingsPage,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.settings,
});

const adminLayoutRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  component: AdminLayout,
  getParentRoute: () => rootRoute,
  id: "admin-layout",
});

const adminRoute = createRoute({
  component: AdminPage,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.admin,
});

const adminSourceRoute = createRoute({
  component: AdminSourcePage,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminSourceNew,
});

const adminSourceEditRoute = createRoute({
  component: AdminSourceEditRoute,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminSourceEdit,
});

const adminShlokaRoute = createRoute({
  component: AdminShlokaPage,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminShlokaNew,
});

const adminShlokaEditRoute = createRoute({
  component: AdminShlokaEditRoute,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminShlokaEdit,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    libraryRoute,
    shlokaRoute,
    settingsRoute,
  ]),
  adminLayoutRoute.addChildren([
    adminRoute,
    adminSourceRoute,
    adminSourceEditRoute,
    adminShlokaRoute,
    adminShlokaEditRoute,
  ]),
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

function requireAuthentication(session: SessionContextValue): void {
  if (!session.hasSession) {
    throw redirect({ to: routePaths.login });
  }
}

function requireAdmin(session: SessionContextValue): void {
  requireAuthentication(session);

  if (!session.account?.roles.includes("admin")) {
    throw redirect({ to: routePaths.dashboard });
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
