import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { notFoundError, validationError } from "../auth/api-error.js";
import {
  CATALOG_REPOSITORY,
  CatalogConflictError,
  type CatalogRepository,
  type SourceChapterRecord,
  type SourcePartRecord,
  type SourceRecord,
  type ShlokaRecord,
} from "./catalog.repository.js";
import { formatShlokaDisplayTitle } from "./shloka-display-title.js";

const catalogCacheFreshTtlMs = 30_000;
const catalogCacheStaleTtlMs = 5 * 60_000;
const shlokaPadaCount = 4;
const shlokaPadasRequiredMessage = "Заполните все четыре пады шлоки";

interface CachedAdminCatalog {
  freshUntil: number;
  staleUntil: number;
  value: ApiTypes.AdminCatalogDto;
}

interface CachedLibraryShlokas {
  freshUntil: number;
  staleUntil: number;
  value: ApiTypes.LibraryShlokaDto[];
}

@Injectable()
export class CatalogService {
  private adminCatalogCache: CachedAdminCatalog | undefined;
  private libraryShlokasCache: CachedLibraryShlokas | undefined;
  private readonly logger = new Logger(CatalogService.name);

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
      this.clearCatalogCaches();
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

  async getAdminCatalog(): Promise<ApiTypes.AdminCatalogDto> {
    const now = Date.now();
    if (this.adminCatalogCache && this.adminCatalogCache.freshUntil > now) {
      return this.adminCatalogCache.value;
    }

    try {
      const [sources, shlokas] = await Promise.all([
        this.catalog.listSources(),
        this.catalog.listLibraryShlokas(),
      ]);
      const sortedShlokas = shlokas.sort(compareShlokas);
      const catalog = {
        sources: sources.map((source) => ({
          ...toAdminSource(source),
          shlokas: sortedShlokas
            .filter((shloka) => shloka.sourceCode === source.code)
            .map(toAdminCatalogShloka),
        })),
      };

      this.setAdminCatalogCache(catalog);
      return catalog;
    } catch (error) {
      if (
        this.adminCatalogCache &&
        this.adminCatalogCache.staleUntil > Date.now() &&
        isTransientCatalogReadError(error)
      ) {
        this.logger.warn(`Using cached admin catalog after transient read error: ${errorMessage(error)}`);
        return this.adminCatalogCache.value;
      }

      throw error;
    }
  }

  async getAdminSource(
    sourceCode: string,
  ): Promise<{ status: 200; body: ApiTypes.AdminSourceDto } | { status: 404; body: ApiTypes.ApiError }> {
    const source = await this.catalog.getSource(sourceCode);
    if (!source) {
      return { status: 404, body: notFoundError("Источник шлоки не найден") };
    }

    return { status: 200, body: toAdminSource(source) };
  }

  async updateSource(
    sourceCode: string,
    request: ApiTypes.UpdateSourceRequest,
  ): Promise<
    | { status: 200; body: ApiTypes.AdminSourceDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 404; body: ApiTypes.ApiError }
    | { status: 409; body: ApiTypes.ApiError }
  > {
    const source = await this.catalog.getSource(sourceCode);
    if (!source) {
      return { status: 404, body: notFoundError("Источник шлоки не найден") };
    }

    const normalized = normalizeUpdateSourceRequest(request, source);
    const details = validateUpdateSourceRequest(normalized, source);
    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    try {
      const updated = await this.catalog.updateSource({
        code: source.code,
        title: normalized.title,
        ...(normalized.description ? { description: normalized.description } : {}),
        chapters: normalized.chapters ?? source.chapters,
        parts: normalized.parts ?? source.parts,
      });
      this.clearCatalogCaches();
      return { status: 200, body: toAdminSource(updated) };
    } catch (error) {
      if (error instanceof CatalogConflictError) {
        return { status: 409, body: conflictError("Коды или порядок структуры источника уже используются") };
      }
      throw error;
    }
  }

