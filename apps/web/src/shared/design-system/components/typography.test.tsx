import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SanskritTypography,
  Typography,
  type TypographyAs,
  type TypographyProps,
  type TypographyTone,
  type TypographyVariant,
  type TypographyWeight,
} from "./index";

const variantCases = [
  ["h1", "H1", "h1", "heading", "bold"],
  ["h2", "H2", "h2", "heading", "bold"],
  ["h3", "H3", "h3", "heading", "bold"],
  ["p1", "P", "p1", "body", "normal"],
  ["p2", "P", "p2", "body", "normal"],
  ["p3", "P", "p3", "body", "normal"],
  ["p4", "P", "p4", "body", "normal"],
] as const satisfies ReadonlyArray<
  readonly [
    TypographyVariant,
    "H1" | "H2" | "H3" | "P",
    string,
    "heading" | "body",
    TypographyWeight,
  ]
>;

const tagCases = ["h1", "h2", "h3", "p", "span", "div"] as const satisfies readonly TypographyAs[];

const weightCases = ["normal", "medium", "bold"] as const satisfies readonly TypographyWeight[];

const toneCases = [
  ["default", "var(--foreground)"],
  ["muted", "var(--muted-foreground)"],
  ["brand", "var(--primary)"],
  ["success", "var(--success)"],
  ["warning", "var(--warning)"],
  ["danger", "var(--destructive)"],
  ["inverse", "var(--inverse-foreground)"],
  ["inherit", "inherit"],
] as const satisfies ReadonlyArray<readonly [TypographyTone, string]>;

const componentCases = [
  ["Typography", Typography, undefined],
  [
    "SanskritTypography",
    SanskritTypography,
    "var(--font-family-sanskrit-token)",
  ],
] as const satisfies ReadonlyArray<
  readonly [string, ComponentType<TypographyProps>, string | undefined]
>;

describe.each(componentCases)(
  "%s",
  (_name, TextComponent, sanskritFontFamily) => {
    it("defaults to the p2 paragraph contract", () => {
      render(<TextComponent>Основной текст</TextComponent>);

      const text = screen.getByText("Основной текст");

      expect(text.tagName).toBe("P");
      expect(text).toHaveStyle({
        color: "var(--foreground)",
        fontFamily:
          "var(--typography-font-family, var(--font-family-sans-token))",
        fontSize: "var(--typography-p2-size)",
        fontWeight: "var(--typography-weight-normal)",
        lineHeight: "var(--typography-body-line-height)",
      });

      if (sanskritFontFamily) {
        expect(text.style.getPropertyValue("--typography-font-family")).toBe(
          sanskritFontFamily,
        );
      }
    });

    it.each(variantCases)(
      "renders the %s variant with its semantic default",
      (variant, tagName, size, lineHeight, weight) => {
        render(<TextComponent variant={variant}>{variant}</TextComponent>);

        const text = screen.getByText(variant);

        expect(text.tagName).toBe(tagName);
        expect(text).toHaveStyle({
          fontSize: `var(--typography-${size}-size)`,
          fontWeight: `var(--typography-weight-${weight})`,
          lineHeight: `var(--typography-${lineHeight}-line-height)`,
        });
      },
    );

    it.each(tagCases)(
      "allows the approved %s tag without changing the visual variant",
      (as) => {
        render(
          <TextComponent as={as} variant="h1">
            Визуальный заголовок
          </TextComponent>,
        );

        const text = screen.getByText("Визуальный заголовок");

        expect(text.tagName).toBe(as.toUpperCase());
        expect(text).toHaveStyle({
          fontSize: "var(--typography-h1-size)",
          lineHeight: "var(--typography-heading-line-height)",
        });
      },
    );

    it.each(weightCases)("supports the %s weight", (weight) => {
      render(<TextComponent weight={weight}>{weight}</TextComponent>);

      expect(screen.getByText(weight)).toHaveStyle({
        fontWeight: `var(--typography-weight-${weight})`,
      });
    });

    it.each(toneCases)("supports the %s tone", (tone, color) => {
      render(<TextComponent tone={tone}>{tone}</TextComponent>);

      const text = screen.getByText(tone);

      if (tone === "inherit") {
        expect(text.style.color).toBe("inherit");
        return;
      }

      expect(text).toHaveStyle({ color });
    });

    it("forwards safe DOM props and consumer layout styles", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <TextComponent
          aria-label="Открыть описание"
          className="mt-4"
          data-purpose="description"
          id="description"
          onClick={onClick}
          style={{ marginTop: "1rem" }}
        >
          Описание
        </TextComponent>,
      );

      const text = screen.getByLabelText("Открыть описание");

      expect(text).toHaveAttribute("class", "mt-4");
      expect(text).toHaveAttribute("data-purpose", "description");
      expect(text).toHaveAttribute("id", "description");
      expect(text.style.marginTop).toBe("1rem");

      await user.click(text);
      expect(onClick).toHaveBeenCalledOnce();
    });
  },
);

describe("Typography type contract", () => {
  it("keeps the polymorphic element set limited", () => {
    const unsupportedTag = () => (
      // @ts-expect-error Anchors are deliberately outside the typography contract.
      <Typography as="a">Ссылка</Typography>
    );

    expect(unsupportedTag).toBeTypeOf("function");
  });
});
