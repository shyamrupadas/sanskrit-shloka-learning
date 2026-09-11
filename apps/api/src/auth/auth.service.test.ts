import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { InMemoryAccountRepository } from "../accounts/in-memory-account.repository.js";
import { DatabaseUnavailableError } from "../database/database.service.js";
import { AuthService } from "./auth.service.js";
import { PasswordHasher } from "./password-hasher.js";
import { hashAccessToken } from "./token.js";

describe("AuthService session authorization", () => {
  test("rejects a previously authorized session exactly when it expires", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
    const { auth } = await createSessionFixture({ expiresAt: new Date(Date.now() + 1_000) });

    assert.equal((await auth.getSession(authorization)).status, 200);
    context.mock.timers.tick(1_000);

    assert.equal((await auth.getSession(authorization)).status, 401);
  });

  test("rejects a previously authorized session immediately after it is revoked", async () => {
    const { auth, accounts } = await createSessionFixture();

    assert.equal((await auth.getSession(authorization)).status, 200);
    await accounts.deleteSessionByTokenHash(tokenHash);

    assert.equal((await auth.getSession(authorization)).status, 401);
  });

  test("uses current roles after previously authorizing an administrator", async (context) => {
    const { auth, accounts, account } = await createSessionFixture();
    account.roles = ["admin"];
    const lookup = accounts.findAccountBySessionTokenHash.bind(accounts);
    context.mock.method(accounts, "findAccountBySessionTokenHash", async (hash: string, now: Date) => {
      const current = await lookup(hash, now);
      return current ? { ...current, roles: [...current.roles] } : undefined;
    });

    assert.deepEqual((await auth.lookupSession(authorization))?.account.roles, ["admin"]);
    account.roles = [];

    assert.deepEqual((await auth.lookupSession(authorization))?.account.roles, []);
  });

  test("fails closed on a database error after successful authorization and can recover", async (context) => {
    const { auth, accounts } = await createSessionFixture();
    assert.equal((await auth.getSession(authorization)).status, 200);
    const databaseError = new DatabaseUnavailableError();
    const lookup = context.mock.method(accounts, "findAccountBySessionTokenHash", async () => {
      throw databaseError;
    });

    await assert.rejects(auth.getSession(authorization), (error) => error === databaseError);
    lookup.mock.restore();

    assert.equal((await auth.getSession(authorization)).status, 200);
  });

  test("does not reuse an in-flight authorization result for requests after revocation", async (context) => {
    const { auth, accounts } = await createSessionFixture();
    const lookup = accounts.findAccountBySessionTokenHash.bind(accounts);
    const captured = new Deferred<void>();
    const release = new Deferred<void>();
    context.mock.method(accounts, "findAccountBySessionTokenHash", async (hash: string, now: Date) => {
      const account = await lookup(hash, now);
      captured.resolve();
      await release.promise;
      return account;
    }, { times: 1 });

    const beforeRevocation = auth.getSession(authorization);
    await captured.promise;
    await accounts.deleteSessionByTokenHash(tokenHash);
    const afterRevocation = auth.getSession(authorization);
    release.resolve();

    const [before, after] = await Promise.all([beforeRevocation, afterRevocation]);
    assert.equal(before.status, 200);
    assert.equal(after.status, 401);
    assert.equal((await auth.getSession(authorization)).status, 401);
  });
});

const accessToken = "session-token";
const authorization = `Bearer ${accessToken}`;
const tokenHash = hashAccessToken(accessToken);

async function createSessionFixture({ expiresAt = new Date(Date.now() + 60_000) } = {}) {
  const accounts = new InMemoryAccountRepository();
  const account = await accounts.createAccount({
    id: "account-1",
    email: "learner@example.com",
    passwordHash: "hash",
  });
  await accounts.createSession({ id: "session-1", accountId: account.id, tokenHash, expiresAt });

  return { accounts, account, auth: new AuthService(accounts, {} as PasswordHasher) };
}

class Deferred<T> {
  readonly promise: Promise<T>;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve;
    });
  }
}
