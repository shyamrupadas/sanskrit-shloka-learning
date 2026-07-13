import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

import { App } from "@/app/App";
import { routePaths } from "@/shared/model/routes";
import {
  expectPath,
  mockApi,
  session,
  storeTestSession,
  type MockApiRequest,
  type MockApiResponse,
} from "@/shared/test/harness";

const firstShloka = reviewShloka({
  code: "gita-1-1",
  displayTitle: "Бхагавад-гита 1.1",
  text: "дхарма-кшетре куру-кшетре\nсамавета юютсавах\nмамаках пандавашчаива\nкимакурвата санджая",
});
const secondShloka = reviewShloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
});

describe("app review shloka flow", () => {
  it.each([
    {
      action: "Все правильно",
      path: "self",
      result: "remembered_without_error",
    },
    {
      action: "Сделал ошибку",
      path: "self",
      result: "remembered_with_error",
    },
    {
      action: "Завершить",
      path: "hint",
      result: "remembered_with_hint",
    },
  ] as const)("records $result only after its completion action", async ({
    action,
    path,
    result,
  }) => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    expect(await screen.findByLabelText("Текст скрыт")).toHaveTextContent(
      "Произнесите шлоку по памяти.",
    );
    expect(api.completions).toHaveLength(0);

    if (path === "self") {
      await user.click(screen.getByRole("button", { name: "Вспомнил" }));
    } else {
      await user.click(
        screen.getByRole("button", { name: "Нужна подсказка" }),
      );
      await user.click(screen.getByRole("button", { name: "Вспомнил" }));
    }
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре\s+самавета юютсавах/,
    );
    expect(api.completions).toHaveLength(0);

    if (path === "self") {
      await user.click(
        screen.getByRole("button", { name: "Оценить результат" }),
      );
    }

    await user.click(screen.getByRole("button", { name: action }));

    await expectPath(routePaths.dashboard);
    await waitFor(() => expect(api.completions).toHaveLength(1));
    expect(api.completions[0]?.body).toMatchObject({ result });
    expect(api.completions[0]?.body).toHaveProperty("timeZone");
  });

  it("records forgot when the full text is revealed after both hints", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    await user.click(
      await screen.findByRole("button", { name: "Нужна подсказка" }),
    );
    const firstHint = screen.getByLabelText("Канонический текст шлоки");
    expect(firstHint).toHaveTextContent(/^дхарма-/);
    expect(firstHint).not.toHaveTextContent("самавета юютсавах");

    await user.click(screen.getByRole("button", { name: "Ещё подсказка" }));
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре/,
    );
    expect(api.completions).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Показать весь текст" }),
    );

    expect(
      await screen.findByRole("button", { name: "Дальше" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре\s+самавета юютсавах/,
    );
    expect(api.completions).toHaveLength(1);
    expect(api.completions[0]?.body).toMatchObject({ result: "forgot" });

    await user.click(screen.getByRole("button", { name: "Дальше" }));
    await expectPath(routePaths.dashboard);
  });

  it("starts from the dashboard, advances through its snapshot, and finishes the day", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka, secondShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    const firstCard = await screen.findByRole("article", {
      name: firstShloka.displayTitle,
    });
    await user.click(
      within(firstCard).getByRole("link", {
        name: `Повторить ${firstShloka.displayTitle}`,
      }),
    );

    await expectPath("/library/shlokas/gita-1-1/review");
    expect(await screen.findByText("1 из 2 · без подсказки")).toBeInTheDocument();
    await completeWithoutError(user);

    await expectPath("/library/shlokas/gita-4-7/review");
    expect(await screen.findByText("2 из 2 · без подсказки")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: secondShloka.displayTitle }),
    ).toBeInTheDocument();
    await completeWithoutError(user);

    await expectPath(routePaths.dashboard);
    expect(
      await screen.findByRole("heading", {
        name: "Все повторения на сегодня завершены",
      }),
    ).toBeInTheDocument();
    expect(api.completions.map(({ body }) => body)).toEqual([
      expect.objectContaining({ result: "remembered_without_error" }),
      expect.objectContaining({ result: "remembered_without_error" }),
    ]);
  });

  it("starts from the reviewing library card and exits without side effects", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library?tab=reviewing");

    const card = await screen.findByRole("article", {
      name: firstShloka.displayTitle,
    });
    await user.click(within(card).getByRole("button", { name: "Повторить" }));

    await expectPath("/library/shlokas/gita-1-1/review");
    await user.click(
      await screen.findByRole("button", { name: "Нужна подсказка" }),
    );
    await user.click(screen.getByRole("link", { name: "Дашборд" }));

    await expectPath(routePaths.dashboard);
    expect(api.completions).toHaveLength(0);
    expect(
      await screen.findByRole("article", { name: firstShloka.displayTitle }),
    ).toBeInTheDocument();
  });
});

