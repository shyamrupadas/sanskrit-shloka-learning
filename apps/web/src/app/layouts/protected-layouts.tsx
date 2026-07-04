import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, Settings } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

export function AuthenticatedLayout() {
  return (
    <ProtectedLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5 pb-28 sm:px-6">
        <Outlet />
      </main>
      <BottomNavigation />
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
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}

function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-3 gap-2 px-4 py-2 sm:px-6">
        <NavItem icon={<LayoutDashboard />} label={strings.nav.dashboard} to={routePaths.dashboard} />
        <NavItem icon={<BookOpen />} label={strings.nav.library} to={routePaths.library} />
        <NavItem icon={<Settings />} label={strings.nav.settings} to={routePaths.settings} />
      </div>
    </nav>
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
