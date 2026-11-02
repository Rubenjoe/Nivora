"use client";

import { useEffect, useRef, useState } from "react";
import type { EChartsCoreOption, EChartsType } from "echarts/core";

export type EChartProps = {
  option: EChartsCoreOption;
  ariaLabel: string;
  height?: number;
  className?: string;
  onSelect?: (params: unknown) => void;
};

/**
 * Thin client-only shell around ECharts. The engine is imported lazily inside
 * an effect, so no chart code can touch the server render, and one
 * ResizeObserver keeps the SVG renderer in step with its container.
 */
export function EChart({
  option,
  ariaLabel,
  height = 320,
  className,
  onSelect,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let chart: EChartsType | null = null;
    let observer: ResizeObserver | null = null;

    import("@/components/charts/echarts-registry")
      .then(({ initChart }) => {
        if (!active || !containerRef.current) return;
        chart = initChart(containerRef.current);
        chartRef.current = chart;
        observer = new ResizeObserver(() => {
          chart?.resize({ animation: { duration: 0 } });
        });
        observer.observe(containerRef.current);
        setReady(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      observer?.disconnect();
      chart?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart || !onSelect) return;
    const handler = (params: unknown) => onSelect(params);
    chart.on("click", handler);
    return () => {
      chart.off("click", handler);
    };
  }, [onSelect, ready]);

  useEffect(() => {
    if (!ready || !chartRef.current) return;
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: false });
  }, [option, ready]);

  return (
    <div
      className={`echart-shell${className ? ` ${className}` : ""}`}
      style={{ minHeight: height }}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={containerRef}
        className="echart-canvas"
        style={{ height }}
        aria-hidden="true"
      />
      {!ready && !failed ? (
        <div className="chart-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {failed ? (
        <p className="echart-fallback" role="note">
          This visual could not be loaded. The written summary below still
          contains the same figures.
        </p>
      ) : null}
    </div>
  );
}