  async createShloka(request: ApiTypes.CreateShlokaRequest): Promise<
    | { status: 201; body: ApiTypes.LibraryShlokaDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 409; body: ApiTypes.ApiError }
  > {
    const normalized = normalizeShlokaRequest(request);
    const requiredDetails = validateShlokaRequiredFields(normalized);
    if (requiredDetails.length > 0) {
      return { status: 400, body: validationError(requiredDetails) };
    }

    const sources = await this.catalog.listSources();
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

      this.clearCatalogCaches();
      return { status: 201, body: toLibraryShloka(shloka) };
    } catch (error) {
      if (error instanceof CatalogConflictError) {
        return { status: 409, body: conflictError("Шлока с такой ссылкой уже существует") };
      }
      throw error;
    }
  }

  async listLibraryShlokas(): Promise<ApiTypes.LibraryShlokaDto[]> {
    const now = Date.now();
    if (this.libraryShlokasCache && this.libraryShlokasCache.freshUntil > now) {
      return cloneLibraryShlokas(this.libraryShlokasCache.value);
    }

    try {
      const shlokas = await this.catalog.listLibraryShlokas();
      const libraryShlokas = shlokas.sort(compareShlokas).map(toLibraryShloka);
      this.setLibraryShlokasCache(libraryShlokas);
      return cloneLibraryShlokas(libraryShlokas);
    } catch (error) {
      if (
        this.libraryShlokasCache &&
        this.libraryShlokasCache.staleUntil > Date.now() &&
        isTransientCatalogReadError(error)
      ) {
        this.logger.warn(`Using cached library shlokas after transient read error: ${errorMessage(error)}`);
        return cloneLibraryShlokas(this.libraryShlokasCache.value);
      }

      throw error;
    }
  }

  async getLibraryShloka(shlokaCode: string): Promise<ApiTypes.LibraryShlokaDto | undefined> {
    const now = Date.now();
    const cachedShloka = this.libraryShlokasCache?.value.find((candidate) => candidate.code === shlokaCode);
    if (cachedShloka && this.libraryShlokasCache && this.libraryShlokasCache.freshUntil > now) {
      return cloneLibraryShloka(cachedShloka);
    }

    try {
      const shloka = await this.catalog.getShloka(shlokaCode);
      return shloka ? toLibraryShloka(shloka) : undefined;
    } catch (error) {
      if (
        cachedShloka &&
        this.libraryShlokasCache &&
        this.libraryShlokasCache.staleUntil > Date.now() &&
        isTransientCatalogReadError(error)
      ) {
        this.logger.warn(`Using cached library shloka after transient read error: ${errorMessage(error)}`);
        return cloneLibraryShloka(cachedShloka);
      }

      throw error;
    }
  }

  async getAdminShloka(
    shlokaCode: string,
  ): Promise<{ status: 200; body: ApiTypes.AdminShlokaDto } | { status: 404; body: ApiTypes.ApiError }> {
    const shloka = await this.catalog.getShloka(shlokaCode);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    const source = await this.catalog.getSource(shloka.sourceCode);
    if (!source) {
      return { status: 404, body: notFoundError("Источник шлоки не найден") };
    }

    return { status: 200, body: toAdminShloka(shloka, source) };
  }

  async updateShloka(
    shlokaCode: string,
    request: ApiTypes.UpdateShlokaRequest,
  ): Promise<
    | { status: 200; body: ApiTypes.AdminShlokaDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 404; body: ApiTypes.ApiError }
  > {
    const normalized = normalizeUpdateShlokaRequest(request);
    const details = validateUpdateShlokaRequest(normalized);
    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    const shloka = await this.catalog.getShloka(shlokaCode);
    if (!shloka) {
      return { status: 404, body: notFoundError("Шлока не найдена") };
    }

    const updated = await this.catalog.updateShloka({
      code: shloka.code,
      padas: normalized.padas,
      ...(normalized.fullTranslation ? { fullTranslation: normalized.fullTranslation } : {}),
    });
    this.clearCatalogCaches();
    const source = await this.catalog.getSource(updated.sourceCode);
    if (!source) {
      return { status: 404, body: notFoundError("Источник шлоки не найден") };
    }

    return { status: 200, body: toAdminShloka(updated, source) };
  }

  private setAdminCatalogCache(value: ApiTypes.AdminCatalogDto): void {
    const now = Date.now();
    this.adminCatalogCache = {
      freshUntil: now + catalogCacheFreshTtlMs,
      staleUntil: now + catalogCacheStaleTtlMs,
      value,
    };
  }

  private setLibraryShlokasCache(value: ApiTypes.LibraryShlokaDto[]): void {
    const now = Date.now();
    this.libraryShlokasCache = {
      freshUntil: now + catalogCacheFreshTtlMs,
      staleUntil: now + catalogCacheStaleTtlMs,
      value: cloneLibraryShlokas(value),
    };
  }

  private clearCatalogCaches(): void {
    this.clearAdminCatalogCache();
    this.clearLibraryShlokasCache();
  }

  private clearAdminCatalogCache(): void {
    this.adminCatalogCache = undefined;
  }

  private clearLibraryShlokasCache(): void {
    this.libraryShlokasCache = undefined;
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
    padas: (request.padas ?? []).map(normalizeText),
    ...(fullTranslation ? { fullTranslation } : {}),
  };
}

