"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/components/charts/echart";
import {
  compactMoney,
  escapeMarkup,
  formatBucketLabel,
  useChartPalette,
  useReducedMotion,
  type ChartPalette,
} from "@/components/charts/chart-theme";
import { formatMoney } from "@/lib/finance/money-format";
import {
  buildCashFlowForecast,
  buildCategoryRadar,
  buildCategoryTreemap,
  buildMerchantBubbles,
  buildSankeyAllocation,
  type ChartCategory,
  type DailyActivity,
  type MerchantAggregate,
  type SeriesPoint,
} from "@/lib/finance/chart-data";

export type AdvancedAnalyticsData = {
  period: { from: string; to: string; grain: "daily" | "weekly" | "monthly" };
  currency: string;
  series: SeriesPoint[];
  totals: { income: string; expenses: string; net: string };
  comparison: {
    incomeDelta: string | null;
    expenseDelta: string | null;
    netDelta: string | null;
  };
  categories: ChartCategory[];
  priorCategories: ChartCategory[];
  incomeCategories: ChartCategory[];
  dailyActivity: DailyActivity[];
  merchants: MerchantAggregate[];
};

const TABS = [
  { key: "allocation", label: "Allocation" },
  { key: "categories", label: "Categories" },
  { key: "merchants", label: "Merchants" },
  { key: "rhythm", label: "Monthly rhythm" },
  { key: "compare", label: "Two-period compare" },
  { key: "forecast", label: "Forecast" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function drillHref(
  from: string,
  to: string,
  filters: { categoryId?: string; merchant?: string },
) {
  const query = new URLSearchParams({ from, to, kind: "expense" });
  if (filters.categoryId) query.set("categoryId", filters.categoryId);
  if (filters.merchant) query.set("merchant", filters.merchant);
  return `/transactions?${query.toString()}`;
}

function Panel({
  title,
  description,
  children,
  summary,
}: {
  title: string;
  description: string;
  children: ReactNode;
  summary: string;
}) {
  return (
    <div className="advanced-chart-panel">
      <div className="advanced-chart-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
      <p className="advanced-chart-summary">{summary}</p>
    </div>
  );
}

function EmptyChart({ title, body }: { title: string; body: string }) {
  return (
    <div className="advanced-chart-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function tooltipStyle(palette: ChartPalette) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    padding: [9, 11],
    textStyle: { color: palette.text, fontSize: 12 },
    extraCssText:
      "border-radius:10px;box-shadow:0 18px 40px -24px rgba(0,0,0,.75);",
  };
}

function baseAnimation(reduced: boolean) {
  return reduced
    ? { animation: false as const }
    : {
        animation: true as const,
        animationDuration: 620,
        animationDurationUpdate: 420,
        animationEasing: "cubicOut" as const,
      };
}

function SankeyView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const allocation = useMemo(
    () => buildSankeyAllocation(data.incomeCategories, data.categories),
    [data.incomeCategories, data.categories],
  );

  const nodeTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const node of allocation.nodes) {
      const total = allocation.links
        .filter((link) =>
          node.kind === "income"
            ? link.source === node.name
            : node.kind === "pool"
              ? link.source === node.name
              : link.target === node.name,
        )
        .reduce((sum, link) => sum + link.value, 0);
      totals.set(node.name, total);
    }
    return totals;
  }, [allocation.links, allocation.nodes]);

  const option = useMemo<EChartsCoreOption>(() => {
    const labelByNode = new Map(
      allocation.nodes.map((node) => [node.name, node]),
    );
    return {
      ...baseAnimation(reduced),
      color: palette.series,
      tooltip: {
        ...tooltipStyle(palette),
        trigger: "item",
        formatter: (params: {
          dataType?: string;
          name?: string;
          value?: number;
          data?: { source?: string; target?: string };
        }) => {
          if (params.dataType === "edge") {
            const source = labelByNode.get(params.data?.source ?? "");
            const target = labelByNode.get(params.data?.target ?? "");
            return `${escapeMarkup(source?.label ?? params.data?.source)} → ${escapeMarkup(
              target?.label ?? params.data?.target,
            )}<br/><strong>${formatMoney(
              String(params.value ?? 0),
              data.currency,
            )}</strong>`;
          }
          const node = labelByNode.get(params.name ?? "");
          const total = nodeTotals.get(params.name ?? "") ?? 0;
          return `${escapeMarkup(node?.label ?? params.name)}<br/><strong>${formatMoney(
            String(total),
            data.currency,
          )}</strong>`;
        },
      },
      series: [
        {
          type: "sankey",
          left: 8,
          right: 104,
          top: 16,
          bottom: 16,
          data: allocation.nodes.map((node) => ({
            name: node.name,
            itemStyle: {
              color:
                node.kind === "income"
                  ? palette.income
                  : node.kind === "expense"
                    ? palette.expense
                    : node.kind === "retained"
                      ? palette.gold
                      : palette.violet,
              borderColor: palette.card,
              borderWidth: 1,
            },
          })),
          links: allocation.links,
          nodeWidth: 12,
          nodeGap: 12,
          nodeAlign: "justify",
          layoutIterations: 24,
          label: {
            color: palette.text,
            fontSize: 11,
            fontFamily: "inherit",
            formatter: (params: { name?: string }) => {
              const node = labelByNode.get(params.name ?? "");
              return node?.label ?? params.name ?? "";
            },
          },
          lineStyle: {
            color: "gradient",
            opacity: 0.26,
            curveness: 0.5,
          },
          emphasis: {
            focus: "adjacency",
            lineStyle: { opacity: 0.55 },
          },
        },
      ],
    };
  }, [allocation, data.currency, nodeTotals, palette, reduced]);

  if (!allocation.canRender) {
    return (
      <Panel
        title="Where recorded income went"
        description="A pooled allocation, not a claim about which income paid for which expense."
        summary={
          allocation.reason ?? "There is not enough recorded activity yet."
        }
      >
        <EmptyChart
          title="Allocation unavailable"
          body={
            allocation.reason ?? "There is not enough recorded activity yet."
          }
        />
      </Panel>
    );
  }

  const retained = Number(allocation.retained);
  const summary = `Recorded income of ${formatMoney(
    allocation.totalIncome,
    data.currency,
  )} is pooled and allocated to ${formatMoney(
    allocation.totalExpenses,
    data.currency,
  )} of recorded expenses${
    retained > 0
      ? `, leaving ${formatMoney(allocation.retained, data.currency)} retained`
      : ""
  }. Both sides balance to the same total.`;

  return (
    <Panel
      title="Where recorded income went"
      description="Income categories feed one pool, which then splits into expense categories and retained cash."
      summary={summary}
    >
      <EChart
        option={option}
        ariaLabel="Sankey allocation of recorded income into expense categories"
        height={360}
      />
    </Panel>
  );
}

