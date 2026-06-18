import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { validationError } from "../auth/api-error.js";
import {
  CATALOG_REPOSITORY,
  CatalogConflictError,
  type CatalogRepository,
  type SourceChapterRecord,
  type SourcePartRecord,
  type SourceRecord,
  type ShlokaRecord,
} from "./catalog.repository.js";

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalog: CatalogRepository,
  ) {}

  async createSource(request: ApiTypes.CreateSourceRequest): Promise<
    | { status: 201; body: ApiTypes.SourceOptionDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 409; body: ApiTypes.ApiError }
  > {
    const normalized = normalizeSourceRequest(request);
    const details = validateSourceRequest(normalized);

    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    try {
      const source = await this.catalog.createSource({
        code: normalized.code,
        title: normalized.title,
        ...(normalized.description ? { description: normalized.description } : {}),
        structureType: normalized.structureType,
        chapters: normalized.chapters,
        parts: normalized.parts,
      });
      return { status: 201, body: toSourceOption(source) };
    } catch (error) {
      if (error instanceof CatalogConflictError) {
        return { status: 409, body: conflictError("Код источника уже используется") };
      }
      throw error;
    }
  }

  async getSourceOptions(): Promise<ApiTypes.AdminSourceOptionsDto> {
    return {
      sources: (await this.catalog.listSources()).map(toSourceOption),
    };
  }

  async createShloka(request: ApiTypes.CreateShlokaRequest): Promise<
    | { status: 201; body: ApiTypes.LibraryShlokaDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 409; body: ApiTypes.ApiError }
  > {
    const sources = await this.catalog.listSources();
    const normalized = normalizeShlokaRequest(request);
    const source = sources.find((candidate) => candidate.code === normalized.sourceCode);
    const details = validateShlokaRequest(normalized, source);

    if (details.length > 0 || !source) {
      return { status: 400, body: validationError(details.length > 0 ? details : ["Источник шлоки обязателен"]) };
    }

    const reference = buildReference(source, normalized);

    try {
      const part = normalized.partCode
        ? source.parts.find((candidate) => candidate.code === normalized.partCode)
        : undefined;
      const chapter = normalized.chapterCode
        ? (part?.chapters ?? source.chapters).find((candidate) => candidate.code === normalized.chapterCode)
        : undefined;
      const shloka = await this.catalog.createShloka({
        code: reference.code,
        displayTitle: reference.displayTitle,
        sourceCode: normalized.sourceCode,
        sourceTitle: source.title,
        ...(normalized.partCode ? { partCode: normalized.partCode } : {}),
        ...(normalized.chapterCode ? { chapterCode: normalized.chapterCode } : {}),
        number: normalized.number,
        referenceKey: reference.referenceKey,
        padas: normalized.padas,
        ...(normalized.fullTranslation ? { fullTranslation: normalized.fullTranslation } : {}),
        sortPartOrder: part?.order ?? 0,
        sortChapterOrder: chapter?.order ?? 0,
      });

      return { status: 201, body: toLibraryShloka(shloka) };
    } catch (error) {
      if (error instanceof CatalogConflictError) {
        return { status: 409, body: conflictError("Шлока с такой ссылкой уже существует") };
      }
      throw error;
    }
  }

  async listLibraryShlokas(): Promise<ApiTypes.LibraryShlokaDto[]> {
    const shlokas = await this.catalog.listLibraryShlokas();

    return shlokas.sort(compareShlokas).map(toLibraryShloka);
  }
}

function normalizeSourceRequest(request: ApiTypes.CreateSourceRequest) {
  const structureType = request.structureType;

  return {
    code: normalizeCode(request.code),
    title: normalizeText(request.title),
    description: optionalText(request.description),
    structureType,
    chapters:
      structureType === "chapters"
        ? normalizeChapters(request.chapters ?? [])
        : [],
    parts:
      structureType === "parts"
        ? (request.parts ?? []).map((part) => ({
            code: normalizeCode(part.code),
            title: normalizeText(part.title),
            order: normalizeOrder(part.order),
            chapters: normalizeChapters(part.chapters),
          }))
        : [],
  };
}

