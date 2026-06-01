import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { InMemoryAccountRepository } from "../accounts/in-memory-account.repository.js";
import { AuthService } from "../auth/auth.service.js";
import { PasswordHasher } from "../auth/password-hasher.js";
import { ApiHandlersService } from "./api-handlers.service.js";

describe("ApiHandlersService auth", () => {
  test("rejects registration passwords shorter than six characters", async () => {
    const handlers = createHandlers();

    const response = await handlers.register({
      body: {
        email: "learner@example.com",
        password: "12345",
        passwordConfirmation: "12345",
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.deepEqual(response.body.details, ["Пароль должен быть не короче 6 символов"]);
  });

  test("rejects mismatched password confirmation", async () => {
    const handlers = createHandlers();

    const response = await handlers.register({
      body: {
        email: "learner@example.com",
        password: "123456",
        passwordConfirmation: "abcdef",
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.deepEqual(response.body.details, ["Пароль и подтверждение должны совпадать"]);
  });

  test("registers, returns the current session, and logs out", async () => {
    const handlers = createHandlers();

    const registerResponse = await handlers.register({
      body: {
        email: "Learner@Example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.account.email, "learner@example.com");
    assert.ok(registerResponse.body.accessToken.length > 20);

    const authorization = `Bearer ${registerResponse.body.accessToken}`;
    const sessionResponse = await handlers.getSession({ authorization });
    assert.equal(sessionResponse.status, 200);
    assert.equal(sessionResponse.body.account.email, "learner@example.com");

    const logoutResponse = await handlers.logout({ authorization });
    assert.equal(logoutResponse.status, 204);

    const expiredSessionResponse = await handlers.getSession({ authorization });
    assert.equal(expiredSessionResponse.status, 401);
  });

  test("uses a generic login error for missing email and wrong password", async () => {
    const handlers = createHandlers();

    await handlers.register({
      body: {
        email: "learner@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });

    const missingEmailResponse = await handlers.login({
      body: {
        email: "missing@example.com",
        password: "123456",
      },
    });
    const wrongPasswordResponse = await handlers.login({
      body: {
        email: "learner@example.com",
        password: "abcdef",
      },
    });

    assert.equal(missingEmailResponse.status, 401);
    assert.equal(wrongPasswordResponse.status, 401);
    assert.deepEqual(missingEmailResponse.body, wrongPasswordResponse.body);
    assert.equal(missingEmailResponse.body.message, "Неверный email или пароль");
  });

  test("rejects duplicate registrations", async () => {
    const handlers = createHandlers();

    const body = {
      email: "learner@example.com",
      password: "123456",
      passwordConfirmation: "123456",
    };

    assert.equal((await handlers.register({ body })).status, 201);

    const duplicateResponse = await handlers.register({ body });
    assert.equal(duplicateResponse.status, 409);
    assert.equal(duplicateResponse.body.code, "EMAIL_ALREADY_REGISTERED");
  });
});

describe("ApiHandlersService protected resources", () => {
  test("requires authorization for dashboard and library", async () => {
    const handlers = createHandlers();

    const dashboardResponse = await handlers.getDashboard({});
    const libraryResponse = await handlers.getLibrary({});

    assert.equal(dashboardResponse.status, 401);
    assert.equal(libraryResponse.status, 401);
  });

  test("returns empty dashboard and library for a new account", async () => {
    const handlers = createHandlers();

    const registerResponse = await handlers.register({
      body: {
        email: "learner@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });

    assert.equal(registerResponse.status, 201);
    const authorization = `Bearer ${registerResponse.body.accessToken}`;

    const dashboardResponse = await handlers.getDashboard({ authorization });
    assert.equal(dashboardResponse.status, 200);
    assert.deepEqual(dashboardResponse.body, {
      hasPersonalShlokas: false,
      showStreak: false,
      showReviewBlock: false,
      primaryAction: {
        label: "Добавить",
        target: "/library",
      },
    });

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.equal(libraryResponse.body.defaultTab, "reviewing");
    assert.deepEqual(
      libraryResponse.body.tabs.map((tab) => tab.id),
      ["reviewing", "learning", "all"],
    );
  });
});

function createHandlers(): ApiHandlersService {
  const accounts = new InMemoryAccountRepository();
  const passwordHasher = new PasswordHasher();
  const auth = new AuthService(accounts, passwordHasher);

  return new ApiHandlersService(auth);
}
