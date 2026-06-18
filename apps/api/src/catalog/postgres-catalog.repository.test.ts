import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type pg from "pg";

import type { DatabaseExecutor, DatabaseService } from "../database/database.service.js";
import { PostgresCatalogRepository } from "./postgres-catalog.repository.js";

describe("PostgresCatalogRepository", () => {
  test("runs catalog writes as single database statements", async () => {
    const database = new TransactionTrackingDatabase();
    const repository = new PostgresCatalogRepository(database as unknown as DatabaseService);

    await repository.createSource({
      code: "gita",
      title: "Gita",
      structureType: "chapters",
      chapters: [
        { code: "chapter-1", title: "Chapter 1", order: 1 },
        { code: "chapter-2", title: "Chapter 2", order: 2 },
        { code: "chapter-3", title: "Chapter 3", order: 3 },
        { code: "chapter-4", title: "Chapter 4", order: 4 },
      ],
      parts: [],
    });
    await repository.createShloka({
      code: "gita-chapter-1-1",
      displayTitle: "Gita / Chapter 1 / 1",
      sourceCode: "gita",
      sourceTitle: "Gita",
      chapterCode: "chapter-1",
      number: "1",
      referenceKey: "gita:chapter-1:1",
      padas: ["first pada", "second pada", "third pada", "fourth pada"],
      sortPartOrder: 0,
      sortChapterOrder: 1,
    });

    assert.equal(database.transactionCount, 0);
    assert.equal(database.directQueries.length, 2);
    assert.ok(database.directQueries[0]?.includes("insert into shloka_sources"));
    assert.ok(database.directQueries[0]?.includes("insert into source_parts"));
    assert.ok(database.directQueries[0]?.includes("insert into source_chapters"));
    assert.ok(database.directQueries[1]?.includes("insert into shlokas"));
    assert.ok(database.directQueries[1]?.includes("insert into shloka_padas"));
  });
});

class TransactionTrackingDatabase {
  transactionCount = 0;
  readonly directQueries: string[] = [];
  readonly transactionQueries: string[] = [];

  private readonly sources: SourceRowSeed[] = [];
  private readonly chapters: ChapterRow[] = [];
  private readonly parts: PartRow[] = [];
  private readonly shlokas = new Map<string, ShlokaRowSeed>();
  private readonly padas = new Map<string, string[]>();

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    const query = normalizeQuery(text);
    this.directQueries.push(query);

    if (query.includes("insert into shloka_sources")) {
      this.applyCreateSource(values);
      return result<Row>([]);
    }
    if (query.includes("insert into shlokas")) {
      this.applyCreateShloka(values);
      return result<Row>([]);
    }
    if (query.includes("from shloka_sources")) {
      return result(this.sources.map((source) => this.toSourceRow(source)) as unknown as Row[]);
    }
    if (query.includes("from shlokas")) {
      return result([...this.shlokas.values()].map((shloka) => this.toShlokaRow(shloka)) as unknown as Row[]);
    }

