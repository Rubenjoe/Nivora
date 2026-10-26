export function nearestChartPointIndex(
  localX: number,
  plotLeft: number,
  plotWidth: number,
  pointCount: number,
): number | null {
  if (
    !Number.isFinite(localX) ||
    !Number.isFinite(plotLeft) ||
    !Number.isFinite(plotWidth) ||
    plotWidth <= 0 ||
    !Number.isInteger(pointCount) ||
    pointCount <= 0
  ) {
    return null;
  }

  if (pointCount === 1) return 0;

  const ratio = Math.max(0, Math.min(1, (localX - plotLeft) / plotWidth));
  return Math.round(ratio * (pointCount - 1));
}
