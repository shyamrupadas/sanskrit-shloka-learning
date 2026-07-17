import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("generated OpenAPI admin contract", () => {
  test("exposes catalog editing routes without delete, publish, hide, or import APIs", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const paths = openApi.paths ?? {};

    assert.ok(paths["/api/admin/catalog"]?.get);
    assert.ok(paths["/api/admin/sources/{sourceCode}"]?.get);
    assert.ok(paths["/api/admin/sources/{sourceCode}"]?.patch);
    assert.ok(paths["/api/admin/shlokas/{shlokaCode}"]?.get);
    assert.ok(paths["/api/admin/shlokas/{shlokaCode}"]?.patch);

    for (const [path, methods] of Object.entries(paths)) {
      const lowerPath = path.toLowerCase();
      assert.equal(methods.delete, undefined, `${path} must not expose DELETE`);
      assert.equal(lowerPath.includes("publish"), false, `${path} must not expose publish APIs`);
      assert.equal(lowerPath.includes("hide"), false, `${path} must not expose hide APIs`);
      assert.equal(lowerPath.includes("import"), false, `${path} must not expose import APIs`);
    }
  });

  test("restricts source part and chapter codes to digits", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const schemas = openApi.components?.schemas ?? {};
    const locationCodeRef = "#/components/schemas/SanskritShlokaLearning.SourceLocationCode";

    assert.equal(schemas["SanskritShlokaLearning.SourceLocationCode"]?.pattern, "^[0-9]+$");
    assert.equal(
      schemas["SanskritShlokaLearning.CreateSourcePartRequest"]?.properties?.code?.$ref,
      locationCodeRef,
    );
    assert.equal(
      schemas["SanskritShlokaLearning.CreateSourceChapterRequest"]?.properties?.code?.$ref,
      locationCodeRef,
    );
  });
});

describe("generated OpenAPI account settings contract", () => {
  test("exposes authenticated read and update operations for hard mode", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const settingsPath = openApi.paths?.["/api/account/settings"];

    assert.ok(settingsPath?.get);
    assert.ok(settingsPath?.patch);
    assert.equal(settingsPath.get.parameters?.[0]?.name, "authorization");
    assert.equal(settingsPath.patch.parameters?.[0]?.name, "authorization");
    assert.equal(
      settingsPath.patch.requestBody?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.UpdateAccountSettingsRequest",
    );
  });
});

describe("generated OpenAPI learning contract", () => {
  test("exposes the authenticated learning transition with the user timezone", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const operation = openApi.paths?.["/api/library/items/{shlokaCode}/complete-learning"]?.post;

    assert.ok(operation);
    assert.equal(operation.parameters?.[0]?.name, "shlokaCode");
    assert.equal(operation.parameters?.[1]?.name, "authorization");
    assert.equal(
      operation.requestBody?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.CompleteLearningRequestBody",
    );
    assert.equal(
      operation.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.CompleteLearningDto",
    );
  });
});

describe("generated OpenAPI review completion contract", () => {
  test("exposes the authenticated command with result and user timezone", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const operation = openApi.paths?.["/api/library/items/{shlokaCode}/complete-review"]?.post;

    assert.ok(operation);
    assert.deepEqual(
      operation.parameters?.map(({ name }) => name),
      ["shlokaCode", "authorization"],
    );
    assert.equal(
      operation.requestBody?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.CompleteReviewRequest",
    );
    assert.equal(
      operation.responses?.["201"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.CompletedReviewDto",
    );
  });
});

describe("generated OpenAPI dashboard list contract", () => {
  test("exposes independently limited learning and review lists with user timezone", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const learning = openApi.paths?.["/api/dashboard/learning-shlokas"]?.get;
    const review = openApi.paths?.["/api/dashboard/review-shlokas"]?.get;

    assert.ok(learning);
    assert.ok(review);
    assert.deepEqual(
      learning.parameters?.map(({ in: location, name, required }) => ({ location, name, required })),
      [
        { location: "query", name: "limit", required: false },
        { location: "header", name: "authorization", required: false },
      ],
    );
    assert.deepEqual(
      review.parameters?.map(({ in: location, name, required }) => ({ location, name, required })),
      [
        { location: "query", name: "timeZone", required: true },
        { location: "query", name: "limit", required: false },
        { location: "header", name: "authorization", required: false },
      ],
    );
    assert.equal(
      learning.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.DashboardLearningShlokaListDto",
    );
    assert.equal(
      review.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.DashboardReviewShlokaListDto",
    );
  });
});

describe("generated OpenAPI dashboard streak contract", () => {
  test("exposes the authenticated streak query with the user timezone", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const operation = openApi.paths?.["/api/dashboard/streak"]?.get;

    assert.ok(operation);
    assert.deepEqual(
      operation.parameters?.map(({ in: location, name, required }) => ({ location, name, required })),
      [
        { location: "query", name: "timeZone", required: true },
        { location: "header", name: "authorization", required: false },
      ],
    );
    assert.equal(
      operation.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.DashboardStreakDto",
    );
  });
});
