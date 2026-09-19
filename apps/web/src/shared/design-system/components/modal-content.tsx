import type { ComponentProps } from "react";
import { Dialog } from "radix-ui";

import { cn } from "@/shared/lib/utils";

const modalSizes = {
  sm: "md:max-w-sm",
  md: "md:max-w-[var(--component-modal-wide-width)]",
  lg: "md:max-w-2xl",
} as const;

export type ModalContentProps = ComponentProps<typeof Dialog.Content> & {
  size?: keyof typeof modalSizes;
};

export function ModalContent({
  children,
  className,
  size = "md",
  ...props
}: ModalContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)]" />
      <Dialog.Content
        {...props}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto max-h-dvh w-full max-w-[var(--component-modal-mobile-width)] overflow-y-auto rounded-t-[var(--component-modal-mobile-radius)] bg-card px-5 pt-3 pb-[calc(var(--component-modal-padding-bottom)+env(safe-area-inset-bottom))] shadow-[var(--component-modal-shadow)] outline-none md:top-1/2 md:bottom-auto md:max-h-[calc(100dvh-var(--space-5)*2)] md:-translate-y-1/2 md:rounded-2xl md:pb-[var(--component-modal-padding-bottom)]",
          modalSizes[size],
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto mb-[var(--component-modal-handle-gap)] h-1 w-[var(--component-modal-handle-width)] rounded-full bg-[var(--border-strong)] md:hidden" />
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
