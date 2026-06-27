import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export interface AccountRecord {
  id: string;
  email: string;
  passwordHash: string;
  roles: ApiTypes.AccountRole[];
}

export interface CreateAccountInput {
  id: string;
  email: string;
  passwordHash: string;
}

export interface CreateSessionInput {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AccountSettingsRecord {
  hardMode: boolean;
}

export interface UpdateAccountSettingsInput {
  accountId: string;
  hardMode: boolean;
}

export interface AccountRepository {
  createAccount(input: CreateAccountInput): Promise<AccountRecord>;
  findAccountByEmail(email: string): Promise<AccountRecord | undefined>;
  findAccountBySessionTokenHash(tokenHash: string, now: Date): Promise<AccountRecord | undefined>;
  getAccountSettings(accountId: string): Promise<AccountSettingsRecord>;
  updateAccountSettings(input: UpdateAccountSettingsInput): Promise<AccountSettingsRecord>;
  createSession(input: CreateSessionInput): Promise<void>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`Email is already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export const ACCOUNT_REPOSITORY = Symbol("ACCOUNT_REPOSITORY");
