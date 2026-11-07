"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  animate,
} from "motion/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * LandingBits — small shared motion primitives for the landing page.
 * Every helper degrades to a plain render under prefers-reduced-motion.
 */

/** Scroll-into-view reveal: rise + de-blur, once. */
export function Reveal({
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
      whileInView={
        reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ type: "spring", stiffness: 80, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Magnetic wrapper — the element gravitates toward the cursor, springs back. */
export function Magnetic({
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
      // A magnetic affordance is useful for mouse/pen pointers, but can make
      // touch targets feel as though they move away from the user's finger.
      if (reduced || e.pointerType === "touch" || !ref.current) return;
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
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={reduced ? undefined : { x: sx, y: sy }}
    >
      {children}
    </motion.div>
  );
}

/** Section heading: gold kicker, display title, quiet lede. */
export function SectionHead({
  kicker,
  title,
  lede,
  align = "left",
  id,
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <div className={`nl-section-head${align === "center" ? " is-center" : ""}`}>
      <Reveal>
        <p className="nl-kicker">
          <i aria-hidden="true" />
          {kicker}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="nl-title" id={id}>
          {title}
        </h2>
      </Reveal>
      {lede ? (
        <Reveal delay={0.16}>
          <p className="nl-lede">{lede}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Format an integer with en-IN grouping while it counts up. */
function formatInr(v: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(v));
}

/**
 * Count-up number that starts when scrolled into view. Renders through a
 * formatter so the value keeps en-IN grouping while animating
 * (₹52,300 … not 52300).
 */
export function CountUpFormatted({
  to,
  duration = 1.7,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(reduced ? to : 0);
  const text = useMotionValue(reduced ? formatInr(to) : formatInr(0));

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      mv.set(to);
      text.set(formatInr(to));
      return;
    }
    const controls = animate(mv, to, {
      duration,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      onUpdate: (v) => text.set(formatInr(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, mv, text, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  );
}
