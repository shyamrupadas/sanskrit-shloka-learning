import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import {
  expectPath,
  expectStoredSessionCleared,
  mockApi,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

import { App } from "./App";

const session = {
  account: {
    id: "account-1",
    email: "learner@example.com",
    roles: [],
  },
  accessToken: "access-token-1",
} satisfies ApiTypes.AuthSessionDto;

const adminSession = {
  account: {
    id: "account-2",
    email: "admin@example.com",
    roles: ["admin"],
  },
  accessToken: "access-token-2",
} satisfies ApiTypes.AuthSessionDto;

const emptyDashboard = {
  hasPersonalShlokas: false,
  showStreak: false,
  showReviewBlock: false,
  primaryAction: {
    label: "Добавить",
    target: "/library",
  },
} satisfies ApiTypes.EmptyDashboardDto;

const defaultSettings = {
  hardMode: false,
} satisfies ApiTypes.AccountSettingsDto;

const emptyLibrary = {
  defaultTab: "reviewing",
  allShlokas: [],
  tabs: [
    {
      id: "reviewing",
      label: "Повторяю",
      emptyTitle: "Пока нет шлок в повторении",
      emptyDescription:
        "Добавьте первую шлоку из общей библиотеки, чтобы начать повторение.",
    },
    {
      id: "learning",
      label: "Буду учить",
      emptyTitle: "Пока нет шлок для заучивания",
      emptyDescription:
        "Выберите шлоку из общего списка и добавьте ее в личную библиотеку.",
    },
    {
      id: "all",
      label: "Все",
      emptyTitle: "Библиотека пока пуста",
      emptyDescription:
        "Опубликованные шлоки появятся здесь после наполнения каталога.",
    },
  ],
} satisfies ApiTypes.LibraryResponseDto;

const shlokaDetail = {
  code: "gita-chapter-2-2-47",
  displayTitle: "Бхагавад-гита, Глава 2 2.47",
  sourceTitle: "Бхагавад-гита",
  number: "2.47",
  text: "карманй эвадхикарас те\nма пхалешу кадачана\nма кармапхалахетур бхур\nма те санго сту акармани",
  personalStatus: "learning",
  fullTranslation: "Только на действие у тебя право.",
} satisfies ApiTypes.LibraryShlokaDto;

const sourceOptions = {
  sources: [
    {
      code: "gita",
      title: "Бхагавад-гита",
      structureType: "chapters",
      chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
      parts: [],
    },
  ],
} satisfies ApiTypes.AdminSourceOptionsDto;

const adminSource = {
  code: "gita",
  title: "Бхагавад-гита",
  description: "Диалог Кришны и Арджуны",
  structureType: "chapters",
  chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
  parts: [],
} satisfies ApiTypes.AdminSourceDto;

const adminShloka = {
  code: "gita-chapter-2-2-47",
  sourceCode: "gita",
  sourceTitle: "Бхагавад-гита",
  chapterCode: "chapter-2",
  chapterTitle: "Глава 2",
  number: "2.47",
  text: "карманй эвадхикарас те\nма пхалешу кадачана\nма кармапхалахетур бхур\nма те санго сту акармани",
  padas: ["карманй эвадхикарас те", "ма пхалешу кадачана", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
  fullTranslation: "Только на действие у тебя право.",
} satisfies ApiTypes.AdminShlokaDto;

describe("App auth and empty shell", () => {
  it("redirects the root route by session state", async () => {
    mockApi(successfulApi);

    const unauthenticatedView = renderAppAt("/");

    await expectPath("/login");

    unauthenticatedView.unmount();
    storeTestSession(session);

    renderAppAt("/");

    await expectPath("/dashboard");
    const navigation = await screen.findByRole("navigation");
    expect(
      within(navigation).getByRole("link", { name: "Дашборд" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each(["/login", "/register"])(
    "redirects authenticated auth route %s to the dashboard",
    async (path) => {
      mockApi(successfulApi);
      storeTestSession(session);

      renderAppAt(path);

      await expectPath("/dashboard");
      const navigation = await screen.findByRole("navigation");
      expect(
        within(navigation).getByRole("link", { name: "Дашборд" }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  it("opens the authenticated dashboard layout after login", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);

    renderAppAt("/login");

    await user.type(
      await screen.findByLabelText("Email"),
      session.account.email,
    );
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await expectPath("/dashboard");
    const navigation = await screen.findByRole("navigation");
    expect(
      within(navigation).getByRole("link", { name: "Дашборд" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens settings inside the authenticated layout", async () => {
    mockApi(successfulApi);
    storeTestSession(session);

    renderAppAt("/settings");

    expect(
      await screen.findByRole("heading", { name: "Настройки" }),
    ).toBeInTheDocument();
    expect(screen.getByText(session.account.email)).toBeInTheDocument();
    const navigation = screen.getByRole("navigation");
    expect(
      within(navigation).getByRole("link", { name: "Настройки" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("clears an invalid saved session and redirects to login", async () => {
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return {
          status: 401,
          body: { code: "UNAUTHORIZED", message: "Сессия недействительна" },
        };
      }

      return successfulApi(request);
    });
    storeTestSession(session);

    renderAppAt("/dashboard");

    await expectPath("/login");
    expectStoredSessionCleared();
  });

  it.each(["/dashboard", "/library", "/settings", "/admin"])(
    "redirects unauthenticated %s visits to the login/register flow",
    async (path) => {
      const user = userEvent.setup();
      mockApi(successfulApi);

      renderAppAt(path);

      await expectPath("/login");
      await user.click(
        screen.getByRole("link", { name: "Зарегистрироваться" }),
      );

      await expectPath("/register");
      expect(
        screen.getByRole("button", { name: "Зарегистрироваться" }),
      ).toBeInTheDocument();
    },
  );

  it("opens library routes inside the authenticated layout", async () => {
    mockApi(successfulApi);
    storeTestSession(session);

    const libraryView = renderAppAt("/library");

    expect(
      await screen.findByRole("heading", { name: "Библиотека" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation")).getByRole("link", {
        name: "Библиотека",
      }),
    ).toHaveAttribute("aria-current", "page");

    libraryView.unmount();
    renderAppAt("/library/shlokas/gita-chapter-2-2-47");

    expect(
      await screen.findByRole("heading", {
        name: "Бхагавад-гита, Глава 2 2.47",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation")).getByRole("link", {
        name: "Библиотека",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each(["/admin", "/admin/sources/gita/edit", "/admin/shlokas/gita-chapter-2-2-47/edit", "/admin/sources/new"])(
    "redirects regular users away from direct admin route %s",
    async (path) => {
      mockApi(successfulApi);
      storeTestSession(session);

      renderAppAt(path);

      await expectPath("/dashboard");
      const navigation = await screen.findByRole("navigation");
      expect(
        within(navigation).getByRole("link", { name: "Дашборд" }),
      ).toHaveAttribute("aria-current", "page");
    },
  );

  it("opens the catalog inside the existing admin guard and layout", async () => {
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/admin/catalog"
      ) {
        return { status: 200, body: { sources: [] } };
      }

      return successfulApi(request);
    });
    storeTestSession(adminSession);

    renderAppAt("/admin");

    expect(
      await screen.findByRole("heading", { name: "Админка" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("lets admins create a source and shloka through protected forms", async () => {
    const user = userEvent.setup();
    let createShlokaBody: unknown;
    const fetchMock = mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return { status: 200, body: adminSession };
      }
      if (request.method === "POST" && request.path === "/api/admin/shlokas") {
        createShlokaBody = request.body;
      }

      return successfulApi(request);
    });
    storeTestSession(adminSession);

    const sourceView = renderAppAt("/admin/sources/new");

    expect(await screen.findByRole("link", { name: "Назад" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute("data-size", "icon-lg");
    expect(screen.getByRole("link", { name: "Назад" })).toHaveClass("size-12");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await user.type(await screen.findByLabelText("Код источника"), "gita");
    await user.type(screen.getByLabelText("Название"), "Бхагавад-гита");
    await user.selectOptions(screen.getByLabelText("Структура"), "chapters");
    await user.type(screen.getByLabelText("Код главы 1"), "chapter-2");
    await user.type(screen.getByLabelText("Название главы 1"), "Глава 2");
    await user.click(screen.getByRole("button", { name: "Создать источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник создан");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/sources",
      expect.objectContaining({
        method: "POST",
      }),
    );

    sourceView.unmount();
    renderAppAt("/admin/shlokas/new");

    expect(await screen.findByRole("link", { name: "Назад" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await screen.findByLabelText("Источник");
    await user.selectOptions(screen.getByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Номер шлоки"), "2.47");
    await user.type(screen.getByLabelText("Пада 1"), "карманй эвадхикарас те");
    await user.type(screen.getByLabelText("Пада 2"), "ма пхалешу кадачана");
    await user.type(screen.getByLabelText("Пада 3"), "ма кармапхалахетур бхур");
    await user.type(screen.getByLabelText("Пада 4"), "ма те санго сту акармани");
    const fullTranslation = screen.getByLabelText("Полный перевод");
    expect(fullTranslation.tagName).toBe("TEXTAREA");
    await user.type(fullTranslation, "Полный перевод шлоки");
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByText("Шлока создана")).toHaveAttribute("role", "status");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/shlokas",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(createShlokaBody).toEqual({
      sourceCode: "gita",
      chapterCode: "chapter-2",
      number: "2.47",
      padas: ["карманй эвадхикарас те", "ма пхалешу кадачана", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
      fullTranslation: "Полный перевод шлоки",
    });
  });

  it("blocks shloka creation when any pada is blank", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(successfulApi);
    storeTestSession(adminSession);

    renderAppAt("/admin/shlokas/new");

    await screen.findByLabelText("Источник");
    await user.selectOptions(screen.getByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Номер шлоки"), "2.47");
    await user.type(screen.getByLabelText("Пада 1"), "карманй эвадхикарас те");
    await user.type(screen.getByLabelText("Пада 2"), "ма пхалешу кадачана");
    await user.type(screen.getByLabelText("Пада 4"), "ма те санго сту акармани");
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Заполните все четыре пады шлоки");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/shlokas",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lets admins edit source mutable fields while keeping source and chapter codes readonly", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockApi((request) => {
      if (request.method === "PATCH" && request.path === "/api/admin/sources/gita") {
        updateBody = request.body;
      }

      return successfulApi(request);
    });
    storeTestSession(adminSession);

    renderAppAt("/admin/sources/gita/edit");

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
    await user.type(screen.getByLabelText("Код главы 2"), "chapter-3");
    await user.type(screen.getByLabelText("Название главы 2"), "Третья глава");
    await user.click(screen.getByRole("button", { name: "Сохранить источник" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Источник сохранен");
    expect(updateBody).toEqual({
      title: "Гита",
      description: "Новое описание",
      chapters: [
        { code: "chapter-2", title: "Вторая глава", order: 1 },
        { code: "chapter-3", title: "Третья глава", order: 2 },
      ],
    });
  });

  it("lets admins edit shloka padas and translation while showing immutable reference fields", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    mockApi((request) => {
      if (request.method === "PATCH" && request.path === "/api/admin/shlokas/gita-chapter-2-2-47") {
        updateBody = request.body;
      }

      return successfulApi(request);
    });
    storeTestSession(adminSession);

    renderAppAt("/admin/shlokas/gita-chapter-2-2-47/edit");

    expect(
      await screen.findByText("Изменение канонического текста затронет всех пользователей общей библиотеки."),
    ).toBeInTheDocument();
    expect((screen.getByLabelText("Код шлоки") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Источник") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Глава") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText("Номер шлоки") as HTMLInputElement).readOnly).toBe(true);

    await user.clear(screen.getByLabelText("Пада 1"));
    await user.type(screen.getByLabelText("Пада 1"), "обновленная первая");
    await user.clear(screen.getByLabelText("Пада 2"));
    await user.type(screen.getByLabelText("Пада 2"), "обновленная вторая");
    await user.clear(screen.getByLabelText("Полный перевод"));
    await user.type(screen.getByLabelText("Полный перевод"), "Новый перевод");
    await user.click(screen.getByRole("button", { name: "Сохранить шлоку" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Шлока сохранена");
    expect(updateBody).toEqual({
      padas: ["обновленная первая", "обновленная вторая", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
      fullTranslation: "Новый перевод",
    });
  });

  it("blocks shloka edits when any pada has only whitespace", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi(successfulApi);
    storeTestSession(adminSession);

    renderAppAt("/admin/shlokas/gita-chapter-2-2-47/edit");

    await screen.findByLabelText("Пада 3");
    await user.clear(screen.getByLabelText("Пада 3"));
    await user.type(screen.getByLabelText("Пада 3"), "   ");
    await user.click(screen.getByRole("button", { name: "Сохранить шлоку" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Заполните все четыре пады шлоки");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/shlokas/gita-chapter-2-2-47",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function successfulApi({ method, path }: MockApiRequest): MockApiResponse {
  if (method === "POST" && path === "/api/auth/register") {
    return { status: 201, body: session };
  }

  if (method === "POST" && path === "/api/auth/login") {
    return { status: 200, body: session };
  }

  if (method === "GET" && path === "/api/auth/session") {
    return { status: 200, body: session };
  }

  if (method === "POST" && path === "/api/auth/logout") {
    return { status: 204 };
  }

  if (method === "GET" && path === "/api/dashboard") {
    return { status: 200, body: emptyDashboard };
  }

  if (method === "GET" && path === "/api/account/settings") {
    return { status: 200, body: defaultSettings };
  }

  if (method === "PATCH" && path === "/api/account/settings") {
    return { status: 200, body: defaultSettings };
  }

  if (method === "GET" && path === "/api/library") {
    return {
      status: 200,
      body: {
        ...emptyLibrary,
        allShlokas: [
          {
            code: "gita-chapter-2-2-47",
            displayTitle: "Бхагавад-гита, Глава 2 2.47",
            sourceTitle: "Бхагавад-гита",
            number: "2.47",
            text: "карманй эвадхикарас те\nма пхалешу кадачана",
            personalStatus: "available",
          },
        ],
      },
    };
  }

  if (method === "GET" && path === "/api/library/items/gita-chapter-2-2-47") {
    return { status: 200, body: shlokaDetail };
  }

  if (method === "POST" && path === "/api/admin/sources") {
    return {
      status: 201,
      body: sourceOptions.sources[0],
    };
  }

  if (method === "GET" && path === "/api/admin/sources/options") {
    return { status: 200, body: sourceOptions };
  }

  if (method === "GET" && path === "/api/admin/sources/gita") {
    return { status: 200, body: adminSource };
  }

  if (method === "PATCH" && path === "/api/admin/sources/gita") {
    return {
      status: 200,
      body: {
        ...adminSource,
        title: "Гита",
        description: "Новое описание",
        chapters: [
          { code: "chapter-2", title: "Вторая глава", order: 1 },
          { code: "chapter-3", title: "Третья глава", order: 2 },
        ],
      },
    };
  }

  if (method === "POST" && path === "/api/admin/shlokas") {
    return {
      status: 201,
      body: {
        code: "gita-chapter-2-2-47",
        displayTitle: "Бхагавад-гита, Глава 2 2.47",
        sourceTitle: "Бхагавад-гита",
        number: "2.47",
        text: "карманй эвадхикарас те\nма пхалешу кадачана",
        personalStatus: "available",
      },
    };
  }

  if (method === "GET" && path === "/api/admin/shlokas/gita-chapter-2-2-47") {
    return { status: 200, body: adminShloka };
  }

  if (method === "PATCH" && path === "/api/admin/shlokas/gita-chapter-2-2-47") {
    return {
      status: 200,
      body: {
        ...adminShloka,
        text: "обновленная первая\nобновленная вторая\nма кармапхалахетур бхур\nма те санго сту акармани",
        padas: ["обновленная первая", "обновленная вторая", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
        fullTranslation: "Новый перевод",
      },
    };
  }

  return {
    status: 404,
    body: {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${path}`,
    },
  };
}
