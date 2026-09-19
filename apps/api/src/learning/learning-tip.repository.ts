import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

export const LEARNING_TIP_REPOSITORY = Symbol("LEARNING_TIP_REPOSITORY");

export interface LearningTipRepository {
  list(locale: string): Promise<ApiTypes.LearningTipDto[]>;
}
