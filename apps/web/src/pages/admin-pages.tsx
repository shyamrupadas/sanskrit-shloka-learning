import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/api/errors";
import { useAuth } from "@/auth/auth-context";
import { useUnauthorizedRedirect } from "@/auth/use-unauthorized-redirect";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/shared/i18n";

type SourceStructureType = ApiTypes.SourceStructureType;

interface ChapterFormState {
  code: string;
  title: string;
}

interface PartFormState {
  code: string;
  title: string;
  chapters: ChapterFormState[];
}

export function AdminSourcePage() {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [structureType, setStructureType] = useState<SourceStructureType>("none");
  const [chapters, setChapters] = useState<ChapterFormState[]>([emptyChapter()]);
  const [parts, setParts] = useState<PartFormState[]>([emptyPart()]);

  const mutation = useMutation({
    mutationFn: (request: ApiTypes.CreateSourceRequest) => auth.apiClient.sources(request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();

    await mutation.mutateAsync({
      code,
      title,
      ...(description ? { description } : {}),
      structureType,
      ...(structureType === "chapters"
        ? { chapters: chapters.map((chapter, index) => ({ ...chapter, order: index + 1 })) }
        : {}),
      ...(structureType === "parts"
        ? {
            parts: parts.map((part, partIndex) => ({
              code: part.code,
              title: part.title,
              order: partIndex + 1,
              chapters: part.chapters.map((chapter, chapterIndex) => ({
                ...chapter,
                order: chapterIndex + 1,
              })),
            })),
          }
        : {}),
    });
  }

  return (
    <AppShell title={strings.admin.sourceTitle}>
      <AdminHeader title={strings.admin.sourceTitle} subtitle={strings.admin.sourceSubtitle} />
      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FieldError error={mutation.error} fallback={strings.admin.saveError} />
            {mutation.isSuccess ? <SuccessMessage text={strings.admin.sourceCreated} /> : null}
            <TextField label={strings.admin.sourceCode} onChange={setCode} required value={code} />
            <TextField label={strings.admin.title} onChange={setTitle} required value={title} />
            <TextField label={strings.admin.description} onChange={setDescription} value={description} />
            <SelectField
              label={strings.admin.structure}
              onChange={(value) => setStructureType(value as SourceStructureType)}
              options={[
                { label: strings.admin.structureNone, value: "none" },
                { label: strings.admin.structureChapters, value: "chapters" },
                { label: strings.admin.structureParts, value: "parts" },
              ]}
              value={structureType}
            />

            {structureType === "chapters" ? (
              <ChapterFields chapters={chapters} onChange={setChapters} />
            ) : null}

            {structureType === "parts" ? (
              <PartFields parts={parts} onChange={setParts} />
            ) : null}

            <Button className="h-10 w-full sm:w-auto" disabled={mutation.isPending} type="submit">
              {strings.admin.createSource}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export function AdminShlokaPage() {
  const auth = useAuth();
  const [sourceCode, setSourceCode] = useState("");
  const [partCode, setPartCode] = useState("");
  const [chapterCode, setChapterCode] = useState("");
  const [number, setNumber] = useState("");
  const [padas, setPadas] = useState(["", "", "", ""]);
  const [fullTranslation, setFullTranslation] = useState("");

  const optionsQuery = useQuery({
    queryFn: () => auth.apiClient.getOptions(),
    queryKey: ["admin", "sources", "options"],
  });
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.CreateShlokaRequest) => auth.apiClient.shlokas(request),
  });

  useUnauthorizedRedirect(optionsQuery.error ?? mutation.error);

  const source = optionsQuery.data?.sources.find((candidate) => candidate.code === sourceCode);
  const availableChapters = useMemo(() => {
    if (!source) {
      return [];
    }
    if (source.structureType === "chapters") {
      return source.chapters;
    }
    return source.parts.find((part) => part.code === partCode)?.chapters ?? [];
  }, [partCode, source]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();

    await mutation.mutateAsync({
      sourceCode,
      ...(partCode ? { partCode } : {}),
      ...(chapterCode ? { chapterCode } : {}),
      number,
      padas: padas.map((pada) => pada.trim()).filter(Boolean),
      ...(fullTranslation ? { fullTranslation } : {}),
    });
  }

  function updateSource(nextSourceCode: string) {
    setSourceCode(nextSourceCode);
    setPartCode("");
    setChapterCode("");
  }

  return (
    <AppShell title={strings.admin.shlokaTitle}>
      <AdminHeader title={strings.admin.shlokaTitle} subtitle={strings.admin.shlokaSubtitle} />
      <Card className="rounded-lg">
        <CardContent className="pt-6">
          {optionsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{strings.common.loading}</p>
          ) : optionsQuery.error ? (
            <FieldError error={optionsQuery.error} fallback={strings.admin.loadSourcesError} />
          ) : optionsQuery.data.sources.length === 0 ? (
            <EmptySources />
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <FieldError error={mutation.error} fallback={strings.admin.saveError} />
              {mutation.isSuccess ? <SuccessMessage text={strings.admin.shlokaCreated} /> : null}
              <SelectField
                label={strings.admin.source}
                onChange={updateSource}
                options={[
                  { label: "Выберите источник", value: "" },
                  ...optionsQuery.data.sources.map((candidate) => ({
                    label: candidate.title,
                    value: candidate.code,
                  })),
                ]}
                required
                value={sourceCode}
              />

              {source?.structureType === "parts" ? (
                <SelectField
                  label={strings.admin.part}
                  onChange={(value) => {
                    setPartCode(value);
                    setChapterCode("");
                  }}
                  options={[
                    { label: "Выберите часть", value: "" },
                    ...source.parts.map((part) => ({ label: part.title, value: part.code })),
                  ]}
                  required
                  value={partCode}
                />
              ) : null}

              {source && source.structureType !== "none" ? (
                <SelectField
                  label={strings.admin.chapter}
                  onChange={setChapterCode}
                  options={[
                    { label: "Выберите главу", value: "" },
                    ...availableChapters.map((chapter) => ({
                      label: chapter.title,
                      value: chapter.code,
                    })),
                  ]}
                  required
                  value={chapterCode}
                />
              ) : null}

              <TextField label={strings.admin.shlokaNumber} onChange={setNumber} required value={number} />
              {padas.map((pada, index) => (
                <TextField
                  key={index}
                  label={`${strings.admin.pada} ${index + 1}`}
                  onChange={(value) => setPadas((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
                  required={index === 0}
                  value={pada}
                />
              ))}
              <TextField label={strings.admin.fullTranslation} onChange={setFullTranslation} value={fullTranslation} />

              <Button className="h-10 w-full sm:w-auto" disabled={mutation.isPending} type="submit">
                {strings.admin.createShloka}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function AdminHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <section className="mb-5 space-y-1">
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </section>
  );
}

function TextField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        value={value}
      />
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChapterFields({
  chapters,
  onChange,
}: {
  chapters: ChapterFormState[];
  onChange: (chapters: ChapterFormState[]) => void;
}) {
  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => (
        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2" key={index}>
          <TextField
            label={`${strings.admin.chapterCode} ${index + 1}`}
            onChange={(value) => onChange(chapters.map((item, itemIndex) => (itemIndex === index ? { ...item, code: value } : item)))}
            required
            value={chapter.code}
          />
          <TextField
            label={`${strings.admin.chapterTitle} ${index + 1}`}
            onChange={(value) => onChange(chapters.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item)))}
            required
            value={chapter.title}
          />
        </div>
      ))}
      <Button onClick={() => onChange([...chapters, emptyChapter()])} type="button" variant="outline">
        <Plus />
        {strings.admin.addChapter}
      </Button>
    </div>
  );
}

