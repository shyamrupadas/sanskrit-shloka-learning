import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/errors";
import { useAuth } from "@/auth/auth-context";
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
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

export function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await auth.apiClient.login({
        email: email.trim(),
        password,
      });
      auth.setSession(session);
      await router.navigate({ replace: true, to: routePaths.dashboard });
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, strings.auth.loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      description={strings.auth.loginDescription}
      footer={
        <>
          <span>{strings.auth.noAccount}</span>
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={routePaths.register}>
            {strings.auth.registerLink}
          </Link>
        </>
      }
      title={strings.auth.loginTitle}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FieldError error={error} />
        <TextField
          autoComplete="email"
          label={strings.auth.email}
          onChange={setEmail}
          type="email"
          value={email}
        />
        <PasswordField
          autoComplete="current-password"
          label={strings.auth.password}
          onChange={setPassword}
          showPassword={showPassword}
          toggleShowPassword={() => setShowPassword((current) => !current)}
          value={password}
        />
        <Button className="h-10 w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? strings.auth.loginSubmitting : strings.auth.loginAction}
        </Button>
      </form>
    </AuthScreen>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(strings.auth.passwordMinLength);
      return;
    }

    if (password !== passwordConfirmation) {
      setError(strings.auth.passwordMismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await auth.apiClient.register({
        email: email.trim(),
        password,
        passwordConfirmation,
      });
      auth.setSession(session);
      await router.navigate({ replace: true, to: routePaths.dashboard });
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, strings.auth.registerError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      description={strings.auth.registerDescription}
      footer={
        <>
          <span>{strings.auth.hasAccount}</span>
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={routePaths.login}>
            {strings.auth.loginLink}
          </Link>
        </>
      }
      title={strings.auth.registerTitle}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FieldError error={error} />
        <TextField
          autoComplete="email"
          label={strings.auth.email}
          onChange={setEmail}
          type="email"
          value={email}
        />
        <PasswordField
          autoComplete="new-password"
          label={strings.auth.password}
          minLength={6}
          onChange={setPassword}
          showPassword={showPassword}
          toggleShowPassword={() => setShowPassword((current) => !current)}
          value={password}
        />
        <PasswordField
          autoComplete="new-password"
          label={strings.auth.passwordConfirmation}
          minLength={6}
          onChange={setPasswordConfirmation}
          showPassword={showPassword}
          showToggle={false}
          toggleShowPassword={() => setShowPassword((current) => !current)}
          value={passwordConfirmation}
        />
        <Button className="h-10 w-full" disabled={isSubmitting} type="submit">
          {isSubmitting
            ? strings.auth.registerSubmitting
            : strings.auth.registerAction}
        </Button>
      </form>
    </AuthScreen>
  );
}

function AuthScreen({
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

function TextField({
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

function PasswordField({
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

function FieldError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}
