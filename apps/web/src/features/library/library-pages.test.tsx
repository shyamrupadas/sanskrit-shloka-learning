import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { routePaths, routeSegments } from "@/shared/model/routes";
import {
  expectPath,
  mockApi,
  renderWithTestProviders,
  session,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

import { LibraryPage } from "./library.page";
import { ShlokaPage } from "./shloka.page";

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
    fullTranslation: "Так обратился Хришикеша.",
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

describe("library pages", () => {
  it("shows the loading and load error states", async () => {
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/library") {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    storeTestSession(session);

    const loadingView = renderLibraryAt(routePaths.library);

    expect(
      await screen.findByRole("heading", { name: "Библиотека" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Загрузка...")).toBeInTheDocument();

    loadingView.unmount();
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/library") {
        return {
          status: 500,
          body: {
            code: "LIBRARY_UNAVAILABLE",
            message: "Библиотека временно недоступна",
          },
        };
      }

      throw new Error(`Unhandled test API request: ${method} ${path}`);
    });
    renderLibraryAt(routePaths.library);

    expect(
      await screen.findByText("Библиотека временно недоступна"),
    ).toBeInTheDocument();
    expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
  });

  it("supports tabs, search, empty states, and status changes", async () => {
    const user = userEvent.setup();
    const libraryShlokas: ApiTypes.LibraryShlokaDto[] =
      sortedLibraryShlokas.map((shloka) => ({ ...shloka }));
    const updateRequests: Array<{ body: unknown; path: string }> = [];
    let libraryRequestCount = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/library") {
        libraryRequestCount += 1;
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
        updateRequests.push({ body: request.body, path: request.path });
        const shlokaCode = itemMatch[1];
        if (!shlokaCode) {
          throw new Error(
            `Missing shloka code in request path: ${request.path}`,
          );
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

      return successfulLibraryApi(request);
    });
    storeTestSession(session);
    renderLibraryAt(routePaths.library);

    expect(
      await screen.findByRole("tab", { name: "Повторяю" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText("Пока нет шлок в повторении"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Добавьте первую шлоку из общей библиотеки, чтобы начать повторение.",
      ),
    ).toBeInTheDocument();

    const learningTab = screen.getByRole("tab", { name: "Буду учить" });
    await user.click(learningTab);
    expect(learningTab).toHaveAttribute("aria-selected", "true");
    expect(
      await screen.findByText("Бхагавад-гита, Глава 2 2.10"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Так обратился Хришикеша."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Пока нет шлок для заучивания"),
    ).not.toBeInTheDocument();

    const allTab = screen.getByRole("tab", { name: "Все" });
    await user.click(allTab);
    expect(allTab).toHaveAttribute("aria-selected", "true");
    const first = await screen.findByText("Амрита 1");
    const second = screen.getByText("Бхагавад-гита, Глава 1 2");
    const third = screen.getByText("Бхагавад-гита, Глава 2 2.10");
    expect(
      first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      second.compareDocumentPosition(third) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText("первая кириллическая пада"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("вторая кириллическая пада"),
    ).not.toBeInTheDocument();

    const amritaCard = cardForText("Амрита 1");
    expect(
      within(amritaCard).getByLabelText("Статус: Доступна"),
    ).toBeInTheDocument();
    expect(
      within(amritaCard).getByRole("button", { name: "Буду учить" }),
    ).toBeInTheDocument();
    const learningCard = cardForText("Бхагавад-гита, Глава 2 2.10");
    expect(
      within(learningCard).getByLabelText("Статус: Буду учить"),
    ).toBeInTheDocument();
    expect(
      within(learningCard).getByRole("button", { name: "Убрать" }),
    ).toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Поиск" });
    await user.type(search, "Амрита");
    expect(screen.getByText("Амрита 1")).toBeInTheDocument();
    expect(
      screen.queryByText("Бхагавад-гита, Глава 1 2"),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "2.10");
    expect(
      screen.getByText("Бхагавад-гита, Глава 2 2.10"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Амрита 1")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "нет совпадений");
    expect(await screen.findByText("Шлоки не найдены")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "В библиотеку" }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.click(
      within(cardForText("Амрита 1")).getByRole("button", {
        name: "Буду учить",
      }),
    );

    await waitFor(() => {
      expect(updateRequests).toContainEqual({
        body: { personalStatus: "learning" },
        path: "/api/library/items/amrita-1",
      });
    });
    await user.click(screen.getByRole("tab", { name: "Буду учить" }));
    expect(await screen.findByText("Амрита 1")).toBeInTheDocument();

    await user.click(
      within(cardForText("Амрита 1")).getByRole("button", { name: "Убрать" }),
    );

    await waitFor(() => {
      expect(updateRequests).toContainEqual({
        body: { personalStatus: "available" },
        path: "/api/library/items/amrita-1",
      });
    });
    await user.click(
      within(cardForText("Бхагавад-гита, Глава 2 2.10")).getByRole("button", {
        name: "Убрать",
      }),
    );
    expect(
      await screen.findByText("Пока нет шлок для заучивания"),
    ).toBeInTheDocument();
    expect(libraryRequestCount).toBeGreaterThanOrEqual(4);
  });

  it("opens a minimal shloka page from the card body and arrow", async () => {
    const user = userEvent.setup();
    mockApi(successfulLibraryApi);
    storeTestSession(session);
    renderLibraryAt(routePaths.library);

    await user.click(await screen.findByRole("tab", { name: "Все" }));
    await user.click(
      screen.getByRole("link", {
        name: "карманй эвадхикарас те",
      }),
    );

    await expectPath("/library/shlokas/gita-chapter-2-2-47");
    expect(
      await screen.findByRole("heading", {
        name: "Бхагавад-гита, Глава 2 2.47",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Канонический текст шлоки"),
    ).toHaveTextContent(
      /карманй эвадхикарас те\s+ма пхалешу кадачана\s+ма кармапхалахетур бхур\s+ма те санго сту акармани/,
    );
    expect(
      screen.queryByText("Только на действие у тебя право."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Библиотека" }));
    await expectPath(routePaths.library);
    await user.click(await screen.findByRole("tab", { name: "Все" }));
    await user.click(
      screen.getByRole("link", {
        name: "Открыть шлоку Бхагавад-гита, Глава 2 2.47",
      }),
    );

    await expectPath("/library/shlokas/gita-chapter-2-2-47");
    expect(
      await screen.findByRole("heading", {
        name: "Бхагавад-гита, Глава 2 2.47",
      }),
    ).toBeInTheDocument();
  });
});

function renderLibraryAt(path: string) {
  window.history.pushState({}, "", path);
  const router = createLibraryTestRouter();

  return renderWithTestProviders(<RouterProvider router={router} />);
}

function createLibraryTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const libraryRoute = createRoute({
    component: LibraryPage,
    getParentRoute: () => rootRoute,
    path: routeSegments.library,
  });
  const shlokaRoute = createRoute({
    component: ShlokaTestRoute,
    getParentRoute: () => rootRoute,
    path: routeSegments.libraryShloka,
  });

  function ShlokaTestRoute() {
    const { shlokaCode } = shlokaRoute.useParams();

    return <ShlokaPage shlokaCode={shlokaCode} />;
  }

  return createRouter({
    routeTree: rootRoute.addChildren([libraryRoute, shlokaRoute]),
  });
}

function cardForText(text: string): HTMLElement {
  return screen.getByRole("article", { name: text });
}

function successfulLibraryApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
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

  if (
    method === "GET" &&
    path === "/api/library/items/gita-chapter-2-2-47"
  ) {
    return { status: 200, body: shlokaDetail };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}
