import { useState, type FormEvent } from "react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export type SourceStructureType = ApiTypes.SourceStructureType;

export interface ChapterFormState {
  code: string;
  title: string;
}

export interface PartFormState {
  code: string;
  title: string;
  chapters: ChapterFormState[];
}

export interface SourceEditorForm<TRequest> {
  addPart: () => void;
  addPartChapter: (partIndex: number) => void;
  addRootChapter: () => void;
  chapters: ChapterFormState[];
  description: string;
  isPartChapterCodeReadOnly: (
    part: PartFormState,
    chapter: ChapterFormState,
  ) => boolean;
  isPartCodeReadOnly: (part: PartFormState) => boolean;
  isRootChapterCodeReadOnly: (chapter: ChapterFormState) => boolean;
  parts: PartFormState[];
  setDescription: (description: string) => void;
  setSourceCode: (code: string) => void;
  setStructureType: (structureType: SourceStructureType) => void;
  setTitle: (title: string) => void;
  sourceCode: string;
  sourceCodeReadOnly: boolean;
  structureType: SourceStructureType;
  structureTypeReadOnly: boolean;
  submit: (
    event: FormEvent<HTMLFormElement>,
    save: (request: TRequest) => Promise<unknown>,
  ) => Promise<void>;
  title: string;
  updatePart: (partIndex: number, patch: Partial<PartFormState>) => void;
  updatePartChapter: (
    partIndex: number,
    chapterIndex: number,
    patch: Partial<ChapterFormState>,
  ) => void;
  updateRootChapter: (
    chapterIndex: number,
    patch: Partial<ChapterFormState>,
  ) => void;
}

interface SourceFormState {
  chapters: ChapterFormState[];
  description: string;
  parts: PartFormState[];
  sourceCode: string;
  structureType: SourceStructureType;
  title: string;
}

interface SourceFormConfig<TRequest> {
  buildRequest: (state: SourceFormState) => TRequest;
  existingChapterCodesByPart?: Record<string, string[]>;
  existingPartCodes?: string[];
  existingRootChapterCodes?: string[];
  initialState: SourceFormState;
  sourceCodeReadOnly: boolean;
  structureTypeReadOnly: boolean;
}

export function useCreateSourceForm(): SourceEditorForm<ApiTypes.CreateSourceRequest> {
  return useSourceForm({
    buildRequest: buildCreateSourceRequest,
    initialState: {
      chapters: [emptyChapter()],
      description: "",
      parts: [emptyPart()],
      sourceCode: "",
      structureType: "none",
      title: "",
    },
    sourceCodeReadOnly: false,
    structureTypeReadOnly: false,
  });
}

export function useEditSourceForm(
  source: ApiTypes.AdminSourceDto,
): SourceEditorForm<ApiTypes.UpdateSourceRequest> {
  return useSourceForm({
    buildRequest: buildUpdateSourceRequest,
    existingChapterCodesByPart: Object.fromEntries(
      source.parts.map((part) => [
        part.code,
        part.chapters.map((chapter) => chapter.code),
      ]),
    ),
    existingPartCodes: source.parts.map((part) => part.code),
    existingRootChapterCodes: source.chapters.map((chapter) => chapter.code),
    initialState: {
      chapters: source.chapters.map(({ code, title }) => ({ code, title })),
      description: source.description ?? "",
      parts: source.parts.map((part) => ({
        code: part.code,
        title: part.title,
        chapters: part.chapters.map((chapter) => ({
          code: chapter.code,
          title: chapter.title,
        })),
      })),
      sourceCode: source.code,
      structureType: source.structureType,
      title: source.title,
    },
    sourceCodeReadOnly: true,
    structureTypeReadOnly: true,
  });
}

function emptyChapter(): ChapterFormState {
  return { code: "", title: "" };
}

function emptyPart(): PartFormState {
  return {
    chapters: [emptyChapter()],
    code: "",
    title: "",
  };
}

