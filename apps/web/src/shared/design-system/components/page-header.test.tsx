import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PageHeader } from "./index";

describe("PageHeader", () => {
  it("exposes a title-only page heading", () => {
    render(<PageHeader title="Библиотека" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Библиотека" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("exposes the title and semantic back action", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <PageHeader
        backAction={{ label: "Назад в библиотеку", onClick: onBack }}
        title="Бхагавад-гита"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Бхагавад-гита" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Назад в библиотеку" }),
    );

    expect(onBack).toHaveBeenCalledOnce();
  });
});
