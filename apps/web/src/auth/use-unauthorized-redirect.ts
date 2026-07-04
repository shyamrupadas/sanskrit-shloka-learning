import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { isUnauthorizedError } from "@/shared/api/errors";
import { useAuth } from "@/auth/auth-context";
import { routePaths } from "@/shared/model/routes";

export function useUnauthorizedRedirect(error: unknown) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUnauthorizedError(error)) {
      return;
    }

    auth.clearSession();
    void router.navigate({ replace: true, to: routePaths.login });
  }, [auth, error, router]);
}