function TreemapView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const router = useRouter();
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);
  const treemap = useMemo(
    () => buildCategoryTreemap(data.categories, data.merchants),
    [data.categories, data.merchants],
  );
  const categoryByName = useMemo(
    () => new Map(data.categories.map((category) => [category.name, category])),
    [data.categories],
  );
  const focusCategory =
    treemap.data.find(
      (category) =>
        category.categoryId === focusCategoryId &&
        (category.children?.length ?? 0) > 0,
    ) ?? null;
  const chartData = focusCategory?.children?.length
    ? focusCategory.children
    : treemap.data;

  const option = useMemo<EChartsCoreOption>(
    () => ({
      ...baseAnimation(reduced),
      color: palette.series,
      tooltip: {
        ...tooltipStyle(palette),
        formatter: (params: {
          treePathInfo?: { name: string }[];
          name?: string;
          value?: number;
        }) => {
          const path = (params.treePathInfo ?? [])
            .slice(1)
            .map((entry) => escapeMarkup(entry.name))
            .join(" / ");
          return `${path || escapeMarkup(params.name)}<br/><strong>${formatMoney(
            String(params.value ?? 0),
            data.currency,
          )}</strong>`;
        },
      },
      series: [
        {
          type: "treemap",
          name: "Expenses",
          data: chartData,
          leafDepth: 1,
          squareRatio: 1,
          drillDownIcon: "",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          upperLabel: {
            show: true,
            height: 22,
            color: palette.text,
            fontSize: 10,
            fontWeight: 500,
          },
          label: {
            color: palette.text,
            fontSize: 9.5,
            lineHeight: 11.5,
            overflow: "breakAll",
          },
          itemStyle: {
            borderColor: palette.card,
            borderWidth: 2,
            gapWidth: 2,
          },
          levels: [
            {
              itemStyle: { borderWidth: 0, gapWidth: 3 },
              upperLabel: { show: false },
            },
            {
              itemStyle: { borderWidth: 2, gapWidth: 2 },
              upperLabel: { show: true },
            },
            {
              itemStyle: { borderWidth: 2, gapWidth: 2 },
              label: { show: true, position: "inside" },
            },
          ],
        },
      ],
    }),
    [data.currency, palette, reduced, chartData],
  );

  if (!treemap.canRender) {
    return (
      <Panel
        title="Category and merchant treemap"
        description="Area is spend. Select a category to focus its merchants; select a merchant to open the matching transactions."
        summary="No recorded expenses in this range, so there is nothing to map."
      >
        <EmptyChart
          title="No spending to map"
          body="Record an expense to build the category and merchant map."
        />
      </Panel>
    );
  }

  const top = treemap.topCategory;
  const leaders = data.categories
    .slice(0, 3)
    .map(
      (category) =>
        `${category.name} ${formatMoney(category.amount, data.currency)}`,
    )
    .join(", ");
  const focusSource = focusCategory
    ? (data.categories.find(
        (category) => category.categoryId === focusCategory.categoryId,
      ) ?? null)
    : null;
  const focusMerchants = focusCategory
    ? data.merchants.filter(
        (merchant) =>
          merchant.categoryId === focusCategory.categoryId &&
          new Decimal(merchant.totalSpent).greaterThan(0),
      )
    : [];
  const focusTotal = new Decimal(focusSource?.amount ?? 0);
  const focusAttributed = focusMerchants.reduce(
    (sum, merchant) => sum.plus(merchant.totalSpent),
    new Decimal(0),
  );
  const focusResidual = focusTotal.minus(focusAttributed);
  const summary =
    focusCategory && focusSource
      ? `${formatMoney(focusTotal.toFixed(2), data.currency)} of ${
          focusCategory.name
        } expenses across ${focusMerchants.length} ${
          focusMerchants.length === 1
            ? "recorded merchant"
            : "recorded merchants"
        }${focusResidual.greaterThan(0) ? `; ${formatMoney(focusResidual.toFixed(2), data.currency)} has no merchant recorded` : ""}. Select a merchant to open its transactions.`
      : top
        ? `${formatMoney(treemap.total, data.currency)} of expenses across ${
            treemap.data.length
          } categories. Largest: ${leaders}. Select a category to focus its merchants; select a merchant to open the matching transactions.`
        : "No recorded expenses in this range.";

  return (
    <Panel
      title="Category and merchant treemap"
      description={
        focusCategory
          ? "Select a merchant to open its transactions, or return to all categories."
          : "Area is spend. Select a category to focus its merchants; select a merchant to open the matching transactions."
      }
      summary={summary}
    >
      {focusCategory ? (
        <div className="treemap-focus-bar">
          <button
            type="button"
            className="treemap-back"
            onClick={() => setFocusCategoryId(null)}
          >
            <span aria-hidden="true">←</span> All categories
          </button>
          <span className="treemap-focus-name">
            {focusCategory.name} merchants
          </span>
        </div>
      ) : null}
      <EChart
        option={option}
        ariaLabel={
          focusCategory
            ? `Treemap of ${focusCategory.name} expenses by merchant`
            : "Treemap of expenses by category"
        }
        height={380}
        onSelect={(raw) => {
          const params = raw as {
            treePathInfo?: { name: string }[];
            data?: { merchant?: string };
          };
          if (focusCategory) {
            router.push(
              drillHref(data.period.from, data.period.to, {
                categoryId: focusCategory.categoryId,
                merchant: params.data?.merchant,
              }),
            );
            return;
          }
          const path = params.treePathInfo ?? [];
          if (path.length < 2) return;
          const category = categoryByName.get(path[1]?.name ?? "");
          if (!category) return;
          const categoryNode = treemap.data.find(
            (entry) => entry.categoryId === category.categoryId,
          );
          if (categoryNode?.children?.length) {
            setFocusCategoryId(category.categoryId);
            return;
          }
          router.push(
            drillHref(data.period.from, data.period.to, {
              categoryId: category.categoryId,
            }),
          );
        }}
      />
    </Panel>
  );
}

