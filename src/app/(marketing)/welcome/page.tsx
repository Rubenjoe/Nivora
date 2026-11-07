import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Nivora — Clarity for every financial decision",
  description:
    "A manual-first personal finance workspace for tracking income and expenses, shaping budgets, following savings goals, and understanding your month.",
  openGraph: {
    title: "Nivora — Clarity for every financial decision",
    description:
      "Bring transactions, budgets, savings goals, and monthly insights into one thoughtful financial workspace.",
    type: "website",
  },
};

export default function WelcomePage() {
  return <LandingPage />;
}
