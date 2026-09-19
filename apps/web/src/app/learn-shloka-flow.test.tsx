import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { describe, expect, it } from "vitest";

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

const adviceTips = [
  { id: "tip-a", title: "Смысл", text: "Совет с сервера: сначала разберите смысл." },
  { id: "tip-b", title: "Звучание", text: "Совет с сервера: повторите строку вслух." },
  { id: "tip-c", title: "Память", text: "Совет с сервера: вспомните без подсказки." },
] satisfies ApiTypes.LearningTipDto[];

const learningPadas = [
  "дхарма-кшетре куру-кшетре",
  "самавета юютсавах",
  "мамаках пандавашчаива",
  "кимакурвата санджая",
];
const learningShloka = shloka({
  code: "gita-1-1",
  displayTitle: "Бхагавад-гита 1.1",
  text: learningPadas.join("\n"),
});
const learningShlokaDetails = {
  ...learningShloka,
  padas: learningPadas,
} satisfies ApiTypes.LibraryShlokaDetailsDto;
const secondLearningShloka = shloka({
  code: "gita-4-7",
  displayTitle: "Бхагавад-гита 4.7",
});
const thirdLearningShloka = shloka({
  code: "gita-4-8",
  displayTitle: "Бхагавад-гита 4.8",
});
const learningItemPath = "/api/library/items/gita-1-1";
const completeLearningPath = `${learningItemPath}/complete-learning`;
const libraryPath = "/api/library";

