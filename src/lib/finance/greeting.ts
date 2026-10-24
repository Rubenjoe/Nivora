export type GreetingPeriod = "this-month" | "last-month";

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function localHour(date: Date, timeZone?: string | null): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone,
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      if (Number.isFinite(hour)) return hour % 24;
    } catch {
      // Invalid stored timezone: fall back to the viewer's browser timezone.
    }
  }
  return date.getHours();
}

export function buildGreeting(
  date: Date,
  displayName: string | null | undefined,
  timeZone?: string | null,
): string {
  const hour = localHour(date, timeZone);
  const salutation = greetingForHour(hour);
  const name = displayName?.trim();
  return name ? `${salutation}, ${name}` : "Welcome back";
}

export function greetingSubtitle(period: GreetingPeriod): string {
  return period === "this-month"
    ? "Here's your financial picture for this month."
    : "Here's how last month closed out.";
}
