import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";

export function AuthScreen({
  children,
  footer,
  title,
  variant,
}: {
  children: ReactNode;
  footer: ReactNode;
  title: string;
  variant: "login" | "register";
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <Card
        className={cn(
          "w-full max-w-[350px] gap-4.5 overflow-visible bg-card px-6 py-6 ring-0",
          variant === "register"
            ? "rounded-[28px] border-0 pb-7 shadow-none"
            : "rounded-xl border border-border shadow-[var(--shadow-high)]",
        )}
      >
        <h1 className="text-center font-heading text-[length:var(--font-size-page-title)] leading-[var(--line-height-title)] font-bold">
          {title}
        </h1>
        {children}
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
          {footer}
        </p>
      </Card>
    </main>
  );
}
