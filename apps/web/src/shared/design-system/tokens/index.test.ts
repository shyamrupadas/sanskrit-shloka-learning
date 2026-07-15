import { createHash } from "node:crypto";
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

  it("ships the approved Sanskrit font faces and license locally", () => {
    const css = readWebFile("src", "app", "styles.css");
    const regularFontPath = path.join(
      webRoot,
      "src",
      "assets",
      "fonts",
      "noto-serif-regular.woff2",
    );
    const boldFontPath = path.join(
      webRoot,
      "src",
      "assets",
      "fonts",
      "noto-serif-bold.woff2",
    );
    const italicFontPath = path.join(
      webRoot,
      "src",
      "assets",
      "fonts",
      "noto-serif-italic.woff2",
    );
    const licensePath = path.join(
      webRoot,
      "src",
      "assets",
      "fonts",
      "OFL-1.1.txt",
    );

    expect(designTokens.typography.families.sanskrit).toMatchObject({
      source: { name: "font-sanskrit", type: "pencil-variable" },
      value: "Noto Serif",
    });
    expect(designTokens.typography.families.transliteration.value).toBe(
      "Inter",
    );
    expect(css).toMatch(
      /@font-face\s*{[^}]*font-family:\s*"Noto Serif";[^}]*noto-serif-regular\.woff2[^}]*font-style:\s*normal;[^}]*font-weight:\s*400;[^}]*}/s,
    );
    expect(css).toMatch(
      /@font-face\s*{[^}]*font-family:\s*"Noto Serif";[^}]*noto-serif-bold\.woff2[^}]*font-style:\s*normal;[^}]*font-weight:\s*700;[^}]*}/s,
    );
    expect(css).toMatch(
      /@font-face\s*{[^}]*font-family:\s*"Noto Serif";[^}]*noto-serif-italic\.woff2[^}]*font-style:\s*italic;[^}]*font-weight:\s*400;[^}]*}/s,
    );
    expect(css).toMatch(
      /\.font-sanskrit-title\s*{[^}]*font-family:\s*var\(--font-family-sanskrit-token\);[^}]*font-style:\s*normal;[^}]*}/s,
    );
    expect(css).toMatch(
      /\.font-sanskrit-text\s*{[^}]*font-family:\s*var\(--font-family-sanskrit-token\);[^}]*font-style:\s*italic;[^}]*}/s,
    );
    expect(css).not.toMatch(/@font-face\s*{[^}]*(?:https?:)?\/\//s);
    expect(existsSync(regularFontPath)).toBe(true);
    expect(existsSync(boldFontPath)).toBe(true);
    expect(existsSync(italicFontPath)).toBe(true);
    expect(existsSync(licensePath)).toBe(true);

    if (
      !existsSync(regularFontPath) ||
      !existsSync(boldFontPath) ||
      !existsSync(italicFontPath) ||
      !existsSync(licensePath)
    ) {
      return;
    }

    expect(
      createHash("sha256")
        .update(readFileSync(regularFontPath))
        .digest("hex"),
    ).toBe("5add58655482dd9921475d7d97f5df9a6b8405d973ede5fb6bf606e65b1ebba5");
    expect(
      createHash("sha256").update(readFileSync(boldFontPath)).digest("hex"),
    ).toBe("2a602d046318447063d559cd43a9bb06d9ea8a6996d81377ef9259f6e6759096");
    expect(
      createHash("sha256")
        .update(readFileSync(italicFontPath))
        .digest("hex"),
    ).toBe("692c32b1eaded1d00d8c240d0737aa59da11e6dea853ac1a277df5bc46181157");
    expect(readFileSync(licensePath, "utf8")).toContain(
      "SIL OPEN FONT LICENSE Version 1.1",
    );
    expect(readFileSync(licensePath, "utf8")).toContain(
      "Copyright 2018 The Noto Project Authors",
    );
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
