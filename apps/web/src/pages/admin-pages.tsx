import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, TriangleAlert } from "lucide-react";
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

export function AdminPage() {
  const auth = useAuth();
  const catalogQuery = useQuery({
    queryFn: () => auth.apiClient.getCatalog(),
    queryKey: ["admin", "catalog"],
  });

  useUnauthorizedRedirect(catalogQuery.error);

  return (
    <AppShell title={strings.admin.adminTitle}>
      <AdminHeader title={strings.admin.adminTitle} subtitle={strings.admin.adminSubtitle} />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-10">
          <Link to="/admin/shlokas/new">
            <Plus />
            {strings.admin.newShloka}
          </Link>
        </Button>
        <Button asChild className="h-10" variant="outline">
          <Link to="/admin/sources/new">
            <Plus />
            {strings.admin.newSource}
          </Link>
        </Button>
      </div>

      {catalogQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : catalogQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(catalogQuery.error, strings.admin.loadCatalogError)}
          title={strings.common.error}
        />
      ) : (
        <section className="space-y-4">
          {catalogQuery.data.sources.map((source) => (
            <AdminSourceSection key={source.code} source={source} />
          ))}
        </section>
      )}
    </AppShell>
  );
}

export function AdminSourceEditPage({ sourceCode }: { sourceCode: string }) {
  const auth = useAuth();
  const sourceQuery = useQuery({
    queryFn: () => auth.apiClient.getSource(sourceCode),
    queryKey: ["admin", "sources", sourceCode],
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState<ChapterFormState[]>([]);
  const [parts, setParts] = useState<PartFormState[]>([]);

  const mutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateSourceRequest) => auth.apiClient.updateSource(sourceCode, request),
  });

  useUnauthorizedRedirect(sourceQuery.error ?? mutation.error);

  useEffect(() => {
    if (!sourceQuery.data) {
      return;
    }

    setTitle(sourceQuery.data.title);
    setDescription(sourceQuery.data.description ?? "");
    setChapters(sourceQuery.data.chapters.map(({ code, title: chapterTitle }) => ({ code, title: chapterTitle })));
    setParts(
      sourceQuery.data.parts.map((part) => ({
        code: part.code,
        title: part.title,
        chapters: part.chapters.map((chapter) => ({ code: chapter.code, title: chapter.title })),
      })),
    );
  }, [sourceQuery.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();

    await mutation.mutateAsync({
      title,
      ...(description ? { description } : {}),
      ...(sourceQuery.data?.structureType === "chapters"
        ? { chapters: chapters.map((chapter, index) => ({ ...chapter, order: index + 1 })) }
        : {}),
      ...(sourceQuery.data?.structureType === "parts"
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
    <AppShell title={strings.admin.editSourceTitle}>
      <AdminBackLink />
      <AdminHeader title={strings.admin.editSourceTitle} subtitle={strings.admin.editSourceSubtitle} />
      {sourceQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : sourceQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(sourceQuery.error, strings.admin.loadSourceError)}
          title={strings.common.error}
        />
      ) : (
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <FieldError error={mutation.error} fallback={strings.admin.saveError} />
              {mutation.isSuccess ? <SuccessMessage text={strings.admin.sourceSaved} /> : null}
              <TextField label={strings.admin.sourceCode} onChange={() => undefined} readOnly value={sourceQuery.data.code} />
              <TextField label={strings.admin.structure} onChange={() => undefined} readOnly value={structureLabel(sourceQuery.data.structureType)} />
              <TextField label={strings.admin.title} onChange={setTitle} required value={title} />
              <TextField label={strings.admin.description} onChange={setDescription} value={description} />

              {sourceQuery.data.structureType === "chapters" ? (
                <ChapterFields chapters={chapters} existingCodes={sourceQuery.data.chapters.map((chapter) => chapter.code)} onChange={setChapters} />
              ) : null}

              {sourceQuery.data.structureType === "parts" ? (
                <PartFields
                  existingChapterCodes={Object.fromEntries(
                    sourceQuery.data.parts.map((part) => [part.code, part.chapters.map((chapter) => chapter.code)]),
                  )}
                  existingPartCodes={sourceQuery.data.parts.map((part) => part.code)}
                  onChange={setParts}
                  parts={parts}
                />
              ) : null}

              <Button className="h-10 w-full sm:w-auto" disabled={mutation.isPending} type="submit">
                {strings.admin.saveSource}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

export function AdminShlokaEditPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useAuth();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getShloka(shlokaCode),
    queryKey: ["admin", "shlokas", shlokaCode],
  });
  const [padas, setPadas] = useState(["", "", "", ""]);
  const [fullTranslation, setFullTranslation] = useState("");

  const mutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateShlokaRequest) => auth.apiClient.updateShloka(shlokaCode, request),
  });

  useUnauthorizedRedirect(shlokaQuery.error ?? mutation.error);

  useEffect(() => {
    if (!shlokaQuery.data) {
      return;
    }

    setPadas([...shlokaQuery.data.padas, "", "", "", ""].slice(0, 4));
    setFullTranslation(shlokaQuery.data.fullTranslation ?? "");
  }, [shlokaQuery.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();

    await mutation.mutateAsync({
      padas: padas.map((pada) => pada.trim()).filter(Boolean),
      ...(fullTranslation ? { fullTranslation } : {}),
    });
  }

  return (
    <AppShell title={strings.admin.editShlokaTitle}>
      <AdminBackLink />
      <AdminHeader title={strings.admin.editShlokaTitle} subtitle={strings.admin.editShlokaSubtitle} />
      {shlokaQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : shlokaQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(shlokaQuery.error, strings.admin.loadShlokaError)}
          title={strings.common.error}
        />
      ) : (
        <Card className="rounded-lg">
          <CardContent className="space-y-5 pt-6">
            <WarningMessage text={strings.admin.canonicalTextWarning} />
            <form className="space-y-5" onSubmit={handleSubmit}>
              <FieldError error={mutation.error} fallback={strings.admin.saveError} />
              {mutation.isSuccess ? <SuccessMessage text={strings.admin.shlokaSaved} /> : null}
              <TextField label={strings.admin.shlokaCode} onChange={() => undefined} readOnly value={shlokaQuery.data.code} />
              <TextField label={strings.admin.source} onChange={() => undefined} readOnly value={shlokaQuery.data.sourceTitle} />
              {shlokaQuery.data.partTitle ? (
                <TextField label={strings.admin.part} onChange={() => undefined} readOnly value={shlokaQuery.data.partTitle} />
              ) : null}
              {shlokaQuery.data.chapterTitle ? (
                <TextField label={strings.admin.chapter} onChange={() => undefined} readOnly value={shlokaQuery.data.chapterTitle} />
              ) : null}
              <TextField label={strings.admin.shlokaNumber} onChange={() => undefined} readOnly value={shlokaQuery.data.number} />
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
                {strings.admin.saveShloka}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
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
      <AdminBackLink />
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
      <AdminBackLink />
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

function AdminBackLink() {
  return (
    <Button asChild className="mb-4 w-fit" size="sm" variant="ghost">
      <Link to="/admin">
        <ArrowLeft />
        {strings.admin.backToAdmin}
      </Link>
    </Button>
  );
}

function AdminSourceSection({ source }: { source: ApiTypes.AdminCatalogSourceDto }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words">{source.title}</CardTitle>
            <CardDescription>
              {source.code} · {sourceCaption(source)}
            </CardDescription>
          </div>
          <Button asChild aria-label={`${strings.admin.editSource} ${source.title}`} size="icon-sm" variant="ghost">
            <Link params={{ sourceCode: source.code }} to="/admin/sources/$sourceCode/edit">
              <Pencil />
            </Link>
          </Button>
        </div>
      </CardHeader>
      {source.shlokas.length > 0 ? (
        <CardContent>
          <div className="divide-y rounded-lg border">
            {source.shlokas.map((shloka) => (
              <div className="flex items-start justify-between gap-3 px-3 py-3" key={shloka.code}>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{shlokaLocation(source, shloka)}</p>
                  <p className="break-words text-sm leading-6 text-muted-foreground">{shlokaExcerpt(shloka.text)}</p>
                </div>
                <Button asChild aria-label={`${strings.admin.editShloka} ${shloka.number}`} size="icon-sm" variant="ghost">
                  <Link params={{ shlokaCode: shloka.code }} to="/admin/shlokas/$shlokaCode/edit">
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
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}

function WarningMessage({ text }: { text: string }) {
  return (
    <p className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm leading-6 text-primary">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

function sourceCaption(source: ApiTypes.AdminCatalogSourceDto): string {
  if (source.structureType === "chapters") {
    return formatRuCount(source.chapters.length, "глава", "главы", "глав");
  }
  if (source.structureType === "parts") {
    return formatRuCount(source.parts.length, "часть", "части", "частей");
  }
  return formatRuCount(source.shlokas.length, "шлока", "шлоки", "шлок");
}

function shlokaLocation(
  source: ApiTypes.AdminCatalogSourceDto,
  shloka: ApiTypes.AdminCatalogShlokaDto,
): string {
  if (source.structureType === "parts") {
    const part = source.parts.find((candidate) => candidate.code === shloka.partCode);
    const chapter = part?.chapters.find((candidate) => candidate.code === shloka.chapterCode);
    return [part?.title, chapter?.title, shloka.number].filter(Boolean).join(" · ");
  }
  if (source.structureType === "chapters") {
    const chapter = source.chapters.find((candidate) => candidate.code === shloka.chapterCode);
    return [chapter?.title, shloka.number].filter(Boolean).join(" · ");
  }
  return shloka.number;
}

function shlokaExcerpt(text: string): string {
  const excerpt = text.replaceAll(/\s+/g, " ").trim();
  return excerpt.length > 96 ? `${excerpt.slice(0, 93)}...` : excerpt;
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

function formatRuCount(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;

  return `${count} ${word}`;
}

function TextField({
  label,
  onChange,
  readOnly,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
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
        readOnly={readOnly}
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
  existingCodes = [],
  onChange,
}: {
  chapters: ChapterFormState[];
  existingCodes?: string[];
  onChange: (chapters: ChapterFormState[]) => void;
}) {
  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => (
        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2" key={index}>
          <TextField
            label={`${strings.admin.chapterCode} ${index + 1}`}
            onChange={(value) => onChange(chapters.map((item, itemIndex) => (itemIndex === index ? { ...item, code: value } : item)))}
            readOnly={existingCodes.includes(chapter.code)}
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
  existingChapterCodes = {},
  existingPartCodes = [],
  onChange,
  parts,
}: {
  existingChapterCodes?: Record<string, string[]>;
  existingPartCodes?: string[];
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
              readOnly={existingPartCodes.includes(part.code)}
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
            existingCodes={existingChapterCodes[part.code] ?? []}
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
