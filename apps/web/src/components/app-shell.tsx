import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, LogOut } from "lucide-react";

import { isUnauthorizedError } from "@/api/errors";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { strings } from "@/shared/i18n";

interface AppShellProps {
  children: ReactNode;
  title: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const auth = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    void router.navigate({ replace: true, to: "/login" });
  }, [auth, router, sessionQuery.error]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await auth.logout();
      await router.navigate({ replace: true, to: "/login" });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {auth.account?.email ?? strings.auth.sessionChecking}
            </p>
          </div>
          <Button
            aria-label={strings.auth.logout}
            disabled={isLoggingOut}
            onClick={handleLogout}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5 pb-28 sm:px-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-2 gap-2 px-4 py-2 sm:px-6">
          <NavItem icon={<LayoutDashboard />} label={strings.nav.dashboard} to="/dashboard" />
          <NavItem icon={<BookOpen />} label={strings.nav.library} to="/library" />
        </div>
      </nav>
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
  to: "/dashboard" | "/library";
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

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
