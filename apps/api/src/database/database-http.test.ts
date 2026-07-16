import "reflect-metadata";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { Controller, Get, Module } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { DatabaseUnavailableError } from "./database.service.js";

@Controller("database-errors")
class DatabaseErrorController {
  @Get("unavailable")
  unavailable(): never {
    throw new DatabaseUnavailableError();
  }

  @Get("unknown")
  unknown(): never {
    throw new Error("private database failure details");
  }
}

@Module({ controllers: [DatabaseErrorController] })
class DatabaseErrorTestModule {}

const openApplications: INestApplication[] = [];

afterEach(async () => {
  await Promise.all(openApplications.splice(0).map((app) => app.close()));
});

describe("database HTTP failure mapping", () => {
  test("maps database unavailability to a safe 503 and keeps unknown errors as safe 500", async () => {
    const app = await NestFactory.create(DatabaseErrorTestModule, { logger: false });
    openApplications.push(app);
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();

    const unavailableResponse = await fetch(`${url}/database-errors/unavailable`);
    const unavailableBody = await unavailableResponse.json();
    const unknownResponse = await fetch(`${url}/database-errors/unknown`);
    const unknownBody = await unknownResponse.json();

    assert.equal(unavailableResponse.status, 503);
    assert.deepEqual(unavailableBody, {
      error: "Service Unavailable",
      message: "Database temporarily unavailable",
      statusCode: 503,
    });
    assert.equal(unknownResponse.status, 500);
    assert.deepEqual(unknownBody, {
      message: "Internal server error",
      statusCode: 500,
    });
    assert.doesNotMatch(JSON.stringify([unavailableBody, unknownBody]), /private database failure details/);
  });
});
