import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  ACCOUNT_REPOSITORY,
  type AccountRecord,
  type AccountRepository,
  EmailAlreadyRegisteredError,
} from "../accounts/account.repository.js";
import { emailAlreadyRegisteredError, invalidCredentialsError, unauthorizedError, validationError } from "./api-error.js";
import { PasswordHasher } from "./password-hasher.js";
import { createAccessToken, hashAccessToken, parseBearerToken } from "./token.js";

const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

export interface SessionLookup {
  account: AccountRecord;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepository,
    @Inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(request: ApiTypes.RegisterRequest): Promise<
    | { status: 201; body: ApiTypes.AuthSessionDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 409; body: ApiTypes.ApiError }
  > {
    const normalized = normalizeRegisterRequest(request);
    const details = validateRegisterRequest(normalized);

    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    try {
      const account = await this.accounts.createAccount({
        id: randomUUID(),
        email: normalized.email,
        passwordHash: await this.passwordHasher.hash(normalized.password),
      });

      const accessToken = await this.createSession(account);
      return { status: 201, body: toAuthSession(account, accessToken) };
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        return { status: 409, body: emailAlreadyRegisteredError() };
      }

      throw error;
    }
  }

  async login(request: ApiTypes.LoginRequest): Promise<
    | { status: 200; body: ApiTypes.AuthSessionDto }
    | { status: 400; body: ApiTypes.ApiError }
    | { status: 401; body: ApiTypes.ApiError }
  > {
    const normalized = normalizeLoginRequest(request);
    const details = validateLoginRequest(normalized);

    if (details.length > 0) {
      return { status: 400, body: validationError(details) };
    }

    const account = await this.accounts.findAccountByEmail(normalized.email);
    if (!account || !(await this.passwordHasher.verify(normalized.password, account.passwordHash))) {
      return { status: 401, body: invalidCredentialsError };
    }

    const accessToken = await this.createSession(account);
    return { status: 200, body: toAuthSession(account, accessToken) };
  }

  async getSession(authorization: string | undefined): Promise<
    { status: 200; body: ApiTypes.AuthSessionDto } | { status: 401; body: ApiTypes.ApiError }
  > {
    const session = await this.lookupSession(authorization);
    if (!session) {
      return { status: 401, body: unauthorizedError };
    }

    return { status: 200, body: toAuthSession(session.account, session.accessToken) };
  }

  async logout(authorization: string | undefined): Promise<
    { status: 204 } | { status: 401; body: ApiTypes.ApiError }
  > {
    const token = parseBearerToken(authorization);
    if (!token) {
      return { status: 401, body: unauthorizedError };
    }

    const tokenHash = hashAccessToken(token);
    const account = await this.accounts.findAccountBySessionTokenHash(tokenHash, new Date());
    if (!account) {
      return { status: 401, body: unauthorizedError };
    }

    await this.accounts.deleteSessionByTokenHash(tokenHash);
    return { status: 204 };
  }

  async lookupSession(authorization: string | undefined): Promise<SessionLookup | undefined> {
    const accessToken = parseBearerToken(authorization);
    if (!accessToken) {
      return undefined;
    }

    const account = await this.accounts.findAccountBySessionTokenHash(hashAccessToken(accessToken), new Date());
    return account ? { account, accessToken } : undefined;
  }

  private async createSession(account: AccountRecord): Promise<string> {
    const accessToken = createAccessToken();
    await this.accounts.createSession({
      id: randomUUID(),
      accountId: account.id,
      tokenHash: hashAccessToken(accessToken),
      expiresAt: new Date(Date.now() + sessionTtlMs),
    });

    return accessToken;
  }
}

function toAuthSession(account: AccountRecord, accessToken: string): ApiTypes.AuthSessionDto {
  return {
    account: {
      id: account.id,
      email: account.email,
      roles: account.roles,
    },
    accessToken,
  };
}

function normalizeRegisterRequest(request: ApiTypes.RegisterRequest): ApiTypes.RegisterRequest {
  return {
    email: normalizeEmail(request.email),
    password: request.password ?? "",
    passwordConfirmation: request.passwordConfirmation ?? "",
  };
}

function normalizeLoginRequest(request: ApiTypes.LoginRequest): ApiTypes.LoginRequest {
  return {
    email: normalizeEmail(request.email),
    password: request.password ?? "",
  };
}

function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

function validateRegisterRequest(request: ApiTypes.RegisterRequest): string[] {
  const details = validateCredentials(request);

  if (request.password !== request.passwordConfirmation) {
    details.push("Пароль и подтверждение должны совпадать");
  }

  return details;
}

function validateLoginRequest(request: ApiTypes.LoginRequest): string[] {
  return validateCredentials(request);
}

function validateCredentials(request: ApiTypes.LoginRequest): string[] {
  const details: string[] = [];

  if (!request.email.includes("@")) {
    details.push("Email должен быть корректным");
  }

  if (request.password.length < 6) {
    details.push("Пароль должен быть не короче 6 символов");
  }

  return details;
}
