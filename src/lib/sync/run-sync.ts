/*
File description:
This file orchestrates platform sync runs. It writes Shopify reporting rows, writes the current narrow
Klaviyo campaign metadata and performance scope, records sync history, prevents overlapping jobs, and keeps
logs sanitized for debugging.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import { getRegionConfigs } from "@/lib/config/regions";
import { fetchKlaviyoSyncRows } from "@/lib/integrations/klaviyo-sync";
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

function addDaysToDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
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

function datesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDaysToDateString(currentDate, 1);
  }

  return dates;
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
  batchSize?: number;
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

  const batchSize = Math.max(1, params.batchSize || 500);

  for (let index = 0; index < params.rows.length; index += batchSize) {
    const batch = params.rows.slice(index, index + batchSize);
    const { error } = await admin
      .from(params.table)
      .upsert(batch, { onConflict: params.conflictTarget });

    if (error) {
      const summary = summarizeDatabaseError(error);
      console.warn(
        `[sync:db] Failed to upsert ${params.table} for region ${params.regionSlug} in run ${params.syncRunId}. ${summary}`,
      );
      throw new Error(`Unable to write ${params.table} rows for region ${params.regionSlug}. ${summary}`);
    }
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

function hasAnySyncCredentials(region: RegionIntegrationConfig) {
  return hasShopifyCredentials(region) || hasKlaviyoCredentials(region);
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

async function getKlaviyoCampaignReportDatesToFetch(params: {
  regionId: string;
  regionSlug: string;
  syncRunId: string;
  startDate: string;
  endDate: string;
}) {
  const admin = getSupabaseAdmin();
  const requestedDates = datesInRange(params.startDate, params.endDate);
  const existingDates = new Set<string>();
  const pageSize = 1000;
  let rangeStart = 0;

  // Supabase responses are paged. Read all matching report rows so large campaign libraries do not make the
  // planner think an already-synced date is missing just because it was beyond the first response page.
  while (true) {
    const { data, error } = await admin
      .from("klaviyo_campaign_reports")
      .select("send_date")
      .eq("region_id", params.regionId)
      .gte("send_date", params.startDate)
      .lte("send_date", params.endDate)
      .order("send_date", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) {
      const summary = summarizeDatabaseError(error);
      throw new Error(`Unable to inspect existing Klaviyo campaign report dates for region ${params.regionSlug}. ${summary}`);
    }

    ((data || []) as Array<{ send_date: string | null }>).forEach((row) => {
      if (row.send_date) {
        existingDates.add(row.send_date);
      }
    });

    if (!data || data.length < pageSize) {
      break;
    }

    rangeStart += pageSize;
  }

  // Existing daily report rows prove that a historical date was already ingested. The current end date is
  // always refreshed because same-day campaign numbers can still move before the day fully settles.
  const datesToFetch = requestedDates.filter((date) => date === params.endDate || !existingDates.has(date));
  const skippedDateCount = requestedDates.length - datesToFetch.length;

  console.info(
    `[sync:klaviyo] Campaign performance date plan for region ${params.regionSlug} in run ${params.syncRunId}: requested=${requestedDates.length}, existing=${existingDates.size}, skipped=${skippedDateCount}, fetch=${datesToFetch.length}, forcedRefreshDate=${params.endDate}.`,
  );

  return datesToFetch;
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
      const campaignReportDates = await getKlaviyoCampaignReportDatesToFetch({
        regionId: params.regionId,
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
      const klaviyoRows = await fetchKlaviyoSyncRows({
        region: params.region,
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        startDate: params.startDate,
        endDate: params.endDate,
        campaignReportDates,
      });

      // Current Klaviyo scope is deliberately narrow: campaigns, campaign performance, campaign audiences,
      // campaign tags, and campaign status. Do not add broader Klaviyo writes here without updating the
      // product scope first.
      await upsertSyncRows({
        table: "klaviyo_tags",
        rows: klaviyoRows.tagRows,
        conflictTarget: "region_id,tag_id",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });
      await upsertSyncRows({
        table: "klaviyo_tag_relationships",
        rows: klaviyoRows.tagRelationshipRows,
        conflictTarget: "region_id,tag_id,target_type,target_id",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });
      await upsertSyncRows({
        table: "klaviyo_campaigns",
        rows: klaviyoRows.campaignRows,
        conflictTarget: "region_id,campaign_id",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });
      await upsertSyncRows({
        table: "klaviyo_campaign_reports",
        rows: klaviyoRows.campaignReportRows,
        conflictTarget: "region_id,campaign_id,send_date",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });
      await upsertSyncRows({
        table: "klaviyo_campaign_audiences",
        rows: klaviyoRows.campaignAudienceRows,
        conflictTarget: "region_id,campaign_id,campaign_message_id,relationship_name,audience_type,audience_id",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
      });
      await upsertSyncRows({
        table: "klaviyo_raw_resources",
        rows: klaviyoRows.rawResourceRows,
        conflictTarget: "region_id,resource_family,resource_type,resource_id",
        regionSlug: params.region.slug,
        syncRunId: params.syncRunId,
        batchSize: 200,
      });

      syncedPlatforms.push("Klaviyo");

      if (klaviyoRows.warnings.length) {
        platformErrors.push(`Klaviyo warnings: ${klaviyoRows.warnings.join("; ")}`);
        console.warn(
          `[sync:klaviyo] Region ${params.region.slug} completed with ${klaviyoRows.warnings.length} warning(s) in run ${params.syncRunId}. ${klaviyoRows.warnings.join("; ")}`,
        );
      }
    } catch (error) {
      const summary = sanitizeError(error);

      platformErrors.push(`Klaviyo: ${summary}`);
      console.warn(`[sync] Klaviyo failed for region ${params.region.slug} in run ${params.syncRunId}. ${summary}`);
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

  const allConfigs = await getRegionConfigs();
  const configs = allConfigs.filter(hasAnySyncCredentials);

  if (!configs.length) {
    return {
      syncRunId: "not-started",
      status: "failed",
      message: "No active regions have encrypted Shopify or Klaviyo credentials saved. Connect a platform from Settings before running sync.",
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
