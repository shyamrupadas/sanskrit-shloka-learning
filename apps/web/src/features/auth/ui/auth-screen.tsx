import type { ReactNode } from "react";

import { Typography } from "@/shared/design-system/components";
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
        <Typography className="text-center" variant="h1">
          {title}
        </Typography>
        {children}
        <Typography
          className="flex flex-wrap items-center justify-center gap-1.5"
          tone="muted"
          variant="p2"
        >
          {footer}
        </Typography>
      </Card>
    </main>
  );
}
