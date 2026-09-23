// Time-of-day greeting in the user's own timezone, not the server's.
export function greetingFor(now: Date, timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
