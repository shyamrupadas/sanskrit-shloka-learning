export type PersistedLibraryShlokaStatus = "learning" | "reviewing";

export interface UserShlokaStatusRecord {
  shlokaCode: string;
  status: PersistedLibraryShlokaStatus;
}

export interface SetUserShlokaStatusInput {
  accountId: string;
  shlokaCode: string;
  status: PersistedLibraryShlokaStatus;
}

export interface ClearUserShlokaStatusInput {
  accountId: string;
  shlokaCode: string;
}

export interface UserLibraryRepository {
  clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<void>;
  listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]>;
  setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void>;
}

export const USER_LIBRARY_REPOSITORY = Symbol("USER_LIBRARY_REPOSITORY");
