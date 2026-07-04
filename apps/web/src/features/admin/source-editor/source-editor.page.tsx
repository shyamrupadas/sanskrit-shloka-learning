import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { strings } from "@/shared/i18n";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";

import { AdminHeader, AdminShell, StatusCard } from "../ui/admin-page";
import {
  useCreateSourceForm,
  useEditSourceForm,
} from "./model/source-form";
import { SourceEditorForm } from "./ui/source-editor-form";

export function AdminSourcePage() {
  const auth = useSession();
  const form = useCreateSourceForm();
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.CreateSourceRequest) =>
      auth.apiClient.sources(request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    mutation.reset();
    try {
      await form.submit(event, mutation.mutateAsync);
    } catch {
      // useMutation exposes the error state rendered by SourceEditorForm.
    }
  }

  return (
    <AdminShell>
      <AdminHeader
        title={strings.admin.sourceTitle}
        subtitle={strings.admin.sourceSubtitle}
      />
      <SourceEditorForm
        error={mutation.error}
        form={form}
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
        submitLabel={strings.admin.createSource}
        successText={strings.admin.sourceCreated}
        wasSuccessful={mutation.isSuccess}
      />
    </AdminShell>
  );
}

export function AdminSourceEditPage({ sourceCode }: { sourceCode: string }) {
  const auth = useSession();
  const sourceQuery = useQuery({
    queryFn: () => auth.apiClient.getSource(sourceCode),
    queryKey: ["admin", "sources", sourceCode],
  });
  useUnauthorizedRedirect(sourceQuery.error);

  return (
    <AdminShell>
      <AdminHeader
        title={strings.admin.editSourceTitle}
        subtitle={strings.admin.editSourceSubtitle}
      />
      {sourceQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : sourceQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(
            sourceQuery.error,
            strings.admin.loadSourceError,
          )}
          title={strings.common.error}
        />
      ) : (
        <AdminSourceEditForm
          key={sourceQuery.data.code}
          source={sourceQuery.data}
        />
      )}
    </AdminShell>
  );
}

function AdminSourceEditForm({ source }: { source: ApiTypes.AdminSourceDto }) {
  const auth = useSession();
  const form = useEditSourceForm(source);
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateSourceRequest) =>
      auth.apiClient.updateSource(source.code, request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    mutation.reset();
    try {
      await form.submit(event, mutation.mutateAsync);
    } catch {
      // useMutation exposes the error state rendered by SourceEditorForm.
    }
  }

  return (
    <SourceEditorForm
      error={mutation.error}
      form={form}
      isSubmitting={mutation.isPending}
      onSubmit={handleSubmit}
      submitLabel={strings.admin.saveSource}
      successText={strings.admin.sourceSaved}
      wasSuccessful={mutation.isSuccess}
    />
  );
}
