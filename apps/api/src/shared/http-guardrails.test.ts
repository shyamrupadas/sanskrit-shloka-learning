import "reflect-metadata";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { Controller, Get, Module, Post } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import type { ApiConfig } from "./env.js";
import {
  type AccessLogEntry,
  configureHttpGuardrails,
  type HttpGuardrailOptions,
} from "./http-guardrails.js";

@Controller()
class GuardrailTestController {
  @Post("api/auth/login")
  login(): { ok: true } {
    return { ok: true };
  }

  @Post("api/auth/register")
  register(): { ok: true } {
    return { ok: true };
  }

  @Get("api/auth/session")
  session(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [GuardrailTestController] })
class GuardrailTestModule {}

const apiConfig = {
  databaseDirectUrl: "postgresql://api:direct-secret@ep-direct.neon.tech/app",
  databasePoolMax: 5,
  databaseUrl: "postgresql://api:pool-secret@ep-pooler.neon.tech/app",
  environment: "production",
  frontendOrigin: "https://app.example.com",
  host: "0.0.0.0",
  port: 3000,
} satisfies ApiConfig;

const openApplications: INestApplication[] = [];

afterEach(async () => {
  await Promise.all(openApplications.splice(0).map((app) => app.close()));
});

describe("HTTP guardrails", () => {
  test("allows only the configured browser origin and returns Helmet headers", async () => {
    const testApp = await startTestApplication();

    const preflightResponse = await fetch(`${testApp.url}/api/auth/login`, {
      headers: {
        "Access-Control-Request-Headers": "Content-Type, Authorization",
        "Access-Control-Request-Method": "POST",
        Origin: apiConfig.frontendOrigin,
      },
      method: "OPTIONS",
    });
    assert.equal(preflightResponse.status, 204);
    assert.equal(preflightResponse.headers.get("access-control-allow-origin"), apiConfig.frontendOrigin);
    assert.equal(preflightResponse.headers.get("access-control-allow-credentials"), null);
    assert.equal(
      preflightResponse.headers.get("access-control-allow-headers"),
      "Content-Type,Authorization",
    );
    assert.match(preflightResponse.headers.get("access-control-allow-methods") ?? "", /PATCH/);
    assert.equal(preflightResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(preflightResponse.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(preflightResponse.headers.get("content-security-policy"), null);

    const forbiddenOriginResponse = await fetch(`${testApp.url}/api/auth/session`, {
      headers: { Origin: "https://attacker.example.com" },
    });
    assert.equal(forbiddenOriginResponse.status, 200);
    assert.equal(forbiddenOriginResponse.headers.get("access-control-allow-origin"), null);

    const serverToServerResponse = await fetch(`${testApp.url}/api/auth/session`);
    assert.equal(serverToServerResponse.status, 200);
  });

  test("continues only safe request IDs and writes a secret-free structured access log", async () => {
    const testApp = await startTestApplication();
    const requestId = "018f47a2-34bc-7def-8abc-1234567890ab";
    const response = await fetch(`${testApp.url}/api/auth/login`, {
      body: JSON.stringify({ email: "learner@example.com", password: "password-secret" }),
      headers: {
        Authorization: "Bearer session-token-secret",
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      method: "POST",
    });
    await response.json();

    assert.equal(response.headers.get("x-request-id"), requestId);
    assert.equal(testApp.logs.length, 1);
    const accessLog = testApp.logs[0];
    assert.ok(accessLog);
    assert.equal(accessLog.method, "POST");
    assert.equal(accessLog.route, "/api/auth/login");
    assert.equal(accessLog.status, 201);
    assert.equal(accessLog.requestId, requestId);
    assert.ok(accessLog.durationMs >= 0);

    const serializedLog = JSON.stringify(accessLog);
    assert.doesNotMatch(serializedLog, /session-token-secret/);
    assert.doesNotMatch(serializedLog, /password-secret/);
    assert.doesNotMatch(serializedLog, /learner@example\.com/);

    const unsafeRequestId = "session-token-that-must-not-enter-logs";
    const regeneratedResponse = await fetch(`${testApp.url}/api/auth/session`, {
      headers: { "X-Request-Id": unsafeRequestId },
    });
    await regeneratedResponse.json();
    assert.notEqual(regeneratedResponse.headers.get("x-request-id"), unsafeRequestId);
    assert.doesNotMatch(JSON.stringify(testApp.logs), new RegExp(unsafeRequestId));
  });

  test("throttles only login and register and ignores spoofed forwarded addresses", async () => {
    const testApp = await startTestApplication({
      authRateLimit: { limit: 2, windowMs: 60_000 },
    });

    const firstResponse = await postWithSpoofedClientAddress(testApp.url, "/api/auth/login", "198.51.100.1");
    const secondResponse = await postWithSpoofedClientAddress(testApp.url, "/api/auth/login", "198.51.100.2");
    const limitedResponse = await postWithSpoofedClientAddress(testApp.url, "/api/auth/register", "198.51.100.3");

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(limitedResponse.status, 429);
    assert.match(limitedResponse.headers.get("ratelimit") ?? "", /r=0/);
    assert.equal(testApp.logs.at(-1)?.route, "/api/auth/register");
    assert.equal(testApp.logs.at(-1)?.status, 429);

    const sessionResponse = await fetch(`${testApp.url}/api/auth/session`, {
      headers: { "X-Forwarded-For": "198.51.100.4" },
    });
    assert.equal(sessionResponse.status, 200);
  });
});

async function startTestApplication(options: HttpGuardrailOptions = {}): Promise<{
  logs: AccessLogEntry[];
  url: string;
}> {
  const logs: AccessLogEntry[] = [];
  const app = await NestFactory.create(GuardrailTestModule, { logger: false });
  openApplications.push(app);
  configureHttpGuardrails(app, apiConfig, {
    ...options,
    writeAccessLog: (entry) => logs.push(entry),
  });
  await app.listen(0, "127.0.0.1");

  return { logs, url: await app.getUrl() };
}

async function postWithSpoofedClientAddress(
  url: string,
  path: string,
  address: string,
): Promise<Response> {
  return fetch(`${url}${path}`, {
    headers: {
      "X-Forwarded-For": address,
      "X-Real-IP": address,
    },
    method: "POST",
  });
}
