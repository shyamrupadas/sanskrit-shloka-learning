const adviceAttemptHistoryKey = "learnShlokaAdviceAttempt";

export function clearLearnShlokaAdviceAttempt(): void {
  if (!isRecord(window.history.state)) {
    return;
  }

  const historyState = { ...window.history.state };
  delete historyState[adviceAttemptHistoryKey];
  window.history.replaceState(historyState, "");
}

export function readLearnShlokaAdviceTipIndex(
  shlokaCode: string,
  tipCount: number,
): number {
  const historyState = window.history.state;
  if (!isRecord(historyState)) {
    return 0;
  }

  const adviceAttempt = historyState[adviceAttemptHistoryKey];
  if (
    !isRecord(adviceAttempt) ||
    adviceAttempt.shlokaCode !== shlokaCode ||
    typeof adviceAttempt.tipIndex !== "number" ||
    !Number.isInteger(adviceAttempt.tipIndex) ||
    adviceAttempt.tipIndex < 0 ||
    adviceAttempt.tipIndex >= tipCount
  ) {
    return 0;
  }

  return adviceAttempt.tipIndex;
}

export function writeLearnShlokaAdviceTipIndex(
  shlokaCode: string,
  tipIndex: number,
): void {
  const historyState = isRecord(window.history.state)
    ? window.history.state
    : {};
  window.history.replaceState(
    {
      ...historyState,
      [adviceAttemptHistoryKey]: { shlokaCode, tipIndex },
    },
    "",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
