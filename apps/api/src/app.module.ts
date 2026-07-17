import { DynamicModule, Module } from "@nestjs/common";

import { AccountsModule } from "./accounts/accounts.module.js";
import { ApiModule } from "./api/api.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { ApiConfigModule } from "./shared/api-config.module.js";
import type { ApiConfig } from "./shared/env.js";

@Module({})
export class AppModule {
  static forRoot(apiConfig: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ApiConfigModule.forRoot(apiConfig),
        DatabaseModule,
        AccountsModule,
        AuthModule,
        ApiModule,
        HealthModule,
      ],
    };
  }
}
