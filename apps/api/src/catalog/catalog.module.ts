import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { CATALOG_REPOSITORY } from "./catalog.repository.js";
import { CatalogService } from "./catalog.service.js";
import { PostgresCatalogRepository } from "./postgres-catalog.repository.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: CATALOG_REPOSITORY,
      useClass: PostgresCatalogRepository,
    },
    CatalogService,
  ],
  exports: [CATALOG_REPOSITORY, CatalogService],
})
export class CatalogModule {}
