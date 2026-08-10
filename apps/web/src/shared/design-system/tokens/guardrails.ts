export type GuardrailFile = {
  contents: string;
  path: string;
};

export type GuardrailPathRule = {
  path: string;
  reason: string;
};

export type DesignTokenGuardrailConfig = {
  colorLiteralExceptions: readonly GuardrailPathRule[];
  interactiveTypographyOwners: readonly string[];
  magicSizeRestrictedPaths: readonly GuardrailPathRule[];
  manualTypographyRestrictedPaths: readonly GuardrailPathRule[];
  typographyMarkupExceptions: readonly GuardrailPathRule[];
  typographyMarkupRestrictedPaths: readonly GuardrailPathRule[];
};

export type DesignTokenGuardrailViolation = {
  column: number;
  filePath: string;
  kind:
    | "color-literal"
    | "magic-size"
    | "manual-typography"
    | "raw-typography-element";
  line: number;
  message: string;
  value: string;
};

export const designTokenGuardrailConfig = {
  colorLiteralExceptions: [
    {
      path: "src/shared/design-system/tokens/",
      reason:
        "Token contract and token generators may hold raw Pencil/source color values before they are projected into CSS variables.",
    },
    {
      path: "src/app/styles.css",
      reason:
        "CSS theme entrypoint mirrors cssVariableTokens and is checked against the token contract.",
    },
    {
      path: "index.html",
      reason:
        "PWA theme-color meta is a static artifact checked against pwaThemeTokens.",
    },
    {
      path: "public/manifest.webmanifest",
      reason:
        "Manifest theme colors are static PWA artifacts checked against pwaThemeTokens.",
    },
    {
      path: "public/icons/app-icon.svg",
      reason:
        "App icon colors are static PWA artifacts checked against pwaThemeTokens.",
    },
    {
      path: "public/icons/maskable-icon.svg",
      reason:
        "Maskable icon colors are static PWA artifacts checked against pwaThemeTokens.",
    },
  ],
  interactiveTypographyOwners: [
    "a",
    "button",
    "input",
    "label",
    "option",
    "select",
    "textarea",
    "Button",
    "Input",
    "Label",
    "Link",
    "Select",
    "TabsTrigger",
    "Textarea",
    "ToggleGroupItem",
  ],
  magicSizeRestrictedPaths: [
    {
      path: "src/shared/design-system/components/",
      reason:
        "Project design-system components should use token/component sizing once the component layer owns the pattern.",
    },
  ],
  manualTypographyRestrictedPaths: [
    {
      path: "src/features/",
      reason:
        "Feature-owned standalone text must use Typography; only an interactive JSX owner may declare its own font size, line height, or weight.",
    },
  ],
  typographyMarkupExceptions: [
    {
      path: "src/shared/design-system/components/typography.tsx",
      reason:
        "Typography is the implementation boundary that creates semantic heading and paragraph elements.",
    },
    {
      path: "src/shared/ui/",
      reason:
        "Generic shadcn/Radix primitives may own semantic markup and control typography independently of the product Typography contract.",
    },
  ],
  typographyMarkupRestrictedPaths: [
    {
      path: "src/",
      reason:
        "Application and project-component standalone headings and paragraphs must use Typography or SanskritTypography.",
    },
  ],
} as const satisfies DesignTokenGuardrailConfig;

const colorLiteralPattern = /#[0-9A-Fa-f]{3,8}\b|oklch\s*\(/g;
const magicSizePattern = /-?(?:\d+\.\d+|\d+|\.\d+)(?:px|rem)\b/g;
const manualTypographyPattern =
  /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b|\btext-\[(?!color:)[^\]\s]+\]|\bleading-(?:none|tight|snug|normal|relaxed|loose)\b|\bleading-\[[^\]\s]+\]|\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b|\bfont-\[[^\]\s]+\]|\b(?:fontSize|lineHeight|fontWeight|font-size|line-height|font-weight)\s*:/g;
const rawTypographyElementPattern = /<(h[1-3]|p)(?=[\s>])/g;
const jsxOpeningElementPattern = /<([A-Za-z][\w.]*)\b(?:(?:=>)|[^<>])*>/gs;

