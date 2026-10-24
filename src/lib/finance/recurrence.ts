import { addRecurrenceDue } from "@/lib/finance/periods";

export function nextDueOnOrAfter(
  startDate: string,
  frequency: "weekly" | "monthly" | "yearly",
  todayISO: string,
) {
  let due = startDate;
  let guard = 0;
  while (due < todayISO && guard < 500) {
    due = addRecurrenceDue(due, frequency, startDate);
    guard += 1;
  }
  return due;
}

export function isDue(
  schedule: {
    nextDueDate: string;
    endDate: string | null;
    status: string;
  },
  todayISO: string,
) {
  if (schedule.status !== "active") return false;
  if (schedule.endDate && schedule.nextDueDate > schedule.endDate) return false;
  return schedule.nextDueDate <= todayISO;
}
