export const LEARNING_TIP_REPOSITORY = Symbol("LEARNING_TIP_REPOSITORY");

export interface LearningTipContent {
  title: string;
  text: string;
}

export interface LearningTipRecord extends LearningTipContent {
  id: string;
}

export interface LearningTipRepository {
  list(locale: string): Promise<LearningTipRecord[]>;
  create(content: LearningTipContent): Promise<LearningTipRecord>;
  update(id: string, content: LearningTipContent): Promise<LearningTipRecord | undefined>;
}
