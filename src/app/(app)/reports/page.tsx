import type { Metadata } from "next";
import { MonthlyReportWorkspace } from "@/components/monthly-report-workspace";

export const metadata: Metadata = {
  title: "Monthly Money Review | Nivora",
  description:
    "Exhaustive monthly financial intelligence review evaluating cash flow, spending velocity, category shifts, and budget integrity.",
};

export default function MonthlyReportPage() {
  return <MonthlyReportWorkspace />;
}
