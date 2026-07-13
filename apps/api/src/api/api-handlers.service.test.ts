import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { AccountSettingsService } from "../accounts/account-settings.service.js";
import { InMemoryAccountRepository } from "../accounts/in-memory-account.repository.js";
import { AuthService } from "../auth/auth.service.js";
import { PasswordHasher } from "../auth/password-hasher.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { InMemoryCatalogRepository } from "../catalog/in-memory-catalog.repository.js";
import { DashboardService } from "../dashboard/dashboard.service.js";
import { InMemoryReviewHistoryRepository } from "../dashboard/in-memory-review-history.repository.js";
import { InMemoryUserLibraryRepository } from "../library/in-memory-user-library.repository.js";
import { UserLibraryService } from "../library/user-library.service.js";
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
  test("requires authorization for dashboard, library, and account settings", async () => {
    const handlers = createHandlers();

    const dashboardResponse = await handlers.getDashboard({});
    const learningShlokasResponse = await handlers.getLearningShlokas({});
    const reviewShlokasResponse = await handlers.getReviewShlokas({
      timeZone: "UTC",
    });
    const libraryResponse = await handlers.getLibrary({});
    const itemResponse = await handlers.getItem({ shlokaCode: "missing" });
    const completeLearningResponse = await handlers.completeLearning({
      shlokaCode: "missing",
    });
    const completeReviewResponse = await handlers.completeReview({
      body: { result: "forgot", timeZone: "UTC" },
      shlokaCode: "missing",
    });
    const settingsResponse = await handlers.getSettings({});
    const updateSettingsResponse = await handlers.updateSettings({
      body: { hardMode: true },
    });

    assert.equal(dashboardResponse.status, 401);
    assert.equal(learningShlokasResponse.status, 401);
    assert.equal(reviewShlokasResponse.status, 401);
    assert.equal(libraryResponse.status, 401);
    assert.equal(itemResponse.status, 401);
    assert.equal(completeLearningResponse.status, 401);
    assert.equal(completeReviewResponse.status, 401);
    assert.equal(settingsResponse.status, 401);
    assert.equal(updateSettingsResponse.status, 401);
  });

  test("saves hard mode between sessions without changing MVP dashboard behavior", async () => {
    const handlers = createHandlers();
    const registerResponse = await handlers.register({
      body: {
        email: "learner@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });
    assert.equal(registerResponse.status, 201);
    const firstAuthorization = `Bearer ${registerResponse.body.accessToken}`;

    const initialSettings = await handlers.getSettings({
      authorization: firstAuthorization,
    });
    assert.deepEqual(initialSettings, {
      status: 200,
      body: { hardMode: false },
    });
    const dashboardBeforeUpdate = await handlers.getDashboard({
      authorization: firstAuthorization,
    });

    const updatedSettings = await handlers.updateSettings({
      authorization: firstAuthorization,
      body: { hardMode: true },
    });
    assert.deepEqual(updatedSettings, {
      status: 200,
      body: { hardMode: true },
    });

    assert.equal((await handlers.logout({ authorization: firstAuthorization })).status, 204);
    const loginResponse = await handlers.login({
      body: {
        email: "learner@example.com",
        password: "123456",
      },
    });
    assert.equal(loginResponse.status, 200);
    const secondAuthorization = `Bearer ${loginResponse.body.accessToken}`;

    assert.deepEqual(
      await handlers.getSettings({ authorization: secondAuthorization }),
      {
        status: 200,
        body: { hardMode: true },
      },
    );
    assert.deepEqual(
      await handlers.getDashboard({ authorization: secondAuthorization }),
      dashboardBeforeUpdate,
    );
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

    assert.deepEqual(
      await handlers.getLearningShlokas({ authorization, limit: 3 }),
      {
        status: 200,
        body: {
          hasLearningShlokas: false,
          items: [],
          remainingCount: 0,
        },
      },
    );
    assert.deepEqual(
      await handlers.getReviewShlokas({
        authorization,
        limit: 5,
        timeZone: "UTC",
      }),
      {
        status: 200,
        body: {
          hasReviewingShlokas: false,
          items: [],
          remainingCount: 0,
          state: "empty",
        },
      },
    );
  });

  test("validates dashboard list limits and the user timezone", async () => {
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

    const learning = await handlers.getLearningShlokas({
      authorization,
      limit: 0,
    });
    const review = await handlers.getReviewShlokas({
      authorization,
      limit: Number.NaN,
      timeZone: "not-a-timezone",
    });
    const completion = await handlers.completeReview({
      authorization,
      body: {
        result: "invalid" as ApiTypes.ReviewResult,
        timeZone: "not-a-timezone",
      },
      shlokaCode: "missing",
    });

    assert.equal(learning.status, 400);
    assert.deepEqual(learning.body.details, [
      "Лимит должен быть положительным целым числом",
    ]);
    assert.equal(review.status, 400);
    assert.deepEqual(review.body.details, [
      "Лимит должен быть положительным целым числом",
      "Таймзона пользователя должна быть корректной IANA-таймзоной",
    ]);
    assert.equal(completion.status, 400);
    assert.deepEqual(completion.body.details, [
      "Результат повторения должен быть одним из четырех допустимых значений",
      "Таймзона пользователя должна быть корректной IANA-таймзоной",
    ]);
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
    assert.equal((await handlers.getCatalog({})).status, 401);
    assert.equal((await handlers.getCatalog({ authorization })).status, 403);
    assert.equal((await handlers.getSource({ sourceCode: "source" })).status, 401);
    assert.equal((await handlers.getSource({ authorization, sourceCode: "source" })).status, 403);
    assert.equal(
      (
        await handlers.updateSource({
          sourceCode: "source",
          body: { title: "Источник" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await handlers.updateSource({
          authorization,
          sourceCode: "source",
          body: { title: "Источник" },
        })
      ).status,
      403,
    );
    assert.equal((await handlers.getShloka({ shlokaCode: "source-1" })).status, 401);
    assert.equal((await handlers.getShloka({ authorization, shlokaCode: "source-1" })).status, 403);
    assert.equal(
      (
        await handlers.updateShloka({
          shlokaCode: "source-1",
          body: { padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"] },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await handlers.updateShloka({
          authorization,
          shlokaCode: "source-1",
          body: { padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"] },
        })
      ).status,
      403,
    );
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

  test("allows the same chapter code inside different source parts", async () => {
    const { authorization, handlers } = await createAdminHandlers();

    const sourceResponse = await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "sb",
        title: "Шримад Бхагаватам",
        structureType: "parts",
        parts: [
          {
            code: "1",
            title: "Песнь 1",
            order: 1,
            chapters: [
              { code: "1", title: "1", order: 1 },
              { code: "2", title: "2", order: 2 },
            ],
          },
          {
            code: "2",
            title: "Песнь 2",
            order: 2,
            chapters: [{ code: "1", title: "1", order: 1 }],
          },
        ],
      }),
    });

    assert.equal(sourceResponse.status, 201);

    const first = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "sb",
        partCode: "1",
        chapterCode: "1",
        number: "1",
        padas: ["первая шлока первой песни 1", "первая шлока первой песни 2", "первая шлока первой песни 3", "первая шлока первой песни 4"],
      },
    });
    const second = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "sb",
        partCode: "2",
        chapterCode: "1",
        number: "1",
        padas: ["первая шлока второй песни 1", "первая шлока второй песни 2", "первая шлока второй песни 3", "первая шлока второй песни 4"],
      },
    });

    assert.equal(first.status, 201);
    assert.equal(first.body.code, "sb-1-1-1");
    assert.equal(second.status, 201);
    assert.equal(second.body.code, "sb-2-1-1");

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.deepEqual(
      libraryResponse.body.allShlokas.map((shloka) => shloka.displayTitle),
      ["Шримад Бхагаватам, Песнь 1, 1 1", "Шримад Бхагаватам, Песнь 2, 1 1"],
    );
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
        padas: ["карманй эвадхикарас те", "ма пхалешу кадачана", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
        fullTranslation: "Только на действие у тебя право.",
      },
    });
    const second = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "amrita",
        number: "1",
        padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"],
      },
    });

    assert.equal(first.status, 201);
    assert.equal(first.body.code, "gita-chapter-2-2-47");
    assert.equal(first.body.text, "карманй эвадхикарас те\nма пхалешу кадачана\nма кармапхалахетур бхур\nма те санго сту акармани");
    assert.equal(first.body.fullTranslation, "Только на действие у тебя право.");
    assert.equal(first.body.personalStatus, "available");
    assert.equal(second.status, 201);

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.deepEqual(
      libraryResponse.body.allShlokas.map((shloka) => shloka.code),
      ["amrita-1", "gita-chapter-2-2-47"],
    );
  });

  test("keeps to-learn status per user, completes learning, and preserves reviewing", async () => {
    const learnedAt = new Date("2026-07-12T09:30:00.000Z");
    let now = learnedAt;
    const { authorization, handlers } = await createAdminHandlers({
      now: () => now,
    });

    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        title: "Бхагавад-гита",
        structureType: "chapters",
        chapters: [{ code: "chapter-2", title: "Глава 2", order: 1 }],
      }),
    });
    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-2",
        number: "2.47",
        padas: ["карманй эвадхикарас те", "ма пхалешу кадачана", "ма кармапхалахетур бхур", "ма те санго сту акармани"],
      },
    });

    const learner = await handlers.register({
      body: {
        email: "learner@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });
    assert.equal(learner.status, 201);
    const learnerAuthorization = `Bearer ${learner.body.accessToken}`;

    const initialLibrary = await handlers.getLibrary({ authorization: learnerAuthorization });
    assert.equal(initialLibrary.status, 200);
    const initialShloka = initialLibrary.body.allShlokas.at(0);
    assert.ok(initialShloka);
    assert.equal(initialShloka.personalStatus, "available");

    const addResponse = await handlers.updateItem({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
      body: { personalStatus: "learning" },
    });

    assert.equal(addResponse.status, 200);
    assert.equal(addResponse.body.personalStatus, "learning");
    const addedItemResponse = await handlers.getItem({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
    });
    assert.equal(addedItemResponse.status, 200);
    assert.equal(addedItemResponse.body.personalStatus, "learning");
    assert.equal(
      addedItemResponse.body.text,
      "карманй эвадхикарас те\nма пхалешу кадачана\nма кармапхалахетур бхур\nма те санго сту акармани",
    );
    const afterAddLibrary = await handlers.getLibrary({ authorization: learnerAuthorization });
    assert.equal(afterAddLibrary.status, 200);
    const afterAddShloka = afterAddLibrary.body.allShlokas.at(0);
    assert.ok(afterAddShloka);
    assert.equal(afterAddShloka.personalStatus, "learning");

    const otherLearner = await handlers.register({
      body: {
        email: "other@example.com",
        password: "123456",
        passwordConfirmation: "123456",
      },
    });
    assert.equal(otherLearner.status, 201);
    const otherLibrary = await handlers.getLibrary({ authorization: `Bearer ${otherLearner.body.accessToken}` });
    assert.equal(otherLibrary.status, 200);
    const otherShloka = otherLibrary.body.allShlokas.at(0);
    assert.ok(otherShloka);
    assert.equal(otherShloka.personalStatus, "available");
    const otherItemResponse = await handlers.getItem({
      authorization: `Bearer ${otherLearner.body.accessToken}`,
      shlokaCode: "gita-chapter-2-2-47",
    });
    assert.equal(otherItemResponse.status, 200);
    assert.equal(otherItemResponse.body.personalStatus, "available");

    const removeResponse = await handlers.updateItem({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
      body: { personalStatus: "available" },
    });

    assert.equal(removeResponse.status, 200);
    assert.equal(removeResponse.body.personalStatus, "available");
    const afterRemoveLibrary = await handlers.getLibrary({ authorization: learnerAuthorization });
    assert.equal(afterRemoveLibrary.status, 200);
    const afterRemoveShloka = afterRemoveLibrary.body.allShlokas.at(0);
    assert.ok(afterRemoveShloka);
    assert.equal(afterRemoveShloka.personalStatus, "available");

    assert.equal(
      (
        await handlers.updateItem({
          authorization: learnerAuthorization,
          shlokaCode: "gita-chapter-2-2-47",
          body: { personalStatus: "learning" },
        })
      ).status,
      200,
    );
    const completeResponse = await handlers.completeLearning({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
    });

    assert.equal(completeResponse.status, 200);
    assert.equal(completeResponse.body.shloka.personalStatus, "reviewing");
    assert.deepEqual(completeResponse.body.remainingLearningShlokas, []);
    const reviewingRecord = (
      await handlers.userLibraryRepository.listShlokaStatuses(
        learner.body.account.id,
      )
    ).at(0);
    assert.ok(reviewingRecord);
    assert.equal(reviewingRecord.status, "reviewing");
    assert.equal(reviewingRecord.reviewingStartedAt?.toISOString(), learnedAt.toISOString());

    const removalFromReviewing = await handlers.updateItem({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
      body: { personalStatus: "available" },
    });
    assert.equal(removalFromReviewing.status, 400);
    const reviewingItem = await handlers.getItem({
      authorization: learnerAuthorization,
      shlokaCode: "gita-chapter-2-2-47",
    });
    assert.equal(reviewingItem.status, 200);
    assert.equal(reviewingItem.body.personalStatus, "reviewing");

    now = new Date("2026-07-13T11:00:00.000Z");
    assert.equal(
      (
        await handlers.completeLearning({
          authorization: learnerAuthorization,
          shlokaCode: "gita-chapter-2-2-47",
        })
      ).status,
      200,
    );
    const recordAfterDuplicateCompletion = (
      await handlers.userLibraryRepository.listShlokaStatuses(
        learner.body.account.id,
      )
    ).at(0);
    assert.equal(
      recordAfterDuplicateCompletion?.reviewingStartedAt?.toISOString(),
      learnedAt.toISOString(),
    );

    assert.equal(
      (
        await handlers.completeLearning({
          authorization: `Bearer ${otherLearner.body.accessToken}`,
          shlokaCode: "gita-chapter-2-2-47",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await handlers.updateItem({
          authorization: learnerAuthorization,
          shlokaCode: "missing",
          body: { personalStatus: "learning" },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await handlers.completeLearning({
          authorization: learnerAuthorization,
          shlokaCode: "missing",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await handlers.getItem({
          authorization: learnerAuthorization,
          shlokaCode: "missing",
        })
      ).status,
      404,
    );
  });

  test("returns admin catalog with empty sources and stable shloka order", async () => {
    const { authorization, handlers } = await createAdminHandlers();

    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "empty",
        title: "Пустой источник",
        structureType: "none",
      }),
    });
    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        title: "Бхагавад-гита",
        structureType: "chapters",
        chapters: [
          { code: "chapter-1", title: "Глава 1", order: 1 },
          { code: "chapter-2", title: "Глава 2", order: 2 },
        ],
      }),
    });

    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-2",
        number: "10",
        padas: ["десятая шлока 1", "десятая шлока 2", "десятая шлока 3", "десятая шлока 4"],
      },
    });
    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-1",
        number: "2",
        padas: ["вторая шлока 1", "вторая шлока 2", "вторая шлока 3", "вторая шлока 4"],
      },
    });
    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-2",
        number: "2",
        padas: ["еще одна вторая 1", "еще одна вторая 2", "еще одна вторая 3", "еще одна вторая 4"],
      },
    });

    const catalogResponse = await handlers.getCatalog({ authorization });
    assert.equal(catalogResponse.status, 200);
    const emptySource = catalogResponse.body.sources.find((source) => source.code === "empty");
    assert.ok(emptySource);
    assert.deepEqual(emptySource.shlokas, []);

    const gitaSource = catalogResponse.body.sources.find((source) => source.code === "gita");
    assert.ok(gitaSource);
    assert.deepEqual(
      gitaSource.shlokas.map((shloka) => shloka.code),
      ["gita-chapter-1-2", "gita-chapter-2-2", "gita-chapter-2-10"],
    );

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.deepEqual(
      libraryResponse.body.allShlokas.map((shloka) => shloka.code),
      ["gita-chapter-1-2", "gita-chapter-2-2", "gita-chapter-2-10"],
    );
  });

  test("updates source editable fields and rejects immutable structure changes", async () => {
    const { authorization, handlers } = await createAdminHandlers();

    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        title: "Бхагавад-гита",
        description: "Старое описание",
        structureType: "chapters",
        chapters: [{ code: "chapter-1", title: "Глава 1", order: 1 }],
      }),
    });
    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-1",
        number: "1",
        padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"],
      },
    });

    const updated = await handlers.updateSource({
      authorization,
      sourceCode: "gita",
      body: {
        title: "Гита",
        description: "Новое описание",
        chapters: [
          { code: "chapter-1", title: "Первая глава", order: 1 },
          { code: "chapter-2", title: "Вторая глава", order: 2 },
        ],
      },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.title, "Гита");
    assert.equal(updated.body.description, "Новое описание");
    assert.deepEqual(
      updated.body.chapters.map((chapter) => chapter.code),
      ["chapter-1", "chapter-2"],
    );

    const shlokaResponse = await handlers.getShloka({ authorization, shlokaCode: "gita-chapter-1-1" });
    assert.equal(shlokaResponse.status, 200);
    assert.equal(shlokaResponse.body.sourceTitle, "Гита");
    assert.equal(shlokaResponse.body.chapterTitle, "Первая глава");

    const removedChapter = await handlers.updateSource({
      authorization,
      sourceCode: "gita",
      body: {
        title: "Гита",
        chapters: [{ code: "chapter-2", title: "Вторая глава", order: 2 }],
      },
    });
    assert.equal(removedChapter.status, 400);
    assert.ok(removedChapter.body.details?.includes("Нельзя удалять существующие главы"));

    const changedOrder = await handlers.updateSource({
      authorization,
      sourceCode: "gita",
      body: {
        title: "Гита",
        chapters: [
          { code: "chapter-1", title: "Первая глава", order: 2 },
          { code: "chapter-2", title: "Вторая глава", order: 1 },
        ],
      },
    });
    assert.equal(changedOrder.status, 400);
    assert.ok(changedOrder.body.details?.includes("Нельзя менять порядок существующих глав"));

    const changedStructure = await handlers.updateSource({
      authorization,
      sourceCode: "gita",
      body: {
        title: "Гита",
        parts: [
          {
            code: "part-1",
            title: "Часть 1",
            order: 1,
            chapters: [{ code: "chapter-1", title: "Первая глава", order: 1 }],
          },
        ],
      },
    });
    assert.equal(changedStructure.status, 400);
    assert.ok(changedStructure.body.details?.includes("Для источника с главами нельзя добавить части"));
  });

  test("updates shloka padas and translation while keeping its reference immutable", async () => {
    const { authorization, handlers } = await createAdminHandlers();
    await handlers.sources({
      authorization,
      body: validSourceRequest({
        code: "gita",
        title: "Бхагавад-гита",
        structureType: "chapters",
        chapters: [{ code: "chapter-1", title: "1", order: 1 }],
      }),
    });
    await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        chapterCode: "chapter-1",
        number: "1",
        padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"],
      },
    });

    const updated = await handlers.updateShloka({
      authorization,
      shlokaCode: "gita-chapter-1-1",
      body: {
        padas: ["обновленная первая", "обновленная вторая", "обновленная третья", "обновленная четвертая"],
        fullTranslation: "Новый перевод",
      },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.code, "gita-chapter-1-1");
    assert.equal(updated.body.sourceCode, "gita");
    assert.equal(updated.body.chapterCode, "chapter-1");
    assert.equal(updated.body.number, "1");
    assert.deepEqual(updated.body.padas, ["обновленная первая", "обновленная вторая", "обновленная третья", "обновленная четвертая"]);
    assert.equal(updated.body.text, "обновленная первая\nобновленная вторая\nобновленная третья\nобновленная четвертая");
    assert.equal(updated.body.fullTranslation, "Новый перевод");

    const libraryResponse = await handlers.getLibrary({ authorization });
    assert.equal(libraryResponse.status, 200);
    assert.deepEqual(libraryResponse.body.allShlokas, [
      {
        code: "gita-chapter-1-1",
        displayTitle: "Бхагавад-гита 1.1",
        sourceTitle: "Бхагавад-гита",
        number: "1",
        text: "обновленная первая\nобновленная вторая\nобновленная третья\nобновленная четвертая",
        personalStatus: "available",
        fullTranslation: "Новый перевод",
      },
    ]);

    const invalid = await handlers.updateShloka({
      authorization,
      shlokaCode: "gita-chapter-1-1",
      body: {
        padas: [],
      },
    });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.details?.includes("Заполните все четыре пады шлоки"));
  });

  test("validates shloka structure, required padas, and unique reference", async () => {
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
    assert.ok(invalidResponse.body.details?.includes("Заполните все четыре пады шлоки"));

    const invalidStructure = await handlers.shlokas({
      authorization,
      body: {
        sourceCode: "gita",
        number: "1",
        padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"],
      },
    });

    assert.equal(invalidStructure.status, 400);
    assert.ok(invalidStructure.body.details?.includes("Выберите главу"));

    const request = {
      sourceCode: "gita",
      chapterCode: "chapter-1",
      number: "1",
      padas: ["первая пада", "вторая пада", "третья пада", "четвертая пада"],
    };

    assert.equal((await handlers.shlokas({ authorization, body: request })).status, 201);
    assert.equal((await handlers.shlokas({ authorization, body: request })).status, 409);
  });
});

