"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Lock,
  Receipt,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  CountUpFormatted,
  Reveal,
  SectionHead,
} from "@/components/landing/landing-bits";
import {
  StoryAnalytics,
  StoryBudgets,
  StoryGoal,
  StoryTransactions,
} from "@/components/landing/landing-mockup";

/**
 * LandingSections — the middle of the landing page.
 *
 *   FeatureBento   — asymmetric bento grid, cursor spotlight, ghost numerals
 *   ProductStory   — sticky, scroll-driven four-move product narrative
 *   AnalyticsBand  — count-up stats + stacked category flow bar
 *   PrivacySection — trust split with parallax visual
 *   FaqSection     — accessible accordion
 */

/* --------------------------------------------------------------------------
 * Feature bento
 * ------------------------------------------------------------------------ */

type Feature = {
  n: string;
  icon: typeof Receipt;
  title: string;
  copy: ReactNode;
  visual: ReactNode;
  className: string;
};

const FEATURES: Feature[] = [
  {
    n: "01",
    icon: Receipt,
    title: "Every rupee, exactly where it belongs",
    copy: "Log income and expenses with merchants, notes, dates, and categories you define. One line at a time, the month assembles itself.",
    visual: (
      <div className="nl-feat-txns" aria-hidden="true">
        <div>
          <span className="nl-feat-dot is-mint" />
          <span>
            Salary — Northwind
            <em>Income · Nov 1</em>
          </span>
          <b className="is-mint">+₹52,300</b>
        </div>
        <div>
          <span className="nl-feat-dot is-rose" />
          <span>
            BigBasket
            <em>Groceries · Nov 3</em>
          </span>
          <b>−₹2,840</b>
        </div>
        <div>
          <span className="nl-feat-dot is-rose" />
          <span>
            Uber
            <em>Transport · Nov 4</em>
          </span>
          <b>−₹212</b>
        </div>
      </div>
    ),
    className: "nl-feat nl-feat-txns-card",
  },
  {
    n: "02",
    icon: Wallet,
    title: "Budgets that hold their shape",
    copy: "Set envelopes for the categories that matter. Burn rate fills quietly as you spend — so November never surprises you.",
    visual: (
      <div className="nl-feat-budgets" aria-hidden="true">
        <div>
          <span>Groceries</span>
          <i style={{ width: "76%" }} />
        </div>
        <div>
          <span>Dining</span>
          <i style={{ width: "85%" }} />
        </div>
        <div>
          <span>Transport</span>
          <i style={{ width: "84%" }} />
        </div>
      </div>
    ),
    className: "nl-feat",
  },
  {
    n: "03",
    icon: Activity,
    title: "Patterns you can see",
    copy: "Cash-flow curves, category mixes, and month-over-month comparisons — rendered quietly, in one palette.",
    visual: (
      <svg
        className="nl-feat-spark"
        viewBox="0 0 120 36"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path d="M0 30 C 12 28, 20 20, 32 21 C 44 22, 52 12, 64 10 C 76 8, 86 14, 98 9 C 108 5, 114 4, 120 2" />
      </svg>
    ),
    className: "nl-feat",
  },
  {
    n: "04",
    icon: Target,
    title: "Milestones that pull you forward",
    copy: "Name the trip, the gadget, the emergency cushion. Watch the ring close as contributions land.",
    visual: (
      <div className="nl-feat-ring" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="rgba(244,241,236,0.09)"
            strokeWidth="4.5"
          />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="#d6b779"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="81 120"
            transform="rotate(-90 24 24)"
          />
        </svg>
        <b>68%</b>
      </div>
    ),
    className: "nl-feat",
  },
  {
    n: "05",
    icon: CalendarDays,
    title: "The due date, before it's due",
    copy: "Salary credits, subscriptions, rent — scheduled once, surfaced before they land.",
    visual: (
      <div className="nl-feat-recurring" aria-hidden="true">
        <div>
          <em>01</em>
          <span>Salary credit</span>
          <b className="is-mint">Monthly</b>
        </div>
        <div>
          <em>05</em>
          <span>Netflix</span>
          <b>Monthly</b>
        </div>
        <div>
          <em>08</em>
          <span>Rent — Indiranagar</span>
          <b>Monthly</b>
        </div>
      </div>
    ),
    className: "nl-feat",
  },
];

