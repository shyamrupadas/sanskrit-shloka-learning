import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { ACCOUNT_REPOSITORY } from "./account.repository.js";
import { PostgresAccountRepository } from "./postgres-account.repository.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PostgresAccountRepository,
    },
  ],
  exports: [ACCOUNT_REPOSITORY],
})
export class AccountsModule {}
