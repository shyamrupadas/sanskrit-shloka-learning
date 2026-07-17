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

import { AdminSourceEditPage, AdminSourcePage } from "@/features/admin";
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

const chapterSource = {
  code: "gita",
  title: "Бхагавад-гита",
  description: "Диалог Кришны и Арджуны",
  structureType: "chapters",
  chapters: [{ code: "2", title: "Глава 2", order: 1 }],
  parts: [],
} satisfies ApiTypes.AdminSourceDto;

const partSource = {
  code: "mahabharata",
  title: "Махабхарата",
  description: "Эпос",
  structureType: "parts",
  chapters: [],
  parts: [
    {
      code: "1",
      title: "Бхишма-парва",
      order: 1,
      chapters: [{ code: "1", title: "Глава 1", order: 1 }],
    },
  ],
} satisfies ApiTypes.AdminSourceDto;

describe("admin source editor pages", () => {
  it("creates a source without chapters through the public admin page", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/sources") {
        createBody = request.body;
      }

      return successfulSourceApi(request);
    });
    storeTestSession(adminSession);
    renderSourceEditor(routePaths.adminSourceNew);

    expect(
      await screen.findByRole("button", { name: "Назад" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Код источника"), "amrita");
    await user.type(screen.getByLabelText("Название"), "Амрита");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник создан");
    expect(createBody).toEqual({
      code: "amrita",
      structureType: "none",
      title: "Амрита",
    });

    await user.click(screen.getByRole("button", { name: "Назад" }));
    await expectPath(routePaths.admin);
  });

  it("creates a source with chapters and preserves chapter order", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/sources") {
        createBody = request.body;
      }

      return successfulSourceApi(request);
    });
    storeTestSession(adminSession);
    renderSourceEditor(routePaths.adminSourceNew);

    await user.type(await screen.findByLabelText("Код источника"), "gita");
    await user.type(screen.getByLabelText("Название"), "Бхагавад-гита");
    await user.click(screen.getByRole("tab", { name: "Главы" }));
    await user.type(screen.getByLabelText("Код главы 1"), "2");
    await user.type(screen.getByLabelText("Название главы 1"), "Глава 2");
    await user.click(screen.getByRole("button", { name: "Добавить главу" }));
    await user.type(screen.getByLabelText("Код главы 2"), "3");
    await user.type(screen.getByLabelText("Название главы 2"), "Глава 3");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник создан");
    expect(createBody).toEqual({
      chapters: [
        { code: "2", order: 1, title: "Глава 2" },
        { code: "3", order: 2, title: "Глава 3" },
      ],
      code: "gita",
      structureType: "chapters",
      title: "Бхагавад-гита",
    });
  });

  it("creates a source with parts and chapters", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/sources") {
        createBody = request.body;
      }

      return successfulSourceApi(request);
    });
    storeTestSession(adminSession);
    renderSourceEditor(routePaths.adminSourceNew);

    await user.type(await screen.findByLabelText("Код источника"), "mahabharata");
    await user.type(screen.getByLabelText("Название"), "Махабхарата");
    await user.type(screen.getByLabelText("Описание"), "Эпос");
    await user.click(screen.getByRole("tab", { name: "Части" }));
    expect(
      screen.queryByRole("button", { name: /удалить/i }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Код части 1"), "1");
    await user.type(screen.getByLabelText("Название части 1"), "Бхишма-парва");
    await user.type(screen.getByLabelText("Код главы 1"), "1");
    await user.type(screen.getByLabelText("Название главы 1"), "Глава 1");
    await user.click(screen.getByRole("button", { name: "Добавить часть" }));
    await user.type(screen.getByLabelText("Код части 2"), "2");
    await user.type(screen.getByLabelText("Название части 2"), "Дрона-парва");
    await user.type(getSecondField("Код главы 1"), "2");
    await user.type(getSecondField("Название главы 1"), "Глава 2");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник создан");
    expect(createBody).toEqual({
      code: "mahabharata",
      description: "Эпос",
      parts: [
        {
          chapters: [{ code: "1", order: 1, title: "Глава 1" }],
          code: "1",
          order: 1,
          title: "Бхишма-парва",
        },
        {
          chapters: [{ code: "2", order: 1, title: "Глава 2" }],
          code: "2",
          order: 2,
          title: "Дрона-парва",
        },
      ],
      structureType: "parts",
      title: "Махабхарата",
    });
  });

  it("edits chapter source fields while keeping existing source and chapter codes readonly", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockApi((request) => {
      if (request.method === "PATCH" && request.path === "/api/admin/sources/gita") {
        updateBody = request.body;
      }

      return successfulSourceApi(request);
    });
    storeTestSession(adminSession);
    renderSourceEditor("/admin/sources/gita/edit");

    const sourceCode = (await screen.findByLabelText("Код источника")) as HTMLInputElement;
    const structure = screen.getByLabelText("Структура") as HTMLInputElement;
    const chapterCode = screen.getByLabelText("Код главы 1") as HTMLInputElement;
    expect(sourceCode.readOnly).toBe(true);
    expect(structure.readOnly).toBe(true);
    expect(chapterCode.readOnly).toBe(true);

    await user.clear(screen.getByLabelText("Название"));
    await user.type(screen.getByLabelText("Название"), "Гита");
    await user.clear(screen.getByLabelText("Описание"));
    await user.type(screen.getByLabelText("Описание"), "Новое описание");
    await user.clear(screen.getByLabelText("Название главы 1"));
    await user.type(screen.getByLabelText("Название главы 1"), "Вторая глава");
    await user.click(screen.getByRole("button", { name: "Добавить главу" }));
    await user.type(screen.getByLabelText("Код главы 2"), "3");
    await user.type(screen.getByLabelText("Название главы 2"), "Третья глава");
    await user.click(screen.getByRole("button", { name: "Сохранить источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник сохранен");
    expect(updateBody).toEqual({
      chapters: [
        { code: "2", order: 1, title: "Вторая глава" },
        { code: "3", order: 2, title: "Третья глава" },
      ],
      description: "Новое описание",
      title: "Гита",
    });
  });

  it("edits part source fields while keeping existing part and chapter codes readonly", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockApi((request) => {
      if (
        request.method === "PATCH" &&
        request.path === "/api/admin/sources/mahabharata"
      ) {
        updateBody = request.body;
      }

      return successfulSourceApi(request);
    });
    storeTestSession(adminSession);
    renderSourceEditor("/admin/sources/mahabharata/edit");

    expect(
      (await screen.findByLabelText("Код части 1") as HTMLInputElement).readOnly,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Код главы 1") as HTMLInputElement).readOnly,
    ).toBe(true);

    await user.clear(screen.getByLabelText("Название"));
    await user.type(screen.getByLabelText("Название"), "Махабхарата");
    await user.clear(screen.getByLabelText("Название части 1"));
    await user.type(screen.getByLabelText("Название части 1"), "Бхишма");
    await user.clear(screen.getByLabelText("Название главы 1"));
    await user.type(screen.getByLabelText("Название главы 1"), "Первая глава");
    await user.click(screen.getByRole("button", { name: "Добавить часть" }));
    await user.type(screen.getByLabelText("Код части 2"), "2");
    await user.type(screen.getByLabelText("Название части 2"), "Дрона-парва");
    await user.type(getSecondField("Код главы 1"), "2");
    await user.type(getSecondField("Название главы 1"), "Глава 2");
    await user.click(screen.getByRole("button", { name: "Сохранить источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник сохранен");
    expect(updateBody).toEqual({
      description: "Эпос",
      parts: [
        {
          chapters: [{ code: "1", order: 1, title: "Первая глава" }],
          code: "1",
          order: 1,
          title: "Бхишма",
        },
        {
          chapters: [{ code: "2", order: 1, title: "Глава 2" }],
          code: "2",
          order: 2,
          title: "Дрона-парва",
        },
      ],
      title: "Махабхарата",
    });
  });

  it("keeps invalid source structures from submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(successfulSourceApi);
    storeTestSession(adminSession);
    renderSourceEditor(routePaths.adminSourceNew);

    await user.type(await screen.findByLabelText("Код источника"), "gita");
    await user.type(screen.getByLabelText("Название"), "Бхагавад-гита");
    await user.click(screen.getByRole("tab", { name: "Главы" }));
    await user.type(screen.getByLabelText("Код главы 1"), "chapter-1");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(screen.getByLabelText("Код главы 1")).toBeInvalid();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/sources",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows source loading and save API errors", async () => {
    const user = userEvent.setup();
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/admin/sources/gita") {
        return {
          status: 500,
          body: {
            code: "VALIDATION_ERROR",
            message: "Источник временно недоступен",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    storeTestSession(adminSession);

    const errorView = renderSourceEditor("/admin/sources/gita/edit");

    expect(
      await screen.findByText("Источник временно недоступен"),
    ).toBeInTheDocument();

    errorView.unmount();
    mockApi(({ method, path }) => {
      if (method === "POST" && path === "/api/admin/sources") {
        return {
          status: 409,
          body: {
            code: "VALIDATION_ERROR",
            message: "Код источника уже используется",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    renderSourceEditor(routePaths.adminSourceNew);

    await user.type(await screen.findByLabelText("Код источника"), "gita");
    await user.type(screen.getByLabelText("Название"), "Бхагавад-гита");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Код источника уже используется",
    );
  });
});

function renderSourceEditor(path: string) {
  window.history.pushState({}, "", path);
  const router = createSourceEditorTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function getSecondField(label: string): HTMLElement {
  const field = screen.getAllByLabelText(label).at(1);
  expect(field).toBeDefined();

  return field as HTMLElement;
}

function createSourceEditorTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const adminRoute = createRoute({
    component: () => <h1>Admin catalog</h1>,
    getParentRoute: () => rootRoute,
    path: routeSegments.admin,
  });
  const sourceNewRoute = createRoute({
    component: AdminSourcePage,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminSourceNew,
  });
  const sourceEditRoute = createRoute({
    component: SourceEditRoute,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminSourceEdit,
  });

  function SourceEditRoute() {
    const { sourceCode } = sourceEditRoute.useParams();

    return <AdminSourceEditPage sourceCode={sourceCode} />;
  }

  return createRouter({
    routeTree: rootRoute.addChildren([
      adminRoute,
      sourceNewRoute,
      sourceEditRoute,
    ]),
  });
}

function successfulSourceApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
  if (method === "GET" && path === "/api/admin/sources/gita") {
    return { status: 200, body: chapterSource };
  }

  if (method === "GET" && path === "/api/admin/sources/mahabharata") {
    return { status: 200, body: partSource };
  }

  if (method === "POST" && path === "/api/admin/sources") {
    return { status: 201, body: toSourceOption(chapterSource) };
  }

  if (method === "PATCH" && path === "/api/admin/sources/gita") {
    return {
      status: 200,
      body: {
        ...chapterSource,
        title: "Гита",
        description: "Новое описание",
        chapters: [
          { code: "2", title: "Вторая глава", order: 1 },
          { code: "3", title: "Третья глава", order: 2 },
        ],
      },
    };
  }

  if (method === "PATCH" && path === "/api/admin/sources/mahabharata") {
    return {
      status: 200,
      body: {
        ...partSource,
        parts: [
          {
            code: "1",
            title: "Бхишма",
            order: 1,
            chapters: [{ code: "1", title: "Первая глава", order: 1 }],
          },
          {
            code: "2",
            title: "Дрона-парва",
            order: 2,
            chapters: [{ code: "2", title: "Глава 2", order: 1 }],
          },
        ],
      },
    };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}

function toSourceOption(
  source: ApiTypes.AdminSourceDto,
): ApiTypes.SourceOptionDto {
  return {
    chapters: source.chapters,
    code: source.code,
    parts: source.parts,
    structureType: source.structureType,
    title: source.title,
  };
}
