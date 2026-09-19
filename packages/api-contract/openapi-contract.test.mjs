import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("generated OpenAPI admin contract", () => {
  test("exposes authorized adjacent moves and permanent deletion with confirmed lists", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const move = openApi.paths["/api/admin/learning/tips/{tipId}/move"]?.post;
    const remove = openApi.paths["/api/admin/learning/tips/{tipId}"]?.delete;
    for (const operation of [move, remove]) {
      assert.ok(operation);
      assert.ok(operation.parameters.some((parameter) => parameter.name === "authorization"));
      assert.ok(operation.parameters.some((parameter) => parameter.name === "tipId" && parameter.required));
      for (const status of ["200", "401", "403", "404"]) assert.ok(operation.responses[status]);
      assert.equal(operation.responses["200"].content["application/json"].schema.$ref, "#/components/schemas/SanskritShlokaLearning.LearningTipListDto");
    }
    assert.ok(move.responses["400"]);
    assert.deepEqual(openApi.components.schemas["SanskritShlokaLearning.MoveLearningTipRequest"].properties.direction.enum, ["up", "down"]);
  });
  test("publishes complete tips with bounded fields and admin authorization responses", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    for (const operation of [openApi.paths["/api/admin/learning/tips"].post, openApi.paths["/api/admin/learning/tips/{tipId}"].patch]) {
      assert.ok(operation.parameters.some((parameter) => parameter.name === "authorization"));
      for (const status of ["400", "401", "403"]) assert.ok(operation.responses[status]);
      assert.equal(operation.requestBody.content["application/json"].schema.$ref, "#/components/schemas/SanskritShlokaLearning.SaveLearningTipRequest");
    }
    const schema = openApi.components.schemas["SanskritShlokaLearning.SaveLearningTipRequest"];
    assert.deepEqual(schema.required, ["title", "text"]);
    assert.deepEqual(Object.keys(schema.properties), ["title", "text"]);
    assert.equal(schema.properties.title.maxLength, 120);
    assert.equal(schema.properties.text.maxLength, 2000);
    assert.equal(schema.properties.title.minLength, 1);
    assert.equal(schema.properties.text.minLength, 1);
  });
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
      if (path !== "/api/admin/learning/tips/{tipId}") assert.equal(methods.delete, undefined, `${path} must not expose DELETE`);
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

describe("generated OpenAPI library shloka contract", () => {
  test("separates the detailed shloka response from compact library responses", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const schemas = openApi.components?.schemas ?? {};
    const itemPath = openApi.paths?.["/api/library/items/{shlokaCode}"];
    const detailsSchema = schemas["SanskritShlokaLearning.LibraryShlokaDetailsDto"];
    const compactSchema = schemas["SanskritShlokaLearning.LibraryShlokaDto"];

    assert.equal(
      itemPath?.get?.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.LibraryShlokaDetailsDto",
    );
    assert.equal(
      itemPath?.get?.responses?.["500"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.DataIntegrityApiError",
    );
    assert.deepEqual(
      schemas["SanskritShlokaLearning.DataIntegrityApiError"]?.properties?.code?.enum,
      ["DATA_INTEGRITY_ERROR"],
    );
    assert.ok(detailsSchema?.required?.includes("padas"));
    assert.ok(detailsSchema?.required?.includes("code"));
    assert.equal(detailsSchema?.properties?.text?.type, "string");
    assert.deepEqual(detailsSchema?.properties?.padas, {
      items: { $ref: "#/components/schemas/SanskritShlokaLearning.NonEmptyString" },
      maxItems: 4,
      minItems: 4,
      type: "array",
    });
    assert.deepEqual(schemas["SanskritShlokaLearning.NonEmptyString"], {
      minLength: 1,
      type: "string",
    });
    assert.equal(compactSchema?.properties?.padas, undefined);
    assert.ok(schemas["SanskritShlokaLearning.ErrorCode"]?.enum?.includes("DATA_INTEGRITY_ERROR"));

    assert.equal(
      schemas["SanskritShlokaLearning.LibraryResponseDto"]?.properties?.allShlokas?.items?.$ref,
      "#/components/schemas/SanskritShlokaLearning.LibraryShlokaDto",
    );
    assert.equal(
      itemPath?.patch?.responses?.["200"]?.content?.["application/json"]?.schema?.$ref,
      "#/components/schemas/SanskritShlokaLearning.LibraryShlokaDto",
    );
    assert.equal(
      schemas["SanskritShlokaLearning.CompleteLearningDto"]?.properties?.shloka?.$ref,
      "#/components/schemas/SanskritShlokaLearning.LibraryShlokaDto",
    );
    assert.equal(
      schemas["SanskritShlokaLearning.CompleteLearningDto"]?.properties?.remainingLearningShlokas?.items?.$ref,
      "#/components/schemas/SanskritShlokaLearning.LibraryShlokaDto",
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
  test("exposes the authenticated streak query with the user timezone and five-day history", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const operation = openApi.paths?.["/api/dashboard/streak"]?.get;
    const schemas = openApi.components?.schemas ?? {};

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
    assert.deepEqual(
      schemas["SanskritShlokaLearning.DashboardStreakDto"]?.required,
      ["days", "continuedToday", "history"],
    );
    assert.deepEqual(
      schemas["SanskritShlokaLearning.DashboardStreakDto"]?.properties?.history,
      {
        items: {
          $ref: "#/components/schemas/SanskritShlokaLearning.DashboardStreakHistoryDayDto",
        },
        maxItems: 5,
        minItems: 5,
        type: "array",
      },
    );
    assert.deepEqual(
      schemas["SanskritShlokaLearning.DashboardStreakHistoryDayDto"]?.required,
      ["userDay", "hasActivity"],
    );
    assert.equal(
      schemas["SanskritShlokaLearning.DashboardStreakHistoryDayDto"]?.properties?.userDay?.format,
      "date",
    );
    assert.equal(
      schemas["SanskritShlokaLearning.DashboardStreakHistoryDayDto"]?.properties?.hasActivity?.type,
      "boolean",
    );
  });
});

describe("generated OpenAPI learning tips contract", () => {
  test("exposes an authenticated ordered list without locale negotiation", async () => {
    const openApi = JSON.parse(await readFile(new URL("./generated/openapi/openapi.json", import.meta.url), "utf8"));
    const operation = openApi.paths?.["/api/learning/tips"]?.get;
    assert.ok(operation);
    assert.deepEqual(operation.parameters.map(({ name, in: location }) => ({ name, location })), [
      { name: "authorization", location: "header" },
    ]);
    assert.ok(operation.responses["401"]);
    assert.equal(operation.responses["200"].content["application/json"].schema.$ref,
      "#/components/schemas/SanskritShlokaLearning.LearningTipListDto");
    const schemas = openApi.components.schemas;
    assert.deepEqual(schemas["SanskritShlokaLearning.LearningTipDto"].required, ["id", "title", "text"]);
    assert.equal(schemas["SanskritShlokaLearning.LearningTipDto"].properties.title.maxLength, 120);
    assert.equal(schemas["SanskritShlokaLearning.LearningTipDto"].properties.text.maxLength, 2000);
  });
});
