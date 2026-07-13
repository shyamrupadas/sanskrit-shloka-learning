import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { formatShlokaDisplayTitle } from "./shloka-display-title.js";

describe("formatShlokaDisplayTitle", () => {
  test("joins a chapter and shloka number with a dot", () => {
    assert.equal(
      formatShlokaDisplayTitle({
        chapterTitle: "1",
        number: "1",
        sourceTitle: "Бхагавад-гита",
      }),
      "Бхагавад-гита 1.1",
    );
    assert.equal(
      formatShlokaDisplayTitle({
        chapterTitle: "2",
        number: "2.47",
        sourceTitle: "Бхагавад-гита",
      }),
      "Бхагавад-гита 2.47",
    );
  });

  test("keeps titles without chapters compact", () => {
    assert.equal(
      formatShlokaDisplayTitle({
        number: "1",
        sourceTitle: "Иша-упанишада",
      }),
      "Иша-упанишада 1",
    );
  });

  test("keeps descriptive and nested source locations unchanged", () => {
    assert.equal(
      formatShlokaDisplayTitle({
        chapterTitle: "Chapter 1",
        number: "1",
        partTitle: "Canto 1",
        sourceTitle: "Srimad Bhagavatam",
      }),
      "Srimad Bhagavatam, Canto 1, Chapter 1 1",
    );
  });
});
