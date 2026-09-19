import { act, render, screen } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { afterEach, expect, it, vi } from "vitest";

import { adminSession, expectPath, mockApi, storeTestSession, session, type MockApiResponse } from "@/shared/test/harness";
import { App } from "./App";

afterEach(() => vi.unstubAllEnvs());

it("creates and edits published tips, retains failed input and confirms cancellation", async () => {
  vi.stubEnv("VITE_ADMIN_LEARNING_ENABLED", "true");
  storeTestSession(adminSession);
  let items: ApiTypes.LearningTipDto[] = [];
  let failSave = true;
  mockApi(({ method, path, body }) => {
    if (method === "GET" && path === "/api/auth/session") return { status: 200, body: adminSession };
    if (method === "GET" && path === "/api/learning/tips") return { status: 200, body: { items } };
    if (method === "POST" && path === "/api/admin/learning/tips") {
      if (failSave) return { status: 503, body: { code: "UNAVAILABLE", message: "Unavailable" } };
      expect(body).toEqual({ title: "Совет", text: "Строка\n\n<b>Текст</b>" });
      const tip = { id: "new", ...body as ApiTypes.SaveLearningTipRequest };
      items = [tip];
      return { status: 201, body: tip };
    }
    if (method === "PATCH" && path === "/api/admin/learning/tips/new") {
      const tip = { id: "new", ...body as ApiTypes.SaveLearningTipRequest };
      items = [tip];
      return { status: 200, body: tip };
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  window.history.replaceState({}, "", "/admin");
  render(<App />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("link", { name: /Обучение/ }));
  await user.click(await screen.findByRole("link", { name: "Добавить первый совет" }));
  await user.click(await screen.findByRole("button", { name: "Сохранить" }));
  expect(await screen.findByText("Введите заголовок.")).toBeVisible();
  expect(screen.getByText("Введите текст совета.")).toBeVisible();
  await user.click(screen.getByLabelText("Заголовок *"));
  await user.paste("я".repeat(121));
  await user.click(screen.getByLabelText("Текст *"));
  await user.paste("я".repeat(2001));
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(screen.getByText("Максимум 120 символов.")).toBeVisible();
  expect(screen.getByText("Максимум 2000 символов.")).toBeVisible();
  expect(screen.getByText("121 / 120")).toBeVisible();
  await user.clear(screen.getByLabelText("Заголовок *"));
  await user.clear(screen.getByLabelText("Текст *"));
  await user.type(screen.getByLabelText("Заголовок *"), "  Совет  ");
  await user.type(screen.getByLabelText("Текст *"), "  Строка\n\n<b>Текст</b>  ");
  await user.click(screen.getByRole("link", { name: "Отмена" }));
  await user.click(await screen.findByRole("button", { name: "Остаться" }));
  expect(screen.getByLabelText("Заголовок *")).toHaveValue("  Совет  ");
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Введённый текст сохранён в форме");
  expect(screen.getByLabelText("Текст *")).toHaveValue("  Строка\n\n<b>Текст</b>  ");
  failSave = false;
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  await expectPath("/admin/learning");
  expect(await screen.findByRole("status")).toHaveTextContent("Совет опубликован");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(await screen.findByRole("link", { name: "Изменить Совет" }));
  expect(await screen.findByLabelText("Заголовок *")).toHaveValue("Совет");
  await user.clear(screen.getByLabelText("Заголовок *"));
  await user.type(screen.getByLabelText("Заголовок *"), "Новый заголовок");
  await user.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(await screen.findByRole("heading", { name: "Новый заголовок" })).toBeVisible();
});

it("retains the edit buffer if the connection returns while reading is unavailable", async () => {
  vi.stubEnv("VITE_ADMIN_LEARNING_ENABLED", "true");
  storeTestSession(adminSession);
  let unavailable = false;
  mockApi(({ method, path }) => {
    if (method === "GET" && path === "/api/auth/session") return { status: 200, body: adminSession };
    if (method === "GET" && path === "/api/learning/tips") return unavailable ? { status: 503 } : {
      status: 200, body: { items: [{ id: "tip", title: "Исходный", text: "Исходный текст" }] satisfies ApiTypes.LearningTipDto[] },
    };
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  window.history.replaceState({}, "", "/admin/learning/tip/edit");
  render(<App />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Текст *"), " — правка");
  unavailable = true;
  await act(async () => { onlineManager.setOnline(false); });
  await act(async () => { onlineManager.setOnline(true); });
  expect(screen.getByLabelText("Текст *")).toHaveValue("Исходный текст — правка");
  await user.click(screen.getByRole("link", { name: "Отмена" }));
  expect(await screen.findByRole("dialog")).toBeVisible();
});

it("distinguishes pending, failed and empty reading and allows retry", async () => {
  vi.stubEnv("VITE_ADMIN_LEARNING_ENABLED", "true");
  storeTestSession(adminSession);
  let finish!: (response: MockApiResponse) => void;
  let failed = false;
  mockApi(({ method, path }) => {
    if (method === "GET" && path === "/api/auth/session") return { status: 200, body: adminSession };
    if (method === "GET" && path === "/api/learning/tips") {
      if (failed) return { status: 200, body: { items: [] } };
      return new Promise<MockApiResponse>((resolve) => { finish = resolve; });
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  window.history.replaceState({}, "", "/admin/learning");
  render(<App />);
  expect(await screen.findByText("Загружаем советы…")).toBeVisible();
  expect(screen.queryByRole("link", { name: /Добавить/ })).not.toBeInTheDocument();
  finish({ status: 503 });
  expect(await screen.findByText("Не удалось загрузить советы. Проверьте соединение и попробуйте ещё раз.")).toBeVisible();
  failed = true;
  await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
  expect(await screen.findByRole("link", { name: "Добавить первый совет" })).toBeVisible();
});

it.each(["/admin", "/admin/catalog", "/admin/learning", "/admin/learning/new", "/admin/learning/tip/edit"])("denies a regular user the protected route %s", async (path) => {
  vi.stubEnv("VITE_ADMIN_LEARNING_ENABLED", "true");
  storeTestSession(session);
  mockApi(({ method, path: apiPath }) => {
    if (method === "GET" && apiPath === "/api/auth/session") return { status: 200, body: session };
    if (method === "GET" && apiPath.startsWith("/api/dashboard")) return new Promise<MockApiResponse>(() => {});
    throw new Error(`Unexpected request: ${method} ${apiPath}`);
  });
  window.history.replaceState({}, "", path);
  render(<App />);
  await expectPath("/dashboard");
  expect(screen.queryByRole("link", { name: "Админка" })).not.toBeInTheDocument();
});

it("keeps the new administration disabled until the joint release", async () => {
  vi.stubEnv("VITE_ADMIN_LEARNING_ENABLED", "false");
  storeTestSession(adminSession);
  mockApi(({ method, path }) => {
    if (method === "GET" && path === "/api/auth/session") return { status: 200, body: adminSession };
    if (method === "GET" && path === "/api/admin/catalog") return { status: 200, body: { sources: [] } };
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  window.history.replaceState({}, "", "/admin/learning/new");
  render(<App />);
  await expectPath("/admin");
  expect(await screen.findByRole("link", { name: "Новая шлока" })).toBeVisible();
  expect(screen.queryByRole("link", { name: /Обучение/ })).not.toBeInTheDocument();
});