function normalizeUpdateSourceRequest(request: ApiTypes.UpdateSourceRequest, source: SourceRecord) {
  const description = optionalText(request.description);

  return {
    title: normalizeText(request.title),
    ...(description ? { description } : {}),
    chapters:
      request.chapters === undefined
        ? undefined
        : normalizeChapters(request.chapters),
    parts:
      request.parts === undefined
        ? undefined
        : request.parts.map((part) => ({
            code: normalizeCode(part.code),
            title: normalizeText(part.title),
            order: normalizeOrder(part.order),
            chapters: normalizeChapters(part.chapters),
          })),
    structureType: source.structureType,
  };
}

function normalizeUpdateShlokaRequest(request: ApiTypes.UpdateShlokaRequest): ApiTypes.UpdateShlokaRequest {
  const fullTranslation = optionalText(request.fullTranslation);

  return {
    padas: (request.padas ?? []).map(normalizeText),
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

function validateUpdateSourceRequest(
  request: ReturnType<typeof normalizeUpdateSourceRequest>,
  source: SourceRecord,
): string[] {
  const details: string[] = [];

  requireText(request.title, "Название источника обязательно", details);

  if (source.structureType === "none") {
    if ((request.chapters?.length ?? 0) > 0 || (request.parts?.length ?? 0) > 0) {
      details.push("Для источника без глав нельзя добавить части или главы");
    }
    return details;
  }

  if (source.structureType === "chapters") {
    if ((request.parts?.length ?? 0) > 0) {
      details.push("Для источника с главами нельзя добавить части");
    }
    if (request.chapters) {
      validateEditableChapters(source.chapters, request.chapters, details);
    }
    return details;
  }

  if ((request.chapters?.length ?? 0) > 0) {
    details.push("Для источника с частями главы должны находиться внутри частей");
  }

  if (request.parts) {
    validateEditableParts(source.parts, request.parts, details);
  }

  return details;
}

function validateEditableParts(
  existingParts: SourcePartRecord[],
  nextParts: SourcePartRecord[],
  details: string[],
): void {
  if (nextParts.length === 0 && existingParts.length > 0) {
    details.push("Нельзя удалять существующие части");
  }

  validateUniqueCodes(nextParts, "Коды частей должны быть уникальны", details);
  validateUniqueOrders(nextParts, "Порядок частей должен быть уникален", details);

  for (const existingPart of existingParts) {
    const nextPart = nextParts.find((part) => part.code === existingPart.code);
    if (!nextPart) {
      details.push("Нельзя удалять существующие части");
      continue;
    }
    if (nextPart.order !== existingPart.order) {
      details.push("Нельзя менять порядок существующих частей");
    }
  }

  for (const part of nextParts) {
    validateCode(part.code, "Код части", details);
    requireText(part.title, "Название части обязательно", details);
    if (part.chapters.length === 0) {
      details.push("В каждой части должна быть хотя бы одна глава");
    }
    const existingPart = existingParts.find((candidate) => candidate.code === part.code);
    validateEditableChapters(existingPart?.chapters ?? [], part.chapters, details);
  }
}

function validateEditableChapters(
  existingChapters: SourceChapterRecord[],
  nextChapters: SourceChapterRecord[],
  details: string[],
): void {
  validateChapters(nextChapters, details);

  for (const existingChapter of existingChapters) {
    const nextChapter = nextChapters.find((chapter) => chapter.code === existingChapter.code);
    if (!nextChapter) {
      details.push("Нельзя удалять существующие главы");
      continue;
    }
    if (nextChapter.order !== existingChapter.order) {
      details.push("Нельзя менять порядок существующих глав");
    }
  }
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

function validateShlokaRequiredFields(request: ApiTypes.CreateShlokaRequest): string[] {
  const details: string[] = [];

  requireText(request.sourceCode, "Выберите источник шлоки", details);
  requireText(request.number, "Номер шлоки обязателен", details);
  validateShlokaPadas(request.padas, details);

  return details;
}

function validateUpdateShlokaRequest(request: ApiTypes.UpdateShlokaRequest): string[] {
  const details: string[] = [];

  validateShlokaPadas(request.padas, details);

  return details;
}

function validateShlokaPadas(padas: string[], details: string[]): void {
  if (padas.length !== shlokaPadaCount || padas.some((pada) => !pada)) {
    details.push(shlokaPadasRequiredMessage);
  }
}

function buildReference(source: SourceRecord, request: ApiTypes.CreateShlokaRequest) {
  const segments = [source.code];
  let partTitle: string | undefined;
  let chapterTitle: string | undefined;

  if (request.partCode) {
    const part = source.parts.find((candidate) => candidate.code === request.partCode);
    if (part) {
      segments.push(part.code);
      partTitle = part.title;
    }
  }

  if (request.chapterCode) {
    const chapters = request.partCode
      ? source.parts.find((part) => part.code === request.partCode)?.chapters ?? []
      : source.chapters;
    const chapter = chapters.find((candidate) => candidate.code === request.chapterCode);
    if (chapter) {
      segments.push(chapter.code);
      chapterTitle = chapter.title;
    }
  }

  const numberCode = normalizeCode(request.number);
  segments.push(numberCode);

  return {
    code: segments.join("-"),
    displayTitle: formatShlokaDisplayTitle({
      chapterTitle,
      number: request.number,
      partTitle,
      sourceTitle: source.title,
    }),
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

function toAdminSource(source: SourceRecord): ApiTypes.AdminSourceDto {
  return {
    ...toSourceOption(source),
    ...(source.description ? { description: source.description } : {}),
  };
}

function toChapterOption(chapter: SourceChapterRecord): ApiTypes.SourceChapterOptionDto {
  return {
    code: chapter.code,
    title: chapter.title,
    order: chapter.order,
  };
}

function toAdminCatalogShloka(shloka: ShlokaRecord): ApiTypes.AdminCatalogShlokaDto {
  return {
    code: shloka.code,
    ...(shloka.partCode ? { partCode: shloka.partCode } : {}),
    ...(shloka.chapterCode ? { chapterCode: shloka.chapterCode } : {}),
    number: shloka.number,
    text: shloka.text,
    ...(shloka.fullTranslation ? { fullTranslation: shloka.fullTranslation } : {}),
  };
}

function toLibraryShloka(shloka: ShlokaRecord): ApiTypes.LibraryShlokaDto {
  return {
    code: shloka.code,
    displayTitle: shloka.displayTitle,
    sourceTitle: shloka.sourceTitle,
    number: shloka.number,
    text: shloka.text,
    personalStatus: "available",
    ...(shloka.fullTranslation ? { fullTranslation: shloka.fullTranslation } : {}),
  };
}

function cloneLibraryShlokas(shlokas: ApiTypes.LibraryShlokaDto[]): ApiTypes.LibraryShlokaDto[] {
  return shlokas.map(cloneLibraryShloka);
}

function cloneLibraryShloka(shloka: ApiTypes.LibraryShlokaDto): ApiTypes.LibraryShlokaDto {
  return { ...shloka };
}

function toAdminShloka(shloka: ShlokaRecord, source: SourceRecord): ApiTypes.AdminShlokaDto {
  const part = shloka.partCode
    ? source.parts.find((candidate) => candidate.code === shloka.partCode)
    : undefined;
  const chapter = shloka.chapterCode
    ? (part?.chapters ?? source.chapters).find((candidate) => candidate.code === shloka.chapterCode)
    : undefined;

  return {
    code: shloka.code,
    sourceCode: shloka.sourceCode,
    sourceTitle: source.title,
    ...(part ? { partCode: part.code, partTitle: part.title } : {}),
    ...(chapter ? { chapterCode: chapter.code, chapterTitle: chapter.title } : {}),
    number: shloka.number,
    text: shloka.text,
    padas: [...shloka.padas],
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

function isTransientCatalogReadError(error: unknown): boolean {
  const code = errorCode(error);
  if (code && ["57P01", "08003", "08006"].includes(code)) {
    return true;
  }

  const message = errorMessage(error);
  return (
    message === "Query read timeout" ||
    message.includes("Connection terminated") ||
    message.includes("Client has encountered a connection error") ||
    message.includes("terminating connection due to administrator command") ||
    message.includes("Couldn't connect to compute node") ||
    message.includes("network issue") ||
    message.includes("early eof")
  );
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
