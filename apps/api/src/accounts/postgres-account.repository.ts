import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import {
  type AccountRecord,
  type AccountRepository,
  type AccountSettingsRecord,
  type CreateAccountInput,
  type CreateSessionInput,
  EmailAlreadyRegisteredError,
  type UpdateAccountSettingsInput,
} from "./account.repository.js";

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  roles: string[] | null;
}

interface AccountSettingsRow {
  hard_mode: boolean;
}

@Injectable()
export class PostgresAccountRepository implements AccountRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async createAccount(input: CreateAccountInput): Promise<AccountRecord> {
    try {
      const result = await this.database.writeQuery<AccountRow>(
        `
          insert into accounts (id, email, password_hash)
          values ($1, $2, $3)
          returning id, email, password_hash, array[]::text[] as roles
        `,
        [input.id, input.email, input.passwordHash],
      );

      return mapAccountRow(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError(input.email);
      }

      throw error;
    }
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | undefined> {
    const result = await this.database.readQuery<AccountRow>(
      `
        select accounts.id, accounts.email, accounts.password_hash,
          coalesce(
            (
              select array_agg(account_roles.role order by account_roles.role)
              from account_roles
              where account_roles.account_id = accounts.id
            ),
            array[]::text[]
          ) as roles
        from accounts
        where accounts.email = $1
        limit 1
      `,
      [email],
    );

    const row = result.rows[0];
    return row ? mapAccountRow(row) : undefined;
  }

  async findAccountBySessionTokenHash(tokenHash: string, now: Date): Promise<AccountRecord | undefined> {
    const result = await this.database.readQuery<AccountRow>(
      `
        select accounts.id, accounts.email, accounts.password_hash,
          coalesce(
            (
              select array_agg(account_roles.role order by account_roles.role)
              from account_roles
              where account_roles.account_id = accounts.id
            ),
            array[]::text[]
          ) as roles
        from auth_sessions
        inner join accounts on accounts.id = auth_sessions.account_id
        where auth_sessions.token_hash = $1
          and auth_sessions.expires_at > $2
        limit 1
      `,
      [tokenHash, now],
    );

    const row = result.rows[0];
    return row ? mapAccountRow(row) : undefined;
  }

  async getAccountSettings(accountId: string): Promise<AccountSettingsRecord> {
    const result = await this.database.readQuery<AccountSettingsRow>(
      "select hard_mode from accounts where id = $1",
      [accountId],
    );

    return mapAccountSettingsRow(result.rows[0]);
  }

  async updateAccountSettings(input: UpdateAccountSettingsInput): Promise<AccountSettingsRecord> {
    const result = await this.database.writeQuery<AccountSettingsRow>(
      `
        update accounts
        set hard_mode = $2
        where id = $1
        returning hard_mode
      `,
      [input.accountId, input.hardMode],
    );

    return mapAccountSettingsRow(result.rows[0]);
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.database.writeQuery(
      `
        insert into auth_sessions (id, account_id, token_hash, expires_at)
        values ($1, $2, $3, $4)
      `,
      [input.id, input.accountId, input.tokenHash, input.expiresAt],
    );
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.database.writeQuery("delete from auth_sessions where token_hash = $1", [tokenHash]);
  }
}

function mapAccountRow(row: AccountRow | undefined): AccountRecord {
  if (!row) {
    throw new Error("Expected account row");
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    roles: (row.roles ?? []).filter((role): role is AccountRecord["roles"][number] => role === "admin"),
  };
}

function mapAccountSettingsRow(row: AccountSettingsRow | undefined): AccountSettingsRecord {
  if (!row) {
    throw new Error("Expected account settings row");
  }

  return {
    hardMode: row.hard_mode,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
