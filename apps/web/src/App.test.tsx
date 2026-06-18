import { render, screen, waitFor } from "@testing-library/react";
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

    await user.click(screen.getByRole("button", { name: "Выйти" }));

    await expectPath("/login");
    expect(window.localStorage.getItem(accessTokenStorageKey)).toBeNull();
    expect(window.localStorage.getItem(accountStorageKey)).toBeNull();
  });

  it.each(["/dashboard", "/library"])(
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

  it("redirects regular users away from direct admin routes", async () => {
    mockApi(successfulApi);
    window.localStorage.setItem(accessTokenStorageKey, session.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(session.account));

    renderAppAt("/admin/sources/new");

    await expectPath("/dashboard");
    expect(await screen.findByText("Пока нет добавленных шлок")).toBeInTheDocument();
  });

  it("lets admins create a source and shloka through protected forms", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return { status: 200, body: adminSession };
      }

      return successfulApi(request);
    });
    window.localStorage.setItem(accessTokenStorageKey, adminSession.accessToken);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(adminSession.account));

    const sourceView = renderAppAt("/admin/sources/new");

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

    await screen.findByLabelText("Источник");
    await user.selectOptions(screen.getByLabelText("Источник"), "gita");
    await user.selectOptions(screen.getByLabelText("Глава"), "chapter-2");
    await user.type(screen.getByLabelText("Текст"), "2.47");
    await user.type(screen.getByLabelText("Пада 1"), "карманй эвадхикарас те");
    await user.type(screen.getByLabelText("Пада 2"), "ма пхалешу кадачана");
    await user.click(screen.getByRole("button", { name: "Создать шлоку" }));

    expect(await screen.findByText("Шлока создана")).toHaveAttribute("role", "status");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/shlokas",
      expect.objectContaining({
        method: "POST",
      }),
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
      const response = await handler({
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

  return {
    status: 404,
    body: {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${path}`,
    },
  };
}
