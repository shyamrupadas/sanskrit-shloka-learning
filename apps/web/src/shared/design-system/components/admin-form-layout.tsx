import type { FormEventHandler, ReactNode } from "react";

import { Button } from "@/shared/ui/button";

export type AdminFormLayoutProps = {
  children: ReactNode;
  isSubmitting: boolean;
  noValidate?: boolean | undefined;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
};

export function AdminFormLayout({
  children,
  isSubmitting,
  noValidate,
  onSubmit,
  submitLabel,
}: AdminFormLayoutProps) {
  return (
    <form
      className="flex min-w-0 flex-col gap-[var(--component-admin-form-section-gap)]"
      noValidate={noValidate}
      onSubmit={onSubmit}
    >
      <div className="flex min-w-0 flex-col gap-[var(--component-admin-form-field-gap)]">
        {children}
      </div>
      <Button
        className="h-[var(--button-height)] w-full px-4 text-[length:var(--button-font-size)]"
        disabled={isSubmitting}
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
