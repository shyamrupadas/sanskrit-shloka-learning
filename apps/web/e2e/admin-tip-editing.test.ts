import { expect, test } from "@playwright/test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

// Run the joint release smoke with VITE_ADMIN_LEARNING_ENABLED=true against a fresh Vite server.
test.skip(process.env.VITE_ADMIN_LEARNING_ENABLED !== "true", "Requires the joint admin release preview");

test("protects native Back, persists order and deletion, and keeps catalog forms reachable", async ({ page }) => {
  const session = {
    account: { id: "admin", email: "admin@example.com", roles: ["admin"] }, accessToken: "admin-token",
  } satisfies ApiTypes.AuthSessionDto;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    localStorage.setItem("sanskrit-shloka-learning.access-token", session.accessToken);
    localStorage.setItem("sanskrit-shloka-learning.account", JSON.stringify(session.account));
  }, session);
  let items: ApiTypes.LearningTipDto[] = [{ id: "first", title: "Читайте по строкам", text: "Прочитайте одну строку вслух." }];
  await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "GET" && path === "/api/auth/session") return route.fulfill({ json: session });
    if (method === "GET" && path === "/api/account/settings") return route.fulfill({ json: { hardMode: false } });
    if (method === "GET" && path === "/api/learning/tips") return route.fulfill({ json: { items } });
    if (method === "GET" && path === "/api/admin/catalog") return route.fulfill({ json: { sources: [] } });
    if (method === "GET" && path === "/api/admin/sources/options") return route.fulfill({ json: { sources: [] } });
    if (method === "POST" && path === "/api/admin/learning/tips") {
      const tip = { id: "new", ...route.request().postDataJSON() as ApiTypes.SaveLearningTipRequest };
      items = [...items, tip];
      return route.fulfill({ status: 201, json: tip });
    }
    if (method === "POST" && path === "/api/admin/learning/tips/new/move") {
      expect(route.request().postDataJSON()).toEqual({ direction: "up" });
      items = [items[1]!, items[0]!];
      return route.fulfill({ json: { items } });
    }
    if (method === "DELETE" && ["/api/admin/learning/tips/first", "/api/admin/learning/tips/new"].includes(path)) {
      items = items.filter((tip) => tip.id !== path.split("/").at(-1));
      return route.fulfill({ json: { items } });
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  await page.goto("/settings");
  await page.getByRole("link", { name: "Админка", exact: true }).click();
  await page.getByRole("link", { name: /Обучение/ }).click();
  await page.getByRole("link", { name: "Добавить совет", exact: true }).click();
  await page.getByLabel("Заголовок *").fill("Новый совет");
  await page.getByLabel("Текст *").fill("Строка\n\nЕщё строка");
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Остаться", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/learning\/new$/);
  await expect(page.getByLabel("Текст *")).toHaveValue("Строка\n\nЕщё строка");
  await page.goBack();
  await page.getByRole("button", { name: "Выйти без сохранения", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/learning$/);
  await page.getByRole("link", { name: "Добавить совет", exact: true }).click();
  await page.getByLabel("Заголовок *").fill("Опубликованный совет");
  await page.getByLabel("Текст *").fill("Текст");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Совет опубликован");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Поднять совет Опубликованный совет" }).click();
  await expect(page.getByRole("article").first()).toContainText("Опубликованный совет");
  await page.reload();
  await expect(page.getByRole("article").first()).toContainText("Опубликованный совет");
  await page.getByRole("button", { name: "Удалить Читайте по строкам" }).click();
  await page.getByRole("button", { name: "Удалить навсегда", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Удалить Опубликованный совет" }).click();
  await page.getByRole("button", { name: "Удалить навсегда", exact: true }).click();
  await expect(page.getByRole("link", { name: "Добавить первый совет" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Добавить первый совет" })).toBeVisible();
  await page.getByRole("link", { name: "Админка", exact: true }).click();
  await page.getByRole("link", { name: /Каталог шлок/ }).click();
  await expect(page.getByRole("heading", { name: "Каталог шлок", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Новый источник", exact: true }).click();
  await expect(page.getByLabel("Код источника")).toBeVisible();
  await page.getByRole("link", { name: "Каталог шлок", exact: true }).click();
  await page.getByRole("link", { name: "Новая шлока", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Новая шлока", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Каталог шлок", exact: true }).click();
  await page.getByRole("link", { name: "Админка", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toHaveCount(0);
  await page.getByRole("link", { name: "Еще", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
