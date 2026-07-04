import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

import { isUnauthorizedError } from "@/shared/api/errors";
import { routePaths } from "@/shared/model/routes";

import { useSession } from "./session-context";

export function useUnauthorizedRedirect(error: unknown) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isUnauthorizedError(error)) {
      return;
    }

    session.clearSession();
    void router.navigate({ replace: true, to: routePaths.login });
  }, [error, router, session]);
}
