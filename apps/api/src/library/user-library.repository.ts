export type PersistedLibraryShlokaStatus = "learning" | "reviewing";

export interface UserShlokaStatusRecord {
  createdAt: Date;
  reviewingStartedAt?: Date;
  reviewingStartedUserDay?: string;
  shlokaCode: string;
  status: PersistedLibraryShlokaStatus;
}

export interface SetUserShlokaStatusInput {
  accountId: string;
  createdAt: Date;
  shlokaCode: string;
  status: "learning";
}

export interface ClearUserShlokaStatusInput {
  accountId: string;
  shlokaCode: string;
}

export interface MarkShlokaLearnedInput {
  accountId: string;
  reviewingStartedAt: Date;
  reviewingStartedUserDay: string;
  shlokaCode: string;
}

export type MarkShlokaLearnedResult =
  | {
      kind: "transitioned" | "already-reviewing";
      reviewingStartedAt: Date;
      reviewingStartedUserDay?: string;
    }
  | { kind: "not-learning" };

export interface UserLibraryRepository {
  clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<boolean>;
  listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]>;
  markShlokaLearned(
    input: MarkShlokaLearnedInput,
  ): Promise<MarkShlokaLearnedResult>;
  setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void>;
}

export const USER_LIBRARY_REPOSITORY = Symbol("USER_LIBRARY_REPOSITORY");
