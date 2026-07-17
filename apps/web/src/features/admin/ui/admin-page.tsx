import { useId, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { ChevronDown, TriangleAlert } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/errors";
import { PageHeader } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import {
  Card,
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
  subtitle,
  title,
}: {
  backTo?: typeof routePaths.admin | typeof routePaths.settings;
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  const router = useRouter();

  return (
    <section className="min-w-0 space-y-4">
      <PageHeader
        backAction={{
          label: strings.common.back,
          onClick: () => void router.navigate({ to: backTo }),
        }}
        title={title}
      />
      <p className="break-words text-[length:var(--font-size-body-sm)] leading-[var(--line-height-body)] text-muted-foreground [overflow-wrap:anywhere]">
        {subtitle}
      </p>
      {children}
    </section>
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
    <Card className="rounded-xl border border-border shadow-[var(--shadow-low)] ring-0">
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
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[length:var(--font-size-body-sm)] text-destructive"
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
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[length:var(--font-size-body-sm)] text-destructive"
      role="alert"
    >
      {error}
    </p>
  );
}

export function SuccessMessage({ text }: { text: string }) {
  return (
    <p
      className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-[length:var(--font-size-body-sm)] text-primary"
      role="status"
    >
      {text}
    </p>
  );
}

export function WarningMessage({ text }: { text: string }) {
  return (
    <p className="flex gap-2 rounded-lg border px-3 py-2 text-[length:var(--font-size-body-sm)] leading-[var(--line-height-body)] [border-color:var(--warning)] bg-[var(--warning-background)] text-[color:var(--warning)]">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

export function TextField({
  inputMode,
  label,
  onChange,
  pattern,
  readOnly,
  required,
  value,
}: {
  inputMode?: "numeric";
  label: string;
  onChange: (value: string) => void;
  pattern?: string;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}) {
  const id = useFieldId(label);

  return (
    <div className="min-w-0 space-y-2">
      <Label className="font-semibold" htmlFor={id}>
        {label}
      </Label>
      <Input
        className="h-[var(--input-height)] rounded-[var(--input-radius)] bg-card px-[var(--input-padding-x)] text-[length:var(--input-text-size)] read-only:bg-muted read-only:text-muted-foreground"
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.currentTarget.value)}
        pattern={pattern}
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
    <div className="min-w-0 space-y-2">
      <Label className="font-semibold" htmlFor={id}>
        {label}
      </Label>
      <Textarea
        className="min-h-28 rounded-[var(--input-radius)] bg-card px-[var(--input-padding-x)] py-3 text-[length:var(--input-text-size)]"
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
    <div className="min-w-0 space-y-2">
      <Label className="font-semibold" htmlFor={id}>
        {label}
      </Label>
      <div className="relative min-w-0">
        <select
          className="h-[var(--input-height)] w-full min-w-0 appearance-none rounded-[var(--input-radius)] border border-input bg-card px-[var(--input-padding-x)] pr-10 text-[length:var(--input-text-size)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}

function useFieldId(label: string): string {
  return `${label.toLowerCase().replaceAll(" ", "-")}-${useId()}`;
}