function normalizeShlokaRequest(request: ApiTypes.CreateShlokaRequest): ApiTypes.CreateShlokaRequest {
  const partCode = optionalCode(request.partCode);
  const chapterCode = optionalCode(request.chapterCode);
  const fullTranslation = optionalText(request.fullTranslation);

  return {
    sourceCode: normalizeCode(request.sourceCode),
    ...(partCode ? { partCode } : {}),
    ...(chapterCode ? { chapterCode } : {}),
    number: normalizeText(request.number),
    padas: (request.padas ?? []).map(normalizeText).filter(Boolean),
    ...(fullTranslation ? { fullTranslation } : {}),
  };
}

function normalizeChapters(chapters: ApiTypes.CreateSourceChapterRequest[]): SourceChapterRecord[] {
  return chapters.map((chapter) => ({
    code: normalizeCode(chapter.code),
    title: normalizeText(chapter.title),
    order: normalizeOrder(chapter.order),
  }));
}

function validateSourceRequest(request: ReturnType<typeof normalizeSourceRequest>): string[] {
  const details: string[] = [];

  validateCode(request.code, "Код источника", details);
  requireText(request.title, "Название источника обязательно", details);

  if (request.structureType === "none") {
    return details;
  }

  if (request.structureType === "chapters") {
    validateChapters(request.chapters, details);
    return details;
  }

  if (request.parts.length === 0) {
    details.push("Добавьте хотя бы одну часть");
  }

  validateUniqueCodes(request.parts, "Коды частей должны быть уникальны", details);
  validateUniqueOrders(request.parts, "Порядок частей должен быть уникален", details);

  for (const part of request.parts) {
    validateCode(part.code, "Код части", details);
    requireText(part.title, "Название части обязательно", details);
    if (part.chapters.length === 0) {
      details.push("В каждой части должна быть хотя бы одна глава");
    }
    validateChapters(part.chapters, details);
  }

  return details;
}

function validateChapters(chapters: SourceChapterRecord[], details: string[]): void {
  if (chapters.length === 0) {
    details.push("Добавьте хотя бы одну главу");
  }

  validateUniqueCodes(chapters, "Коды глав должны быть уникальны", details);
  validateUniqueOrders(chapters, "Порядок глав должен быть уникален", details);

  for (const chapter of chapters) {
    validateCode(chapter.code, "Код главы", details);
    requireText(chapter.title, "Название главы обязательно", details);
  }
}

function validateShlokaRequest(request: ApiTypes.CreateShlokaRequest, source: SourceRecord | undefined): string[] {
  const details: string[] = [];

  if (!source) {
    details.push("Выберите источник шлоки");
    return details;
  }

  requireText(request.number, "Текст обязателен", details);

  if (!request.padas[0]) {
    details.push("Первая пада обязательна");
  }

  if (request.padas.length > 4) {
    details.push("Можно указать не больше четырех пад");
  }

  if (source.structureType === "none") {
    if (request.partCode || request.chapterCode) {
      details.push("Для источника без глав нельзя выбрать часть или главу");
    }
    return details;
  }

  if (source.structureType === "chapters") {
    if (!request.chapterCode) {
      details.push("Выберите главу");
    } else if (!source.chapters.some((chapter) => chapter.code === request.chapterCode)) {
      details.push("Выбранная глава не найдена");
    }
    if (request.partCode) {
      details.push("Для источника с главами нельзя выбрать часть");
    }
    return details;
  }

  const part = source.parts.find((candidate) => candidate.code === request.partCode);
  if (!part) {
    details.push("Выберите часть");
    return details;
  }

  if (!request.chapterCode) {
    details.push("Выберите главу");
  } else if (!part.chapters.some((chapter) => chapter.code === request.chapterCode)) {
    details.push("Выбранная глава не найдена в выбранной части");
  }

  return details;
}

