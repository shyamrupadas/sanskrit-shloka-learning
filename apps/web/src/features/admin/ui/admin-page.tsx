import { useId, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function AdminShell({
  backTo = routePaths.admin,
  children,
}: {
  backTo?: typeof routePaths.admin | typeof routePaths.settings;
  children: ReactNode;
}) {
  return (
    <>
      <AdminBackLink to={backTo} />
      {children}
    </>
  );
}

export function AdminHeader({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <section className="mb-5 space-y-1">
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </section>
  );
}

export function AdminFormCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}

export function StatusCard({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}

export function FieldError({
  error,
  fallback,
}: {
  error: unknown;
  fallback: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <p
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {getApiErrorMessage(error, fallback)}
    </p>
  );
}

export function LocalError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {error}
    </p>
  );
}

export function SuccessMessage({ text }: { text: string }) {
  return (
    <p
      className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary"
      role="status"
    >
      {text}
    </p>
  );
}

export function WarningMessage({ text }: { text: string }) {
  return (
    <p className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm leading-6 text-primary">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

export function TextField({
  label,
  onChange,
  readOnly,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}) {
  const id = useFieldId(label);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        readOnly={readOnly}
        required={required}
        value={value}
      />
    </div>
  );
}

export function TextareaField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const id = useFieldId(label);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        value={value}
      />
    </div>
  );
}

export function SelectField({
  label,
  onChange,
  options,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
  value: string;
}) {
  const id = useFieldId(label);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AdminBackLink({
  to,
}: {
  to: typeof routePaths.admin | typeof routePaths.settings;
}) {
  return (
    <Button asChild className="mb-4 size-12" size="icon-lg" variant="ghost">
      <Link aria-label={strings.common.back} to={to}>
        <ArrowLeft className="size-6" />
      </Link>
    </Button>
  );
}

function useFieldId(label: string): string {
  return `${label.toLowerCase().replaceAll(" ", "-")}-${useId()}`;
}
