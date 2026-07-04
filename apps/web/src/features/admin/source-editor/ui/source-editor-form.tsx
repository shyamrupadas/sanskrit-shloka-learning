import type { FormEventHandler } from "react";
import { Plus } from "lucide-react";

import { strings } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";

import {
  AdminFormCard,
  FieldError,
  SelectField,
  SuccessMessage,
  TextField,
} from "../../ui/admin-page";
import type {
  ChapterFormState,
  SourceEditorForm as SourceEditorFormModel,
  SourceStructureType,
} from "../model/source-form";

interface SourceEditorFormProps<TRequest> {
  error: unknown;
  form: SourceEditorFormModel<TRequest>;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
  successText: string;
  wasSuccessful: boolean;
}

export function SourceEditorForm<TRequest>({
  error,
  form,
  isSubmitting,
  onSubmit,
  submitLabel,
  successText,
  wasSuccessful,
}: SourceEditorFormProps<TRequest>) {
  return (
    <AdminFormCard>
      <form className="space-y-5" onSubmit={onSubmit}>
        <FieldError error={error} fallback={strings.admin.saveError} />
        {wasSuccessful ? <SuccessMessage text={successText} /> : null}
        <TextField
          label={strings.admin.sourceCode}
          onChange={form.setSourceCode}
          readOnly={form.sourceCodeReadOnly}
          required
          value={form.sourceCode}
        />
        <StructureField form={form} />
        <TextField
          label={strings.admin.title}
          onChange={form.setTitle}
          required
          value={form.title}
        />
        <TextField
          label={strings.admin.description}
          onChange={form.setDescription}
          value={form.description}
        />

        {form.structureType === "chapters" ? (
          <ChapterFields
            chapters={form.chapters}
            isCodeReadOnly={form.isRootChapterCodeReadOnly}
            onAdd={form.addRootChapter}
            onChange={form.updateRootChapter}
          />
        ) : null}

        {form.structureType === "parts" ? <PartFields form={form} /> : null}

        <Button className="h-10 w-full sm:w-auto" disabled={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </form>
    </AdminFormCard>
  );
}

function StructureField<TRequest>({
  form,
}: {
  form: SourceEditorFormModel<TRequest>;
}) {
  if (form.structureTypeReadOnly) {
    return (
      <TextField
        label={strings.admin.structure}
        onChange={() => undefined}
        readOnly
        value={structureLabel(form.structureType)}
      />
    );
  }

  return (
    <SelectField
      label={strings.admin.structure}
      onChange={(value) => form.setStructureType(value as SourceStructureType)}
      options={[
        { label: strings.admin.structureNone, value: "none" },
        { label: strings.admin.structureChapters, value: "chapters" },
        { label: strings.admin.structureParts, value: "parts" },
      ]}
      value={form.structureType}
    />
  );
}

function ChapterFields({
  chapters,
  isCodeReadOnly,
  onAdd,
  onChange,
}: {
  chapters: ChapterFormState[];
  isCodeReadOnly: (chapter: ChapterFormState) => boolean;
  onAdd: () => void;
  onChange: (chapterIndex: number, patch: Partial<ChapterFormState>) => void;
}) {
  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => (
        <div
          className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
          key={index}
        >
          <TextField
            label={`${strings.admin.chapterCode} ${index + 1}`}
            onChange={(code) => onChange(index, { code })}
            readOnly={isCodeReadOnly(chapter)}
            required
            value={chapter.code}
          />
          <TextField
            label={`${strings.admin.chapterTitle} ${index + 1}`}
            onChange={(title) => onChange(index, { title })}
            required
            value={chapter.title}
          />
        </div>
      ))}
      <Button onClick={onAdd} type="button" variant="outline">
        <Plus />
        {strings.admin.addChapter}
      </Button>
    </div>
  );
}

function PartFields<TRequest>({
  form,
}: {
  form: SourceEditorFormModel<TRequest>;
}) {
  return (
    <div className="space-y-4">
      {form.parts.map((part, partIndex) => (
        <div className="space-y-3 rounded-lg border p-3" key={partIndex}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={`${strings.admin.partCode} ${partIndex + 1}`}
              onChange={(code) => form.updatePart(partIndex, { code })}
              readOnly={form.isPartCodeReadOnly(part)}
              required
              value={part.code}
            />
            <TextField
              label={`${strings.admin.partTitle} ${partIndex + 1}`}
              onChange={(title) => form.updatePart(partIndex, { title })}
              required
              value={part.title}
            />
          </div>
          <ChapterFields
            chapters={part.chapters}
            isCodeReadOnly={(chapter) =>
              form.isPartChapterCodeReadOnly(part, chapter)
            }
            onAdd={() => form.addPartChapter(partIndex)}
            onChange={(chapterIndex, patch) =>
              form.updatePartChapter(partIndex, chapterIndex, patch)
            }
          />
        </div>
      ))}
      <Button onClick={form.addPart} type="button" variant="outline">
        <Plus />
        {strings.admin.addPart}
      </Button>
    </div>
  );
}

function structureLabel(structureType: SourceStructureType): string {
  if (structureType === "chapters") {
    return strings.admin.structureChapters;
  }
  if (structureType === "parts") {
    return strings.admin.structureParts;
  }
  return strings.admin.structureNone;
}
