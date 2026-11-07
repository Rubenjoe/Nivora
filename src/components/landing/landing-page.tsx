"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { LandingCanvas } from "@/components/landing/landing-canvas";
import { DashboardMockup } from "@/components/landing/landing-mockup";
import {
  AnalyticsBand,
  FaqSection,
  FeatureBento,
  PrivacySection,
  ProductStory,
} from "@/components/landing/landing-sections";
import { Magnetic, Reveal } from "@/components/landing/landing-bits";
import "./landing-page.css";

/**
 * LandingPage — the public front door of Nivora.
 *
 * Composition:
 *   Nav        — transparent → glass on scroll, scroll-spy anchors, mobile sheet
 *   Hero       — diagonal light canvas, word-mask headline, tilted dashboard
 *   Ticker     — velocity-reactive marquee of the workspace surfaces
 *   Bento      — six surfaces (landing-sections)
 *   Story      — sticky scroll narrative (landing-sections)
 *   Analytics  — count-ups + category flow (landing-sections)
 *   Editorial  — parallax manifesto
 *   Privacy    — trust split (landing-sections)
 *   FAQ        — accordion (landing-sections)
 *   CTA+Footer — magnetic close, quiet sign-off
 *
 * Everything is transform/opacity only, every reveal fires once, the canvas
 * sleeps off-screen, and prefers-reduced-motion degrades to still pages.
 */

const NAV_LINKS: Array<{ href: string; label: string; id: string }> = [
  { href: "#features", label: "Features", id: "features" },
  { href: "#story", label: "Product", id: "story" },
  { href: "#analytics", label: "Analytics", id: "analytics" },
  { href: "#privacy", label: "Privacy", id: "privacy" },
  { href: "#faq", label: "FAQ", id: "faq" },
];

const TICKER_ITEMS = [
  "Transactions",
  "Budgets",
  "Analytics",
  "Savings goals",
  "Recurring schedules",
  "Monthly reports",
  "CSV export",
  "Profile currency settings",
];

/* --------------------------------------------------------------------------
 * Brand mark — the gold bar glyph, drawn in CSS
 * ------------------------------------------------------------------------ */

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="#nl-top" className="nl-brand" aria-label="Nivora — back to top">
      <span className="nl-brand-glyph" aria-hidden="true">
        <i /> <i /> <i /> <i />
      </span>
      {!compact && <span className="nl-brand-word">nivora</span>}
    </Link>
  );
}

