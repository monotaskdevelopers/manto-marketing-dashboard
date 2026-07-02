/*
File description:
This file reads reporting rows from Supabase and returns dashboard-ready data. It switches to documented
demo data only when DEMO_MODE=true, keeping production reads protected by Supabase Auth and RLS.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  DashboardFilters,
  KlaviyoCampaign,
  KlaviyoCampaignReport,
  KlaviyoDailyMetric,
  KlaviyoFlowReport,
  RegionRow,
  ShopifyDailyMetric,
  SyncRun,
} from "@/lib/types";
import { getDemoDashboardData, demoSyncRun } from "@/lib/data/demo-data";
import { buildDashboardDataFromRows } from "@/lib/data/transform";

function throwIfError(error: unknown, label: string) {
  if (error) {
    throw new Error(`${label} failed.`);
  }
}

function campaignMetadataDate(campaign: KlaviyoCampaign) {
  return (
    campaign.send_at ||
    campaign.scheduled_at ||
    campaign.klaviyo_updated_at ||
    campaign.klaviyo_created_at ||
    new Date().toISOString()
  ).slice(0, 10);
}

function campaignMetadataToReportRow({
  campaign,
  currencyCode,
}: {
  campaign: KlaviyoCampaign;
  currencyCode: string;
}): KlaviyoCampaignReport {
  return {
    id: campaign.id,
    region_id: campaign.region_id,
    campaign_id: campaign.campaign_id,
    campaign_name: campaign.name,
    send_date: campaignMetadataDate(campaign),
    recipients_count: 0,
    opens_count: 0,
    clicks_count: 0,
    conversions_count: 0,
    revenue_amount: 0,
    currency_code: currencyCode,
  };
}

export async function getLatestSyncRun(): Promise<SyncRun | null> {
  if (isDemoMode()) {
    return demoSyncRun;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as SyncRun | null) || null;
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  if (isDemoMode()) {
    return getDemoDashboardData(filters);
  }

  const supabase = await createClient();
  const { data: regionsData, error: regionsError } = await supabase
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  throwIfError(regionsError, "Loading regions");

  const regions = (regionsData || []) as RegionRow[];
  const selectedRegions =
    filters.regionSlug === "all"
      ? regions
      : regions.filter((region) => region.slug === filters.regionSlug);
  const regionIds = selectedRegions.map((region) => region.id);

  if (!regionIds.length) {
    return buildDashboardDataFromRows({
      filters,
      regions,
      shopifyRows: [],
      klaviyoRows: [],
      campaignRows: [],
      flowRows: [],
      latestSync: await getLatestSyncRun(),
    });
  }

  const shopifyQuery = supabase
    .from("shopify_daily_metrics")
    .select("*")
    .in("region_id", regionIds)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate);
  const klaviyoQuery = supabase
    .from("klaviyo_daily_metrics")
    .select("*")
    .in("region_id", regionIds)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate);
  const campaignQuery = supabase
    .from("klaviyo_campaign_reports")
    .select("*")
    .in("region_id", regionIds)
    .gte("send_date", filters.startDate)
    .lte("send_date", filters.endDate);
  const flowQuery = supabase
    .from("klaviyo_flow_reports")
    .select("*")
    .in("region_id", regionIds)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate);

  const campaignMetadataQuery = supabase
    .from("klaviyo_campaigns")
    .select("id, region_id, campaign_id, name, status, channel, archived, klaviyo_created_at, klaviyo_updated_at, scheduled_at, send_at, search_text")
    .in("region_id", regionIds);

  const [shopifyResult, klaviyoResult, campaignResult, flowResult, campaignMetadataResult, latestSync] = await Promise.all([
    shopifyQuery,
    klaviyoQuery,
    campaignQuery,
    flowQuery,
    campaignMetadataQuery,
    getLatestSyncRun(),
  ]);

  throwIfError(shopifyResult.error, "Loading Shopify metrics");
  throwIfError(klaviyoResult.error, "Loading Klaviyo metrics");
  throwIfError(campaignResult.error, "Loading campaign reports");
  throwIfError(flowResult.error, "Loading flow reports");
  throwIfError(campaignMetadataResult.error, "Loading campaign metadata fallback");

  const regionCurrencyById = new Map(regions.map((region) => [region.id, region.currency_code]));
  const reportCampaignRows = (campaignResult.data || []) as KlaviyoCampaignReport[];
  const metadataCampaignRows = ((campaignMetadataResult.data || []) as KlaviyoCampaign[])
    .map((campaign) =>
      campaignMetadataToReportRow({
        campaign,
        currencyCode: regionCurrencyById.get(campaign.region_id) || "USD",
      }),
    )
    .filter((campaign) => campaign.send_date >= filters.startDate && campaign.send_date <= filters.endDate);
  const campaignRows = reportCampaignRows.length ? reportCampaignRows : metadataCampaignRows;

  return buildDashboardDataFromRows({
    filters,
    regions,
    shopifyRows: (shopifyResult.data || []) as ShopifyDailyMetric[],
    klaviyoRows: (klaviyoResult.data || []) as KlaviyoDailyMetric[],
    campaignRows,
    flowRows: (flowResult.data || []) as KlaviyoFlowReport[],
    latestSync,
  });
}
