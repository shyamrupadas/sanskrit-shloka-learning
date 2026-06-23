import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export interface SourceChapterRecord {
  code: string;
  title: string;
  order: number;
}

export interface SourcePartRecord {
  code: string;
  title: string;
  order: number;
  chapters: SourceChapterRecord[];
}

export interface SourceRecord {
  code: string;
  title: string;
  description?: string;
  structureType: ApiTypes.SourceStructureType;
  chapters: SourceChapterRecord[];
  parts: SourcePartRecord[];
}

export interface ShlokaRecord {
  code: string;
  displayTitle: string;
  sourceCode: string;
  sourceTitle: string;
  partCode?: string;
  chapterCode?: string;
  number: string;
  text: string;
  padas: string[];
  fullTranslation?: string;
  sortSourceTitle: string;
  sortPartOrder: number;
  sortChapterOrder: number;
}

export interface CreateSourceRecordInput {
  code: string;
  title: string;
  description?: string;
  structureType: ApiTypes.SourceStructureType;
  chapters: SourceChapterRecord[];
  parts: SourcePartRecord[];
}

export interface CreateShlokaRecordInput {
  code: string;
  displayTitle: string;
  sourceCode: string;
  sourceTitle: string;
  partCode?: string;
  chapterCode?: string;
  number: string;
  referenceKey: string;
  padas: string[];
  fullTranslation?: string;
  sortPartOrder: number;
  sortChapterOrder: number;
}

export interface UpdateSourceRecordInput {
  code: string;
  title: string;
  description?: string;
  chapters: SourceChapterRecord[];
  parts: SourcePartRecord[];
}

export interface UpdateShlokaRecordInput {
  code: string;
  padas: string[];
  fullTranslation?: string;
}

export interface CatalogRepository {
  createSource(input: CreateSourceRecordInput): Promise<SourceRecord>;
  createShloka(input: CreateShlokaRecordInput): Promise<ShlokaRecord>;
  getSource(code: string): Promise<SourceRecord | undefined>;
  getShloka(code: string): Promise<ShlokaRecord | undefined>;
  listSources(): Promise<SourceRecord[]>;
  listLibraryShlokas(): Promise<ShlokaRecord[]>;
  updateSource(input: UpdateSourceRecordInput): Promise<SourceRecord>;
  updateShloka(input: UpdateShlokaRecordInput): Promise<ShlokaRecord>;
}

export class CatalogConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}

export const CATALOG_REPOSITORY = Symbol("CATALOG_REPOSITORY");
