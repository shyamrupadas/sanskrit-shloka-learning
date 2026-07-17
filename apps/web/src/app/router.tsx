import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  AdminShlokaEditRoute,
  AdminSourceEditRoute,
  LearnShlokaRoute,
  LibraryRoute,
  ReviewShlokaRoute,
  RootRoute,
  ShlokaRoute,
} from "@/app/route-components";
import { routePaths, routeSegments } from "@/shared/model/routes";
import type { SessionContextValue } from "@/shared/session";

interface RouterContext {
  session: SessionContextValue;
}

const loadProtectedLayouts = () =>
  import("@/app/layouts/protected-layouts");
const loadAdminSourcePages = () =>
  import("@/features/admin/source-editor.page");
const loadAdminShlokaPages = () =>
  import("@/features/admin/shloka-editor.page");

const AuthenticatedLayout = lazyRouteComponent(
  loadProtectedLayouts,
  "AuthenticatedLayout",
);
const AdminLayout = lazyRouteComponent(loadProtectedLayouts, "AdminLayout");
const LoginPage = lazyRouteComponent(
  () => import("@/features/auth/login.page"),
  "LoginPage",
);
const RegisterPage = lazyRouteComponent(
  () => import("@/features/auth/register.page"),
  "RegisterPage",
);
const DashboardPage = lazyRouteComponent(
  () => import("@/features/dashboard/dashboard.page"),
  "DashboardPage",
);
const LearningPage = lazyRouteComponent(
  () => import("@/features/learning/learning.page"),
  "LearningPage",
);
const SettingsPage = lazyRouteComponent(
  () => import("@/features/settings/settings.page"),
  "SettingsPage",
);
const AdminCatalogPage = lazyRouteComponent(
  () => import("@/features/admin/catalog.page"),
  "AdminCatalogPage",
);
const AdminSourcePage = lazyRouteComponent(
  loadAdminSourcePages,
  "AdminSourcePage",
);
const AdminShlokaPage = lazyRouteComponent(
  loadAdminShlokaPages,
  "AdminShlokaPage",
);

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
  component: LibraryRoute,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.library,
  validateSearch: parseLibrarySearch,
});

const shlokaRoute = createRoute({
  component: ShlokaRoute,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.libraryShloka,
});

const learnShlokaRoute = createRoute({
  component: LearnShlokaRoute,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.learnShloka,
});

const reviewShlokaRoute = createRoute({
  component: ReviewShlokaRoute,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.reviewShloka,
});

const learningRoute = createRoute({
  component: LearningPage,
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.learning,
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
  component: AdminCatalogPage,
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
    learnShlokaRoute,
    reviewShlokaRoute,
    learningRoute,
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
    defaultPreload: "intent",
    routeTree,
  });
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

function parseLibrarySearch(search: Record<string, unknown>): {
  tab?: ApiTypes.LibraryTab;
} {
  return search.tab === "reviewing" ||
    search.tab === "learning" ||
    search.tab === "all"
    ? { tab: search.tab }
    : {};
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
