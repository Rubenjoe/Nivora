"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import Dither from "@/components/ui/dither";

type Theme = "dark" | "light";

export function AmbientDither() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "light"
      ? "light"
      : "dark",
  );
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () =>
      setTheme(root.dataset.theme === "light" ? "light" : "dark");

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Dither
      className="nivora-dither"
      waveColor={theme === "dark" ? "#a79bff" : "#5949c4"}
      backgroundColor="transparent"
      ditherMode="bayer4"
      colorNum={4}
      pixelSize={3}
      waveSpeed={0.018}
      waveFrequency={2.8}
      waveAmplitude={0.22}
      scale={1.1}
      contrast={1.05}
      brightness={-0.12}
      enableMouseInteraction={!prefersReducedMotion}
      mouseEffect="reveal"
      mouseRadius={0.3}
      mouseStrength={0.35}
      trail={0.2}
      clickRipple
      intro={false}
      disableAnimation
      dpr={1}
    />
  );
}
