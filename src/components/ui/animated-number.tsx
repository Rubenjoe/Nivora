"use client";

import { useEffect, useRef, useState } from "react";
import Decimal from "decimal.js";
import {
  currencyFractionDigits,
  formatMoney,
} from "@/lib/finance/money-format";

type AnimatedMoneyProps = {
  /** Stored decimal string, e.g. "12450.50". */
  value: string;
  currency: string;
  /** Animation length in ms. */
  duration?: number;
  className?: string;
};

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Counts up to a money value using Decimal arithmetic for intermediate
 * frames. The final frame is the exact stored value formatted by formatMoney.
 */
export function AnimatedMoney({
  value,
  currency,
  duration = 850,
  className,
}: AnimatedMoneyProps) {
  const [display, setDisplay] = useState(() => formatMoney("0", currency));
  const current = useRef("0");

  useEffect(() => {
    const target = new Decimal(value);
    const exact = formatMoney(value, currency);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced || target.equals(current.current)) {
      current.current = value;
      setDisplay(exact);
      return;
    }

    const from = new Decimal(current.current);
    const delta = target.minus(from);
    const start = performance.now();
    let frame = 0;
    /* Intermediate frames round to the currency's real minor-unit count so
       zero-decimal (JPY) or three-decimal (KWD) values never switch format
       between the animated frames and the final exact value. */
    const fractionDigits = currencyFractionDigits(currency);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      if (progress >= 1) {
        current.current = value;
        setDisplay(exact);
        return;
      }
      const eased = new Decimal(String(easeOutExpo(progress)));
      const next = from
        .plus(delta.times(eased))
        .toDecimalPlaces(fractionDigits);
      current.current = next.toFixed(fractionDigits);
      setDisplay(formatMoney(next, currency));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, currency, duration]);

  return (
    <span className={className} data-animated-number>
      {display}
    </span>
  );
}
