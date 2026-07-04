import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, Settings } from "lucide-react";

import { isUnauthorizedError } from "@/shared/api/errors";
import { useAuth } from "@/auth/auth-context";
import { cn } from "@/shared/lib/utils";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

interface AppShellProps {
  children: ReactNode;
  showBottomNavigation?: boolean;
}

export function AppShell({
  children,
  showBottomNavigation = true,
}: AppShellProps) {
  const auth = useAuth();
  const router = useRouter();

  const sessionQuery = useQuery({
    enabled: auth.hasSession,
    queryFn: () => auth.apiClient.getSession(),
    queryKey: ["auth", "session", auth.accessToken],
  });

  useEffect(() => {
    if (sessionQuery.data) {
      auth.setSession(sessionQuery.data);
    }
  }, [auth, sessionQuery.data]);

  useEffect(() => {
    if (!isUnauthorizedError(sessionQuery.error)) {
      return;
    }

    auth.clearSession();
    void router.navigate({ replace: true, to: routePaths.login });
  }, [auth, router, sessionQuery.error]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6",
          showBottomNavigation && "pb-28",
        )}
      >
        {children}
      </main>

      {showBottomNavigation ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-3 gap-2 px-4 py-2 sm:px-6">
            <NavItem icon={<LayoutDashboard />} label={strings.nav.dashboard} to={routePaths.dashboard} />
            <NavItem icon={<BookOpen />} label={strings.nav.library} to={routePaths.library} />
            <NavItem icon={<Settings />} label={strings.nav.settings} to={routePaths.settings} />
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function NavItem({
  icon,
  label,
  to,
}: {
  icon: ReactNode;
  label: string;
  to:
    | typeof routePaths.dashboard
    | typeof routePaths.library
    | typeof routePaths.settings;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to === routePaths.library &&
      location.pathname.startsWith(`${routePaths.library}/`));

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      to={to}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