function MerchantView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const router = useRouter();
  const bubbles = useMemo(
    () => buildMerchantBubbles(data.merchants, 40),
    [data.merchants],
  );
  const categoryByName = useMemo(
    () => new Map(data.categories.map((category) => [category.name, category])),
    [data.categories],
  );

  const option = useMemo<EChartsCoreOption>(
    () => ({
      ...baseAnimation(reduced),
      grid: { left: 62, right: 24, top: 34, bottom: 48 },
      tooltip: {
        ...tooltipStyle(palette),
        trigger: "item",
        formatter: (params: {
          data?: {
            merchant?: string;
            categoryName?: string;
            totalSpent?: string;
            transactionCount?: number;
            avgTransactionAmount?: string;
          };
        }) => {
          const point = params.data;
          if (!point) return "";
          return `<strong>${escapeMarkup(point.merchant)}</strong><br/>${escapeMarkup(
            point.categoryName,
          )}<br/>Spend: ${formatMoney(
            point.totalSpent ?? "0",
            data.currency,
          )}<br/>Transactions: ${point.transactionCount ?? 0}<br/>Average: ${formatMoney(
            point.avgTransactionAmount ?? "0",
            data.currency,
          )}`;
        },
      },
      xAxis: {
        type: "value",
        name: "Transactions",
        nameTextStyle: { color: palette.muted, fontSize: 10 },
        min: 0,
        axisLabel: { color: palette.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      yAxis: {
        type: "value",
        name: data.currency,
        nameTextStyle: { color: palette.muted, fontSize: 10 },
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          formatter: (value: number) => compactMoney(value, data.currency),
        },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, filterMode: "none" },
        { type: "inside", yAxisIndex: 0, filterMode: "none" },
      ],
      series: [
        {
          type: "scatter",
          name: "Merchants",
          data: bubbles.points.map((point) => ({
            name: point.merchant,
            value: [point.x, point.y],
            symbolSize: point.size,
            ...point,
          })),
          symbolSize: 10,
          itemStyle: {
            color: palette.violet,
            opacity: 0.72,
            borderColor: palette.card,
            borderWidth: 1,
          },
          emphasis: {
            scale: 1.18,
            itemStyle: { opacity: 0.95 },
          },
        },
      ],
    }),
    [bubbles.points, data.currency, palette, reduced],
  );

  if (!bubbles.canRender) {
    return (
      <Panel
        title="Merchant concentration"
        description="Each bubble is a merchant within one category. Horizontal position is transaction count, vertical is total spend, and size follows average transaction value."
        summary="No merchant names were recorded on expenses in this range, so merchant concentration cannot be shown."
      >
        <EmptyChart
          title="No merchant names recorded"
          body="Merchant names are optional. Add one to an expense to place it on this chart."
        />
      </Panel>
    );
  }

  const top = bubbles.topMerchant;
  const summary = top
    ? `${bubbles.points.length} merchant and category pair${
        bubbles.points.length === 1 ? "" : "s"
      } ${
        bubbles.points.length === 1 ? "is" : "are"
      } plotted, led by ${top.merchant} at ${formatMoney(
        top.totalSpent,
        data.currency,
      )} across ${top.transactionCount} transaction${
        top.transactionCount === 1 ? "" : "s"
      }${
        bubbles.hiddenCount
          ? `. ${bubbles.hiddenCount} smaller ${
              bubbles.hiddenCount === 1 ? "pair is" : "pairs are"
            } omitted to keep the chart readable`
          : ""
      }. Scroll or pinch inside the plot to zoom.`
    : "No merchant names were recorded.";

  return (
    <Panel
      title="Merchant concentration"
      description="Each bubble is a merchant within one category. Horizontal position is transaction count, vertical is total spend, and size follows average transaction value."
      summary={summary}
    >
      <EChart
        option={option}
        ariaLabel="Bubble chart comparing merchant spend, frequency, and average transaction value"
        height={340}
        onSelect={(raw) => {
          const params = raw as {
            data?: { merchant?: string; categoryName?: string };
          };
          const category = categoryByName.get(params.data?.categoryName ?? "");
          if (!category || !params.data?.merchant) return;
          router.push(
            drillHref(data.period.from, data.period.to, {
              categoryId: category.categoryId,
              merchant: params.data.merchant,
            }),
          );
        }}
      />
    </Panel>
  );
}

