import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from "./account.repository.js";

@Injectable()
export class AccountSettingsService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: AccountRepository,
  ) {}

  async get(accountId: string): Promise<ApiTypes.AccountSettingsDto> {
    return this.accounts.getAccountSettings(accountId);
  }

  async update(
    accountId: string,
    request: ApiTypes.UpdateAccountSettingsRequest,
  ): Promise<ApiTypes.AccountSettingsDto> {
    return this.accounts.updateAccountSettings({
      accountId,
      hardMode: request.hardMode,
    });
  }
}
