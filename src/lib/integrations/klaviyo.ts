/*
File description:
This file contains the server-only Klaviyo Reporting API integration. It calls campaign and flow report
endpoints, normalizes flexible response shapes into dashboard rows, and avoids logging raw API payloads.
*/

import "server-only";

import { getKlaviyoRevision } from "@/lib/env";
import type { RegionIntegrationConfig } from "@/lib/types";

type KlaviyoRegionConfig = RegionIntegrationConfig & {
  klaviyoPrivateKey: string;
};

export type KlaviyoCampaignSyncRow = {
  campaign_id: string;
  campaign_name: string;
  send_date: string;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  conversions_count: number;
  revenue_amount: number;
  currency_code: string;
};

export type KlaviyoFlowSyncRow = {
  flow_id: string;
  flow_name: string;
  metric_date: string;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  conversions_count: number;
  revenue_amount: number;
  currency_code: string;
};

type KlaviyoJson = Record<string, unknown>;

type KlaviyoMetricCandidate = {
  id: string;
  name: string;
  integrationName: string;
  integrationCategory: string;
};

function asRecord(value: unknown): KlaviyoJson {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as KlaviyoJson)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(source: KlaviyoJson, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function readNumber(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

async function klaviyoRequest(params: {
  region: KlaviyoRegionConfig;
  path: string;
  body: KlaviyoJson;
}) {
  const response = await fetch(`https://a.klaviyo.com/api/${params.path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${params.region.klaviyoPrivateKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision: getKlaviyoRevision(),
    },
    body: JSON.stringify(params.body),
  });

  if (response.status === 429) {
    console.warn(`[sync:klaviyo] Rate limited for region ${params.region.slug}.`);
    throw new Error(`Klaviyo rate limit hit for region ${params.region.slug}.`);
  }

  if (!response.ok) {
    console.warn(`[sync:klaviyo] Request failed for region ${params.region.slug}: ${response.status}.`);
    throw new Error(`Klaviyo request failed for region ${params.region.slug}.`);
  }

  return (await response.json()) as KlaviyoJson;
}

async function klaviyoGetRequest(params: {
  privateKey: string;
  path: string;
  regionSlug: string;
}) {
  const response = await fetch(`https://a.klaviyo.com/api/${params.path}`, {
    method: "GET",
    headers: {
      Authorization: `Klaviyo-API-Key ${params.privateKey}`,
      Accept: "application/vnd.api+json",
      revision: getKlaviyoRevision(),
    },
  });

  if (response.status === 401 || response.status === 403) {
    console.warn(`[settings:klaviyo] Metrics lookup unauthorized for region ${params.regionSlug}.`);
    throw new Error("Grant metrics:read to the Klaviyo private key so the conversion metric can be detected.");
  }

  if (response.status === 429) {
    console.warn(`[settings:klaviyo] Metrics lookup rate limited for region ${params.regionSlug}.`);
    throw new Error("Klaviyo metric lookup was rate limited. Wait briefly and try again.");
  }

  if (!response.ok) {
    console.warn(`[settings:klaviyo] Metrics lookup failed for region ${params.regionSlug}: ${response.status}.`);
    throw new Error("Unable to fetch Klaviyo metrics for automatic conversion metric detection.");
  }

  return (await response.json()) as KlaviyoJson;
}

function buildReportBody(params: {
  reportType: "campaign-values-report" | "flow-values-report";
  startDate: string;
  endDate: string;
  conversionMetricId?: string;
}) {
  const attributes: KlaviyoJson = {
    timeframe: {
      start: `${params.startDate}T00:00:00Z`,
      end: `${params.endDate}T23:59:59Z`,
    },
    statistics: [
      "recipients",
      "opens",
      "clicks",
      "conversions",
      "conversion_value",
      "unsubscribes",
      "bounces",
      "spam_complaints",
    ],
  };

  // Some Klaviyo accounts require an explicit conversion metric for attributed revenue.
  if (params.conversionMetricId) {
    attributes.conversion_metric_id = params.conversionMetricId;
  }

  return {
    data: {
      type: params.reportType,
      attributes,
    },
  };
}

function extractResults(payload: KlaviyoJson) {
  const data = asRecord(payload.data);
  const attributes = asRecord(data.attributes);
  const nestedResults = asRecord(attributes.results);

  return [
    ...asArray(attributes.results),
    ...asArray(nestedResults.data),
    ...asArray(payload.results),
  ];
}

function normalizeResult(value: unknown) {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const stats = {
    ...asRecord(attributes.statistics),
    ...asRecord(attributes.stats),
    ...attributes,
  };

  return {
    id: readString(record, ["id"], ""),
    attributes,
    stats,
  };
}

function metricFromResponseItem(value: unknown): KlaviyoMetricCandidate | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const integration = asRecord(attributes.integration);
  const id = readString(record, ["id"], "");
  const name = readString(attributes, ["name"], "");

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    integrationName: readString(integration, ["name"], ""),
    integrationCategory: readString(integration, ["category"], ""),
  };
}

function scoreConversionMetric(metric: KlaviyoMetricCandidate) {
  const name = metric.name.toLowerCase();
  const integrationName = metric.integrationName.toLowerCase();
  const integrationCategory = metric.integrationCategory.toLowerCase();
  const integrationText = `${integrationName} ${integrationCategory}`;
  let score = 0;

  // Prefer purchase/order metrics because campaign and flow revenue attribution should use revenue events.
  if (name === "placed order") score += 100;
  if (name === "ordered product") score += 90;
  if (name.includes("placed order")) score += 80;
  if (name.includes("ordered product")) score += 70;
  if (name.includes("purchase")) score += 60;
  if (name.includes("order")) score += 50;
  if (name.includes("checkout")) score += 20;

  if (integrationText.includes("shopify")) score += 25;
  if (integrationText.includes("woocommerce")) score += 20;
  if (integrationText.includes("ecommerce") || integrationText.includes("e-commerce")) score += 15;

  return score;
}

