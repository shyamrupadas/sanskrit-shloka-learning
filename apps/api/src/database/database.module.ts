import { Module } from "@nestjs/common";
import pg from "pg";

import { API_CONFIG } from "../shared/api-config.module.js";
import type { ApiConfig } from "../shared/env.js";
import { DatabaseService } from "./database.service.js";
import { createPoolConfig } from "./postgres-connection.js";

const { Pool } = pg;

@Module({
  providers: [
    {
      provide: DatabaseService,
      inject: [API_CONFIG],
      useFactory: (apiConfig: ApiConfig) => new DatabaseService(
        new Pool(
          createPoolConfig(apiConfig.databaseUrl, {
            max: apiConfig.databasePoolMax,
          }),
        ),
      ),
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
