import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import {
  AdminShell,
  FieldError,
  StatusCard,
} from "../ui/admin-page";
import {
  useCreateShlokaForm,
  useEditShlokaForm,
} from "./model/shloka-form";
import { ShlokaEditorForm } from "./ui/shloka-editor-form";

export function AdminShlokaPage() {
  const auth = useSession();
  const optionsQuery = useQuery({
    queryFn: () => auth.apiClient.getOptions(),
    queryKey: ["admin", "sources", "options"],
  });

  useUnauthorizedRedirect(optionsQuery.error);

  return (
    <AdminShell
      subtitle={strings.admin.shlokaSubtitle}
      title={strings.admin.shlokaTitle}
    >
      {optionsQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : optionsQuery.error ? (
        <FieldError
          error={optionsQuery.error}
          fallback={strings.admin.loadSourcesError}
        />
      ) : optionsQuery.data.sources.length === 0 ? (
        <EmptySources />
      ) : (
        <AdminShlokaCreateForm sources={optionsQuery.data.sources} />
      )}
    </AdminShell>
  );
}

export function AdminShlokaEditPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getShloka(shlokaCode),
    queryKey: ["admin", "shlokas", shlokaCode],
  });

  useUnauthorizedRedirect(shlokaQuery.error);

  return (
    <AdminShell
      subtitle={strings.admin.editShlokaSubtitle}
      title={strings.admin.editShlokaTitle}
    >
      {shlokaQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : shlokaQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(
            shlokaQuery.error,
            strings.admin.loadShlokaError,
          )}
          title={strings.common.error}
        />
      ) : (
        <AdminShlokaEditForm
          key={shlokaQuery.data.code}
          shloka={shlokaQuery.data}
        />
      )}
    </AdminShell>
  );
}

function AdminShlokaCreateForm({
  sources,
}: {
  sources: ApiTypes.SourceOptionDto[];
}) {
  const auth = useSession();
  const form = useCreateShlokaForm(sources);
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.CreateShlokaRequest) =>
      auth.apiClient.shlokas(request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    mutation.reset();
    try {
      await form.submit(event, mutation.mutateAsync);
    } catch {
      // useMutation exposes the error state rendered by ShlokaEditorForm.
    }
  }

  return (
    <ShlokaEditorForm
      error={mutation.error}
      form={form}
      isSubmitting={mutation.isPending}
      onSubmit={handleSubmit}
      submitLabel={strings.admin.createShloka}
      successText={strings.admin.shlokaCreated}
      wasSuccessful={mutation.isSuccess}
    />
  );
}

function AdminShlokaEditForm({
  shloka,
}: {
  shloka: ApiTypes.AdminShlokaDto;
}) {
  const auth = useSession();
  const form = useEditShlokaForm(shloka);
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateShlokaRequest) =>
      auth.apiClient.updateShloka(shloka.code, request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    mutation.reset();
    try {
      await form.submit(event, mutation.mutateAsync);
    } catch {
      // useMutation exposes the error state rendered by ShlokaEditorForm.
    }
  }

  return (
    <ShlokaEditorForm
      error={mutation.error}
      form={form}
      isSubmitting={mutation.isPending}
      onSubmit={handleSubmit}
      showCanonicalWarning
      submitLabel={strings.admin.saveShloka}
      successText={strings.admin.shlokaSaved}
      wasSuccessful={mutation.isSuccess}
    />
  );
}

function EmptySources() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{strings.admin.noSources}</p>
      <Button asChild className="h-10">
        <Link to={routePaths.adminSourceNew}>
          <Plus />
          {strings.admin.createSource}
        </Link>
      </Button>
    </div>
  );
}
