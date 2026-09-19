import {
  createLazyRoute,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  loadAdminShlokaEditRoute,
  loadAdminSourceEditRoute,
  loadLearnShlokaRoute,
  loadLibraryRoute,
  loadReviewShlokaRoute,
  loadShlokaRoute,
} from "@/app/route-components";
import {
  parseLearnShlokaReturnTo,
  routePaths,
  routeSegments,
} from "@/shared/model/routes";
import type { SessionContextValue } from "@/shared/session";
import { isAdminLearningEnabled } from "@/shared/model/admin-learning";

interface RouterContext {
  session: SessionContextValue;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
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
  getParentRoute: () => rootRoute,
  path: routeSegments.login,
}).lazy(async () => {
  const { LoginPage } = await import("@/features/auth/login.page");
  return createLazyRoute("/login")({ component: LoginPage });
});

const registerRoute = createRoute({
  beforeLoad: ({ context }) => {
    if (context.session.hasSession) {
      throw redirect({ to: routePaths.dashboard });
    }
  },
  getParentRoute: () => rootRoute,
  path: routeSegments.register,
}).lazy(async () => {
  const { RegisterPage } = await import("@/features/auth/register.page");
  return createLazyRoute("/register")({ component: RegisterPage });
});

const authenticatedRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAuthentication(context.session);
  },
  getParentRoute: () => rootRoute,
  id: "authenticated",
}).lazy(async () => {
  const { AuthenticatedLayout } = await import("@/app/layouts/protected-layouts");
  return createLazyRoute("/authenticated")({ component: AuthenticatedLayout });
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.dashboard,
}).lazy(async () => {
  const { DashboardPage } = await import("@/features/dashboard/dashboard.page");
  return createLazyRoute("/authenticated/dashboard")({ component: DashboardPage });
});

const streakRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.streak,
}).lazy(async () => {
  const { StreakPage } = await import("@/features/streak/streak.page");
  return createLazyRoute("/authenticated/streak")({ component: StreakPage });
});

const libraryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.library,
  validateSearch: parseLibrarySearch,
}).lazy(loadLibraryRoute);

const shlokaRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.libraryShloka,
}).lazy(loadShlokaRoute);

const learnShlokaRoute = createRoute({
  beforeLoad: ({ location, params, search }) => {
    const rawSearch = location.search as Record<string, unknown>;

    if (
      Object.keys(rawSearch).length !== 1 ||
      rawSearch.returnTo !== search.returnTo
    ) {
      throw redirect({
        params,
        replace: true,
        search,
        to: routePaths.learnShloka,
      });
    }
  },
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.learnShloka,
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: parseLearnShlokaReturnTo(search.returnTo),
  }),
}).lazy(loadLearnShlokaRoute);

const reviewShlokaRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.reviewShloka,
}).lazy(loadReviewShlokaRoute);

const learningRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.learning,
}).lazy(async () => {
  const { LearningPage } = await import("@/features/learning/learning.page");
  return createLazyRoute("/authenticated/learning")({ component: LearningPage });
});

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: routeSegments.settings,
}).lazy(async () => {
  const { SettingsPage } = await import("@/features/settings/settings.page");
  return createLazyRoute("/authenticated/settings")({ component: SettingsPage });
});

const adminLayoutRoute = createRoute({
  beforeLoad: ({ context }) => {
    requireAdmin(context.session);
  },
  getParentRoute: () => rootRoute,
  id: "admin-layout",
}).lazy(async () => {
  const { AdminLayout } = await import("@/app/layouts/protected-layouts");
  return createLazyRoute("/admin-layout")({ component: AdminLayout });
});

const adminRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.admin,
}).lazy(async () => {
  const { AdminHomePage } = await import("@/features/admin/home.page");
  return createLazyRoute("/admin-layout/admin")({ component: AdminHomePage });
});

function requireAdminLearning(): void {
  if (!isAdminLearningEnabled()) throw redirect({ to: routePaths.admin });
}

const adminCatalogRoute = createRoute({
  beforeLoad: requireAdminLearning,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminCatalog,
}).lazy(async () => {
  const { AdminCatalogPage } = await import("@/features/admin/catalog.page");
  return createLazyRoute("/admin-layout/admin/catalog")({ component: AdminCatalogPage });
});

const adminLearningRoute = createRoute({
  beforeLoad: requireAdminLearning,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminLearning,
  validateSearch: (search: Record<string, unknown>): { published?: boolean } => search.published === true ? { published: true } : {},
}).lazy(async () => {
  const { AdminTipsPage } = await import("@/features/admin/tips.page");
  return createLazyRoute("/admin-layout/admin/learning")({ component: AdminTipsPage });
});

const adminTipNewRoute = createRoute({
  beforeLoad: requireAdminLearning,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminTipNew,
}).lazy(async () => {
  const { AdminTipEditorPage } = await import("@/features/admin/tip-editor.page");
  return createLazyRoute("/admin-layout/admin/learning/new")({ component: AdminTipEditorPage });
});

const adminTipEditRoute = createRoute({
  beforeLoad: requireAdminLearning,
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminTipEdit,
}).lazy(async () => {
  const { AdminTipEditorPage } = await import("@/features/admin/tip-editor.page");
  return createLazyRoute("/admin-layout/admin/learning/$tipId/edit")({ component: AdminTipEditorPage });
});

const adminSourceRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminSourceNew,
}).lazy(async () => {
  const { AdminSourcePage } = await import("@/features/admin/source-editor.page");
  return createLazyRoute("/admin-layout/admin/sources/new")({
    component: AdminSourcePage,
  });
});

const adminSourceEditRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminSourceEdit,
}).lazy(loadAdminSourceEditRoute);

const adminShlokaRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminShlokaNew,
}).lazy(async () => {
  const { AdminShlokaPage } = await import("@/features/admin/shloka-editor.page");
  return createLazyRoute("/admin-layout/admin/shlokas/new")({
    component: AdminShlokaPage,
  });
});

const adminShlokaEditRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: routeSegments.adminShlokaEdit,
}).lazy(loadAdminShlokaEditRoute);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    streakRoute,
    libraryRoute,
    shlokaRoute,
    learnShlokaRoute,
    reviewShlokaRoute,
    learningRoute,
    settingsRoute,
  ]),
  adminLayoutRoute.addChildren([
    adminRoute,
    adminCatalogRoute,
    adminLearningRoute,
    adminTipNewRoute,
    adminTipEditRoute,
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
