import type { ReactNode } from "react";

import { strings } from "@/shared/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export function AuthScreen({
  children,
  description,
  footer,
  title,
}: {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color-mix(in_oklch,var(--secondary),var(--background)_55%)] px-4 py-8">
      <section className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">{strings.app.name}</p>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{strings.auth.accountAccess}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          {footer}
        </p>
      </section>
    </main>
  );
}
