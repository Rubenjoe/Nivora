"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * AuroraField — the living background of the Nivora landing page.
 *
 * Paints three layers on a single fixed Canvas 2D:
 *   1. Flowing aurora ribbons (purple / gold / champagne) that accelerate
 *      with scroll velocity — a nod to light-trail motion art.
 *   2. A parallax field of gold dust that drifts upward and twinkles.
 *   3. A soft cursor nebula (additive glow chasing the pointer).
 *
 * Pure Canvas 2D — no WebGL, no extra dependencies. Respects
 * prefers-reduced-motion by painting a single static frame.
 */

type Strand = {
  baseY: number; // resting height, 0..1 of viewport
  amp: number; // primary sine amplitude in px
  amp2: number; // secondary sine amplitude in px
  freq: number; // primary frequency (rad per px)
  freq2: number; // secondary frequency
  speed: number; // phase drift per second
  phase: number;
  width: number; // core stroke width
  color: string; // rgb triplet "r,g,b"
  alpha: number;
  parallax: number; // scroll response factor
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
};

function buildStrands(width: number): Strand[] {
  const thin = width < 768;
  const groups: Array<{
    baseY: number;
    count: number;
    colors: string[];
    amp: number;
    width: number;
    alpha: number;
  }> = [
    // Upper braid — violet into purple
    {
      baseY: 0.26,
      count: thin ? 2 : 3,
      colors: [PALETTE.violet, PALETTE.purple, PALETTE.violet],
      amp: 64,
      width: 1.6,
      alpha: 0.5,
    },
    // Middle river — gold, the money light
    {
      baseY: 0.52,
      count: thin ? 3 : 4,
      colors: [
        PALETTE.gold,
        PALETTE.champagne,
        PALETTE.gold,
        PALETTE.champagne,
      ],
      amp: 84,
      width: 1.9,
      alpha: 0.6,
    },
    // Lower drift — deep purple with a breath of blue
    {
      baseY: 0.76,
      count: thin ? 2 : 3,
      colors: [PALETTE.violet, PALETTE.blue, PALETTE.purple],
      amp: 56,
      width: 1.4,
      alpha: 0.42,
    },
  ];

  const strands: Strand[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      strands.push({
        baseY: g.baseY + (i - (g.count - 1) / 2) * 0.028,
        amp: g.amp * (0.72 + ((i * 37) % 10) / 22),
        amp2: g.amp * 0.34,
        freq: 0.0016 + (((i * 53) % 7) / 10) * 0.0007,
        freq2: 0.0038 + (((i * 29) % 5) / 10) * 0.0012,
        speed: 0.16 + (((i * 41) % 9) / 12) * 0.14,
        phase: (i / g.count) * Math.PI * 2 + g.baseY * 5,
        width: g.width * (0.75 + ((i * 17) % 6) / 10),
        color: g.colors[i % g.colors.length],
        alpha: g.alpha,
        parallax: -0.03 - i * 0.012,
      });
    }
  }
  return strands;
}

function buildMotes(width: number, height: number): Mote[] {
  const count = Math.min(150, Math.floor((width * height) / 11000));
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.25 + Math.random() * 0.75,
      r: 0.5 + Math.random() * 1.7,
      drift: 6 + Math.random() * 16,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.6 + Math.random() * 1.6,
      gold: Math.random() > 0.22, // mostly gold dust, a few purple sparks
    });
  }
  return motes;
}

export function AuroraField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let strands = buildStrands(width);
    let motes = buildMotes(width, height);

    // Cursor nebula target + smoothed position
    let pointerX = -1;
    let pointerY = -1;
    let nebX = -1;
    let nebY = -1;
    let pointerSeen = false;

    // Scroll state
    let lastScroll = window.scrollY;
    let smoothVel = 0;

    let raf = 0;
    let running = true;
    const startTime = performance.now();
    let lastNow = performance.now();

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      strands = buildStrands(width);
      motes = buildMotes(width, height);
      if (reduced) drawFrame(2.5, 0);
    };

    const onPointer = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!pointerSeen) {
        nebX = pointerX;
        nebY = pointerY;
        pointerSeen = true;
      }
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) {
        cancelAnimationFrame(raf);
        lastNow = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    /** Paint one full frame at time `t` (seconds). */
    const drawFrame = (t: number, dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const scrollY = window.scrollY;

      // ---- Aurora ribbons -------------------------------------------------
      for (const s of strands) {
        const basePx = s.baseY * height + scrollY * s.parallax;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgba(${s.color},0)`);
        gradient.addColorStop(
          0.18,
          `rgba(${s.color},${(s.alpha * 0.55).toFixed(3)})`,
        );
        gradient.addColorStop(0.5, `rgba(${s.color},${s.alpha})`);
        gradient.addColorStop(
          0.82,
          `rgba(${s.color},${(s.alpha * 0.55).toFixed(3)})`,
        );
        gradient.addColorStop(1, `rgba(${s.color},0)`);

        const points: Array<[number, number]> = [];
        for (let x = -60; x <= width + 60; x += 12) {
          const y =
            basePx +
            Math.sin(x * s.freq + t * s.speed + s.phase) * s.amp +
            Math.sin(x * s.freq2 - t * s.speed * 1.6 + s.phase * 1.7) * s.amp2;
          points.push([x, y]);
        }

        // Three passes: wide halo → mid glow → bright core.
        const passes: Array<[number, number]> = [
          [s.width * 3.4, 0.16],
          [s.width * 1.9, 0.34],
          [s.width, 0.85],
        ];
        for (const [lineWidth, alphaScale] of passes) {
          ctx.beginPath();
          for (let i = 0; i < points.length; i++) {
            const [x, y] = points[i];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = alphaScale;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }
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
        const parallaxY = m.y + scrollY * m.z * 0.1;
        const wrappedY = (((parallaxY % span) + span) % span) - 8;
        const tw = 0.55 + 0.45 * Math.sin(t * m.twinkleSpeed + m.twinkle);
        const color = m.gold ? PALETTE.gold : PALETTE.purple;
        const alpha = 0.34 * m.z * tw;
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
        const nebula = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 300);
        nebula.addColorStop(0, `rgba(${PALETTE.purple},0.075)`);
        nebula.addColorStop(0.45, `rgba(${PALETTE.violet},0.035)`);
        nebula.addColorStop(1, "rgba(93,74,196,0)");
        ctx.fillStyle = nebula;
        ctx.fillRect(nebX - 300, nebY - 300, 600, 600);

        const core = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 90);
        core.addColorStop(0, `rgba(${PALETTE.champagne},0.05)`);
        core.addColorStop(1, "rgba(244,231,197,0)");
        ctx.fillStyle = core;
        ctx.fillRect(nebX - 90, nebY - 90, 180, 180);
      }

      ctx.globalCompositeOperation = "source-over";
    };

    /** Main loop — advances time, folds scroll velocity into flow speed. */
    const tick = (now: number) => {
      if (!running) return;
      const t = (now - startTime) / 1000;

      const scrollNow = window.scrollY;
      const rawVel = (scrollNow - lastScroll) / 16.7; // px per frame
      lastScroll = scrollNow;
      smoothVel += (rawVel - smoothVel) * 0.08;

      // Ribbons stream faster while the visitor scrolls — the page reacts.
      const flowBoost = 1 + Math.min(Math.abs(smoothVel) / 26, 3.2);
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      drawFrame(t * flowBoost, dt);
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) {
      drawFrame(2.5, 0);
    } else {
      lastNow = performance.now();
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
