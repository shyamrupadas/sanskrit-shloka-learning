import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
  CatalogConflictError,
  type CatalogRepository,
  type CreateShlokaRecordInput,
  type CreateSourceRecordInput,
  type ShlokaRecord,
  type SourceChapterRecord,
  type SourcePartRecord,
  type SourceRecord,
  type UpdateShlokaRecordInput,
  type UpdateSourceRecordInput,
} from "./catalog.repository.js";

interface SourceRow {
  code: string;
  title: string;
  description: string | null;
  structure_type: SourceRecord["structureType"];
  chapters: SourceChapterRecord[];
  parts: SourcePartRecord[];
}

interface ShlokaRow {
  code: string;
  source_code: string;
  source_title: string;
  part_code: string | null;
  part_title: string | null;
  chapter_code: string | null;
  chapter_title: string | null;
  number: string;
  text: string;
  padas: string[];
  full_translation: string | null;
  sort_source_title: string;
  sort_part_order: number | null;
  sort_chapter_order: number | null;
}

@Injectable()
export class PostgresCatalogRepository implements CatalogRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async createSource(input: CreateSourceRecordInput): Promise<SourceRecord> {
    try {
      await this.database.query(
        `
          with created_source as (
            insert into shloka_sources (code, title, description, structure_type)
            values ($1, $2, $3, $4)
            returning code
          ),
          created_parts as (
            insert into source_parts (source_code, code, title, sort_order)
            select created_source.code, part.code, part.title, part.sort_order
            from created_source
            cross join jsonb_to_recordset($5::jsonb) as part(code text, title text, sort_order integer)
            returning source_code, code
          ),
          created_chapters as (
            insert into source_chapters (source_code, part_code, code, title, sort_order)
            select created_source.code, chapter.part_code, chapter.code, chapter.title, chapter.sort_order
            from created_source
            cross join jsonb_to_recordset($6::jsonb) as chapter(
              part_code text,
              code text,
              title text,
              sort_order integer
            )
            returning source_code, code
          )
          select code from created_source
        `,
        [
          input.code,
          input.title,
          input.description ?? null,
          input.structureType,
          toJsonRows(input.parts.map((part) => ({ code: part.code, title: part.title, sort_order: part.order }))),
          toJsonRows(toChapterRows(input)),
        ],
      );
      return toCreatedSource(input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CatalogConflictError("Source code already exists");
      }
      throw error;
    }
  }

  async createShloka(input: CreateShlokaRecordInput): Promise<ShlokaRecord> {
    try {
      await this.database.query(
        `
          with created_shloka as (
            insert into shlokas (
              code, source_code, part_code, chapter_code, number,
              reference_key, display_title, full_translation
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning code
          ),
          created_padas as (
            insert into shloka_padas (shloka_code, position, text)
            select created_shloka.code, pada.position, pada.text
            from created_shloka
            cross join jsonb_to_recordset($9::jsonb) as pada(position integer, text text)
            returning shloka_code, position
          )
          select code from created_shloka
        `,
        [
          input.code,
          input.sourceCode,
          input.partCode ?? null,
          input.chapterCode ?? null,
          input.number,
          input.referenceKey,
          input.displayTitle,
          input.fullTranslation ?? null,
          toJsonRows(input.padas.map((pada, index) => ({ position: index + 1, text: pada }))),
        ],
      );
      return toCreatedShloka(input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CatalogConflictError("Shloka code or reference already exists");
      }
      throw error;
    }
  }

  async listSources(): Promise<SourceRecord[]> {
    const result = await this.database.fastReadQuery<SourceRow>(`
      with root_chapters as (
        select
          source_chapters.source_code,
          jsonb_agg(
            jsonb_build_object(
              'code', source_chapters.code,
              'title', source_chapters.title,
              'order', source_chapters.sort_order
            )
            order by source_chapters.sort_order, source_chapters.code
          ) as chapters
        from source_chapters
        where source_chapters.part_code is null
        group by source_chapters.source_code
      ),
      part_chapters as (
        select
          source_chapters.source_code,
          source_chapters.part_code,
          jsonb_agg(
            jsonb_build_object(
              'code', source_chapters.code,
              'title', source_chapters.title,
              'order', source_chapters.sort_order
            )
            order by source_chapters.sort_order, source_chapters.code
          ) as chapters
        from source_chapters
        where source_chapters.part_code is not null
        group by source_chapters.source_code, source_chapters.part_code
      ),
      parts as (
        select
          source_parts.source_code,
          jsonb_agg(
            jsonb_build_object(
              'code', source_parts.code,
              'title', source_parts.title,
              'order', source_parts.sort_order,
              'chapters', coalesce(part_chapters.chapters, '[]'::jsonb)
            )
            order by source_parts.sort_order, source_parts.code
          ) as parts
        from source_parts
        left join part_chapters
          on part_chapters.source_code = source_parts.source_code
          and part_chapters.part_code = source_parts.code
        group by source_parts.source_code
      )
      select
        shloka_sources.code,
        shloka_sources.title,
        shloka_sources.description,
        shloka_sources.structure_type,
        coalesce(root_chapters.chapters, '[]'::jsonb) as chapters,
        coalesce(parts.parts, '[]'::jsonb) as parts
      from shloka_sources
      left join root_chapters on root_chapters.source_code = shloka_sources.code
      left join parts on parts.source_code = shloka_sources.code
      order by shloka_sources.title, shloka_sources.code
    `);

    return result.rows.map(mapSource);
  }

  async getSource(code: string): Promise<SourceRecord | undefined> {
    return (await this.listSources()).find((source) => source.code === code);
  }

  async getShloka(code: string): Promise<ShlokaRecord | undefined> {
    return (await this.listLibraryShlokas()).find((shloka) => shloka.code === code);
  }

  async listLibraryShlokas(): Promise<ShlokaRecord[]> {
    const result = await this.database.readQuery<ShlokaRow>(`
      select
        shlokas.code,
        shlokas.source_code,
        shloka_sources.title as source_title,
        shlokas.part_code,
        source_parts.title as part_title,
        shlokas.chapter_code,
        source_chapters.title as chapter_title,
        shlokas.number,
        string_agg(shloka_padas.text, E'\n' order by shloka_padas.position) as text,
        array_agg(shloka_padas.text order by shloka_padas.position) as padas,
        shlokas.full_translation,
        shloka_sources.title as sort_source_title,
        source_parts.sort_order as sort_part_order,
        source_chapters.sort_order as sort_chapter_order
      from shlokas
      inner join shloka_sources on shloka_sources.code = shlokas.source_code
      inner join shloka_padas on shloka_padas.shloka_code = shlokas.code
      left join source_parts
        on source_parts.source_code = shlokas.source_code
        and source_parts.code = shlokas.part_code
      left join source_chapters
        on source_chapters.source_code = shlokas.source_code
        and source_chapters.code = shlokas.chapter_code
        and (
          (shlokas.part_code is null and source_chapters.part_code is null)
          or source_chapters.part_code = shlokas.part_code
        )
      group by shlokas.code, shlokas.source_code, shloka_sources.title,
        shlokas.part_code, shlokas.chapter_code, shlokas.number, shlokas.full_translation,
        source_parts.title, source_parts.sort_order, source_chapters.title, source_chapters.sort_order
    `);

    return result.rows.map(mapShloka);
  }

  async updateSource(input: UpdateSourceRecordInput): Promise<SourceRecord> {
    try {
      await this.database.transaction(async (client) => {
        await client.query(
          `
            update shloka_sources
            set title = $2, description = $3
            where code = $1
          `,
          [input.code, input.title, input.description ?? null],
        );

        await client.query(
          `
            insert into source_parts (source_code, code, title, sort_order)
            select $1, part.code, part.title, part.sort_order
            from jsonb_to_recordset($2::jsonb) as part(code text, title text, sort_order integer)
            on conflict (source_code, code)
            do update set title = excluded.title, sort_order = excluded.sort_order
          `,
          [
            input.code,
            toJsonRows(input.parts.map((part) => ({ code: part.code, title: part.title, sort_order: part.order }))),
          ],
        );

        await client.query(
          `
            insert into source_chapters (source_code, part_code, code, title, sort_order)
            select $1, null, chapter.code, chapter.title, chapter.sort_order
            from jsonb_to_recordset($2::jsonb) as chapter(
              code text,
              title text,
              sort_order integer
            )
            on conflict (source_code, code) where part_code is null
            do update set title = excluded.title, sort_order = excluded.sort_order
          `,
          [input.code, toJsonRows(toRootChapterRows(input))],
        );

        await client.query(
          `
            insert into source_chapters (source_code, part_code, code, title, sort_order)
            select $1, chapter.part_code, chapter.code, chapter.title, chapter.sort_order
            from jsonb_to_recordset($2::jsonb) as chapter(
              part_code text,
              code text,
              title text,
              sort_order integer
            )
            on conflict (source_code, part_code, code) where part_code is not null
            do update set title = excluded.title, sort_order = excluded.sort_order
          `,
          [input.code, toJsonRows(toPartChapterRows(input))],
        );
      });

      const source = await this.getSource(input.code);
      if (!source) {
        throw new Error("Expected source to exist after updating it");
      }
      return source;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CatalogConflictError("Source structure code or order already exists");
      }
      throw error;
    }
  }

  async updateShloka(input: UpdateShlokaRecordInput): Promise<ShlokaRecord> {
    await this.database.transaction(async (client) => {
      await client.query(
        `
          update shlokas
          set full_translation = $2
          where code = $1
        `,
        [input.code, input.fullTranslation ?? null],
      );
      await client.query("delete from shloka_padas where shloka_code = $1", [input.code]);
      await client.query(
        `
          insert into shloka_padas (shloka_code, position, text)
          select $1, pada.position, pada.text
          from jsonb_to_recordset($2::jsonb) as pada(position integer, text text)
        `,
        [input.code, toJsonRows(input.padas.map((pada, index) => ({ position: index + 1, text: pada })))],
      );
    });

    const shloka = await this.getShloka(input.code);
    if (!shloka) {
      throw new Error("Expected shloka to exist after updating it");
    }
    return shloka;
  }
}

