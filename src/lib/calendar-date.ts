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

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Calendar month arithmetic. A day missing from the target month becomes that month's last day
// (31 August + 6 months = 28 February; 29 February 2024 + 12 months = 28 February 2025).
export function addMonths(calendarDate: string, months: number): string {
  const date = parseCalendarDate(calendarDate);
  if (!date) throw new Error(`Invalid calendar date: ${calendarDate}`);
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, monthIndex));
  return toCalendarDateString(new Date(Date.UTC(year, monthIndex, day)));
}

export function addDays(calendarDate: string, days: number): string {
  const date = parseCalendarDate(calendarDate);
  if (!date) throw new Error(`Invalid calendar date: ${calendarDate}`);
  return toCalendarDateString(new Date(date.getTime() + days * 86_400_000));
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  if (!start || !end) throw new Error(`Invalid calendar date: ${from} or ${to}`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