function PartFields({
  onChange,
  parts,
}: {
  onChange: (parts: PartFormState[]) => void;
  parts: PartFormState[];
}) {
  return (
    <div className="space-y-4">
      {parts.map((part, partIndex) => (
        <div className="space-y-3 rounded-lg border p-3" key={partIndex}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={`${strings.admin.partCode} ${partIndex + 1}`}
              onChange={(value) => onChange(parts.map((item, itemIndex) => (itemIndex === partIndex ? { ...item, code: value } : item)))}
              required
              value={part.code}
            />
            <TextField
              label={`${strings.admin.partTitle} ${partIndex + 1}`}
              onChange={(value) => onChange(parts.map((item, itemIndex) => (itemIndex === partIndex ? { ...item, title: value } : item)))}
              required
              value={part.title}
            />
          </div>
          <ChapterFields
            chapters={part.chapters}
            onChange={(chapters) =>
              onChange(parts.map((item, itemIndex) => (itemIndex === partIndex ? { ...item, chapters } : item)))
            }
          />
        </div>
      ))}
      <Button onClick={() => onChange([...parts, emptyPart()])} type="button" variant="outline">
        <Plus />
        {strings.admin.addPart}
      </Button>
    </div>
  );
}

function EmptySources() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{strings.admin.noSources}</p>
      <Button asChild className="h-10">
        <Link to="/admin/sources/new">
          <Plus />
          {strings.admin.createSource}
        </Link>
      </Button>
    </div>
  );
}

function FieldError({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {getApiErrorMessage(error, fallback)}
    </p>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
      {text}
    </p>
  );
}

function emptyChapter(): ChapterFormState {
  return { code: "", title: "" };
}

function emptyPart(): PartFormState {
  return {
    code: "",
    title: "",
    chapters: [emptyChapter()],
  };
}
