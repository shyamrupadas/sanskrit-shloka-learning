import { expect, test, type Route } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const longText = Array.from(
  { length: 36 },
  (_, index) => `Строка шлоки ${index + 1}: дхарма-кшетре куру-кшетре`,
).join("\n");
const shloka = {
  code: "long-review",
  displayTitle: "Длинная шлока",
  number: "1",
  personalStatus: "reviewing",
  sourceTitle: "Источник",
  text: longText,
  fullTranslation: "Длинный перевод. ".repeat(40),
} satisfies ApiTypes.LibraryShlokaDto;

test("keeps review header and actions fixed while long content scrolls through completion", async ({ page }) => {
  let releaseItem: (() => void) | undefined;
  const itemReady = new Promise<void>((resolve) => {
    releaseItem = resolve;
  });
  await page.setViewportSize({ width: 390, height: 480 });
  await page.addInitScript(() => {
    localStorage.setItem("sanskrit-shloka-learning.access-token", "access-token-1");
    localStorage.setItem("sanskrit-shloka-learning.account", JSON.stringify({
      email: "learner@example.com",
      id: "account-1",
      roles: [],
    }));
  });
  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (method === "GET" && path === "/api/auth/session") {
      await fulfillJson(route, 200, {
        accessToken: "access-token-1",
        account: { email: "learner@example.com", id: "account-1", roles: [] },
      } satisfies ApiTypes.AuthSessionDto);
      return;
    }
    if (method === "GET" && path === "/api/library/items/long-review") {
      await itemReady;
      await fulfillJson(route, 200, shloka);
      return;
    }
    if (method === "GET" && path === "/api/dashboard/review-shlokas") {
      await fulfillJson(route, 200, {
        hasReviewingShlokas: true,
        items: [shloka, { code: "next-review", displayTitle: "Следующая шлока", text: "Текст" }],
        remainingCount: 0,
        state: "active",
      } satisfies ApiTypes.DashboardReviewShlokaListDto);
      return;
    }
    if (method === "POST" && path === "/api/library/items/long-review/complete-review") {
      await fulfillJson(route, 201, {
        completedAt: "2026-07-12T12:00:00.000Z",
        result: "remembered_without_error",
        shlokaCode: shloka.code,
        userDay: "2026-07-12",
      } satisfies ApiTypes.CompletedReviewDto);
      return;
    }
    await fulfillJson(route, 404, { message: `Unexpected test request: ${method} ${path}` });
  });

  await page.goto("/library/shlokas/long-review/review");
  const header = page.locator("header");
  const footer = page.locator("footer");
  await expect(page.getByRole("status", { name: "Загрузка повторения" })).toBeVisible();
  await expect(header).toBeInViewport();
  await expect(footer).toHaveCount(0);
  releaseItem?.();
  await expect(page.getByRole("button", { name: "Вспомнил" })).toBeVisible();
  await expect(header).toBeInViewport();
  await expect(footer).toBeInViewport();
  const headerBefore = await header.boundingBox();
  const footerBefore = await footer.boundingBox();

  await page.getByRole("button", { name: "Вспомнил" }).click();
  const canonicalText = page.getByLabel("Канонический текст шлоки");
  await expect(canonicalText).toContainText("Строка шлоки 36");
  await canonicalText.evaluate((element) => element.scrollIntoView({ block: "end" }));
  await expect.poll(async () => (await canonicalText.boundingBox())?.y ?? 0).toBeLessThan(0);
  const visibleTextBottom = await canonicalText.evaluate((element) => {
    let scrollArea = element.parentElement;
    while (scrollArea && getComputedStyle(scrollArea).overflowY !== "auto") {
      scrollArea = scrollArea.parentElement;
    }
    if (!scrollArea) throw new Error("Review content has no scroll area");
    return Math.min(
      element.getBoundingClientRect().bottom,
      scrollArea.getBoundingClientRect().bottom,
    );
  });
  expect(visibleTextBottom).toBeLessThanOrEqual((await footer.boundingBox())!.y + 1);
  await page.getByRole("region", { name: "Перевод" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("region", { name: "Перевод" })).toBeInViewport({ ratio: 0.01 });
  await expect.poll(async () => page.evaluate(() =>
    document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
  )).toBeLessThanOrEqual(1);
  expect((await header.boundingBox())?.y).toBe(headerBefore?.y);
  expect((await footer.boundingBox())?.y).toBe(footerBefore?.y);

  await page.getByRole("button", { name: "Все правильно" }).click();
  await expect(page.getByRole("heading", { name: "Повторение завершено" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Закончить" })).toBeInViewport();
  await expect.poll(async () => page.evaluate(() =>
    document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
  )).toBeLessThanOrEqual(1);

  await page.route("**/api/library/items/long-review", (route) =>
    fulfillJson(route, 500, { message: "Не удалось загрузить повторение" }),
  );
  await page.reload();
  await expect(page.getByText("Ошибка", { exact: true })).toBeVisible();
  await expect(page.getByText("Не удалось загрузить повторение")).toBeVisible();
  await expect(header).toBeInViewport();
  await expect(footer).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() =>
    document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
  )).toBeLessThanOrEqual(1);
});

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ body: JSON.stringify(body), contentType: "application/json", status });
}
