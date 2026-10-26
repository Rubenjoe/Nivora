"use client";

import { Profiler, useEffect } from "react";
import { CashFlowChart } from "@/components/cash-flow-chart";

declare global {
  interface Window {
    __chartRenderSamples?: number[];
  }
}

const fixtureSeries = Array.from({ length: 31 }, (_, index) => ({
  label: `Day ${String(index + 1).padStart(2, "0")}`,
  income: (2100 + index * 37).toFixed(2),
  expenses: (700 + ((index * 83) % 1200)).toFixed(2),
}));

export default function ChartFixturePage() {
  useEffect(() => {
    window.__chartRenderSamples = [];
    return () => {
      delete window.__chartRenderSamples;
    };
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "48px auto", padding: "24px" }}>
      <h1>Temporary cash-flow interaction fixture</h1>
      <p>
        Deterministic synthetic values for local testing only; not persisted.
      </p>
      <Profiler
        id="cash-flow-chart"
        onRender={(_id, _phase, actualDuration) => {
          window.__chartRenderSamples?.push(actualDuration);
        }}
      >
        <CashFlowChart currency="USD" series={fixtureSeries} />
      </Profiler>
    </main>
  );
}
