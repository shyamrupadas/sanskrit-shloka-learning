import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AuthScreen } from "./ui/auth-screen";
import { FieldError, PasswordField, TextField } from "./ui/form-fields";

export function RegisterPage() {
  const session = useSession();
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
      const nextSession = await session.apiClient.register({
        email: email.trim(),
        password,
        passwordConfirmation,
      });
      session.setSession(nextSession);
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
