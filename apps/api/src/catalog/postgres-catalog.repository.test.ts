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

  test("updates catalog records through transactions without deleting sources or shlokas", async () => {
    const database = new TransactionTrackingDatabase();
    const repository = new PostgresCatalogRepository(database as unknown as DatabaseService);

    await repository.createSource({
      code: "gita",
      title: "Gita",
      structureType: "chapters",
      chapters: [{ code: "chapter-1", title: "Chapter 1", order: 1 }],
      parts: [],
    });
    await repository.createShloka({
      code: "gita-chapter-1-1",
      displayTitle: "Gita, Chapter 1 1",
      sourceCode: "gita",
      sourceTitle: "Gita",
      chapterCode: "chapter-1",
      number: "1",
      referenceKey: "gita/chapter-1/1",
      padas: ["first pada"],
      sortPartOrder: 0,
      sortChapterOrder: 1,
    });

    const updatedSource = await repository.updateSource({
      code: "gita",
      title: "Bhagavad Gita",
      description: "Updated source",
      chapters: [
        { code: "chapter-1", title: "First Chapter", order: 1 },
        { code: "chapter-2", title: "Second Chapter", order: 2 },
      ],
      parts: [],
    });
    const updatedShloka = await repository.updateShloka({
      code: "gita-chapter-1-1",
      padas: ["updated first", "updated second"],
      fullTranslation: "Updated translation",
    });

    assert.equal(database.transactionCount, 2);
    assert.equal(updatedSource.title, "Bhagavad Gita");
    assert.deepEqual(
      updatedSource.chapters.map((chapter) => chapter.title),
      ["First Chapter", "Second Chapter"],
    );
    assert.equal(updatedShloka.sourceTitle, "Bhagavad Gita");
    assert.equal(updatedShloka.displayTitle, "Bhagavad Gita, First Chapter 1");
    assert.deepEqual(updatedShloka.padas, ["updated first", "updated second"]);
    assert.equal(updatedShloka.text, "updated first\nupdated second");
    assert.equal(updatedShloka.fullTranslation, "Updated translation");
    assert.ok(database.transactionQueries.some((query) => query.includes("update shloka_sources")));
    assert.ok(database.transactionQueries.some((query) => query.includes("update shlokas")));
    assert.ok(
      database.transactionQueries.some((query) =>
        query.includes("on conflict (source_code, part_code, code) where part_code is not null"),
      ),
    );
    assert.ok(database.transactionQueries.every((query) => !query.includes("delete from shlokas")));
    assert.ok(database.transactionQueries.every((query) => !query.includes("delete from shloka_sources")));
  });

  test("scopes chapter codes by source part when reading shlokas", async () => {
    const database = new TransactionTrackingDatabase();
    const repository = new PostgresCatalogRepository(database as unknown as DatabaseService);

    await repository.createSource({
      code: "sb",
      title: "Srimad Bhagavatam",
      structureType: "parts",
      chapters: [],
      parts: [
        {
          code: "1",
          title: "Canto 1",
          order: 1,
          chapters: [
            { code: "1", title: "Chapter 1", order: 1 },
            { code: "2", title: "Chapter 2", order: 2 },
          ],
        },
        {
          code: "2",
          title: "Canto 2",
          order: 2,
          chapters: [{ code: "1", title: "Chapter 1", order: 1 }],
        },
      ],
    });
    await repository.createShloka({
      code: "sb-1-1-1",
      displayTitle: "Srimad Bhagavatam, Canto 1, Chapter 1 1",
      sourceCode: "sb",
      sourceTitle: "Srimad Bhagavatam",
      partCode: "1",
      chapterCode: "1",
      number: "1",
      referenceKey: "sb/1/1/1",
      padas: ["first canto"],
      sortPartOrder: 1,
      sortChapterOrder: 1,
    });
    await repository.createShloka({
      code: "sb-2-1-1",
      displayTitle: "Srimad Bhagavatam, Canto 2, Chapter 1 1",
      sourceCode: "sb",
      sourceTitle: "Srimad Bhagavatam",
      partCode: "2",
      chapterCode: "1",
      number: "1",
      referenceKey: "sb/2/1/1",
      padas: ["second canto"],
      sortPartOrder: 2,
      sortChapterOrder: 1,
    });

    const shlokas = await repository.listLibraryShlokas();

    assert.deepEqual(
      shlokas.map((shloka) => shloka.code),
      ["sb-1-1-1", "sb-2-1-1"],
    );
    assert.deepEqual(
      shlokas.map((shloka) => shloka.displayTitle),
      [
        "Srimad Bhagavatam, Canto 1, Chapter 1 1",
        "Srimad Bhagavatam, Canto 2, Chapter 1 1",
      ],
    );
    assert.ok(
      database.directQueries.some((query) => query.includes("source_chapters.part_code = shlokas.part_code")),
    );
    assert.ok(
      database.directQueries
        .filter((query) => query.includes("from shlokas"))
        .every((query) => !query.includes("concat_ws(")),
    );
  });

  test("reads source hierarchy with set-based aggregates", async () => {
    const database = new TransactionTrackingDatabase();
    const repository = new PostgresCatalogRepository(database as unknown as DatabaseService);

    await repository.createSource({
      code: "sb",
      title: "Srimad Bhagavatam",
      structureType: "parts",
      chapters: [],
      parts: [
        {
          code: "1",
          title: "Canto 1",
          order: 1,
          chapters: [
            { code: "1", title: "Chapter 1", order: 1 },
            { code: "2", title: "Chapter 2", order: 2 },
          ],
        },
      ],
    });

    const sources = await repository.listSources();

    assert.deepEqual(sources, [
      {
        code: "sb",
        title: "Srimad Bhagavatam",
        structureType: "parts",
        chapters: [],
        parts: [
          {
            code: "1",
            title: "Canto 1",
            order: 1,
            chapters: [
              { code: "1", title: "Chapter 1", order: 1 },
              { code: "2", title: "Chapter 2", order: 2 },
            ],
          },
        ],
      },
    ]);

    const sourceReadQuery = database.directQueries.find((query) => query.includes("from shloka_sources"));
    assert.ok(sourceReadQuery);
    assert.ok(sourceReadQuery.includes("with root_chapters as"));
    assert.ok(sourceReadQuery.includes("part_chapters as"));
    assert.ok(sourceReadQuery.includes("parts as"));
    assert.equal(sourceReadQuery.includes("where source_chapters.source_code = shloka_sources.code"), false);
    assert.equal(sourceReadQuery.includes("where source_parts.source_code = shloka_sources.code"), false);
  });

  test("loads source hierarchy through fast read queries", async () => {
    const database = new TimeoutSensitiveReadDatabase();
    const repository = new PostgresCatalogRepository(database as unknown as DatabaseService);

    await repository.createSource({
      code: "gita",
      title: "Gita",
      structureType: "chapters",
      chapters: [{ code: "chapter-1", title: "Chapter 1", order: 1 }],
      parts: [],
    });

    const sources = await repository.listSources();

    assert.deepEqual(
      sources.map((source) => source.code),
      ["gita"],
    );
    assert.equal(database.readQueryAttempts, 0);
    assert.equal(database.fastReadQueryAttempts, 1);
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

  async readQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    return this.query<Row>(text, values);
  }

  async fastReadQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    return this.query<Row>(text, values);
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
      return;
    }
    if (query.includes("update shloka_sources")) {
      this.applyUpdateSource(values);
      return;
    }
    if (query.includes("insert into source_parts")) {
      this.applyUpsertParts(values);
      return;
    }
    if (query.includes("insert into source_chapters")) {
      this.applyUpsertChapters(values);
      return;
    }
    if (query.includes("update shlokas")) {
      this.applyUpdateShloka(values);
      return;
    }
    if (query.includes("delete from shloka_padas")) {
      this.padas.delete(String(values[0]));
      return;
    }
    if (query.includes("insert into shloka_padas")) {
      this.applyUpdatePadas(values);
    }
  }

  private applyUpdateSource(values: readonly unknown[]): void {
    const source = this.sources.find((candidate) => candidate.code === String(values[0]));
    if (!source) {
      return;
    }

    source.title = String(values[1]);
    source.description = values[2] === null ? null : String(values[2]);
  }

  private applyUpsertParts(values: readonly unknown[]): void {
    const sourceCode = String(values[0]);

    for (const row of jsonRows<PartJsonRow>(values[1])) {
      const existing = this.parts.find((part) => part.source_code === sourceCode && part.code === row.code);
      if (existing) {
        existing.title = row.title;
        existing.sort_order = row.sort_order;
      } else {
        this.parts.push({
          source_code: sourceCode,
          code: row.code,
          title: row.title,
          sort_order: row.sort_order,
        });
      }
    }
  }

  private applyUpsertChapters(values: readonly unknown[]): void {
    const sourceCode = String(values[0]);

    for (const row of jsonRows<ChapterJsonRow>(values[1])) {
      const existing = this.chapters.find(
        (chapter) =>
          chapter.source_code === sourceCode &&
          chapter.part_code === row.part_code &&
          chapter.code === row.code,
      );
      if (existing) {
        existing.title = row.title;
        existing.sort_order = row.sort_order;
      } else {
        this.chapters.push({
          source_code: sourceCode,
          part_code: row.part_code,
          code: row.code,
          title: row.title,
          sort_order: row.sort_order,
        });
      }
    }
  }

  private applyUpdateShloka(values: readonly unknown[]): void {
    const shloka = this.shlokas.get(String(values[0]));
    if (shloka) {
      shloka.full_translation = values[1] === null ? null : String(values[1]);
    }
  }

  private applyUpdatePadas(values: readonly unknown[]): void {
    const padas: string[] = [];
    for (const row of jsonRows<PadaJsonRow>(values[1])) {
      padas[row.position - 1] = row.text;
    }
    this.padas.set(String(values[0]), padas);
  }

  private toShlokaRow(seed: ShlokaRowSeed): ShlokaRow {
    const source = this.sources.find((candidate) => candidate.code === seed.source_code);
    const part = this.parts.find(
      (candidate) => candidate.source_code === seed.source_code && candidate.code === seed.part_code,
    );
    const chapter = this.chapters.find(
      (candidate) =>
        candidate.source_code === seed.source_code &&
        candidate.part_code === seed.part_code &&
        candidate.code === seed.chapter_code,
    );

    return {
      ...seed,
      source_title: source?.title ?? seed.source_code,
      part_title: part?.title ?? null,
      chapter_title: chapter?.title ?? null,
      text: (this.padas.get(seed.code) ?? []).join("\n"),
      padas: this.padas.get(seed.code) ?? [],
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

class TimeoutSensitiveReadDatabase extends TransactionTrackingDatabase {
  fastReadQueryAttempts = 0;
  readQueryAttempts = 0;

  override async readQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    _text: string,
    _values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.readQueryAttempts += 1;
    throw new Error("Query read timeout");
  }

  override async fastReadQuery<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<pg.QueryResult<Row>> {
    this.fastReadQueryAttempts += 1;
    return super.fastReadQuery<Row>(text, values);
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
  full_translation: string | null;
}

interface ShlokaRow extends ShlokaRowSeed {
  source_title: string;
  part_title: string | null;
  chapter_title: string | null;
  text: string;
  padas: string[];
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
