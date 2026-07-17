import {
  Outlet,
  getRouteApi,
  lazyRouteComponent,
} from "@tanstack/react-router";

const AdminSourceEditPage = lazyRouteComponent(
  () => import("@/features/admin/source-editor.page"),
  "AdminSourceEditPage",
);
const AdminShlokaEditPage = lazyRouteComponent(
  () => import("@/features/admin/shloka-editor.page"),
  "AdminShlokaEditPage",
);
const LibraryPage = lazyRouteComponent(
  () => import("@/features/library/library.page"),
  "LibraryPage",
);
const ShlokaPage = lazyRouteComponent(
  () => import("@/features/library/shloka.page"),
  "ShlokaPage",
);
const LearnShlokaPage = lazyRouteComponent(
  () => import("@/features/learn-shloka/learn-shloka.page"),
  "LearnShlokaPage",
);
const ReviewShlokaPage = lazyRouteComponent(
  () => import("@/features/review-shloka/review-shloka.page"),
  "ReviewShlokaPage",
);

const adminSourceEditRouteApi = getRouteApi(
  "/admin-layout/admin/sources/$sourceCode/edit",
);
const adminShlokaEditRouteApi = getRouteApi(
  "/admin-layout/admin/shlokas/$shlokaCode/edit",
);
const libraryRouteApi = getRouteApi("/authenticated/library");
const shlokaRouteApi = getRouteApi(
  "/authenticated/library/shlokas/$shlokaCode",
);
const learnShlokaRouteApi = getRouteApi(
  "/authenticated/library/shlokas/$shlokaCode/learn",
);
const reviewShlokaRouteApi = getRouteApi(
  "/authenticated/library/shlokas/$shlokaCode/review",
);

export function RootRoute() {
  return <Outlet />;
}

export function AdminSourceEditRoute() {
  const { sourceCode } = adminSourceEditRouteApi.useParams();
  return <AdminSourceEditPage sourceCode={sourceCode} />;
}

export function ShlokaRoute() {
  const { shlokaCode } = shlokaRouteApi.useParams();
  return <ShlokaPage shlokaCode={shlokaCode} />;
}

export function LibraryRoute() {
  const { tab } = libraryRouteApi.useSearch();

  return tab ? <LibraryPage initialTab={tab} /> : <LibraryPage />;
}

Object.assign(LibraryRoute, { preload: LibraryPage.preload });

export function LearnShlokaRoute() {
  const { shlokaCode } = learnShlokaRouteApi.useParams();

  return <LearnShlokaPage key={shlokaCode} shlokaCode={shlokaCode} />;
}

export function ReviewShlokaRoute() {
  const { shlokaCode } = reviewShlokaRouteApi.useParams();

  return <ReviewShlokaPage shlokaCode={shlokaCode} />;
}

export function AdminShlokaEditRoute() {
  const { shlokaCode } = adminShlokaEditRouteApi.useParams();
  return <AdminShlokaEditPage shlokaCode={shlokaCode} />;
}
