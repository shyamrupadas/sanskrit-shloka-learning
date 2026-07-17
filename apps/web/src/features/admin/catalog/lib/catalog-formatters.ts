import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { segmentGraphemes } from "@/shared/lib/unicode";

export function getSourceCaption(
  source: ApiTypes.AdminCatalogSourceDto,
): string {
  if (source.structureType === "chapters") {
    return formatRuCount(source.chapters.length, "глава", "главы", "глав");
  }
  if (source.structureType === "parts") {
    return formatRuCount(source.parts.length, "часть", "части", "частей");
  }
  return formatRuCount(source.shlokas.length, "шлока", "шлоки", "шлок");
}

export function getShlokaLocation(shloka: ApiTypes.AdminCatalogShlokaDto): string {
  const locationCodes = [shloka.partCode, shloka.chapterCode]
    .filter(Boolean)
    .join(".");

  if (!locationCodes || shloka.number.startsWith(`${locationCodes}.`)) {
    return shloka.number;
  }
  if (
    shloka.partCode &&
    shloka.chapterCode &&
    shloka.number.startsWith(`${shloka.chapterCode}.`)
  ) {
    return `${shloka.partCode}.${shloka.number}`;
  }

  return `${locationCodes}.${shloka.number}`;
}

export function getShlokaExcerpt(text: string): string {
  const excerpt = text.replaceAll(/\s+/g, " ").trim();
  const graphemes = segmentGraphemes(excerpt);

  return graphemes.length > 96
    ? `${graphemes.slice(0, 93).join("")}...`
    : excerpt;
}

function formatRuCount(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;

  return `${count} ${word}`;
}