function FeatureCard({ f, index }: { f: Feature; index: number }) {
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const Icon = f.icon;
  return (
    <Reveal delay={index * 0.07} className={f.className}>
      <article className="nl-feat-card" onPointerMove={onMove}>
        <span className="nl-feat-num" aria-hidden="true">
          {f.n}
        </span>
        <span className="nl-feat-icon">
          <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <h3>{f.title}</h3>
        <p>{f.copy}</p>
        {f.visual}
      </article>
    </Reveal>
  );
}

export function FeatureBento() {
  return (
    <section className="nl-section" id="features">
      <div className="nl-container">
        <SectionHead
          kicker="THE WORKSPACE"
          title={
            <>
              Six surfaces. <span className="nl-accent">One calm system.</span>
            </>
          }
          lede="Transactions, budgets, trends, goals, and recurring activity come together in one focused workspace — without the spreadsheet sprawl."
        />
        <div className="nl-bento">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.n} f={f} index={i} />
          ))}
          <Reveal delay={0.12} className="nl-feat nl-feat-wide">
            <article
              className="nl-feat-card is-wide"
              onPointerMove={(e) => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                el.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
            >
              <span className="nl-feat-num" aria-hidden="true">
                06
              </span>
              <div className="nl-feat-wide-copy">
                <span className="nl-feat-icon">
                  <FileText size={19} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <h3>Your data, your files</h3>
                <p>
                  Monthly reviews and CSV export help keep the records you enter
                  portable and easy to revisit.
                </p>
                <div className="nl-feat-files" aria-hidden="true">
                  <span>october-2026.csv</span>
                  <span>november-2026.csv</span>
                  <span>monthly-review</span>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * Product story — sticky, scroll-driven
 * ------------------------------------------------------------------------ */

const STORY_STEPS: Array<{
  kicker: string;
  title: string;
  copy: string;
  panel: (active: boolean) => ReactNode;
}> = [
  {
    kicker: "01 — Capture",
    title: "Log it in seconds.",
    copy: "A coffee, a salary credit, the electricity bill — add it from any device and keep moving. Recurring schedules help keep predictable activity visible without re-entering the same details.",
    panel: (active) => <StoryTransactions active={active} />,
  },
  {
    kicker: "02 — Understand",
    title: "Watch the month take shape.",
    copy: "The dashboard turns entries into a living picture: net cash flow, category mixes, and weeks compared side by side — no spreadsheets, no squinting.",
    panel: (active) => <StoryAnalytics active={active} />,
  },
  {
    kicker: "03 — Plan",
    title: "Budgets that bend, not break.",
    copy: "Envelopes for groceries, dining, transport. Progress fills quietly as you spend, and the one line that's about to cross glows before it does.",
    panel: (active) => <StoryBudgets active={active} />,
  },
  {
    kicker: "04 — Grow",
    title: "Goals, within reach.",
    copy: "A ring for the Japan fund, a cushion for the unexpected. Every contribution nudges the number — and Nivora remembers the pace you're keeping.",
    panel: (active) => <StoryGoal active={active} />,
  },
];

export function ProductStory() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const railFill = useTransform(
    scrollYProgress,
    (v) => `${Math.min(100, Math.max(0, v * 100))}%`,
  );

  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(
      STORY_STEPS.length - 1,
      Math.max(0, Math.floor(v * STORY_STEPS.length)),
    );
    if (next !== stepRef.current) {
      stepRef.current = next;
      setStep(next);
    }
  });

  return (
    <section className="nl-section nl-story-section" id="story">
      <div className="nl-container">
        <SectionHead
          kicker="THE PRODUCT"
          title={
            <>
              One quiet system, <span className="nl-accent">four moves.</span>
            </>
          }
          lede="Scroll through a month in Nivora — from the first entry to the funded goal."
        />
        <div className="nl-story" ref={ref}>
          {/* Sticky visual column (desktop) */}
          <div className="nl-story-visual" aria-hidden="true">
            <div className="nl-story-stack">
              {STORY_STEPS.map((s, i) => (
                <div
                  key={s.kicker}
                  className={`nl-story-slot${step === i ? " is-active" : ""}`}
                >
                  {s.panel(step === i)}
                </div>
              ))}
            </div>
            <div className="nl-story-rail">
              <motion.span style={{ height: railFill }} />
              <div className="nl-story-dots">
                {STORY_STEPS.map((s, i) => (
                  <i key={s.kicker} data-on={step === i || undefined} />
                ))}
              </div>
            </div>
          </div>

          {/* Scrolling steps */}
          <div className="nl-story-steps">
            {STORY_STEPS.map((s, i) => (
              <article
                key={s.kicker}
                className={`nl-story-step${step === i ? " is-active" : ""}`}
              >
                <div className="nl-story-panel-slot" aria-hidden="true">
                  {s.panel(step === i)}
                </div>
                <p className="nl-story-kicker">{s.kicker}</p>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * Analytics band
 * ------------------------------------------------------------------------ */

const FLOW = [
  { label: "Groceries", amount: "₹11,420", color: "#7ed7b2", share: 33.7 },
  { label: "Dining", amount: "₹7,380", color: "#d6b779", share: 21.8 },
  { label: "Transport", amount: "₹5,370", color: "#88b9ec", share: 15.9 },
  { label: "Subscriptions", amount: "₹5,030", color: "#f18782", share: 14.8 },
  { label: "Everything else", amount: "₹4,680", color: "#7fc8c8", share: 13.8 },
];

export function AnalyticsBand() {
  return (
    <section className="nl-section" id="analytics">
      <div className="nl-container">
        <SectionHead
          align="center"
          kicker="A MONTH, TOLD IN NUMBERS"
          title={
            <>
              Numbers that{" "}
              <span className="nl-accent">explain themselves.</span>
            </>
          }
          lede="A sample month, made legible. The figures below are illustrative; your workspace is built from the entries you record."
        />
        <div className="nl-stats">
          <Reveal>
            <div className="nl-stat">
              <CountUpFormatted
                to={18420}
                prefix="+₹"
                className="nl-stat-value"
              />
              <span className="nl-stat-label">Net cash flow, November</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="nl-stat">
              <CountUpFormatted to={35} suffix="%" className="nl-stat-value" />
              <span className="nl-stat-label">Of income kept</span>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="nl-stat">
              <CountUpFormatted to={12} className="nl-stat-value" />
              <span className="nl-stat-label">Categories tracked</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <FlowBar />
        </Reveal>
        <p className="nl-sample-note">
          Illustrative sample data — your dashboard shows only your real
          entries.
        </p>
      </div>
    </section>
  );
}

/** Stacked category-share bar; segments grow once scrolled into view. */
function FlowBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <div className="nl-flow" ref={ref} data-active={inView || undefined}>
      <div
        className="nl-flow-bar"
        role="img"
        aria-label={`Category spending share for the illustrative month: ${FLOW.map((item) => `${item.label} ${item.share.toFixed(1)} percent`).join(", ")}.`}
      >
        {FLOW.map((f, i) => (
          <span
            key={f.label}
            style={
              {
                width: `${f.share}%`,
                background: f.color,
                transitionDelay: `${i * 90}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="nl-flow-legend">
        {FLOW.map((f) => (
          <span key={f.label}>
            <i style={{ background: f.color }} />
            {f.label} · {f.amount}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Privacy
 * ------------------------------------------------------------------------ */

const TRUST = [
  "Private routes verify your session server-side",
  "Financial records are scoped to your profile",
  "No bank connection or credentials required",
  "CSV export keeps your transaction history portable",
];

export function PrivacySection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yA = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const yB = useTransform(scrollYProgress, [0, 1], [90, -70]);

  return (
    <section className="nl-section" id="privacy" ref={ref}>
      <div className="nl-container nl-privacy">
        <div className="nl-privacy-copy">
          <SectionHead
            kicker="PRIVATE BY DESIGN"
            title={
              <>
                Calm starts with <span className="nl-accent">trust.</span>
              </>
            }
            lede="A finance app sees the shape of your life. Nivora treats that as a responsibility, not a resource."
          />
          <ul className="nl-trust-list">
            {TRUST.map((t, i) => (
              <Reveal key={t} delay={0.1 + i * 0.08}>
                <li>
                  <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                  {t}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="nl-privacy-visual" aria-hidden="true">
          <div className="nl-privacy-glow" />
          <motion.div
            style={reduced ? undefined : { y: yA }}
            className="nl-privacy-card"
          >
            <span className="nl-privacy-lock">
              <Lock size={22} strokeWidth={1.7} />
            </span>
            <div className="nl-privacy-rings">
              <i /> <i /> <i />
            </div>
            <motion.div
              style={reduced ? undefined : { y: yB }}
              className="nl-privacy-chip is-a"
            >
              <ShieldCheck size={13} strokeWidth={2} /> Profile-scoped
            </motion.div>
            <motion.div
              style={reduced ? undefined : { y: yA }}
              className="nl-privacy-chip is-b"
            >
              <Check size={13} strokeWidth={2} /> Server-verified
            </motion.div>
            <motion.div
              style={reduced ? undefined : { y: yB }}
              className="nl-privacy-chip is-c"
            >
              <FileText size={13} strokeWidth={2} /> CSV export
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
 * FAQ
 * ------------------------------------------------------------------------ */

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Is my financial data private?",
    a: "Nivora is designed around server-side session verification and profile-scoped financial records. The project is still in active development, so hosted authentication and finance flows should be fully validated before you rely on it for sensitive recordkeeping.",
  },
  {
    q: "Does Nivora connect to my bank account?",
    a: "No. Nivora is manual-first: you enter income and expenses yourself and can organise predictable activity with recurring schedules. It does not ask for or store bank-login credentials.",
  },
  {
    q: "Can I get my data out?",
    a: "Nivora includes CSV transaction export and monthly report views. Export availability and the contents of your archive depend on the records currently saved in your account.",
  },
  {
    q: "What about currencies and date formats?",
    a: "Currency, timezone, and date format are available as profile preferences. Amounts are formatted for the selected currency and locale.",
  },
  {
    q: "How do I start?",
    a: "Create an account, add a few categories that match your life, and log your first transaction. The dashboard, analytics, and budgets fill in from there — your data, your pace.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="nl-section" id="faq">
      <div className="nl-container nl-faq-grid">
        <div>
          <SectionHead
            kicker="QUESTIONS"
            title={
              <>
                Fair questions,{" "}
                <span className="nl-accent">straight answers.</span>
              </>
            }
          />
          <Reveal delay={0.15}>
            <div className="nl-faq-side">
              <p>Still curious?</p>
              <p>
                The help workspace walks through every surface of the app in
                plain language.
              </p>
              <Link href="/help" className="nl-link">
                Open the help centre{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="nl-faq-list">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className={`nl-faq-item${isOpen ? " is-open" : ""}`}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`nl-faq-panel-${i}`}
                      id={`nl-faq-button-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      {f.q}
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        id={`nl-faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`nl-faq-button-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.34,
                          ease: [0.16, 1, 0.3, 1] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        }}
                      >
                        <p>{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
