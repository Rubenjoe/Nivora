"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  TrendingDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmokeType } from "@/components/ui/smoke-type";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

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
  const [showPassword, setShowPassword] = useState(false);
  const register = mode === "register";

  const prefersReducedMotion = useReducedMotion();

  // ---------- Backdrop cursor spotlight (smoothed with useSpring) ----------
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 22 });

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      pointerX.set(e.clientX);
      pointerY.set(e.clientY);
    },
    [pointerX, pointerY],
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove, prefersReducedMotion]);

  // ---------- Ledger illustration state (right panel) ----------
  const pathRef = useRef<SVGPathElement | null>(null);
  const areaClipRef = useRef<SVGRectElement | null>(null);
  const pointRef = useRef<SVGCircleElement | null>(null);
  const pathLengthRef = useRef(0);

  // Rendered sample figures, refreshed gently instead of every frame.
  const [sample, setSample] = useState({ worth: 840000, delta: 12000 });

  useEffect(() => {
    if (pathRef.current) {
      pathLengthRef.current = pathRef.current.getTotalLength();
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      const t = Date.now() / 1000;
      setSample({
        worth: Math.floor(840000 + Math.sin(t * 0.75) * 42000),
        delta: Math.floor((Math.sin(t * 0.5 + 1) * 12000) / 100) * 100,
      });
    }, 600);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  // Curve control points (y as fraction of height, 0 = top)
  const curvePoints = [
    { x: 0, y: 0.55 },
    { x: 0.16, y: 0.62 },
    { x: 0.34, y: 0.48 },
    { x: 0.52, y: 0.6 },
    { x: 0.7, y: 0.42 },
    { x: 0.86, y: 0.5 },
    { x: 1, y: 0.44 },
  ];

  const catmullRomToBezier = (
    pts: typeof curvePoints,
    w: number,
    h: number,
  ) => {
    const path: string[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      if (i === 0) {
        path.push(`M ${p1.x * w},${p1.y * h}`);
      }
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path.push(
        `C ${cp1x * w},${cp1y * h} ${cp2x * w},${cp2y * h} ${p2.x * w},${p2.y * h}`,
      );
    }
    return path.join(" ");
  };

  const fullPath = catmullRomToBezier(curvePoints, 600, 260);

  useAnimationFrame(() => {
    if (prefersReducedMotion || !pathRef.current || pathLengthRef.current === 0)
      return;

    // Sweep the line-following dot and the area reveal across the curve.
    const t = Date.now() / 1000;
    const phase = (Math.cos(t * ((2 * Math.PI) / 16)) + 1) / 2;
    const length = phase * pathLengthRef.current;
    const pt = pathRef.current.getPointAtLength(length);

    if (areaClipRef.current) {
      areaClipRef.current.setAttribute("width", String(pt.x));
    }
    if (pointRef.current) {
      pointRef.current.setAttribute("cx", String(pt.x));
      pointRef.current.setAttribute("cy", String(pt.y));
    }
  });

  const formatInr = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const signedDelta = `${sample.delta < 0 ? "−" : "+"}${formatInr(
    Math.abs(sample.delta),
  )}`;

  // ---------- Submit behaviour ----------
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

  // ---------- Motion variants ----------
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 14, opacity: 0, filter: "blur(8px)" },
    show: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 100, damping: 16 },
    },
  } as const;

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "user"}>
      <main className="auth-page">
        <a className="skip-link" href="#auth-form">
          Skip to {register ? "sign-up" : "sign-in"} form
        </a>

        {/* Backdrop: drift glows, cursor spotlight, film grain */}
        <div className="auth-backdrop" aria-hidden="true">
          <div className="auth-mesh" />
          <div className="auth-glow auth-glow-1" />
          <div className="auth-glow auth-glow-2" />
          <div className="auth-glow auth-glow-3" />
          <div className="auth-glow auth-glow-4" />
          <motion.div
            className="auth-spotlight"
            style={{ x: springX, y: springY }}
          />
          <div className="auth-grain" />
          <div className="auth-vignette" />
        </div>

        <div className="auth-split">
          {/* Left: form card */}
          <section className="auth-left">
            <div className="auth-card-wrapper">
              <div className="auth-card">
                <div className="auth-card-head">
                  <Link href="/" className="auth-back">
                    <ArrowLeft
                      size={14}
                      className="back-arrow"
                      aria-hidden="true"
                    />
                    Back to overview
                  </Link>
                  <div className="auth-brand-row">
                    <BrandWordmark className="auth-brand-lockup" label="Nivora" />

                    <ThemeToggle />
                  </div>
                </div>

                <motion.div
                  className="auth-form-inner"
                  initial="hidden"
                  animate="show"
                  variants={containerVariants}
                >
                  <motion.div
                    className="auth-form-header"
                    initial="hidden"
                    animate="show"
                    variants={itemVariants}
                  >
                    <p className="auth-eyebrow">
                      {register ? "Create your account" : "Welcome back"}
                    </p>
                    <h1 className="auth-heading">
                      <SmokeType
                        text={
                          register
                            ? "A clearer picture starts here."
                            : "Welcome back."
                        }
                      />
                    </h1>
                    <p className="auth-intro">
                      {register
                        ? "Create your private space to make sense of your money."
                        : "Sign in to continue to your private financial space."}
                    </p>
                  </motion.div>

                  {error && (
                    <div
                      className="auth-message auth-message-error"
                      role="alert"
                    >
                      <span aria-hidden="true">!</span> {error}
                    </div>
                  )}

                  {notice && (
                    <div
                      className="auth-message auth-message-success"
                      role="status"
                    >
                      <span aria-hidden="true">&#10003;</span> {notice}
                    </div>
                  )}

                  <form id="auth-form" onSubmit={submit} className="auth-form">
                    {register && (
                      <Field
                        label="Your name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Aanya Sharma"
                        required
                        maxLength={100}
                      />
                    )}
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      spellCheck={false}
                      required
                      maxLength={254}
                      placeholder="you@example.com"
                    />
                    <PasswordField
                      label="Password"
                      name="password"
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                      required
                      minLength={8}
                      maxLength={128}
                      placeholder={
                        register ? "At least 8 characters" : "••••••••"
                      }
                      show={showPassword}
                      onToggle={setShowPassword}
                    />

                    <motion.button
                      className={cn("auth-submit", busy && "auth-submit-busy")}
                      disabled={busy}
                      type="submit"
                      whileTap={{ scale: 0.98 }}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle size={15} className="spin" />
                          Please wait…
                        </>
                      ) : (
                        <>
                          Sign{register ? " up" : " in"}
                          <ArrowRight size={13} className="submit-arrow" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <div className="auth-footer">
                    <hr className="auth-divider" />
                    <p className="auth-switch">
                      {register ? "Already have an account?" : "New to Nivora?"}{" "}
                      <Link
                        href={register ? "/sign-in" : "/sign-up"}
                        className="auth-switch-link"
                      >
                        {register ? "Sign in" : "Create an account"}
                      </Link>
                    </p>
                    <p className="auth-privacy">
                      <Lock
                        size={11}
                        className="privacy-lock"
                        aria-hidden="true"
                      />
                      Your password is sent securely to Supabase Auth and is
                      never stored by Nivora.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Right: ledger illustration (hidden below 1024px) */}
          <aside className="auth-right">
            <div className="auth-right-inner">
              <div className="auth-ledger-bg" aria-hidden="true">
                <div className="auth-grid" />
              </div>

              <div className="auth-ledger-card">
                <div className="auth-ledger-head">
                  <h2 className="auth-ledger-title">Net worth</h2>
                  <span className="auth-ledger-chip">
                    <span className="auth-chip-dot" aria-hidden="true" />
                    <span className="auth-chip-text">
                      {signedDelta} this year
                    </span>
                  </span>
                </div>
                <p className="auth-ledger-sub">
                  All figures shown are sample illustrations.
                </p>

                <div className="auth-chart-wrap">
                  <svg
                    className="auth-chart-svg"
                    viewBox="0 0 600 260"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Sample net-worth curve illustration"
                  >
                    <defs>
                      <linearGradient
                        id="authChartGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                      <clipPath id="authChartClip">
                        <rect
                          ref={areaClipRef}
                          x="0"
                          y="0"
                          width={0}
                          height="260"
                        />
                      </clipPath>
                    </defs>
                    <g className="auth-gridlines">
                      {[0.2, 0.4, 0.6, 0.8].map((frac) => {
                        const y = frac * 260;
                        return (
                          <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="600"
                            y2={y}
                            stroke="#ffffff"
                            strokeOpacity="0.06"
                            strokeDasharray="4,6"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>
                    <path
                      d={`M 0 260 L 0 0 ${fullPath} L 600 260 Z`}
                      fill="url(#authChartGradient)"
                      fillOpacity="0.12"
                      clipPath="url(#authChartClip)"
                    />
                    <path
                      ref={pathRef}
                      d={fullPath}
                      fill="none"
                      stroke="url(#authChartGradient)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="auth-chart-path"
                    />
                    <circle
                      ref={pointRef}
                      cx="0"
                      cy="0"
                      r="8"
                      fill="#ffffff"
                      className="auth-chart-point"
                    />
                  </svg>

                  <div className="auth-chart-values">
                    <div className="auth-value">
                      <span className="auth-net-worth">
                        {formatInr(sample.worth)}
                      </span>
                    </div>
                    <div className="auth-delta">
                      <span className="auth-delta-text">
                        {signedDelta} this year
                      </span>
                    </div>
                  </div>

                  <p className="auth-chart-caption">
                    Illustration with sample figures
                  </p>
                </div>

                <div className="auth-chips">
                  <div
                    className="auth-chip auth-chip-left"
                    style={{ "--bobDelay": "0s" } as CSSProperties}
                  >
                    <TrendingDown className="chip-icon" aria-hidden="true" />
                    <div className="chip-copy">
                      <div className="chip-label">Groceries</div>
                      <div className="chip-value">8% less than last month</div>
                    </div>
                  </div>
                  <div
                    className="auth-chip auth-chip-right"
                    style={{ "--bobDelay": "2s" } as CSSProperties}
                  >
                    <div className="chip-copy">
                      <div className="chip-label">Goa trip</div>
                      <div className="chip-progress">
                        <div className="chip-progress-track" />
                        <div className="chip-progress-fill" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="auth-right-tagline">
                <p className="auth-tagline">
                  Good decisions begin with understanding.
                </p>
                <p className="auth-tagline-sub">
                  A thoughtful space for your financial life.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </MotionConfig>
  );
}

// ---------- Reusable Field component ----------
function Field({
  label,
  name,
  type,
  autoComplete,
  spellCheck,
  required,
  placeholder,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  spellCheck?: boolean;
  required: boolean;
  placeholder: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        className="auth-input"
      />
    </div>
  );
}

// ---------- Password field with show/hide ----------
function PasswordField({
  label,
  name,
  autoComplete,
  required,
  minLength,
  maxLength,
  placeholder,
  show,
  onToggle,
}: {
  label: string;
  name: string;
  autoComplete: string;
  required: boolean;
  minLength: number;
  maxLength: number;
  placeholder: string;
  show: boolean;
  onToggle: (value: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="auth-field auth-password">
      <label htmlFor={name}>{label}</label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        className="auth-input"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="auth-password-toggle"
        onClick={() => {
          onToggle(!show);
          inputRef.current?.focus();
        }}
      >
        <AnimatePresence mode="wait">
          {show ? (
            <EyeOff size={15} aria-hidden="true" />
          ) : (
            <Eye size={15} aria-hidden="true" />
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
