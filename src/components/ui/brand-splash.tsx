"use client";

import { useEffect } from "react";
import { BrandWordmark } from "@/components/brand-wordmark";

/**
 * Short brand intro on the first full page load of a browser session.
 * It never blocks input (pointer-events: none) and removes itself via CSS.
 * The inline bootstrap in layout.tsx sets data-splash="seen" on later loads,
 * which hides it before first paint.
 */
export function BrandSplash() {
  useEffect(() => {
    try {
      sessionStorage.setItem("nivora-splash", "seen");
    } catch {
      /* storage unavailable: splash simply plays each load */
    }
  }, []);

  return (
    <div className="nv-splash" aria-hidden="true">
      <div className="nv-splash-core">
        <span className="nv-splash-ring" />
        <BrandWordmark className="nv-splash-mark" />
        <span className="nv-splash-line" />
      </div>
    </div>
  );
}