type TestHandlers = ApiHandlersService & {
  accounts: InMemoryAccountRepository;
  reviewHistoryRepository: InMemoryReviewHistoryRepository;
  userLibraryRepository: InMemoryUserLibraryRepository;
};

function createHandlers(
  options: { now?: () => Date } = {},
): TestHandlers {
  const accounts = new InMemoryAccountRepository();
  const passwordHasher = new PasswordHasher();
  const auth = new AuthService(accounts, passwordHasher);
  const accountSettings = new AccountSettingsService(accounts);
  const catalog = new CatalogService(new InMemoryCatalogRepository());
  const userLibraryRepository = new InMemoryUserLibraryRepository();
  const userLibrary = new UserLibraryService(
    catalog,
    userLibraryRepository,
    options.now ?? (() => new Date()),
  );
  const reviewHistoryRepository = new InMemoryReviewHistoryRepository();
  const dashboard = new DashboardService(
    catalog,
    userLibraryRepository,
    reviewHistoryRepository,
    options.now ?? (() => new Date()),
  );

  return Object.assign(
    new ApiHandlersService(
      auth,
      accountSettings,
      catalog,
      dashboard,
      userLibrary,
    ),
    { accounts, reviewHistoryRepository, userLibraryRepository },
  );
}

async function createAdminHandlers(
  options: { now?: () => Date } = {},
): Promise<{
  authorization: string;
  handlers: TestHandlers;
}> {
  const handlers = createHandlers(options);
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
