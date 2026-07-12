import { expect, test, type Page, type Route } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const accessTokenStorageKey = "sanskrit-shloka-learning.access-token";
const accountStorageKey = "sanskrit-shloka-learning.account";

for (const viewport of [
  { height: 844, width: 390 },
  { height: 800, width: 360 },
]) {
  test(`keeps settings and admin routes usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockAdminApi(page);
    await storeAdminSession(page);

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Настройки" }),
    ).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Интенсивный режим повторения" }),
    ).toBeVisible();
    await expect(page.getByText("Транслитерация")).toHaveCount(0);
    await expect(page.getByText(adminSession.account.email)).toBeVisible();
    await expectPageFitsViewport(page);

    await page.getByRole("link", { name: "Админка" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Админка" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: longSourceTitle }),
    ).toBeVisible();
    await expect(page.getByText("gita · 1 глава")).toBeVisible();
    await expectPageFitsViewport(page);

    await page.getByRole("link", { name: "Новый источник" }).click();
    await expect(page).toHaveURL(/\/admin\/sources\/new$/);
    await expect(
      page.getByRole("heading", { name: "Новый источник" }),
    ).toBeVisible();
    await expect(page.getByLabel("Код источника")).toBeVisible();
    await page.getByRole("tab", { name: "Части" }).click();
    await expect(page.getByLabel("Код части 1")).toBeVisible();
    await expect(page.getByLabel("Название главы 1")).toBeVisible();
    await expect(page.getByRole("button", { name: /удалить/i })).toHaveCount(0);
    await expectPageFitsViewport(page);

    await page.getByRole("button", { name: "Назад" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("link", { name: "Новая шлока" }).click();
    await expect(page).toHaveURL(/\/admin\/shlokas\/new$/);
    await expect(
      page.getByRole("heading", { name: "Новая шлока" }),
    ).toBeVisible();
    await page.getByLabel("Источник").selectOption("mahabharata");
    await expect(page.getByLabel("Часть")).toBeVisible();
    await page.getByLabel("Часть").selectOption("bhishma-parva");
    await expect(page.getByLabel("Глава")).toBeVisible();
    await expect(page.getByLabel("Номер шлоки")).toBeVisible();
    await expectPageFitsViewport(page);

    await page.goto("/admin/sources/gita/edit");
    await expect(
      page.getByRole("heading", { name: "Редактирование источника" }),
    ).toBeVisible();
    await expect(page.getByLabel("Код источника")).toHaveAttribute(
      "readonly",
      "",
    );
    await expect(page.getByLabel("Структура")).toHaveAttribute("readonly", "");
    await expectPageFitsViewport(page);

    await page.goto("/admin/shlokas/mahabharata-bhishma-1-1/edit");
    await expect(
      page.getByRole("heading", { name: "Редактирование шлоки" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Изменение канонического текста затронет всех пользователей общей библиотеки.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Часть")).toHaveAttribute("readonly", "");
    await expectPageFitsViewport(page);
  });
}

async function storeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ accountKey, session, tokenKey }) => {
      window.localStorage.setItem(tokenKey, session.accessToken);
      window.localStorage.setItem(accountKey, JSON.stringify(session.account));
    },
    {
      accountKey: accountStorageKey,
      session: adminSession,
      tokenKey: accessTokenStorageKey,
    },
  );
}

async function mockAdminApi(page: Page): Promise<void> {
  let hardMode = false;

  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "GET" && url.pathname === "/api/auth/session") {
      await fulfillJson(route, 200, adminSession);
      return;
    }

    if (method === "GET" && url.pathname === "/api/account/settings") {
      await fulfillJson(route, 200, { hardMode });
      return;
    }

    if (method === "PATCH" && url.pathname === "/api/account/settings") {
      hardMode = (request.postDataJSON() as ApiTypes.UpdateAccountSettingsRequest)
        .hardMode;
      await fulfillJson(route, 200, { hardMode });
      return;
    }

    if (method === "GET" && url.pathname === "/api/admin/catalog") {
      await fulfillJson(route, 200, adminCatalog);
      return;
    }

    if (method === "GET" && url.pathname === "/api/admin/sources/options") {
      await fulfillJson(route, 200, sourceOptions);
      return;
    }

    if (method === "GET" && url.pathname === "/api/admin/sources/gita") {
      await fulfillJson(route, 200, chapterSource);
      return;
    }

    if (
      method === "GET" &&
      url.pathname === "/api/admin/shlokas/mahabharata-bhishma-1-1"
    ) {
      await fulfillJson(route, 200, adminShloka);
      return;
    }

    await fulfillJson(route, 404, {
      code: "UNEXPECTED_TEST_REQUEST",
      message: `Unexpected test request: ${method} ${url.pathname}`,
    });
  });
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

async function expectPageFitsViewport(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

const adminSession = {
  account: {
    id: "admin-account",
    email: "admin-with-a-long-address@example.com",
    roles: ["admin"],
  },
  accessToken: "admin-access-token",
} satisfies ApiTypes.AuthSessionDto;

const longSourceTitle =
  "Бхагавад-гита — очень длинное название источника для мобильной проверки";

const chapterSource = {
  code: "gita",
  title: longSourceTitle,
  description: "Диалог Кришны и Арджуны",
  structureType: "chapters",
  chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
  parts: [],
} satisfies ApiTypes.AdminSourceDto;

const adminCatalog = {
  sources: [
    {
      ...chapterSource,
      shlokas: [
        {
          code: "gita-chapter-2-2-47",
          chapterCode: "chapter-2",
          number: "2.47",
          text: "карманй эвадхикарас те сверхдлинноесловобезпробелов ма пхалешу кадачана",
        },
      ],
    },
  ],
} satisfies ApiTypes.AdminCatalogDto;

const sourceOptions = {
  sources: [
    chapterSource,
    {
      code: "mahabharata",
      title: "Махабхарата",
      structureType: "parts",
      chapters: [],
      parts: [
        {
          code: "bhishma-parva",
          title: "Бхишма-парва",
          order: 1,
          chapters: [{ code: "chapter-1", title: "Глава 1", order: 1 }],
        },
      ],
    },
  ],
} satisfies ApiTypes.AdminSourceOptionsDto;

const adminShloka = {
  code: "mahabharata-bhishma-1-1",
  sourceCode: "mahabharata",
  sourceTitle: "Махабхарата",
  partCode: "bhishma-parva",
  partTitle: "Бхишма-парва",
  chapterCode: "chapter-1",
  chapterTitle: "Глава 1",
  number: "1",
  text: "дхармакшетре курукшетре\nсамавета юютсавах\nмамаках пандаваш чайва\nким акурвата санджая",
  padas: [
    "дхармакшетре курукшетре",
    "самавета юютсавах",
    "мамаках пандаваш чайва",
    "ким акурвата санджая",
  ],
  fullTranslation: "На поле дхармы, на поле Куру.",
} satisfies ApiTypes.AdminShlokaDto;
