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
  magicSizeRestrictedPaths: readonly GuardrailPathRule[];
};

export type DesignTokenGuardrailViolation = {
  column: number;
  filePath: string;
  kind: "color-literal" | "magic-size";
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
  magicSizeRestrictedPaths: [
    {
      path: "src/shared/design-system/components/",
      reason:
        "Project design-system components should use token/component sizing once the component layer owns the pattern.",
    },
  ],
} as const satisfies DesignTokenGuardrailConfig;

const colorLiteralPattern = /#[0-9A-Fa-f]{3,8}\b|oklch\s*\(/g;
const magicSizePattern = /-?(?:\d+\.\d+|\d+|\.\d+)(?:px|rem)\b/g;

export const normalizeGuardrailPath = (filePath: string) =>
  filePath.replaceAll("\\", "/").replace(/^\.\//, "");

const matchesPathRule = (filePath: string, rule: GuardrailPathRule) => {
  const normalizedPath = normalizeGuardrailPath(filePath);
  const normalizedRulePath = normalizeGuardrailPath(rule.path);

  return normalizedRulePath.endsWith("/")
    ? normalizedPath.startsWith(normalizedRulePath)
    : normalizedPath === normalizedRulePath;
};

const isAllowedColorLiteralPath = (
  filePath: string,
  config: DesignTokenGuardrailConfig,
) =>
  config.colorLiteralExceptions.some((rule) => matchesPathRule(filePath, rule));

const isMagicSizeRestrictedPath = (
  filePath: string,
  config: DesignTokenGuardrailConfig,
) =>
  config.magicSizeRestrictedPaths.some((rule) =>
    matchesPathRule(filePath, rule),
  );

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
    message:
      kind === "color-literal"
        ? `Use design tokens or CSS variables instead of raw color ${value}; raw colors are limited to documented token, theme, and PWA artifact paths.`
        : `Use a design token or component token instead of direct size ${value}; direct size checks are scoped to project design-system components.`,
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

    return violations;
  });