export async function fetchPreferredKlaviyoConversionMetricId(params: {
  privateKey: string;
  regionSlug: string;
}) {
  const metrics: KlaviyoMetricCandidate[] = [];
  let nextPath: string | null = "metrics?fields[metric]=id,name,integration";
  let pageCount = 0;

  while (nextPath && pageCount < 5) {
    const payload = await klaviyoGetRequest({
      privateKey: params.privateKey,
      path: nextPath,
      regionSlug: params.regionSlug,
    });

    metrics.push(
      ...asArray(payload.data).flatMap((item) => {
        const metric = metricFromResponseItem(item);
        return metric ? [metric] : [];
      }),
    );

    const links = asRecord(payload.links);
    const nextLink = readString(links, ["next"], "");

    nextPath = nextLink.startsWith("https://a.klaviyo.com/api/")
      ? nextLink.replace("https://a.klaviyo.com/api/", "")
      : null;
    pageCount += 1;
  }

  const bestMetric = metrics
    .map((metric) => ({ metric, score: scoreConversionMetric(metric) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.metric;

  if (!bestMetric) {
    console.warn(`[settings:klaviyo] No revenue conversion metric detected for region ${params.regionSlug}.`);
    return null;
  }

  console.info(
    `[settings:klaviyo] Detected conversion metric "${bestMetric.name}" for region ${params.regionSlug}.`,
  );

  return bestMetric.id;
}

export async function fetchKlaviyoCampaignReports(params: {
  region: KlaviyoRegionConfig;
  startDate: string;
  endDate: string;
}): Promise<KlaviyoCampaignSyncRow[]> {
  console.info(`[sync:klaviyo] Starting campaign report sync for region ${params.region.slug}.`);

  const payload = await klaviyoRequest({
    region: params.region,
    path: "campaign-values-reports",
    body: buildReportBody({
      reportType: "campaign-values-report",
      startDate: params.startDate,
      endDate: params.endDate,
      conversionMetricId: params.region.klaviyoConversionMetricId,
    }),
  });

  const rows = extractResults(payload).map((result, index) => {
    const normalized = normalizeResult(result);
    const campaignId = readString(
      normalized.attributes,
      ["campaign_id", "campaignId", "id"],
      normalized.id || `campaign-${index}`,
    );

    return {
      campaign_id: campaignId,
      campaign_name: readString(
        normalized.attributes,
        ["campaign_name", "campaignName", "name"],
        `Campaign ${campaignId}`,
      ),
      send_date: readString(
        normalized.attributes,
        ["send_date", "sendDate", "scheduled_at", "sent_at", "date"],
        params.endDate,
      ).slice(0, 10),
      recipients_count: readNumber(normalized.stats, ["recipients", "delivered", "sent"]),
      opens_count: readNumber(normalized.stats, ["opens", "unique_opens", "opened"]),
      clicks_count: readNumber(normalized.stats, ["clicks", "unique_clicks", "clicked"]),
      conversions_count: readNumber(normalized.stats, ["conversions", "orders", "placed_order"]),
      revenue_amount: readNumber(normalized.stats, [
        "conversion_value",
        "revenue",
        "attributed_revenue",
        "value",
      ]),
      currency_code: params.region.currencyCode,
    };
  });

  console.info(
    `[sync:klaviyo] Completed campaign report sync for region ${params.region.slug} with ${rows.length} rows.`,
  );

  return rows;
}

export async function fetchKlaviyoFlowReports(params: {
  region: KlaviyoRegionConfig;
  startDate: string;
  endDate: string;
}): Promise<KlaviyoFlowSyncRow[]> {
  console.info(`[sync:klaviyo] Starting flow report sync for region ${params.region.slug}.`);

  const payload = await klaviyoRequest({
    region: params.region,
    path: "flow-values-reports",
    body: buildReportBody({
      reportType: "flow-values-report",
      startDate: params.startDate,
      endDate: params.endDate,
      conversionMetricId: params.region.klaviyoConversionMetricId,
    }),
  });

  const rows = extractResults(payload).map((result, index) => {
    const normalized = normalizeResult(result);
    const flowId = readString(
      normalized.attributes,
      ["flow_id", "flowId", "id"],
      normalized.id || `flow-${index}`,
    );

    return {
      flow_id: flowId,
      flow_name: readString(normalized.attributes, ["flow_name", "flowName", "name"], `Flow ${flowId}`),
      metric_date: readString(normalized.attributes, ["date", "metric_date", "updated"], params.endDate).slice(
        0,
        10,
      ),
      recipients_count: readNumber(normalized.stats, ["recipients", "delivered", "sent"]),
      opens_count: readNumber(normalized.stats, ["opens", "unique_opens", "opened"]),
      clicks_count: readNumber(normalized.stats, ["clicks", "unique_clicks", "clicked"]),
      conversions_count: readNumber(normalized.stats, ["conversions", "orders", "placed_order"]),
      revenue_amount: readNumber(normalized.stats, [
        "conversion_value",
        "revenue",
        "attributed_revenue",
        "value",
      ]),
      currency_code: params.region.currencyCode,
    };
  });

  console.info(
    `[sync:klaviyo] Completed flow report sync for region ${params.region.slug} with ${rows.length} rows.`,
  );

  return rows;
}
