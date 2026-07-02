/*
File description:
This file contains server-side helper logic for Klaviyo report drill-down pages. It parses URL-driven
table filters, builds shareable report links, filters rows without exposing client-side secrets, and keeps
campaign and flow sorting rules consistent across pages.
*/

import type { RawSearchParams } from "@/lib/filters";
import { safeRate } from "@/lib/format";
import type { DashboardFilters, RankedCampaign, RankedFlow } from "@/lib/types";

export type KlaviyoReportRow = RankedCampaign | RankedFlow;

export type KlaviyoSortKey =
  | "revenue_desc"
  | "revenue_asc"
  | "recipients_desc"
  | "open_desc"
  | "click_desc"
  | "conversion_desc"
  | "date_desc"
  | "date_asc"
  | "name_asc";

export type KlaviyoEngagementFilter =
  | "all"
  | "has_conversions"
  | "low_click_rate"
  | "low_conversion_rate"
  | "high_revenue_density";

export type KlaviyoTableFilters = {
  query: string;
  minRevenue: number;
  engagement: KlaviyoEngagementFilter;
  sort: KlaviyoSortKey;
};

export const klaviyoSortOptions: { value: KlaviyoSortKey; label: string }[] = [
  { value: "revenue_desc", label: "Revenue high to low" },
  { value: "revenue_asc", label: "Revenue low to high" },
  { value: "recipients_desc", label: "Recipients high to low" },
  { value: "open_desc", label: "Open rate high to low" },
  { value: "click_desc", label: "Click rate high to low" },
  { value: "conversion_desc", label: "Conversion rate high to low" },
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name A to Z" },
];

export const klaviyoEngagementOptions: { value: KlaviyoEngagementFilter; label: string }[] = [
  { value: "all", label: "All engagement" },
  { value: "has_conversions", label: "Has conversions" },
  { value: "low_click_rate", label: "Low click rate" },
  { value: "low_conversion_rate", label: "Low conversion rate" },
  { value: "high_revenue_density", label: "High revenue density" },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isKlaviyoSortKey(value: string): value is KlaviyoSortKey {
  return klaviyoSortOptions.some((option) => option.value === value);
}

function isKlaviyoEngagementFilter(value: string): value is KlaviyoEngagementFilter {
  return klaviyoEngagementOptions.some((option) => option.value === value);
}

function getRowName(row: KlaviyoReportRow) {
  return "campaign_name" in row ? row.campaign_name : row.flow_name;
}

function getRowDate(row: KlaviyoReportRow) {
  return "send_date" in row ? row.send_date : row.metric_date;
}

function isCampaignRow(row: KlaviyoReportRow): row is RankedCampaign {
  return "delivered_count" in row;
}

function getEngagementDenominator(row: KlaviyoReportRow) {
  return isCampaignRow(row) ? row.delivered_count || row.recipients_count : row.recipients_count;
}

function getOpenRecipientCount(row: KlaviyoReportRow) {
  return isCampaignRow(row) ? row.opens_unique_count || row.opens_count : row.opens_count;
}

function getClickRecipientCount(row: KlaviyoReportRow) {
  return isCampaignRow(row) ? row.clicks_unique_count || row.clicks_count : row.clicks_count;
}

function getConversionRecipientCount(row: KlaviyoReportRow) {
  return isCampaignRow(row) ? row.conversions_unique_count || row.conversions_count : row.conversions_count;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareRows(left: KlaviyoReportRow, right: KlaviyoReportRow, sort: KlaviyoSortKey) {
  if (sort === "revenue_asc") {
    return left.revenue_amount - right.revenue_amount || compareText(getRowName(left), getRowName(right));
  }

  if (sort === "recipients_desc") {
    return right.recipients_count - left.recipients_count || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "open_desc") {
    return right.openRate - left.openRate || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "click_desc") {
    return right.clickRate - left.clickRate || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "conversion_desc") {
    return right.conversionRate - left.conversionRate || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "date_desc") {
    return getRowDate(right).localeCompare(getRowDate(left)) || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "date_asc") {
    return getRowDate(left).localeCompare(getRowDate(right)) || right.revenue_amount - left.revenue_amount;
  }

  if (sort === "name_asc") {
    return compareText(getRowName(left), getRowName(right)) || right.revenue_amount - left.revenue_amount;
  }

  return right.revenue_amount - left.revenue_amount || compareText(getRowName(left), getRowName(right));
}

function matchesEngagementFilter(row: KlaviyoReportRow, filter: KlaviyoEngagementFilter) {
  if (filter === "has_conversions") {
    return row.conversions_count > 0;
  }

  if (filter === "low_click_rate") {
    return row.recipients_count > 0 && row.clickRate < 0.02;
  }

  if (filter === "low_conversion_rate") {
    return row.recipients_count > 0 && row.conversionRate < 0.005;
  }

  if (filter === "high_revenue_density") {
    return row.revenuePerRecipient >= 0.2;
  }

  return true;
}

export function parseKlaviyoTableFilters(searchParams: RawSearchParams): KlaviyoTableFilters {
  const requestedSort = firstValue(searchParams.sort) || "";
  const requestedEngagement = firstValue(searchParams.engagement) || "";
  const requestedMinRevenue = Number(firstValue(searchParams.minRevenue) || 0);

  return {
    // Keep the query short enough for stable URLs and predictable table controls.
    query: (firstValue(searchParams.q) || "").trim().slice(0, 80),
    minRevenue: Number.isFinite(requestedMinRevenue) ? Math.max(0, requestedMinRevenue) : 0,
    engagement: isKlaviyoEngagementFilter(requestedEngagement) ? requestedEngagement : "all",
    sort: isKlaviyoSortKey(requestedSort) ? requestedSort : "revenue_desc",
  };
}

export function filterAndSortKlaviyoRows<T extends KlaviyoReportRow>(rows: T[], filters: KlaviyoTableFilters) {
  const normalizedQuery = filters.query.toLowerCase();

  return rows
    .filter((row) => {
      const haystack = `${getRowName(row)} ${row.region_name}`.toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        row.revenue_amount >= filters.minRevenue &&
        matchesEngagementFilter(row, filters.engagement)
      );
    })
    .sort((left, right) => compareRows(left, right, filters.sort)) as T[];
}

export function summarizeKlaviyoRows(rows: KlaviyoReportRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.revenue += row.revenue_amount;
      summary.recipients += getEngagementDenominator(row);
      summary.opens += getOpenRecipientCount(row);
      summary.clicks += getClickRecipientCount(row);
      summary.conversions += getConversionRecipientCount(row);
      return summary;
    },
    {
      revenue: 0,
      recipients: 0,
      opens: 0,
      clicks: 0,
      conversions: 0,
    },
  );
}

export function buildDashboardQuery(filters: DashboardFilters, extra?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams({
    preset: filters.preset,
    start: filters.startDate,
    end: filters.endDate,
    region: filters.regionSlug,
  });

  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function buildDashboardHref(
  path: string,
  filters: DashboardFilters,
  extra?: Record<string, string | number | undefined>,
) {
  return `${path}?${buildDashboardQuery(filters, extra)}`;
}

export function calculateKlaviyoRowRates(summary: ReturnType<typeof summarizeKlaviyoRows>) {
  return {
    openRate: safeRate(summary.opens, summary.recipients),
    clickRate: safeRate(summary.clicks, summary.recipients),
    conversionRate: safeRate(summary.conversions, summary.recipients),
    revenuePerRecipient: safeRate(summary.revenue, summary.recipients),
  };
}
