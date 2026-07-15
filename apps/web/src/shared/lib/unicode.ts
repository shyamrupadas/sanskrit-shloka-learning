const graphemeSegmenter = new Intl.Segmenter("ru", {
  granularity: "grapheme",
});

const combiningMarks = /\p{M}+/gu;

export function segmentGraphemes(value: string): string[] {
  return Array.from(
    graphemeSegmenter.segment(value),
    ({ segment }) => segment,
  );
}

export function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("ru")
    .normalize("NFD")
    .replace(combiningMarks, "");
}
