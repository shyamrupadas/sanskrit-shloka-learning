import { Module } from "@nestjs/common";

import { AccountsModule } from "./accounts/accounts.module.js";
import { ApiModule } from "./api/api.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";

@Module({
  imports: [DatabaseModule, AccountsModule, AuthModule, ApiModule],
})
export class AppModule {}
