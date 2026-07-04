import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AuthScreen } from "./ui/auth-screen";
import { FieldError, PasswordField, TextField } from "./ui/form-fields";

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
