// Calendar dates (no time of day) travel as "YYYY-MM-DD" strings and are stored in
// PostgreSQL DATE columns, which Prisma returns as UTC-midnight Date objects.
// Always read and format them in UTC so a timezone never shifts the day.

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

export function parseCalendarDate(value: string): Date | null {
  const match = PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects dates such as 2025-02-29 that JavaScript would roll over.
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

export function toCalendarDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

// Today's date in the given timezone, as YYYY-MM-DD.
export function todayIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    now,
  );
}

export function addYears(calendarDate: string, years: number): string {
  const [year, rest] = [Number(calendarDate.slice(0, 4)), calendarDate.slice(4)];
  const candidate = `${String(year + years).padStart(4, "0")}${rest}`;
  // 29 February moves to 28 February in a non-leap year.
  return isCalendarDate(candidate) ? candidate : `${String(year + years).padStart(4, "0")}-02-28`;
}
