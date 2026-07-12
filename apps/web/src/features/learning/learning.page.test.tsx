import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { strings } from "@/shared/i18n";

import { LearningPage } from "./learning.page";

describe("learning page", () => {
  it("shows localized static advice without course features", () => {
    render(<LearningPage />);

    expect(
      screen.getByRole("heading", { name: strings.learning.title }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: strings.learning.tips[0].title,
      }),
    ).toHaveLength(strings.learning.tips.length);

    for (const unavailableFeature of ["Курсы", "Квизы", "Прогресс", "CMS"]) {
      expect(screen.queryByText(unavailableFeature)).not.toBeInTheDocument();
    }
  });

  it("expands and collapses advice while preserving the Pencil default state", async () => {
    const user = userEvent.setup();
    render(<LearningPage />);

    const tipButtons = screen.getAllByRole("button", {
      name: strings.learning.tips[0].title,
    });
    const firstTipButton = tipButtons[0];
    const lastTipButton = tipButtons.at(-1);

    expect(firstTipButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(strings.learning.tips[0].text),
    ).not.toBeInTheDocument();
    expect(lastTipButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(strings.learning.tips.at(-1)!.text),
    ).toBeInTheDocument();

    await user.click(firstTipButton!);

    expect(firstTipButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(strings.learning.tips[0].text),
    ).toBeInTheDocument();

    await user.click(firstTipButton!);

    expect(firstTipButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(strings.learning.tips[0].text),
    ).not.toBeInTheDocument();
  });
});
