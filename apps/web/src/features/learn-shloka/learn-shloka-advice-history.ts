import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const adviceAttemptHistoryKey = "learnShlokaAdviceAttempt";
const storagePrefix = "sanskrit-shloka-learning.advice-attempt.";

export type AdviceAttempt = {
  version: 2;
  id: string;
  shlokaCode: string;
  tips: ApiTypes.LearningTipDto[] | null;
  tipIndex: number;
};

export function clearLearnShlokaAdviceAttempt(): void {
  const historyState = { ...window.history.state };
  const reference: unknown = historyState[adviceAttemptHistoryKey];
  if (isRecord(reference) && typeof reference.id === "string") {
    window.sessionStorage.removeItem(storagePrefix + reference.id);
  }
  delete historyState[adviceAttemptHistoryKey];
  window.history.replaceState(historyState, "");
}

export function readLearnShlokaAdviceAttempt(shlokaCode: string): AdviceAttempt {
  const reference: unknown = window.history.state?.[adviceAttemptHistoryKey];
  if (isRecord(reference) && reference.version === 2 && typeof reference.id === "string") {
    const saved = readStoredAttempt(reference.id);
    if (saved?.shlokaCode === shlokaCode) return saved;
  }
  // A legacy index cannot identify server content. Only its advice series restarts.
  return { version: 2, id: crypto.randomUUID(), shlokaCode, tips: null, tipIndex: 0 };
}

export function attachLearnShlokaAdviceAttempt(attempt: AdviceAttempt): void {
  writeLearnShlokaAdviceAttempt(attempt);
  window.history.replaceState({
    ...window.history.state,
    [adviceAttemptHistoryKey]: { version: 2, id: attempt.id },
  }, "");
}

export function writeLearnShlokaAdviceAttempt(attempt: AdviceAttempt): void {
  window.sessionStorage.setItem(storagePrefix + attempt.id, JSON.stringify(attempt));
}

const pendingRequests = new Map<string, Promise<AdviceAttempt | undefined>>();

export function loadLearnShlokaAdvice(
  id: string,
  fetchTips: () => Promise<ApiTypes.LearningTipListDto>,
): Promise<AdviceAttempt | undefined> {
  const saved = readStoredAttempt(id);
  if (!saved || saved.tips !== null) return Promise.resolve(saved);
  const pending = pendingRequests.get(id);
  if (pending) return pending;
  const request = fetchTips()
    .then((result) => captureLearnShlokaAdvice(id, result.items))
    .finally(() => { pendingRequests.delete(id); });
  pendingRequests.set(id, request);
  return request;
}

function captureLearnShlokaAdvice(
  id: string,
  tips: ApiTypes.LearningTipDto[],
): AdviceAttempt | undefined {
  const saved = readStoredAttempt(id);
  // Cancellation deletes this record. Late responses must never recreate it.
  if (!saved) return undefined;
  if (saved.tips !== null) return saved;
  const captured = { ...saved, tips };
  writeLearnShlokaAdviceAttempt(captured);
  return captured;
}

function readStoredAttempt(id: string): AdviceAttempt | undefined {
  let saved: unknown;
  try {
    saved = JSON.parse(window.sessionStorage.getItem(storagePrefix + id) ?? "null");
  } catch {
    return undefined;
  }
  if (
    isRecord(saved) && saved.version === 2 && saved.id === id &&
    typeof saved.shlokaCode === "string" &&
    typeof saved.tipIndex === "number" && Number.isInteger(saved.tipIndex) && saved.tipIndex >= 0 &&
    (saved.tips === null || (Array.isArray(saved.tips) && saved.tips.every(isTip))) &&
    saved.tipIndex < Math.max(1, saved.tips?.length ?? 0)
  ) return saved as AdviceAttempt;
  return undefined;
}

function isTip(value: unknown): value is ApiTypes.LearningTipDto {
  return isRecord(value) && typeof value.id === "string" &&
    typeof value.title === "string" && typeof value.text === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
