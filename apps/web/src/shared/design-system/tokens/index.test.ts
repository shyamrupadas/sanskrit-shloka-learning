import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectDesignTokens,
  cssVariableTokens,
  designTokens,
  pwaThemeTokens,
  type DesignToken,
} from "./index";

const webRoot = process.cwd();

const readWebFile = (...segments: string[]) =>
  readFileSync(path.join(webRoot, ...segments), "utf8");

const normalizeCssValue = (value: string) => value.trim().replace(/\s+/g, " ");

const extractCssVariables = (css: string) => {
  const declarations = new Map<string, string>();
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;

  for (const match of css.matchAll(declarationPattern)) {
    const [, variableName, variableValue] = match;

    if (variableName && variableValue) {
      declarations.set(variableName, normalizeCssValue(variableValue));
    }
  }

  return declarations;
};

const expectedCssValue = (token: DesignToken) =>
  normalizeCssValue(token.cssValue ?? String(token.value));

const resolveAlias = (alias: string) => {
  const relativePath = alias.replace(/^@\//, "src/");
  const absolutePath = path.join(webRoot, relativePath);

  return [absolutePath, `${absolutePath}.ts`, `${absolutePath}.tsx`].some(
    existsSync,
  );
};

describe("design token contract", () => {
  it("keeps the normalized token model explicit", () => {
    expect(Object.keys(designTokens)).toEqual([
      "reference",
      "semantic",
      "typography",
      "spacing",
      "radius",
      "elevation",
      "components",
    ]);

    expect(Object.keys(designTokens.reference.palette)).toEqual([
      "brand",
      "danger",
      "neutral",
      "status",
      "streak",
    ]);

    expect(Object.keys(designTokens.components)).toEqual([
      "adminForm",
      "bottomNavigation",
      "button",
      "card",
      "emptyState",
      "input",
      "pageHeader",
      "settingsRow",
      "tipAccordion",
      "tabs",
    ]);
  });

  it("links every code token to Pencil or a declared source value", () => {
    const tokens = collectDesignTokens();

    expect(tokens.length).toBeGreaterThan(0);

    for (const { path: tokenPath, token } of tokens) {
      expect(token.value, tokenPath).not.toBe("");

      if (token.source.type === "pencil-variable") {
        expect(token.source.name, tokenPath).toMatch(/^[\w-]+$/);
        continue;
      }

      expect(token.source.type, tokenPath).toBe("source-value");
      expect(token.source.name, tokenPath).toMatch(/^[\w-]+$/);
      expect(token.source.description, tokenPath).not.toBe("");
    }
  });

  it("keeps CSS variables and the frontend theme synchronized", () => {
    const css = readWebFile("src", "app", "styles.css");
    const declarations = extractCssVariables(css);

    expect(css).toContain('@import "@fontsource-variable/inter"');
    expect(css).not.toContain("@fontsource-variable/geist");
    expect(css).not.toContain("oklch(");

    for (const { path: tokenPath, token } of cssVariableTokens) {
      expect(declarations.get(token.cssVariable!), tokenPath).toBe(
        expectedCssValue(token),
      );
    }
  });

  it("keeps PWA theme artifacts synchronized", () => {
    const manifest = JSON.parse(
      readWebFile("public", "manifest.webmanifest"),
    ) as { background_color: string; theme_color: string };
    const html = readWebFile("index.html");

    expect(manifest.theme_color).toBe(pwaThemeTokens.themeColor.value);
    expect(manifest.background_color).toBe(
      pwaThemeTokens.backgroundColor.value,
    );
    expect(html).toContain(
      `<meta name="theme-color" content="${pwaThemeTokens.themeColor.value}" />`,
    );

    const appIconColors = new Set(
      readWebFile("public", "icons", "app-icon.svg").match(
        /#[0-9A-Fa-f]{6,8}/g,
      ),
    );
    expect(appIconColors).toEqual(
      new Set([
        pwaThemeTokens.backgroundColor.value,
        pwaThemeTokens.iconBrand.value,
        pwaThemeTokens.iconBrandHover.value,
        pwaThemeTokens.iconSurface.value,
        pwaThemeTokens.iconSurfaceMuted.value,
      ]),
    );

    const maskableIconColors = new Set(
      readWebFile("public", "icons", "maskable-icon.svg").match(
        /#[0-9A-Fa-f]{6,8}/g,
      ),
    );
    expect(maskableIconColors).toEqual(
      new Set([
        pwaThemeTokens.backgroundColor.value,
        pwaThemeTokens.iconBrand.value,
      ]),
    );
  });

  it("points shadcn at the actual CSS entrypoint and aliases", () => {
    const config = JSON.parse(readWebFile("components.json")) as {
      aliases: Record<string, string>;
      tailwind: { css: string };
    };

    expect(config.tailwind.css).toBe("src/app/styles.css");
    expect(existsSync(path.join(webRoot, config.tailwind.css))).toBe(true);
    expect(config.aliases).toEqual({
      components: "@/shared/ui",
      lib: "@/shared/lib",
      ui: "@/shared/ui",
      utils: "@/shared/lib/utils",
    });

    for (const alias of Object.values(config.aliases)) {
      expect(resolveAlias(alias), alias).toBe(true);
    }
  });
});
