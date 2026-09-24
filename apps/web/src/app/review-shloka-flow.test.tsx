import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it, vi } from "vitest";

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
  fullTranslation: "Перевод первой шлоки.",
  text: "дхарма-кшетре куру-кшетре\nсамавета юютсавах\nмамаках пандавашчаива\nкимакурвата санджая",
});
const secondShloka = reviewShloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
  fullTranslation: "Перевод следующей шлоки.",
});

describe("app review shloka flow", () => {
  it.each(([
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
  ] as const).flatMap((scenario) =>
    [false, true].map((hasNext) => ({ ...scenario, hasNext })),
  ))("records $result and finishes with hasNext=$hasNext", async ({
    action,
    hasNext,
    path,
    result,
  }) => {
    const user = userEvent.setup();
    const api = createReviewApi(hasNext ? [firstShloka, secondShloka] : [firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Повторение" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: firstShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Текст скрыт")).toHaveTextContent(
      /^Текст скрыт$/,
    );
    expect(screen.getByText("произнесите по памяти")).toBeInTheDocument();
    expect(api.completions).toHaveLength(0);

    if (path === "self") {
      await user.click(screen.getByRole("button", { name: "Вспомнил" }));
    } else {
      await user.click(
        screen.getByRole("button", { name: "Нужна подсказка" }),
      );
      await user.click(screen.getByRole("button", { name: "Вспомнил" }));
      expect(screen.queryByRole("button", {
        name: "Почему важно оценивать честно",
      })).not.toBeInTheDocument();
    }
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре\s+самавета юютсавах/,
    );
    expect(api.completions).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Перевод" })).toHaveTextContent(
      firstShloka.fullTranslation!,
    );

    await user.click(screen.getByRole("button", { name: action }));

    if (hasNext) {
      expect(
        await screen.findByRole("heading", { name: "Повторение завершено" }),
      ).toBeInTheDocument();
      await expectPath("/library/shlokas/gita-1-1/review");
      expect(
        screen.getByText(
          `Результат повторения шлоки «${firstShloka.displayTitle}» сохранён.`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Повторить следующую" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Закончить" }));
    }
    await expectPath(routePaths.dashboard);
    expect(
      screen.queryByRole("heading", { name: "Повторение завершено" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(api.completions).toHaveLength(1));
    expect(api.completions[0]?.body).toMatchObject({ result });
    expect(api.completions[0]?.body).toHaveProperty("timeZone");
    expect(api.completions).toHaveLength(1);
  });

  it("opens the assessment explanation on click and closes on repeat click, Escape and outside click", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    await user.click(await screen.findByRole("button", { name: "Вспомнил" }));
    expect(screen.getByText("оцените себя честно")).toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "Почему важно оценивать честно",
    });
    expect(screen.queryByText(/Оцените себя честно — алгоритм/)).not.toBeInTheDocument();

    await user.click(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Оцените себя честно — алгоритм предложит чаще повторять трудные шлоки, чтобы быстрее их запомнить.",
    );
    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    await user.click(trigger);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.click(screen.getByRole("heading", { name: firstShloka.displayTitle }));
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    expect(api.completions).toHaveLength(0);
  });

  it.each([false, true])("records forgot on reveal and finishes without another save with hasNext=%s", async (hasNext) => {
    const user = userEvent.setup();
    const api = createReviewApi(hasNext ? [firstShloka, secondShloka] : [firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    await user.click(
      await screen.findByRole("button", { name: "Нужна подсказка" }),
    );
    expect(screen.queryByRole("region", { name: "Перевод" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Сначала попробуйте вспомнить самостоятельно/)).not.toBeInTheDocument();
    const firstHint = screen.getByLabelText("Канонический текст шлоки");
    expect(firstHint).toHaveTextContent(/^дхарма-/);
    expect(firstHint).not.toHaveTextContent("самавета юютсавах");

    await user.click(screen.getByRole("button", { name: "Ещё подсказка" }));
    expect(screen.queryByRole("region", { name: "Перевод" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Сначала попробуйте вспомнить самостоятельно/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре/,
    );
    expect(api.completions).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Показать весь текст" }),
    );

    expect(
      await screen.findByRole("button", { name: "Завершить" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      /дхарма-кшетре куру-кшетре\s+самавета юютсавах/,
    );
    expect(api.completions).toHaveLength(1);
    expect(api.completions[0]?.body).toMatchObject({ result: "forgot" });
    expect(screen.getByRole("region", { name: "Перевод" })).toHaveTextContent(
      firstShloka.fullTranslation!,
    );
    expect(screen.queryByText(/Сначала попробуйте вспомнить самостоятельно/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Завершить" }));
    if (hasNext) {
      expect(
        await screen.findByRole("heading", { name: "Повторение завершено" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Повторить следующую" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Закончить" }));
    }
    await expectPath(routePaths.dashboard);
    expect(
      screen.queryByRole("heading", { name: "Повторение завершено" }),
    ).not.toBeInTheDocument();
    expect(api.completions).toHaveLength(1);
  });

  it("reveals hints without splitting decomposed grapheme clusters", async () => {
    const user = userEvent.setup();
    const text = "дхр̣тара̄шт̣ра ува̄ча\nвторая строка";
    const shloka = reviewShloka({
      code: "bhagavata-1-1",
      displayTitle: "Бха̄гавата-пура̄н̣а 1.1",
      text,
    });
    const api = createReviewApi([shloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/bhagavata-1-1/review");

    await user.click(
      await screen.findByRole("button", { name: "Нужна подсказка" }),
    );
    expect(screen.getByLabelText("Канонический текст шлоки")).toHaveTextContent(
      "дхр̣тара̄шт̣...",
    );

    await user.click(screen.getByRole("button", { name: "Ещё подсказка" }));
    expect(screen.getByLabelText("Канонический текст шлоки").textContent).toBe(
      "дхр̣тара̄шт̣ра ува̄ча\n...",
    );
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
    expect(await screen.findByText("произнесите по памяти")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Перевод" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Сначала попробуйте вспомнить самостоятельно/)).not.toBeInTheDocument();
    await completeWithoutError(user);

    await expectPath("/library/shlokas/gita-1-1/review");
    expect(api.completions).toHaveLength(1);
    await user.click(
      await screen.findByRole("button", { name: "Повторить следующую" }),
    );
    await expectPath("/library/shlokas/gita-4-7/review");
    expect(await screen.findByText("произнесите по памяти")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: secondShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Перевод" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Вспомнил" }));
    expect(screen.getByRole("region", { name: "Перевод" })).toHaveTextContent(
      secondShloka.fullTranslation!,
    );
    expect(screen.queryByText(firstShloka.fullTranslation!)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Все правильно" }));

    await expectPath(routePaths.dashboard);
    expect(
      screen.queryByRole("heading", { name: "Повторение завершено" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Все повторения на сегодня завершены",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Открыть страницу серии дней: 1 день подряд",
      }),
    ).toBeInTheDocument();
    expect(api.completions.map(({ body }) => body)).toEqual([
      expect.objectContaining({ result: "remembered_without_error" }),
      expect.objectContaining({ result: "remembered_without_error" }),
    ]);
  });

  it.each(["hidden", "hint", "full", "completed"])(
    "returns from the %s stage to the library via Back without saving another result",
    async (stage) => {
      const user = userEvent.setup();
      const api = createReviewApi([firstShloka, secondShloka]);
      mockApi(api.handle);
      storeTestSession(session);
      renderAppAt("/library?tab=reviewing");

      const card = await screen.findByRole("article", {
        name: firstShloka.displayTitle,
      });
      await user.click(within(card).getByRole("button", { name: "Повторить" }));

      await expectPath("/library/shlokas/gita-1-1/review");
      await screen.findByRole("button", { name: "Вспомнил" });
      if (stage === "hint") {
        await user.click(screen.getByRole("button", { name: "Нужна подсказка" }));
      } else if (stage === "full") {
        await user.click(screen.getByRole("button", { name: "Вспомнил" }));
      } else if (stage === "completed") {
        await completeWithoutError(user);
        await screen.findByRole("heading", { name: "Повторение завершено" });
      }
      await user.click(screen.getByRole("button", { name: "Назад" }));

      await expectPath(routePaths.library);
      expect(new URLSearchParams(window.location.search).get("tab")).toBe(
        "reviewing",
      );
      expect(api.completions).toHaveLength(stage === "completed" ? 1 : 0);
      expect(
        await screen.findByRole("article", { name: firstShloka.displayTitle }),
      ).toBeInTheDocument();
    },
  );

  it("returns to the dashboard via Back when opened directly", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    await user.click(await screen.findByRole("button", { name: "Назад" }));

    await expectPath(routePaths.dashboard);
    expect(api.completions).toHaveLength(0);
  });

  it(
    "offers only next review or finish on completion",
    async () => {
      const user = userEvent.setup();
      const api = createReviewApi([firstShloka, secondShloka]);
      mockApi(api.handle);
      storeTestSession(session);
      renderAppAt("/library/shlokas/gita-1-1/review");

      await completeWithoutError(user);
      expect(
        await screen.findByRole("button", { name: "Повторить следующую" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Выбрать другую" }),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Закончить" }));

      await expectPath(routePaths.dashboard);
      expect(
        await screen.findByRole("article", { name: secondShloka.displayTitle }),
      ).toBeInTheDocument();
      expect(api.completions).toHaveLength(1);
    },
  );

  it("keeps the full text and rating actions when saving fails, then completes on retry", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    let failCompletion = true;
    mockApi((request) => {
      if (
        request.method === "POST" &&
        request.path === "/api/library/items/gita-1-1/complete-review" &&
        failCompletion
      ) {
        failCompletion = false;
        return { status: 503 };
      }
      return api.handle(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/review");

    await user.click(await screen.findByRole("button", { name: "Вспомнил" }));
    await user.click(screen.getByRole("button", { name: "Сделал ошибку" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Все правильно" })).toBeEnabled();
    expect(
      screen.queryByRole("heading", { name: "Повторение завершено" }),
    ).not.toBeInTheDocument();
    expect(api.completions).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Сделал ошибку" }));
    await expectPath(routePaths.dashboard);
    expect(api.completions).toHaveLength(1);
    expect(api.completions[0]?.body).toMatchObject({
      result: "remembered_with_error",
    });
  });

  it("starts from the reviewing library card and updates today's streak after completion", async () => {
    const user = userEvent.setup();
    const api = createReviewApi([firstShloka]);
    mockApi(api.handle);
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    expect(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    ).toBeInTheDocument();
    const card = screen.getByRole("article", {
      name: firstShloka.displayTitle,
    });
    await user.click(
      within(card).getByRole("link", {
        name: `Повторить ${firstShloka.displayTitle}`,
      }),
    );
    await completeWithoutError(user);

    await expectPath(routePaths.dashboard);
    const streakLink = await screen.findByRole("link", {
      name: "Открыть страницу серии дней: 1 день подряд",
    });
    expect(api.completions).toHaveLength(1);

    await user.click(streakLink);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Подряд" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1 день подряд")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Отлично! Возвращайся завтра, чтобы продолжить серию.",
      ),
    ).toBeInTheDocument();
  });
});

async function completeWithoutError(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(
    await screen.findByRole("button", { name: "Вспомнил" }),
  );
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
      if (
        request.method === "GET" &&
        request.path === "/api/dashboard/streak"
      ) {
        return {
          status: 200,
          body: {
            continuedToday: completedCodes.size > 0,
            days: completedCodes.size > 0 ? 1 : 0,
            history: [
              { hasActivity: false, userDay: "2026-07-08" },
              { hasActivity: false, userDay: "2026-07-09" },
              { hasActivity: false, userDay: "2026-07-10" },
              { hasActivity: false, userDay: "2026-07-11" },
              {
                hasActivity: completedCodes.size > 0,
                userDay: "2026-07-12",
              },
            ],
          } satisfies ApiTypes.DashboardStreakDto,
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
    ...(shloka.fullTranslation ? { fullTranslation: shloka.fullTranslation } : {}),
  };
}

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}
