import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";

import { Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

import { AdminShell } from "./ui/admin-page";

export function AdminHomePage() {
  return (
    <AdminShell backTo={routePaths.settings} backLabel={strings.nav.settings} title={strings.admin.adminTitle}>
      {[
        { to: routePaths.adminCatalog, title: strings.admin.catalogTitle, description: strings.admin.catalogDescription, Icon: BookOpen },
        { to: routePaths.adminLearning, title: strings.nav.learning, description: strings.admin.learningDescription, Icon: GraduationCap },
      ].map(({ to, title, description, Icon }) => (
        <Link className="flex items-center gap-3 rounded-xl border border-[var(--component-tip-accordion-border)] bg-card p-4" key={to} to={to}>
          <Icon aria-hidden="true" className="size-5.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <Typography variant="h3">{title}</Typography>
            <Typography tone="muted" variant="p2">{description}</Typography>
          </div>
          <ChevronRight aria-hidden="true" className="size-4.5 shrink-0" />
        </Link>
      ))}
    </AdminShell>
  );
}
