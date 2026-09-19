import { Link } from "@tanstack/react-router";

import { Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

export const tipButtonClass = "h-[var(--button-height)] rounded-lg px-4";

export function TipListState({ state, onRetry }: { state: "loading" | "error" | "empty"; onRetry?: () => void }) {
  const copy = state === "loading" ? [strings.adminTips.loadingTitle, strings.adminTips.loading] : state === "error"
    ? [strings.adminTips.loadErrorTitle, strings.adminTips.loadError] : [strings.adminTips.emptyTitle, strings.adminTips.empty];
  return (
    <section className="space-y-4 rounded-xl border border-[var(--component-tip-accordion-border)] bg-card p-4.5" role={state === "loading" ? "status" : undefined}>
      <Typography variant="h2">{copy[0]}</Typography>
      <Typography tone="muted" variant="p2">{copy[1]}</Typography>
      {state === "error" ? <Button className={`${tipButtonClass} text-[length:var(--button-font-size)]`} onClick={onRetry}>{strings.learning.retry}</Button> : null}
      {state === "empty" ? <Button asChild className={`${tipButtonClass} text-[length:var(--button-font-size)]`}><Link to={routePaths.adminTipNew}>{strings.adminTips.addFirst}</Link></Button> : null}
    </section>
  );
}
