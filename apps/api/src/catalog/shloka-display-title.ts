export interface ShlokaDisplayTitleInput {
  chapterTitle?: string | undefined;
  number: string;
  partTitle?: string | undefined;
  sourceTitle: string;
}

export function formatShlokaDisplayTitle({
  chapterTitle,
  number,
  partTitle,
  sourceTitle,
}: ShlokaDisplayTitleInput): string {
  const numericChapterTitle = chapterTitle?.trim();
  if (
    !partTitle &&
    numericChapterTitle &&
    /^\d+(?:\.\d+)*$/u.test(numericChapterTitle)
  ) {
    const reference = number.startsWith(`${numericChapterTitle}.`)
      ? number
      : `${numericChapterTitle}.${number}`;

    return `${sourceTitle} ${reference}`;
  }

  const titleSegments = [sourceTitle, partTitle, chapterTitle].filter(
    (segment): segment is string => Boolean(segment),
  );

  return `${titleSegments.join(", ")} ${number}`;
}
