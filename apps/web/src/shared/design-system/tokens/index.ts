export type TokenPrimitive = number | string;

export type TokenSource =
  | {
      name: string;
      type: "pencil-variable";
    }
  | {
      description: string;
      name: string;
      type: "source-value";
    };

export type DesignToken<T extends TokenPrimitive = TokenPrimitive> = {
  cssValue?: string;
  cssVariable?: `--${string}`;
  source: TokenSource;
  value: T;
};

export type FlattenedDesignToken = {
  path: string;
  token: DesignToken;
};

type TokenOptions = Pick<DesignToken, "cssValue" | "cssVariable">;

const fromPencil = <T extends TokenPrimitive>(
  value: T,
  name: string,
  options: TokenOptions = {},
): DesignToken<T> => ({
  ...options,
  source: { name, type: "pencil-variable" },
  value,
});

const fromSource = <T extends TokenPrimitive>(
  value: T,
  name: string,
  description: string,
  options: TokenOptions = {},
): DesignToken<T> => ({
  ...options,
  source: { description, name, type: "source-value" },
  value,
});

const px = (value: number) => `${value}px`;

export const designTokens = {
  reference: {
    palette: {
      brand: {
        base: fromPencil("#2563EB", "color-brand"),
        focus: fromPencil("#93C5FD", "color-focus-ring"),
        hover: fromPencil("#1D4ED8", "color-brand-hover"),
        soft: fromPencil("#DBEAFE", "color-brand-soft"),
      },
      danger: {
        base: fromPencil("#DC2626", "color-danger"),
        hover: fromPencil("#B91C1C", "color-danger-hover"),
        soft: fromPencil("#FEE2E2", "color-danger-soft"),
      },
      neutral: {
        app: fromPencil("#F8FAFC", "color-bg-app"),
        border: fromPencil("#D6DEE9", "color-border"),
        borderStrong: fromPencil("#CBD5E1", "color-border-strong"),
        iconMuted: fromPencil("#94A3B8", "color-icon-muted"),
        inset: fromPencil("#EEF2F7", "color-surface-inset"),
        muted: fromPencil("#F1F5F9", "color-surface-muted"),
        overlay: fromPencil("#0F172A66", "color-overlay"),
        placeholder: fromPencil("#B8C3D1", "color-text-placeholder"),
        surface: fromPencil("#FFFFFF", "color-surface"),
        surfaceTranslucent: fromPencil(
          "#FFFFFFE6",
          "color-surface-translucent",
        ),
        textInverse: fromPencil("#FFFFFF", "color-text-inverse"),
        textPrimary: fromPencil("#0F172A", "color-text-primary"),
        textSecondary: fromPencil("#64748B", "color-text-secondary"),
        textTertiary: fromPencil("#94A3B8", "color-text-tertiary"),
        transparent: fromPencil("#FFFFFF00", "color-transparent"),
      },
      status: {
        infoBg: fromPencil("#DBEAFE", "color-info-bg"),
        infoBorder: fromPencil("#93C5FD", "color-info-border"),
        infoFg: fromPencil("#2563EB", "color-info-fg"),
        successBg: fromPencil("#DCFCE7", "color-success-bg"),
        successBorder: fromPencil("#86EFAC", "color-success-border"),
        successFg: fromPencil("#15803D", "color-success-fg"),
        warningBg: fromPencil("#FEF3C7", "color-warning-bg"),
        warningBorder: fromPencil("#FCD34D", "color-warning-border"),
        warningFg: fromPencil("#B45309", "color-warning-fg"),
      },
      streak: {
        end: fromPencil("#FACC15", "color-streak-flame-end", {
          cssVariable: "--streak-flame-end",
        }),
        inner: fromPencil("#FFF7AD", "color-streak-flame-inner", {
          cssVariable: "--streak-flame-inner",
        }),
        start: fromPencil("#F97316", "color-streak-flame-start", {
          cssVariable: "--streak-flame-start",
        }),
      },
    },
  },
  semantic: {
    color: {
      accent: fromPencil("#DBEAFE", "color-brand-soft", {
        cssVariable: "--accent",
      }),
      accentForeground: fromPencil("#2563EB", "color-brand", {
        cssVariable: "--accent-foreground",
      }),
      background: fromPencil("#F8FAFC", "color-bg-app", {
        cssVariable: "--background",
      }),
      border: fromPencil("#D6DEE9", "color-border", {
        cssVariable: "--border",
      }),
      borderStrong: fromPencil("#CBD5E1", "color-border-strong", {
        cssVariable: "--border-strong",
      }),
      card: fromPencil("#FFFFFF", "color-bg-elevated", {
        cssVariable: "--card",
      }),
      cardForeground: fromPencil("#0F172A", "color-text-primary", {
        cssVariable: "--card-foreground",
      }),
      chartDanger: fromPencil("#DC2626", "color-danger", {
        cssVariable: "--chart-4",
      }),
      chartMuted: fromPencil("#94A3B8", "color-text-tertiary", {
        cssVariable: "--chart-5",
      }),
      chartPrimary: fromPencil("#2563EB", "color-brand", {
        cssVariable: "--chart-1",
      }),
      chartSuccess: fromPencil("#15803D", "color-success-fg", {
        cssVariable: "--chart-2",
      }),
      chartWarning: fromPencil("#B45309", "color-warning-fg", {
        cssVariable: "--chart-3",
      }),
      destructive: fromPencil("#DC2626", "color-danger", {
        cssVariable: "--destructive",
      }),
      destructiveForeground: fromPencil("#FFFFFF", "color-text-inverse", {
        cssVariable: "--destructive-foreground",
      }),
      disabledBackground: fromPencil("#E2E8F0", "color-disabled-bg", {
        cssVariable: "--disabled-background",
      }),
      disabledForeground: fromPencil("#94A3B8", "color-disabled-fg", {
        cssVariable: "--disabled-foreground",
      }),
      foreground: fromPencil("#0F172A", "color-text-primary", {
        cssVariable: "--foreground",
      }),
      input: fromPencil("#D6DEE9", "input-border", {
        cssVariable: "--input",
      }),
      muted: fromPencil("#F1F5F9", "color-surface-muted", {
        cssVariable: "--muted",
      }),
      mutedForeground: fromPencil("#64748B", "color-text-secondary", {
        cssVariable: "--muted-foreground",
      }),
      overlay: fromPencil("#0F172A66", "color-overlay", {
        cssVariable: "--overlay",
      }),
      placeholder: fromPencil("#B8C3D1", "color-text-placeholder", {
        cssVariable: "--placeholder",
      }),
      popover: fromPencil("#FFFFFF", "color-bg-elevated", {
        cssVariable: "--popover",
      }),
      popoverForeground: fromPencil("#0F172A", "color-text-primary", {
        cssVariable: "--popover-foreground",
      }),
      primary: fromPencil("#2563EB", "color-brand", {
        cssVariable: "--primary",
      }),
      primaryForeground: fromPencil("#FFFFFF", "color-text-inverse", {
        cssVariable: "--primary-foreground",
      }),
      primaryHover: fromPencil("#1D4ED8", "color-brand-hover", {
        cssVariable: "--primary-hover",
      }),
      ring: fromPencil("#93C5FD", "color-focus-ring", {
        cssVariable: "--ring",
      }),
      secondary: fromPencil("#DBEAFE", "color-brand-soft", {
        cssVariable: "--secondary",
      }),
      secondaryForeground: fromPencil("#2563EB", "color-brand", {
        cssVariable: "--secondary-foreground",
      }),
      surfaceInset: fromPencil("#EEF2F7", "color-surface-inset", {
        cssVariable: "--surface-inset",
      }),
      warning: fromPencil("#B45309", "color-warning-fg", {
        cssVariable: "--warning",
      }),
      warningBackground: fromPencil("#FEF3C7", "color-warning-bg", {
        cssVariable: "--warning-background",
      }),
    },
  },
  typography: {
    families: {
      body: fromPencil("Inter", "font-body", {
        cssValue: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
        cssVariable: "--font-family-sans-token",
      }),
      data: fromPencil("IBM Plex Mono", "font-data", {
        cssValue:
          '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        cssVariable: "--font-family-data-token",
      }),
      heading: fromPencil("Inter", "font-heading", {
        cssValue: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
        cssVariable: "--font-family-heading-token",
      }),
      sanskrit: fromPencil("Inter", "font-sanskrit", {
        cssValue: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
        cssVariable: "--font-family-sanskrit-token",
      }),
      transliteration: fromPencil("Inter", "font-transliteration"),
      ui: fromPencil("Inter", "font-ui"),
    },
    lineHeight: {
      body: fromPencil(1.4, "line-height-body", {
        cssValue: "1.4",
        cssVariable: "--line-height-body",
      }),
      reading: fromPencil(1.6, "line-height-reading", {
        cssValue: "1.6",
        cssVariable: "--line-height-reading",
      }),
      sanskrit: fromPencil(1.75, "line-height-sanskrit", {
        cssValue: "1.75",
        cssVariable: "--line-height-sanskrit",
      }),
      tight: fromPencil(1.15, "line-height-tight"),
      title: fromPencil(1.25, "line-height-title", {
        cssValue: "1.25",
        cssVariable: "--line-height-title",
      }),
    },
    sizes: {
      body: fromPencil(15, "type-body-size", {
        cssValue: px(15),
        cssVariable: "--font-size-body",
      }),
      bodySm: fromPencil(14, "type-body-sm-size", {
        cssValue: px(14),
        cssVariable: "--font-size-body-sm",
      }),
      caption: fromPencil(12, "type-caption-size", {
        cssValue: px(12),
        cssVariable: "--font-size-caption",
      }),
      cardTitle: fromPencil(17, "type-card-title-size", {
        cssValue: px(17),
        cssVariable: "--font-size-card-title",
      }),
      display: fromPencil(32, "type-display-size"),
      meta: fromPencil(13, "type-meta-size", {
        cssValue: px(13),
        cssVariable: "--font-size-meta",
      }),
      nav: fromPencil(10, "type-nav-size", {
        cssValue: px(10),
        cssVariable: "--font-size-nav",
      }),
      pageTitle: fromPencil(24, "type-page-title-size", {
        cssValue: px(24),
        cssVariable: "--font-size-page-title",
      }),
      sanskrit: fromPencil(22, "type-sanskrit-size", {
        cssValue: px(22),
        cssVariable: "--font-size-sanskrit",
      }),
      screenTitle: fromPencil(28, "type-screen-title-size", {
        cssValue: px(28),
        cssVariable: "--font-size-screen-title",
      }),
      sectionTitle: fromPencil(20, "type-section-title-size", {
        cssValue: px(20),
        cssVariable: "--font-size-section-title",
      }),
      transliteration: fromPencil(14, "type-transliteration-size"),
    },
    weights: {
      bold: fromPencil("700", "type-weight-bold"),
      extraBold: fromPencil("800", "type-weight-extrabold"),
      medium: fromPencil("500", "type-weight-medium"),
      regular: fromPencil("400", "type-weight-regular"),
      semibold: fromPencil("600", "type-weight-semibold"),
    },
  },
  spacing: {
    "0": fromPencil(0, "space-0", {
      cssValue: px(0),
      cssVariable: "--space-0",
    }),
    "1": fromPencil(4, "space-1", {
      cssValue: px(4),
      cssVariable: "--space-1",
    }),
    "2": fromPencil(8, "space-2", {
      cssValue: px(8),
      cssVariable: "--space-2",
    }),
    "3": fromPencil(12, "space-3", {
      cssValue: px(12),
      cssVariable: "--space-3",
    }),
    "4": fromPencil(16, "space-4", {
      cssValue: px(16),
      cssVariable: "--space-4",
    }),
    "5": fromPencil(20, "space-5", {
      cssValue: px(20),
      cssVariable: "--space-5",
    }),
    "6": fromPencil(24, "space-6", {
      cssValue: px(24),
      cssVariable: "--space-6",
    }),
    "8": fromPencil(32, "space-8", {
      cssValue: px(32),
      cssVariable: "--space-8",
    }),
    "10": fromPencil(40, "space-10"),
    "12": fromPencil(48, "space-12"),
    screenGutter: fromPencil(20, "screen-gutter", {
      cssValue: px(20),
      cssVariable: "--screen-gutter",
    }),
    screenSectionGap: fromPencil(24, "screen-section-gap"),
  },
  radius: {
    default: fromPencil(8, "radius", {
      cssValue: px(8),
      cssVariable: "--radius",
    }),
    lg: fromPencil(12, "radius-lg", {
      cssValue: px(12),
      cssVariable: "--radius-large-token",
    }),
    md: fromPencil(8, "radius-md", {
      cssValue: px(8),
      cssVariable: "--radius-medium-token",
    }),
    none: fromPencil(0, "radius-none"),
    pill: fromPencil(999, "radius-pill", {
      cssValue: px(999),
      cssVariable: "--radius-pill-token",
    }),
    sm: fromPencil(6, "radius-sm", {
      cssValue: px(6),
      cssVariable: "--radius-small-token",
    }),
    xl: fromPencil(16, "radius-xl", {
      cssValue: px(16),
      cssVariable: "--radius-extra-large-token",
    }),
  },
  elevation: {
    high: fromSource(
      "0 16px 40px 0 #0F172A24",
      "shadow-high",
      "CSS shadow geometry paired with Pencil shadow-high-color.",
      { cssVariable: "--shadow-high" },
    ),
    highColor: fromPencil("#0F172A24", "shadow-high-color", {
      cssVariable: "--shadow-high-color",
    }),
    low: fromSource(
      "0 1px 2px 0 #0F172A0A",
      "shadow-low",
      "CSS shadow geometry paired with Pencil shadow-low-color.",
      { cssVariable: "--shadow-low" },
    ),
    lowColor: fromPencil("#0F172A0A", "shadow-low-color", {
      cssVariable: "--shadow-low-color",
    }),
    mid: fromSource(
      "0 8px 24px 0 #0F172A14",
      "shadow-mid",
      "CSS shadow geometry paired with Pencil shadow-mid-color.",
      { cssVariable: "--shadow-mid" },
    ),
    midColor: fromPencil("#0F172A14", "shadow-mid-color", {
      cssVariable: "--shadow-mid-color",
    }),
    streak: fromPencil("#F973164D", "shadow-streak-color", {
      cssVariable: "--shadow-streak-color",
    }),
  },
  components: {
    adminForm: {
      fieldGap: fromSource(
        12,
        "component-admin-form-field-gap",
        "Field spacing measured from Product / Source Admin Form (QUgwl) and Product / Shloka Admin Form (gkqb9); Pencil has no named component variable for this value.",
        {
          cssValue: px(12),
          cssVariable: "--component-admin-form-field-gap",
        },
      ),
      nestedInset: fromSource(
        20,
        "component-admin-form-nested-inset",
        "Nested chapter inset measured from Product / Source Admin Form (QUgwl); Pencil has no named component variable for this value.",
        {
          cssValue: px(20),
          cssVariable: "--component-admin-form-nested-inset",
        },
      ),
      sectionGap: fromSource(
        18,
        "component-admin-form-section-gap",
        "Fields-to-actions spacing measured from Product / Source Admin Form (QUgwl) and Product / Shloka Admin Form (gkqb9); Pencil has no named component variable for this value.",
        {
          cssValue: px(18),
          cssVariable: "--component-admin-form-section-gap",
        },
      ),
    },
    bottomNavigation: {
      background: fromPencil(
        "#FFFFFFE6",
        "color-surface-translucent",
        {
          cssVariable: "--component-bottom-nav-background",
        },
      ),
      border: fromPencil("#E2E8F0", "border", {
        cssVariable: "--component-bottom-nav-border",
      }),
      gap: fromSource(
        2,
        "component-bottom-nav-gap",
        "Item gap measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(2),
          cssVariable: "--component-bottom-nav-gap",
        },
      ),
      height: fromPencil(64, "component-bottom-nav-height", {
        cssValue: px(64),
        cssVariable: "--component-bottom-nav-height",
      }),
      iconSize: fromPencil(18, "component-nav-icon-size", {
        cssValue: px(18),
        cssVariable: "--component-bottom-nav-icon-size",
      }),
      itemGap: fromSource(
        3,
        "component-bottom-nav-item-gap",
        "Item spacing measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(3),
          cssVariable: "--component-bottom-nav-item-gap",
        },
      ),
      itemRadius: fromPencil(26, "component-nav-item-radius", {
        cssValue: px(26),
        cssVariable: "--component-bottom-nav-item-radius",
      }),
      padding: fromSource(
        6,
        "component-bottom-nav-padding",
        "Container padding measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(6),
          cssVariable: "--component-bottom-nav-padding",
        },
      ),
      radius: fromSource(
        32,
        "component-bottom-nav-radius",
        "Container radius measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(32),
          cssVariable: "--component-bottom-nav-radius",
        },
      ),
      shadow: fromSource(
        "0 8px 20px 0 #0F172A14",
        "component-bottom-nav-shadow",
        "Shadow geometry from Product / Bottom Navigation (S7Pta) paired with Pencil shadow-mid-color.",
        { cssVariable: "--component-bottom-nav-shadow" },
      ),
      width: fromPencil(358, "component-bottom-nav-width", {
        cssValue: px(358),
        cssVariable: "--component-bottom-nav-width",
      }),
    },
    button: {
      fontLg: fromPencil(16, "button-font-lg"),
      fontMd: fromPencil(15, "button-font-md", {
        cssValue: px(15),
        cssVariable: "--button-font-size",
      }),
      fontSm: fromPencil(14, "button-font-sm"),
      heightLg: fromPencil(52, "button-lg-height"),
      heightMd: fromPencil(44, "button-md-height", {
        cssValue: px(44),
        cssVariable: "--button-height",
      }),
      heightSm: fromPencil(36, "button-sm-height"),
      primaryBg: fromPencil("#2563EB", "button-primary-bg"),
      primaryFg: fromPencil("#FFFFFF", "button-primary-fg"),
      radius: fromPencil(8, "button-radius"),
      secondaryBg: fromPencil("#FFFFFF", "button-secondary-bg"),
      secondaryFg: fromPencil("#2563EB", "button-secondary-fg"),
    },
    card: {
      gap: fromSource(
        10,
        "component-card-gap",
        "Content gap measured from Product / Shloka Card (Vzs9b); Pencil has no named variable for this value.",
        {
          cssValue: px(10),
          cssVariable: "--component-card-gap",
        },
      ),
      indicatorSize: fromSource(
        22,
        "component-card-indicator-size",
        "Chevron size measured from Product / Shloka Card (Vzs9b); Pencil has no named variable for this value.",
        {
          cssValue: px(22),
          cssVariable: "--component-card-indicator-size",
        },
      ),
      padding: fromPencil(14, "component-card-padding", {
        cssValue: px(14),
        cssVariable: "--component-card-padding",
      }),
      width: fromPencil(342, "component-card-width"),
    },
    emptyState: {
      descriptionLineHeight: fromSource(
        1.35,
        "component-empty-description-line-height",
        "Description line height measured from Product / Empty State (RPtlw); Pencil has no named variable for this value.",
        {
          cssValue: "1.35",
          cssVariable: "--component-empty-description-line-height",
        },
      ),
      iconSize: fromPencil(42, "component-empty-icon-size", {
        cssValue: px(42),
        cssVariable: "--component-empty-icon-size",
      }),
      padding: fromPencil(18, "component-empty-padding", {
        cssValue: px(18),
        cssVariable: "--component-empty-padding",
      }),
    },
    input: {
      background: fromPencil("#FFFFFF", "input-bg"),
      border: fromPencil("#D6DEE9", "input-border"),
      focusBorder: fromPencil("#2563EB", "input-border-focus"),
      heightMd: fromPencil(44, "input-height-md", {
        cssValue: px(44),
        cssVariable: "--input-height",
      }),
      paddingX: fromPencil(12, "input-padding-x", {
        cssValue: px(12),
        cssVariable: "--input-padding-x",
      }),
      radius: fromPencil(8, "input-radius", {
        cssValue: px(8),
        cssVariable: "--input-radius",
      }),
      textSize: fromPencil(15, "input-text-size", {
        cssValue: px(15),
        cssVariable: "--input-text-size",
      }),
    },
    pageHeader: {
      actionSize: fromSource(
        40,
        "component-page-header-action-size",
        "Back action size measured from Product / Layout / Back Header (haku8); Pencil has no named variable for this value.",
        {
          cssValue: px(40),
          cssVariable: "--component-page-header-action-size",
        },
      ),
      height: fromSource(
        44,
        "component-page-header-height",
        "Header height measured from Product / Layout / Back Header (haku8); Pencil has no named variable for this value.",
        {
          cssValue: px(44),
          cssVariable: "--component-page-header-height",
        },
      ),
      iconSize: fromSource(
        22,
        "component-page-header-icon-size",
        "Back icon size measured from Product / Layout / Back Header (haku8); Pencil has no named variable for this value.",
        {
          cssValue: px(22),
          cssVariable: "--component-page-header-icon-size",
        },
      ),
      titleLineHeight: fromPencil(1.2, "typo-h1-line", {
        cssValue: "1.2",
        cssVariable: "--component-page-header-title-line-height",
      }),
    },
    settingsRow: {
      gap: fromSource(
        12,
        "component-settings-row-gap",
        "Content gap measured from settings rows on Настройки (HTlzD); Pencil has no named component variable for this value.",
        {
          cssValue: px(12),
          cssVariable: "--component-settings-row-gap",
        },
      ),
      padding: fromSource(
        14,
        "component-settings-row-padding",
        "Container padding measured from settings rows on Настройки (HTlzD); Pencil has no named component variable for this value.",
        {
          cssValue: px(14),
          cssVariable: "--component-settings-row-padding",
        },
      ),
      radius: fromPencil(12, "radius-lg", {
        cssValue: px(12),
        cssVariable: "--component-settings-row-radius",
      }),
    },
    tipAccordion: {
      border: fromPencil("#E2E8F0", "border", {
        cssVariable: "--component-tip-accordion-border",
      }),
      contentLineHeight: fromSource(
        1.35,
        "component-tip-accordion-content-line-height",
        "Content line height measured from Product / Tip Accordion Item / Expanded (rgPsh); Pencil has no named component variable for this value.",
        {
          cssValue: "1.35",
          cssVariable: "--component-tip-accordion-content-line-height",
        },
      ),
    },
    tabs: {
      height: fromPencil(42, "component-tab-height", {
        cssValue: px(42),
        cssVariable: "--component-tab-height",
      }),
    },
  },
} as const;

export const pwaThemeTokens = {
  backgroundColor: designTokens.semantic.color.background,
  iconBrand: designTokens.semantic.color.primary,
  iconBrandHover: designTokens.semantic.color.primaryHover,
  iconSurface: designTokens.semantic.color.card,
  iconSurfaceMuted: designTokens.semantic.color.muted,
  themeColor: designTokens.semantic.color.primary,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isDesignToken = (value: unknown): value is DesignToken =>
  isRecord(value) &&
  "source" in value &&
  "value" in value &&
  isRecord(value.source);

export const collectDesignTokens = (
  node: unknown = designTokens,
  path: string[] = [],
): FlattenedDesignToken[] => {
  if (isDesignToken(node)) {
    return [{ path: path.join("."), token: node }];
  }

  if (!isRecord(node)) {
    return [];
  }

  return Object.entries(node).flatMap(([key, value]) =>
    collectDesignTokens(value, [...path, key]),
  );
};

export const cssVariableTokens = collectDesignTokens().filter(
  ({ token }) => token.cssVariable !== undefined,
);
