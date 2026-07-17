import { Link } from "@tanstack/react-router";

import { strings } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

export type BottomNavigationSection =
  | "dashboard"
  | "learning"
  | "library"
  | "settings";

export type BottomNavigationProps = {
  activeSection?: BottomNavigationSection | undefined;
};

type NavigationItem = {
  icon: NavigationIcon;
  label: string;
  section: BottomNavigationSection;
  to:
    | typeof routePaths.dashboard
    | typeof routePaths.learning
    | typeof routePaths.library
    | typeof routePaths.settings;
};

type NavigationIcon = "apps" | "home" | "menu_book" | "school";

const navigationItems = [
  {
    icon: "home",
    label: strings.nav.dashboard,
    section: "dashboard",
    to: routePaths.dashboard,
  },
  {
    icon: "menu_book",
    label: strings.nav.library,
    section: "library",
    to: routePaths.library,
  },
  {
    icon: "school",
    label: strings.nav.learning,
    section: "learning",
    to: routePaths.learning,
  },
  {
    icon: "apps",
    label: strings.nav.settings,
    section: "settings",
    to: routePaths.settings,
  },
] as const satisfies readonly NavigationItem[];

export function BottomNavigation({
  activeSection,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label={strings.nav.primaryLabel}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto h-[calc(var(--component-bottom-nav-height)+env(safe-area-inset-bottom))] max-w-[var(--component-bottom-nav-width)] rounded-[var(--component-bottom-nav-radius)] bg-[var(--component-bottom-nav-background)] shadow-[var(--component-bottom-nav-shadow)] outline-1 -outline-offset-1 [outline-color:var(--component-bottom-nav-border)]"
    >
      <ul className="grid h-[var(--component-bottom-nav-height)] list-none grid-cols-4 gap-[var(--component-bottom-nav-gap)] p-[var(--component-bottom-nav-padding)]">
        {navigationItems.map((item) => {
          const isActive = activeSection === item.section;
          const content = (
            <>
              <NavigationIcon name={item.icon} />
              <span className="max-w-full truncate">{item.label}</span>
            </>
          );

          return (
            <li className="min-w-0" key={item.section}>
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavigationIcon({ name }: { name: NavigationIcon }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-[var(--component-bottom-nav-icon-size)] shrink-0 items-center justify-center font-['Material_Symbols_Rounded'] text-[length:var(--component-bottom-nav-icon-size)] leading-none font-bold [font-feature-settings:'liga'] [font-variation-settings:'FILL'_0,'wght'_700,'GRAD'_0,'opsz'_24]"
    >
      {name}
    </span>
  );
}

function getItemClassName(isActive: boolean) {
  return cn(
    "h-full w-full min-w-0 flex-col gap-[var(--component-bottom-nav-item-gap)] rounded-[var(--component-bottom-nav-item-radius)] border-0 bg-transparent p-0 text-[length:var(--component-bottom-nav-label-size)] leading-tight shadow-none hover:bg-transparent active:translate-y-0 disabled:opacity-100",
    isActive
      ? "font-semibold text-primary hover:text-primary"
      : "font-medium text-muted-foreground hover:text-muted-foreground",
  );
}
