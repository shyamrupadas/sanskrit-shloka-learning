import {
  CatalogConflictError,
  type CatalogRepository,
  type CreateShlokaRecordInput,
  type CreateSourceRecordInput,
  type ShlokaRecord,
  type SourceRecord,
  type UpdateShlokaRecordInput,
  type UpdateSourceRecordInput,
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
      padas: [...input.padas],
      ...(input.fullTranslation ? { fullTranslation: input.fullTranslation } : {}),
      sortSourceTitle: input.sourceTitle,
      sortPartOrder: input.sortPartOrder,
      sortChapterOrder: input.sortChapterOrder,
    };

    this.shlokas.set(shloka.code, shloka);
    this.shlokaReferenceKeys.add(input.referenceKey);
    return cloneShloka(shloka);
  }

  async getSource(code: string): Promise<SourceRecord | undefined> {
    const source = this.sources.get(code);
    return source ? cloneSource(source) : undefined;
  }

  async getShloka(code: string): Promise<ShlokaRecord | undefined> {
    const shloka = this.shlokas.get(code);
    return shloka ? cloneShloka(shloka) : undefined;
  }

  async listSources(): Promise<SourceRecord[]> {
    return [...this.sources.values()].map(cloneSource).sort((left, right) => left.title.localeCompare(right.title, "ru"));
  }

  async listLibraryShlokas(): Promise<ShlokaRecord[]> {
    return [...this.shlokas.values()].map(cloneShloka);
  }

  async updateSource(input: UpdateSourceRecordInput): Promise<SourceRecord> {
    const current = this.sources.get(input.code);
    if (!current) {
      throw new Error("Expected source to exist before updating it");
    }

    const source: SourceRecord = {
      code: current.code,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      structureType: current.structureType,
      chapters: input.chapters.map((chapter) => ({ ...chapter })),
      parts: input.parts.map((part) => ({
        ...part,
        chapters: part.chapters.map((chapter) => ({ ...chapter })),
      })),
    };

    this.sources.set(source.code, source);
    this.refreshShlokaSourceTitles(source);
    return cloneSource(source);
  }

  async updateShloka(input: UpdateShlokaRecordInput): Promise<ShlokaRecord> {
    const current = this.shlokas.get(input.code);
    if (!current) {
      throw new Error("Expected shloka to exist before updating it");
    }

    const shloka: ShlokaRecord = {
      ...current,
      padas: [...input.padas],
      text: input.padas.join("\n"),
      ...(input.fullTranslation ? { fullTranslation: input.fullTranslation } : {}),
    };

    if (!input.fullTranslation) {
      delete shloka.fullTranslation;
    }

    this.shlokas.set(shloka.code, shloka);
    return cloneShloka(shloka);
  }

  private refreshShlokaSourceTitles(source: SourceRecord): void {
    for (const [code, shloka] of this.shlokas.entries()) {
      if (shloka.sourceCode !== source.code) {
        continue;
      }

      const refreshed = {
        ...shloka,
        displayTitle: buildDisplayTitle(source, shloka),
        sourceTitle: source.title,
        sortSourceTitle: source.title,
        sortPartOrder: shloka.partCode
          ? source.parts.find((part) => part.code === shloka.partCode)?.order ?? 0
          : 0,
        sortChapterOrder: shloka.chapterCode
          ? (
              shloka.partCode
                ? source.parts.find((part) => part.code === shloka.partCode)?.chapters
                : source.chapters
            )?.find((chapter) => chapter.code === shloka.chapterCode)?.order ?? 0
          : 0,
      };
      this.shlokas.set(code, refreshed);
    }
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

function cloneShloka(shloka: ShlokaRecord): ShlokaRecord {
  return {
    ...shloka,
    padas: [...shloka.padas],
  };
}

function buildDisplayTitle(source: SourceRecord, shloka: ShlokaRecord): string {
  const segments = [source.title];

  if (shloka.partCode) {
    const part = source.parts.find((candidate) => candidate.code === shloka.partCode);
    if (part) {
      segments.push(part.title);
    }
  }

  if (shloka.chapterCode) {
    const chapters = shloka.partCode
      ? source.parts.find((part) => part.code === shloka.partCode)?.chapters ?? []
      : source.chapters;
    const chapter = chapters.find((candidate) => candidate.code === shloka.chapterCode);
    if (chapter) {
      segments.push(chapter.title);
    }
  }

  return `${segments.join(", ")} ${shloka.number}`;
}
