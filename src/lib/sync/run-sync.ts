/*
File description:
This file orchestrates Shopify and Klaviyo sync runs. It records sync history, prevents overlapping jobs,
fetches each configured region, writes normalized rows to Supabase, and keeps logs sanitized for debugging.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import { getRegionConfigs } from "@/lib/config/regions";
import {
  fetchKlaviyoCampaignReports,
  fetchKlaviyoFlowReports,
  type KlaviyoCampaignSyncRow,
  type KlaviyoFlowSyncRow,
} from "@/lib/integrations/klaviyo";
import { fetchShopifyDailyMetrics } from "@/lib/integrations/shopify";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { RegionIntegrationConfig, SyncRunResult, SyncStatus, SyncTrigger } from "@/lib/types";

type RunSyncOptions = {
  triggeredBy: SyncTrigger;
  rangeDays?: number;
  userId?: string;
};

type RegionRecord = {
  id: string;
  slug: string;
};

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function getSyncWindow(rangeDays = 30) {
  const safeRangeDays = Math.min(Math.max(rangeDays, 1), 90);
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return {
    startDate: toDateOnly(addDays(end, -(safeRangeDays - 1))),
    endDate: toDateOnly(end),
  };
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown sync error.";

  return message
    .replace(/Klaviyo-API-Key\s+[^\s,"']+/gi, "Klaviyo-API-Key [redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/shpat_[A-Za-z0-9_-]+/g, "[redacted-shopify-token]")
    .replace(/pk_[A-Za-z0-9_-]+/g, "[redacted-klaviyo-key]")
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[redacted-supabase-secret]")
    .slice(0, 900);
}

function readErrorProperty(error: unknown, key: "code" | "message" | "details" | "hint") {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? sanitizeError(value) : "";
}

function summarizeDatabaseError(error: unknown) {
  const parts = [
    ["code", readErrorProperty(error, "code")],
    ["message", readErrorProperty(error, "message")],
    ["details", readErrorProperty(error, "details")],
    ["hint", readErrorProperty(error, "hint")],
  ].filter(([, value]) => value);

  if (!parts.length) {
    return sanitizeError(error);
  }

  return parts.map(([label, value]) => `${label}=${value}`).join("; ").slice(0, 900);
}

async function upsertSyncRows(params: {
  table: string;
  rows: Record<string, unknown>[];
  conflictTarget: string;
  regionSlug: string;
  syncRunId: string;
}) {
  if (!params.rows.length) {
    console.info(
      `[sync:db] Skipping ${params.table} upsert for region ${params.regionSlug} in run ${params.syncRunId}; no rows.`,
    );
    return;
  }

  const admin = getSupabaseAdmin();

  console.info(
    `[sync:db] Upserting ${params.rows.length} ${params.table} row(s) for region ${params.regionSlug} in run ${params.syncRunId} using ${params.conflictTarget}.`,
  );

  const { error } = await admin
    .from(params.table)
    .upsert(params.rows, { onConflict: params.conflictTarget });

  if (error) {
    const summary = summarizeDatabaseError(error);
    console.warn(
      `[sync:db] Failed to upsert ${params.table} for region ${params.regionSlug} in run ${params.syncRunId}. ${summary}`,
    );
    throw new Error(`Unable to write ${params.table} rows for region ${params.regionSlug}. ${summary}`);
  }

  console.info(
    `[sync:db] Upserted ${params.rows.length} ${params.table} row(s) for region ${params.regionSlug} in run ${params.syncRunId}.`,
  );
}

function hasShopifyCredentials(region: RegionIntegrationConfig): region is RegionIntegrationConfig & {
  shopifyShopDomain: string;
  shopifyAdminAccessToken: string;
} {
  return Boolean(region.shopifyShopDomain && region.shopifyAdminAccessToken);
}

function hasKlaviyoCredentials(region: RegionIntegrationConfig): region is RegionIntegrationConfig & {
  klaviyoPrivateKey: string;
} {
  return Boolean(region.klaviyoPrivateKey);
}

function aggregateKlaviyoDaily(params: {
  region: RegionIntegrationConfig;
  campaigns: KlaviyoCampaignSyncRow[];
  flows: KlaviyoFlowSyncRow[];
}) {
  const daily = new Map<
    string,
    {
      metric_date: string;
      campaign_revenue_amount: number;
      flow_revenue_amount: number;
      attributed_revenue_amount: number;
      recipients_count: number;
      opens_count: number;
      clicks_count: number;
      conversions_count: number;
      unsubscribes_count: number;
      bounces_count: number;
      spam_complaints_count: number;
      currency_code: string;
    }
  >();

  function getDay(date: string) {
    const existing = daily.get(date);

    if (existing) {
      return existing;
    }

    const next = {
      metric_date: date,
      campaign_revenue_amount: 0,
      flow_revenue_amount: 0,
      attributed_revenue_amount: 0,
      recipients_count: 0,
      opens_count: 0,
      clicks_count: 0,
      conversions_count: 0,
      unsubscribes_count: 0,
      bounces_count: 0,
      spam_complaints_count: 0,
      currency_code: params.region.currencyCode,
    };

    daily.set(date, next);
    return next;
  }

  params.campaigns.forEach((row) => {
    const day = getDay(row.send_date);
    day.campaign_revenue_amount += row.revenue_amount;
    day.attributed_revenue_amount += row.revenue_amount;
    day.recipients_count += row.recipients_count;
    day.opens_count += row.opens_count;
    day.clicks_count += row.clicks_count;
    day.conversions_count += row.conversions_count;
  });

  params.flows.forEach((row) => {
    const day = getDay(row.metric_date);
    day.flow_revenue_amount += row.revenue_amount;
    day.attributed_revenue_amount += row.revenue_amount;
    day.recipients_count += row.recipients_count;
    day.opens_count += row.opens_count;
    day.clicks_count += row.clicks_count;
    day.conversions_count += row.conversions_count;
  });

  return Array.from(daily.values());
}

async function findRunningSync() {
  const admin = getSupabaseAdmin();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("sync_runs")
    .select("id,status")
    .eq("status", "running")
    .gte("started_at", oneHourAgo)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { id: string; status: SyncStatus } | null;
}

async function createSyncRun(triggeredBy: SyncTrigger, regionCount: number, userId?: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sync_runs")
    .insert({
      triggered_by: triggeredBy,
      status: "running",
      region_count: regionCount,
      message: userId ? `Manual sync requested by authenticated user ${userId}.` : "Sync started.",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Unable to create sync run.");
  }

  return data.id as string;
}

async function finishSyncRun(params: {
  syncRunId: string;
  status: SyncStatus;
  message: string;
  errorDetails?: string | null;
}) {
  const admin = getSupabaseAdmin();
  await admin
    .from("sync_runs")
    .update({
      status: params.status,
      finished_at: new Date().toISOString(),
      message: params.message,
      error_details: params.errorDetails || null,
    })
    .eq("id", params.syncRunId);
}

async function upsertRegions(configs: RegionIntegrationConfig[]) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload = configs.map((region) => ({
    slug: region.slug,
    name: region.name,
    currency_code: region.currencyCode,
    timezone: region.timezone,
    shopify_shop_domain: region.shopifyShopDomain || null,
    klaviyo_account_label: region.klaviyoAccountLabel || region.name,
    is_active: true,
    updated_at: now,
  }));

  const { data, error } = await admin.from("regions").upsert(payload, { onConflict: "slug" }).select("id,slug");

  if (error || !data) {
    throw new Error("Unable to upsert regions.");
  }

  return new Map((data as RegionRecord[]).map((region) => [region.slug, region.id]));
}

async function syncRegion(params: {
  syncRunId: string;
  region: RegionIntegrationConfig;
  regionId: string;
  startDate: string;
  endDate: string;
}): Promise<{ status: "success" | "partial"; errors: string[] }> {
  const now = new Date().toISOString();

  console.info(`[sync] Region ${params.region.slug} started for run ${params.syncRunId}.`);

  const syncedPlatforms: string[] = [];
  const platformErrors: string[] = [];

  // Each platform is optional; a Klaviyo-only connection should not fail because Shopify is absent.
  if (hasShopifyCredentials(params.region)) {
    try {
      const shopifyRows = await fetchShopifyDailyMetrics({
        region: params.region,
        startDate: params.startDate,
        endDate: params.endDate,
      });

      await upsertSyncRows({
        table: "shopify_daily_metrics",
        rows: shopifyRows.map((row) => ({
          ...row,
          region_id: params.regionId,
          updated_at: now,
        })),
        conflictTarget: "region_id,metric_date",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });

      syncedPlatforms.push("Shopify");
    } catch (error) {
      platformErrors.push(`Shopify: ${sanitizeError(error)}`);
      console.warn(`[sync] Shopify failed for region ${params.region.slug} in run ${params.syncRunId}.`);
    }
  }

  if (hasKlaviyoCredentials(params.region)) {
    try {
      const [campaignRows, flowRows] = await Promise.all([
        fetchKlaviyoCampaignReports({
          region: params.region,
          startDate: params.startDate,
          endDate: params.endDate,
        }),
        fetchKlaviyoFlowReports({
          region: params.region,
          startDate: params.startDate,
          endDate: params.endDate,
        }),
      ]);

      await upsertSyncRows({
        table: "klaviyo_campaign_reports",
        rows: campaignRows.map((row) => ({
          ...row,
          region_id: params.regionId,
          updated_at: now,
        })),
        conflictTarget: "region_id,campaign_id,send_date",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });

      await upsertSyncRows({
        table: "klaviyo_flow_reports",
        rows: flowRows.map((row) => ({
          ...row,
          region_id: params.regionId,
          updated_at: now,
        })),
        conflictTarget: "region_id,flow_id,metric_date",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });

      const dailyRows = aggregateKlaviyoDaily({
        region: params.region,
        campaigns: campaignRows,
        flows: flowRows,
      });

      await upsertSyncRows({
        table: "klaviyo_daily_metrics",
        rows: dailyRows.map((row) => ({
          ...row,
          region_id: params.regionId,
          updated_at: now,
        })),
        conflictTarget: "region_id,metric_date",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });

      syncedPlatforms.push("Klaviyo");
    } catch (error) {
      platformErrors.push(`Klaviyo: ${sanitizeError(error)}`);
      console.warn(`[sync] Klaviyo failed for region ${params.region.slug} in run ${params.syncRunId}.`);
    }
  }

  if (!syncedPlatforms.length) {
    const details = platformErrors.length ? ` ${platformErrors.join("; ")}` : "";
    throw new Error(`No connected platforms synced for region ${params.region.slug}.${details}`);
  }

  console.info(
    `[sync] Region ${params.region.slug} completed for run ${params.syncRunId} (${syncedPlatforms.join(", ")}).`,
  );

  return {
    status: platformErrors.length ? "partial" : "success",
    errors: platformErrors,
  };
}

export async function runSync(options: RunSyncOptions): Promise<SyncRunResult> {
  if (isDemoMode()) {
    return {
      syncRunId: "demo-sync",
      status: "success",
      message: "Demo mode is enabled; live platform sync was skipped.",
    };
  }

  const configs = await getRegionConfigs();

  if (!configs.length) {
    return {
      syncRunId: "not-started",
      status: "failed",
      message: "No active regions have encrypted Shopify or Klaviyo credentials saved. Reconnect a platform from Settings.",
    };
  }

  const runningSync = await findRunningSync();

  if (runningSync) {
    return {
      syncRunId: runningSync.id,
      status: "running",
      message: "A sync is already running.",
    };
  }

  const syncRunId = await createSyncRun(options.triggeredBy, configs.length, options.userId);
  const { startDate, endDate } = getSyncWindow(options.rangeDays);
  let failedRegions = 0;
  let partialRegions = 0;
  const errors: string[] = [];

  console.info(`[sync] Run ${syncRunId} started by ${options.triggeredBy}.`);

  try {
    const regionIdBySlug = await upsertRegions(configs);

    for (const region of configs) {
      const regionId = regionIdBySlug.get(region.slug);

      if (!regionId) {
        failedRegions += 1;
        errors.push(`Missing database region ID for ${region.slug}.`);
        continue;
      }

      try {
        const regionResult = await syncRegion({
          syncRunId,
          region,
          regionId,
          startDate,
          endDate,
        });

        if (regionResult.status === "partial") {
          partialRegions += 1;
          errors.push(`${region.slug}: ${regionResult.errors.join("; ")}`);
          console.warn(`[sync] Region ${region.slug} partially failed for run ${syncRunId}.`);
        }
      } catch (error) {
        failedRegions += 1;
        errors.push(`${region.slug}: ${sanitizeError(error)}`);
        console.warn(`[sync] Region ${region.slug} failed for run ${syncRunId}.`);
      }
    }

    const status: SyncStatus =
      failedRegions === 0 && partialRegions === 0
        ? "success"
        : failedRegions === configs.length
          ? "failed"
          : "partial";
    const message =
      status === "success"
        ? `Sync completed for ${configs.length} regions.`
        : `Sync completed with ${failedRegions} failed region(s) and ${partialRegions} partial region(s).`;

    await finishSyncRun({
      syncRunId,
      status,
      message,
      errorDetails: errors.length ? errors.join("\n") : null,
    });

    console.info(`[sync] Run ${syncRunId} finished with status ${status}.`);

    return {
      syncRunId,
      status,
      message,
    };
  } catch (error) {
    const message = sanitizeError(error);

    await finishSyncRun({
      syncRunId,
      status: "failed",
      message,
      errorDetails: message,
    });

    console.warn(`[sync] Run ${syncRunId} failed.`);

    return {
      syncRunId,
      status: "failed",
      message,
    };
  }
}
