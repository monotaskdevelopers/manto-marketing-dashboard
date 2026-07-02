/*
File description:
This file converts raw reporting rows into dashboard-ready summaries, rankings, and trend points. It keeps
metric calculations in one place so every page uses the same formulas for revenue, AOV, rates, and shares.
*/

import type {
  DashboardData,
  DashboardFilters,
  KlaviyoCampaignReport,
  KlaviyoDailyMetric,
  KlaviyoFlowReport,
  RegionRow,
  RegionalSummary,
  ShopifyDailyMetric,
  SyncRun,
  TrendPoint,
} from "@/lib/types";
import { safeRate } from "@/lib/format";

type DashboardRowInput = {
  filters: DashboardFilters;
  regions: RegionRow[];
  shopifyRows: ShopifyDailyMetric[];
  klaviyoRows: KlaviyoDailyMetric[];
  campaignRows: KlaviyoCampaignReport[];
  flowRows: KlaviyoFlowReport[];
  latestSync: SyncRun | null;
};

function emptySummary(region: RegionRow): RegionalSummary {
  return {
    region,
    shopifyRevenue: 0,
    orders: 0,
    customers: 0,
    refunds: 0,
    cancelledOrders: 0,
    campaignRevenue: 0,
    flowRevenue: 0,
    klaviyoRevenue: 0,
    recipients: 0,
    opens: 0,
    clicks: 0,
    conversions: 0,
  };
}

function isWithinDateRange(date: string, filters: DashboardFilters) {
  return date >= filters.startDate && date <= filters.endDate;
}

function buildSummaryRows(
  regions: RegionRow[],
  shopifyRows: ShopifyDailyMetric[],
  klaviyoRows: KlaviyoDailyMetric[],
) {
  const summaries = new Map<string, RegionalSummary>();

  regions.forEach((region) => {
    summaries.set(region.id, emptySummary(region));
  });

  shopifyRows.forEach((row) => {
    const summary = summaries.get(row.region_id);

    if (!summary) {
      return;
    }

    summary.shopifyRevenue += Number(row.revenue_amount || 0);
    summary.orders += Number(row.orders_count || 0);
    summary.customers += Number(row.customers_count || 0);
    summary.refunds += Number(row.refunds_amount || 0);
    summary.cancelledOrders += Number(row.cancelled_orders_count || 0);
  });

  klaviyoRows.forEach((row) => {
    const summary = summaries.get(row.region_id);

    if (!summary) {
      return;
    }

    summary.campaignRevenue += Number(row.campaign_revenue_amount || 0);
    summary.flowRevenue += Number(row.flow_revenue_amount || 0);
    summary.klaviyoRevenue += Number(row.attributed_revenue_amount || 0);
    summary.recipients += Number(row.recipients_count || 0);
    summary.opens += Number(row.opens_count || 0);
    summary.clicks += Number(row.clicks_count || 0);
    summary.conversions += Number(row.conversions_count || 0);
  });

  return Array.from(summaries.values());
}

function rollUpSummary(regionalSummaries: RegionalSummary[]): RegionalSummary {
  const firstRegion = regionalSummaries[0]?.region || {
    id: "all",
    slug: "all",
    name: "All Regions",
    currency_code: "USD",
    timezone: "UTC",
    shopify_shop_domain: null,
    klaviyo_account_label: null,
    is_active: true,
    created_at: "",
    updated_at: "",
  };

  return regionalSummaries.reduce((total, region) => {
    total.shopifyRevenue += region.shopifyRevenue;
    total.orders += region.orders;
    total.customers += region.customers;
    total.refunds += region.refunds;
    total.cancelledOrders += region.cancelledOrders;
    total.campaignRevenue += region.campaignRevenue;
    total.flowRevenue += region.flowRevenue;
    total.klaviyoRevenue += region.klaviyoRevenue;
    total.recipients += region.recipients;
    total.opens += region.opens;
    total.clicks += region.clicks;
    total.conversions += region.conversions;
    return total;
  }, emptySummary({ ...firstRegion, id: "all", slug: "all", name: "All Regions" }));
}

