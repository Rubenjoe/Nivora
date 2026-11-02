import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  TreemapChart,
} from "echarts/charts";
import {
  AriaComponent,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  TreemapChart,
  AriaComponent,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
  TooltipComponent,
  SVGRenderer,
]);

/**
 * Kept behind a dynamic import so the chart engine stays out of the initial
 * analytics bundle until an advanced visual is actually opened.
 */
export function initChart(element: HTMLElement) {
  return echarts.init(element, undefined, {
    renderer: "svg",
    useDirtyRect: true,
  });
}

export type { EChartsType } from "echarts/core";
