import { Inject, Injectable } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { DatabaseService } from "../database/database.service.js";
import type { LearningTipRepository } from "./learning-tip.repository.js";

@Injectable()
export class PostgresLearningTipRepository implements LearningTipRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(locale: string): Promise<ApiTypes.LearningTipDto[]> {
    const result = await this.database.readQuery<ApiTypes.LearningTipDto>(
      `select tip.id, translation.title, translation.text
       from learning_tips tip
       join learning_tip_translations translation on translation.tip_id = tip.id
       where translation.locale = $1
       order by tip.sort_order, tip.id`,
      [locale],
    );
    return result.rows;
  }
}
