import { render, screen, waitFor, within } from "@testing-library/react";
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

const sortedLibraryShlokas = [
  {
    code: "amrita-1",
    displayTitle: "Амрита 1",
    sourceTitle: "Амрита",
    number: "1",
    text: "первая кириллическая пада\nвторая кириллическая пада",
    personalStatus: "available",
  },
  {
    code: "gita-chapter-1-2",
    displayTitle: "Бхагавад-гита, Глава 1 2",
    sourceTitle: "Бхагавад-гита",
    number: "2",
    text: "дхарма-кшетре куру-кшетре\nсамавета юютсавах",
    personalStatus: "available",
  },
  {
    code: "gita-chapter-2-10",
    displayTitle: "Бхагавад-гита, Глава 2 2.10",
    sourceTitle: "Бхагавад-гита",
    number: "2.10",
    text: "там увача хришикешах\nпрахасанн ива бхарата",
    personalStatus: "learning",
  },
] satisfies ApiTypes.LibraryShlokaDto[];

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

  it("shows library tabs, search, personal statuses, and to-learn actions", async () => {
    const user = userEvent.setup();
    const libraryShlokas: ApiTypes.LibraryShlokaDto[] = sortedLibraryShlokas.map((shloka) => ({ ...shloka }));
    const updateRequests: unknown[] = [];
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/library") {
        return {
          status: 200,
          body: {
            ...emptyLibrary,
            allShlokas: libraryShlokas,
          },
        };
      }

      const itemMatch = request.path.match(/^\/api\/library\/items\/([^/]+)$/);
      if (request.method === "PATCH" && itemMatch) {
        updateRequests.push(request.body);
        const shlokaCode = itemMatch[1];
        if (!shlokaCode) {
          throw new Error(`Missing shloka code in request path: ${request.path}`);
        }
        const shloka = libraryShlokas.find(
          (candidate) => candidate.code === decodeURIComponent(shlokaCode),
        );
        if (!shloka) {
          return {
            status: 404,
            body: { code: "NOT_FOUND", message: "Шлока не найдена" },
          };
        }
        shloka.personalStatus = (
          request.body as ApiTypes.UpdateLibraryItemRequest
        ).personalStatus;
        return { status: 200, body: shloka };
      }

      return successfulApi(request);
    });
    storeTestSession(session);

    renderAppAt("/library");

    expect(await screen.findByText("Пока нет шлок в повторении")).toBeInTheDocument();
    expect(screen.getByText("Добавьте первую шлоку из общей библиотеки, чтобы начать повторение.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Буду учить" }));
    expect(await screen.findByText("Бхагавад-гита, Глава 2 2.10")).toBeInTheDocument();
    expect(screen.queryByText("Пока нет шлок для заучивания")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Все" }));
    const first = await screen.findByText("Амрита 1");
    const second = screen.getByText("Бхагавад-гита, Глава 1 2");
    const third = screen.getByText("Бхагавад-гита, Глава 2 2.10");
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("первая кириллическая пада / вторая кириллическая пада")).toBeInTheDocument();

    const amritaCard = cardForText("Амрита 1");
    expect(within(amritaCard).getByText("Доступна")).toBeInTheDocument();
    expect(within(amritaCard).getByRole("button", { name: "Буду учить" })).toBeInTheDocument();
    const learningCard = cardForText("Бхагавад-гита, Глава 2 2.10");
    expect(within(learningCard).getByText("Буду учить")).toBeInTheDocument();
    expect(within(learningCard).getByRole("button", { name: "Убрать" })).toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Поиск" });
    await user.type(search, "Амрита");
    expect(screen.getByText("Амрита 1")).toBeInTheDocument();
    expect(screen.queryByText("Бхагавад-гита, Глава 1 2")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "2.10");
    expect(screen.getByText("Бхагавад-гита, Глава 2 2.10")).toBeInTheDocument();
    expect(screen.queryByText("Амрита 1")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "нет совпадений");
    expect(await screen.findByText("Шлоки не найдены")).toBeInTheDocument();

    await user.clear(search);
    await user.click(within(cardForText("Амрита 1")).getByRole("button", { name: "Буду учить" }));

    await waitFor(() => {
      expect(updateRequests).toContainEqual({ personalStatus: "learning" });
    });
    await user.click(screen.getByRole("tab", { name: "Буду учить" }));
    expect(await screen.findByText("Амрита 1")).toBeInTheDocument();

    await user.click(within(cardForText("Амрита 1")).getByRole("button", { name: "Убрать" }));

    await waitFor(() => {
      expect(updateRequests).toContainEqual({ personalStatus: "available" });
    });
    await user.click(within(cardForText("Бхагавад-гита, Глава 2 2.10")).getByRole("button", { name: "Убрать" }));
    expect(await screen.findByText("Пока нет шлок для заучивания")).toBeInTheDocument();
  });

  it("opens a minimal shloka page from the library card body and transition arrow", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);
    storeTestSession(session);

    renderAppAt("/library");

    await user.click(await screen.findByRole("tab", { name: "Все" }));
    await user.click(screen.getByRole("link", { name: "карманй эвадхикарас те / ма пхалешу кадачана" }));

    await expectPath("/library/shlokas/gita-chapter-2-2-47");
    expect(await screen.findByRole("heading", { name: "Бхагавад-гита, Глава 2 2.47" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "В библиотеку" }));
    await expectPath("/library");
    await user.click(await screen.findByRole("tab", { name: "Все" }));
    await user.click(screen.getByRole("link", { name: "Открыть шлоку Бхагавад-гита, Глава 2 2.47" }));

    await expectPath("/library/shlokas/gita-chapter-2-2-47");
    expect(await screen.findByRole("heading", { name: "Бхагавад-гита, Глава 2 2.47" })).toBeInTheDocument();
  });

  it("shows the direct shloka route with Cyrillic text, return link, mobile shell, and no advanced details", async () => {
    const user = userEvent.setup();
    mockApi(successfulApi);
    storeTestSession(session);

    renderAppAt("/library/shlokas/gita-chapter-2-2-47");

    expect(await screen.findByRole("heading", { name: "Бхагавад-гита, Глава 2 2.47" })).toBeInTheDocument();
    expect(screen.getByText("Бхагавад-гита · 2.47")).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /карманй эвадхикарас те\s+ма пхалешу кадачана\s+ма кармапхалахетур бхур\s+ма те санго сту акармани/,
    );

    const backLink = screen.getByRole("link", { name: "В библиотеку" });
    expect(backLink).toHaveAttribute("href", "/library");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Библиотека" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Буду учить")).not.toBeInTheDocument();
    expect(screen.queryByText("Доступна")).not.toBeInTheDocument();
    expect(screen.queryByText("Только на действие у тебя право.")).not.toBeInTheDocument();
    expect(screen.queryByText(/послов/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Буду учить" })).not.toBeInTheDocument();

    await user.click(backLink);
    await expectPath("/library");
    expect(await screen.findByRole("heading", { name: "Библиотека" })).toBeInTheDocument();
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

  it("shows the protected admin catalog with a back link and without bottom navigation", async () => {
    mockApi(successfulApi);
    storeTestSession(adminSession);

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
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
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

function cardForText(text: string): HTMLElement {
  const element = screen.getByText(text);
  const card = element.closest('[data-slot="card"]');
  if (!(card instanceof HTMLElement)) {
    throw new Error(`Card not found for text: ${text}`);
  }
  return card;
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
