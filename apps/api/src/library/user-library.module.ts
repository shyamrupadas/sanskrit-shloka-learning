import { Module } from "@nestjs/common";

import { CatalogModule } from "../catalog/catalog.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PostgresUserLibraryRepository } from "./postgres-user-library.repository.js";
import { USER_LIBRARY_REPOSITORY } from "./user-library.repository.js";
import {
  USER_LIBRARY_CLOCK,
  UserLibraryService,
} from "./user-library.service.js";

@Module({
  imports: [CatalogModule, DatabaseModule],
  providers: [
    {
      provide: USER_LIBRARY_REPOSITORY,
      useClass: PostgresUserLibraryRepository,
    },
    {
      provide: USER_LIBRARY_CLOCK,
      useValue: () => new Date(),
    },
    UserLibraryService,
  ],
  exports: [USER_LIBRARY_REPOSITORY, UserLibraryService],
})
export class UserLibraryModule {}