function useSourceForm<TRequest>({
  buildRequest,
  existingChapterCodesByPart = {},
  existingPartCodes = [],
  existingRootChapterCodes = [],
  initialState,
  sourceCodeReadOnly,
  structureTypeReadOnly,
}: SourceFormConfig<TRequest>): SourceEditorForm<TRequest> {
  const [sourceCode, setSourceCode] = useState(initialState.sourceCode);
  const [title, setTitle] = useState(initialState.title);
  const [description, setDescription] = useState(initialState.description);
  const [structureType, setStructureType] = useState(
    initialState.structureType,
  );
  const [chapters, setChapters] = useState(initialState.chapters);
  const [parts, setParts] = useState(initialState.parts);

  const state: SourceFormState = {
    chapters,
    description,
    parts,
    sourceCode,
    structureType,
    title,
  };

  async function submit(
    event: FormEvent<HTMLFormElement>,
    save: (request: TRequest) => Promise<unknown>,
  ) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    await save(buildRequest(state));
  }

  return {
    addPart: () => setParts((current) => [...current, emptyPart()]),
    addPartChapter: (partIndex) =>
      setParts((current) =>
        current.map((part, index) =>
          index === partIndex
            ? { ...part, chapters: [...part.chapters, emptyChapter()] }
            : part,
        ),
      ),
    addRootChapter: () =>
      setChapters((current) => [...current, emptyChapter()]),
    chapters,
    description,
    isPartChapterCodeReadOnly: (part, chapter) =>
      existingChapterCodesByPart[part.code]?.includes(chapter.code) ?? false,
    isPartCodeReadOnly: (part) => existingPartCodes.includes(part.code),
    isRootChapterCodeReadOnly: (chapter) =>
      existingRootChapterCodes.includes(chapter.code),
    parts,
    setDescription,
    setSourceCode,
    setStructureType,
    setTitle,
    sourceCode,
    sourceCodeReadOnly,
    structureType,
    structureTypeReadOnly,
    submit,
    title,
    updatePart: (partIndex, patch) =>
      setParts((current) =>
        current.map((part, index) =>
          index === partIndex ? { ...part, ...patch } : part,
        ),
      ),
    updatePartChapter: (partIndex, chapterIndex, patch) =>
      setParts((current) =>
        current.map((part, index) =>
          index === partIndex
            ? {
                ...part,
                chapters: part.chapters.map((chapter, innerIndex) =>
                  innerIndex === chapterIndex
                    ? { ...chapter, ...patch }
                    : chapter,
                ),
              }
            : part,
        ),
      ),
    updateRootChapter: (chapterIndex, patch) =>
      setChapters((current) =>
        current.map((chapter, index) =>
          index === chapterIndex ? { ...chapter, ...patch } : chapter,
        ),
      ),
  };
}

function buildCreateSourceRequest({
  chapters,
  description,
  parts,
  sourceCode,
  structureType,
  title,
}: SourceFormState): ApiTypes.CreateSourceRequest {
  return {
    code: sourceCode,
    title,
    ...(description ? { description } : {}),
    structureType,
    ...(structureType === "chapters"
      ? { chapters: toOrderedChapters(chapters) }
      : {}),
    ...(structureType === "parts" ? { parts: toOrderedParts(parts) } : {}),
  };
}

function buildUpdateSourceRequest({
  chapters,
  description,
  parts,
  structureType,
  title,
}: SourceFormState): ApiTypes.UpdateSourceRequest {
  return {
    title,
    ...(description ? { description } : {}),
    ...(structureType === "chapters"
      ? { chapters: toOrderedChapters(chapters) }
      : {}),
    ...(structureType === "parts" ? { parts: toOrderedParts(parts) } : {}),
  };
}

function toOrderedChapters(
  chapters: ChapterFormState[],
): ApiTypes.CreateSourceChapterRequest[] {
  return chapters.map((chapter, index) => ({
    ...chapter,
    order: index + 1,
  }));
}

function toOrderedParts(
  parts: PartFormState[],
): ApiTypes.CreateSourcePartRequest[] {
  return parts.map((part, partIndex) => ({
    code: part.code,
    title: part.title,
    order: partIndex + 1,
    chapters: toOrderedChapters(part.chapters),
  }));
}
