import type { Migration } from "../migration-runner.js";

export const materializedShlokaDisplayTitleMigration: Migration = {
  id: "0008_materialized_shloka_display_title",
  statements: [
    `
      with refreshed_titles as (
        select
          shlokas.code,
          case
            when source_parts.title is null
              and btrim(source_chapters.title) ~ '^[0-9]+([.][0-9]+)*$'
            then shloka_sources.title || ' ' ||
              case
                when left(shlokas.number, length(btrim(source_chapters.title)) + 1)
                  = btrim(source_chapters.title) || '.'
                then shlokas.number
                else btrim(source_chapters.title) || '.' || shlokas.number
              end
            else concat_ws(', ', shloka_sources.title, source_parts.title, source_chapters.title)
              || ' ' || shlokas.number
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
