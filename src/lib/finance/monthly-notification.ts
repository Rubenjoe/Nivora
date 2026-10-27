import {
  formatMonthLabel,
  getLocalTodayISO,
} from "@/lib/finance/monthly-report";

export type MonthlyNotificationStatus = {
  isReady: boolean;
  previousMonth: string; // "YYYY-MM"
  previousMonthLabel: string;
  hasActivity: boolean;
};

export function getPreviousMonthISO(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.slice(0, 7).split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // 0-indexed
  const prevDate = new Date(year, month - 1, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
}

export function evaluateMonthlyNotification({
  timeZone,
  userCreatedAt,
  hasTransactionsInPriorMonth,
}: {
  timeZone?: string | null;
  userCreatedAt: Date;
  hasTransactionsInPriorMonth: boolean;
}): MonthlyNotificationStatus {
  const todayISO = getLocalTodayISO(timeZone);
  const currentMonth = todayISO.slice(0, 7);
  const previousMonth = getPreviousMonthISO(todayISO);
  const previousMonthLabel = formatMonthLabel(previousMonth);

  // User must have signed up on or before the previous month end
  const prevMonthEnd = new Date(
    parseInt(previousMonth.slice(0, 4), 10),
    parseInt(previousMonth.slice(5, 7), 10),
    0,
    23,
    59,
    59,
  );

  const eligibleForNotification =
    userCreatedAt <= prevMonthEnd || hasTransactionsInPriorMonth;

  return {
    isReady: eligibleForNotification,
    previousMonth,
    previousMonthLabel,
    hasActivity: hasTransactionsInPriorMonth,
  };
}
