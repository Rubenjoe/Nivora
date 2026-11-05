"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "loading" | "done";

/** Fallback for navigations that never complete (cancelled, blocked, or failed). */
const SAFETY_TIMEOUT_MS = 8000;

/** Thin violet progress line at the top of the viewport during navigation. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const routeKey = query ? `${pathname}?${query}` : pathname;
  const [phase, setPhase] = useState<Phase>("idle");
  const lastRoute = useRef(routeKey);
  const timer = useRef<number | undefined>(undefined);
  const safetyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      /* Only real HTML anchors count. SVG `<a>` elements (chart drill-downs)
         expose `href` as an SVGAnimatedString, which produces a garbage URL. */
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        `${url.pathname}${url.search}` ===
        `${window.location.pathname}${window.location.search}`
      )
        return;
      window.clearTimeout(timer.current);
      /* If the navigation never completes (cancelled or failed request), the
         bar would otherwise stay on screen forever. */
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(() => {
        setPhase("idle");
      }, SAFETY_TIMEOUT_MS);
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(safetyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (routeKey === lastRoute.current) return;
    lastRoute.current = routeKey;
    window.clearTimeout(safetyTimer.current);
    setPhase("done");
    timer.current = window.setTimeout(() => setPhase("idle"), 520);
    return () => window.clearTimeout(timer.current);
  }, [routeKey]);

  return (
    <div
      className="nv-route-progress"
      data-phase={phase}
      role="presentation"
      aria-hidden="true"
    >
      <span />
    </div>
  );
}
