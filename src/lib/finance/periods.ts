export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function toISODate(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

export function monthKey(date = new Date()) {
  const start = monthStart(date);
  return toISODate(start).slice(0, 7);
}

export function periodMonthISO(date = new Date()) {
  return `${monthKey(date)}-01`;
}

export function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addRecurrenceDue(
  due: string,
  frequency: "weekly" | "monthly" | "yearly",
) {
  const base = new Date(`${due}T12:00:00`);
  if (frequency === "weekly") {
    base.setDate(base.getDate() + 7);
    return toISODate(base);
  }
  if (frequency === "monthly") {
    // Clamp to the end of the next month so Jan 31 -> Feb 28, not Mar 3.
    const day = base.getDate();
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1, 12);
    const daysInNextMonth = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    next.setDate(Math.min(day, daysInNextMonth));
    return toISODate(next);
  }
  base.setFullYear(base.getFullYear() + 1);
  return toISODate(base);
}
