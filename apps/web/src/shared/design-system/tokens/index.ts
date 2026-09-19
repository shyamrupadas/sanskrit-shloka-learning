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
        textPrimary: fromPencil("#334155", "color-text-primary"),
        textSecondary: fromPencil("#64748B", "color-text-secondary"),
        textTertiary: fromPencil("#94A3B8", "color-text-tertiary"),
        transparent: fromPencil("#FFFFFF00", "color-transparent"),
      },
      status: {
        infoBg: fromPencil("#DBEAFE", "color-info-bg"),
        infoBorder: fromPencil("#93C5FD", "color-info-border", {
          cssVariable: "--info-border",
        }),
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
      cardForeground: fromPencil("#334155", "color-text-primary", {
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
      dangerBackground: fromPencil("#FEE2E2", "color-danger-soft", {
        cssVariable: "--danger-background",
      }),
      dangerBorder: fromSource(
        "#FCA5A5",
        "color-danger-border",
        "Danger banner border measured from Заучивание — ошибка подтверждена (Ql5lM); Pencil has no named semantic variable for this value.",
        { cssVariable: "--danger-border" },
      ),
      destructiveForeground: fromPencil("#FFFFFF", "color-text-inverse", {
        cssVariable: "--destructive-foreground",
      }),
      disabledBackground: fromPencil("#E2E8F0", "color-disabled-bg", {
        cssVariable: "--disabled-background",
      }),
      disabledForeground: fromPencil("#94A3B8", "color-disabled-fg", {
        cssVariable: "--disabled-foreground",
      }),
      foreground: fromPencil("#334155", "color-text-primary", {
        cssVariable: "--foreground",
      }),
      input: fromPencil("#D6DEE9", "input-border", {
        cssVariable: "--input",
      }),
      inverseForeground: fromPencil("#FFFFFF", "color-text-inverse", {
        cssVariable: "--inverse-foreground",
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
      popoverForeground: fromPencil("#334155", "color-text-primary", {
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
      success: fromPencil("#15803D", "color-success-fg", {
        cssVariable: "--success",
      }),
      successBackground: fromPencil("#DCFCE7", "color-success-bg", {
        cssVariable: "--success-background",
      }),
      successBorder: fromPencil("#86EFAC", "color-success-border", {
        cssVariable: "--success-border",
      }),
      warning: fromPencil("#B45309", "color-warning-fg", {
        cssVariable: "--warning",
      }),
      warningBackground: fromPencil("#FEF3C7", "color-warning-bg", {
        cssVariable: "--warning-background",
      }),
      warningBorder: fromPencil("#FCD34D", "color-warning-border", {
        cssVariable: "--warning-border",
      }),
    },
  },
  typography: {
    contract: {
      lineHeight: {
        body: fromPencil(1.4, "typography-body-line", {
          cssValue: "1.4",
          cssVariable: "--typography-body-line-height",
        }),
        heading: fromPencil(1.25, "typography-heading-line", {
          cssValue: "1.25",
          cssVariable: "--typography-heading-line-height",
        }),
      },
      sizes: {
        h1: fromPencil(20, "typography-h1-size", {
          cssValue: px(20),
          cssVariable: "--typography-h1-size",
        }),
        h2: fromPencil(18, "typography-h2-size", {
          cssValue: px(18),
          cssVariable: "--typography-h2-size",
        }),
        h3: fromPencil(16, "typography-h3-size", {
          cssValue: px(16),
          cssVariable: "--typography-h3-size",
        }),
        p1: fromPencil(12, "typography-p1-size", {
          cssValue: px(12),
          cssVariable: "--typography-p1-size",
        }),
        p2: fromPencil(14, "typography-p2-size", {
          cssValue: px(14),
          cssVariable: "--typography-p2-size",
        }),
        p3: fromPencil(16, "typography-p3-size", {
          cssValue: px(16),
          cssVariable: "--typography-p3-size",
        }),
        p4: fromPencil(20, "typography-p4-size", {
          cssValue: px(20),
          cssVariable: "--typography-p4-size",
        }),
      },
      weights: {
        bold: fromPencil("700", "typography-weight-bold", {
          cssVariable: "--typography-weight-bold",
        }),
        medium: fromPencil("500", "typography-weight-medium", {
          cssVariable: "--typography-weight-medium",
        }),
        normal: fromPencil("400", "typography-weight-normal", {
          cssVariable: "--typography-weight-normal",
        }),
      },
    },
    families: {
      data: fromPencil("IBM Plex Mono", "font-data", {
        cssValue:
          '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        cssVariable: "--font-family-data-token",
      }),
      sanskrit: fromPencil("Noto Serif", "font-sanskrit", {
        cssValue: '"Noto Serif", ui-serif, Georgia, serif',
        cssVariable: "--font-family-sanskrit-token",
      }),
      transliteration: fromPencil("Inter", "font-transliteration"),
      ui: fromPencil("Inter", "font-ui", {
        cssValue:
          '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
        cssVariable: "--font-family-sans-token",
      }),
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
      background: fromPencil("#FFFFFF", "color-surface", {
        cssVariable: "--component-bottom-nav-background",
      }),
      border: fromPencil("#FFFFFF00", "color-transparent", {
        cssVariable: "--component-bottom-nav-border",
      }),
      gap: fromSource(
        0,
        "component-bottom-nav-gap",
        "Item gap measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(0),
          cssVariable: "--component-bottom-nav-gap",
        },
      ),
      height: fromPencil(64, "component-bottom-nav-height", {
        cssValue: px(64),
        cssVariable: "--component-bottom-nav-height",
      }),
      iconSize: fromPencil(22, "component-nav-icon-size", {
        cssValue: px(22),
        cssVariable: "--component-bottom-nav-icon-size",
      }),
      itemGap: fromSource(
        2,
        "component-bottom-nav-item-gap",
        "Item spacing measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssValue: px(2),
          cssVariable: "--component-bottom-nav-item-gap",
        },
      ),
      itemRadius: fromPencil(0, "radius-none", {
        cssValue: px(0),
        cssVariable: "--component-bottom-nav-item-radius",
      }),
      labelSize: fromSource(
        11,
        "component-bottom-nav-label-size",
        "Label size measured from Product / Bottom Navigation (S7Pta); Pencil has no named component variable for this value.",
        {
          cssValue: px(11),
          cssVariable: "--component-bottom-nav-label-size",
        },
      ),
      padding: fromSource(
        "6px 0",
        "component-bottom-nav-padding",
        "Container padding measured from Product / Bottom Navigation (S7Pta); Pencil has no named variable for this value.",
        {
          cssVariable: "--component-bottom-nav-padding",
        },
      ),
      radius: fromPencil(0, "radius-none", {
        cssValue: px(0),
        cssVariable: "--component-bottom-nav-radius",
      }),
      shadow: fromSource(
        "0 -4px 16px 0 #0F172A14",
        "component-bottom-nav-shadow",
        "Shadow geometry from Product / Bottom Navigation (S7Pta) paired with Pencil shadow-mid-color.",
        { cssVariable: "--component-bottom-nav-shadow" },
      ),
      width: fromPencil(390, "component-bottom-nav-width", {
        cssValue: px(390),
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
    modal: {
      mobileRadius: fromSource(
        24,
        "component-modal-mobile-radius",
        "Mobile sheet top corner radius in MfM5u.",
        {
          cssValue: px(24),
          cssVariable: "--component-modal-mobile-radius",
        },
      ),
      mobileWidth: fromSource(
        390,
        "component-modal-mobile-width",
        "Mobile sheet width in MfM5u.",
        {
          cssValue: px(390),
          cssVariable: "--component-modal-mobile-width",
        },
      ),
      wideWidth: fromSource(
        560,
        "component-modal-wide-width",
        "Centered dialog width in G1Mmty.",
        {
          cssValue: px(560),
          cssVariable: "--component-modal-wide-width",
        },
      ),
      paddingBottom: fromSource(
        28,
        "component-modal-padding-bottom",
        "Sheet bottom padding in MfM5u and G1Mmty.",
        {
          cssValue: px(28),
          cssVariable: "--component-modal-padding-bottom",
        },
      ),
      handleWidth: fromSource(
        42,
        "component-modal-handle-width",
        "Mobile sheet handle width in MfM5u.",
        {
          cssValue: px(42),
          cssVariable: "--component-modal-handle-width",
        },
      ),
      handleGap: fromSource(
        18,
        "component-modal-handle-gap",
        "Existing mobile handle-to-header spacing retained when extracting the shared modal.",
        {
          cssValue: px(18),
          cssVariable: "--component-modal-handle-gap",
        },
      ),
      shadow: fromSource(
        "0 -12px 32px var(--shadow-high-color)",
        "component-modal-shadow",
        "Sheet shadow geometry in MfM5u and G1Mmty.",
        { cssVariable: "--component-modal-shadow" },
      ),
    },
    learningAdvice: {
      textLineHeight: fromSource(
        1.58,
        "component-learning-advice-text-line-height",
        "Advice text line height measured from Заучивание — совет (MfM5u) and Заучивание — советы исчерпаны (GBSHa); Pencil has no named component variable for this value.",
        {
          cssValue: "1.58",
          cssVariable: "--component-learning-advice-text-line-height",
        },
      ),
      textSize: fromSource(
        18,
        "component-learning-advice-text-size",
        "Advice text size measured from Заучивание — совет (MfM5u) and Заучивание — советы исчерпаны (GBSHa); Pencil has no named component variable for this value.",
        {
          cssValue: px(18),
          cssVariable: "--component-learning-advice-text-size",
        },
      ),
      titleSize: fromSource(
        22,
        "component-learning-advice-title-size",
        "Advice sheet title size measured from Заучивание — совет (MfM5u) and Заучивание — советы исчерпаны (GBSHa); Pencil has no named component variable for this value.",
        {
          cssValue: px(22),
          cssVariable: "--component-learning-advice-title-size",
        },
      ),
    },
    learningAttempt: {
      canonicalTextLineHeight: fromSource(
        1.55,
        "component-learning-attempt-canonical-text-line-height",
        "Canonical text line height measured from Заучивание — шлока (QPXXW) and Заучивание — длинная шлока (UWOdl); Pencil has no named component variable for this value.",
        {
          cssValue: "1.55",
          cssVariable:
            "--component-learning-attempt-canonical-text-line-height",
        },
      ),
      canonicalTextSize: fromSource(
        22,
        "component-learning-attempt-canonical-text-size",
        "Canonical text size measured from Заучивание — шлока (QPXXW) and Заучивание — длинная шлока (UWOdl); Pencil has no named component variable for this value.",
        {
          cssValue: px(22),
          cssVariable: "--component-learning-attempt-canonical-text-size",
        },
      ),
      recoveryBannerPaddingY: fromSource(
        11,
        "component-learning-attempt-recovery-banner-padding-y",
        "Recovery banner vertical padding measured from Заучивание — ошибка подтверждена (Ql5lM) and Заучивание — статус неизвестен (LICPw); Pencil has no named component variable for this value.",
        {
          cssValue: px(11),
          cssVariable:
            "--component-learning-attempt-recovery-banner-padding-y",
        },
      ),
      recoveryBannerTextSize: fromSource(
        13,
        "component-learning-attempt-recovery-banner-text-size",
        "Recovery banner text size measured from Заучивание — ошибка подтверждена (Ql5lM) and Заучивание — статус неизвестен (LICPw); Pencil has no named component variable for this value.",
        {
          cssValue: px(13),
          cssVariable:
            "--component-learning-attempt-recovery-banner-text-size",
        },
      ),
      stateTitleSize: fromSource(
        27,
        "component-learning-attempt-state-title-size",
        "State title and symbol size measured from Заучивание — ошибка загрузки (Z3V3cv) and Заучивание — status guard (oLEhU); Pencil has no named component variable for this value.",
        {
          cssValue: px(27),
          cssVariable: "--component-learning-attempt-state-title-size",
        },
      ),
      titleLineHeight: fromSource(
        1.18,
        "component-learning-attempt-title-line-height",
        "Title line height measured from Заучивание — шлока (QPXXW), Заучивание — ошибка загрузки (Z3V3cv), and Заучивание — status guard (oLEhU); Pencil has no named component variable for this value.",
        {
          cssValue: "1.18",
          cssVariable: "--component-learning-attempt-title-line-height",
        },
      ),
      titleSize: fromSource(
        28,
        "component-learning-attempt-title-size",
        "Shloka title size measured from Заучивание — шлока (QPXXW) and Заучивание — длинная шлока (UWOdl); Pencil has no named component variable for this value.",
        {
          cssValue: px(28),
          cssVariable: "--component-learning-attempt-title-size",
        },
      ),
    },
    learningHelper: {
      memoryPromptLineHeight: fromSource(
        1.18,
        "component-learning-helper-memory-prompt-line-height",
        "Memory prompt line height measured from Помощник — воспроизвести (ZmCht/i63n7); Pencil has no named component variable for this value.",
        {
          cssValue: "1.18",
          cssVariable:
            "--component-learning-helper-memory-prompt-line-height",
        },
      ),
      memoryPromptSize: fromSource(
        25,
        "component-learning-helper-memory-prompt-size",
        "Memory prompt size measured from Помощник — воспроизвести (ZmCht/i63n7); Pencil has no named component variable for this value.",
        {
          cssValue: px(25),
          cssVariable: "--component-learning-helper-memory-prompt-size",
        },
      ),
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
    streakIndicator: {
      counterSize: fromSource(
        28,
        "component-streak-counter-size",
        "Counter size measured from Product / Streak Page Body states (Vz3kf, ggEJw, W9OIY); Pencil has no named component variable for this value.",
        {
          cssValue: px(28),
          cssVariable: "--component-streak-counter-size",
        },
      ),
    },
    tipAccordion: {
      border: fromPencil("#E2E8F0", "border", {
        cssVariable: "--component-tip-accordion-border",
      }),
    },
    tabs: {
      height: fromPencil(42, "component-tab-height", {
        cssValue: px(42),
        cssVariable: "--component-tab-height",
      }),
      labelSize: fromPencil(12, "type-caption-size", {
        cssValue: px(12),
        cssVariable: "--component-tab-label-size",
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
