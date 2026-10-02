import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type ScreenLayoutProps = {
  children: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  header?: ReactNode;
  labelledBy?: string;
  role?: "alert" | "status";
};

export function ScreenLayout({
  children,
  contentClassName,
  footer,
  header,
  labelledBy,
  role,
}: ScreenLayoutProps) {
  return (
    <main className="fixed inset-x-0 top-0 mx-auto h-dvh min-h-0 w-full max-w-3xl overflow-hidden bg-background text-foreground">
      <section
        aria-labelledby={labelledBy}
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-hidden pt-[env(safe-area-inset-top)]",
          !footer && "pb-[env(safe-area-inset-bottom)]",
        )}
        role={role}
      >
        {header ? <div className="shrink-0">{header}</div> : null}
        <div className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", contentClassName)}>
          {children}
        </div>
        {footer ? (
          <footer className="shrink-0 bg-card pb-[env(safe-area-inset-bottom)] shadow-[var(--component-bottom-nav-shadow)]">
            {footer}
          </footer>
        ) : null}
      </section>
    </main>
  );
}