describe("app learn shloka flow", () => {
  it("shows the accepted loading shell and lets the user cancel to the dashboard", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (isSessionRequest(request)) {
        return { status: 200, body: session };
      }
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw unhandled(request);
    });
    storeTestSession(session);

    renderAppAt("/library/shlokas/gita-1-1/learn");

    expect(
      await screen.findByRole("status", { name: "Загрузка шлоки" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(routePaths.dashboard);
    expect(window.history.length).toBe(historyLength);
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it.each([
    {
      entryPath: routePaths.dashboard,
      expectedReturnTo: routePaths.dashboard,
      expectedSearch: "",
      label: "dashboard",
    },
    {
      entryPath: "/library?tab=learning",
      expectedReturnTo: "/library?tab=learning",
      expectedSearch: "?tab=learning",
      label: "to-learn library tab",
    },
    {
      entryPath: "/library?tab=all",
      expectedReturnTo: "/library?tab=all",
      expectedSearch: "?tab=all",
      label: "all library tab",
    },
  ])("round-trips the $label origin without a mutation", async ({
    entryPath,
    expectedReturnTo,
    expectedSearch,
  }) => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request, {
        dashboardLearningShlokas: [learningShloka],
        libraryShlokas: [learningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt(entryPath);

    if (entryPath === routePaths.dashboard) {
      await user.click(
        await screen.findByRole("link", {
          name: `Учить ${learningShloka.displayTitle}`,
        }),
      );
    } else {
      const card = await screen.findByRole("article", {
        name: learningShloka.displayTitle,
      });
      await user.click(within(card).getByRole("button", { name: "Учить" }));
    }

    await expectPath("/library/shlokas/gita-1-1/learn");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
      expectedReturnTo,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Канонический текст шлоки")).toHaveLength(
      1,
    );
    expect(screen.getByLabelText("Канонический текст шлоки").textContent).toBe(
      learningShloka.text,
    );
    expect(
      screen.getByRole("button", { name: "Совет" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
    expect(
      screen.getByRole("button", { name: "Помощник" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выучил" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(new URL(entryPath, window.location.origin).pathname);
    expect(window.location.search).toBe(expectedSearch);
    expect(window.history.length).toBe(historyLength);
    expect(
      requests.some(
        ({ method, path }) =>
          method === "POST" && path.endsWith("/complete-learning"),
      ),
    ).toBe(false);
  });

  it("walks all seven helper fragments through read, recall, and check before returning to the same attempt", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt(
      "/library/shlokas/gita-1-1/learn?returnTo=%2Flibrary%3Ftab%3Dlearning",
    );

    const attemptUrl = window.location.href;
    const historyLength = window.history.length;
    await user.click(
      await screen.findByRole("button", { name: "Помощник" }),
    );

    expect(window.location.href).toBe(attemptUrl);
    expect(window.history.length).toBe(historyLength);
    expect(
      screen.getByRole("heading", { level: 1, name: "Помощник" }),
    ).toBeInTheDocument();

    const fragments = [
      { label: "Пада 1", text: learningPadas[0] },
      { label: "Пада 2", text: learningPadas[1] },
      { label: "Пады 1 + 2", text: learningPadas.slice(0, 2).join("\n") },
      { label: "Пада 3", text: learningPadas[2] },
      { label: "Пада 4", text: learningPadas[3] },
      { label: "Пады 3 + 4", text: learningPadas.slice(2).join("\n") },
      { label: "Вся шлока", text: learningPadas.join("\n") },
    ];

    for (const [index, fragment] of fragments.entries()) {
      const position = index + 1;
      expect(screen.getByText(fragment.label)).toBeInTheDocument();
      expect(screen.getByText(`${position} / 7`)).toBeInTheDocument();
      expect(
        screen.getByRole("progressbar", { name: "Прогресс помощника" }),
      ).toHaveAttribute("aria-valuenow", String(position));
      expect(screen.getByRole("status")).toHaveTextContent(
        "Прочитайте и запомните",
      );
      expect(screen.getByLabelText("Текущий фрагмент шлоки").textContent).toBe(
        fragment.text,
      );
      expect(
        within(
          screen.getByRole("group", { name: "Действие помощника" }),
        ).getAllByRole("button"),
      ).toHaveLength(1);

      await user.click(
        screen.getByRole("button", { name: "Скрыть и повторить" }),
      );

      expect(screen.getByRole("status")).toHaveTextContent("Текст скрыт");
      expect(screen.getByText("Произнесите по памяти")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Текущий фрагмент шлоки"),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Показать и свериться" }),
      );

      expect(screen.getByRole("status")).toHaveTextContent("Сверьтесь");
      expect(screen.getByLabelText("Текущий фрагмент шлоки").textContent).toBe(
        fragment.text,
      );

      await user.click(
        screen.getByRole("button", {
          name:
            position === fragments.length
              ? "Вернуться к шлоке"
              : "Следующий фрагмент",
        }),
      );
    }

    expect(window.location.href).toBe(attemptUrl);
    expect(window.history.length).toBe(historyLength);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки").textContent).toBe(
      learningShloka.text,
    );
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it.each([
    { actions: [], phase: "read" },
    { actions: ["Скрыть и повторить"], phase: "recall" },
    {
      actions: ["Скрыть и повторить", "Показать и свериться"],
      phase: "check",
    },
  ])("returns early from the $phase phase and re-enters from the first pada", async ({
    actions,
  }) => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Помощник" }),
    );
    for (const action of actions) {
      await user.click(screen.getByRole("button", { name: action }));
    }

    await user.click(screen.getByRole("button", { name: "К шлоке" }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Канонический текст шлоки").textContent).toBe(
      learningShloka.text,
    );

    await user.click(screen.getByRole("button", { name: "Помощник" }));

    expect(screen.getByText("Пада 1")).toBeInTheDocument();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Прочитайте и запомните",
    );
    expect(screen.getByLabelText("Текущий фрагмент шлоки").textContent).toBe(
      learningPadas[0],
    );
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
  });

  it.each([
    ["missing", ""],
    ["external", "https://example.com/phishing"],
    ["auth", "/login"],
    ["admin", "/admin"],
    ["cyclic", "/library/shlokas/gita-1-1/learn"],
    ["unknown", "/not-a-route"],
    ["invalid query", "/library?tab=learning&unsafe=true"],
  ])("normalizes a %s returnTo to the dashboard", async (_, returnTo) => {
    const user = userEvent.setup();
    mockApi((request) => learningApi(request));
    storeTestSession(session);
    const search = returnTo
      ? `?${new URLSearchParams({ returnTo }).toString()}`
      : "";
    renderAppAt(`/library/shlokas/gita-1-1/learn${search}`);

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
        routePaths.dashboard,
      );
    });
    await screen.findByRole("heading", {
      level: 1,
      name: learningShloka.displayTitle,
    });
    await user.click(
      screen.getByRole("button", { name: "Отмена" }),
    );

    await expectPath(routePaths.dashboard);
  });

  it("retries a failed load once and opens the active attempt", async () => {
    const user = userEvent.setup();
    let itemGetCount = 0;
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        itemGetCount += 1;
        return itemGetCount === 1
          ? {
              status: 500,
              body: {
                code: "DATA_INTEGRITY_ERROR",
                message: "Не удалось загрузить шлоку",
              },
            }
          : { status: 200, body: learningShlokaDetails };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Не удалось загрузить шлоку",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отмена и возврат" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Помощник" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Канонический текст шлоки"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Попробовать снова" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(itemGetCount).toBe(2);
  });

  it("returns from a load error without sending a mutation", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return { status: 500 };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt(
      "/library/shlokas/gita-1-1/learn?returnTo=%2Flibrary%3Ftab%3Dlearning",
    );

    const historyLength = window.history.length;
    await user.click(
      await screen.findByRole("button", { name: "Отмена и возврат" }),
    );

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=learning");
    expect(window.history.length).toBe(historyLength);
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
  });

  it("keeps a non-repeating advice series across the complete dialog focus lifecycle", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let items = adviceTips;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === "/api/learning/tips") return { status: 200, body: { items } };
      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    const adviceTrigger = await screen.findByRole("button", {
      name: "Совет",
    });
    expect(requests.some((request) => request.path === "/api/learning/tips")).toBe(false);
    await user.click(adviceTrigger);

    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    const closeButton = within(dialog).getByRole("button", {
      name: "Закрыть совет",
    });
    const anotherAdviceButton = await within(dialog).findByRole("button", {
      name: "Другой совет",
    });
    const allAdviceLink = within(dialog).getByRole("link", {
      name: "Все советы",
    });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
    expect(
      screen.queryByRole("button", { name: "Выучил" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(adviceTips[0]!.text),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Совет 1 из 3")).toBeInTheDocument();

    items = [{ id: "new", title: "Новая версия", text: "Текст после правок" }];
    await user.tab();
    expect(anotherAdviceButton).toHaveFocus();
    await user.tab();
    expect(allAdviceLink).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(anotherAdviceButton);
    expect(
      within(dialog).getByText(adviceTips[1]!.text),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Совет 2 из 3")).toBeInTheDocument();
    await user.click(closeButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(adviceTrigger).toHaveFocus();
    await user.click(adviceTrigger);

    const reopenedDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(reopenedDialog).getByText(adviceTips[1]!.text),
    ).toBeInTheDocument();
    await user.click(
      within(reopenedDialog).getByRole("button", {
        name: "Другой совет",
      }),
    );

    expect(
      within(reopenedDialog).getByText(adviceTips[2]!.text),
    ).toBeInTheDocument();
    expect(
      within(reopenedDialog).queryByText(/Совет \d из \d/),
    ).not.toBeInTheDocument();
    expect(
      within(reopenedDialog).getByRole("button", {
        name: "Других советов нет",
      }),
    ).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(adviceTrigger).toHaveFocus();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("retries a failed advice load and freezes an empty response until the attempt ends", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/learning/tips") {
        calls++;
        if (calls === 1) return { status: 503, body: { message: "Unavailable" } };
        return { status: 200, body: { items: calls === 2 ? [] : adviceTips } };
      }
      return learningApi(request, { dashboardLearningShlokas: [learningShloka] });
    });
    storeTestSession();
    renderAppAt("/library/shlokas/gita-1-1/learn");
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText("Не удалось загрузить советы. Попробуйте ещё раз.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("Советов пока нет")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Другой совет" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрыть совет" }));
    await user.click(screen.getByRole("button", { name: "Совет" }));
    expect(screen.getByText("Советов пока нет")).toBeInTheDocument();
    expect(calls).toBe(2);
    await user.click(screen.getByRole("button", { name: "Закрыть совет" }));
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await user.click(await screen.findByRole("link", { name: `Учить ${learningShloka.displayTitle}` }));
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText(adviceTips[0]!.text)).toBeInTheDocument();
    expect(calls).toBe(3);
  });

  it.each(["helper", "all tips"])("freezes the first successful response while visiting %s", async (destination) => {
    const user = userEvent.setup();
    let resolve!: (value: MockApiResponse) => void;
    let calls = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/learning/tips") {
        calls++;
        if (calls === 1) return new Promise<MockApiResponse>((done) => { resolve = done; });
        return { status: 200, body: { items: [{ id: "new", title: "Новая версия", text: "Изменённый текст" }] } };
      }
      return learningApi(request);
    });
    storeTestSession();
    renderAppAt("/library/shlokas/gita-1-1/learn");
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText("Загружаем советы…")).toBeInTheDocument();
    if (destination === "helper") {
      await user.click(screen.getByRole("button", { name: "Закрыть совет" }));
      await user.click(screen.getByRole("button", { name: "Помощник" }));
    } else {
      await user.click(screen.getByRole("link", { name: "Все советы" }));
      expect(await screen.findByText("Изменённый текст")).toBeInTheDocument();
    }
    await act(async () => { resolve({ status: 200, body: { items: adviceTips } }); });
    if (destination === "helper") {
      await user.click(screen.getByRole("button", { name: "К шлоке" }));
    } else {
      act(() => { window.history.back(); });
    }
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText(adviceTips[0]!.text)).toBeInTheDocument();
    expect(calls).toBe(destination === "helper" ? 1 : 2);
  });

  it.each([false, true])("reuses an in-flight or captured response after returning from the helper (resolved: %s)", async (resolveBeforeOpen) => {
    const user = userEvent.setup();
    let resolve!: (value: MockApiResponse) => void;
    let calls = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/learning/tips") {
        calls++;
        if (calls === 1) return new Promise<MockApiResponse>((done) => { resolve = done; });
        return { status: 503, body: { message: "Must reuse first request" } };
      }
      return learningApi(request);
    });
    storeTestSession();
    renderAppAt("/library/shlokas/gita-1-1/learn");
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    await user.click(screen.getByRole("button", { name: "Закрыть совет" }));
    await user.click(screen.getByRole("button", { name: "Помощник" }));
    await user.click(screen.getByRole("button", { name: "К шлоке" }));
    if (resolveBeforeOpen) await act(async () => { resolve({ status: 200, body: { items: adviceTips } }); });
    await user.click(screen.getByRole("button", { name: "Совет" }));
    if (!resolveBeforeOpen) await act(async () => { resolve({ status: 200, body: { items: adviceTips } }); });
    expect(await screen.findByText(adviceTips[0]!.text)).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("ignores a late advice response from a cancelled attempt", async () => {
    const user = userEvent.setup();
    let resolve!: (value: MockApiResponse) => void;
    let calls = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === "/api/learning/tips") {
        calls++;
        if (calls === 1) return new Promise<MockApiResponse>((done) => { resolve = done; });
        return { status: 200, body: { items: adviceTips } };
      }
      return learningApi(request, { dashboardLearningShlokas: [learningShloka] });
    });
    storeTestSession();
    renderAppAt("/library/shlokas/gita-1-1/learn");
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText("Загружаем советы…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Закрыть совет" }));
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await user.click(await screen.findByRole("link", { name: `Учить ${learningShloka.displayTitle}` }));
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    expect(await screen.findByText(adviceTips[0]!.text)).toBeInTheDocument();
    await act(async () => { resolve({ status: 200, body: { items: [{ id: "old", title: "Старый", text: "Устаревший ответ" }] } }); });
    expect(screen.queryByText("Устаревший ответ")).not.toBeInTheDocument();
    expect(screen.getByText(adviceTips[0]!.text)).toBeInTheDocument();
  });

  it("restores the unfinished attempt and advice series after native Back", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request);
    });
    storeTestSession(session);
    const attemptPath = "/library/shlokas/gita-1-1/learn";
    renderAppAt(attemptPath);

    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("link", { name: "Все советы" }),
    );

    await expectPath(routePaths.learning);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Советы" }),
    ).toBeInTheDocument();
    act(() => {
      window.history.back();
    });

    await expectPath(attemptPath);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: learningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Совет" }));

    const restoredDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(restoredDialog).getByText(adviceTips[1]!.text),
    ).toBeInTheDocument();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("starts a fresh advice series for a new attempt", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      return learningApi(request, {
        dashboardLearningShlokas: [learningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Закрыть совет" }),
    );
    await user.click(screen.getByRole("button", { name: "Отмена" }));

    await expectPath(routePaths.dashboard);
    await user.click(
      await screen.findByRole("link", {
        name: `Учить ${learningShloka.displayTitle}`,
      }),
    );
    await expectPath("/library/shlokas/gita-1-1/learn");
    await user.click(
      await screen.findByRole("button", { name: "Совет" }),
    );

    const freshDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(freshDialog).getByText(adviceTips[0]!.text),
    ).toBeInTheDocument();
    expect(within(freshDialog).getByText("Совет 1 из 3")).toBeInTheDocument();
    expect(
      requests.some(({ method }) => method !== "GET"),
    ).toBe(false);
  });

  it("shows a reviewing status guard and returns without a mutation", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return {
          status: 200,
          body: { ...learningShloka, personalStatus: "reviewing" },
        };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    const returnTo = "/library?tab=all";
    renderAppAt(
      `/library/shlokas/gita-1-1/learn?${new URLSearchParams({ returnTo }).toString()}`,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока уже в повторении",
      }),
    ).toBeInTheDocument();
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Вернуться" }));

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=all");
    expect(window.history.length).toBe(historyLength);
    expect(requests.every(({ method }) => method === "GET")).toBe(true);
  });

  it("safely leaves an attempt whose current status is unavailable", async () => {
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/library/items/gita-1-1"
      ) {
        return {
          status: 200,
          body: { ...learningShloka, personalStatus: "available" },
        };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await expectPath(routePaths.dashboard);
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 1,
          name: learningShloka.displayTitle,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("sends one completion while all conflicting actions stay disabled and native Back remains available", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    mockApi((request) => {
      requests.push(request);
      if (isSessionRequest(request)) {
        return { status: 200, body: session };
      }
      if (request.method === "GET" && request.path === learningItemPath) {
        return { status: 200, body: learningShloka };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        return new Promise<MockApiResponse>(() => undefined);
      }

      throw unhandled(request);
    });
    storeTestSession(session);
    window.history.pushState({}, "", routePaths.dashboard);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(screen.getByRole("button", { name: "Сохраняем…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Совет" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Помощник" })).toBeDisabled();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);
    expect(requests.find(({ path }) => path === completeLearningPath)?.body).toEqual({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    act(() => {
      window.history.back();
    });

    await expectPath(routePaths.dashboard);
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);
  });

  it("does not clear a new attempt advice series after an old completion resolves", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let resolveCompletion!: (response: MockApiResponse) => void;
    const completion = new Promise<MockApiResponse>((resolve) => {
      resolveCompletion = resolve;
    });
    mockApi((request) => {
      requests.push(request);
      if (request.method === "POST" && request.path === completeLearningPath) {
        return completion;
      }

      return learningApi(request, {
        dashboardLearningShlokas: [secondLearningShloka],
      });
    });
    storeTestSession(session);
    window.history.pushState({}, "", routePaths.dashboard);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );
    act(() => {
      window.history.back();
    });
    await expectPath(routePaths.dashboard);
    await user.click(
      await screen.findByRole("link", {
        name: `Учить ${secondLearningShloka.displayTitle}`,
      }),
    );
    await expectPath("/library/shlokas/gita-4-7/learn");

    await user.click(await screen.findByRole("button", { name: "Совет" }));
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Закрыть совет" }),
    );

    await act(async () => {
      resolveCompletion({
        status: 200,
        body: {
          remainingLearningShlokas: [secondLearningShloka],
          shloka: { ...learningShloka, personalStatus: "reviewing" },
        } satisfies ApiTypes.CompleteLearningDto,
      });
      await completion;
    });

    await user.click(screen.getByRole("button", { name: "Совет" }));
    const reopenedDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    await user.click(
      within(reopenedDialog).getByRole("link", { name: "Все советы" }),
    );
    await expectPath(routePaths.learning);
    act(() => {
      window.history.back();
    });
    await expectPath("/library/shlokas/gita-4-7/learn");
    await user.click(await screen.findByRole("button", { name: "Совет" }));
    const restoredDialog = await screen.findByRole("dialog", {
      name: "Совет",
    });
    expect(
      within(restoredDialog).getByText(adviceTips[1]!.text),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);
  });

  it("requires an explicit retry after a confirmed completion error", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let completionCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "POST" && request.path === completeLearningPath) {
        completionCount += 1;
        if (completionCount === 1) {
          return {
            status: 400,
            body: {
              code: "VALIDATION_ERROR",
              message: "Переход не состоялся",
            } satisfies ApiTypes.ApiError,
          };
        }
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByText(
        "Не удалось изменить статус. Можно попробовать снова — повторной подтверждённой операции не было.",
      ),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Попробовать снова" })).toBeEnabled();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Попробовать снова" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `POST ${completeLearningPath}`,
    ]);
  });

  it("treats an unreadable completion response as success only after GET confirms reviewing", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let itemGetCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === learningItemPath) {
        itemGetCount += 1;
        return {
          status: 200,
          body:
            itemGetCount === 1
              ? learningShloka
              : { ...learningShloka, personalStatus: "reviewing" },
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        return { status: 200 };
      }

      return learningApi(request, {
        libraryShlokas: [secondLearningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `GET ${libraryPath}`,
    ]);
    await user.click(screen.getByRole("button", { name: "Учить следующую" }));
    await expectPath("/library/shlokas/gita-4-7/learn");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
      routePaths.dashboard,
    );
  });

  it("keeps recovery read-only when the authoritative library refresh fails", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let itemGetCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === learningItemPath) {
        itemGetCount += 1;
        return {
          status: 200,
          body:
            itemGetCount === 1
              ? learningShloka
              : { ...learningShloka, personalStatus: "reviewing" },
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        return { status: 200 };
      }
      if (request.method === "GET" && request.path === libraryPath) {
        return {
          status: 503,
          body: {
            code: "DATA_INTEGRITY_ERROR",
            message: "Библиотека временно недоступна",
          } satisfies ApiTypes.ApiError,
        };
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("button", { name: "Проверить статус" }),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `GET ${libraryPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Проверить статус" }));

    await waitFor(() => {
      expect(completionSequence(requests)).toEqual([
        `GET ${learningItemPath}`,
        `POST ${completeLearningPath}`,
        `GET ${learningItemPath}`,
        `GET ${libraryPath}`,
        `GET ${learningItemPath}`,
        `GET ${libraryPath}`,
      ]);
    });
    expect(
      screen.getByRole("button", { name: "Проверить статус" }),
    ).toBeInTheDocument();
  });

  it("allows an explicit retry only after GET confirms learning", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let completionCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "POST" && request.path === completeLearningPath) {
        completionCount += 1;
        if (completionCount === 1) {
          return {
            status: 500,
            body: {
              code: "DATA_INTEGRITY_ERROR",
              message: "Не удалось получить результат",
            } satisfies ApiTypes.ApiError,
          };
        }
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("button", { name: "Попробовать снова" }),
    ).toBeEnabled();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Попробовать снова" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);
  });

  it("uses the safe guard when GET resolves an ambiguous result to another status", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let itemGetCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === learningItemPath) {
        itemGetCount += 1;
        return {
          status: 200,
          body:
            itemGetCount === 1
              ? learningShloka
              : { ...learningShloka, personalStatus: "available" },
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        throw new TypeError("Connection lost after sending request");
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    await expectPath(routePaths.dashboard);
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
    ]);
  });

  it("checks an unknown result with GET only until learning is confirmed and retry is explicit", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let itemGetCount = 0;
    let completionCount = 0;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === learningItemPath) {
        itemGetCount += 1;
        if (itemGetCount === 1 || itemGetCount === 4) {
          return { status: 200, body: learningShloka };
        }

        return {
          status: 503,
          body: {
            code: "DATA_INTEGRITY_ERROR",
            message: "Статус временно недоступен",
          } satisfies ApiTypes.ApiError,
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        completionCount += 1;
        if (completionCount === 1) {
          throw new TypeError("Connection lost after sending request");
        }
      }

      return learningApi(request);
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByText(
        "Результат пока неясен. Сначала проверим актуальный статус, не отправляя «Выучил» повторно.",
      ),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Проверить статус" }));

    expect(
      await screen.findByRole("button", { name: "Проверить статус" }),
    ).toBeEnabled();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `GET ${learningItemPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Проверить статус" }));

    expect(
      await screen.findByRole("button", { name: "Попробовать снова" }),
    ).toBeEnabled();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `GET ${learningItemPath}`,
      `GET ${learningItemPath}`,
    ]);

    await user.click(screen.getByRole("button", { name: "Попробовать снова" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionSequence(requests)).toEqual([
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
      `GET ${learningItemPath}`,
      `GET ${learningItemPath}`,
      `GET ${learningItemPath}`,
      `POST ${completeLearningPath}`,
    ]);
  });

  it("keeps the confirmed success visible and finishes in the original dashboard", async () => {
    const user = userEvent.setup();
    const completionRequests: MockApiRequest[] = [];
    let completedLearning = false;
    mockApi((request) => {
      if (
        request.method === "GET" &&
        request.path === "/api/dashboard/streak"
      ) {
        return {
          status: 200,
          body: streak(completedLearning),
        };
      }
      if (
        request.method === "POST" &&
        request.path === "/api/library/items/gita-1-1/complete-learning"
      ) {
        completionRequests.push(request);
        completedLearning = true;
      }

      return learningApi(request, {
        dashboardLearningShlokas: [learningShloka],
        remainingLearningShlokas: [],
      });
    });
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    expect(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("link", {
        name: `Учить ${learningShloka.displayTitle}`,
      }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    expect(completionRequests).toHaveLength(1);
    expect(completionRequests[0]?.body).toEqual({
      timeZone: expect.any(String),
    });
    expect(
      screen.getByText(
        `${learningShloka.displayTitle} теперь появится в расписании повторений.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Учить следующую" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Выбрать другую" }),
    ).toBeInTheDocument();
    await expectPath("/library/shlokas/gita-1-1/learn");

    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Закончить" }));

    await expectPath(routePaths.dashboard);
    expect(window.history.length).toBe(historyLength);
    expect(await screen.findByRole("navigation")).toBeInTheDocument();
    const streakLink = screen.getByRole("link", {
      name: "Открыть страницу серии дней: 1 день подряд",
    });
    expect(streakLink).toBeInTheDocument();

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

  it("refetches the library boundary before finishing in the original tab", async () => {
    const user = userEvent.setup();
    const requests: MockApiRequest[] = [];
    let completedLearning = false;
    mockApi((request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === libraryPath) {
        return {
          status: 200,
          body: library([
            {
              ...learningShloka,
              personalStatus: completedLearning ? "reviewing" : "learning",
            },
          ]),
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        completedLearning = true;
      }

      return learningApi(request, { remainingLearningShlokas: [] });
    });
    storeTestSession(session);
    renderAppAt(routePaths.library);

    await user.click(
      await screen.findByRole("tab", { name: "Буду учить" }),
    );
    const learningCard = await screen.findByRole("article", {
      name: learningShloka.displayTitle,
    });
    await user.click(
      within(learningCard).getByRole("button", { name: "Учить" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );
    await user.click(screen.getByRole("button", { name: "Закончить" }));

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=learning");
    expect(
      requests.filter(
        ({ method, path }) => method === "GET" && path === libraryPath,
      ),
    ).toHaveLength(2);
    expect(
      await screen.findByText("Пока нет шлок для заучивания"),
    ).toBeInTheDocument();
  });

  it("starts the next shloka without temporary state from an ambiguous completion", async () => {
    const user = userEvent.setup();
    let firstItemGetCount = 0;
    mockApi((request) => {
      if (request.method === "GET" && request.path === learningItemPath) {
        firstItemGetCount += 1;
        return {
          status: 200,
          body:
            firstItemGetCount === 1
              ? learningShloka
              : { ...learningShloka, personalStatus: "reviewing" },
        };
      }
      if (request.method === "POST" && request.path === completeLearningPath) {
        throw new TypeError("Connection lost after sending request");
      }

      return learningApi(request, {
        libraryShlokas: [secondLearningShloka],
      });
    });
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(await screen.findByRole("button", { name: "Совет" }));
    const dialog = await screen.findByRole("dialog", { name: "Совет" });
    await user.click(
      within(dialog).getByRole("button", { name: "Другой совет" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Закрыть совет" }),
    );
    await user.click(screen.getByRole("button", { name: "Выучил" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Учить следующую" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: secondLearningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: "Шлока добавлена в повторение",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выучил" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Совет" }));
    const freshDialog = await screen.findByRole("dialog", { name: "Совет" });
    expect(
      within(freshDialog).getByText(adviceTips[0]!.text),
    ).toBeInTheDocument();
    expect(within(freshDialog).getByText("Совет 1 из 3")).toBeInTheDocument();
  });

  it.each([
    {
      label: "several shlokas remain",
      remaining: [secondLearningShloka, thirdLearningShloka],
    },
    {
      label: "one shloka remains",
      remaining: [secondLearningShloka],
    },
  ])("starts the first current shloka when $label", async ({ remaining }) => {
    const user = userEvent.setup();
    mockApi((request) =>
      learningApi(request, {
        libraryShlokas: remaining,
        remainingLearningShlokas: remaining,
      }),
    );
    storeTestSession(session);
    const returnTo = "/library?tab=reviewing";
    renderAppAt(
      `/library/shlokas/gita-1-1/learn?${new URLSearchParams({ returnTo }).toString()}`,
    );

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Учить следующую" }));

    await expectPath("/library/shlokas/gita-4-7/learn");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(
      returnTo,
    );
    expect(window.history.length).toBe(historyLength);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: secondLearningShloka.displayTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("omits the next action when no current learning shloka remains", async () => {
    const user = userEvent.setup();
    mockApi((request) =>
      learningApi(request, {
        libraryShlokas: [],
        remainingLearningShlokas: [],
      }),
    );
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );

    expect(
      screen.queryByRole("button", { name: "Учить следующую" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "В списке «Буду учить» больше нет шлок. Можно выбрать другую самостоятельно.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Выбрать другую" }),
    ).toBeInTheDocument();
  });

  it.each([
    {
      label: "several shlokas remain",
      remaining: [secondLearningShloka, thirdLearningShloka],
    },
    {
      label: "one shloka remains",
      remaining: [secondLearningShloka],
    },
    { label: "no shloka remains", remaining: [] },
  ])("opens independent selection when $label", async ({ remaining }) => {
    const user = userEvent.setup();
    mockApi((request) =>
      learningApi(request, {
        libraryShlokas: remaining,
        remainingLearningShlokas: remaining,
      }),
    );
    storeTestSession(session);
    renderAppAt("/library/shlokas/gita-1-1/learn");

    await user.click(
      await screen.findByRole("button", { name: "Выучил" }),
    );
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Выбрать другую" }));

    await expectPath(routePaths.library);
    expect(window.location.search).toBe("?tab=all");
    expect(window.history.length).toBe(historyLength);
    expect(
      await screen.findByRole("tab", { name: "Все" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

function learningApi(
  request: MockApiRequest,
  options: {
    dashboardLearningShlokas?: ApiTypes.LibraryShlokaDto[];
    libraryShlokas?: ApiTypes.LibraryShlokaDto[];
    remainingLearningShlokas?: ApiTypes.LibraryShlokaDto[];
  } = {},
): MockApiResponse {
  if (isSessionRequest(request)) {
    return { status: 200, body: session };
  }
  if (request.method === "GET" && request.path === "/api/learning/tips") return { status: 200, body: { items: adviceTips } };
  if (request.method === "GET" && request.path === "/api/library") {
    return {
      status: 200,
      body: library(options.libraryShlokas ?? [learningShloka]),
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/review-shlokas"
  ) {
    return {
      status: 200,
      body: {
        hasReviewingShlokas: false,
        items: [],
        remainingCount: 0,
        state: "empty",
      } satisfies ApiTypes.DashboardReviewShlokaListDto,
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/learning-shlokas"
  ) {
    const items = options.dashboardLearningShlokas ?? [];

    return {
      status: 200,
      body: {
        hasLearningShlokas: items.length > 0,
        items,
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
      body: streak(true),
    };
  }

  const itemMatch = request.path.match(/^\/api\/library\/items\/([^/]+)$/);
  if (request.method === "GET" && itemMatch) {
    const code = decodeURIComponent(itemMatch[1] ?? "");
    const item = [
      learningShlokaDetails,
      secondLearningShloka,
      thirdLearningShloka,
    ].find((candidate) => candidate.code === code);

    if (item) {
      return { status: 200, body: item };
    }
  }
  if (
    request.method === "POST" &&
    request.path === "/api/library/items/gita-1-1/complete-learning"
  ) {
    return {
      status: 200,
      body: {
        remainingLearningShlokas:
          options.remainingLearningShlokas ?? [],
        shloka: { ...learningShloka, personalStatus: "reviewing" },
      } satisfies ApiTypes.CompleteLearningDto,
    };
  }

  throw unhandled(request);
}

function streak(continuedToday: boolean): ApiTypes.DashboardStreakDto {
  return {
    continuedToday,
    days: continuedToday ? 1 : 0,
    history: [
      { hasActivity: false, userDay: "2026-07-08" },
      { hasActivity: false, userDay: "2026-07-09" },
      { hasActivity: false, userDay: "2026-07-10" },
      { hasActivity: false, userDay: "2026-07-11" },
      { hasActivity: continuedToday, userDay: "2026-07-12" },
    ],
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

function shloka(
  overrides: Partial<ApiTypes.LibraryShlokaDto> = {},
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

function isSessionRequest({ method, path }: MockApiRequest): boolean {
  return method === "GET" && path === "/api/auth/session";
}

function completionSequence(requests: MockApiRequest[]): string[] {
  return requests
    .filter(
      ({ path }) =>
        path === libraryPath ||
        path === learningItemPath ||
        path === completeLearningPath,
    )
    .map(({ method, path }) => `${method} ${path}`);
}

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function unhandled({ method, path }: MockApiRequest): Error {
  return new Error(`Unhandled test API request: ${method} ${path}`);
}
