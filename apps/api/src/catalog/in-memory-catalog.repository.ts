import {
  CatalogConflictError,
  type CatalogRepository,
  type CreateShlokaRecordInput,
  type CreateSourceRecordInput,
  type ShlokaRecord,
  type SourceRecord,
} from "./catalog.repository.js";

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly sources = new Map<string, SourceRecord>();
  private readonly shlokas = new Map<string, ShlokaRecord>();
  private readonly shlokaReferenceKeys = new Set<string>();

  async createSource(input: CreateSourceRecordInput): Promise<SourceRecord> {
    if (this.sources.has(input.code)) {
      throw new CatalogConflictError("Source code already exists");
    }

    const source: SourceRecord = {
      code: input.code,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      structureType: input.structureType,
      chapters: input.chapters.map((chapter) => ({ ...chapter })),
      parts: input.parts.map((part) => ({
        ...part,
        chapters: part.chapters.map((chapter) => ({ ...chapter })),
      })),
    };

    this.sources.set(source.code, source);
    return cloneSource(source);
  }

  async createShloka(input: CreateShlokaRecordInput): Promise<ShlokaRecord> {
    if (this.shlokas.has(input.code) || this.shlokaReferenceKeys.has(input.referenceKey)) {
      throw new CatalogConflictError("Shloka code or reference already exists");
    }

    const source = this.sources.get(input.sourceCode);
    if (!source) {
      throw new Error("Expected source to exist before creating shloka");
    }

    const shloka: ShlokaRecord = {
      code: input.code,
      displayTitle: input.displayTitle,
      sourceCode: input.sourceCode,
      sourceTitle: input.sourceTitle,
      ...(input.partCode ? { partCode: input.partCode } : {}),
      ...(input.chapterCode ? { chapterCode: input.chapterCode } : {}),
      number: input.number,
      text: input.padas.join("\n"),
      ...(input.fullTranslation ? { fullTranslation: input.fullTranslation } : {}),
      sortSourceTitle: input.sourceTitle,
      sortPartOrder: input.sortPartOrder,
      sortChapterOrder: input.sortChapterOrder,
    };

    this.shlokas.set(shloka.code, shloka);
    this.shlokaReferenceKeys.add(input.referenceKey);
    return { ...shloka };
  }

  async listSources(): Promise<SourceRecord[]> {
    return [...this.sources.values()].map(cloneSource).sort((left, right) => left.title.localeCompare(right.title, "ru"));
  }

  async listLibraryShlokas(): Promise<ShlokaRecord[]> {
    return [...this.shlokas.values()].map((shloka) => ({ ...shloka }));
  }
}

function cloneSource(source: SourceRecord): SourceRecord {
  return {
    ...source,
    chapters: source.chapters.map((chapter) => ({ ...chapter })),
    parts: source.parts.map((part) => ({
      ...part,
      chapters: part.chapters.map((chapter) => ({ ...chapter })),
    })),
  };
}
