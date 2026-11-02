"use client";

/**
 * LandingAuth — the artistic Nivora landing experience.
 *
 * A scroll-driven, cursor-reactive showcase in the Nivora palette
 * (near-black, violet #a995ff, gold #d6b779) that keeps the existing
 * auth behaviour byte-for-byte: same endpoints, same payloads,
 * same error and confirmation handling as the original AuthForm.
 *
 * Sections
 *   1. Preloader      — brand bars, counter, curtain reveal (once / session)
 *   2. Nav            — glass on scroll, anchor links, theme-aware CTAs
 *   3. Hero           — display type reveal + auth card + floating money art
 *   4. Ticker         — infinite marquee whose speed reacts to scroll velocity
 *   5. Workspaces     — bento grid with ghost index numerals + hover spotlight
 *   6. Money art      — parallax banknotes, code clouds, ghost typography
 *   7. Numbers        — scroll-triggered count-ups
 *   8. CTA + footer   — magnetic gold button, quiet sign-off
 *
 * Everything respects prefers-reduced-motion.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Lock,
  PiggyBank,
  Receipt,
  Target,
} from "lucide-react";
import { AuroraField } from "@/components/landing/aurora-field";
import { BrandWordmark } from "@/components/brand-wordmark";
import { cn } from "@/lib/utils";
import "./landing.css";

type AuthMode = "login" | "register";

// ---------------------------------------------------------------------------
// Shared motion helpers
// ---------------------------------------------------------------------------

/** Generic scroll-into-view reveal: rise + de-blur. */
function Reveal({
  children,
  delay = 0,
  y = 30,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? undefined : { opacity: 0, y, filter: "blur(10px)" }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ type: "spring", stiffness: 80, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Magnetic wrapper — element gravitates toward the cursor, springs back. */
function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 160, damping: 13, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 160, damping: 13, mass: 0.2 });

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [reduced, strength, x, y],
  );

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduced ? undefined : { x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 1. Preloader — bars grow, counter climbs, curtains part
// ---------------------------------------------------------------------------

function Preloader({ onReveal }: { onReveal: () => void }) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;

    let seen = false;
    try {
      seen = sessionStorage.getItem("nivora-intro") === "seen";
    } catch {
      /* private mode — show the intro anyway */
    }

    if (seen) {
      // Returning visitor in this session — skip straight to the reveal.
      const t = window.setTimeout(() => {
        onReveal();
        setShow(false);
      }, 0);
      return () => window.clearTimeout(t);
    }

    document.documentElement.style.overflow = "hidden";
    const controls = animate(0, 100, {
      duration: 1.5,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
      onComplete: () => {
        window.setTimeout(() => {
          try {
            sessionStorage.setItem("nivora-intro", "seen");
          } catch {
            /* ignore */
          }
          document.documentElement.style.overflow = "";
          onReveal();
          setShow(false);
        }, 260);
      },
    });
    return () => {
      controls.stop();
      document.documentElement.style.overflow = "";
    };
  }, [reduced, onReveal]);

  return (
    <AnimatePresence>
      {show && !reduced && (
        <motion.div
          className="lp-loader"
          aria-hidden="true"
          exit={{ opacity: 1 }}
          transition={{ duration: 0.95, ease: "linear" }}
        >
          <motion.div
            className="lp-loader-panel lp-loader-panel-top"
            exit={{ y: "-100%" }}
            transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="lp-loader-panel lp-loader-panel-bottom"
            exit={{ y: "100%" }}
            transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="lp-loader-center"
            exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            transition={{ duration: 0.32, ease: "easeIn" }}
          >
            <span className="sr-only" role="status">
              Nivora is loading
            </span>
            <div className="lp-loader-bars" aria-hidden="true">
              <motion.span
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="lp-loader-word">nivora</div>
            <div className="lp-loader-count" aria-hidden="true">
              {String(count).padStart(3, "0")}
            </div>
            <div className="lp-loader-line" aria-hidden="true">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: count / 100 }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// 2. Navigation
// ---------------------------------------------------------------------------

function Nav({ mode, play }: { mode: AuthMode; play: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <motion.header
      className={cn("lp-nav", scrolled && "lp-nav-scrolled")}
      initial={{ y: -28, opacity: 0 }}
      animate={play ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href="/" className="lp-nav-brand" aria-label="Nivora home">
        <BrandWordmark label="Nivora" />
      </Link>

      <nav className="lp-nav-links" aria-label="Landing sections">
        <a href="#lp-workspaces" onClick={(e) => goTo(e, "lp-workspaces")}>
          Workspaces
        </a>
        <a href="#lp-art" onClick={(e) => goTo(e, "lp-art")}>
          The art
        </a>
        <a href="#lp-numbers" onClick={(e) => goTo(e, "lp-numbers")}>
          Numbers
        </a>
      </nav>

      <div className="lp-nav-actions">
        <Link
          href={mode === "login" ? "#lp-form" : "/sign-in"}
          className="lp-nav-signin"
        >
          Sign in
        </Link>
        <Magnetic strength={0.22} className="lp-nav-magnet">
          <Link
            href="/sign-up"
            className={cn("lp-nav-cta", mode === "register" && "lp-nav-cta-active")}
          >
            {mode === "register" ? "You're at the start" : "Get started"}
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </Magnetic>
      </div>
    </motion.header>
  );
}

// ---------------------------------------------------------------------------
// 3a. Auth card — identical behaviour to the original form
// ---------------------------------------------------------------------------

function AuthCard({
  mode,
  initialError,
  returnTo,
  play,
}: {
  mode: AuthMode;
  initialError: string | null;
  returnTo: string;
  play: boolean;
}) {
  const router = useRouter();
  const register = mode === "register";
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  // Spotlight border tracks the cursor across the card.
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

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

  const item = {
    hidden: { y: 16, opacity: 0, filter: "blur(8px)" },
    show: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 110, damping: 16 },
    },
  };

  return (
    <motion.div
      id="lp-form"
      className="lp-auth-card"
      ref={cardRef}
      onPointerMove={onCardMove}
      initial={{ y: 36, opacity: 0, filter: "blur(12px)" }}
      animate={play ? { y: 0, opacity: 1, filter: "blur(0px)" } : undefined}
      transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.55 }}
    >
      <motion.div
        className="lp-auth-inner"
        initial="hidden"
        animate={play ? "show" : "hidden"}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.7 } },
        }}
      >
        <motion.div className="lp-auth-head" variants={item}>
          <p className="lp-auth-eyebrow">
            {register ? "Create your account" : "Welcome back"}
          </p>
          <h2 className="lp-auth-title">
            {register ? "A clearer picture starts here." : "Your private space awaits."}
          </h2>
        </motion.div>

        {error && (
          <div className="lp-auth-message lp-auth-message-error" role="alert">
            <span aria-hidden="true">!</span> {error}
          </div>
        )}
        {notice && (
          <div className="lp-auth-message lp-auth-message-success" role="status">
            <span aria-hidden="true">&#10003;</span> {notice}
          </div>
        )}

        <form className="lp-auth-form" onSubmit={submit}>
          {register && (
            <div className="lp-auth-field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Aanya Sharma"
                required
                maxLength={100}
                className="lp-auth-input"
              />
            </div>
          )}
          <motion.div className="lp-auth-field" variants={item}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              maxLength={254}
              placeholder="you@example.com"
              className="lp-auth-input"
            />
          </motion.div>
          <motion.div className="lp-auth-field" variants={item}>
            <label htmlFor="password">Password</label>
            <div className="lp-auth-password">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={128}
                placeholder={register ? "At least 8 characters" : "••••••••"}
                className="lp-auth-input"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="lp-auth-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {showPassword ? (
                    <motion.span
                      key="off"
                      initial={{ opacity: 0, rotate: -30 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 30 }}
                      transition={{ duration: 0.15 }}
                    >
                      <EyeOff size={15} aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="on"
                      initial={{ opacity: 0, rotate: 30 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -30 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Eye size={15} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>

          <motion.button
            className={cn("lp-auth-submit", busy && "lp-auth-submit-busy")}
            disabled={busy}
            type="submit"
            variants={item}
            whileTap={{ scale: 0.98 }}
          >
            {busy ? (
              <>
                <LoaderCircle size={15} className="lp-spin" aria-hidden="true" />
                Please wait…
              </>
            ) : (
              <>
                Sign{register ? " up" : " in"}
                <ArrowRight size={13} className="lp-auth-submit-arrow" aria-hidden="true" />
              </>
            )}
          </motion.button>
        </form>

        <motion.div className="lp-auth-foot" variants={item}>
          <p className="lp-auth-switch">
            {register ? "Already have an account?" : "New to Nivora?"}{" "}
            <Link
              href={register ? "/sign-in" : "/sign-up"}
              className="lp-auth-switch-link"
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="lp-auth-privacy">
            <Lock size={11} aria-hidden="true" />
            Your financial information stays private to your account.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 3b. Hero right — floating money constellation (desktop)
// ---------------------------------------------------------------------------

/**
 * The specimen — a banknote-inspired art object. Pure ornament: guilloche
 * arcs, a gradient rupee glyph, micro-print and a serial line. No figures,
 * no charts — just the money aesthetic.
 */
function SpecimenCard() {
  return (
    <div className="lp-spec" aria-hidden="true">
      <span className="lp-spec-arc lp-spec-arc-a" />
      <span className="lp-spec-arc lp-spec-arc-b" />
      <span className="lp-spec-arc lp-spec-arc-c" />

      <div className="lp-spec-head">
        <span className="lp-spec-brand">nivora</span>
        <span className="lp-spec-tag">specimen</span>
      </div>

      <div className="lp-spec-face">
        <span className="lp-spec-glyph">₹</span>
      </div>

      <div className="lp-spec-foot">
        <span className="lp-spec-micro">private by design · no cash value</span>
        <span className="lp-spec-serial">NV 04218976 A</span>
      </div>

      <span className="lp-spec-corner lp-spec-corner-tl" />
      <span className="lp-spec-corner lp-spec-corner-br" />
    </div>
  );
}

function HeroArt({ play }: { play: boolean }) {
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 16 });
  const sry = useSpring(ry, { stiffness: 120, damping: 16 });

  const onTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 10); // yaw
    rx.set(-py * 8); // pitch
  };
  const onTiltEnd = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.aside
      className="lp-hero-art"
      initial={{ opacity: 0, y: 40 }}
      animate={play ? { opacity: 1, y: 0 } : undefined}
      transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.75 }}
    >
      <div className="lp-art-ring" aria-hidden="true" />
      <div className="lp-art-ring lp-art-ring-2" aria-hidden="true" />
      <div className="lp-art-glow" aria-hidden="true" />

      <motion.div
        ref={tiltRef}
        className="lp-tilt"
        style={{ rotateX: srx, rotateY: sry }}
        onPointerMove={onTilt}
        onPointerLeave={onTiltEnd}
      >
        <SpecimenCard />
      </motion.div>

      <motion.div
        className="lp-art-coin"
        animate={play ? { rotate: [0, 8, -6, 0] } : undefined}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <span className="lp-art-coin-face">₹</span>
      </motion.div>
    </motion.aside>
  );
}

