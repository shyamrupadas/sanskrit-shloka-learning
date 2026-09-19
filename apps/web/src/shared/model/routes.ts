export const routePaths = {
  root: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  streak: "/streak",
  library: "/library",
  libraryShloka: "/library/shlokas/$shlokaCode",
  learnShloka: "/library/shlokas/$shlokaCode/learn",
  reviewShloka: "/library/shlokas/$shlokaCode/review",
  learning: "/learning",
  settings: "/settings",
  admin: "/admin",
  adminCatalog: "/admin/catalog",
  adminLearning: "/admin/learning",
  adminTipNew: "/admin/learning/new",
  adminTipEdit: "/admin/learning/$tipId/edit",
  adminSourceNew: "/admin/sources/new",
  adminSourceEdit: "/admin/sources/$sourceCode/edit",
  adminShlokaNew: "/admin/shlokas/new",
  adminShlokaEdit: "/admin/shlokas/$shlokaCode/edit",
} as const;

export const routeSegments = {
  root: "/",
  login: "login",
  register: "register",
  dashboard: "dashboard",
  streak: "streak",
  library: "library",
  libraryShloka: "library/shlokas/$shlokaCode",
  learnShloka: "library/shlokas/$shlokaCode/learn",
  reviewShloka: "library/shlokas/$shlokaCode/review",
  learning: "learning",
  settings: "settings",
  admin: "admin",
  adminCatalog: "admin/catalog",
  adminLearning: "admin/learning",
  adminTipNew: "admin/learning/new",
  adminTipEdit: "admin/learning/$tipId/edit",
  adminSourceNew: "admin/sources/new",
  adminSourceEdit: "admin/sources/$sourceCode/edit",
  adminShlokaNew: "admin/shlokas/new",
  adminShlokaEdit: "admin/shlokas/$shlokaCode/edit",
} as const;

export type LibraryTabRoute = "all" | "learning" | "reviewing";

export type LearnShlokaReturnTo =
  | typeof routePaths.dashboard
  | typeof routePaths.library
  | `${typeof routePaths.library}?tab=${LibraryTabRoute}`;

export const learnShlokaReturnTo = {
  dashboard: routePaths.dashboard,
  library: (tab: LibraryTabRoute): LearnShlokaReturnTo =>
    `${routePaths.library}?tab=${tab}` as LearnShlokaReturnTo,
} as const;

export function parseLearnShlokaReturnTo(value: unknown): LearnShlokaReturnTo {
  if (value === routePaths.dashboard || value === routePaths.library) {
    return value;
  }

  if (
    value === `${routePaths.library}?tab=reviewing` ||
    value === `${routePaths.library}?tab=learning` ||
    value === `${routePaths.library}?tab=all`
  ) {
    return value as LearnShlokaReturnTo;
  }

  return learnShlokaReturnTo.dashboard;
}