async function completeWithoutError(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(
    await screen.findByRole("button", { name: "Вспомнил" }),
  );
  await user.click(screen.getByRole("button", { name: "Оценить результат" }));
  await user.click(screen.getByRole("button", { name: "Все правильно" }));
}

function createReviewApi(shlokas: ApiTypes.LibraryShlokaDto[]) {
  const completedCodes = new Set<string>();
  const completions: MockApiRequest[] = [];

  return {
    completions,
    handle(request: MockApiRequest): MockApiResponse {
      if (request.method === "GET" && request.path === "/api/auth/session") {
        return { status: 200, body: session };
      }
      if (request.method === "GET" && request.path === "/api/library") {
        return { status: 200, body: library(shlokas) };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/dashboard/review-shlokas"
      ) {
        const items = shlokas
          .filter((shloka) => !completedCodes.has(shloka.code))
          .map(toDashboardShloka);

        return {
          status: 200,
          body: {
            hasReviewingShlokas: shlokas.length > 0,
            items,
            remainingCount: 0,
            state:
              items.length > 0
                ? "active"
                : completedCodes.size > 0
                  ? "completed"
                  : "empty",
          } satisfies ApiTypes.DashboardReviewShlokaListDto,
        };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/dashboard/learning-shlokas"
      ) {
        return {
          status: 200,
          body: {
            hasLearningShlokas: false,
            items: [],
            remainingCount: 0,
          } satisfies ApiTypes.DashboardLearningShlokaListDto,
        };
      }

      const itemMatch = request.path.match(/^\/api\/library\/items\/([^/]+)$/);
      if (request.method === "GET" && itemMatch) {
        const code = decodeURIComponent(itemMatch[1] ?? "");
        const shloka = shlokas.find((candidate) => candidate.code === code);
        if (shloka) {
          return { status: 200, body: shloka };
        }
      }

      const completionMatch = request.path.match(
        /^\/api\/library\/items\/([^/]+)\/complete-review$/,
      );
      if (request.method === "POST" && completionMatch) {
        const code = decodeURIComponent(completionMatch[1] ?? "");
        completions.push(request);
        completedCodes.add(code);
        const body = request.body as ApiTypes.CompleteReviewRequest;

        return {
          status: 201,
          body: {
            completedAt: "2026-07-12T12:00:00.000Z",
            result: body.result,
            shlokaCode: code,
            userDay: "2026-07-12",
          } satisfies ApiTypes.CompletedReviewDto,
        };
      }

      throw new Error(
        `Unhandled test API request: ${request.method} ${request.path}`,
      );
    },
  };
}

function library(
  allShlokas: ApiTypes.LibraryShlokaDto[],
): ApiTypes.LibraryResponseDto {
  return {
    allShlokas,
    defaultTab: "reviewing",
    tabs: [
      {
        emptyDescription: "Добавьте первую шлоку из общей библиотеки.",
        emptyTitle: "Пока нет шлок в повторении",
        id: "reviewing",
        label: "Повторяю",
      },
      {
        emptyDescription: "Выберите шлоку из общего списка.",
        emptyTitle: "Пока нет шлок для заучивания",
        id: "learning",
        label: "Буду учить",
      },
      {
        emptyDescription: "Опубликованные шлоки появятся здесь.",
        emptyTitle: "Библиотека пока пуста",
        id: "all",
        label: "Все",
      },
    ],
  };
}

function reviewShloka(
  overrides: Partial<ApiTypes.LibraryShlokaDto> = {},
): ApiTypes.LibraryShlokaDto {
  return {
    code: "shloka-1",
    displayTitle: "Шлока 1",
    number: "1",
    personalStatus: "reviewing",
    sourceTitle: "Источник",
    text: "первая строка\nвторая строка\nтретья строка\nчетвертая строка",
    ...overrides,
  };
}

function toDashboardShloka(
  shloka: ApiTypes.LibraryShlokaDto,
): ApiTypes.DashboardShlokaDto {
  return {
    code: shloka.code,
    displayTitle: shloka.displayTitle,
    text: shloka.text,
  };
}

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}
