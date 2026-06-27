import { Module } from "@nestjs/common";

import { AccountsModule } from "../accounts/accounts.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CatalogModule } from "../catalog/catalog.module.js";
import { AccountController } from "./account.controller.js";
import { AdminController } from "./admin.controller.js";
import { ApiHandlersService } from "./api-handlers.service.js";
import { AuthController } from "./auth.controller.js";
import { DashboardController } from "./dashboard.controller.js";
import { LibraryController } from "./library.controller.js";

@Module({
  imports: [AccountsModule, AuthModule, CatalogModule],
  controllers: [AccountController, AdminController, AuthController, DashboardController, LibraryController],
  providers: [ApiHandlersService],
  exports: [ApiHandlersService],
})
export class ApiModule {}
