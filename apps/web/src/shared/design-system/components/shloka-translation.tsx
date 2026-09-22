import type { CSSProperties } from "react";

import { strings } from "@/shared/i18n";

import { Typography } from "./typography";

const headingStyle = {
  "--typography-body-line-height": "var(--typography-heading-line-height)",
} as CSSProperties;

export function ShlokaTranslation({ text }: { text: string | undefined }) {
  if (!text?.trim()) {
    return null;
  }

  return (
    <section aria-label={strings.shloka.translation} className="space-y-2 pt-2">
      <Typography
        as="h2"
        style={headingStyle}
        tone="muted"
        variant="p2"
        weight="bold"
      >
        {strings.shloka.translation}
      </Typography>
      <Typography
        className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
        variant="p3"
      >
        {text}
      </Typography>
    </section>
  );
}
