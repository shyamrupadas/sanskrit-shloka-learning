import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

const accessTokenStorageKey = "sanskrit-shloka-learning.access-token";
const accountStorageKey = "sanskrit-shloka-learning.account";

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

const adminCatalog = {
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
      code: "empty",
      title: "Пустой источник",
      structureType: "none",
      chapters: [],
      parts: [],
      shlokas: [],
    },
  ],
} satisfies ApiTypes.AdminCatalogDto;

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
  it("validates registration password fields before calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return { status: 200, body: adminSession };
      }

      return successfulApi(request);
    });

    renderAppAt("/register");

    await user.type(await screen.findByLabelText("Email"), "learner@example.com");
    await user.type(screen.getByLabelText("Пароль", { selector: "input" }), "123");
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "123",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Пароль должен быть не короче 6 символов",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Пароль", { selector: "input" }));
    await user.clear(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
    );
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "different-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    expect(
      await screen.findByText("Пароль и подтверждение должны совпадать"),
    ).toHaveAttribute("role", "alert");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the generic login error for invalid credentials", async () => {
    const user = userEvent.setup();
    mockApi(({ method, path }) => {
      if (method === "POST" && path === "/api/auth/login") {
        return {
          status: 401,
          body: {
            code: "INVALID_CREDENTIALS",
            message: "Неверный email или пароль",
          },
        };
      }

      return successfulApi({ method, path });
    });

    renderAppAt("/login");

    await user.type(await screen.findByLabelText("Email"), "learner@example.com");
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "wrong-password",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Неверный email или пароль",
    );
    expect(window.location.pathname).toBe("/login");
  });

  it("toggles the login password field visibility", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);

    renderAppAt("/login");

    const password = (await screen.findByLabelText("Пароль", {
      selector: "input",
    })) as HTMLInputElement;

    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(password.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(password.type).toBe("password");
  });

  it("toggles the register password and confirmation fields together", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);

    renderAppAt("/register");

    const password = (await screen.findByLabelText("Пароль", {
      selector: "input",
    })) as HTMLInputElement;
    const passwordConfirmation = screen.getByLabelText("Подтверждение пароля", {
      selector: "input",
    }) as HTMLInputElement;

    expect(password.type).toBe("password");
    expect(passwordConfirmation.type).toBe("password");

    await user.click(screen.getByRole("button", { name: "Показать пароль" }));

    expect(password.type).toBe("text");
    expect(passwordConfirmation.type).toBe("text");
  });

  it("navigates from successful registration to the empty dashboard", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);

    renderAppAt("/register");

    await user.type(await screen.findByLabelText("Email"), session.account.email);
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.type(
      screen.getByLabelText("Подтверждение пароля", { selector: "input" }),
      "correct-password",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );

    await expectPath("/dashboard");
    expect(await screen.findByText(session.account.email)).toBeInTheDocument();
    expect(await screen.findByText("Пока нет добавленных шлок")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Добавить/ })).toHaveLength(1);
    expect(screen.queryByText(/серия/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/повторить/i)).not.toBeInTheDocument();
  });

  it("navigates from successful login to dashboard and logs out to login", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);

    renderAppAt("/login");

    await user.type(await screen.findByLabelText("Email"), session.account.email);
    await user.type(
      screen.getByLabelText("Пароль", { selector: "input" }),
      "correct-password",
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await expectPath("/dashboard");
    expect(await screen.findByText(session.account.email)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Настройки" }));
    await expectPath("/settings");
    await user.click(screen.getByRole("button", { name: "Выйти" }));

    await expectPath("/login");
    expect(window.localStorage.getItem(accessTokenStorageKey)).toBeNull();
    expect(window.localStorage.getItem(accountStorageKey)).toBeNull();
  });

  it.each(["/dashboard", "/library", "/settings"])(
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

  it("reads and saves hard mode from account settings", async () => {
    const user = userEvent.setup();
    let hardMode = false;
    let updateBody: unknown;
    const fetchMock = mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/account/settings") {
        return { status: 200, body: { hardMode } };
      }
      if (request.method === "PATCH" && request.path === "/api/account/settings") {
        updateBody = request.body;
        hardMode = (request.body as ApiTypes.UpdateAccountSettingsRequest).hardMode;
        return { status: 200, body: { hardMode } };
      }

      return successfulApi(request);
    });
    window.localStorage.setItem(accessTokenStorageKey, session.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(session.account));

    const settingsView = renderAppAt("/settings");

    const hardModeToggle = await screen.findByRole("switch", {
      name: "Интенсивный режим повторения",
    });
    expect(hardModeToggle).not.toBeChecked();
    expect(screen.queryByRole("link", { name: "Админка" })).not.toBeInTheDocument();

    await user.click(hardModeToggle);

    expect(await screen.findByRole("status")).toHaveTextContent("Настройка сохранена");
    expect(hardModeToggle).toBeChecked();
    expect(updateBody).toEqual({ hardMode: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/settings",
      expect.objectContaining({ method: "PATCH" }),
    );

    settingsView.unmount();
    renderAppAt("/settings");

    expect(
      await screen.findByRole("switch", {
        name: "Интенсивный режим повторения",
      }),
    ).toBeChecked();
  });

  it("shows the admin action only to admins and opens the protected catalog", async () => {
    const user = userEvent.setup();
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return { status: 200, body: adminSession };
      }

      return successfulApi(request);
    });
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

    renderAppAt("/settings");

    const adminAction = await screen.findByRole("link", { name: "Админка" });
    expect(adminAction).toHaveAttribute("href", "/admin");
    await user.click(adminAction);

    await expectPath("/admin");
    expect(await screen.findByRole("heading", { name: "Админка" })).toBeInTheDocument();
  });

  it.each(["/admin", "/admin/sources/gita/edit", "/admin/shlokas/gita-chapter-2-2-47/edit", "/admin/sources/new"])(
    "redirects regular users away from direct admin route %s",
    async (path) => {
      mockApi(successfulApi);
      window.localStorage.setItem(accessTokenStorageKey, session.accessToken);
      window.localStorage.setItem(accountStorageKey, JSON.stringify(session.account));

      renderAppAt(path);

      await expectPath("/dashboard");
      expect(await screen.findByText("Пока нет добавленных шлок")).toBeInTheDocument();
    },
  );

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
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

    const sourceView = renderAppAt("/admin/sources/new");

    expect(await screen.findByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
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

    expect(await screen.findByRole("link", { name: "Админка" })).toHaveAttribute("href", "/admin");
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
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

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

  it("shows the protected admin catalog without adding admin to bottom navigation", async () => {
    mockApi(successfulApi);
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

    renderAppAt("/admin");

    expect(await screen.findByRole("heading", { name: "Админка" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Новая шлока" })).toHaveAttribute("href", "/admin/shlokas/new");
    expect(screen.getByRole("link", { name: "Новый источник" })).toHaveAttribute("href", "/admin/sources/new");
    expect(await screen.findByText("Бхагавад-гита")).toBeInTheDocument();
    expect(screen.getByText("gita · 1 глава")).toBeInTheDocument();
    expect(screen.getByText("Глава 2 · 2.47")).toBeInTheDocument();
    expect(screen.getByText("карманй эвадхикарас те ма пхалешу кадачана")).toBeInTheDocument();
    expect(screen.getByText("Пустой источник")).toBeInTheDocument();
    expect(screen.getByText("empty · 0 шлок")).toBeInTheDocument();
    expect(screen.queryByText("Сначала создайте источник")).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation")).queryByText("Админка")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Редактировать источник Бхагавад-гита" })).toHaveAttribute(
      "href",
      "/admin/sources/gita/edit",
    );
    expect(screen.getByRole("link", { name: "Редактировать шлоку 2.47" })).toHaveAttribute(
      "href",
      "/admin/shlokas/gita-chapter-2-2-47/edit",
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
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

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
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

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
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

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

async function expectPath(path: string): Promise<void> {
  await waitFor(() => {
    expect(window.location.pathname).toBe(path);
  });
}

interface MockApiRequest {
  body?: unknown;
  method: string;
  path: string;
}

interface MockApiResponse {
  body?: unknown;
  status: number;
}

type MockApiHandler = (
  request: MockApiRequest,
) => MockApiResponse | Promise<MockApiResponse>;

function mockApi(handler: MockApiHandler) {
  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      const response = await handler({
        body: requestBody,
        method: init?.method ?? "GET",
        path: url.pathname,
      });
      const headers = new Headers();
      let body: BodyInit | null = null;

      if (response.body !== undefined) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(response.body);
      }

      return new Response(body, {
        headers,
        status: response.status,
      });
    },
  );
  const typedFetch = fetchMock as unknown as typeof fetch;

  vi.stubGlobal("fetch", typedFetch);
  Object.defineProperty(window, "fetch", {
    configurable: true,
    value: typedFetch,
    writable: true,
  });

  return fetchMock;
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
          },
        ],
      },
    };
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

  if (method === "GET" && path === "/api/admin/catalog") {
    return { status: 200, body: adminCatalog };
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
