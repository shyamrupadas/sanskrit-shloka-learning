import "reflect-metadata";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { type DynamicModule, Module } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { DatabaseService } from "../database/database.service.js";
import { HealthController } from "./health.controller.js";

@Module({})
class HealthTestModule {
  static forDatabase(database: Pick<DatabaseService, "checkReadiness">): DynamicModule {
    return {
      module: HealthTestModule,
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: database }],
    };
  }
}

const openApplications: INestApplication[] = [];

afterEach(async () => {
  await Promise.all(openApplications.splice(0).map((app) => app.close()));
});

describe("health HTTP endpoints", () => {
  test("returns live without checking the database", async () => {
    const database = new FakeReadinessDatabase();
    const url = await startHealthApplication(database);

    const response = await fetch(`${url}/health/live`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.equal(database.checks, 0);
  });

  test("returns ready only after the database check succeeds", async () => {
    const database = new FakeReadinessDatabase();
    const url = await startHealthApplication(database);

    const response = await fetch(`${url}/health/ready`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.equal(database.checks, 1);
  });

  test("returns a safe 503 for timeout and connection failures", async () => {
    const database = new FakeReadinessDatabase();
    const url = await startHealthApplication(database);

    for (const error of [
      new Error("Query read timeout with private SQL"),
      new Error("connection failed for postgresql://api:database-secret@example.com/app"),
    ]) {
      database.failure = error;
      const response = await fetch(`${url}/health/ready`);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.deepEqual(body, { status: "unavailable" });
      assert.doesNotMatch(JSON.stringify(body), /private SQL|database-secret|postgresql/);
    }
    assert.equal(database.checks, 2);
  });
});

class FakeReadinessDatabase {
  checks = 0;
  failure: unknown;

  async checkReadiness(): Promise<void> {
    this.checks += 1;
    if (this.failure !== undefined) {
      throw this.failure;
    }
  }
}

async function startHealthApplication(database: FakeReadinessDatabase): Promise<string> {
  const app = await NestFactory.create(HealthTestModule.forDatabase(database), { logger: false });
  openApplications.push(app);
  await app.listen(0, "127.0.0.1");
  return app.getUrl();
}
