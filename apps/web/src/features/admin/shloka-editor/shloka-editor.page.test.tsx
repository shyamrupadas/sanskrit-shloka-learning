import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { AdminShlokaEditPage, AdminShlokaPage } from "@/features/admin";
import { routePaths, routeSegments } from "@/shared/model/routes";
import {
  adminSession,
  mockApi,
  renderWithTestProviders,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

const sourceOptions = {
  sources: [
    {
      code: "plain",
      title: "Без глав",
      structureType: "none",
      chapters: [],
      parts: [],
    },
    {
      code: "gita",
      title: "Бхагавад-гита",
      structureType: "chapters",
      chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
      parts: [],
    },
    {
      code: "mahabharata",
      title: "Махабхарата",
      structureType: "parts",
      chapters: [],
      parts: [
        {
          code: "bhishma-parva",
          title: "Бхишма-парва",
          order: 1,
          chapters: [{ code: "chapter-1", title: "Глава 1", order: 1 }],
        },
      ],
    },
  ],
} satisfies ApiTypes.AdminSourceOptionsDto;

const adminShloka = {
  code: "mahabharata-bhishma-1-1",
  sourceCode: "mahabharata",
  sourceTitle: "Махабхарата",
  partCode: "bhishma-parva",
  partTitle: "Бхишма-парва",
  chapterCode: "chapter-1",
  chapterTitle: "Глава 1",
  number: "1",
  text: "дхармакшетре курукшетре\nсамавета юютсавах\nмамаках пандаваш чайва\nким акурвата санджая",
  padas: [
    "дхармакшетре курукшетре",
    "самавета юютсавах",
    "мамаках пандаваш чайва",
    "ким акурвата санджая",
  ],
  fullTranslation: "На поле дхармы, на поле Куру.",
} satisfies ApiTypes.AdminShlokaDto;

describe("admin shloka editor pages", () => {
  it("creates a shloka with chapter source through the public admin page", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/shlokas") {
        createBody = request.body;
      }

      return successfulShlokaEditorApi(request);
    });
    storeTestSession(adminSession);
    renderShlokaEditor(routePaths.adminShlokaNew);

    expect(await screen.findByRole("link", { name: "Назад" })).toHaveAttribute(
      "href",
      routePaths.admin,
    );
    await user.selectOptions(await screen.findByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Номер шлоки"), "2.47");
    await user.type(screen.getByLabelText("Пада 1"), "  карманй эвадхикарас те  ");
    await user.type(screen.getByLabelText("Пада 2"), "ма пхалешу кадачана");
    await user.type(screen.getByLabelText("Пада 3"), "ма кармапхалахетур бхур");
    await user.type(screen.getByLabelText("Пада 4"), "ма те санго сту акармани");
    expect(screen.getByLabelText("Полный перевод").tagName).toBe("TEXTAREA");
    await user.type(screen.getByLabelText("Полный перевод"), "Полный перевод шлоки");
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Шлока создана");
    expect(createBody).toEqual({
      sourceCode: "gita",
      chapterCode: "chapter-2",
      number: "2.47",
      padas: [
        "карманй эвадхикарас те",
        "ма пхалешу кадачана",
        "ма кармапхалахетур бхур",
        "ма те санго сту акармани",
      ],
      fullTranslation: "Полный перевод шлоки",
    });
  });

  it("follows source structure while selecting source, part, and chapter", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/shlokas") {
        createBody = request.body;
      }

      return successfulShlokaEditorApi(request);
    });
    storeTestSession(adminSession);
    renderShlokaEditor(routePaths.adminShlokaNew);

    await user.selectOptions(await screen.findByLabelText("Источник"), "plain");
    expect(screen.queryByLabelText("Часть")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Глава")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Источник"), "mahabharata");
    await user.selectOptions(screen.getByLabelText("Часть"), "bhishma-parva");
    const chapter = screen.getByLabelText("Глава");
    expect(
      within(chapter).getByRole("option", { name: "Глава 1" }),
    ).toBeInTheDocument();

    await user.selectOptions(chapter, "chapter-1");
    await user.type(screen.getByLabelText("Номер шлоки"), "1");
    await fillPadas(user);
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Шлока создана");
    expect(createBody).toEqual({
      sourceCode: "mahabharata",
      partCode: "bhishma-parva",
      chapterCode: "chapter-1",
      number: "1",
      padas: [
        "дхармакшетре курукшетре",
        "самавета юютсавах",
        "мамаках пандаваш чайва",
        "ким акурвата санджая",
      ],
    });
  });

  it("blocks shloka creation when any normalized pada is blank", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(successfulShlokaEditorApi);
    storeTestSession(adminSession);
    renderShlokaEditor(routePaths.adminShlokaNew);

    await user.selectOptions(await screen.findByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Номер шлоки"), "2.47");
    await user.type(screen.getByLabelText("Пада 1"), "дхармакшетре курукшетре");
    await user.type(screen.getByLabelText("Пада 2"), "   ");
    await user.type(screen.getByLabelText("Пада 3"), "мамаках пандаваш чайва");
    await user.type(screen.getByLabelText("Пада 4"), "ким акурвата санджая");
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Заполните все четыре пады шлоки",
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/shlokas",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("edits shloka text while keeping reference fields readonly", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockApi((request) => {
      if (
        request.method === "PATCH" &&
        request.path === "/api/admin/shlokas/mahabharata-bhishma-1-1"
      ) {
        updateBody = request.body;
      }

      return successfulShlokaEditorApi(request);
    });
    storeTestSession(adminSession);
    renderShlokaEditor("/admin/shlokas/mahabharata-bhishma-1-1/edit");

    expect(
      await screen.findByText(
        "Изменение канонического текста затронет всех пользователей общей библиотеки.",
      ),
    ).toBeInTheDocument();
    expect((screen.getByLabelText("Код шлоки") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Источник") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Часть") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Глава") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Номер шлоки") as HTMLInputElement).readOnly).toBe(true);

    await user.clear(screen.getByLabelText("Пада 1"));
    await user.type(screen.getByLabelText("Пада 1"), "  обновленная первая  ");
    await user.clear(screen.getByLabelText("Пада 2"));
    await user.type(screen.getByLabelText("Пада 2"), "обновленная вторая");
    await user.clear(screen.getByLabelText("Полный перевод"));
    await user.type(screen.getByLabelText("Полный перевод"), "Новый перевод");
    await user.click(screen.getByRole("button", { name: "Сохранить шлоку" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Шлока сохранена");
    expect(updateBody).toEqual({
      padas: [
        "обновленная первая",
        "обновленная вторая",
        "мамаках пандаваш чайва",
        "ким акурвата санджая",
      ],
      fullTranslation: "Новый перевод",
    });
  });

  it("shows loading and save API errors", async () => {
    const user = userEvent.setup();
    mockApi(({ method, path }) => {
      if (
        method === "GET" &&
        path === "/api/admin/shlokas/mahabharata-bhishma-1-1"
      ) {
        return {
          status: 500,
          body: {
            code: "VALIDATION_ERROR",
            message: "Шлока временно недоступна",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    storeTestSession(adminSession);

    const errorView = renderShlokaEditor(
      "/admin/shlokas/mahabharata-bhishma-1-1/edit",
    );

    expect(
      await screen.findByText("Шлока временно недоступна"),
    ).toBeInTheDocument();

    errorView.unmount();
    mockApi((request) => {
      if (request.method === "POST" && request.path === "/api/admin/shlokas") {
        return {
          status: 409,
          body: {
            code: "VALIDATION_ERROR",
            message: "Ссылка на шлоку уже используется",
          },
        };
      }

      return successfulShlokaEditorApi(request);
    });
    renderShlokaEditor(routePaths.adminShlokaNew);

    await user.selectOptions(await screen.findByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Номер шлоки"), "2.47");
    await fillPadas(user);
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ссылка на шлоку уже используется",
    );
  });
});

async function fillPadas(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Пада 1"), "дхармакшетре курукшетре");
  await user.type(screen.getByLabelText("Пада 2"), "самавета юютсавах");
  await user.type(screen.getByLabelText("Пада 3"), "мамаках пандаваш чайва");
  await user.type(screen.getByLabelText("Пада 4"), "ким акурвата санджая");
}

function renderShlokaEditor(path: string) {
  window.history.pushState({}, "", path);
  const router = createShlokaEditorTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createShlokaEditorTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const adminRoute = createRoute({
    component: () => <h1>Admin catalog</h1>,
    getParentRoute: () => rootRoute,
    path: routeSegments.admin,
  });
  const shlokaNewRoute = createRoute({
    component: AdminShlokaPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminShlokaNew,
  });
  const shlokaEditRoute = createRoute({
    component: ShlokaEditRoute,
    getParentRoute: () => rootRoute,
    path: routeSegments.adminShlokaEdit,
  });

  function ShlokaEditRoute() {
    const { shlokaCode } = shlokaEditRoute.useParams();

    return <AdminShlokaEditPage shlokaCode={shlokaCode} />;
  }

  return createRouter({
    routeTree: rootRoute.addChildren([
      adminRoute,
      shlokaNewRoute,
      shlokaEditRoute,
    ]),
  });
}

function successfulShlokaEditorApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
  if (method === "GET" && path === "/api/admin/sources/options") {
    return { status: 200, body: sourceOptions };
  }

  if (method === "POST" && path === "/api/admin/shlokas") {
    return {
      status: 201,
      body: {
        code: "mahabharata-bhishma-1-1",
        displayTitle: "Махабхарата, Бхишма-парва Глава 1 1",
        sourceTitle: "Махабхарата",
        number: "1",
        text: adminShloka.text,
        personalStatus: "available",
      },
    };
  }

  if (
    method === "GET" &&
    path === "/api/admin/shlokas/mahabharata-bhishma-1-1"
  ) {
    return { status: 200, body: adminShloka };
  }

  if (
    method === "PATCH" &&
    path === "/api/admin/shlokas/mahabharata-bhishma-1-1"
  ) {
    return {
      status: 200,
      body: {
        ...adminShloka,
        fullTranslation: "Новый перевод",
        padas: [
          "обновленная первая",
          "обновленная вторая",
          "мамаках пандаваш чайва",
          "ким акурвата санджая",
        ],
        text: "обновленная первая\nобновленная вторая\nмамаках пандаваш чайва\nким акурвата санджая",
      },
    };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}
