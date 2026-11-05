export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function monthEnd(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function toISODate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addRecurrenceDue(
  due: string,
  frequency: "weekly" | "monthly" | "yearly",
  anchorDate: string = due,
) {
  const base = new Date(`${due}T12:00:00`);
  if (frequency === "weekly") {
    base.setDate(base.getDate() + 7);
    return toISODate(base);
  }
  const anchor = new Date(`${anchorDate}T12:00:00`);
  const anchorDay = anchor.getDate();
  if (frequency === "monthly") {
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1, 12);
    const daysInNextMonth = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    next.setDate(Math.min(anchorDay, daysInNextMonth));
    return toISODate(next);
  }
  const next = new Date(base.getFullYear() + 1, anchor.getMonth(), 1, 12);
  const daysInNextMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(anchorDay, daysInNextMonth));
  return toISODate(next);
}
