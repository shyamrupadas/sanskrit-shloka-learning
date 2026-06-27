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
