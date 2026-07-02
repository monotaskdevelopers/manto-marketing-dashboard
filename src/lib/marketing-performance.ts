/*
File description:
This file contains shared helpers for the Campaigns and Flows performance pages. It summarizes Klaviyo
campaign or flow rows, compares the later half of the selected date range against the earlier half, and
formats report labels so both pages use the same production-safe calculation rules.
*/

import { safeRate } from "@/lib/format";
import type { RankedCampaign, RankedFlow } from "@/lib/types";

export type KlaviyoPerformanceRow = RankedCampaign | RankedFlow;

export type KlaviyoPerformanceMetricKey =
  | "openRate"
  | "clickRate"
  | "conversionRate"
  | "revenuePerRecipient";

export type KlaviyoPerformanceSummary = {
  recipients: number;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
};

export type PerformanceTrend = {
  direction: "up" | "down" | "flat";
  tone: "positive" | "negative" | "neutral";
  label: string;
};

export type PerformanceRating = {
  label: "Good" | "Fair";
  tone: "good" | "fair";
};

function getRowDate(row: KlaviyoPerformanceRow) {
  return "send_date" in row ? row.send_date : row.metric_date;
}

function dateOnlyToTime(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function getMetricValue(summary: KlaviyoPerformanceSummary, metric: KlaviyoPerformanceMetricKey) {
  return summary[metric];
}

export function summarizeKlaviyoPerformanceRows(rows: KlaviyoPerformanceRow[]): KlaviyoPerformanceSummary {
  const totals = rows.reduce(
    (runningTotals, row) => ({
      recipients: runningTotals.recipients + row.recipients_count,
      opens: runningTotals.opens + row.opens_count,
      clicks: runningTotals.clicks + row.clicks_count,
      conversions: runningTotals.conversions + row.conversions_count,
      revenue: runningTotals.revenue + row.revenue_amount,
    }),
    {
      recipients: 0,
      opens: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    },
  );

  return {
    ...totals,
    openRate: safeRate(totals.opens, totals.recipients),
    clickRate: safeRate(totals.clicks, totals.recipients),
    conversionRate: safeRate(totals.conversions, totals.recipients),
    revenuePerRecipient: safeRate(totals.revenue, totals.recipients),
  };
}

export function compareKlaviyoPerformanceByDate({
  rows,
  startDate,
  endDate,
  metric,
}: {
  rows: KlaviyoPerformanceRow[];
  startDate: string;
  endDate: string;
  metric: KlaviyoPerformanceMetricKey;
}) {
  const startTime = dateOnlyToTime(startDate);
  const endTime = dateOnlyToTime(endDate);
  const midpoint = startTime + (endTime - startTime) / 2;
  const earlierRows: KlaviyoPerformanceRow[] = [];
  const laterRows: KlaviyoPerformanceRow[] = [];

  rows.forEach((row) => {
    const rowTime = dateOnlyToTime(getRowDate(row));

    // Split the current filtered range in half so the trend chip is based on real report rows.
    if (rowTime <= midpoint) {
      earlierRows.push(row);
      return;
    }

    laterRows.push(row);
  });

  if (!earlierRows.length || !laterRows.length) {
    return null;
  }

  const earlierSummary = summarizeKlaviyoPerformanceRows(earlierRows);
  const laterSummary = summarizeKlaviyoPerformanceRows(laterRows);

  return getMetricValue(laterSummary, metric) - getMetricValue(earlierSummary, metric);
}

export function formatPerformancePercent(value: number) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(2)}%`;
}

export function formatPerformanceCurrency(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateOnlyLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function getPresetLabel(preset: string) {
  if (preset === "today") {
    return "today";
  }

  if (preset === "yesterday") {
    return "yesterday";
  }

  if (preset === "last7") {
    return "last 7 days";
  }

  if (preset === "thisMonth") {
    return "this month";
  }

  if (preset === "lastMonth") {
    return "last month";
  }

  if (preset === "custom") {
    return "custom range";
  }

  return "last 30 days";
}

export function buildTrendLabel({
  delta,
  formatter,
}: {
  delta: number | null;
  formatter: (absoluteValue: number) => string;
}): PerformanceTrend {
  if (delta === null || Math.abs(delta) < 0.000001) {
    return {
      direction: "flat",
      tone: "neutral",
      label: formatter(0),
    };
  }

  return {
    direction: delta > 0 ? "up" : "down",
    tone: delta > 0 ? "positive" : "negative",
    label: `${delta > 0 ? "" : "-"}${formatter(Math.abs(delta))}`,
  };
}

export function getPerformanceRating(metric: KlaviyoPerformanceMetricKey, value: number): PerformanceRating {
  const thresholds: Record<KlaviyoPerformanceMetricKey, number> = {
    openRate: 0.5,
    clickRate: 0.03,
    conversionRate: 0.0005,
    revenuePerRecipient: 0.2,
  };
  const isGood = value >= thresholds[metric];

  return {
    label: isGood ? "Good" : "Fair",
    tone: isGood ? "good" : "fair",
  };
}
