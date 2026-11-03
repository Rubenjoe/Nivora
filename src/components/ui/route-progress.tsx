"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "loading" | "done";

/** Thin violet progress line at the top of the viewport during navigation. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const routeKey = query ? `${pathname}?${query}` : pathname;
  const [phase, setPhase] = useState<Phase>("idle");
  const lastRoute = useRef(routeKey);
  const timer = useRef<number | undefined>(undefined);

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
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        `${url.pathname}${url.search}` ===
        `${window.location.pathname}${window.location.search}`
      )
        return;
      window.clearTimeout(timer.current);
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (routeKey === lastRoute.current) return;
    lastRoute.current = routeKey;
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
