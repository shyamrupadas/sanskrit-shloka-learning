import { strings } from "@/shared/i18n";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function TextField({
  autoComplete,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        autoComplete={autoComplete}
        className="h-[var(--input-height)] rounded-[var(--input-radius)] bg-card px-[var(--input-padding-x)] text-[length:var(--input-text-size)] placeholder:text-[color:var(--placeholder)]"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </div>
  );
}

export function PasswordField({
  autoComplete,
  label,
  minLength,
  onChange,
  error,
  placeholder,
  showPassword,
  value,
}: {
  autoComplete: string;
  error?: string | null | undefined;
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className="h-[var(--input-height)] rounded-[var(--input-radius)] bg-card px-[var(--input-padding-x)] text-[length:var(--input-text-size)] placeholder:text-[color:var(--placeholder)]"
        id={id}
        minLength={minLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        required
        type={showPassword ? "text" : "password"}
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}

export function PasswordVisibilityToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="w-fit gap-2.5 font-normal text-muted-foreground">
      <input
        checked={checked}
        className="size-4.5 rounded border-border accent-primary"
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        type="checkbox"
      />
      {strings.auth.showPassword}
    </Label>
  );
}

export function FieldError({
  error,
  id,
}: {
  error?: string | null | undefined;
  id?: string | undefined;
}) {
  if (!error) {
    return null;
  }

  return (
    <p className="text-xs leading-tight text-destructive" id={id} role="alert">
      {error}
    </p>
  );
}
