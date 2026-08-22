import { act } from "react";
import { render, screen, within } from "@testing-library/react";
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

describe("app streak flow", () => {
  it("opens the zero series from the always-visible dashboard control and returns explicitly", async () => {
    const user = userEvent.setup();
    mockApi((request) => streakApi(request, zeroSeries));
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    const streakLink = await screen.findByRole("link", {
      name: "Открыть страницу серии дней: 0 дней подряд",
    });
    expect(streakLink).toHaveAttribute("href", routePaths.streak);

    await user.tab();
    expect(streakLink).toHaveFocus();
    await user.keyboard("{Enter}");

    await expectPath(routePaths.streak);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Подряд" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 дней подряд")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Повтори или выучи хотя бы одну шлоку, чтобы начать свою серию!",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    const history = screen.getByRole("list", {
      name: "Активность за последние пять дней",
    });
    expect(within(history).getAllByRole("listitem")).toHaveLength(5);
    expect(
      within(history).getByRole("listitem", {
        name: "8 июля, среда: активность была",
      }),
    ).toBeInTheDocument();
    expect(
      within(history).getByRole("listitem", {
        name: "12 июля, воскресенье: активности не было",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "На дашборд" }));

    await expectPath(routePaths.dashboard);
    expect(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    ).toBeInTheDocument();
  });

  it.each([
    {
      expectedCount: "2 дня подряд",
      expectedMessage:
        "Повтори или выучи хотя бы одну шлоку, чтобы продолжить свою серию!",
      label: "ожидает значимой активности сегодня",
      streak: {
        ...zeroSeries,
        days: 2,
      },
    },
    {
      expectedCount: "21 день подряд",
      expectedMessage:
        "Ты в ударе! Возвращайся завтра, чтобы продолжить серию.",
      label: "продолжена сегодня",
      streak: {
        ...zeroSeries,
        continuedToday: true,
        days: 21,
        history: zeroSeries.history.map((day, index) =>
          index === zeroSeries.history.length - 1
            ? { ...day, hasActivity: true }
            : day,
        ),
      },
    },
  ])("shows the series state that $label on a direct visit", async ({
    expectedCount,
    expectedMessage,
    streak,
  }) => {
    const user = userEvent.setup();
    mockApi((request) => streakApi(request, streak));
    storeTestSession(session);
    renderAppAt(routePaths.streak);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Подряд" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(expectedCount)).toBeInTheDocument();
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "На дашборд" }));

    await expectPath(routePaths.dashboard);
  });

  it("returns to the dashboard through browser history after opening the page", async () => {
    const user = userEvent.setup();
    mockApi((request) => streakApi(request, zeroSeries));
    storeTestSession(session);
    renderAppAt(routePaths.dashboard);

    await user.click(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Подряд" }),
    ).toBeInTheDocument();

    await act(async () => {
      window.history.back();
    });

    await expectPath(routePaths.dashboard);
    expect(
      await screen.findByRole("link", {
        name: "Открыть страницу серии дней: 0 дней подряд",
      }),
    ).toBeInTheDocument();
  });
});

const zeroSeries = {
  continuedToday: false,
  days: 0,
  history: [
    { hasActivity: true, userDay: "2026-07-08" },
    { hasActivity: false, userDay: "2026-07-09" },
    { hasActivity: true, userDay: "2026-07-10" },
    { hasActivity: false, userDay: "2026-07-11" },
    { hasActivity: false, userDay: "2026-07-12" },
  ],
} satisfies ApiTypes.DashboardStreakDto;

function streakApi(
  request: MockApiRequest,
  streak: ApiTypes.DashboardStreakDto,
): MockApiResponse {
  if (request.method === "GET" && request.path === "/api/auth/session") {
    return { status: 200, body: session };
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
    return {
      status: 200,
      body: {
        hasLearningShlokas: false,
        items: [],
        remainingCount: 0,
      } satisfies ApiTypes.DashboardLearningShlokaListDto,
    };
  }
  if (
    request.method === "GET" &&
    request.path === "/api/dashboard/streak"
  ) {
    return { status: 200, body: streak };
  }

  throw new Error(
    `Unhandled test API request: ${request.method} ${request.path}`,
  );
}

function renderAppAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}
