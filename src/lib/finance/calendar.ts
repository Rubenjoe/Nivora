const DAY_MS = 86_400_000;

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function calendarDaysBetween(from: string, to: string): number {
  return (
    (parseCalendarDate(to).getTime() - parseCalendarDate(from).getTime()) /
    DAY_MS
  );
}

export function calendarDayCount(from: string, to: string): number {
  return calendarDaysBetween(from, to) + 1;
}

export function shiftCalendarDate(value: string, days: number): string {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

export function previousCalendarRange(from: string, to: string) {
  const inclusiveDays = calendarDayCount(from, to);
  const previousTo = shiftCalendarDate(from, -1);
  return {
    from: shiftCalendarDate(previousTo, -(inclusiveDays - 1)),
    to: previousTo,
  };
}

export function weekStartISO(value: string): string {
  const date = parseCalendarDate(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return formatCalendarDate(date);
}
