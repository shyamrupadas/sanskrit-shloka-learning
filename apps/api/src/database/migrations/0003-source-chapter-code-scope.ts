import type { Migration } from "../migration-runner.js";

export const sourceChapterCodeScopeMigration: Migration = {
  id: "0003_source_chapter_code_scope",
  statements: [
    "alter table source_chapters drop constraint if exists source_chapters_source_code_part_code_sort_order_key",
    "alter table source_chapters drop constraint if exists source_chapters_pkey",
    `
      create unique index if not exists source_chapters_root_code_unique
      on source_chapters (source_code, code)
      where part_code is null
    `,
    `
      create unique index if not exists source_chapters_part_code_unique
      on source_chapters (source_code, part_code, code)
      where part_code is not null
    `,
    `
      create unique index if not exists source_chapters_root_sort_order_unique
      on source_chapters (source_code, sort_order)
      where part_code is null
    `,
    `
      create unique index if not exists source_chapters_part_sort_order_unique
      on source_chapters (source_code, part_code, sort_order)
      where part_code is not null
    `,
  ],
};
