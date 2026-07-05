import type { FormEventHandler } from "react";

import { strings } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

import {
  AdminFormCard,
  FieldError,
  LocalError,
  SelectField,
  SuccessMessage,
  TextareaField,
  TextField,
  WarningMessage,
} from "../../ui/admin-page";
import type { ShlokaEditorForm as ShlokaEditorFormModel } from "../model/shloka-form";

interface ShlokaEditorFormProps<TRequest> {
  error: unknown;
  form: ShlokaEditorFormModel<TRequest>;
  fullTranslationField: "input" | "textarea";
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  showCanonicalWarning?: boolean;
  submitLabel: string;
  successText: string;
  wasSuccessful: boolean;
}

export function ShlokaEditorForm<TRequest>({
  error,
  form,
  fullTranslationField,
  isSubmitting,
  onSubmit,
  showCanonicalWarning = false,
  submitLabel,
  successText,
  wasSuccessful,
}: ShlokaEditorFormProps<TRequest>) {
  return (
    <AdminFormCard>
      <form className="space-y-5" noValidate onSubmit={onSubmit}>
        {showCanonicalWarning ? (
          <WarningMessage text={strings.admin.canonicalTextWarning} />
        ) : null}
        <LocalError error={form.validationError} />
        <FieldError error={error} fallback={strings.admin.saveError} />
        {wasSuccessful ? <SuccessMessage text={successText} /> : null}
        <ReferenceFields form={form} />
        <PadaFields form={form} />
        {fullTranslationField === "textarea" ? (
          <TextareaField
            label={strings.admin.fullTranslation}
            onChange={form.setFullTranslation}
            value={form.fullTranslation}
          />
        ) : (
          <TextField
            label={strings.admin.fullTranslation}
            onChange={form.setFullTranslation}
            value={form.fullTranslation}
          />
        )}

        <Button className="h-10 w-full sm:w-auto" disabled={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </form>
    </AdminFormCard>
  );
}

function ReferenceFields<TRequest>({
  form,
}: {
  form: ShlokaEditorFormModel<TRequest>;
}) {
  if (form.referenceFields.length > 0) {
    return (
      <>
        {form.referenceFields.map((field) => (
          <TextField
            key={field.label}
            label={field.label}
            onChange={() => undefined}
            readOnly
            value={field.value}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <SelectField
        label={strings.admin.source}
        onChange={form.setSourceCode}
        options={[
          { label: "Выберите источник", value: "" },
          ...form.sourceOptions.map((source) => ({
            label: source.title,
            value: source.code,
          })),
        ]}
        required
        value={form.sourceCode}
      />

      {form.shouldShowPartField ? (
        <SelectField
          label={strings.admin.part}
          onChange={form.setPartCode}
          options={[
            { label: "Выберите часть", value: "" },
            ...form.partOptions.map((part) => ({
              label: part.title,
              value: part.code,
            })),
          ]}
          required
          value={form.partCode}
        />
      ) : null}

      {form.shouldShowChapterField ? (
        <SelectField
          label={strings.admin.chapter}
          onChange={form.setChapterCode}
          options={[
            { label: "Выберите главу", value: "" },
            ...form.availableChapters.map((chapter) => ({
              label: chapter.title,
              value: chapter.code,
            })),
          ]}
          required
          value={form.chapterCode}
        />
      ) : null}

      <TextField
        label={strings.admin.shlokaNumber}
        onChange={form.setNumber}
        required
        value={form.number}
      />
    </>
  );
}

function PadaFields<TRequest>({
  form,
}: {
  form: ShlokaEditorFormModel<TRequest>;
}) {
  return (
    <>
      {form.padas.map((pada, index) => (
        <TextField
          key={index}
          label={`${strings.admin.pada} ${index + 1}`}
          onChange={(value) => form.updatePada(index, value)}
          required
          value={pada}
        />
      ))}
    </>
  );
}
