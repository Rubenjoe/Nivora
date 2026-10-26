"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { FormEvent, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmokeType } from "@/components/ui/smoke-type";

type AuthMode = "login" | "register";

export function AuthForm({
  mode,
  initialError = null,
  returnTo = "/",
}: {
  mode: AuthMode;
  initialError?: string | null;
  returnTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch(
        `/api/v1/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Something went wrong. Please try again.",
        );
      if (register && result.confirmationRequired) {
        setNotice(
          "Check your email to confirm your account before signing in.",
        );
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to continue. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <a className="skip-link" href="#auth-form">
        Skip to sign-in form
      </a>
      <div className="auth-panel">
        <GlowingEffect
          glow
          disabled={false}
          spread={32}
          proximity={56}
          inactiveZone={0.12}
        />
        <Link href="/" className="auth-back">
          <ArrowLeft size={16} /> Back to overview
        </Link>
        <div className="auth-brand">
          <span className="auth-mark">n</span> nivora
          <ThemeToggle />
        </div>
        <p className="eyebrow">CLARITY FOR EVERY FINANCIAL DECISION</p>
        <h1>
          <SmokeType
            text={register ? "A clearer picture starts here." : "Welcome back."}
          />
        </h1>
        <p className="auth-intro">
          {register
            ? "Create your private space to make sense of your money."
            : "Sign in to continue to your private financial space."}
        </p>
        <form id="auth-form" onSubmit={submit} className="auth-form">
          {register && (
            <label>
              Your name
              <input
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-success" role="status">
              {notice}
            </p>
          )}
          <button className="auth-submit" disabled={busy} type="submit">
            {busy && <LoaderCircle size={16} className="spin" />}
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to Nivora?"}{" "}
          <Link href={register ? "/sign-in" : "/sign-up"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <p className="auth-privacy">
          Your password is sent securely to Supabase Auth and is never stored by
          Nivora.
        </p>
      </div>
      <aside className="auth-aside">
        <div className="aside-orb" />
        <div className="aside-content">
          <span className="aside-kicker">MONEY, MADE CLEARER</span>
          <p>Good decisions begin with understanding.</p>
          <span className="aside-foot">
            A thoughtful space for your financial life.
          </span>
        </div>
      </aside>
    </main>
  );
}