function toJsonRows(rows: unknown[]): string {
  return JSON.stringify(rows);
}

function toChapterRows(input: CreateSourceRecordInput | UpdateSourceRecordInput): unknown[] {
  return [...toRootChapterRows(input), ...toPartChapterRows(input)];
}

function toRootChapterRows(input: CreateSourceRecordInput | UpdateSourceRecordInput): unknown[] {
  return input.chapters.map((chapter) => ({
    part_code: null,
    code: chapter.code,
    title: chapter.title,
    sort_order: chapter.order,
  }));
}

function toPartChapterRows(input: CreateSourceRecordInput | UpdateSourceRecordInput): unknown[] {
  return input.parts.flatMap((part) =>
    part.chapters.map((chapter) => ({
      part_code: part.code,
      code: chapter.code,
      title: chapter.title,
      sort_order: chapter.order,
    })),
  );
}

function toCreatedSource(input: CreateSourceRecordInput): SourceRecord {
  return {
    code: input.code,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    structureType: input.structureType,
    chapters: input.chapters.map(cloneChapter),
    parts: input.parts.map((part) => ({
      code: part.code,
      title: part.title,
      order: part.order,
      chapters: part.chapters.map(cloneChapter),
    })),
  };
}

function toCreatedShloka(input: CreateShlokaRecordInput): ShlokaRecord {
  return {
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
}

function mapSource(source: SourceRow): SourceRecord {
  return {
    code: source.code,
    title: source.title,
    ...(source.description ? { description: source.description } : {}),
    structureType: source.structure_type,
    chapters: source.chapters.map(cloneChapter),
    parts: source.parts.map((part) => ({
      code: part.code,
      title: part.title,
      order: part.order,
      chapters: part.chapters.map(cloneChapter),
    })),
  };
}

function cloneChapter(chapter: SourceChapterRecord): SourceChapterRecord {
  return { ...chapter };
}

function mapShloka(row: ShlokaRow): ShlokaRecord {
  return {
    code: row.code,
    displayTitle: buildDisplayTitle(row),
    sourceCode: row.source_code,
    sourceTitle: row.source_title,
    ...(row.part_code ? { partCode: row.part_code } : {}),
    ...(row.chapter_code ? { chapterCode: row.chapter_code } : {}),
    number: row.number,
    text: row.text,
    padas: [...row.padas],
    ...(row.full_translation ? { fullTranslation: row.full_translation } : {}),
    sortSourceTitle: row.sort_source_title,
    sortPartOrder: row.sort_part_order ?? 0,
    sortChapterOrder: row.sort_chapter_order ?? 0,
  };
}

function buildDisplayTitle(row: ShlokaRow): string {
  const segments = [row.source_title, row.part_title, row.chapter_title].filter(
    (segment): segment is string => Boolean(segment),
  );

  return `${segments.join(", ")} ${row.number}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
