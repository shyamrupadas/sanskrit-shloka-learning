import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ApiConfigurationError, loadApiConfig } from "./env.js";

const productionEnvironment = {
  DATABASE_DIRECT_URL: "postgresql://api:direct-secret@ep-direct.neon.tech/app?sslmode=require",
  DATABASE_POOL_MAX: "7",
  DATABASE_URL: "postgresql://api:pool-secret@ep-pooler.neon.tech/app?sslmode=require",
  FRONTEND_ORIGIN: "https://app.example.com",
  NODE_ENV: "production",
  PORT: "4321",
} satisfies NodeJS.ProcessEnv;

describe("loadApiConfig", () => {
  test("parses a complete production environment without reading dotenv", () => {
    let dotenvLoads = 0;
    const environment = { ...productionEnvironment };

    const apiConfig = loadApiConfig(environment, {
      loadLocalEnvironment: () => {
        dotenvLoads += 1;
      },
    });

    assert.equal(dotenvLoads, 0);
    assert.deepEqual(apiConfig, {
      databaseDirectUrl: productionEnvironment.DATABASE_DIRECT_URL,
      databasePoolMax: 7,
      databaseUrl: productionEnvironment.DATABASE_URL,
      environment: "production",
      frontendOrigin: "https://app.example.com",
      host: "0.0.0.0",
      port: 4321,
    });
  });

  test("requires every production-only value and does not expose environment contents", () => {
    const environment = {
      DATABASE_URL: "postgresql://api:do-not-log@ep-pooler.neon.tech/app",
      NODE_ENV: "production",
    };

    assert.throws(
      () => loadApiConfig(environment),
      (error: unknown) => {
        assert.ok(error instanceof ApiConfigurationError);
        assert.match(error.message, /PORT is required/);
        assert.match(error.message, /FRONTEND_ORIGIN is required/);
        assert.match(error.message, /DATABASE_DIRECT_URL is required/);
        assert.doesNotMatch(error.message, /do-not-log/);
        return true;
      },
    );
  });

  test("loads local dotenv values and keeps local defaults in development and test", () => {
    for (const mode of ["development", "test"] as const) {
      const environment: NodeJS.ProcessEnv = { NODE_ENV: mode };
      let dotenvLoads = 0;

      const apiConfig = loadApiConfig(environment, {
        loadLocalEnvironment: (target) => {
          dotenvLoads += 1;
          target.PORT = "3100";
        },
      });

      assert.equal(dotenvLoads, 1);
      assert.equal(apiConfig.environment, mode);
      assert.equal(apiConfig.port, 3100);
      assert.equal(apiConfig.frontendOrigin, "http://localhost:5173");
      assert.equal(apiConfig.databasePoolMax, 5);
      assert.equal(
        apiConfig.databaseDirectUrl,
        "postgresql://postgres:postgres@localhost:5432/sanskrit_shloka_learning",
      );
      assert.equal(environment.DATABASE_URL, apiConfig.databaseUrl);
    }
  });

  test("rejects invalid modes, ports, origins, and database URLs", () => {
    const invalidEnvironments: Array<[string, NodeJS.ProcessEnv, RegExp]> = [
      ["mode", { ...productionEnvironment, NODE_ENV: "staging" }, /NODE_ENV/],
      ["port", { ...productionEnvironment, PORT: "3000oops" }, /PORT/],
      ["pool maximum", { ...productionEnvironment, DATABASE_POOL_MAX: "0" }, /DATABASE_POOL_MAX/],
      [
        "origin path",
        { ...productionEnvironment, FRONTEND_ORIGIN: "https://app.example.com/login" },
        /FRONTEND_ORIGIN/,
      ],
      [
        "origin wildcard",
        { ...productionEnvironment, FRONTEND_ORIGIN: "https://*.example.com" },
        /FRONTEND_ORIGIN/,
      ],
      ["pooled URL", { ...productionEnvironment, DATABASE_URL: "https://db.example.com/app" }, /DATABASE_URL/],
      [
        "direct Neon runtime URL",
        { ...productionEnvironment, DATABASE_URL: "postgresql://api:secret@ep-direct.neon.tech/app" },
        /pooled Neon endpoint/,
      ],
      [
        "direct URL",
        { ...productionEnvironment, DATABASE_DIRECT_URL: "not-a-url" },
        /DATABASE_DIRECT_URL/,
      ],
      [
        "pooled migration URL",
        {
          ...productionEnvironment,
          DATABASE_DIRECT_URL: "postgresql://api:secret@ep-migrations-pooler.neon.tech/app",
        },
        /must not use a pooled endpoint/,
      ],
      [
        "shared production URL",
        { ...productionEnvironment, DATABASE_DIRECT_URL: productionEnvironment.DATABASE_URL },
        /separate direct database endpoint/,
      ],
    ];

    for (const [scenario, environment, expectedMessage] of invalidEnvironments) {
      assert.throws(
        () => loadApiConfig(environment),
        expectedMessage,
        `expected ${scenario} to be rejected`,
      );
    }
  });
});