function buildTrend(
  shopifyRows: ShopifyDailyMetric[],
  klaviyoRows: KlaviyoDailyMetric[],
): TrendPoint[] {
  const trend = new Map<string, TrendPoint>();

  shopifyRows.forEach((row) => {
    const point = trend.get(row.metric_date) || {
      date: row.metric_date,
      shopifyRevenue: 0,
      klaviyoRevenue: 0,
      orders: 0,
    };

    point.shopifyRevenue += Number(row.revenue_amount || 0);
    point.orders += Number(row.orders_count || 0);
    trend.set(row.metric_date, point);
  });

  klaviyoRows.forEach((row) => {
    const point = trend.get(row.metric_date) || {
      date: row.metric_date,
      shopifyRevenue: 0,
      klaviyoRevenue: 0,
      orders: 0,
    };

    point.klaviyoRevenue += Number(row.attributed_revenue_amount || 0);
    trend.set(row.metric_date, point);
  });

  return Array.from(trend.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDashboardDataFromRows(input: DashboardRowInput): DashboardData {
  const selectedRegions =
    input.filters.regionSlug === "all"
      ? input.regions
      : input.regions.filter((region) => region.slug === input.filters.regionSlug);
  const selectedRegionIds = new Set(selectedRegions.map((region) => region.id));

  const shopifyRows = input.shopifyRows.filter(
    (row) => selectedRegionIds.has(row.region_id) && isWithinDateRange(row.metric_date, input.filters),
  );
  const klaviyoRows = input.klaviyoRows.filter(
    (row) => selectedRegionIds.has(row.region_id) && isWithinDateRange(row.metric_date, input.filters),
  );
  const campaignRows = input.campaignRows.filter(
    (row) => selectedRegionIds.has(row.region_id) && isWithinDateRange(row.send_date, input.filters),
  );
  const flowRows = input.flowRows.filter(
    (row) => selectedRegionIds.has(row.region_id) && isWithinDateRange(row.metric_date, input.filters),
  );
  const regionNameById = new Map(input.regions.map((region) => [region.id, region.name]));
  const regionalSummaries = buildSummaryRows(selectedRegions, shopifyRows, klaviyoRows).sort(
    (a, b) => b.shopifyRevenue - a.shopifyRevenue,
  );

  const rankedCampaigns = campaignRows
    .map((row) => ({
      ...row,
      region_name: regionNameById.get(row.region_id) || "Unknown region",
      openRate: safeRate(row.opens_count, row.recipients_count),
      clickRate: safeRate(row.clicks_count, row.recipients_count),
      conversionRate: safeRate(row.conversions_count, row.recipients_count),
      revenuePerRecipient: safeRate(row.revenue_amount, row.recipients_count),
    }))
    .sort((a, b) => b.revenue_amount - a.revenue_amount);

  const rankedFlows = flowRows
    .map((row) => ({
      ...row,
      region_name: regionNameById.get(row.region_id) || "Unknown region",
      openRate: safeRate(row.opens_count, row.recipients_count),
      clickRate: safeRate(row.clicks_count, row.recipients_count),
      conversionRate: safeRate(row.conversions_count, row.recipients_count),
      revenuePerRecipient: safeRate(row.revenue_amount, row.recipients_count),
    }))
    .sort((a, b) => b.revenue_amount - a.revenue_amount);

  return {
    filters: input.filters,
    regions: input.regions,
    selectedRegions,
    latestSync: input.latestSync,
    summary: rollUpSummary(regionalSummaries),
    regionalSummaries,
    trend: buildTrend(shopifyRows, klaviyoRows),
    topCampaigns: rankedCampaigns.slice(0, 5),
    topFlows: rankedFlows.slice(0, 5),
    campaignRows: rankedCampaigns,
    flowRows: rankedFlows,
  };
}