// ---------------------------------------------------------------------------
// 4. Ticker — speed reacts to scroll velocity
// ---------------------------------------------------------------------------

const TICKER_ITEMS = [
  "Every rupee in focus",
  "Zero ads",
  "Private by design",
  "Spending in clear view",
  "Plans that unfold",
  "Calm over noise",
  "Six focused workspaces",
  "Your data stays yours",
  "Clarity by design",
];

function Ticker() {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = stripRef.current;
    if (!el) return;
    const animations = el.getAnimations();
    if (animations.length === 0) return;

    let raf = 0;
    let lastY = window.scrollY;
    let vel = 0;
    const tick = () => {
      const y = window.scrollY;
      vel += ((y - lastY) / 16.7 - vel) * 0.1;
      lastY = y;
      const rate = Math.max(0.4, Math.min(4, 1 + Math.abs(vel) * 0.09));
      for (const a of animations) {
        try {
          a.playbackRate = rate;
        } catch {
          /* animation may be reclaimed */
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const row = (
    <>
      {TICKER_ITEMS.map((item, i) => (
        <span className="lp-ticker-item" key={`${item}-${i}`}>
          <i className="lp-ticker-sep" aria-hidden="true" />
          {item}
        </span>
      ))}
    </>
  );

  return (
    <div className="lp-ticker" aria-hidden="true">
      <div className="lp-ticker-strip" ref={stripRef}>
        <div className="lp-ticker-row">{row}</div>
        <div className="lp-ticker-row" aria-hidden="true">
          {row}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Workspaces bento
// ---------------------------------------------------------------------------

function BentoCard({
  className,
  icon,
  index,
  title,
  blurb,
  delay = 0,
}: {
  className?: string;
  icon: ReactNode;
  index: string;
  title: string;
  blurb: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  return (
    <Reveal delay={delay} className={cn("lp-bento", className)}>
      <motion.div
        ref={ref}
        className="lp-bento-inner"
        onPointerMove={onMove}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <span className="lp-bento-index" aria-hidden="true">
          {index}
        </span>
        <div className="lp-bento-icon">{icon}</div>
        <h3 className="lp-bento-title">{title}</h3>
        <p className="lp-bento-blurb">{blurb}</p>
      </motion.div>
    </Reveal>
  );
}

function Workspaces() {
  return (
    <section className="lp-section lp-workspaces" id="lp-workspaces">
      <div className="lp-section-head">
        <Reveal>
          <p className="lp-eyebrow">The workspaces</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="lp-h2">
            Six rooms. <span className="lp-gold">One clear view.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="lp-lede">
            Every part of your financial life gets its own quiet, precise
            space — and every space talks to the others.
          </p>
        </Reveal>
      </div>

      <div className="lp-bento-grid">
        <BentoCard
          icon={<Receipt size={17} />}
          index="01"
          title="Transactions"
          blurb="Every entry cleanly categorised, ready when you are."
          delay={0.05}
        />
        <BentoCard
          icon={<PiggyBank size={17} />}
          index="02"
          title="Budgets"
          blurb="Limits that guide, never nag."
          delay={0.12}
        />
        <BentoCard
          icon={<Activity size={17} />}
          index="03"
          title="Analytics"
          blurb="Patterns you can actually see."
          delay={0.05}
        />
        <BentoCard
          icon={<Target size={17} />}
          index="04"
          title="Goals"
          blurb="Milestones that stay in motion."
          delay={0.12}
        />
        <BentoCard
          icon={<FileText size={17} />}
          index="05"
          title="Reports"
          blurb="A monthly story, told gently."
          delay={0.19}
        />
        <BentoCard
          icon={<CalendarDays size={17} />}
          index="06"
          title="Recurring"
          blurb="The rhythm of your money, on repeat."
          delay={0.08}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Money art — parallax interlude
// ---------------------------------------------------------------------------

function Banknote({ currency }: { currency: string }) {
  return (
    <div className="lp-bill" aria-hidden="true">
      <span className="lp-bill-glyph">{currency}</span>
      <span className="lp-bill-micro">Nivora · specimen</span>
      <span className="lp-bill-serial">NV 04218976 A</span>
      <span className="lp-bill-corner" />
    </div>
  );
}

function MoneyArt() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const ghostX = useTransform(scrollYProgress, [0, 1], ["7%", "-13%"]);
  const cloudY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const haloScale = useTransform(scrollYProgress, [0.2, 0.55, 0.9], [0.7, 1.05, 0.85]);
  const raysOpacity = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 1, 0]);

  const note1y = useTransform(scrollYProgress, [0.12, 0.75], [130, -190]);
  const note1r = useTransform(scrollYProgress, [0.12, 0.75], [-16, 10]);
  const note2y = useTransform(scrollYProgress, [0.05, 0.7], [60, -150]);
  const note2r = useTransform(scrollYProgress, [0.05, 0.7], [12, -14]);
  const note3y = useTransform(scrollYProgress, [0.2, 0.8], [170, -220]);
  const note3r = useTransform(scrollYProgress, [0.2, 0.8], [8, -18]);
  const note4y = useTransform(scrollYProgress, [0.08, 0.72], [40, -120]);
  const note4r = useTransform(scrollYProgress, [0.08, 0.72], [-10, 14]);
  const note5y = useTransform(scrollYProgress, [0.25, 0.85], [150, -240]);
  const note5r = useTransform(scrollYProgress, [0.25, 0.85], [18, -8]);

  return (
    <section className="lp-section lp-art" id="lp-art" ref={ref}>
      <div className="lp-torn lp-torn-top" aria-hidden="true" />
      <motion.span className="lp-ghost" style={{ x: ghostX }} aria-hidden="true">
        CAPITAL
      </motion.span>
      <motion.div className="lp-art-halo" style={{ scale: haloScale }} aria-hidden="true" />
      <motion.div className="lp-art-rays" style={{ opacity: raysOpacity }} aria-hidden="true" />

      <motion.div className="lp-code-clouds" style={{ y: cloudY }} aria-hidden="true">
        <span className="lp-code-strip lp-code-strip-a">
          await ledger.settle() → true · ₹ += intent · console.clarity(money)
        </span>
        <span className="lp-code-strip lp-code-strip-b">
          while (focused) &#123; breathe &#125; · null → netWorth · export default Calm
        </span>
        <span className="lp-code-strip lp-code-strip-c">
          false · promise · inflow &#8729; outflow · sort(transactions).by(calm)
        </span>
      </motion.div>

      <motion.div className="lp-note lp-note-1" style={{ y: note1y, rotate: note1r }}>
        <Banknote currency="₹" />
      </motion.div>
      <motion.div className="lp-note lp-note-2" style={{ y: note2y, rotate: note2r }}>
        <Banknote currency="$" />
      </motion.div>
      <motion.div className="lp-note lp-note-3" style={{ y: note3y, rotate: note3r }}>
        <Banknote currency="€" />
      </motion.div>
      <motion.div className="lp-note lp-note-4" style={{ y: note4y, rotate: note4r }}>
        <Banknote currency="£" />
      </motion.div>
      <motion.div className="lp-note lp-note-5" style={{ y: note5y, rotate: note5r }}>
        <Banknote currency="₹" />
      </motion.div>
      <div className="lp-art-copy">
        <Reveal>
          <p className="lp-eyebrow">The art of money</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="lp-h2 lp-art-h2">
            Where code <span className="lp-gold">meets capital.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="lp-lede">
            Nivora turns raw numbers into something you can feel — order,
            momentum, and a strange new calm about money.
          </p>
        </Reveal>
      </div>

      <div className="lp-torn lp-torn-bottom" aria-hidden="true" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7. Numbers — scroll-triggered count-ups
// ---------------------------------------------------------------------------

function Stat({
  value,
  suffix,
  label,
  sub,
}: {
  value: number;
  suffix?: string;
  label: string;
  sub: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <Reveal className="lp-stat">
      <div ref={ref} className="lp-stat-box">
        <div className="lp-stat-value">
          <span className="lp-stat-number">{Math.round(display)}</span>
          {suffix && <span className="lp-stat-suffix">{suffix}</span>}
        </div>
        <div className="lp-stat-rule" aria-hidden="true" />
        <p className="lp-stat-label">{label}</p>
        <p className="lp-stat-sub">{sub}</p>
      </div>
    </Reveal>
  );
}

function Numbers() {
  return (
    <section className="lp-section lp-numbers" id="lp-numbers">
      <div className="lp-section-head">
        <Reveal>
          <p className="lp-eyebrow">By the numbers</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="lp-h2">
            Small product. <span className="lp-gold">Serious calm.</span>
          </h2>
        </Reveal>
      </div>
      <div className="lp-stat-grid">
        <Stat value={6} label="focused workspaces" sub="Transactions to recurring — one home" />
        <Stat value={0} label="ads, trackers, data sales" sub="Nothing about you leaves the vault" />
        <Stat value={100} suffix="%" label="yours, private by design" sub="Your account, your eyes only" />
        <Stat value={24} suffix="/7" label="in focus" sub="The full picture, whenever you look" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. CTA + footer
// ---------------------------------------------------------------------------

function CtaSection({ mode }: { mode: AuthMode }) {
  return (
    <section className="lp-section lp-cta">
      <div className="lp-cta-glow" aria-hidden="true" />
      <div className="lp-cta-ring" aria-hidden="true" />
      <Reveal>
        <p className="lp-eyebrow">Begin</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="lp-cta-title">
          Begin with <span className="lp-gold-italic">clarity.</span>
        </h2>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="lp-lede lp-cta-lede">
          Your financial life deserves a quieter, sharper home.
          Step in — the light is already on.
        </p>
      </Reveal>
      <Reveal delay={0.24} className="lp-cta-actions-reveal">
        <div className="lp-cta-actions">
          <Magnetic strength={0.3}>
            <Link
              href="/sign-up"
              className={cn("lp-cta-button", mode === "register" && "lp-cta-button-active")}
            >
              Create your account
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </Magnetic>
          <Link href="/sign-in" className="lp-cta-ghost">
            Sign in instead
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <BrandWordmark label="Nivora" className="lp-footer-brand" />
      <p className="lp-footer-tag">A clear, private home for your financial decisions.</p>
      <nav className="lp-footer-links" aria-label="Footer">
        <a href="#lp-workspaces">Workspaces</a>
        <span aria-hidden="true">·</span>
        <a href="#lp-art">The art</a>
        <span aria-hidden="true">·</span>
        <a href="#lp-numbers">Numbers</a>
      </nav>
      <p className="lp-footer-legal">
        © {new Date().getFullYear()} Nivora · Private by design · Made with calm
      </p>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Root — the full experience
// ---------------------------------------------------------------------------

export function LandingAuth({
  mode,
  initialError = null,
  returnTo = "/",
}: {
  mode: AuthMode;
  initialError?: string | null;
  returnTo?: string;
}) {
  const register = mode === "register";
  const reduced = useReducedMotion();
  // `play` flips when the preloader curtains part; visitors who have
  // already seen the intro (or prefer reduced motion) reveal instantly.
  const [play, setPlay] = useState(false);
  const revealed = play || !!reduced;
  const onReveal = useCallback(() => setPlay(true), []);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.1 },
    },
  };
  const item = {
    hidden: { y: 26, opacity: 0, filter: "blur(10px)" },
    show: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 90, damping: 17 },
    },
  };

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <main className="lp">
        <Preloader onReveal={onReveal} />

        <a className="lp-skip" href="#lp-form">
          Skip to {register ? "sign-up" : "sign-in"} form
        </a>

        {/* Scroll progress ribbon */}
        <motion.div
          className="lp-progress"
          style={reduced ? undefined : { scaleX: progress }}
          aria-hidden="true"
        />

        {/* Living background */}
        <AuroraField className="lp-canvas" />
        <div className="lp-halo" aria-hidden="true" />
        <div className="lp-grain" aria-hidden="true" />
        <div className="lp-vignette" aria-hidden="true" />

        <Nav mode={mode} play={revealed} />

        {/* ------------------------------------------------------- hero */}
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <motion.div
                initial="hidden"
                animate={revealed ? "show" : "hidden"}
                variants={container}
              >
                <motion.p className="lp-hero-eyebrow" variants={item}>
                  <span className="lp-hero-diamond" aria-hidden="true" />
                  A clearer view of your money
                </motion.p>
                <motion.h1 className="lp-hero-title" variants={item}>
                  {register ? (
                    <>
                      Your finances,
                      <br />
                      <span className="lp-gold lp-hero-title-accent">coming into focus.</span>
                    </>
                  ) : (
                    <>
                      Your finances,
                      <br />
                      <span className="lp-gold lp-hero-title-accent">in focus.</span>
                    </>
                  )}
                </motion.h1>
                <motion.p className="lp-hero-sub" variants={item}>
                  {register
                    ? "Create your private space and watch your money finally make sense — every rupee tracked, every plan in motion."
                    : "Sign in to see your private overview, track spending, and keep your financial plans together."}
                </motion.p>
              </motion.div>

              <AuthCard
                mode={mode}
                initialError={initialError}
                returnTo={returnTo}
                play={revealed}
              />
            </div>

            <HeroArt play={revealed} />
          </div>

          <motion.div
            className="lp-scroll-cue"
            initial={{ opacity: 0 }}
            animate={revealed ? { opacity: 1 } : undefined}
            transition={{ delay: 1.6, duration: 0.8 }}
            aria-hidden="true"
          >
            <span className="lp-scroll-cue-line">
              <span className="lp-scroll-cue-dot" />
            </span>
            <span className="lp-scroll-cue-text">Scroll — the story unfolds</span>
          </motion.div>
        </section>

        <Ticker />
        <Workspaces />
        <MoneyArt />
        <Numbers />
        <CtaSection mode={mode} />
        <Footer />
      </main>
    </MotionConfig>
  );
}
