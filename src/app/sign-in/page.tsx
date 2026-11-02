import type { Metadata } from "next";
import { LandingAuth } from "@/components/landing/landing-auth";
import { safeReturnTo } from "@/lib/security/return-to";

export const metadata: Metadata = {
  title: "Nivora — Your finances, in focus",
  description:
    "Sign in to your private overview, track spending, and keep your financial plans together.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; next?: string }>;
}) {
  const params = await searchParams;
  const initialError =
    params.auth === "confirmation-failed"
      ? "We couldn't confirm your email. Request a new sign-up link or try signing in."
      : null;
  return (
    <LandingAuth
      mode="login"
      initialError={initialError}
      returnTo={safeReturnTo(params.next)}
    />
  );
}
