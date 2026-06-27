import { expect, test, type Page, type Route } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const accessTokenStorageKey = "sanskrit-shloka-learning.access-token";

test("redirects protected routes to the login/register flow", async ({
  page,
}) => {
  await mockApi(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();

  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("button", { name: "Зарегистрироваться" }),
  ).toBeVisible();
});

test("registers and reaches the empty dashboard and library", async ({
  page,
}) => {
  const session = await mockApi(page, {
    email: `learner-${Date.now()}@example.com`,
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill(session.account.email);
  await page.getByLabel("Пароль", { exact: true }).fill("correct-password");
  await page
    .getByLabel("Подтверждение пароля")
    .fill("correct-password");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(session.account.email)).toHaveCount(0);
  await expect(page.getByText("Пока нет добавленных шлок")).toBeVisible();
  await expect(page.getByText(/серия/i)).toHaveCount(0);
  await expect(page.getByText(/повторить/i)).toHaveCount(0);

  const addAction = page.getByRole("link", { name: /Добавить/ });
  await expect(addAction).toHaveCount(1);
  await expect(addAction).toHaveAttribute("href", "/library");
  await addAction.click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Библиотека" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Повторяю" })).toBeVisible();
});

test("logs in and logs out", async ({ page }) => {
  const session = await mockApi(page, {
    email: `learner-${Date.now()}@example.com`,
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(session.account.email);
  await page.getByLabel("Пароль", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(session.account.email)).toHaveCount(0);

  await page.getByRole("link", { name: "Настройки" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(session.account.email)).toBeVisible();
  await page.getByRole("button", { name: "Выйти" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), accessTokenStorageKey),
  ).toBeNull();
});

test("shows the generic login error for invalid credentials", async ({
  page,
}) => {
  await mockApi(page, { invalidLogin: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill("learner@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("alert")).toHaveText(
    "Неверный email или пароль",
  );
});

interface ApiMockOptions {
  email?: string;
  invalidLogin?: boolean;
}

async function mockApi(
  page: Page,
  options: ApiMockOptions = {},
): Promise<ApiTypes.AuthSessionDto> {
  const session = {
    account: {
      id: "account-1",
      email: options.email ?? "learner@example.com",
      roles: [],
    },
    accessToken: "access-token-1",
  } satisfies ApiTypes.AuthSessionDto;

  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      options.invalidLogin &&
      method === "POST" &&
      url.pathname === "/api/auth/login"
    ) {
      await fulfillJson(route, 401, {
        code: "INVALID_CREDENTIALS",
        message: "Неверный email или пароль",
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/register") {
      await fulfillJson(route, 201, session);
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/login") {
      await fulfillJson(route, 200, session);
      return;
    }

    if (method === "GET" && url.pathname === "/api/auth/session") {
      await fulfillJson(route, 200, session);
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/logout") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === "GET" && url.pathname === "/api/dashboard") {
      await fulfillJson(route, 200, emptyDashboard);
      return;
    }

    if (method === "GET" && url.pathname === "/api/library") {
      await fulfillJson(route, 200, emptyLibrary);
      return;
    }

    if (method === "GET" && url.pathname === "/api/account/settings") {
      await fulfillJson(route, 200, { hardMode: false });
      return;
    }

    await fulfillJson(route, 404, {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${url.pathname}`,
    });
  });

  return session;
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
