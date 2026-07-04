import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { AdminCatalogPage } from "@/features/admin";
import { routePaths, routeSegments } from "@/shared/model/routes";
import {
  adminSession,
  expectPath,
  mockApi,
  renderWithTestProviders,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

const catalog = {
  sources: [
    {
      code: "gita",
      title: "Бхагавад-гита",
      description: "Диалог Кришны и Арджуны",
      structureType: "chapters",
      chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
      parts: [],
      shlokas: [
        {
          code: "gita-chapter-2-2-47",
          chapterCode: "chapter-2",
          number: "2.47",
          text: "карманй эвадхикарас те\nма пхалешу кадачана",
        },
      ],
    },
    {
      code: "mahabharata",
      title: "Махабхарата",
      description: "Эпос",
      structureType: "parts",
      chapters: [],
      parts: [
        {
          code: "bhishma-parva",
          title: "Бхишма-парва",
          order: 1,
          chapters: [
            { code: "chapter-1", title: "Глава 1", order: 1 },
          ],
        },
      ],
      shlokas: [
        {
          code: "mahabharata-bhishma-1-1",
          partCode: "bhishma-parva",
          chapterCode: "chapter-1",
          number: "1",
          text: "длинный текст шлоки с пробелами\nи переносами, который должен быть нормализован и сокращен ровно по прежнему правилу отображения",
        },
      ],
    },
    {
      code: "empty",
      title: "Пустой источник",
      structureType: "none",
      chapters: [],
      parts: [],
      shlokas: [],
    },
  ],
} satisfies ApiTypes.AdminCatalogDto;

describe("admin catalog page", () => {
  it("shows loading and error states", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/admin/catalog") {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    storeTestSession(adminSession);

    const loadingView = renderCatalog();

    expect(
      await screen.findByRole("heading", { name: "Админка" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Загрузка...")).toBeInTheDocument();

    loadingView.unmount();
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/admin/catalog") {
        return {
          status: 500,
          body: {
            code: "CATALOG_UNAVAILABLE",
            message: "Каталог временно недоступен",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    renderCatalog();

    expect(
      await screen.findByText("Каталог временно недоступен"),
    ).toBeInTheDocument();
    expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
  });

  it("shows every source with the established labels and excerpts", async () => {
    mockApi(successfulCatalogApi);
    storeTestSession(adminSession);
    renderCatalog();

    expect(await screen.findByText("Бхагавад-гита")).toBeInTheDocument();
    expect(screen.getByText("gita · 1 глава")).toBeInTheDocument();
    expect(screen.getByText("Глава 2 · 2.47")).toBeInTheDocument();
    expect(
      screen.getByText(
        "карманй эвадхикарас те ма пхалешу кадачана",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("mahabharata · 1 часть")).toBeInTheDocument();
    expect(screen.getByText("Бхишма-парва · Глава 1 · 1")).toBeInTheDocument();
    expect(
      screen.getByText(
        "длинный текст шлоки с пробелами и переносами, который должен быть нормализован и сокращен ров...",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Пустой источник")).toBeInTheDocument();
    expect(screen.getByText("empty · 0 шлок")).toBeInTheDocument();
  });

  it("navigates to create and edit routes through the public page", async () => {
    const user = userEvent.setup();
    mockApi(successfulCatalogApi);
    storeTestSession(adminSession);

    const catalogView = renderCatalog();

    await screen.findByText("Бхагавад-гита");
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute(
      "href",
      routePaths.settings,
    );
    expect(screen.getByRole("link", { name: "Новый источник" })).toHaveAttribute(
      "href",
      routePaths.adminSourceNew,
    );
    expect(
      screen.getByRole("link", {
        name: "Редактировать шлоку 2.47",
      }),
    ).toHaveAttribute(
      "href",
      "/admin/shlokas/gita-chapter-2-2-47/edit",
    );
    await user.click(screen.getByRole("link", { name: "Новая шлока" }));
    await expectPath(routePaths.adminShlokaNew);
    expect(
      screen.getByRole("heading", { name: "Create shloka" }),
    ).toBeInTheDocument();

    catalogView.unmount();
    renderCatalog();
    await screen.findByText("Бхагавад-гита");
    await user.click(
      screen.getByRole("link", {
        name: "Редактировать источник Бхагавад-гита",
      }),
    );
    await expectPath("/admin/sources/gita/edit");
    expect(
      screen.getByRole("heading", { name: "Edit source gita" }),
    ).toBeInTheDocument();
  });
});

function renderCatalog() {
  window.history.pushState({}, "", routePaths.admin);
  const router = createCatalogTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createCatalogTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const adminRoute = createRoute({
    component: AdminCatalogPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.admin,
  });
  const settingsRoute = createRoute({
    component: () => <h1>Settings</h1>,
    getParentRoute: () => rootRoute,
    path: routeSegments.settings,
  });
  const sourceNewRoute = createRoute({
    component: () => <h1>Create source</h1>,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminSourceNew,
  });
  const shlokaNewRoute = createRoute({
    component: () => <h1>Create shloka</h1>,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminShlokaNew,
  });
  const sourceEditRoute = createRoute({
    component: SourceEditStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminSourceEdit,
  });
  const shlokaEditRoute = createRoute({
    component: ShlokaEditStub,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminShlokaEdit,
  });

  function SourceEditStub() {
    const { sourceCode } = sourceEditRoute.useParams();

    return <h1>Edit source {sourceCode}</h1>;
  }

  function ShlokaEditStub() {
    const { shlokaCode } = shlokaEditRoute.useParams();

    return <h1>Edit shloka {shlokaCode}</h1>;
  }

  return createRouter({
    routeTree: rootRoute.addChildren([
      adminRoute,
      settingsRoute,
      sourceNewRoute,
      shlokaNewRoute,
      sourceEditRoute,
      shlokaEditRoute,
    ]),
  });
}

function successfulCatalogApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
  if (method === "GET" && path === "/api/admin/catalog") {
    return { status: 200, body: catalog };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}