/* --------------------------------------------------------------------------
 * Nav
 * ------------------------------------------------------------------------ */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: light the link whose section owns the middle of the viewport.
  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // Mobile sheet: lock page scroll and keep keyboard focus inside the dialog.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const getFocusable = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const activeElement = document.activeElement;
      const focusIsOutside = !menuRef.current?.contains(activeElement);

      if (
        (event.shiftKey && activeElement === first) ||
        (event.shiftKey && focusIsOutside)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        (!event.shiftKey && activeElement === last) ||
        (!event.shiftKey && focusIsOutside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Avoid leaving a full-screen sheet open when a phone rotates into desktop.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className={`nl-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="nl-nav-inner">
        <BrandMark />
        <nav className="nl-nav-links" aria-label="Landing sections">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={l.href}
              className={active === l.id ? "is-active" : undefined}
              aria-current={active === l.id ? "location" : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nl-nav-actions">
          <Link href="/sign-in" className="nl-btn-ghost">
            Sign in
          </Link>
          <Link href="/sign-up" className="nl-btn-primary">
            Get started
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="nl-nav-burger"
            aria-expanded={open}
            aria-controls="nl-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X size={19} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Menu size={19} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="nl-menu"
            key="menu"
            ref={menuRef}
            className="nl-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
                menuButtonRef.current?.focus();
              }
            }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="nl-menu-top">
              <span>Explore Nivora</span>
              <button
                ref={closeRef}
                type="button"
                className="nl-menu-close"
                aria-label="Close navigation menu"
                onClick={() => {
                  setOpen(false);
                  menuButtonRef.current?.focus();
                }}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <nav className="nl-menu-links" aria-label="Landing sections">
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.id}
                  href={l.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.3 }}
                  aria-current={active === l.id ? "location" : undefined}
                  onClick={() => {
                    setOpen(false);
                    menuButtonRef.current?.focus();
                  }}
                >
                  {l.label}
                </motion.a>
              ))}
            </nav>
            <div className="nl-menu-ctas">
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="nl-btn-primary"
                onClick={() => setOpen(false)}
              >
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* --------------------------------------------------------------------------
 * Hero
 * ------------------------------------------------------------------------ */

const HERO_WORDS_L1 = ["Your", "money,"];
const HERO_WORDS_L2 = ["finally", "in", "focus."];

function HeroWord({
  children,
  gradient = false,
}: {
  children: string;
  gradient?: boolean;
}) {
  return (
    <span className="nl-word">
      <motion.span
        className={gradient ? "nl-word-inner is-gradient" : "nl-word-inner"}
        variants={{
          hidden: { y: "115%", rotate: 4 },
          show: {
            y: "0%",
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 76,
              damping: 17,
            },
          },
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function LandingHero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Scroll-driven mockup choreography — Stripe-style settle as you scroll.
  const mockRotateX = useTransform(scrollYProgress, [0, 1], [12, 3]);
  const mockY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const mockScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const mockOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.15]);

  // Pointer parallax for the mockup (springs back on leave).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotY = useSpring(px, { stiffness: 90, damping: 18 });
  const rotX = useSpring(py, { stiffness: 90, damping: 18 });

  const onMockPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      px.set(((e.clientX - r.left) / r.width - 0.5) * 5);
      py.set(((e.clientY - r.top) / r.height - 0.5) * -3);
    },
    [px, py],
  );
  const onMockPointerLeave = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  return (
    <section className="nl-hero" ref={heroRef}>
      <div className="nl-hero-bg" aria-hidden="true">
        <LandingCanvas className="nl-hero-canvas" />
        <div className="nl-hero-beam" />
        <div className="nl-hero-dots" />
        <div className="nl-hero-vignette" />
      </div>

      <div className="nl-container nl-hero-inner">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.09, delayChildren: 0.12 },
            },
          }}
          className="nl-hero-copy"
        >
          <motion.p
            className="nl-hero-pill"
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <i aria-hidden="true" />
            Manual-first finance, made clear
          </motion.p>

          <h1 className="nl-hero-title">
            <span className="nl-hero-line">
              {HERO_WORDS_L1.map((w) => (
                <HeroWord key={w}>{w}</HeroWord>
              ))}
            </span>
            <span className="nl-hero-line">
              {HERO_WORDS_L2.map((w) => (
                <HeroWord key={w} gradient>
                  {w}
                </HeroWord>
              ))}
            </span>
          </h1>

          <motion.p
            className="nl-hero-sub"
            variants={{
              hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
              show: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.7 },
              },
            }}
          >
            Track income and expenses, shape budgets, follow savings goals, and
            understand your month in one thoughtful financial workspace.
          </motion.p>

          <motion.div
            className="nl-hero-ctas"
            variants={{
              hidden: { opacity: 0, y: 18 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6 },
              },
            }}
          >
            <Magnetic>
              <Link href="/sign-up" className="nl-btn-primary is-lg">
                Create your account
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.18}>
              <a href="#story" className="nl-btn-ghost is-lg">
                See how it works
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
            </Magnetic>
          </motion.div>

          <motion.p
            className="nl-hero-proof"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.8 } },
            }}
          >
            No bank connection required <i aria-hidden="true" /> CSV export
            <i aria-hidden="true" /> Built for every screen
          </motion.p>
        </motion.div>

        <motion.div
          className="nl-hero-mock"
          initial={{ opacity: 0, y: 90 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.05,
            delay: 0.55,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
        >
          <div className="nl-hero-mock-glow" aria-hidden="true" />
          <motion.div
            className="nl-hero-mock-tilt"
            style={
              reduced
                ? undefined
                : {
                    rotateX: mockRotateX,
                    y: mockY,
                    scale: mockScale,
                    opacity: mockOpacity,
                  }
            }
          >
            <motion.div
              className="nl-hero-mock-pointer"
              style={reduced ? undefined : { rotateY: rotY, rotateX: rotX }}
              onPointerMove={reduced ? undefined : onMockPointerMove}
              onPointerLeave={reduced ? undefined : onMockPointerLeave}
            >
              <DashboardMockup />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * Ticker — velocity-reactive marquee
 * ------------------------------------------------------------------------ */

function LandingTicker() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 140, damping: 42 });
  const skew = useTransform(smooth, [-2600, 0, 2600], [-3, 0, 3], {
    clamp: true,
  });

  // Faster scrolling speeds the marquee up (playbackRate), then it relaxes.
  useMotionValueEvent(smooth, "change", (v) => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track || typeof track.getAnimations !== "function") return;
    const boost = Math.min(3.4, Math.max(1, 1 + Math.abs(v) / 850));
    for (const anim of track.getAnimations()) {
      anim.playbackRate = boost;
    }
  });

  const half = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="nl-ticker" aria-hidden="true">
      <div className="nl-ticker-fade" />
      <motion.div
        className="nl-ticker-skew"
        style={reduced ? undefined : { skewX: skew }}
      >
        <div className="nl-ticker-track" ref={trackRef}>
          {[0, 1].map((copy) => (
            <div className="nl-ticker-half" key={copy}>
              {half.map((item, i) => (
                <span className="nl-ticker-item" key={`${copy}-${i}`}>
                  {item}
                  <i />
                </span>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Editorial interlude
 * ------------------------------------------------------------------------ */

function EditorialInterlude() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yA = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const yB = useTransform(scrollYProgress, [0, 1], [-46, 46]);

  return (
    <section className="nl-editorial" ref={ref} aria-label="Design philosophy">
      <div className="nl-container">
        <div className="nl-editorial-words" aria-hidden="true">
          <motion.span style={reduced ? undefined : { y: yA }}>
            Calm is
          </motion.span>
          <motion.span
            className="is-outline"
            style={reduced ? undefined : { y: yB }}
          >
            a feature.
          </motion.span>
        </div>
        <div className="nl-editorial-copy">
          <Reveal>
            <p className="nl-kicker">
              <i aria-hidden="true" />
              THE PHILOSOPHY
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="nl-editorial-text">
              No confetti. No streak-shaming. No neon dashboards shouting for
              attention. Nivora draws the numbers you need —{" "}
              <em>quietly enough to live with</em> — and gets out of the way.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * Closing CTA + footer
 * ------------------------------------------------------------------------ */

function LandingCta() {
  return (
    <section className="nl-cta">
      <div className="nl-cta-glow" aria-hidden="true" />
      <div className="nl-container">
        <Reveal>
          <p className="nl-kicker is-center">
            <i aria-hidden="true" />
            READY WHEN YOU ARE
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="nl-cta-title">
            Start focusing <span className="nl-accent">today.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="nl-cta-sub">
            Start with a few transactions, set the budgets that matter, and let
            a clearer monthly picture take shape over time.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="nl-cta-actions">
            <Magnetic>
              <Link href="/sign-up" className="nl-btn-primary is-lg">
                Create your account
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Link href="/sign-in" className="nl-btn-ghost is-lg">
                Sign in
              </Link>
            </Magnetic>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="nl-cta-note">
            Your financial information stays private to your account.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="nl-footer">
      <div className="nl-container">
        <div className="nl-footer-top">
          <div className="nl-footer-brand">
            <BrandMark />
            <p>Clarity for every financial decision.</p>
          </div>
          <nav className="nl-footer-cols" aria-label="Footer">
            <div>
              <p className="nl-footer-head">Workspace</p>
              <Link href="/transactions">Transactions</Link>
              <Link href="/budgets">Budgets</Link>
              <Link href="/analytics">Analytics</Link>
              <Link href="/reports">Monthly reports</Link>
              <Link href="/goals">Goals</Link>
              <Link href="/recurring">Recurring</Link>
            </div>
            <div>
              <p className="nl-footer-head">Resources</p>
              <a href="#faq">FAQ</a>
              <a href="#analytics">Analytics</a>
              <a href="#privacy">Privacy</a>
              <Link href="/help">Help centre</Link>
            </div>
            <div>
              <p className="nl-footer-head">Account</p>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Create account</Link>
            </div>
          </nav>
        </div>
        <div className="nl-footer-base">
          <p>
            © {new Date().getFullYear()} Nivora — Clarity for every financial
            decision.
          </p>
          <p className="nl-footer-meta">
            Personal finance tracking, not financial advice
            <i aria-hidden="true" />
            <a href="#nl-top" className="nl-footer-top-link">
              Back to top <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="nl" id="nl-top">
        <a className="nl-skip" href="#nl-main">
          Skip to content
        </a>
        <LandingNav />
        <main id="nl-main">
          <LandingHero />
          <LandingTicker />
          <FeatureBento />
          <ProductStory />
          <AnalyticsBand />
          <EditorialInterlude />
          <PrivacySection />
          <FaqSection />
          <LandingCta />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
