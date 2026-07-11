import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AuthScreen } from "./ui/auth-screen";
import {
  PasswordField,
  PasswordVisibilityToggle,
  TextField,
} from "./ui/form-fields";

export function LoginPage() {
  const session = useSession();
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
      const nextSession = await session.apiClient.login({
        email: email.trim(),
        password,
      });
      session.setSession(nextSession);
      await router.navigate({ replace: true, to: routePaths.dashboard });
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, strings.auth.loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <span>{strings.auth.noAccount}</span>
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={routePaths.register}>
            {strings.auth.registerLink}
          </Link>
        </>
      }
      title={strings.auth.loginTitle}
      variant="login"
    >
      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <TextField
          autoComplete="email"
          label={strings.auth.email}
          onChange={setEmail}
          placeholder={strings.auth.emailPlaceholder}
          type="email"
          value={email}
        />
        <PasswordField
          autoComplete="current-password"
          error={error}
          label={strings.auth.password}
          onChange={setPassword}
          placeholder={strings.auth.passwordPlaceholder}
          showPassword={showPassword}
          value={password}
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
          {isSubmitting ? strings.auth.loginSubmitting : strings.auth.loginAction}
        </Button>
      </form>
    </AuthScreen>
  );
}
