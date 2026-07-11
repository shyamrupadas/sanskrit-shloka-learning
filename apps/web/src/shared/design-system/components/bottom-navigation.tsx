import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { strings } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

export type BottomNavigationSection =
  | "dashboard"
  | "library"
  | "settings";

export type BottomNavigationProps = {
  activeSection?: BottomNavigationSection | undefined;
};

type AvailableNavigationItem = {
  Icon: LucideIcon;
  label: string;
  section: BottomNavigationSection;
  to:
    | typeof routePaths.dashboard
    | typeof routePaths.library
    | typeof routePaths.settings;
};

type UnavailableNavigationItem = {
  Icon: LucideIcon;
  label: string;
  section: "learning";
};

const navigationItems = [
  {
    Icon: LayoutDashboard,
    label: strings.nav.dashboard,
    section: "dashboard",
    to: routePaths.dashboard,
  },
  {
    Icon: BookOpen,
    label: strings.nav.library,
    section: "library",
    to: routePaths.library,
  },
  {
    Icon: GraduationCap,
    label: strings.nav.learning,
    section: "learning",
  },
  {
    Icon: Settings,
    label: strings.nav.settings,
    section: "settings",
    to: routePaths.settings,
  },
] as const satisfies readonly (
  | AvailableNavigationItem
  | UnavailableNavigationItem
)[];

export function BottomNavigation({
  activeSection,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label={strings.nav.primaryLabel}
      className="fixed inset-x-4 z-20 mx-auto h-[var(--component-bottom-nav-height)] max-w-[var(--component-bottom-nav-width)] rounded-[var(--component-bottom-nav-radius)] border bg-[var(--component-bottom-nav-background)] shadow-[var(--component-bottom-nav-shadow)] [border-color:var(--component-bottom-nav-border)] [bottom:max(var(--space-4),env(safe-area-inset-bottom))]"
    >
      <ul className="grid h-full list-none grid-cols-4 gap-[var(--component-bottom-nav-gap)] p-[var(--component-bottom-nav-padding)]">
        {navigationItems.map((item) => {
          const isActive = activeSection === item.section;
          const content = (
            <>
              <item.Icon
                aria-hidden="true"
                className="size-[var(--component-bottom-nav-icon-size)]"
              />
              <span className="max-w-full truncate">{item.label}</span>
            </>
          );

          return (
            <li className="min-w-0" key={item.section}>
              {"to" in item ? (
                <Button
                  asChild
                  className={getItemClassName(isActive)}
                  variant="ghost"
                >
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    to={item.to}
                  >
                    {content}
                  </Link>
                </Button>
              ) : (
                <Button
                  className={getItemClassName(false)}
                  disabled
                  type="button"
                  variant="ghost"
                >
                  {content}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function getItemClassName(isActive: boolean) {
  return cn(
    "h-full w-full min-w-0 flex-col gap-[var(--component-bottom-nav-item-gap)] rounded-[var(--component-bottom-nav-item-radius)] border-0 p-1 text-[length:var(--font-size-nav)] leading-tight shadow-none active:translate-y-0 disabled:opacity-100",
    isActive
      ? "bg-accent font-bold text-accent-foreground hover:bg-accent hover:text-accent-foreground"
      : "bg-transparent font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}
