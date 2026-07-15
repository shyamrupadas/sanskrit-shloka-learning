import { describe, expect, it } from "vitest";

import { getShlokaExcerpt } from "./catalog-formatters";

describe("catalog formatters", () => {
  it("keeps the excerpt limit and ellipsis without splitting a grapheme", () => {
    const prefix = "а".repeat(92);

    expect(getShlokaExcerpt(`${prefix}р̣${"б".repeat(4)}`)).toBe(
      `${prefix}р̣...`,
    );
  });
});
