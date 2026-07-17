import type { Migration } from "../migration-runner.js";

export const numericSourceLocationCodesMigration: Migration = {
  id: "0010_numeric_source_location_codes",
  statements: [
    `
      alter table source_parts
      add constraint source_parts_numeric_code check (code ~ '^[0-9]+$')
    `,
    `
      alter table source_chapters
      add constraint source_chapters_numeric_code check (code ~ '^[0-9]+$')
    `,
    `
      with refreshed_titles as (
        select
          shlokas.code,
          shloka_sources.title || ' ' ||
          case
            when source_chapters.code is null then shlokas.number
            when source_parts.code is null then
              case
                when left(shlokas.number, length(btrim(source_chapters.code)) + 1)
                  = btrim(source_chapters.code) || '.'
                then shlokas.number
                else btrim(source_chapters.code) || '.' || shlokas.number
              end
            else
              case
                when left(
                  shlokas.number,
                  length(btrim(source_parts.code) || '.' || btrim(source_chapters.code)) + 1
                ) = btrim(source_parts.code) || '.' || btrim(source_chapters.code) || '.'
                then shlokas.number
                when left(shlokas.number, length(btrim(source_chapters.code)) + 1)
                  = btrim(source_chapters.code) || '.'
                then btrim(source_parts.code) || '.' || shlokas.number
                else btrim(source_parts.code) || '.' || btrim(source_chapters.code)
                  || '.' || shlokas.number
              end
          end as display_title
        from shlokas
        inner join shloka_sources on shloka_sources.code = shlokas.source_code
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
      )
      update shlokas
      set display_title = refreshed_titles.display_title
      from refreshed_titles
      where shlokas.code = refreshed_titles.code
        and shlokas.display_title is distinct from refreshed_titles.display_title
    `,
  ],
};
