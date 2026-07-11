import type { ReactElement } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/shared/ui/button";

export type EmptyStateProps = {
  action?: ReactElement | undefined;
  description: string;
  headingLevel?: 1 | 2 | 3 | undefined;
  title: string;
};

export function EmptyState({
  action,
  description,
  headingLevel = 2,
  title,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-[var(--component-empty-padding)] text-card-foreground">
      <span className="flex size-[var(--component-empty-icon-size)] items-center justify-center rounded-full bg-accent text-primary">
        <BookOpen aria-hidden="true" className="size-5" />
      </span>
      <Heading className="break-words font-heading text-[length:var(--font-size-card-title)] leading-[var(--line-height-title)] font-bold [overflow-wrap:anywhere]">
        {title}
      </Heading>
      <p className="break-words text-[length:var(--font-size-body-sm)] leading-[var(--component-empty-description-line-height)] text-muted-foreground [overflow-wrap:anywhere]">
        {description}
      </p>
      {action ? (
        <Button
          asChild
          className="h-[var(--button-height)] w-fit px-4 text-[length:var(--button-font-size)]"
        >
          {action}
        </Button>
      ) : null}
    </section>
  );
}
