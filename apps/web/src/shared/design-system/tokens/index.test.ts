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
      "modal",
      "learningAdvice",
      "learningAttempt",
      "learningHelper",
      "pageHeader",
      "settingsRow",
      "streakIndicator",
      "tipAccordion",
      "helpTooltip",
      "tabs",
    ]);
  });

  it("exposes only the approved shared typography contract", () => {
    const typography = designTokens.typography;

    expect(Object.keys(typography)).toEqual(["contract", "families"]);

    expect(typography.contract).toEqual({
      lineHeight: {
        body: expect.objectContaining({
          source: {
            name: "typography-body-line",
            type: "pencil-variable",
          },
          value: 1.4,
        }),
        heading: expect.objectContaining({
          source: {
            name: "typography-heading-line",
            type: "pencil-variable",
          },
          value: 1.25,
        }),
      },
      sizes: {
        h1: expect.objectContaining({
          source: { name: "typography-h1-size", type: "pencil-variable" },
          value: 20,
        }),
        h2: expect.objectContaining({
          source: { name: "typography-h2-size", type: "pencil-variable" },
          value: 18,
        }),
        h3: expect.objectContaining({
          source: { name: "typography-h3-size", type: "pencil-variable" },
          value: 16,
        }),
        p1: expect.objectContaining({
          source: { name: "typography-p1-size", type: "pencil-variable" },
          value: 12,
        }),
        p2: expect.objectContaining({
          source: { name: "typography-p2-size", type: "pencil-variable" },
          value: 14,
        }),
        p3: expect.objectContaining({
          source: { name: "typography-p3-size", type: "pencil-variable" },
          value: 16,
        }),
        p4: expect.objectContaining({
          source: { name: "typography-p4-size", type: "pencil-variable" },
          value: 20,
        }),
      },
      weights: {
        bold: expect.objectContaining({
          source: {
            name: "typography-weight-bold",
            type: "pencil-variable",
          },
          value: "700",
        }),
        medium: expect.objectContaining({
          source: {
            name: "typography-weight-medium",
            type: "pencil-variable",
          },
          value: "500",
        }),
        normal: expect.objectContaining({
          source: {
            name: "typography-weight-normal",
            type: "pencil-variable",
          },
          value: "400",
        }),
      },
    });

    expect(typography.families.ui).toMatchObject({
      source: { name: "font-ui", type: "pencil-variable" },
      value: "Inter",
    });
    expect(designTokens.components.tabs.labelSize).toMatchObject({
      cssVariable: "--component-tab-label-size",
      source: { name: "type-caption-size", type: "pencil-variable" },
      value: 12,
    });
    expect(designTokens.components.learningAttempt).toMatchObject({
      canonicalTextLineHeight: { value: 1.55 },
      canonicalTextSize: { value: 22 },
      recoveryBannerPaddingY: { value: 11 },
      recoveryBannerTextSize: { value: 13 },
      stateTitleSize: { value: 27 },
      titleLineHeight: { value: 1.18 },
      titleSize: { value: 28 },
    });
    expect(designTokens.components.learningAdvice).toMatchObject({
      textLineHeight: { value: 1.58 },
      textSize: { value: 18 },
      titleSize: { value: 22 },
    });
    expect(designTokens.components.learningHelper).toMatchObject({
      memoryPromptLineHeight: { value: 1.18 },
      memoryPromptSize: { value: 25 },
    });

    const legacyPencilSources = new Set([
      "font-body",
      "font-heading",
      "line-height-body",
      "line-height-reading",
      "line-height-sanskrit",
      "line-height-tight",
      "line-height-title",
      "type-body-size",
      "type-body-sm-size",
      "type-card-title-size",
      "type-display-size",
      "type-meta-size",
      "type-nav-size",
      "type-page-title-size",
      "type-sanskrit-size",
      "type-screen-title-size",
      "type-section-title-size",
      "type-transliteration-size",
      "type-weight-bold",
      "type-weight-extrabold",
      "type-weight-medium",
      "type-weight-regular",
      "type-weight-semibold",
      "typo-h1-line",
    ]);

    expect(
      collectDesignTokens()
        .filter(({ token }) => token.source.type === "pencil-variable")
        .map(({ token }) => token.source.name)
        .filter((sourceName) =>
          sourceName.startsWith("typo-") || legacyPencilSources.has(sourceName),
        ),
    ).toEqual([]);
  });

  it("synchronizes the softer primary foreground without changing adjacent colors", () => {
    expect(designTokens.reference.palette.neutral).toMatchObject({
      overlay: { value: "#0F172A66" },
      placeholder: { value: "#B8C3D1" },
      textInverse: { value: "#FFFFFF" },
      textPrimary: { value: "#334155" },
      textSecondary: { value: "#64748B" },
      textTertiary: { value: "#94A3B8" },
    });
    expect(designTokens.semantic.color).toMatchObject({
      cardForeground: { value: "#334155" },
      disabledForeground: { value: "#94A3B8" },
      foreground: { value: "#334155" },
      mutedForeground: { value: "#64748B" },
      overlay: { value: "#0F172A66" },
      placeholder: { value: "#B8C3D1" },
      popoverForeground: { value: "#334155" },
    });
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
    expect(css).not.toMatch(
      /--(?:font-heading|font-family-heading-token|font-size-(?:body|body-sm|caption|card-title|meta|nav|page-title|sanskrit|screen-title|section-title)|line-height-(?:body|reading|sanskrit|title))\s*:/,
    );
    expect(css).not.toMatch(/\.font-sanskrit-(?:title|text)\b/);

    for (const { path: tokenPath, token } of cssVariableTokens) {
      expect(declarations.get(token.cssVariable!), tokenPath).toBe(
        expectedCssValue(token),
      );
    }
  });

  it("ships the approved Sanskrit font faces and license locally", () => {
    const css = readWebFile("src", "app", "styles.css");
    const mediumFontCssPath = path.join(
      webRoot,
      "node_modules",
      "@fontsource",
      "noto-serif",
      "500.css",
    );
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
    expect(css).toContain('@import "@fontsource/noto-serif/500.css";');
    expect(css).toMatch(
      /@font-face\s*{[^}]*font-family:\s*"Noto Serif";[^}]*noto-serif-regular\.woff2[^}]*font-style:\s*normal;[^}]*font-weight:\s*400;[^}]*}/s,
    );
    expect(css).toMatch(
      /@font-face\s*{[^}]*font-family:\s*"Noto Serif";[^}]*noto-serif-bold\.woff2[^}]*font-style:\s*normal;[^}]*font-weight:\s*700;[^}]*}/s,
    );
    expect(css).not.toMatch(/@font-face\s*{[^}]*(?:https?:)?\/\//s);
    expect(existsSync(mediumFontCssPath)).toBe(true);
    expect(existsSync(regularFontPath)).toBe(true);
    expect(existsSync(boldFontPath)).toBe(true);
    expect(existsSync(licensePath)).toBe(true);

    if (
      !existsSync(mediumFontCssPath) ||
      !existsSync(regularFontPath) ||
      !existsSync(boldFontPath) ||
      !existsSync(licensePath)
    ) {
      return;
    }

    expect(readFileSync(mediumFontCssPath, "utf8")).toMatch(
      /@font-face\s*{[^}]*font-family:\s*'Noto Serif';[^}]*font-style:\s*normal;[^}]*font-weight:\s*500;[^}]*}/s,
    );

    expect(
      createHash("sha256")
        .update(readFileSync(regularFontPath))
        .digest("hex"),
    ).toBe("5add58655482dd9921475d7d97f5df9a6b8405d973ede5fb6bf606e65b1ebba5");
    expect(
      createHash("sha256").update(readFileSync(boldFontPath)).digest("hex"),
    ).toBe("2a602d046318447063d559cd43a9bb06d9ea8a6996d81377ef9259f6e6759096");
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
