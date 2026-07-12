import { Link } from "@tanstack/react-router";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

import { AdminShell, StatusCard } from "../../ui/admin-page";
import {
  getShlokaExcerpt,
  getShlokaLocation,
  getSourceCaption,
} from "../lib/catalog-formatters";

interface CatalogViewProps {
  catalog: ApiTypes.AdminCatalogDto | undefined;
  error: unknown;
  isPending: boolean;
}

export function CatalogView({
  catalog,
  error,
  isPending,
}: CatalogViewProps) {
  return (
    <AdminShell
      backTo={routePaths.settings}
      subtitle={strings.admin.adminSubtitle}
      title={strings.admin.adminTitle}
    >
      <div
        aria-label={strings.admin.catalogActions}
        className="flex flex-col gap-2.5"
        role="group"
      >
        <AdminActionLink label={strings.admin.newShloka} to={routePaths.adminShlokaNew} />
        <AdminActionLink label={strings.admin.newSource} to={routePaths.adminSourceNew} />
      </div>

      {isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : error ? (
        <StatusCard
          description={getApiErrorMessage(
            error,
            strings.admin.loadCatalogError,
          )}
          title={strings.common.error}
        />
      ) : (
        <section className="min-w-0 space-y-3.5">
          <h2 className="font-heading text-[length:var(--font-size-section-title)] leading-[var(--line-height-title)] font-extrabold">
            {strings.admin.catalogListTitle}
          </h2>
          <div className="min-w-0 space-y-3.5">
            {catalog?.sources.map((source) => (
              <SourceSection key={source.code} source={source} />
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  );
}

function AdminActionLink({
  label,
  to,
}: {
  label: string;
  to: typeof routePaths.adminShlokaNew | typeof routePaths.adminSourceNew;
}) {
  return (
    <Button
      asChild
      className="h-14 w-full justify-between rounded-xl border-border bg-card px-3.5 text-base font-bold text-foreground shadow-[var(--shadow-low)] hover:bg-muted"
      variant="outline"
    >
      <Link to={to}>
        <span className="flex min-w-0 items-center gap-2.5">
          <Plus aria-hidden="true" className="size-5 text-primary" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4.5 text-muted-foreground"
        />
      </Link>
    </Button>
  );
}

function SourceSection({
  source,
}: {
  source: ApiTypes.AdminCatalogSourceDto;
}) {
  return (
    <section className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-card-foreground shadow-[var(--shadow-low)]">
        <div className="min-w-0 space-y-1">
          <h3 className="break-words text-base leading-[var(--line-height-title)] font-extrabold [overflow-wrap:anywhere]">
            {source.title}
          </h3>
          <p className="break-words text-[length:var(--font-size-caption)] font-semibold text-muted-foreground [overflow-wrap:anywhere]">
            {source.code} · {getSourceCaption(source)}
          </p>
        </div>
        <Button
          asChild
          aria-label={`${strings.admin.editSource} ${source.title}`}
          className="shrink-0 text-primary"
          size="icon"
          variant="ghost"
        >
          <Link
            params={{ sourceCode: source.code }}
            to={routePaths.adminSourceEdit}
          >
            <Pencil aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {source.shlokas.length > 0 ? (
        <div className="min-w-0 space-y-2 pl-4.5">
          {source.shlokas.map((shloka) => (
            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-[var(--shadow-low)]"
              key={shloka.code}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-[length:var(--font-size-body-sm)] font-bold">
                  {getShlokaLocation(source, shloka)}
                </p>
                <p className="truncate text-[length:var(--font-size-meta)] text-muted-foreground">
                  {getShlokaExcerpt(shloka.text)}
                </p>
              </div>
              <Button
                asChild
                aria-label={`${strings.admin.editShloka} ${shloka.number}`}
                className="shrink-0 text-primary"
                size="icon"
                variant="ghost"
              >
                <Link
                  params={{ shlokaCode: shloka.code }}
                  to={routePaths.adminShlokaEdit}
                >
                  <Pencil aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
