import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderWithTestProviders, session, storeTestSession } from "@/shared/test/harness";

import { LearningPage } from "./learning.page";

const tips = [
  { id: "second", title: "Сначала смысл", text: "Первый серверный материал" },
  { id: "first", title: "Потом звучание", text: "Второй серверный материал" },
] satisfies ApiTypes.LearningTipDto[];

describe("learning page", () => {
  it("reads a fresh ordered list on entry and keeps accordion state while reading", async () => {
    const user = userEvent.setup();
    let items = tips;
    let calls = 0;
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/auth/session") return { status: 200, body: session };
      if (method === "GET" && path === "/api/learning/tips") { calls++; return { status: 200, body: { items } }; }
      throw new Error(`Unexpected ${method} ${path}`);
    });
    storeTestSession();
    const view = renderWithTestProviders(<LearningPage />);
    const first = await screen.findByRole("button", { name: tips[0]!.title });
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(tips.map((tip) => tip.title));
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(tips[1]!.text)).toBeInTheDocument();
    await user.click(first);
    expect(screen.getByText(tips[0]!.text)).toBeInTheDocument();
    items = [{ id: "new", title: "Новый материал", text: "Новый текст" }];
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    await user.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(calls).toBe(1);
    view.unmount();
    renderWithTestProviders(<LearningPage />);
    expect(await screen.findByRole("button", { name: "Новый материал" })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("shows loading, retries errors, and accepts an empty list", async () => {
    const user = userEvent.setup();
    let resolve!: (value: { status: number; body: unknown }) => void;
    let failed = false;
    mockApi(({ method, path }) => {
      if (method === "GET" && path === "/api/auth/session") return { status: 200, body: session };
      if (method === "GET" && path === "/api/learning/tips") {
        if (failed) return { status: 200, body: { items: [] } };
        failed = true;
        return new Promise((done) => { resolve = done; });
      }
      throw new Error(`Unexpected ${method} ${path}`);
    });
    storeTestSession();
    renderWithTestProviders(<LearningPage />);
    expect(await screen.findByText("Загружаем советы…")).toBeInTheDocument();
    resolve({ status: 503, body: { message: "Unavailable" } });
    expect(await screen.findByText("Не удалось загрузить советы")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("Советов пока нет")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });
});
