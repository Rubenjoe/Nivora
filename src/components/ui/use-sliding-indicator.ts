"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useSlidingIndicator<T extends HTMLElement>(
  activeSelector: string,
  activeKey: string,
) {
  const ref = useRef<T>(null);

  useBrowserLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = container.querySelector<HTMLElement>(activeSelector);
        if (!active) {
          container.style.setProperty("--pill-w", "0px");
          return;
        }
        const containerRect = container.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        container.style.setProperty(
          "--pill-x",
          `${activeRect.left - containerRect.left - container.clientLeft + container.scrollLeft}px`,
        );
        container.style.setProperty("--pill-w", `${active.offsetWidth}px`);
      });
    };

    update();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(container);
    container
      .querySelectorAll<HTMLElement>("a, button")
      .forEach((item) => observer?.observe(item));
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeKey, activeSelector]);

  return ref;
}
