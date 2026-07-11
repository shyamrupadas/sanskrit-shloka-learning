import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

export type ShlokaCardAction = {
  disabled?: boolean | undefined;
  Icon?: LucideIcon | undefined;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | undefined;
};

export type ShlokaCardProps = {
  action?: ShlokaCardAction | undefined;
  excerpt: string;
  openLabel: string;
  shlokaCode: string;
  status?: string | undefined;
  title: string;
};

export function ShlokaCard({
  action,
  excerpt,
  openLabel,
  shlokaCode,
  status,
  title,
}: ShlokaCardProps) {
  const ActionIcon = action?.Icon;

  return (
    <article
      aria-label={title}
      className="flex min-w-0 flex-col gap-[var(--component-card-gap)] rounded-xl border border-border bg-card p-[var(--component-card-padding)] text-card-foreground shadow-[var(--shadow-low)]"
    >
      <div className="flex min-w-0 items-center gap-[var(--component-card-gap)]">
        <Link
          aria-label={excerpt}
          className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          params={{ shlokaCode }}
          to={routePaths.libraryShloka}
        >
          <span className="block break-words text-[length:var(--font-size-body)] leading-[var(--line-height-title)] font-bold [overflow-wrap:anywhere]">
            {title}
          </span>
          <span className="mt-1.5 block min-w-0 truncate text-[length:var(--font-size-meta)] leading-[var(--line-height-body)] text-muted-foreground">
            {excerpt}
          </span>
        </Link>
        <Link
          aria-label={openLabel}
          className="flex size-[var(--component-card-indicator-size)] shrink-0 items-center justify-center rounded-full text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          params={{ shlokaCode }}
          to={routePaths.libraryShloka}
        >
          <ChevronRight aria-hidden="true" className="size-full" />
        </Link>
      </div>

      {status || action ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {status ? (
            <span
              aria-label={`Статус: ${status}`}
              className="w-fit rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground"
            >
              {status}
            </span>
          ) : null}
          {action ? (
            <Button
              className="ml-auto h-9 px-3"
              disabled={action.disabled}
              onClick={action.onClick}
              type="button"
              variant={action.variant ?? "outline"}
            >
              {ActionIcon ? <ActionIcon aria-hidden="true" /> : null}
              {action.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