function buildReference(source: SourceRecord, request: ApiTypes.CreateShlokaRequest) {
  const segments = [source.code];
  const titleSegments = [source.title];

  if (request.partCode) {
    const part = source.parts.find((candidate) => candidate.code === request.partCode);
    if (part) {
      segments.push(part.code);
      titleSegments.push(part.title);
    }
  }

  if (request.chapterCode) {
    const chapters = request.partCode
      ? source.parts.find((part) => part.code === request.partCode)?.chapters ?? []
      : source.chapters;
    const chapter = chapters.find((candidate) => candidate.code === request.chapterCode);
    if (chapter) {
      segments.push(chapter.code);
      titleSegments.push(chapter.title);
    }
  }

  const numberCode = normalizeCode(request.number);
  segments.push(numberCode);

  return {
    code: segments.join("-"),
    displayTitle: `${titleSegments.join(", ")} ${request.number}`,
    referenceKey: segments.join("/"),
  };
}

function compareShlokas(left: ShlokaRecord, right: ShlokaRecord): number {
  return (
    left.sortSourceTitle.localeCompare(right.sortSourceTitle, "ru") ||
    left.sortPartOrder - right.sortPartOrder ||
    left.sortChapterOrder - right.sortChapterOrder ||
    compareShlokaNumber(left.number, right.number) ||
    left.code.localeCompare(right.code)
  );
}

function compareShlokaNumber(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right, "ru", { numeric: true });
}

function toSourceOption(source: SourceRecord): ApiTypes.SourceOptionDto {
  return {
    code: source.code,
    title: source.title,
    structureType: source.structureType,
    chapters: source.chapters.map(toChapterOption),
    parts: source.parts.map((part) => ({
      code: part.code,
      title: part.title,
      order: part.order,
      chapters: part.chapters.map(toChapterOption),
    })),
  };
}

function toChapterOption(chapter: SourceChapterRecord): ApiTypes.SourceChapterOptionDto {
  return {
    code: chapter.code,
    title: chapter.title,
    order: chapter.order,
  };
}

function toLibraryShloka(shloka: ShlokaRecord): ApiTypes.LibraryShlokaDto {
  return {
    code: shloka.code,
    displayTitle: shloka.displayTitle,
    sourceTitle: shloka.sourceTitle,
    number: shloka.number,
    text: shloka.text,
    ...(shloka.fullTranslation ? { fullTranslation: shloka.fullTranslation } : {}),
  };
}

function normalizeCode(value: string | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .replaceAll(".", "-")
    .replaceAll("/", "-")
    .replaceAll(" ", "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function optionalCode(value: string | undefined): string | undefined {
  const normalized = normalizeCode(value);
  return normalized || undefined;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function normalizeOrder(order: number): number {
  return Number.isInteger(order) ? order : 0;
}

function validateCode(code: string, label: string, details: string[]): void {
  if (!code) {
    details.push(`${label} обязателен`);
    return;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
    details.push(`${label} должен содержать только латинские буквы, цифры и дефисы`);
  }
}

function requireText(value: string | undefined, message: string, details: string[]): void {
  if (!value) {
    details.push(message);
  }
}

function validateUniqueCodes(items: Array<{ code: string }>, message: string, details: string[]): void {
  if (new Set(items.map((item) => item.code)).size !== items.length) {
    details.push(message);
  }
}

function validateUniqueOrders(items: Array<{ order: number }>, message: string, details: string[]): void {
  if (new Set(items.map((item) => item.order)).size !== items.length) {
    details.push(message);
  }
}

function conflictError(message: string): ApiTypes.ApiError {
  return {
    code: "VALIDATION_ERROR",
    message,
  };
}
