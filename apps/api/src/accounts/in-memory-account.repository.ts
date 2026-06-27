import {
  type AccountRecord,
  type AccountRepository,
  type AccountSettingsRecord,
  type CreateAccountInput,
  type CreateSessionInput,
  EmailAlreadyRegisteredError,
  type UpdateAccountSettingsInput,
} from "./account.repository.js";

interface SessionRecord {
  accountId: string;
  expiresAt: Date;
}

export class InMemoryAccountRepository implements AccountRepository {
  private readonly accountsByEmail = new Map<string, AccountRecord>();
  private readonly accountsById = new Map<string, AccountRecord>();
  private readonly settingsByAccountId = new Map<string, AccountSettingsRecord>();
  private readonly sessionsByTokenHash = new Map<string, SessionRecord>();

  async createAccount(input: CreateAccountInput): Promise<AccountRecord> {
    if (this.accountsByEmail.has(input.email)) {
      throw new EmailAlreadyRegisteredError(input.email);
    }

    const account: AccountRecord = {
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      roles: [],
    };

    this.accountsByEmail.set(account.email, account);
    this.accountsById.set(account.id, account);
    this.settingsByAccountId.set(account.id, { hardMode: false });

    return account;
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | undefined> {
    return this.accountsByEmail.get(email);
  }

  async findAccountBySessionTokenHash(tokenHash: string, now: Date): Promise<AccountRecord | undefined> {
    const session = this.sessionsByTokenHash.get(tokenHash);
    if (!session || session.expiresAt <= now) {
      return undefined;
    }

    return this.accountsById.get(session.accountId);
  }

  async getAccountSettings(accountId: string): Promise<AccountSettingsRecord> {
    const settings = this.settingsByAccountId.get(accountId);
    if (!settings) {
      throw new Error(`Account settings not found: ${accountId}`);
    }

    return { ...settings };
  }

  async updateAccountSettings(input: UpdateAccountSettingsInput): Promise<AccountSettingsRecord> {
    if (!this.accountsById.has(input.accountId)) {
      throw new Error(`Account settings not found: ${input.accountId}`);
    }

    const settings = { hardMode: input.hardMode };
    this.settingsByAccountId.set(input.accountId, settings);
    return { ...settings };
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    this.sessionsByTokenHash.set(input.tokenHash, {
      accountId: input.accountId,
      expiresAt: input.expiresAt,
    });
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    this.sessionsByTokenHash.delete(tokenHash);
  }

  grantRole(accountId: string, role: AccountRecord["roles"][number]): void {
    const account = this.accountsById.get(accountId);
    if (!account || account.roles.includes(role)) {
      return;
    }

    account.roles = [...account.roles, role];
  }
}