function RhythmView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const option = useMemo<EChartsCoreOption>(
    () => ({
      ...baseAnimation(reduced),
      grid: { left: 62, right: 22, top: 38, bottom: 56 },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: palette.muted, fontSize: 10 },
        itemWidth: 10,
        itemHeight: 6,
      },
      tooltip: {
        ...tooltipStyle(palette),
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: palette.grid } },
        formatter: (
          params: { axisValue?: string; seriesName?: string; value?: number }[],
        ) => {
          const label = formatBucketLabel(String(params[0]?.axisValue ?? ""));
          const rows = params
            .map(
              (item) =>
                `${escapeMarkup(item.seriesName)}: ${formatMoney(
                  String(item.value ?? 0),
                  data.currency,
                )}`,
            )
            .join("<br/>");
          return `<strong>${escapeMarkup(label)}</strong><br/>${rows}`;
        },
      },
      xAxis: {
        type: "category",
        data: data.series.map((point) => point.label),
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          interval: "auto",
          formatter: (value: string) => formatBucketLabel(value),
        },
        axisLine: { lineStyle: { color: palette.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          formatter: (value: number) => compactMoney(value, data.currency),
        },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      dataZoom: [{ type: "inside", xAxisIndex: 0, filterMode: "none" }],
      series: [
        {
          name: "Income",
          type: "bar",
          data: data.series.map((point) => Number(point.income)),
          barMaxWidth: 26,
          barGap: "12%",
          itemStyle: { color: palette.income, borderRadius: [4, 4, 0, 0] },
          animationDelay: (index: number) => index * 35,
        },
        {
          name: "Expenses",
          type: "bar",
          data: data.series.map((point) => Number(point.expenses)),
          barMaxWidth: 26,
          itemStyle: { color: palette.expense, borderRadius: [4, 4, 0, 0] },
          animationDelay: (index: number) => index * 35 + 90,
        },
      ],
    }),
    [data.currency, data.series, palette, reduced],
  );

  const summary = `${data.series.length} ${
    data.period.grain
  } buckets between ${data.period.from} and ${data.period.to}, with ${formatMoney(
    data.totals.income,
    data.currency,
  )} income and ${formatMoney(
    data.totals.expenses,
    data.currency,
  )} expenses in total. Quiet buckets are present as zero rather than omitted.`;

  return (
    <Panel
      title="Income and expenses by period"
      description={`Grouped ${data.period.grain} bars. Use the mouse wheel, trackpad, or touch to zoom; scroll back to reset.`}
      summary={summary}
    >
      <EChart
        option={option}
        ariaLabel={`Grouped bar chart of income and expenses by ${data.period.grain} bucket`}
        height={340}
      />
    </Panel>
  );
}

