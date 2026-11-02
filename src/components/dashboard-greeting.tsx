"use client";

import { useEffect, useState } from "react";
import {
  buildGreeting,
  greetingSubtitle,
  type GreetingPeriod,
} from "@/lib/finance/greeting";

export function DashboardGreeting({
  displayName,
  timezone,
  initialGreeting,
  period,
}: {
  displayName: string | null;
  timezone: string | null;
  initialGreeting: string;
  period: GreetingPeriod;
}) {
  const [greeting, setGreeting] = useState(initialGreeting);

  useEffect(() => {
    const update = () => {
      const next = buildGreeting(new Date(), displayName, timezone);
      setGreeting((current) => (current === next ? current : next));
    };
    update();
    const timer = window.setInterval(update, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [displayName, timezone]);

  return (
    <div className="dashboard-intro">
      <p className="dashboard-greeting" aria-live="polite">
        <span className="dashboard-greeting-mark" aria-hidden="true" />
        {greeting}
      </p>
      <h1>Overview</h1>
      <p className="subheading">{greetingSubtitle(period)}</p>
    </div>
  );
}
