import type { FormEventHandler } from "react";
import { Plus } from "lucide-react";

import { AdminFormLayout } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import {
  FieldError,
  SuccessMessage,
  TextareaField,
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
    <AdminFormLayout
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
    >
      <FieldError error={error} fallback={strings.admin.saveError} />
      {wasSuccessful ? <SuccessMessage text={successText} /> : null}
      <TextField
        label={strings.admin.sourceCode}
        onChange={form.setSourceCode}
        readOnly={form.sourceCodeReadOnly}
        required
        value={form.sourceCode}
      />
      <TextField
        label={strings.admin.title}
        onChange={form.setTitle}
        required
        value={form.title}
      />
      <TextareaField
        label={strings.admin.description}
        onChange={form.setDescription}
        value={form.description}
      />
      <StructureField form={form} />

      {form.structureType === "chapters" ? (
        <ChapterFields
          chapters={form.chapters}
          isCodeReadOnly={form.isRootChapterCodeReadOnly}
          onAdd={form.addRootChapter}
          onChange={form.updateRootChapter}
        />
      ) : null}

      {form.structureType === "parts" ? <PartFields form={form} /> : null}
    </AdminFormLayout>
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
    <div className="min-w-0 space-y-2">
      <Label className="font-semibold">{strings.admin.structure}</Label>
      <Tabs
        onValueChange={(value) =>
          form.setStructureType(value as SourceStructureType)
        }
        value={form.structureType}
      >
        <TabsList
          aria-label={strings.admin.structure}
          className="h-[var(--component-tab-height)] w-full rounded-full bg-muted p-1"
        >
          {structureTabs.map((tab) => (
            <TabsTrigger
              className="min-w-0 rounded-full px-1 text-[length:var(--font-size-caption)] font-semibold text-muted-foreground data-active:bg-card data-active:font-bold data-active:text-foreground data-active:shadow-[var(--shadow-low)]"
              key={tab.value}
              value={tab.value}
            >
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
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
    <section className="min-w-0 space-y-[var(--component-admin-form-field-gap)]">
      <h2 className="font-heading text-[length:var(--font-size-card-title)] leading-[var(--line-height-title)] font-bold">
        {strings.admin.chaptersHeading}
      </h2>
      <div className="space-y-[var(--component-admin-form-field-gap)]">
        {chapters.map((chapter, index) => (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2" key={index}>
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
      </div>
      <Button
        className="h-[var(--button-height)] w-full px-4 text-[length:var(--button-font-size)]"
        onClick={onAdd}
        type="button"
        variant="outline"
      >
        <Plus />
        {strings.admin.addChapter}
      </Button>
    </section>
  );
}

function PartFields<TRequest>({
  form,
}: {
  form: SourceEditorFormModel<TRequest>;
}) {
  return (
    <section className="min-w-0 space-y-[var(--component-admin-form-field-gap)]">
      <h2 className="font-heading text-[length:var(--font-size-card-title)] leading-[var(--line-height-title)] font-bold">
        {strings.admin.partsHeading}
      </h2>
      <div className="space-y-[var(--component-admin-form-section-gap)]">
        {form.parts.map((part, partIndex) => (
          <section
            aria-label={`${strings.admin.part} ${partIndex + 1}`}
            className="min-w-0 space-y-[var(--component-admin-form-field-gap)] border-t border-border pt-[var(--component-admin-form-field-gap)] first:border-t-0 first:pt-0"
            key={partIndex}
          >
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
            <div className="min-w-0 border-l border-border pl-[var(--component-admin-form-nested-inset)]">
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
          </section>
        ))}
      </div>
      <Button
        className="h-[var(--button-height)] w-full px-4 text-[length:var(--button-font-size)]"
        onClick={form.addPart}
        type="button"
        variant="outline"
      >
        <Plus />
        {strings.admin.addPart}
      </Button>
    </section>
  );
}

const structureTabs = [
  { label: strings.admin.structureNoneTab, value: "none" },
  { label: strings.admin.structureChaptersTab, value: "chapters" },
  { label: strings.admin.structurePartsTab, value: "parts" },
] as const satisfies readonly {
  label: string;
  value: SourceStructureType;
}[];

function structureLabel(structureType: SourceStructureType): string {
  if (structureType === "chapters") {
    return strings.admin.structureChapters;
  }
  if (structureType === "parts") {
    return strings.admin.structureParts;
  }
  return strings.admin.structureNone;
}
