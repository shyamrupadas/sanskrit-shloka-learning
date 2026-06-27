import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { AccountSettingsService } from "./account-settings.service.js";
import { ACCOUNT_REPOSITORY } from "./account.repository.js";
import { PostgresAccountRepository } from "./postgres-account.repository.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    AccountSettingsService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PostgresAccountRepository,
    },
  ],
  exports: [ACCOUNT_REPOSITORY, AccountSettingsService],
})
export class AccountsModule {}
