"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * LandingCanvas — the living backdrop of the Nivora landing hero.
 *
 * A Stripe-inspired diagonal light field painted on one Canvas 2D:
 *   1. Tilted light ribbons (violet / gold / blue) that stream slowly
 *      across a ~13° diagonal and accelerate with scroll velocity.
 *   2. A parallax field of gold dust drifting upward, twinkling.
 *   3. A soft cursor nebula (additive violet glow chasing the pointer).
 *
 * Performance contract:
 *   - Single canvas, DPR capped at 1.5, additive blending in one pass.
 *   - requestAnimationFrame pauses when the tab is hidden AND when the
 *     canvas leaves the viewport (IntersectionObserver).
 *   - prefers-reduced-motion paints exactly one static frame.
 *   - No WebGL or dependencies. Ribbon gradients are cached on resize and
 *     ribbon geometry is streamed directly into paths without frame arrays.
 *     Cursor glow gradients follow the smoothed pointer position.
 */

type Band = {
  baseY: number; // resting height, 0..1 of the extended canvas
  amp: number; // primary sine amplitude in px
  amp2: number; // secondary sine amplitude in px
  freq: number; // primary frequency (rad per px)
  freq2: number; // secondary frequency
  speed: number; // phase drift per second
  phase: number;
  width: number; // core stroke width
  color: string; // "r,g,b" triplet
  alpha: number;
  gradient: CanvasGradient | null;
};

type Mote = {
  x: number;
  y: number;
  z: number; // depth 0.25..1
  r: number;
  drift: number; // upward speed px/s
  twinkle: number;
  twinkleSpeed: number;
  gold: boolean;
};

const PALETTE = {
  purple: "169,149,255",
  violet: "93,74,196",
  gold: "214,183,121",
  champagne: "244,231,197",
  blue: "136,185,236",
} as const;

/** Ribbon tilt — the Stripe-style ascending diagonal, ~13 degrees. */
const TILT = -0.23;

function buildBands(width: number): Band[] {
  const thin = width < 768;
  const groups: Array<{
    baseY: number;
    count: number;
    colors: string[];
    amp: number;
    width: number;
    alpha: number;
  }> = [
    // Upper braid — violet into purple, the brand light.
    {
      baseY: 0.3,
      count: thin ? 2 : 3,
      colors: [PALETTE.violet, PALETTE.purple, PALETTE.violet],
      amp: 58,
      width: 1.7,
      alpha: 0.42,
    },
    // Middle river — gold and champagne, the money light.
    {
      baseY: 0.52,
      count: thin ? 3 : 4,
      colors: [PALETTE.gold, PALETTE.champagne, PALETTE.gold, PALETTE.blue],
      amp: 76,
      width: 1.9,
      alpha: 0.34,
    },
    // Lower drift — deep blue breathing underneath.
    {
      baseY: 0.74,
      count: thin ? 2 : 3,
      colors: [PALETTE.blue, PALETTE.violet, PALETTE.purple],
      amp: 52,
      width: 1.4,
      alpha: 0.3,
    },
  ];

  const bands: Band[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      bands.push({
        baseY: g.baseY + (i - (g.count - 1) / 2) * 0.03,
        amp: g.amp * (0.72 + ((i * 37) % 10) / 22),
        amp2: g.amp * 0.33,
        freq: 0.0016 + (((i * 53) % 7) / 10) * 0.0006,
        freq2: 0.0038 + (((i * 29) % 5) / 10) * 0.001,
        speed: 0.14 + (((i * 41) % 9) / 12) * 0.12,
        phase: (i / g.count) * Math.PI * 2 + g.baseY * 5,
        width: g.width * (0.75 + ((i * 17) % 6) / 10),
        color: g.colors[i % g.colors.length],
        alpha: g.alpha,
        gradient: null,
      });
    }
  }
  return bands;
}

function buildMotes(width: number, height: number): Mote[] {
  const count = Math.min(130, Math.floor((width * height) / 12000));
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.25 + Math.random() * 0.75,
      r: 0.5 + Math.random() * 1.6,
      drift: 6 + Math.random() * 15,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.6 + Math.random() * 1.5,
      gold: Math.random() > 0.2, // mostly gold dust, a few violet sparks
    });
  }
  return motes;
}

