import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNavSession } from "@/lib/auth/server-session";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * The public front door.
 *
 * Anonymous visitors get the landing experience; signed-in users are
 * sent straight to their dashboard so `/` keeps behaving like "home".
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nivora — Your money, finally in focus",
  description:
    "A calm, private workspace for everything you earn, spend, plan, and save — transactions, budgets, analytics, goals, and recurring schedules in one dark, quiet place.",
  openGraph: {
    title: "Nivora — Your money, finally in focus",
    description:
      "Transactions, budgets, analytics, goals, and recurring schedules — one calm, private workspace for your entire financial life.",
    type: "website",
  },
};

export default async function LandingRoute() {
  const session = await getNavSession();
  if (session.status === "authenticated") {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
