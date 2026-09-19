import type { ReactElement } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { Typography } from "./typography";

export type EmptyStateProps = {
  action?: ReactElement | undefined;
  actionFullWidth?: boolean;
  showIcon?: boolean;
  description: string;
  title: string;
};

export function EmptyState({
  action,
  actionFullWidth = false,
  showIcon = true,
  description,
  title,
}: EmptyStateProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-[var(--component-empty-padding)] text-card-foreground">
      {showIcon ? (
        <span className="flex size-[var(--component-empty-icon-size)] items-center justify-center rounded-full bg-accent text-primary">
          <BookOpen aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <Typography
        className="break-words [overflow-wrap:anywhere]"
        variant="h3"
      >
        {title}
      </Typography>
      <Typography
        className="break-words [overflow-wrap:anywhere]"
        tone="muted"
        variant="p2"
      >
        {description}
      </Typography>
      {action ? (
        <Button
          asChild
          className={`h-[var(--button-height)] ${actionFullWidth ? "w-full" : "w-fit"} px-4 text-[length:var(--button-font-size)]`}
        >
          {action}
        </Button>
      ) : null}
    </section>
  );
}
