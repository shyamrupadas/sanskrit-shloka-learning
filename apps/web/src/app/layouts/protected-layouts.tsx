import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useLocation } from "@tanstack/react-router";

import {
  BottomNavigation,
  type BottomNavigationSection,
} from "@/shared/design-system/components";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

export function AuthenticatedLayout() {
  const location = useLocation();

  return (
    <ProtectedLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-5 pb-[calc(var(--component-bottom-nav-height)+var(--space-8)+env(safe-area-inset-bottom))] sm:px-6">
        <Outlet />
      </main>
      <BottomNavigation
        activeSection={getActiveNavigationSection(location.pathname)}
      />
    </ProtectedLayout>
  );
}

export function AdminLayout() {
  return (
    <ProtectedLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6">
        <Outlet />
      </main>
    </ProtectedLayout>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const sessionQuery = useQuery({
    enabled: session.hasSession,
    queryFn: () => session.apiClient.getSession(),
    queryKey: ["auth", "session", session.accessToken],
  });

  useEffect(() => {
    if (sessionQuery.data) {
      session.setSession(sessionQuery.data);
    }
  }, [session, sessionQuery.data]);

  useUnauthorizedRedirect(sessionQuery.error);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {children}
    </div>
  );
}

function getActiveNavigationSection(
  pathname: string,
): BottomNavigationSection | undefined {
  if (pathname === routePaths.dashboard) {
    return "dashboard";
  }

  if (
    pathname === routePaths.library ||
    pathname.startsWith(`${routePaths.library}/`)
  ) {
    return "library";
  }

  if (pathname === routePaths.settings) {
    return "settings";
  }

  return undefined;
}
