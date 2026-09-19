import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { DatabaseService } from "../database/database.service.js";
import type { LearningTipContent, LearningTipRecord, LearningTipRepository } from "./learning-tip.repository.js";

const listTipsSql = `select tip.id, translation.title, translation.text
       from learning_tips tip
       join learning_tip_translations translation on translation.tip_id = tip.id
       where translation.locale = $1
       order by tip.sort_order, tip.id`;

@Injectable()
export class PostgresLearningTipRepository implements LearningTipRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(body: LearningTipContent): Promise<LearningTipRecord> {
    return this.database.transaction(async (executor) => {
      // Serialize appends, including the empty list, before reading its last position.
      await executor.query("lock table learning_tips in exclusive mode");
      const id = randomUUID();
      await executor.query(
        `insert into learning_tips (id, sort_order)
         select $1, coalesce(max(sort_order), -1) + 1 from learning_tips`,
        [id],
      );
      await executor.query(
        `insert into learning_tip_translations (tip_id, locale, title, text) values ($1, $2, $3, $4)`,
        [id, "ru", body.title, body.text],
      );
      return { id, ...body };
    });
  }

  async update(id: string, body: LearningTipContent): Promise<LearningTipRecord | undefined> {
    const result = await this.database.writeQuery<LearningTipRecord>(
      `update learning_tip_translations set title = $3, text = $4
       where tip_id = $1 and locale = $2 returning tip_id as id, title, text`,
      [id, "ru", body.title, body.text],
    );
    return result.rows[0];
  }

  async list(locale: string): Promise<LearningTipRecord[]> {
    const result = await this.database.readQuery<LearningTipRecord>(
      listTipsSql,
      [locale],
    );
    return result.rows;
  }

  async move(id: string, direction: "up" | "down"): Promise<LearningTipRecord[] | "not-found" | "edge"> {
    return this.database.transaction(async (executor) => {
      // Share the append lock so adjacent positions cannot change while swapping.
      await executor.query("lock table learning_tips in exclusive mode");
      const { rows } = await executor.query<{ id: string; sort_order: number }>(
        "select id, sort_order from learning_tips order by sort_order, id",
      );
      const index = rows.findIndex((tip) => tip.id === id);
      const current = rows[index];
      if (!current) return "not-found";
      const adjacent = rows[index + (direction === "up" ? -1 : 1)];
      if (!adjacent) return "edge";
      await executor.query(
        `update learning_tips
         set sort_order = case id when $1 then $4::integer when $2 then $3::integer end
         where id in ($1, $2)`,
        [current.id, adjacent.id, current.sort_order, adjacent.sort_order],
      );
      return (await executor.query<LearningTipRecord>(listTipsSql, ["ru"])).rows;
    });
  }

  async delete(id: string): Promise<LearningTipRecord[] | undefined> {
    return this.database.transaction(async (executor) => {
      await executor.query("lock table learning_tips in exclusive mode");
      // The existing FK cascades deletion to every language version.
      const result = await executor.query("delete from learning_tips where id = $1 returning id", [id]);
      if (result.rows.length === 0) return undefined;
      return (await executor.query<LearningTipRecord>(listTipsSql, ["ru"])).rows;
    });
  }
}
