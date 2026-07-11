import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AuthScreen } from "./ui/auth-screen";
import {
  FieldError,
  PasswordField,
  PasswordVisibilityToggle,
  TextField,
} from "./ui/form-fields";

type RegisterError = {
  field: "confirmation" | "form" | "password";
  message: string;
};

export function RegisterPage() {
  const session = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<RegisterError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError({ field: "password", message: strings.auth.passwordMinLength });
      return;
    }

    if (password !== passwordConfirmation) {
      setError({
        field: "confirmation",
        message: strings.auth.passwordMismatch,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const nextSession = await session.apiClient.register({
        email: email.trim(),
        password,
        passwordConfirmation,
      });
      session.setSession(nextSession);
      await router.navigate({ replace: true, to: routePaths.dashboard });
    } catch (caughtError) {
      setError({
        field: "form",
        message: getApiErrorMessage(caughtError, strings.auth.registerError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <span>{strings.auth.hasAccount}</span>
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={routePaths.login}>
            {strings.auth.loginLink}
          </Link>
        </>
      }
      title={strings.auth.registerTitle}
      variant="register"
    >
      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <FieldError
          error={error?.field === "form" ? error.message : undefined}
        />
        <TextField
          autoComplete="email"
          label={strings.auth.email}
          onChange={setEmail}
          placeholder={strings.auth.emailPlaceholder}
          type="email"
          value={email}
        />
        <PasswordField
          autoComplete="new-password"
          error={error?.field === "password" ? error.message : undefined}
          label={strings.auth.password}
          minLength={6}
          onChange={setPassword}
          placeholder={strings.auth.passwordPlaceholder}
          showPassword={showPassword}
          value={password}
        />
        <PasswordField
          autoComplete="new-password"
          error={error?.field === "confirmation" ? error.message : undefined}
          label={strings.auth.passwordConfirmation}
          minLength={6}
          onChange={setPasswordConfirmation}
          placeholder={strings.auth.passwordConfirmationPlaceholder}
          showPassword={showPassword}
          value={passwordConfirmation}
        />
        <PasswordVisibilityToggle
          checked={showPassword}
          onCheckedChange={setShowPassword}
        />
        <Button
          className="h-[var(--button-height)] w-full text-[length:var(--button-font-size)]"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? strings.auth.registerSubmitting
            : strings.auth.registerAction}
        </Button>
      </form>
    </AuthScreen>
  );
}