export const normalizeGuardrailPath = (filePath: string) =>
  filePath.replaceAll("\\", "/").replace(/^\.\//, "");

const matchesPathRule = (filePath: string, rule: GuardrailPathRule) => {
  const normalizedPath = normalizeGuardrailPath(filePath);
  const normalizedRulePath = normalizeGuardrailPath(rule.path);

  return normalizedRulePath.endsWith("/")
    ? normalizedPath.startsWith(normalizedRulePath)
    : normalizedPath === normalizedRulePath;
};

const matchesAnyPathRule = (
  filePath: string,
  rules: readonly GuardrailPathRule[],
) => rules.some((rule) => matchesPathRule(filePath, rule));

const isAllowedColorLiteralPath = (
  filePath: string,
  config: DesignTokenGuardrailConfig,
) => matchesAnyPathRule(filePath, config.colorLiteralExceptions);

const isMagicSizeRestrictedPath = (
  filePath: string,
  config: DesignTokenGuardrailConfig,
) => matchesAnyPathRule(filePath, config.magicSizeRestrictedPaths);

const locationForIndex = (contents: string, index: number) => {
  const precedingLines = contents.slice(0, index).split("\n");
  const currentLinePrefix = precedingLines[precedingLines.length - 1] ?? "";

  return {
    column: currentLinePrefix.length + 1,
    line: precedingLines.length,
  };
};

const violationForMatch = (
  file: GuardrailFile,
  kind: DesignTokenGuardrailViolation["kind"],
  value: string,
  index: number,
): DesignTokenGuardrailViolation => {
  const location = locationForIndex(file.contents, index);
  const filePath = normalizeGuardrailPath(file.path);

  return {
    ...location,
    filePath,
    kind,
    message: {
      "color-literal": `Use design tokens or CSS variables instead of raw color ${value}; raw colors are limited to documented token, theme, and PWA artifact paths.`,
      "magic-size": `Use a design token or component token instead of direct size ${value}; direct size checks are scoped to project design-system components.`,
      "manual-typography": `Use Typography or SanskritTypography instead of manual font size, line height, or weight ${value}; interactive JSX owners keep their own typography.`,
      "raw-typography-element": `Use Typography or SanskritTypography instead of direct <${value}> markup outside documented implementation and generic UI exceptions.`,
    }[kind],
    value,
  };
};

const collectPatternViolations = (
  file: GuardrailFile,
  kind: DesignTokenGuardrailViolation["kind"],
  pattern: RegExp,
) => {
  const violations: DesignTokenGuardrailViolation[] = [];

  for (const match of file.contents.matchAll(pattern)) {
    const value = match[0];
    const index = match.index;

    if (value === undefined || index === undefined) {
      continue;
    }

    violations.push(violationForMatch(file, kind, value, index));
  }

  return violations;
};

const collectRawTypographyElementViolations = (file: GuardrailFile) => {
  const violations: DesignTokenGuardrailViolation[] = [];

  for (const match of file.contents.matchAll(rawTypographyElementPattern)) {
    const value = match[1];
    const index = match.index;

    if (value === undefined || index === undefined) {
      continue;
    }

    violations.push(
      violationForMatch(file, "raw-typography-element", value, index + 1),
    );
  }

  return violations;
};

const interactiveOpeningElementRanges = (
  contents: string,
  interactiveOwners: readonly string[],
) => {
  const owners = new Set(interactiveOwners);
  const ranges: Array<{ end: number; start: number }> = [];

  for (const match of contents.matchAll(jsxOpeningElementPattern)) {
    const elementName = match[1];
    const start = match.index;

    if (
      elementName === undefined ||
      start === undefined ||
      !owners.has(elementName)
    ) {
      continue;
    }

    ranges.push({ end: start + match[0].length, start });
  }

  return ranges;
};

const collectManualTypographyViolations = (
  file: GuardrailFile,
  interactiveOwners: readonly string[],
) => {
  const interactiveRanges = interactiveOpeningElementRanges(
    file.contents,
    interactiveOwners,
  );
  const violations: DesignTokenGuardrailViolation[] = [];

  for (const match of file.contents.matchAll(manualTypographyPattern)) {
    const index = match.index;

    if (
      index === undefined ||
      interactiveRanges.some(({ end, start }) => index >= start && index < end)
    ) {
      continue;
    }

    const value = match[0].replace(/\s*:\s*$/, "");
    violations.push(
      violationForMatch(file, "manual-typography", value, index),
    );
  }

  return violations;
};

export const findDesignTokenGuardrailViolations = (
  files: readonly GuardrailFile[],
  config: DesignTokenGuardrailConfig = designTokenGuardrailConfig,
) =>
  files.flatMap((file) => {
    const normalizedFile = {
      ...file,
      path: normalizeGuardrailPath(file.path),
    };
    const violations: DesignTokenGuardrailViolation[] = [];

    if (!isAllowedColorLiteralPath(normalizedFile.path, config)) {
      violations.push(
        ...collectPatternViolations(
          normalizedFile,
          "color-literal",
          colorLiteralPattern,
        ),
      );
    }

    if (isMagicSizeRestrictedPath(normalizedFile.path, config)) {
      violations.push(
        ...collectPatternViolations(
          normalizedFile,
          "magic-size",
          magicSizePattern,
        ),
      );
    }

    if (
      matchesAnyPathRule(
        normalizedFile.path,
        config.typographyMarkupRestrictedPaths,
      ) &&
      !matchesAnyPathRule(
        normalizedFile.path,
        config.typographyMarkupExceptions,
      )
    ) {
      violations.push(
        ...collectRawTypographyElementViolations(normalizedFile),
      );
    }

    if (
      matchesAnyPathRule(
        normalizedFile.path,
        config.manualTypographyRestrictedPaths,
      )
    ) {
      violations.push(
        ...collectManualTypographyViolations(
          normalizedFile,
          config.interactiveTypographyOwners,
        ),
      );
    }

    return violations;
  });
