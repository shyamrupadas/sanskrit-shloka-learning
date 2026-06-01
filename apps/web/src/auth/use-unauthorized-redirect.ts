import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { isUnauthorizedError } from "@/api/errors";
import { useAuth } from "@/auth/auth-context";

export function useUnauthorizedRedirect(error: unknown) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUnauthorizedError(error)) {
      return;
    }

    auth.clearSession();
    void router.navigate({ replace: true, to: "/login" });
  }, [auth, error, router]);
}
