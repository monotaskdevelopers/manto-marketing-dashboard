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

  const [shopifyResult, klaviyoResult, campaignResult, flowResult, latestSync] = await Promise.all([
    shopifyQuery,
    klaviyoQuery,
    campaignQuery,
    flowQuery,
    getLatestSyncRun(),
  ]);

  throwIfError(shopifyResult.error, "Loading Shopify metrics");
  throwIfError(klaviyoResult.error, "Loading Klaviyo metrics");
  throwIfError(campaignResult.error, "Loading campaign reports");
  throwIfError(flowResult.error, "Loading flow reports");

  return buildDashboardDataFromRows({
    filters,
    regions,
    shopifyRows: (shopifyResult.data || []) as ShopifyDailyMetric[],
    klaviyoRows: (klaviyoResult.data || []) as KlaviyoDailyMetric[],
    campaignRows: (campaignResult.data || []) as KlaviyoCampaignReport[],
    flowRows: (flowResult.data || []) as KlaviyoFlowReport[],
    latestSync,
  });
}
