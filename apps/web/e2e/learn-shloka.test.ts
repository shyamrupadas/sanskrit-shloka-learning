import { expect, test, type Page, type Route } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const accessTokenStorageKey = "sanskrit-shloka-learning.access-token";
const accountStorageKey = "sanskrit-shloka-learning.account";

const firstShloka = shloka({
  code: "gita-1-1",
  displayTitle: "Бхагавад-гита 1.1",
});
const secondShloka = shloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
});

test("replaces completed attempts while preserving the original return route", async ({
  page,
}) => {
  await storeSession(page);
  await mockLearningApi(page);
  await page.goto("/library?tab=learning");

  const firstCard = page.getByRole("article", {
    name: firstShloka.displayTitle,
  });
  await firstCard.getByRole("button", { name: "Учить" }).click();
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

async function mockLearningApi(page: Page): Promise<void> {
  const statuses = new Map<string, ApiTypes.LibraryShlokaDto["personalStatus"]>([
    [firstShloka.code, "learning"],
    [secondShloka.code, "learning"],
  ]);

  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

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
        personalStatus: statuses.get(item.code) ?? "available",
      });
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
