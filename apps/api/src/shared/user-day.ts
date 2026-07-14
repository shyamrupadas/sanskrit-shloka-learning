export function isValidTimeZone(timeZone: string): boolean {
  try {
    createUserDayFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getUserDay(date: Date, timeZone: string): string {
  return formatUserDay(date, createUserDayFormatter(timeZone));
}

export function createUserDayFormatter(
  timeZone: string,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
}

export function formatUserDay(
  date: Date,
  formatter: Intl.DateTimeFormat,
): string {
  const parts = new Map(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}