function RadarView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const radar = useMemo(
    () => buildCategoryRadar(data.categories, data.priorCategories),
    [data.categories, data.priorCategories],
  );
  const {
    categories: radarCategories,
    indicators: radarIndicators,
    current: radarCurrent,
    prior: radarPrior,
  } = radar;

  const option = useMemo<EChartsCoreOption>(
    () => ({
      ...baseAnimation(reduced),
      color: [palette.violet, palette.compare],
      tooltip: {
        ...tooltipStyle(palette),
        trigger: "item",
        formatter: (params: {
          seriesName?: string;
          name?: string;
          value?: number[];
        }) => {
          const rows = radarCategories
            .map(
              (category, index) =>
                `${escapeMarkup(category.name)}: ${formatMoney(
                  String(params.value?.[index] ?? 0),
                  data.currency,
                )}`,
            )
            .join("<br/>");
          return `<strong>${escapeMarkup(params.seriesName)}</strong><br/>${rows}`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: palette.muted, fontSize: 10 },
        itemWidth: 10,
        itemHeight: 6,
      },
      radar: {
        center: ["50%", "48%"],
        radius: "64%",
        indicator: radarIndicators.map((indicator) => ({
          name: indicator.name,
          max: indicator.max,
        })),
        axisName: { color: palette.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: palette.grid } },
        splitLine: { lineStyle: { color: palette.grid } },
        splitArea: {
          areaStyle: { color: ["transparent", "rgba(255,255,255,0.012)"] },
        },
      },
      series: [
        {
          type: "radar",
          symbolSize: 4,
          data: [
            {
              name: "This period",
              value: radarCurrent,
              lineStyle: { color: palette.violet, width: 2 },
              itemStyle: { color: palette.violet },
              areaStyle: { color: palette.violet, opacity: 0.18 },
            },
            {
              name: "Previous period",
              value: radarPrior,
              lineStyle: { color: palette.compare, width: 1.6, type: "dashed" },
              itemStyle: { color: palette.compare },
              areaStyle: { color: palette.compare, opacity: 0.08 },
            },
          ],
        },
      ],
    }),
    [
      data.currency,
      palette,
      radarCategories,
      radarCurrent,
      radarIndicators,
      radarPrior,
      reduced,
    ],
  );

  if (!radar.canRender) {
    return (
      <Panel
        title="Two-period category shape"
        description="The same categories are compared on one scale for this period and the preceding period of equal length."
        summary="A radar comparison needs at least three categories with recorded expenses across the two periods."
      >
        <EmptyChart
          title="Not enough categories to compare"
          body="At least three categories need recorded spending in this or the previous period."
        />
      </Panel>
    );
  }

  const notable = radar.notableChange;
  const summary = notable
    ? `The largest category movement is ${notable.name}, from ${formatMoney(
        notable.prior,
        data.currency,
      )} to ${formatMoney(notable.current, data.currency)} — a difference of ${formatMoney(
        notable.difference,
        data.currency,
      )}. Categories are scaled independently, so shapes compare emphasis rather than absolute area.`
    : "Categories are scaled independently, so shapes compare emphasis rather than absolute area.";

  return (
    <Panel
      title="Two-period category shape"
      description="The same categories are compared on one scale for this period and the preceding period of equal length."
      summary={summary}
    >
      <EChart
        option={option}
        ariaLabel="Radar chart comparing this period's category spending with the previous period"
        height={380}
      />
    </Panel>
  );
}

