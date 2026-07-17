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

const navigationIconPaths = {
  apps: "M6.1 4.35h2.55c0.96 0 1.75 0.79 1.75 1.75v2.55c0 0.96-0.79 1.75-1.75 1.75h-2.55c-0.96 0-1.75-0.79-1.75-1.75v-2.55c0-0.96 0.79-1.75 1.75-1.75z m9.25 0h2.55c0.96 0 1.75 0.79 1.75 1.75v2.55c0 0.96-0.79 1.75-1.75 1.75h-2.55c-0.96 0-1.75-0.79-1.75-1.75v-2.55c0-0.96 0.79-1.75 1.75-1.75z m-9.25 9.25h2.55c0.96 0 1.75 0.79 1.75 1.75v2.55c0 0.96-0.79 1.75-1.75 1.75h-2.55c-0.96 0-1.75-0.79-1.75-1.75v-2.55c0-0.96 0.79-1.75 1.75-1.75z m9.25 0h2.55c0.96 0 1.75 0.79 1.75 1.75v2.55c0 0.96-0.79 1.75-1.75 1.75h-2.55c-0.96 0-1.75-0.79-1.75-1.75v-2.55c0-0.96 0.79-1.75 1.75-1.75z",
  home: "M12 2.75c-0.62 0-1.21 0.22-1.68 0.62l-5.8 4.93a4.1 4.1 0 0 0-1.42 3.12v5.55a2.03 2.03 0 0 0 2.03 2.03h3.28c0.43 0 0.79-0.35 0.79-0.79v-3.55c0-0.86 0.7-1.56 1.56-1.56h2.48c0.86 0 1.56 0.7 1.56 1.56v3.55c0 0.44 0.35 0.79 0.79 0.79h3.28a2.03 2.03 0 0 0 2.03-2.03v-5.55c0-1.2-0.52-2.34-1.43-3.12l-5.79-4.93a2.58 2.58 0 0 0-1.68-0.62z m-1.75 16.25v-4.28c0-0.45 0.37-0.82 0.82-0.82h1.86c0.45 0 0.82 0.37 0.82 0.82v4.28z",
  menu_book: "M5.6 4.3c2.3 0.09 4.1 0.61 5.34 1.57 0.42 0.33 0.66 0.83 0.66 1.36v10.62c0 0.45-0.52 0.7-0.88 0.43-1.28-0.97-3.1-1.51-5.46-1.62-1.21-0.06-2.16-1.06-2.16-2.27v-7.63c0-1.39 1.13-2.51 2.5-2.46z m12.8 0c-2.3 0.09-4.1 0.61-5.34 1.57-0.42 0.33-0.66 0.83-0.66 1.36v10.62c0 0.45 0.52 0.7 0.88 0.43 1.28-0.97 3.1-1.51 5.46-1.62 1.21-0.06 2.16-1.06 2.16-2.27v-7.63c0-1.39-1.13-2.51-2.5-2.46z",
  school: "M12 4.1c-0.42 0-0.83 0.1-1.2 0.29l-7.22 3.69c-1.06 0.54-1.06 2.06 0 2.6l7.22 3.69c0.75 0.38 1.65 0.38 2.4 0l5.95-3.04v4.38c0 0.69 0.56 1.25 1.25 1.25s1.25-0.56 1.25-1.25v-5.88c0-0.69-0.38-1.31-0.99-1.63l-7.46-3.81a2.66 2.66 0 0 0-1.2-0.29z m-5.8 8.45v2.52c0 0.64 0.36 1.23 0.94 1.53l3.66 1.87c0.75 0.38 1.65 0.38 2.4 0l3.66-1.87c0.58-0.3 0.94-0.89 0.94-1.53v-2.52l-4.6 2.35c-0.75 0.38-1.65 0.38-2.4 0z",
} as const satisfies Record<NavigationIcon, string>;

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
    <svg
      aria-hidden="true"
      className="size-[var(--component-bottom-nav-icon-size)] shrink-0 fill-current"
      viewBox="0 0 24 24"
    >
      <path
        d={navigationIconPaths[name]}
        fillRule={name === "home" ? "evenodd" : undefined}
      />
    </svg>
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
