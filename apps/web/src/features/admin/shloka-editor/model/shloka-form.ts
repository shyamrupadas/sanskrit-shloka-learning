import { useMemo, useState, type FormEvent } from "react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { strings } from "@/shared/i18n";

const shlokaPadaCount = 4;

export interface ReferenceField {
  label: string;
  value: string;
}

export interface ShlokaEditorForm<TRequest> {
  availableChapters: ApiTypes.SourceChapterOptionDto[];
  chapterCode: string;
  fullTranslation: string;
  number: string;
  padas: string[];
  partCode: string;
  partOptions: ApiTypes.SourcePartOptionDto[];
  referenceFields: ReferenceField[];
  setChapterCode: (chapterCode: string) => void;
  setFullTranslation: (fullTranslation: string) => void;
  setNumber: (number: string) => void;
  setPartCode: (partCode: string) => void;
  setSourceCode: (sourceCode: string) => void;
  shouldShowChapterField: boolean;
  shouldShowPartField: boolean;
  sourceCode: string;
  sourceOptions: ApiTypes.SourceOptionDto[];
  submit: (
    event: FormEvent<HTMLFormElement>,
    save: (request: TRequest) => Promise<unknown>,
  ) => Promise<void>;
  updatePada: (index: number, value: string) => void;
  validationError: string | null;
}

interface ShlokaFormState {
  chapterCode: string;
  fullTranslation: string;
  number: string;
  padas: string[];
  partCode: string;
  sourceCode: string;
}

interface ShlokaFormConfig<TRequest> {
  buildRequest: (
    state: ShlokaFormState,
    normalizedPadas: string[],
  ) => TRequest;
  initialState: ShlokaFormState;
  referenceFields?: ReferenceField[];
  sourceOptions?: ApiTypes.SourceOptionDto[];
}

export function useCreateShlokaForm(
  sourceOptions: ApiTypes.SourceOptionDto[],
): ShlokaEditorForm<ApiTypes.CreateShlokaRequest> {
  return useShlokaForm({
    buildRequest: buildCreateShlokaRequest,
    initialState: {
      chapterCode: "",
      fullTranslation: "",
      number: "",
      padas: emptyShlokaPadas(),
      partCode: "",
      sourceCode: "",
    },
    sourceOptions,
  });
}

export function useEditShlokaForm(
  shloka: ApiTypes.AdminShlokaDto,
): ShlokaEditorForm<ApiTypes.UpdateShlokaRequest> {
  return useShlokaForm({
    buildRequest: buildUpdateShlokaRequest,
    initialState: {
      chapterCode: shloka.chapterCode ?? "",
      fullTranslation: shloka.fullTranslation ?? "",
      number: shloka.number,
      padas: toShlokaPadaFields(shloka.padas),
      partCode: shloka.partCode ?? "",
      sourceCode: shloka.sourceCode,
    },
    referenceFields: toReferenceFields(shloka),
  });
}

function useShlokaForm<TRequest>({
  buildRequest,
  initialState,
  referenceFields = [],
  sourceOptions = [],
}: ShlokaFormConfig<TRequest>): ShlokaEditorForm<TRequest> {
  const [sourceCode, setSourceCodeState] = useState(initialState.sourceCode);
  const [partCode, setPartCodeState] = useState(initialState.partCode);
  const [chapterCode, setChapterCode] = useState(initialState.chapterCode);
  const [number, setNumber] = useState(initialState.number);
  const [padas, setPadas] = useState(initialState.padas);
  const [fullTranslation, setFullTranslation] = useState(
    initialState.fullTranslation,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const source = sourceOptions.find(
    (candidate) => candidate.code === sourceCode,
  );
  const partOptions = source?.parts ?? [];
  const availableChapters = useMemo(() => {
    if (!source) {
      return [];
    }
    if (source.structureType === "chapters") {
      return source.chapters;
    }
    return source.parts.find((part) => part.code === partCode)?.chapters ?? [];
  }, [partCode, source]);

  const state: ShlokaFormState = {
    chapterCode,
    fullTranslation,
    number,
    padas,
    partCode,
    sourceCode,
  };

  async function submit(
    event: FormEvent<HTMLFormElement>,
    save: (request: TRequest) => Promise<unknown>,
  ) {
    event.preventDefault();
    setValidationError(null);

    const normalizedPadas = normalizeShlokaPadas(padas);
    if (!hasCompleteShlokaPadas(normalizedPadas)) {
      setValidationError(strings.admin.shlokaPadasRequired);
      return;
    }
    if (!event.currentTarget.reportValidity()) {
      return;
    }

    await save(buildRequest(state, normalizedPadas));
  }

  return {
    availableChapters,
    chapterCode,
    fullTranslation,
    number,
    padas,
    partCode,
    partOptions,
    referenceFields,
    setChapterCode,
    setFullTranslation,
    setNumber,
    setPartCode: (nextPartCode) => {
      setPartCodeState(nextPartCode);
      setChapterCode("");
    },
    setSourceCode: (nextSourceCode) => {
      setSourceCodeState(nextSourceCode);
      setPartCodeState("");
      setChapterCode("");
    },
    shouldShowChapterField: Boolean(source && source.structureType !== "none"),
    shouldShowPartField: source?.structureType === "parts",
    sourceCode,
    sourceOptions,
    submit,
    updatePada: (index, value) =>
      setPadas((current) =>
        current.map((pada, itemIndex) =>
          itemIndex === index ? value : pada,
        ),
      ),
    validationError,
  };
}

function buildCreateShlokaRequest(
  {
    chapterCode,
    fullTranslation,
    number,
    partCode,
    sourceCode,
  }: ShlokaFormState,
  normalizedPadas: string[],
): ApiTypes.CreateShlokaRequest {
  return {
    sourceCode,
    ...(partCode ? { partCode } : {}),
    ...(chapterCode ? { chapterCode } : {}),
    number,
    padas: normalizedPadas,
    ...(fullTranslation ? { fullTranslation } : {}),
  };
}

function buildUpdateShlokaRequest(
  { fullTranslation }: ShlokaFormState,
  normalizedPadas: string[],
): ApiTypes.UpdateShlokaRequest {
  return {
    padas: normalizedPadas,
    ...(fullTranslation ? { fullTranslation } : {}),
  };
}

function toReferenceFields(shloka: ApiTypes.AdminShlokaDto): ReferenceField[] {
  return [
    { label: strings.admin.shlokaCode, value: shloka.code },
    { label: strings.admin.source, value: shloka.sourceTitle },
    ...(shloka.partTitle
      ? [{ label: strings.admin.part, value: shloka.partTitle }]
      : []),
    ...(shloka.chapterTitle
      ? [{ label: strings.admin.chapter, value: shloka.chapterTitle }]
      : []),
    { label: strings.admin.shlokaNumber, value: shloka.number },
  ];
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
