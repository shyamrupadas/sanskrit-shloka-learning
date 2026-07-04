import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, TriangleAlert } from "lucide-react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/shared/api/errors";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";

const shlokaPadaCount = 4;

export function AdminShlokaEditPage({ shlokaCode }: { shlokaCode: string }) {
  const auth = useSession();
  const shlokaQuery = useQuery({
    queryFn: () => auth.apiClient.getShloka(shlokaCode),
    queryKey: ["admin", "shlokas", shlokaCode],
  });
  useUnauthorizedRedirect(shlokaQuery.error);

  return (
    <AdminShell>
      <AdminHeader title={strings.admin.editShlokaTitle} subtitle={strings.admin.editShlokaSubtitle} />
      {shlokaQuery.isPending ? (
        <StatusCard title={strings.common.loading} />
      ) : shlokaQuery.error ? (
        <StatusCard
          description={getApiErrorMessage(shlokaQuery.error, strings.admin.loadShlokaError)}
          title={strings.common.error}
        />
      ) : (
        <AdminShlokaEditForm key={shlokaQuery.data.code} shloka={shlokaQuery.data} />
      )}
    </AdminShell>
  );
}

function AdminShlokaEditForm({ shloka }: { shloka: ApiTypes.AdminShlokaDto }) {
  const auth = useSession();
  const [padas, setPadas] = useState(() => toShlokaPadaFields(shloka.padas));
  const [fullTranslation, setFullTranslation] = useState(
    shloka.fullTranslation ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (request: ApiTypes.UpdateShlokaRequest) =>
      auth.apiClient.updateShloka(shloka.code, request),
  });

  useUnauthorizedRedirect(mutation.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();
    setFormError(null);

    const normalizedPadas = normalizeShlokaPadas(padas);
    if (!hasCompleteShlokaPadas(normalizedPadas)) {
      setFormError(strings.admin.shlokaPadasRequired);
      return;
    }
    if (!event.currentTarget.reportValidity()) {
      return;
    }

    await mutation.mutateAsync({
      padas: normalizedPadas,
      ...(fullTranslation ? { fullTranslation } : {}),
    });
  }

  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-5 pt-6">
        <WarningMessage text={strings.admin.canonicalTextWarning} />
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <LocalError error={formError} />
          <FieldError error={mutation.error} fallback={strings.admin.saveError} />
          {mutation.isSuccess ? <SuccessMessage text={strings.admin.shlokaSaved} /> : null}
          <TextField label={strings.admin.shlokaCode} onChange={() => undefined} readOnly value={shloka.code} />
          <TextField label={strings.admin.source} onChange={() => undefined} readOnly value={shloka.sourceTitle} />
          {shloka.partTitle ? (
            <TextField label={strings.admin.part} onChange={() => undefined} readOnly value={shloka.partTitle} />
          ) : null}
          {shloka.chapterTitle ? (
            <TextField label={strings.admin.chapter} onChange={() => undefined} readOnly value={shloka.chapterTitle} />
          ) : null}
          <TextField label={strings.admin.shlokaNumber} onChange={() => undefined} readOnly value={shloka.number} />
          {padas.map((pada, index) => (
            <TextField
              key={index}
              label={`${strings.admin.pada} ${index + 1}`}
              onChange={(value) => setPadas((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
              required
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
  );
}

export function AdminShlokaPage() {
  const auth = useSession();
  const [sourceCode, setSourceCode] = useState("");
  const [partCode, setPartCode] = useState("");
  const [chapterCode, setChapterCode] = useState("");
  const [number, setNumber] = useState("");
  const [padas, setPadas] = useState(emptyShlokaPadas);
  const [fullTranslation, setFullTranslation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);

    const normalizedPadas = normalizeShlokaPadas(padas);
    if (!hasCompleteShlokaPadas(normalizedPadas)) {
      setFormError(strings.admin.shlokaPadasRequired);
      return;
    }
    if (!event.currentTarget.reportValidity()) {
      return;
    }

    await mutation.mutateAsync({
      sourceCode,
      ...(partCode ? { partCode } : {}),
      ...(chapterCode ? { chapterCode } : {}),
      number,
      padas: normalizedPadas,
      ...(fullTranslation ? { fullTranslation } : {}),
    });
  }

  function updateSource(nextSourceCode: string) {
    setSourceCode(nextSourceCode);
    setPartCode("");
    setChapterCode("");
  }

  return (
    <AdminShell>
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
            <form className="space-y-5" noValidate onSubmit={handleSubmit}>
              <LocalError error={formError} />
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
                  required
                  value={pada}
                />
              ))}
              <TextareaField label={strings.admin.fullTranslation} onChange={setFullTranslation} value={fullTranslation} />

              <Button className="h-10 w-full sm:w-auto" disabled={mutation.isPending} type="submit">
                {strings.admin.createShloka}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}

function AdminShell({
  backTo = routePaths.admin,
  children,
}: {
  backTo?: typeof routePaths.admin | typeof routePaths.settings;
  children: ReactNode;
}) {
  return (
    <>
      <AdminBackLink to={backTo} />
      {children}
    </>
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

function AdminBackLink({
  to,
}: {
  to: typeof routePaths.admin | typeof routePaths.settings;
}) {
  return (
    <Button asChild className="mb-4 size-12" size="icon-lg" variant="ghost">
      <Link aria-label={strings.common.back} to={to}>
        <ArrowLeft className="size-6" />
      </Link>
    </Button>
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

function emptyShlokaPadas(): string[] {
  return Array.from({ length: shlokaPadaCount }, () => "");
}

function toShlokaPadaFields(padas: string[]): string[] {
  return [...padas, ...emptyShlokaPadas()].slice(0, shlokaPadaCount);
}

function normalizeShlokaPadas(padas: string[]): string[] {
  return toShlokaPadaFields(padas).map((pada) => pada.trim());
}

function hasCompleteShlokaPadas(padas: string[]): boolean {
  return padas.length === shlokaPadaCount && padas.every(Boolean);
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

function TextareaField({
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
      <Textarea
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

function LocalError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {error}
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