    throw new Error(`Unexpected direct query: ${query}`);
  }

  async transaction<T>(operation: (client: DatabaseExecutor) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    return operation({
      query: async <Row extends pg.QueryResultRow = pg.QueryResultRow>(
        text: string,
        values: readonly unknown[] = [],
      ): Promise<pg.QueryResult<Row>> => {
        const query = normalizeQuery(text);
        this.transactionQueries.push(query);
        this.applyWrite(query, values);
        return result<Row>([]);
      },
    });
  }

  private applyCreateSource(values: readonly unknown[]): void {
    this.sources.push({
      code: String(values[0]),
      title: String(values[1]),
      description: values[2] === null ? null : String(values[2]),
      structure_type: values[3] as SourceRowSeed["structure_type"],
    });

    for (const row of jsonRows<PartJsonRow>(values[4])) {
      this.parts.push({
        source_code: String(values[0]),
        code: row.code,
        title: row.title,
        sort_order: row.sort_order,
      });
    }

    for (const row of jsonRows<ChapterJsonRow>(values[5])) {
      this.chapters.push({
        source_code: String(values[0]),
        part_code: row.part_code,
        code: row.code,
        title: row.title,
        sort_order: row.sort_order,
      });
    }
  }

  private applyCreateShloka(values: readonly unknown[]): void {
    this.shlokas.set(String(values[0]), {
      code: String(values[0]),
      source_code: String(values[1]),
      part_code: values[2] === null ? null : String(values[2]),
      chapter_code: values[3] === null ? null : String(values[3]),
      number: String(values[4]),
      display_title: String(values[6]),
      full_translation: values[7] === null ? null : String(values[7]),
    });

    const padas = this.padas.get(String(values[0])) ?? [];
    for (const row of jsonRows<PadaJsonRow>(values[8])) {
      padas[row.position - 1] = row.text;
    }
    this.padas.set(String(values[0]), padas);
  }

  private applyWrite(query: string, values: readonly unknown[]): void {
    if (query.includes("insert into shloka_sources")) {
      this.applyCreateSource(values);
      return;
    }
    if (query.includes("insert into shlokas")) {
      this.applyCreateShloka(values);
    }
  }

  private toShlokaRow(seed: ShlokaRowSeed): ShlokaRow {
    const source = this.sources.find((candidate) => candidate.code === seed.source_code);
    const part = this.parts.find(
      (candidate) => candidate.source_code === seed.source_code && candidate.code === seed.part_code,
    );
    const chapter = this.chapters.find(
      (candidate) => candidate.source_code === seed.source_code && candidate.code === seed.chapter_code,
    );

    return {
      ...seed,
      source_title: source?.title ?? seed.source_code,
      text: (this.padas.get(seed.code) ?? []).join("\n"),
      sort_source_title: source?.title ?? seed.source_code,
      sort_part_order: part?.sort_order ?? null,
      sort_chapter_order: chapter?.sort_order ?? null,
    };
  }

  private toSourceRow(source: SourceRowSeed): SourceRow {
    return {
      ...source,
      chapters: this.chapters
        .filter((chapter) => chapter.source_code === source.code && chapter.part_code === null)
        .map(toSourceChapterRecord),
      parts: this.parts
        .filter((part) => part.source_code === source.code)
        .map((part) => ({
          code: part.code,
          title: part.title,
          order: part.sort_order,
          chapters: this.chapters
            .filter((chapter) => chapter.source_code === source.code && chapter.part_code === part.code)
            .map(toSourceChapterRecord),
        })),
    };
  }
}

interface SourceRowSeed extends pg.QueryResultRow {
  code: string;
  title: string;
  description: string | null;
  structure_type: "none" | "chapters" | "parts";
}

interface SourceRow extends SourceRowSeed {
  chapters: SourceChapterRecord[];
  parts: SourcePartRecord[];
}

interface SourceChapterRecord {
  code: string;
  title: string;
  order: number;
}

interface SourcePartRecord {
  code: string;
  title: string;
  order: number;
  chapters: SourceChapterRecord[];
}

interface ChapterRow extends pg.QueryResultRow {
  source_code: string;
  part_code: string | null;
  code: string;
  title: string;
  sort_order: number;
}

interface PartRow extends pg.QueryResultRow {
  source_code: string;
  code: string;
  title: string;
  sort_order: number;
}

interface ShlokaRowSeed extends pg.QueryResultRow {
  code: string;
  source_code: string;
  part_code: string | null;
  chapter_code: string | null;
  number: string;
  display_title: string;
  full_translation: string | null;
}

interface ShlokaRow extends ShlokaRowSeed {
  source_title: string;
  text: string;
  sort_source_title: string;
  sort_part_order: number | null;
  sort_chapter_order: number | null;
}

interface PartJsonRow {
  code: string;
  title: string;
  sort_order: number;
}

interface ChapterJsonRow {
  part_code: string | null;
  code: string;
  title: string;
  sort_order: number;
}

interface PadaJsonRow {
  position: number;
  text: string;
}

function normalizeQuery(text: string): string {
  return text.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function result<Row extends pg.QueryResultRow>(rows: Row[]): pg.QueryResult<Row> {
  return {
    command: "",
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows,
  };
}

function jsonRows<Row>(value: unknown): Row[] {
  if (typeof value !== "string") {
    throw new TypeError("Expected JSON rows parameter");
  }
  return JSON.parse(value) as Row[];
}

function toSourceChapterRecord(chapter: ChapterRow): SourceChapterRecord {
  return {
    code: chapter.code,
    title: chapter.title,
    order: chapter.sort_order,
  };
}
