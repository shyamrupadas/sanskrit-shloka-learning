import type { ReactNode } from "react";

export type SettingsRowProps = {
  action?: ReactNode | undefined;
  description?: ReactNode | undefined;
  feedback?: ReactNode | undefined;
  title: string;
  titleId?: string | undefined;
};

export function SettingsRow({
  action,
  description,
  feedback,
  title,
  titleId,
}: SettingsRowProps) {
  return (
    <section className="flex min-w-0 flex-col gap-[var(--component-settings-row-gap)] rounded-[var(--component-settings-row-radius)] border border-border bg-card p-[var(--component-settings-row-padding)] text-card-foreground shadow-[var(--shadow-low)]">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-[var(--component-settings-row-gap)]">
        <div className="min-w-0 flex-1">
          <h2
            className="break-words text-base leading-[var(--line-height-title)] font-bold [overflow-wrap:anywhere]"
            id={titleId}
          >
            {title}
          </h2>
          {description ? (
            <div className="mt-1 break-words text-[length:var(--font-size-body-sm)] leading-[var(--line-height-body)] text-muted-foreground [overflow-wrap:anywhere]">
              {description}
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {feedback ? <div>{feedback}</div> : null}
    </section>
  );
}
