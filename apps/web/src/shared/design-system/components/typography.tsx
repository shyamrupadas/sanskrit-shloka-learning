import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type TypographyVariant = "h1" | "h2" | "h3" | "p1" | "p2" | "p3" | "p4";

export type TypographyWeight = "normal" | "medium" | "bold";

export type TypographyTone =
  | "default"
  | "muted"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "inverse"
  | "inherit";

export type TypographyAs = "h1" | "h2" | "h3" | "p" | "span" | "div";

export type TypographyProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color" | "dangerouslySetInnerHTML"
> & {
  as?: TypographyAs;
  children?: ReactNode;
  tone?: TypographyTone;
  variant?: TypographyVariant;
  weight?: TypographyWeight;
};

export type SanskritTypographyProps = TypographyProps;

const defaultElements = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  p1: "p",
  p2: "p",
  p3: "p",
  p4: "p",
} as const satisfies Record<TypographyVariant, TypographyAs>;

const variantStyles = {
  h1: {
    fontSize: "var(--typography-h1-size)",
    lineHeight: "var(--typography-heading-line-height)",
  },
  h2: {
    fontSize: "var(--typography-h2-size)",
    lineHeight: "var(--typography-heading-line-height)",
  },
  h3: {
    fontSize: "var(--typography-h3-size)",
    lineHeight: "var(--typography-heading-line-height)",
  },
  p1: {
    fontSize: "var(--typography-p1-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
  p2: {
    fontSize: "var(--typography-p2-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
  p3: {
    fontSize: "var(--typography-p3-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
  p4: {
    fontSize: "var(--typography-p4-size)",
    lineHeight: "var(--typography-body-line-height)",
  },
} as const satisfies Record<TypographyVariant, CSSProperties>;

const weightStyles = {
  bold: "var(--typography-weight-bold)",
  medium: "var(--typography-weight-medium)",
  normal: "var(--typography-weight-normal)",
} as const satisfies Record<TypographyWeight, CSSProperties["fontWeight"]>;

const toneStyles = {
  brand: "var(--primary)",
  danger: "var(--destructive)",
  default: "var(--foreground)",
  inherit: "inherit",
  inverse: "var(--inverse-foreground)",
  muted: "var(--muted-foreground)",
  success: "var(--success)",
  warning: "var(--warning)",
} as const satisfies Record<TypographyTone, CSSProperties["color"]>;

const defaultWeight = (variant: TypographyVariant): TypographyWeight =>
  variant.startsWith("h") ? "bold" : "normal";

export function Typography({
  as,
  children,
  style,
  tone = "default",
  variant = "p2",
  weight,
  ...props
}: TypographyProps) {
  const Component = as ?? defaultElements[variant];
  const resolvedWeight = weight ?? defaultWeight(variant);

  return (
    <Component
      style={{
        ...style,
        ...variantStyles[variant],
        color: toneStyles[tone],
        fontFamily:
          "var(--typography-font-family, var(--font-family-sans-token))",
        fontWeight: weightStyles[resolvedWeight],
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SanskritTypography({
  style,
  ...props
}: SanskritTypographyProps) {
  return (
    <Typography
      style={
        {
          ...style,
          "--typography-font-family":
            "var(--font-family-sanskrit-token)",
        } as CSSProperties
      }
      {...props}
    />
  );
}
