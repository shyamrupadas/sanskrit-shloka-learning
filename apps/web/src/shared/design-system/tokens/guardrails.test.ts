import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  designTokenGuardrailConfig,
  findDesignTokenGuardrailViolations,
  type GuardrailFile,
} from "./guardrails";

const webRoot = process.cwd();

const scannedFrontendEntries = ["src", "public", "index.html"] as const;
const scannableExtensions = new Set([
  ".css",
  ".html",
  ".svg",
  ".ts",
  ".tsx",
  ".webmanifest",
]);

const fixture = (filePath: string, contents: string): GuardrailFile => ({
  contents,
  path: filePath,
});

const toWebRelativePath = (absolutePath: string) =>
  path.relative(webRoot, absolutePath).split(path.sep).join("/");

const isScannableFrontendFile = (relativePath: string) => {
  if (/\.test\.tsx?$/.test(relativePath)) {
    return false;
  }

  return scannableExtensions.has(path.extname(relativePath));
};

const readGuardrailFiles = (relativeEntry: string): GuardrailFile[] => {
  const absoluteEntry = path.join(webRoot, relativeEntry);

  if (!existsSync(absoluteEntry)) {
    return [];
  }

  const entryStats = statSync(absoluteEntry);

  if (entryStats.isDirectory()) {
    return readdirSync(absoluteEntry)
      .sort()
      .flatMap((entryName) =>
        readGuardrailFiles(path.join(relativeEntry, entryName)),
      );
  }

  if (!entryStats.isFile()) {
    return [];
  }

  const relativePath = toWebRelativePath(absoluteEntry);

  if (!isScannableFrontendFile(relativePath)) {
    return [];
  }

  return [
    {
      contents: readFileSync(absoluteEntry, "utf8"),
      path: relativePath,
    },
  ];
};

const readFrontendGuardrailFiles = () =>
  scannedFrontendEntries.flatMap((entry) => readGuardrailFiles(entry));

describe("design token guardrails", () => {
  it("keeps frontend files free of raw token drift outside documented exceptions", () => {
    const violations = findDesignTokenGuardrailViolations(
      readFrontendGuardrailFiles(),
    );

    expect(violations).toEqual([]);
  });

  it("documents raw color exceptions for token, theme, and PWA artifact layers", () => {
    expect(designTokenGuardrailConfig.colorLiteralExceptions).toEqual([
      expect.objectContaining({
        path: "src/shared/design-system/tokens/",
      }),
      expect.objectContaining({
        path: "src/app/styles.css",
      }),
      expect.objectContaining({
        path: "index.html",
      }),
      expect.objectContaining({
        path: "public/manifest.webmanifest",
      }),
      expect.objectContaining({
        path: "public/icons/app-icon.svg",
      }),
      expect.objectContaining({
        path: "public/icons/maskable-icon.svg",
      }),
    ]);
  });

  it("flags arbitrary hex and OKLCH colors outside exception paths", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/features/dashboard/ui/dashboard-page.tsx",
        '<section className="bg-[#112233]" />',
      ),
      fixture(
        "src/features/library/ui/library-view.tsx",
        'const drift = { color: "oklch(62% 0.12 250)" };',
      ),
    ]);

    expect(
      violations.map(({ filePath, kind, value }) => ({
        filePath,
        kind,
        value,
      })),
    ).toEqual([
      {
        filePath: "src/features/dashboard/ui/dashboard-page.tsx",
        kind: "color-literal",
        value: "#112233",
      },
      {
        filePath: "src/features/library/ui/library-view.tsx",
        kind: "color-literal",
        value: "oklch(",
      },
    ]);
  });

  it("allows token-driven styling and normal Tailwind scale utilities", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/features/library/ui/library-view.tsx",
        '<section className="mx-auto max-w-3xl rounded-lg border border-border bg-primary px-4 py-2 text-primary-foreground" />',
      ),
      fixture(
        "src/features/auth/ui/auth-screen.tsx",
        '<main className="bg-[color-mix(in_oklch,var(--secondary),var(--background)_55%)]" />',
      ),
      fixture(
        "src/shared/design-system/tokens/index.ts",
        'const demo = fromPencil("#112233", "color-demo");',
      ),
      fixture("src/app/styles.css", ":root { --demo: #112233; }"),
      fixture("public/manifest.webmanifest", '{ "theme_color": "#112233" }'),
      fixture("public/icons/app-icon.svg", '<svg><rect fill="#112233" /></svg>'),
    ]);

    expect(violations).toEqual([]);
  });

  it("limits direct magic sizes to project design-system components", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/shared/design-system/components/shloka-card.tsx",
        '<article className="p-[18px] text-[0.9rem]" style={{ width: "340px" }} />',
      ),
      fixture(
        "src/shared/ui/button.tsx",
        '<button className="rounded-[min(var(--radius-md),10px)] text-[0.8rem]" />',
      ),
      fixture(
        "src/features/dashboard/ui/dashboard-page.tsx",
        '<main className="mx-auto max-w-3xl px-4" />',
      ),
    ]);

    expect(
      violations.map(({ filePath, kind, value }) => ({
        filePath,
        kind,
        value,
      })),
    ).toEqual([
      {
        filePath: "src/shared/design-system/components/shloka-card.tsx",
        kind: "magic-size",
        value: "18px",
      },
      {
        filePath: "src/shared/design-system/components/shloka-card.tsx",
        kind: "magic-size",
        value: "0.9rem",
      },
      {
        filePath: "src/shared/design-system/components/shloka-card.tsx",
        kind: "magic-size",
        value: "340px",
      },
    ]);
  });
});
