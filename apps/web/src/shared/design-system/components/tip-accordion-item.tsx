import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type TipAccordionItemProps = {
  defaultExpanded?: boolean;
  text: string;
  title: string;
};

export function TipAccordionItem({
  defaultExpanded = false,
  text,
  title,
}: TipAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const Indicator = isExpanded ? ChevronDown : ChevronRight;

  return (
    <article className="rounded-xl border bg-card p-[var(--component-card-padding)] [border-color:var(--component-tip-accordion-border)]">
      <button
        aria-controls={contentId}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        <span className="min-w-0 flex-1 text-base leading-[var(--line-height-title)] font-bold">
          {title}
        </span>
        <Indicator
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
      </button>
      {isExpanded ? (
        <p
          className="mt-2.5 break-words text-[length:var(--font-size-body-sm)] leading-[var(--component-tip-accordion-content-line-height)] text-muted-foreground [overflow-wrap:anywhere]"
          id={contentId}
        >
          {text}
        </p>
      ) : null}
    </article>
  );
}
