import { AuthForm } from "@/components/auth-form";
import { safeReturnTo } from "@/lib/security/return-to";

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
    <AuthForm
      mode="login"
      initialError={initialError}
      returnTo={safeReturnTo(params.next)}
    />
  );
}