function ForecastView({
  data,
  palette,
  reduced,
}: {
  data: AdvancedAnalyticsData;
  palette: ChartPalette;
  reduced: boolean;
}) {
  const forecast = useMemo(
    () => buildCashFlowForecast(data.series, data.period.grain),
    [data.series, data.period.grain],
  );

  const option = useMemo<EChartsCoreOption>(() => {
    const labels = [
      ...forecast.history.map((point) => point.label),
      ...forecast.projection.map((point) => point.label),
    ];
    const historyData = [
      ...forecast.history.map((point) => point.net),
      ...forecast.projection.map(() => null),
    ];
    const projectionData = [
      ...forecast.history.map((point, index) =>
        index === forecast.history.length - 1 ? point.net : null,
      ),
      ...forecast.projection.map((point) => point.net),
    ];
    return {
      ...baseAnimation(reduced),
      grid: { left: 68, right: 24, top: 38, bottom: 56 },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: palette.muted, fontSize: 10 },
        itemWidth: 14,
        itemHeight: 6,
      },
      tooltip: {
        ...tooltipStyle(palette),
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: palette.border } },
        formatter: (
          params: {
            axisValue?: string;
            seriesName?: string;
            value?: number | null;
          }[],
        ) => {
          const rows = params
            .filter(
              (item) =>
                item.value !== null &&
                item.value !== undefined &&
                Number.isFinite(item.value),
            )
            .map(
              (item) =>
                `${escapeMarkup(item.seriesName)}${
                  item.seriesName === "Run-rate projection" ? " (estimate)" : ""
                }: ${formatMoney(String(item.value), data.currency)}`,
            );
          return `<strong>${escapeMarkup(
            formatBucketLabel(String(params[0]?.axisValue ?? "")),
          )}</strong>${rows.length ? `<br/>${rows.join("<br/>")}` : ""}`;
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          formatter: (value: string) => formatBucketLabel(value),
        },
        axisLine: { lineStyle: { color: palette.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          formatter: (value: number) => compactMoney(value, data.currency),
        },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: [
        {
          name: "Recorded net",
          type: "line",
          data: historyData,
          smooth: 0.18,
          symbol: "circle",
          symbolSize: 4,
          connectNulls: false,
          lineStyle: { color: palette.violet, width: 2.2 },
          itemStyle: { color: palette.violet },
          areaStyle: { color: palette.violet, opacity: 0.12 },
        },
        {
          name: "Run-rate projection",
          type: "line",
          data: projectionData,
          smooth: 0.18,
          symbol: "circle",
          symbolSize: 3,
          connectNulls: false,
          lineStyle: {
            color: palette.gold,
            width: 2,
            type: "dashed",
          },
          itemStyle: { color: palette.gold },
          markLine: {
            silent: true,
            symbol: "none",
            label: { show: false },
            lineStyle: { color: palette.muted, type: "dotted", opacity: 0.6 },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    };
  }, [data.currency, forecast, palette, reduced]);

  const summary = forecast.canRender
    ? `The latest ${forecast.windowBuckets} recorded buckets average ${formatMoney(
        forecast.meanNet,
        data.currency,
      )} net per bucket. ${forecast.assumptions}`
    : forecast.assumptions;

  if (!forecast.canRender) {
    return (
      <Panel
        title="Run-rate cash-flow projection"
        description="A clearly labelled estimate, never mixed into the recorded series."
        summary={summary}
      >
        <EmptyChart title="Not enough history" body={forecast.assumptions} />
      </Panel>
    );
  }

  return (
    <Panel
      title="Run-rate cash-flow projection"
      description="The dashed section is an estimate based on recent recorded net cash flow. It is not a statistical forecast."
      summary={summary}
    >
      <EChart
        option={option}
        ariaLabel="Line chart of recorded net cash flow and a dashed run-rate projection"
        height={340}
      />
    </Panel>
  );
}

export function AdvancedAnalytics({ data }: { data: AdvancedAnalyticsData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("allocation");
  const tabRefs = useRef(new Map<TabKey, HTMLButtonElement>());
  const palette = useChartPalette();
  const reduced = useReducedMotion();

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const key = TABS[next]?.key;
    if (!key) return;
    setActiveTab(key);
    tabRefs.current.get(key)?.focus();
  }

  return (
    <section className="advanced-analytics" aria-labelledby="advanced-title">
      <div className="advanced-analytics-head">
        <div>
          <p className="eyebrow">DEEPER VIEWS</p>
          <h2 id="advanced-title">Follow the money</h2>
          <p>
            Flows, concentration, period shape, and a labelled projection. Every
            chart reads the same profile-scoped totals as the summary above.
          </p>
        </div>
        <span className="advanced-engine-note">Apache ECharts · SVG</span>
      </div>

      <div
        className="advanced-tabs"
        role="tablist"
        aria-label="Advanced analytics views"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.key, node);
              else tabRefs.current.delete(tab.key);
            }}
            type="button"
            id={`advanced-tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls="advanced-panel"
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`advanced-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={onTabKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="advanced-panel"
        role="tabpanel"
        aria-labelledby={`advanced-tab-${activeTab}`}
        tabIndex={0}
        className="advanced-tab-panel"
      >
        {!palette ? (
          <div className="chart-skeleton wide" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : activeTab === "allocation" ? (
          <SankeyView data={data} palette={palette} reduced={reduced} />
        ) : activeTab === "categories" ? (
          <TreemapView
            key={`${data.period.from}-${data.period.to}`}
            data={data}
            palette={palette}
            reduced={reduced}
          />
        ) : activeTab === "merchants" ? (
          <MerchantView data={data} palette={palette} reduced={reduced} />
        ) : activeTab === "rhythm" ? (
          <RhythmView data={data} palette={palette} reduced={reduced} />
        ) : activeTab === "compare" ? (
          <RadarView data={data} palette={palette} reduced={reduced} />
        ) : (
          <ForecastView data={data} palette={palette} reduced={reduced} />
        )}
      </div>
    </section>
  );
}
