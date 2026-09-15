import { createLazyRoute, getRouteApi } from "@tanstack/react-router";

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

export async function loadAdminSourceEditRoute() {
  const { AdminSourceEditPage } = await import(
    "@/features/admin/source-editor.page",
  );

  return createLazyRoute("/admin-layout/admin/sources/$sourceCode/edit")({
    component: AdminSourceEditRoute,
  });

  function AdminSourceEditRoute() {
    const { sourceCode } = adminSourceEditRouteApi.useParams();
    return <AdminSourceEditPage sourceCode={sourceCode} />;
  }
}

export async function loadShlokaRoute() {
  const { ShlokaPage } = await import("@/features/library/shloka.page");

  return createLazyRoute("/authenticated/library/shlokas/$shlokaCode")({
    component: ShlokaRoute,
  });

  function ShlokaRoute() {
    const { shlokaCode } = shlokaRouteApi.useParams();
    return <ShlokaPage shlokaCode={shlokaCode} />;
  }
}

export async function loadLibraryRoute() {
  const { LibraryPage } = await import("@/features/library/library.page");

  return createLazyRoute("/authenticated/library")({
    component: LibraryRoute,
  });

  function LibraryRoute() {
    const { tab } = libraryRouteApi.useSearch();

    return tab ? <LibraryPage initialTab={tab} /> : <LibraryPage />;
  }
}

export async function loadLearnShlokaRoute() {
  const { LearnShlokaPage } = await import(
    "@/features/learn-shloka/learn-shloka.page",
  );

  return createLazyRoute("/authenticated/library/shlokas/$shlokaCode/learn")({
    component: LearnShlokaRoute,
  });

  function LearnShlokaRoute() {
    const { shlokaCode } = learnShlokaRouteApi.useParams();
    const { returnTo } = learnShlokaRouteApi.useSearch();

    return (
      <LearnShlokaPage
        key={shlokaCode}
        returnTo={returnTo}
        shlokaCode={shlokaCode}
      />
    );
  }
}

export async function loadReviewShlokaRoute() {
  const { ReviewShlokaPage } = await import(
    "@/features/review-shloka/review-shloka.page",
  );

  return createLazyRoute("/authenticated/library/shlokas/$shlokaCode/review")({
    component: ReviewShlokaRoute,
  });

  function ReviewShlokaRoute() {
    const { shlokaCode } = reviewShlokaRouteApi.useParams();

    return <ReviewShlokaPage shlokaCode={shlokaCode} />;
  }
}

export async function loadAdminShlokaEditRoute() {
  const { AdminShlokaEditPage } = await import(
    "@/features/admin/shloka-editor.page",
  );

  return createLazyRoute("/admin-layout/admin/shlokas/$shlokaCode/edit")({
    component: AdminShlokaEditRoute,
  });

  function AdminShlokaEditRoute() {
    const { shlokaCode } = adminShlokaEditRouteApi.useParams();
    return <AdminShlokaEditPage shlokaCode={shlokaCode} />;
  }
}
