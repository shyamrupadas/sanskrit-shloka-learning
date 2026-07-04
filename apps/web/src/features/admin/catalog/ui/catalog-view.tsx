import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

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
    <>
      <Button asChild className="mb-4 size-12" size="icon-lg" variant="ghost">
        <Link aria-label={strings.common.back} to={routePaths.settings}>
          <ArrowLeft className="size-6" />
        </Link>
      </Button>
      <section className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">
          {strings.admin.adminTitle}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {strings.admin.adminSubtitle}
        </p>
      </section>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-10">
          <Link to={routePaths.adminShlokaNew}>
            <Plus />
            {strings.admin.newShloka}
          </Link>
        </Button>
        <Button asChild className="h-10" variant="outline">
          <Link to={routePaths.adminSourceNew}>
            <Plus />
            {strings.admin.newSource}
          </Link>
        </Button>
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
        <section className="space-y-4">
          {catalog?.sources.map((source) => (
            <SourceSection key={source.code} source={source} />
          ))}
        </section>
      )}
    </>
  );
}

function SourceSection({
  source,
}: {
  source: ApiTypes.AdminCatalogSourceDto;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words">{source.title}</CardTitle>
            <CardDescription>
              {source.code} · {getSourceCaption(source)}
            </CardDescription>
          </div>
          <Button
            asChild
            aria-label={`${strings.admin.editSource} ${source.title}`}
            size="icon-sm"
            variant="ghost"
          >
            <Link
              params={{ sourceCode: source.code }}
              to={routePaths.adminSourceEdit}
            >
              <Pencil />
            </Link>
          </Button>
        </div>
      </CardHeader>
      {source.shlokas.length > 0 ? (
        <CardContent>
          <div className="divide-y rounded-lg border">
            {source.shlokas.map((shloka) => (
              <div
                className="flex items-start justify-between gap-3 px-3 py-3"
                key={shloka.code}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {getShlokaLocation(source, shloka)}
                  </p>
                  <p className="break-words text-sm leading-6 text-muted-foreground">
                    {getShlokaExcerpt(shloka.text)}
                  </p>
                </div>
                <Button
                  asChild
                  aria-label={`${strings.admin.editShloka} ${shloka.number}`}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Link
                    params={{ shlokaCode: shloka.code }}
                    to={routePaths.adminShlokaEdit}
                  >
                    <Pencil />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function StatusCard({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );
}
