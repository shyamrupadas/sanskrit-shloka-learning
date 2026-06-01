import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module.js";
import { AuthService } from "./auth.service.js";
import { PasswordHasher } from "./password-hasher.js";

@Module({
  imports: [AccountsModule],
  providers: [AuthService, PasswordHasher],
  exports: [AuthService, PasswordHasher],
})
export class AuthModule {}
