import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { formatShlokaDisplayTitle } from "./shloka-display-title.js";

describe("formatShlokaDisplayTitle", () => {
  test("joins a numeric chapter code and shloka number with a dot", () => {
    assert.equal(
      formatShlokaDisplayTitle({
        chapterCode: "1",
        number: "1",
        sourceTitle: "Бхагавад-гита",
      }),
      "Бхагавад-гита 1.1",
    );
    assert.equal(
      formatShlokaDisplayTitle({
        chapterCode: "2",
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

  test("joins numeric part, chapter, and shloka codes without commas", () => {
    assert.equal(
      formatShlokaDisplayTitle({
        chapterCode: "3",
        number: "5",
        partCode: "1",
        sourceTitle: "Srimad Bhagavatam",
      }),
      "Srimad Bhagavatam 1.3.5",
    );
  });
});
