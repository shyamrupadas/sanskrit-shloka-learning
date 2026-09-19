import { expect, test, type Page, type Route } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const accessTokenStorageKey = "sanskrit-shloka-learning.access-token";
const accountStorageKey = "sanskrit-shloka-learning.account";

type ObservedRequest = { method: string; pathname: string };

const firstShlokaPadas = [
  "первая строка",
  "вторая строка",
  "третья строка",
  "четвертая строка",
];
const firstShloka = shloka({
  code: "gita-1-1",
  displayTitle: "Бхагавад-гита 1.1",
  text: firstShlokaPadas.join("\n"),
});
const secondShlokaPadas = [
  "первая пада второй шлоки",
  "вторая пада второй шлоки",
  "третья пада второй шлоки",
  "четвертая пада второй шлоки",
];
const secondShloka = shloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
  text: secondShlokaPadas.join("\n"),
});

test("positions advice at the bottom on mobile and centrally on larger screens", async ({ page }) => {
  await openFirstLearningAttempt(page);
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Совет", exact: true });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 767, height: 900 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const box = await dialog.boundingBox();
      if (!box) return Number.POSITIVE_INFINITY;
      const horizontalError = Math.abs(box.x + box.width / 2 - viewport.width / 2);
      const verticalError = viewport.width < 768
        ? Math.abs(box.y + box.height - viewport.height)
        : Math.abs(box.y + box.height / 2 - viewport.height / 2);
      return Math.max(horizontalError, verticalError);
    }).toBeLessThanOrEqual(1);
    await expect(dialog.getByRole("button", { name: "Закрыть совет" })).toBeInViewport();
    await expect(dialog.getByRole("link", { name: "Все советы" })).toBeInViewport();
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Совет", exact: true })).toBeFocused();
});

