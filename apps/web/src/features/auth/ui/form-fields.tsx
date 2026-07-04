import { Eye, EyeOff } from "lucide-react";

import { strings } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function TextField({
  autoComplete,
  label,
  onChange,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  type: string;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        autoComplete={autoComplete}
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
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
  showPassword,
  showToggle = true,
  toggleShowPassword,
  value,
}: {
  autoComplete: string;
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  showPassword: boolean;
  showToggle?: boolean;
  toggleShowPassword: () => void;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          autoComplete={autoComplete}
          className={showToggle ? "pr-10" : undefined}
          id={id}
          minLength={minLength}
          onChange={(event) => onChange(event.currentTarget.value)}
          required
          type={showPassword ? "text" : "password"}
          value={value}
        />
        {showToggle ? (
          <Button
            aria-label={
              showPassword ? strings.auth.hidePassword : strings.auth.showPassword
            }
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={toggleShowPassword}
            size="icon"
            type="button"
            variant="ghost"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function FieldError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}
