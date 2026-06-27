import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type AccountRecord,
  type AccountRepository,
  type AccountSettingsRecord,
  type CreateAccountInput,
  type CreateSessionInput,
  type UpdateAccountSettingsInput,
} from "../accounts/account.repository.js";
import { AuthService } from "./auth.service.js";
import { PasswordHasher } from "./password-hasher.js";
import { hashAccessToken } from "./token.js";

describe("AuthService lookupSession", () => {
  test("coalesces concurrent lookups for the same access token", async () => {
    const accounts = new DeferredAccountRepository();
    const auth = new AuthService(accounts, {} as PasswordHasher);
    const authorization = "Bearer shared-token";

    const first = auth.lookupSession(authorization);
    const second = auth.lookupSession(authorization);

    assert.equal(accounts.lookups.length, 1);
    const firstLookup = accounts.lookups[0];
    assert.ok(firstLookup);
    assert.equal(firstLookup.tokenHash, hashAccessToken("shared-token"));

    firstLookup.deferred.resolve(accountRecord);
    const [firstSession, secondSession] = await Promise.all([first, second]);

    assert.deepEqual(firstSession, { account: accountRecord, accessToken: "shared-token" });
    assert.deepEqual(secondSession, { account: accountRecord, accessToken: "shared-token" });

    const cached = await auth.lookupSession(authorization);
    assert.equal(accounts.lookups.length, 1);
    assert.deepEqual(cached, { account: accountRecord, accessToken: "shared-token" });
  });

  test("clears coalesced lookups after repository errors", async () => {
    const accounts = new DeferredAccountRepository();
    const auth = new AuthService(accounts, {} as PasswordHasher);
    const authorization = "Bearer shared-token";
    const lookupError = new Error("lookup failed");

    const first = auth.lookupSession(authorization);
    const second = auth.lookupSession(authorization);

    assert.equal(accounts.lookups.length, 1);
    const firstLookup = accounts.lookups[0];
    assert.ok(firstLookup);
    firstLookup.deferred.reject(lookupError);
    await assert.rejects(Promise.all([first, second]), (error) => error === lookupError);

    const third = auth.lookupSession(authorization);
    assert.equal(accounts.lookups.length, 2);
    const thirdLookup = accounts.lookups[1];
    assert.ok(thirdLookup);
    thirdLookup.deferred.resolve(accountRecord);
    assert.deepEqual(await third, { account: accountRecord, accessToken: "shared-token" });
  });

  test("uses a stale cached session when refresh fails with a transient error", async () => {
    const accounts = new DeferredAccountRepository();
    const auth = new AuthService(accounts, {} as PasswordHasher);
    const authorization = "Bearer shared-token";

    const first = auth.lookupSession(authorization);
    const firstLookup = accounts.lookups[0];
    assert.ok(firstLookup);
    firstLookup.deferred.resolve(accountRecord);
    assert.deepEqual(await first, { account: accountRecord, accessToken: "shared-token" });

    const tokenHash = hashAccessToken("shared-token");
    const cached = sessionCache(auth).get(tokenHash);
    assert.ok(cached);
    cached.freshUntil = Date.now() - 1;
    cached.staleUntil = Date.now() + 60_000;

    const refreshed = auth.lookupSession(authorization);
    assert.equal(accounts.lookups.length, 2);
    const secondLookup = accounts.lookups[1];
    assert.ok(secondLookup);
    secondLookup.deferred.reject(new Error("Query read timeout"));

    assert.deepEqual(await refreshed, { account: accountRecord, accessToken: "shared-token" });
  });
});

const accountRecord = {
  id: "account-1",
  email: "learner@example.com",
  passwordHash: "hash",
  roles: [],
} satisfies AccountRecord;

class DeferredAccountRepository implements AccountRepository {
  readonly lookups: Array<{
    deferred: Deferred<AccountRecord | undefined>;
    tokenHash: string;
  }> = [];

  async createAccount(_input: CreateAccountInput): Promise<AccountRecord> {
    throw new Error("Not implemented");
  }

  async findAccountByEmail(_email: string): Promise<AccountRecord | undefined> {
    throw new Error("Not implemented");
  }

  async findAccountBySessionTokenHash(tokenHash: string, _now: Date): Promise<AccountRecord | undefined> {
    const deferred = new Deferred<AccountRecord | undefined>();
    this.lookups.push({ deferred, tokenHash });
    return deferred.promise;
  }

  async getAccountSettings(_accountId: string): Promise<AccountSettingsRecord> {
    throw new Error("Not implemented");
  }

  async updateAccountSettings(_input: UpdateAccountSettingsInput): Promise<AccountSettingsRecord> {
    throw new Error("Not implemented");
  }

  async createSession(_input: CreateSessionInput): Promise<void> {
    throw new Error("Not implemented");
  }

  async deleteSessionByTokenHash(_tokenHash: string): Promise<void> {
    throw new Error("Not implemented");
  }
}

class Deferred<T> {
  readonly promise: Promise<T>;
  reject!: (error: unknown) => void;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

function sessionCache(auth: AuthService): Map<
  string,
  {
    freshUntil: number;
    session: {
      account: AccountRecord;
      accessToken: string;
    };
    staleUntil: number;
  }
> {
  return (auth as unknown as {
    sessionCache: Map<
      string,
      {
        freshUntil: number;
        session: {
          account: AccountRecord;
          accessToken: string;
        };
        staleUntil: number;
      }
    >;
  }).sessionCache;
}
