import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { InMemoryAccountRepository } from "../accounts/in-memory-account.repository.js";
import { AuthService } from "../auth/auth.service.js";
import { PasswordHasher } from "../auth/password-hasher.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { InMemoryCatalogRepository } from "../catalog/in-memory-catalog.repository.js";
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
    assert.deepEqual(sessionResponse.body.account.roles, []);

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
    assert.deepEqual(libraryResponse.body.allShlokas, []);
  });
});

describe("ApiHandlersService admin catalog", () => {
  test("rejects admin APIs for unauthenticated and regular users", async () => {
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

    assert.equal((await handlers.sources({ body: validSourceRequest() })).status, 401);
    assert.equal((await handlers.sources({ authorization, body: validSourceRequest() })).status, 403);
  });

  test("lets admins keep normal user behavior and create all source structures", async () => {
    const handlers = createHandlers();
    const registerResponse = await handlers.register({
      body: {
        email: "admin@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });
    assert.equal(registerResponse.status, 201);
    handlers.accounts.grantRole(registerResponse.body.account.id, "admin");
    const authorization = `Bearer ${registerResponse.body.accessToken}`;

    const sessionResponse = await handlers.getSession({ authorization });
    assert.equal(sessionResponse.status, 200);
    assert.deepEqual(sessionResponse.body.account.roles, ["admin"]);
    assert.equal((await handlers.getDashboard({ authorization })).status, 200);

    assert.equal(
      (await handlers.sources({
        authorization,
        body: validSourceRequest({ code: "free", structureType: "none" }),
      })).status,
      201,
    );
    assert.equal(
      (await handlers.sources({
        authorization,
        body: validSourceRequest({
          code: "chapters",
          structureType: "chapters",
          chapters: [{ code: "one", title: "Глава 1", order: 1 }],
        }),
      })).status,
      201,
    );
    assert.equal(
      (await handlers.sources({
        authorization,
        body: validSourceRequest({
          code: "parts",
          structureType: "parts",
          parts: [
            {
              code: "part-one",
              title: "Часть 1",
              order: 1,
              chapters: [{ code: "chapter-one", title: "Глава 1", order: 1 }],
            },
          ],
        }),
      })).status,
      201,
    );
  });

  test("validates source metadata and duplicate source codes", async () => {
    const { authorization, handlers } = await createAdminHandlers();

    const invalidResponse = await handlers.sources({
      authorization,
      body: {
        code: "Bad Code",
        title: "",
        structureType: "chapters",
        chapters: [],
      },
    });

    assert.equal(invalidResponse.status, 400);
    assert.ok(invalidResponse.body.details?.includes("Название источника обязательно"));
    assert.ok(invalidResponse.body.details?.includes("Добавьте хотя бы одну главу"));

    assert.equal((await handlers.sources({ authorization, body: validSourceRequest() })).status, 201);
    assert.equal((await handlers.sources({ authorization, body: validSourceRequest() })).status, 409);
  });

  test("creates valid shlokas, orders padas, and exposes them in library order", async () => {
    const { authorization, handlers } = await createAdminHandlers();

    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        title: "Бхагавад-гита",
        structureType: "chapters",
        chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
      }),
    });
    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "amrita",
        title: "Амрита",
        structureType: "none",
      }),
    });

    const first = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-2",
        number: "2.47",
        padas: ["карманй эвадхикарас те", "ма пхалешу кадачана"],
        fullTranslation: "Только на действие у тебя право.",
      },
    });
    const second = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "amrita",
        number: "1",
        padas: ["первая пада"],
      },
    });

    assert.equal(first.status, 201);
    assert.equal(first.body.code, "gita-chapter-2-2-47");
    assert.equal(first.body.text, "карманй эвадхикарас те\nма пхалешу кадачана");
    assert.equal(first.body.fullTranslation, "Только на действие у тебя право.");
    assert.equal(second.status, 201);

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.deepEqual(
      libraryResponse.body.allShlokas.map((shloka) => shloka.code),
      ["amrita-1", "gita-chapter-2-2-47"],
    );
  });

  test("validates shloka structure, required first pada, and unique reference", async () => {
    const { authorization, handlers } = await createAdminHandlers();
    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        structureType: "chapters",
        chapters: [{ code: "chapter-1", title: "Глава 1", order: 1 }],
      }),
    });

    const invalidResponse = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        number: "1",
        padas: [],
      },
    });

    assert.equal(invalidResponse.status, 400);
    assert.ok(invalidResponse.body.details?.includes("Первая пада обязательна"));
    assert.ok(invalidResponse.body.details?.includes("Выберите главу"));

    const request = {
      sourceCode: "gita",
      chapterCode: "chapter-1",
      number: "1",
      padas: ["первая пада"],
    };

    assert.equal((await handlers.shlokas({ authorization, body: request })).status, 201);
    assert.equal((await handlers.shlokas({ authorization, body: request })).status, 409);
  });
});

type TestHandlers = ApiHandlersService & {
  accounts: InMemoryAccountRepository;
};

function createHandlers(): TestHandlers {
  const accounts = new InMemoryAccountRepository();
  const passwordHasher = new PasswordHasher();
  const auth = new AuthService(accounts, passwordHasher);
  const catalog = new CatalogService(new InMemoryCatalogRepository());

  return Object.assign(new ApiHandlersService(auth, catalog), { accounts });
}

async function createAdminHandlers(): Promise<{
  authorization: string;
  handlers: TestHandlers;
}> {
  const handlers = createHandlers();
  const registerResponse = await handlers.register({
    body: {
      email: "admin@example.com",
      password: "123456",
      passwordConfirmation: "123456",
    },
  });
  assert.equal(registerResponse.status, 201);
  handlers.accounts.grantRole(registerResponse.body.account.id, "admin");

  return {
    authorization: `Bearer ${registerResponse.body.accessToken}`,
    handlers,
  };
}

function validSourceRequest(overrides: Partial<ApiTypes.CreateSourceRequest> = {}): ApiTypes.CreateSourceRequest {
  return {
    code: "source",
    title: "Источник",
    structureType: "none",
    ...overrides,
  };
}
