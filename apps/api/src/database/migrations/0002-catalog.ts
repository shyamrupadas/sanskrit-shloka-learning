import type { Migration } from "../migration-runner.js";

export const catalogMigration: Migration = {
  id: "0002_catalog",
  statements: [
    `
      create table if not exists shloka_sources (
        code text primary key,
        title text not null,
        description text,
        structure_type text not null check (structure_type in ('none', 'chapters', 'parts')),
        created_at timestamptz not null default now()
      )
    `,
    `
      create table if not exists source_parts (
        source_code text not null references shloka_sources(code) on delete cascade,
        code text not null,
        title text not null,
        sort_order integer not null,
        primary key (source_code, code),
        unique (source_code, sort_order)
      )
    `,
    `
      create table if not exists source_chapters (
        source_code text not null references shloka_sources(code) on delete cascade,
        part_code text,
        code text not null,
        title text not null,
        sort_order integer not null,
        primary key (source_code, code),
        foreign key (source_code, part_code) references source_parts(source_code, code) on delete cascade,
        unique (source_code, part_code, sort_order)
      )
    `,
    `
      create table if not exists shlokas (
        code text primary key,
        source_code text not null references shloka_sources(code),
        part_code text,
        chapter_code text,
        number text not null,
        reference_key text not null unique,
        display_title text not null,
        full_translation text,
        created_at timestamptz not null default now()
      )
    `,
    "create index if not exists shlokas_source_code_idx on shlokas(source_code)",
    `
      create table if not exists shloka_padas (
        shloka_code text not null references shlokas(code) on delete cascade,
        position integer not null check (position between 1 and 4),
        text text not null,
        primary key (shloka_code, position)
      )
    `,
    `
      create or replace function prevent_catalog_code_update()
      returns trigger as $$
      begin
        if new.code <> old.code then
          raise exception 'catalog codes are immutable';
        end if;
        return new;
      end;
      $$ language plpgsql
    `,
    "drop trigger if exists shloka_sources_code_immutable on shloka_sources",
    `
      create trigger shloka_sources_code_immutable
      before update on shloka_sources
      for each row execute function prevent_catalog_code_update()
    `,
    "drop trigger if exists shlokas_code_immutable on shlokas",
    `
      create trigger shlokas_code_immutable
      before update on shlokas
      for each row execute function prevent_catalog_code_update()
    `,
  ],
};
