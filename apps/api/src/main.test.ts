import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { INestApplication } from "@nestjs/common";

import { ApiConfigurationError } from "./shared/env.js";
import { bootstrap, formatStartupError } from "./main.js";

const validEnvironment = {
  DATABASE_DIRECT_URL: "postgresql://api:direct-secret@ep-direct.neon.tech/app",
  DATABASE_URL: "postgresql://api:pool-secret@ep-pooler.neon.tech/app",
  FRONTEND_ORIGIN: "https://app.example.com",
  NODE_ENV: "production",
  PORT: "4567",
} satisfies NodeJS.ProcessEnv;

describe("bootstrap", () => {
  test("fails before application creation when production configuration is invalid", async () => {
    let applicationCreated = false;

    await assert.rejects(
      bootstrap({
        createApplication: async () => {
          applicationCreated = true;
          return createFakeApplication().app;
        },
        environment: { NODE_ENV: "production" },
      }),
      ApiConfigurationError,
    );

    assert.equal(applicationCreated, false);
  });

  test("binds the validated Railway port on all interfaces", async () => {
    const fakeApplication = createFakeApplication();
    let receivedDatabaseConfig: { databasePoolMax: number; databaseUrl: string } | undefined;

    await bootstrap({
      createApplication: async (apiConfig) => {
        receivedDatabaseConfig = {
          databasePoolMax: apiConfig.databasePoolMax,
          databaseUrl: apiConfig.databaseUrl,
        };
        return fakeApplication.app;
      },
      environment: { ...validEnvironment },
    });

    assert.deepEqual(receivedDatabaseConfig, {
      databasePoolMax: 5,
      databaseUrl: validEnvironment.DATABASE_URL,
    });
    assert.deepEqual(fakeApplication.shutdownHookCalls, [["SIGTERM"]]);
    assert.deepEqual(fakeApplication.listenCalls, [{ host: "0.0.0.0", port: 4567 }]);
  });

  test("keeps unexpected startup errors and their secrets out of the startup log", () => {
    const logLine = formatStartupError(
      new Error("connection failed for postgresql://api:database-secret@example.com/app"),
    );

    assert.deepEqual(JSON.parse(logLine), {
      event: "startup_failed",
      level: "error",
      message: "API failed to start",
    });
    assert.doesNotMatch(logLine, /database-secret/);
  });
});

function createFakeApplication(): {
  app: INestApplication;
  listenCalls: Array<{ host: string; port: number }>;
  shutdownHookCalls: string[][];
} {
  const listenCalls: Array<{ host: string; port: number }> = [];
  const shutdownHookCalls: string[][] = [];
  const expressApplication = { set: () => undefined };
  const app = {
    enableCors: () => undefined,
    enableShutdownHooks: (signals: string[]) => {
      shutdownHookCalls.push(signals);
    },
    getHttpAdapter: () => ({ getInstance: () => expressApplication }),
    listen: async (port: number, host: string) => {
      listenCalls.push({ host, port });
    },
    use: () => app,
  } as unknown as INestApplication;

  return { app, listenCalls, shutdownHookCalls };
}
