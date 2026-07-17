export interface ShlokaDisplayTitleInput {
  chapterCode?: string | undefined;
  number: string;
  partCode?: string | undefined;
  sourceTitle: string;
}

export function formatShlokaDisplayTitle({
  chapterCode,
  number,
  partCode,
  sourceTitle,
}: ShlokaDisplayTitleInput): string {
  const normalizedPartCode = partCode?.trim();
  const normalizedChapterCode = chapterCode?.trim();
  const locationCodes = [normalizedPartCode, normalizedChapterCode].filter(
    (segment): segment is string => Boolean(segment),
  );
  const locationPrefix = locationCodes.join(".");
  let reference = number;

  if (locationPrefix && !number.startsWith(`${locationPrefix}.`)) {
    reference =
      normalizedPartCode &&
      normalizedChapterCode &&
      number.startsWith(`${normalizedChapterCode}.`)
        ? `${normalizedPartCode}.${number}`
        : `${locationPrefix}.${number}`;
  }

  return `${sourceTitle} ${reference}`;
}
