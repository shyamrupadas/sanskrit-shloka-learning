import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
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

  await page.goto("/learning");
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
  await expect(page.getByText("У вас нет шлок для заучивания")).toBeVisible();
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

for (const viewport of [
  { height: 844, width: 390 },
  { height: 800, width: 360 },
]) {
  test(`keeps auth, dashboard, library, shloka, and navigation stable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const session = await mockApi(page, {
      email: `mobile-${viewport.width}@example.com`,
      library: mobileLibrary,
      libraryItem: mobileShloka,
    });

    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Регистрация" }),
    ).toBeVisible();
    await expect(page.getByLabel("Подтверждение пароля")).toBeVisible();
    await expectPageFitsViewport(page);

    await page.getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expectPageFitsViewport(page);

    await page.getByLabel("Email").fill(session.account.email);
    await page.getByLabel("Пароль", { exact: true }).fill("correct-password");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Выучите шлоки" }),
    ).toBeVisible();
    await expect(page.getByText("У вас нет шлок для заучивания")).toBeVisible();
    await expectPageFitsViewport(page);

    const navigation = page.getByRole("navigation", {
      name: "Основная навигация",
    });
    const dashboardLink = navigation.getByRole("link", {
      name: "Дашборд",
    });
    const libraryLink = navigation.getByRole("link", {
      name: "Библиотека",
    });
    const learningLink = navigation.getByRole("link", {
      name: "Обучение",
    });
    const settingsLink = navigation.getByRole("link", {
      name: "Настройки",
    });

    await expect(navigation).toBeVisible();
    await expectActiveNavigationLink(navigation, dashboardLink);
    await expect(libraryLink).toBeVisible();
    await expect(learningLink).toBeVisible();
    await expect(settingsLink).toBeVisible();

    const initialMetrics = await expectNavigationFitsViewport(page, viewport);
    await learningLink.click();
    await expect(page).toHaveURL(/\/learning$/);
    await expectActiveNavigationLink(navigation, learningLink);
    await expect(page.getByRole("heading", { name: "Советы" })).toBeVisible();
    expectNavigationMetricsToBeStable(
      await expectNavigationFitsViewport(page, viewport),
      initialMetrics,
    );
    await expectPageFitsViewport(page);

    await libraryLink.click();
    await expect(page).toHaveURL(/\/library$/);
    await expectActiveNavigationLink(navigation, libraryLink);
    expectNavigationMetricsToBeStable(
      await expectNavigationFitsViewport(page, viewport),
      initialMetrics,
    );
    await expect(
      page.getByRole("tab", { name: "Повторяю" }),
    ).toHaveAttribute("aria-selected", "true");

    const allTab = page.getByRole("tab", { name: "Все" });
    await allTab.click();
    await expect(allTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("searchbox", { name: "Поиск" })).toBeVisible();

    const longCard = page.getByRole("article", { name: mobileShlokaTitle });
    await expect(longCard).toBeVisible();
    await expectLocatorFitsViewport(longCard, viewport);
    await expectSingleLineEllipsis(
      longCard.getByText(mobileShlokaExcerpt, { exact: true }),
    );
    await expect(longCard.getByText(mobileShlokaTranslation)).toHaveCount(0);
    await expectPageFitsViewport(page);

    await longCard.getByRole("link", { name: mobileShlokaExcerpt }).click();
    await expect(page).toHaveURL(/\/library\/shlokas\/mobile-long-shloka$/);
    await expect(
      page.getByRole("heading", { name: mobileShlokaTitle }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Канонический текст шлоки"),
    ).toContainText("сверхдлинноесловобезпробелов");
    await expectLocatorFitsViewport(
      page.getByRole("heading", { name: mobileShlokaTitle }),
      viewport,
    );
    await expectPageFitsViewport(page);

    await page
      .getByRole("main")
      .getByRole("link", { name: "Библиотека" })
      .click();
    await expect(page).toHaveURL(/\/library$/);

    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings$/);
    await expectActiveNavigationLink(navigation, settingsLink);
    expectNavigationMetricsToBeStable(
      await expectNavigationFitsViewport(page, viewport),
      initialMetrics,
    );

    const logoutButton = page.getByRole("button", { name: "Выйти" });
    await logoutButton.scrollIntoViewIfNeeded();
    const [logoutBox, navigationBox] = await Promise.all([
      logoutButton.boundingBox(),
      navigation.boundingBox(),
    ]);

    expect(logoutBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(logoutBox!.y + logoutBox!.height).toBeLessThanOrEqual(
      navigationBox!.y,
    );
  });
}

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
  library?: ApiTypes.LibraryResponseDto;
  libraryItem?: ApiTypes.LibraryShlokaDto;
}

type NavigationMetrics = {
  bottom: number;
  height: number;
  right: number;
  width: number;
  x: number;
  y: number;
};

async function expectNavigationFitsViewport(
  page: Page,
  viewport: { height: number; width: number },
): Promise<NavigationMetrics> {
  const navigation = page.getByRole("navigation", {
    name: "Основная навигация",
  });
  const navigationItems = [
    {
      control: navigation.getByRole("link", { name: "Дашборд" }),
      label: navigation.getByText("Дашборд", { exact: true }),
    },
    {
      control: navigation.getByRole("link", { name: "Библиотека" }),
      label: navigation.getByText("Библиотека", { exact: true }),
    },
    {
      control: navigation.getByRole("link", { name: "Обучение" }),
      label: navigation.getByText("Обучение", { exact: true }),
    },
    {
      control: navigation.getByRole("link", { name: "Настройки" }),
      label: navigation.getByText("Настройки", { exact: true }),
    },
  ];
  const [metrics, contract, itemMetrics] = await Promise.all([
    navigation.evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        right: rect.right,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    }),
    page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const readNumber = (name: string) =>
        Number.parseFloat(styles.getPropertyValue(name));

      return {
        height: readNumber("--component-bottom-nav-height"),
        inset: readNumber("--space-4"),
        maxWidth: readNumber("--component-bottom-nav-width"),
      };
    }),
    Promise.all(
      navigationItems.map(async ({ control, label }) => {
        const [controlMetrics, labelIsClipped] = await Promise.all([
          control.evaluate((element) => {
            const rect = element.getBoundingClientRect();

            return {
              bottom: rect.bottom,
              isClipped:
                element.scrollWidth > element.clientWidth ||
                element.scrollHeight > element.clientHeight,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          }),
          label.evaluate(
            (element) =>
              element.scrollWidth > element.clientWidth ||
              element.scrollHeight > element.clientHeight,
          ),
        ]);

        return { ...controlMetrics, labelIsClipped };
      }),
    ),
  ]);
  const expectedWidth = Math.min(
    contract.maxWidth,
    viewport.width - contract.inset * 2,
  );

  expect(metrics.x).toBeCloseTo(contract.inset, 1);
  expect(metrics.y).toBeGreaterThanOrEqual(0);
  expect(viewport.width - metrics.right).toBeCloseTo(contract.inset, 1);
  expect(viewport.height - metrics.bottom).toBeCloseTo(contract.inset, 1);
  expect(metrics.height).toBeCloseTo(contract.height, 1);
  expect(metrics.width).toBeCloseTo(expectedWidth, 1);
  expect(itemMetrics).toHaveLength(4);

  for (const item of itemMetrics) {
    expect(item.left).toBeGreaterThanOrEqual(metrics.x);
    expect(item.right).toBeLessThanOrEqual(metrics.right);
    expect(item.top).toBeGreaterThanOrEqual(metrics.y);
    expect(item.bottom).toBeLessThanOrEqual(metrics.bottom);
    expect(item.isClipped).toBe(false);
    expect(item.labelIsClipped).toBe(false);
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  return metrics;
}

async function expectLocatorFitsViewport(
  locator: Locator,
  viewport: { height: number; width: number },
): Promise<void> {
  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      left: rect.left,
      right: rect.right,
      scrollWidth: element.scrollWidth,
      width: element.clientWidth,
    };
  });

  expect(metrics.left).toBeGreaterThanOrEqual(0);
  expect(metrics.right).toBeLessThanOrEqual(viewport.width);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
}

async function expectPageFitsViewport(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectSingleLineEllipsis(locator: Locator): Promise<void> {
  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);

    return {
      clientWidth: element.clientWidth,
      height: rect.height,
      lineHeight: Number.parseFloat(styles.lineHeight),
      overflowX: styles.overflowX,
      scrollWidth: element.scrollWidth,
      textOverflow: styles.textOverflow,
      whiteSpace: styles.whiteSpace,
    };
  });

  expect(metrics.whiteSpace).toBe("nowrap");
  expect(metrics.overflowX).toBe("hidden");
  expect(metrics.textOverflow).toBe("ellipsis");
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight + 1);
}

async function expectActiveNavigationLink(
  navigation: Locator,
  expectedLink: Locator,
): Promise<void> {
  await expect(expectedLink).toHaveAttribute("aria-current", "page");
  expect(
    await navigation.getByRole("link").evaluateAll(
      (links) =>
        links.filter((link) => link.getAttribute("aria-current") === "page")
          .length,
    ),
  ).toBe(1);
}

function expectNavigationMetricsToBeStable(
  actual: NavigationMetrics,
  expected: NavigationMetrics,
): void {
  expect(actual.x).toBeCloseTo(expected.x, 0);
  expect(actual.y).toBeCloseTo(expected.y, 0);
  expect(actual.width).toBeCloseTo(expected.width, 0);
  expect(actual.height).toBeCloseTo(expected.height, 0);
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
      await fulfillJson(route, 200, options.library ?? emptyLibrary);
      return;
    }

    if (
      method === "GET" &&
      options.libraryItem &&
      url.pathname === `/api/library/items/${options.libraryItem.code}`
    ) {
      await fulfillJson(route, 200, options.libraryItem);
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

const mobileShlokaTitle =
  "Бхагавад-гита — очень длинное название главы о непреходящей природе действия";
const mobileShlokaExcerpt =
  "дхарма-кшетре куру-кшетре сверхдлинноесловобезпробелов";
const mobileShlokaTranslation =
  "Длинный перевод проверяет, что дополнительный текст карточки остается внутри мобильного экрана.";

const mobileShloka = {
  code: "mobile-long-shloka",
  displayTitle: mobileShlokaTitle,
  sourceTitle: "Бхагавад-гита",
  number: "2.47",
  text: "дхарма-кшетре куру-кшетре сверхдлинноесловобезпробелов\nсамавета юютсавах мамаках пандавашчаива\nкимакурвата санджая продолжение длинной строки\nма те санго сту акармани",
  personalStatus: "available",
  fullTranslation: mobileShlokaTranslation,
} satisfies ApiTypes.LibraryShlokaDto;

const mobileLibrary = {
  ...emptyLibrary,
  allShlokas: [mobileShloka],
} satisfies ApiTypes.LibraryResponseDto;