export function LandingCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let pad = 0; // extended draw area so the tilted ribbons never show edges
    let bands: Band[] = [];
    let motes: Mote[] = [];

    // Cursor nebula target + smoothed position.
    let pointerX = -1;
    let pointerY = -1;
    let nebX = -1;
    let nebY = -1;
    let pointerSeen = false;

    // Scroll velocity → ribbon flow boost.
    let lastScroll = window.scrollY;
    let smoothVel = 0;

    let raf = 0;
    let running = true; // tab visibility
    let inView = true; // hero on screen
    let flowTime = 0;
    let lastNow = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      pad = Math.max(width, height) * 0.34;
      bands = buildBands(width);
      motes = buildMotes(width, height);

      // CanvasGradient captures the current user-space transform. Build each
      // ribbon gradient with the same transform used by drawFrame, then reuse
      // it until the canvas is resized.
      const ew = width + pad * 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(TILT);
      ctx.translate(-ew / 2, -height / 2 - pad);
      for (const band of bands) {
        const gradient = ctx.createLinearGradient(0, 0, ew, 0);
        gradient.addColorStop(0, `rgba(${band.color},0)`);
        gradient.addColorStop(
          0.16,
          `rgba(${band.color},${(band.alpha * 0.5).toFixed(3)})`,
        );
        gradient.addColorStop(0.5, `rgba(${band.color},${band.alpha})`);
        gradient.addColorStop(
          0.84,
          `rgba(${band.color},${(band.alpha * 0.5).toFixed(3)})`,
        );
        gradient.addColorStop(1, `rgba(${band.color},0)`);
        band.gradient = gradient;
      }
      ctx.restore();

      if (reduced) drawFrame(2.5, 0);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      if (!pointerSeen) {
        nebX = pointerX;
        nebY = pointerY;
        pointerSeen = true;
      }
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced && inView) {
        cancelAnimationFrame(raf);
        lastNow = performance.now();
        lastScroll = window.scrollY;
        raf = requestAnimationFrame(tick);
      }
    };

    /** Paint one frame at time `t` (seconds of accumulated flow). */
    const drawFrame = (t: number, dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const scrollY = window.scrollY;
      const cx = width / 2;
      const cy = height / 2;
      const ew = width + pad * 2; // extended width in tilted space

      // ---- Tilted light ribbons ------------------------------------------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(TILT);
      ctx.translate(-ew / 2, -height / 2 - pad);

      for (const b of bands) {
        const basePx = b.baseY * (height + pad * 2) + scrollY * -0.02;
        const gradient = b.gradient;
        if (!gradient) continue;

        // Stream points directly into the canvas path. This avoids allocating
        // a points array and a pass array for every ribbon on every frame.
        const strokeRibbon = (lineWidth: number, alphaScale: number) => {
          ctx.beginPath();
          let first = true;
          for (let x = -40; x <= ew + 40; x += 14) {
            const y =
              basePx +
              Math.sin(x * b.freq + t * b.speed + b.phase) * b.amp +
              Math.sin(x * b.freq2 - t * b.speed * 1.6 + b.phase * 1.7) *
                b.amp2;
            if (first) {
              ctx.moveTo(x, y);
              first = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = alphaScale;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        };

        // Three passes: wide halo → mid glow → bright core.
        strokeRibbon(b.width * 4.2, 0.14);
        strokeRibbon(b.width * 2, 0.3);
        strokeRibbon(b.width, 0.8);
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ---- Gold dust motes ------------------------------------------------
      const span = height + 16;
      for (const m of motes) {
        if (!reduced && dt > 0) {
          m.y -= m.drift * m.z * dt;
          if (m.y < -8) {
            m.y = height + 8;
            m.x = Math.random() * width;
          }
        }
        const parallaxY = m.y + scrollY * m.z * 0.08;
        const wrappedY = (((parallaxY % span) + span) % span) - 8;
        const tw = 0.55 + 0.45 * Math.sin(t * m.twinkleSpeed + m.twinkle);
        const color = m.gold ? PALETTE.gold : PALETTE.purple;
        const alpha = 0.3 * m.z * tw;
        ctx.beginPath();
        ctx.arc(m.x, wrappedY, m.r * m.z + 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // ---- Cursor nebula ---------------------------------------------------
      if (pointerSeen && nebX >= 0) {
        if (!reduced && dt > 0) {
          nebX += (pointerX - nebX) * 0.07;
          nebY += (pointerY - nebY) * 0.07;
        }
        const nebula = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 320);
        nebula.addColorStop(0, `rgba(${PALETTE.purple},0.07)`);
        nebula.addColorStop(0.45, `rgba(${PALETTE.violet},0.032)`);
        nebula.addColorStop(1, "rgba(93,74,196,0)");
        ctx.fillStyle = nebula;
        ctx.fillRect(nebX - 320, nebY - 320, 640, 640);

        const core = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 90);
        core.addColorStop(0, `rgba(${PALETTE.champagne},0.045)`);
        core.addColorStop(1, "rgba(244,231,197,0)");
        ctx.fillStyle = core;
        ctx.fillRect(nebX - 90, nebY - 90, 180, 180);
      }

      ctx.globalCompositeOperation = "source-over";
    };

    /** Main loop — advances time, folds scroll velocity into ribbon flow. */
    const tick = (now: number) => {
      if (!running) return;
      const scrollNow = window.scrollY;
      const rawVel = (scrollNow - lastScroll) / 16.7; // px per frame
      lastScroll = scrollNow;
      smoothVel += (rawVel - smoothVel) * 0.08;

      // Ribbons stream faster while the visitor scrolls — the page reacts.
      const flowBoost = 1 + Math.min(Math.abs(smoothVel) / 26, 3);
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      // Integrate velocity into the animation clock. Multiplying absolute
      // elapsed time by flowBoost would cause abrupt phase jumps on scroll.
      flowTime += dt * flowBoost;
      drawFrame(flowTime, dt);
      if (inView) {
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    const onResize = () => resize();
    const onScroll = () => {
      // Keep momentum fresh even between pointer frames.
      if (!reduced && running && inView && raf === 0) {
        lastNow = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        if (visible && !inView) {
          inView = true;
          if (running && !reduced) {
            cancelAnimationFrame(raf);
            lastNow = performance.now();
            lastScroll = window.scrollY;
            raf = requestAnimationFrame(tick);
          }
        } else if (!visible) {
          inView = false;
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "96px" },
    );
    io.observe(canvas);

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      drawFrame(2.5, 0);
    } else {
      lastNow = performance.now();
      raf = requestAnimationFrame(tick);
    }

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ touchAction: "none" }}
    />
  );
}