test("preserves the frozen advice list through native Back and reload while the page gets fresh data", async ({ page }) => {
  await openFirstLearningAttempt(page);
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await page.getByRole("button", { name: "Другой совет" }).click();
  await expect(page.getByText("Второй текст", { exact: true })).toBeVisible();
  let freshReads = 0;
  await page.route("**/api/learning/tips", async (route) => {
    expect(route.request().method()).toBe("GET");
    freshReads++;
    await fulfillJson(route, 200, { items: [{ id: "b", title: "Изменённый совет", text: "Новая версия второго" }] });
  });
  await page.getByRole("link", { name: "Все советы" }).click();
  await expect(page.getByText("Новая версия второго")).toBeVisible();
  const pageReads = freshReads;
  await page.goBack();
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await expect(page.getByText("Второй текст", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Других советов нет" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: firstShloka.displayTitle })).toBeVisible();
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await expect(page.getByText("Второй текст", { exact: true })).toBeVisible();
  expect(freshReads).toBe(pageReads);
  await page.getByRole("button", { name: "Закрыть совет" }).click();
  await page.getByRole("button", { name: "Отмена" }).click();
  await page.getByRole("article", { name: firstShloka.displayTitle }).getByRole("button", { name: "Учить" }).click();
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await expect(page.getByText("Новая версия второго")).toBeVisible();
  expect(freshReads).toBe(pageReads + 1);
});

test("restarts only legacy advice and preserves the attempt and progress on reload", async ({ page }) => {
  const requests: ObservedRequest[] = [];
  await openFirstLearningAttempt(page, requests);
  await page.evaluate(() => {
    window.history.replaceState({ ...window.history.state, learnShlokaAdviceAttempt: { shlokaCode: "gita-1-1", tipIndex: 1 } }, "");
  });
  await page.reload();
  await expectLearnRoute(page, firstShloka.code);
  await expect(page.getByRole("heading", { name: firstShloka.displayTitle })).toBeVisible();
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await expect(page.getByText("Первый текст", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Другой совет" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Совет", exact: true }).click();
  await expect(page.getByText("Второй текст", { exact: true })).toBeVisible();
  expect(requests.filter(({ method }) => method !== "GET")).toEqual([]);
});

test("replaces completed attempts while preserving the original return route", async ({
  page,
}) => {
  await openFirstLearningAttempt(page);

  await page.getByRole("button", { name: "Совет" }).click();
  await page
    .getByRole("dialog", { name: "Совет" })
    .getByRole("link", { name: "Все советы" })
    .click();
  await expect(page).toHaveURL(/\/learning$/);
  await expect(page.getByRole("heading", { name: "Советы" })).toBeVisible();
  await page.goBack();
  await expectLearnRoute(page, firstShloka.code);

  await page.getByRole("button", { name: "Выучил" }).click();
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Учить следующую" }).click();

  await expectLearnRoute(page, secondShloka.code);
  await expect(
    page.getByRole("heading", { name: secondShloka.displayTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await expect(page.getByRole("heading", { name: "Библиотека" })).toBeVisible();

  await page.goForward();
  await expectLearnRoute(page, secondShloka.code);
  await expect(
    page.getByRole("heading", { name: secondShloka.displayTitle }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Выучил" }).click();
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Учить следующую" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Закончить" }).click();

  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toHaveCount(0);
});

test("keeps the helper non-mutating before the learner completes the attempt", async ({
  page,
}) => {
  const requests: ObservedRequest[] = [];
  await openFirstLearningAttempt(page, requests);

  await page.getByRole("button", { name: "Помощник" }).click();
  await expect(page.getByRole("heading", { name: "Помощник" })).toBeVisible();
  await page.getByRole("button", { name: "Скрыть и повторить" }).click();
  await expect(page.getByText("Произнесите по памяти")).toBeVisible();
  await page.getByRole("button", { name: "К шлоке" }).click();

  await expect(
    page.getByRole("heading", { name: firstShloka.displayTitle }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Помощник" }).click();
  await expect(page.getByText("Пада 1")).toBeVisible();
  await expect(page.getByText("1 / 7")).toBeVisible();

  for (let fragmentIndex = 0; fragmentIndex < 7; fragmentIndex += 1) {
    await page.getByRole("button", { name: "Скрыть и повторить" }).click();
    await page.getByRole("button", { name: "Показать и свериться" }).click();
    await page
      .getByRole("button", {
        name:
          fragmentIndex === 6
            ? "Вернуться к шлоке"
            : "Следующий фрагмент",
      })
      .click();
  }

  await expect(
    page.getByRole("heading", { name: firstShloka.displayTitle }),
  ).toBeVisible();
  expect(requests.every(({ method }) => method === "GET")).toBe(true);

  await page.getByRole("button", { name: "Выучил" }).click();
  await expect(
    page.getByRole("heading", { name: "Шлока добавлена в повторение" }),
  ).toBeVisible();
  expect(
    requests.filter(
      ({ method, pathname }) =>
        method === "POST" &&
        pathname === `/api/library/items/${firstShloka.code}/complete-learning`,
    ),
  ).toHaveLength(1);
});

test("replaces a cancelled attempt in browser history", async ({ page }) => {
  await openFirstLearningAttempt(page);
  await page.getByRole("button", { name: "Отмена" }).click();

  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/library\?tab=learning$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/library\?tab=learning$/);
});

async function openFirstLearningAttempt(
  page: Page,
  requests: ObservedRequest[] = [],
): Promise<void> {
  await storeSession(page);
  await mockLearningApi(page, requests);
  await page.goto("/library?tab=learning");
  await page
    .getByRole("article", { name: firstShloka.displayTitle })
    .getByRole("button", { name: "Учить" })
    .click();
  await expectLearnRoute(page, firstShloka.code);
}

async function expectLearnRoute(page: Page, shlokaCode: string): Promise<void> {
  await expect(page).toHaveURL(
    new RegExp(`/library/shlokas/${shlokaCode}/learn\\?`),
  );
  expect(
    await page.evaluate(() =>
      new URLSearchParams(window.location.search).get("returnTo"),
    ),
  ).toBe("/library?tab=learning");
}

async function storeSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ accountKey, session, tokenKey }) => {
      window.localStorage.setItem(tokenKey, session.accessToken);
      window.localStorage.setItem(accountKey, JSON.stringify(session.account));
    },
    {
      accountKey: accountStorageKey,
      session: {
        accessToken: "access-token-1",
        account: {
          email: "learner@example.com",
          id: "account-1",
          roles: [],
        },
      } satisfies ApiTypes.AuthSessionDto,
      tokenKey: accessTokenStorageKey,
    },
  );
}

async function mockLearningApi(
  page: Page,
  requests: ObservedRequest[] = [],
): Promise<void> {
  const statuses = new Map<string, ApiTypes.LibraryShlokaDto["personalStatus"]>([
    [firstShloka.code, "learning"],
    [secondShloka.code, "learning"],
  ]);

  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    requests.push({ method, pathname: url.pathname });

    if (method === "GET" && url.pathname === "/api/learning/tips") {
      await fulfillJson(route, 200, { items: [{ id: "a", title: "Первый совет", text: "Первый текст" }, { id: "b", title: "Второй совет", text: "Второй текст" }] });
      return;
    }

    if (method === "GET" && url.pathname === "/api/library") {
      await fulfillJson(
        route,
        200,
        library(
          [firstShloka, secondShloka].map((item) => ({
            ...item,
            personalStatus: statuses.get(item.code) ?? "available",
          })),
        ),
      );
      return;
    }

    const itemMatch = url.pathname.match(/^\/api\/library\/items\/([^/]+)$/);
    if (method === "GET" && itemMatch) {
      const item = findShloka(decodeURIComponent(itemMatch[1] ?? ""));
      await fulfillJson(route, 200, {
        ...item,
        padas:
          item.code === firstShloka.code
            ? firstShlokaPadas
            : secondShlokaPadas,
        personalStatus: statuses.get(item.code) ?? "available",
      } satisfies ApiTypes.LibraryShlokaDetailsDto);
      return;
    }

    const completionMatch = url.pathname.match(
      /^\/api\/library\/items\/([^/]+)\/complete-learning$/,
    );
    if (method === "POST" && completionMatch) {
      const completed = findShloka(
        decodeURIComponent(completionMatch[1] ?? ""),
      );
      statuses.set(completed.code, "reviewing");
      await fulfillJson(route, 200, {
        remainingLearningShlokas: [firstShloka, secondShloka]
          .filter((item) => statuses.get(item.code) === "learning")
          .map((item) => ({ ...item, personalStatus: "learning" as const })),
        shloka: { ...completed, personalStatus: "reviewing" },
      } satisfies ApiTypes.CompleteLearningDto);
      return;
    }

    await fulfillJson(route, 404, {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${url.pathname}`,
    });
  });
}

function findShloka(code: string): ApiTypes.LibraryShlokaDto {
  const item = [firstShloka, secondShloka].find(
    (candidate) => candidate.code === code,
  );
  if (!item) {
    throw new Error(`Unknown test shloka: ${code}`);
  }

  return item;
}

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  });
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

function shloka(
  overrides: Partial<ApiTypes.LibraryShlokaDto>,
): ApiTypes.LibraryShlokaDto {
  return {
    code: "shloka-1",
    displayTitle: "Шлока 1",
    number: "1",
    personalStatus: "learning",
    sourceTitle: "Источник",
    text: "первая строка\nвторая строка\nтретья строка\nчетвертая строка",
    ...overrides,
  };
}
