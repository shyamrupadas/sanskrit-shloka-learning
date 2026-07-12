import { Module } from "@nestjs/common";

import { CatalogModule } from "../catalog/catalog.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { UserLibraryModule } from "../library/user-library.module.js";
import {
  DASHBOARD_CLOCK,
  DashboardService,
} from "./dashboard.service.js";
import { PostgresReviewHistoryRepository } from "./postgres-review-history.repository.js";
import { REVIEW_HISTORY_REPOSITORY } from "./review-history.repository.js";

@Module({
  imports: [CatalogModule, DatabaseModule, UserLibraryModule],
  providers: [
    {
      provide: REVIEW_HISTORY_REPOSITORY,
      useClass: PostgresReviewHistoryRepository,
    },
    {
      provide: DASHBOARD_CLOCK,
      useValue: () => new Date(),
    },
    DashboardService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
