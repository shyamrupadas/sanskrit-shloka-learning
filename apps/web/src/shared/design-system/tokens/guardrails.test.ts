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

  it("documents the only path-level typography markup exceptions", () => {
    expect(designTokenGuardrailConfig.typographyMarkupExceptions).toEqual([
      expect.objectContaining({
        path: "src/shared/design-system/components/typography.tsx",
        reason: expect.any(String),
      }),
      expect.objectContaining({
        path: "src/shared/ui/",
        reason: expect.any(String),
      }),
    ]);
    expect(designTokenGuardrailConfig.manualTypographyRestrictedPaths).toEqual([
      expect.objectContaining({
        path: "src/features/",
        reason: expect.any(String),
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

  it("flags standalone typography markup outside the typography implementation", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/features/dashboard/ui/dashboard-page.tsx",
        "<main><h1>Dashboard</h1><p>Summary</p></main>",
      ),
      fixture(
        "src/shared/design-system/components/status-card.tsx",
        "<article><h2>Status</h2></article>",
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
        kind: "raw-typography-element",
        value: "h1",
      },
      {
        filePath: "src/features/dashboard/ui/dashboard-page.tsx",
        kind: "raw-typography-element",
        value: "p",
      },
      {
        filePath: "src/shared/design-system/components/status-card.tsx",
        kind: "raw-typography-element",
        value: "h2",
      },
    ]);
  });

  it("flags manual common typography in feature code", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/features/library/ui/library-view.tsx",
        '<section className="text-xl leading-[1.35] font-semibold" style={{ fontSize: "18px", lineHeight: 1.25, fontWeight: 700 }} />',
      ),
      fixture(
        "src/features/library/ui/library-view.css",
        ".title { font-size: 18px; line-height: 1.25; font-weight: 700; }",
      ),
      fixture(
        "src/features/library/ui/library-card.tsx",
        '<Card.Button className="font-bold">Open</Card.Button>',
      ),
    ]);

    expect(
      violations.map(({ kind, value }) => ({ kind, value })),
    ).toEqual([
      { kind: "manual-typography", value: "text-xl" },
      { kind: "manual-typography", value: "leading-[1.35]" },
      { kind: "manual-typography", value: "font-semibold" },
      { kind: "manual-typography", value: "fontSize" },
      { kind: "manual-typography", value: "lineHeight" },
      { kind: "manual-typography", value: "fontWeight" },
      { kind: "manual-typography", value: "font-size" },
      { kind: "manual-typography", value: "line-height" },
      { kind: "manual-typography", value: "font-weight" },
      { kind: "manual-typography", value: "font-bold" },
    ]);
  });

  it("allows the typography API, layout classes, and control-owned typography", () => {
    const violations = findDesignTokenGuardrailViolations([
      fixture(
        "src/features/library/ui/library-view.tsx",
        [
          '<Typography className="truncate text-center" variant="h1">Library</Typography>',
          '<SanskritTypography className="max-w-full" variant="p3">Text</SanskritTypography>',
          '<Button onClick={() => undefined} className="text-[15px] font-semibold">Save</Button>',
          '<Link className="text-sm font-bold">Back</Link>',
          '<Label className="font-medium">Name</Label>',
          '<input className="text-[length:var(--input-text-size)]" />',
          '<TabsTrigger className="text-xs font-medium">All</TabsTrigger>',
        ].join("\n"),
      ),
      fixture(
        "src/shared/design-system/components/typography.tsx",
        "const tags = { h1: <h1 />, h2: <h2 />, h3: <h3 />, p: <p /> };",
      ),
      fixture(
        "src/shared/ui/card.tsx",
        '<section><h3 className="text-base font-medium">Title</h3><p>Description</p></section>',
      ),
    ]);

    expect(violations).toEqual([]);
  });
});
