import {
  type ClearUserShlokaStatusInput,
  type SetUserShlokaStatusInput,
  type UserLibraryRepository,
  type UserShlokaStatusRecord,
} from "./user-library.repository.js";

export class InMemoryUserLibraryRepository implements UserLibraryRepository {
  private readonly statuses = new Map<string, UserShlokaStatusRecord>();

  async clearShlokaStatus(input: ClearUserShlokaStatusInput): Promise<void> {
    this.statuses.delete(statusKey(input.accountId, input.shlokaCode));
  }

  async listShlokaStatuses(accountId: string): Promise<UserShlokaStatusRecord[]> {
    return [...this.statuses.entries()]
      .filter(([key]) => key.startsWith(`${accountId}:`))
      .map(([, status]) => ({ ...status }));
  }

  async setShlokaStatus(input: SetUserShlokaStatusInput): Promise<void> {
    this.statuses.set(statusKey(input.accountId, input.shlokaCode), {
      shlokaCode: input.shlokaCode,
      status: input.status,
    });
  }
}

function statusKey(accountId: string, shlokaCode: string): string {
  return `${accountId}:${shlokaCode}`;
}
