import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";

export type PageHeaderBackAction = {
  label: string;
  onClick: () => void;
};

export type PageHeaderProps = {
  backAction?: PageHeaderBackAction;
  title: string;
};

export function PageHeader({ backAction, title }: PageHeaderProps) {
  const titleElement = (
    <h1 className="truncate text-center font-heading text-[length:var(--font-size-screen-title)] leading-[var(--component-page-header-title-line-height)] font-extrabold">
      {title}
    </h1>
  );

  if (!backAction) {
    return (
      <header className="flex h-[var(--component-page-header-height)] items-center justify-center">
        {titleElement}
      </header>
    );
  }

  return (
    <header className="grid h-[var(--component-page-header-height)] grid-cols-[auto_minmax(0,1fr)_auto] items-center">
      <Button
        aria-label={backAction.label}
        className="size-[var(--component-page-header-action-size)] rounded-full"
        onClick={backAction.onClick}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-[var(--component-page-header-icon-size)]"
        />
      </Button>
      {titleElement}
      <span
        aria-hidden="true"
        className="size-[var(--component-page-header-action-size)]"
      />
    </header>
  );
}
