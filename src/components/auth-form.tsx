"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { FormEvent, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmokeType } from "@/components/ui/smoke-type";
import { motion } from "framer-motion";

type AuthMode = "login" | "register";

// Animation Variants for stazggered, buttery-smooth entrances
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

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
    <main className="flex min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      <a className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-zinc-900 focus:text-white z-50" href="#auth-form">
        Skip to sign-in form
      </a>

      {/* Left Panel: Form Section */}
      <div className="relative flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-24 xl:px-32 z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative w-full max-w-md mx-auto rounded-3xl border border-white/[0.08] bg-zinc-900/40 p-10 shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          {/* Subtle atmospheric glow behind the panel */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 blur-xl" />

          <GlowingEffect
            glow
            disabled={false}
            spread={40}
            proximity={64}
            inactiveZone={0.1}
          />

          <motion.div variants={itemVariants} className="mb-10 flex items-center justify-between">
            <Link
              href="/"
              className="group flex items-center text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" />
              Back to overview
            </Link>
            <div className="flex items-center gap-3">
              <span className="flex items-center text-lg font-bold tracking-tight text-white">
                <span className="mr-1 flex h-6 w-6 items-center justify-center rounded bg-indigo-500 text-xs text-white">n</span>
                nivora
              </span>
              <ThemeToggle />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <p className="mb-2 text-xs font-semibold tracking-widest text-indigo-400 uppercase">
              Clarity for every financial decision
            </p>
            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">
              <SmokeType
                text={register ? "A clearer picture starts here." : "Welcome back."}
              />
            </h1>
            <p className="mb-8 text-sm text-zinc-400 leading-relaxed">
              {register
                ? "Create your private space to make sense of your money."
                : "Sign in to continue to your private financial space."}
            </p>
          </motion.div>

          <motion.form variants={containerVariants} id="auth-form" onSubmit={submit} className="flex flex-col gap-5">
            {register && (
              <motion.label variants={itemVariants} className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
                Your name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:ring-4 focus:ring-indigo-500/10"
                />
              </motion.label>
            )}

            <motion.label variants={itemVariants} className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                required
                maxLength={254}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:ring-4 focus:ring-indigo-500/10"
              />
            </motion.label>

            <motion.label variants={itemVariants} className="flex flex-col gap-2 text-sm font-medium text-zinc-300">
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={128}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-black/40 focus:ring-4 focus:ring-indigo-500/10"
              />
            </motion.label>

            {error && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-red-400" role="alert">
                {error}
              </motion.p>
            )}

            {notice && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-emerald-400" role="status">
                {notice}
              </motion.p>
            )}

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-zinc-100 px-4 py-3.5 text-sm font-semibold text-zinc-900 shadow-md transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="mr-2 animate-spin" />
                  Please wait…
                </>
              ) : (
                register ? "Create account" : "Sign in"
              )}
            </motion.button>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-4 text-center">
            <p className="text-sm text-zinc-400">
              {register ? "Already have an account?" : "New to Nivora?"}{" "}
              <Link href={register ? "/sign-in" : "/sign-up"} className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300">
                {register ? "Sign in" : "Create an account"}
              </Link>
            </p>
            <p className="text-xs text-zinc-600">
              Your password is sent securely to Supabase Auth and is never stored by Nivora.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel: Atmospheric Aside */}
      <aside className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden border-l border-white/[0.05] bg-zinc-950 lg:flex">
        {/* Abstract animated geometric orb */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-900/40 via-purple-900/20 to-transparent blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative z-10 flex max-w-sm flex-col text-center"
        >
          <span className="mb-4 text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">
            Money, made clearer
          </span>
          <p className="mb-6 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-4xl font-medium tracking-tight text-transparent">
            Good decisions begin with understanding.
          </p>
          <span className="text-sm font-medium text-zinc-400">
            A thoughtful space for your financial life.
          </span>
        </motion.div>

        {/* Subtle grid background overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </aside>
    </main>
  );
}