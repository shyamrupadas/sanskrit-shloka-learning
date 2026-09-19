import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { LEARNING_TIP_REPOSITORY } from "./learning-tip.repository.js";
import { PostgresLearningTipRepository } from "./postgres-learning-tip.repository.js";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: LEARNING_TIP_REPOSITORY, useClass: PostgresLearningTipRepository }],
  exports: [LEARNING_TIP_REPOSITORY],
})
export class LearningModule {}
