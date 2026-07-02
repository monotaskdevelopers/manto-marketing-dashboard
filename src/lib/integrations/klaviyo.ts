/*
File description:
This file contains the server-only Klaviyo Reporting API integration. It calls campaign and flow report
endpoints, normalizes flexible response shapes into dashboard rows, collapses Klaviyo message-level report
groups to the database's campaign/date and flow/date grain, and avoids logging raw API payloads.
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

type KlaviyoReportType = "campaign-values-report" | "flow-values-report";

const klaviyoReportingStatistics = [
  "recipients",
  "opens",
  "clicks",
  "conversions",
  "conversion_value",
  "unsubscribes",
  "bounced",
  "spam_complaints",
];

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

function parseJsonText(text: string) {
  if (!text.trim()) {
    return {};
  }

  try {
    return asRecord(JSON.parse(text) as unknown);
  } catch {
    return {};
  }
}

function sanitizeLogText(value: string) {
  return value
    .replace(/Klaviyo-API-Key\s+[^\s,"']+/gi, "Klaviyo-API-Key [redacted]")
    .replace(/pk_[A-Za-z0-9_-]+/g, "[redacted-klaviyo-key]")
    .replace(/shpat_[A-Za-z0-9_-]+/g, "[redacted-shopify-token]");
}

function summarizeKlaviyoErrors(payload: KlaviyoJson, fallbackText: string) {
  const errors = asArray(payload.errors)
    .slice(0, 3)
    .map((error) => {
      const record = asRecord(error);
      const source = asRecord(record.source);

      return {
        status: readString(record, ["status"], ""),
        code: readString(record, ["code"], ""),
        title: readString(record, ["title"], ""),
        detail: sanitizeLogText(readString(record, ["detail"], "")).slice(0, 280),
        sourcePointer: readString(source, ["pointer"], ""),
        sourceParameter: readString(source, ["parameter"], ""),
      };
    });

  if (errors.length) {
    return JSON.stringify({ errors });
  }

  return fallbackText.trim()
    ? "Klaviyo returned a non-JSON error body."
    : "Klaviyo returned an empty error body.";
}

function describeReportRequest(body: KlaviyoJson) {
  const data = asRecord(body.data);
  const attributes = asRecord(data.attributes);
  const timeframe = asRecord(attributes.timeframe);

  return {
    reportType: readString(data, ["type"], "unknown-report"),
    start: readString(timeframe, ["start"], "unknown-start"),
    end: readString(timeframe, ["end"], "unknown-end"),
    statistics: asArray(attributes.statistics).filter((item): item is string => typeof item === "string"),
    groupBy: asArray(attributes.group_by).filter((item): item is string => typeof item === "string"),
    hasConversionMetricId: Boolean(readString(attributes, ["conversion_metric_id"], "")),
  };
}

function groupByForReport(reportType: KlaviyoReportType) {
  if (reportType === "campaign-values-report") {
    return ["campaign_id", "campaign_message_id", "campaign_message_name", "send_channel"];
  }

  return ["flow_id", "flow_message_id", "flow_name", "flow_message_name", "send_channel"];
}

async function klaviyoRequest(params: {
  region: KlaviyoRegionConfig;
  path: string;
  body: KlaviyoJson;
}) {
  const revision = getKlaviyoRevision();
  const requestDescription = describeReportRequest(params.body);

  console.info(
    `[sync:klaviyo] Requesting ${params.path} for region ${params.region.slug} using revision ${revision}. ` +
      `Window ${requestDescription.start} to ${requestDescription.end}; ` +
      `stats=${requestDescription.statistics.join(",")}; group_by=${requestDescription.groupBy.join(",")}; ` +
      `conversion_metric_id=${requestDescription.hasConversionMetricId ? "present" : "missing"}.`,
  );

  const response = await fetch(`https://a.klaviyo.com/api/${params.path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${params.region.klaviyoPrivateKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision,
    },
    body: JSON.stringify(params.body),
  });

  const responseText = await response.text();
  const payload = parseJsonText(responseText);

  if (response.status === 429) {
    const summary = summarizeKlaviyoErrors(payload, responseText);
    console.warn(
      `[sync:klaviyo] Rate limited for region ${params.region.slug} on ${params.path}. ${summary}`,
    );
    throw new Error(`Klaviyo rate limit hit for region ${params.region.slug} on ${params.path}. ${summary}`);
  }

  if (!response.ok) {
    const summary = summarizeKlaviyoErrors(payload, responseText);
    console.warn(
      `[sync:klaviyo] Request failed for region ${params.region.slug} on ${params.path}: ${response.status}. ${summary}`,
    );
    throw new Error(
      `Klaviyo request failed for region ${params.region.slug} on ${params.path} with status ${response.status}. ${summary}`,
    );
  }

  console.info(
    `[sync:klaviyo] Request succeeded for region ${params.region.slug} on ${params.path} with ${extractResults(
      payload,
    ).length} result group(s).`,
  );

  return payload;
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
  reportType: KlaviyoReportType;
  startDate: string;
  endDate: string;
  conversionMetricId?: string;
}) {
  const attributes: KlaviyoJson = {
    timeframe: {
      start: `${params.startDate}T00:00:00Z`,
      end: `${params.endDate}T23:59:59Z`,
    },
    group_by: groupByForReport(params.reportType),
    statistics: klaviyoReportingStatistics,
  };

  // Klaviyo's reporting endpoints need the account's revenue metric to calculate conversions and revenue.
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
  const recordAttributes = asRecord(record.attributes);
  const groupings = asRecord(record.groupings);
  const attributes = {
    ...groupings,
    ...recordAttributes,
  };
  const stats = {
    // Keep support for older test fixtures or API variants that flatten statistic values onto attributes.
    ...recordAttributes,
    ...asRecord(record.statistics),
    ...asRecord(record.stats),
    ...asRecord(recordAttributes.statistics),
    ...asRecord(recordAttributes.stats),
  };

  return {
    id: readString(record, ["id"], readString(groupings, ["campaign_id", "flow_id"], "")),
    attributes,
    stats,
  };
}

function mergeCampaignRows(rows: KlaviyoCampaignSyncRow[], regionSlug: string) {
  const merged = new Map<string, KlaviyoCampaignSyncRow>();

  rows.forEach((row) => {
    const key = `${row.campaign_id}:${row.send_date}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...row });
      return;
    }

    // Klaviyo reports can return one row per message or send channel; this app stores one campaign/date row.
    existing.recipients_count += row.recipients_count;
    existing.opens_count += row.opens_count;
    existing.clicks_count += row.clicks_count;
    existing.conversions_count += row.conversions_count;
    existing.revenue_amount += row.revenue_amount;

    if (existing.campaign_name === `Campaign ${existing.campaign_id}` && row.campaign_name) {
      existing.campaign_name = row.campaign_name;
    }
  });

  console.info(
    `[sync:klaviyo] Normalized campaign groups for region ${regionSlug} from ${rows.length} result group(s) to ${merged.size} campaign/date row(s).`,
  );

  return Array.from(merged.values());
}

function mergeFlowRows(rows: KlaviyoFlowSyncRow[], regionSlug: string) {
  const merged = new Map<string, KlaviyoFlowSyncRow>();

  rows.forEach((row) => {
    const key = `${row.flow_id}:${row.metric_date}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...row });
      return;
    }

    // Klaviyo reports can return one row per flow message; this app stores one flow/date row.
    existing.recipients_count += row.recipients_count;
    existing.opens_count += row.opens_count;
    existing.clicks_count += row.clicks_count;
    existing.conversions_count += row.conversions_count;
    existing.revenue_amount += row.revenue_amount;

    if (existing.flow_name === `Flow ${existing.flow_id}` && row.flow_name) {
      existing.flow_name = row.flow_name;
    }
  });

  console.info(
    `[sync:klaviyo] Normalized flow groups for region ${regionSlug} from ${rows.length} result group(s) to ${merged.size} flow/date row(s).`,
  );

  return Array.from(merged.values());
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

  const rawRows = extractResults(payload).map((result, index) => {
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
        ["campaign_name", "campaign_message_name", "campaignName", "name"],
        `Campaign ${campaignId}`,
      ),
      send_date: readString(
        normalized.attributes,
        ["send_date", "sendDate", "scheduled_at", "sent_at", "date", "datetime"],
        params.endDate,
      ).slice(0, 10),
      recipients_count: readNumber(normalized.stats, ["recipients", "delivered", "sent"]),
      opens_count: readNumber(normalized.stats, ["opens", "opens_unique", "unique_opens", "opened"]),
      clicks_count: readNumber(normalized.stats, ["clicks", "clicks_unique", "unique_clicks", "clicked"]),
      conversions_count: readNumber(normalized.stats, [
        "conversions",
        "conversion_uniques",
        "orders",
        "placed_order",
      ]),
      revenue_amount: readNumber(normalized.stats, [
        "conversion_value",
        "revenue",
        "attributed_revenue",
        "value",
      ]),
      currency_code: params.region.currencyCode,
    };
  });
  const rows = mergeCampaignRows(rawRows, params.region.slug);

  console.info(
    `[sync:klaviyo] Completed campaign report sync for region ${params.region.slug} with ${rows.length} database row(s).`,
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

  const rawRows = extractResults(payload).map((result, index) => {
    const normalized = normalizeResult(result);
    const flowId = readString(
      normalized.attributes,
      ["flow_id", "flowId", "id"],
      normalized.id || `flow-${index}`,
    );

    return {
      flow_id: flowId,
      flow_name: readString(
        normalized.attributes,
        ["flow_name", "flow_message_name", "flowName", "name"],
        `Flow ${flowId}`,
      ),
      metric_date: readString(
        normalized.attributes,
        ["date", "metric_date", "updated", "datetime"],
        params.endDate,
      ).slice(0, 10),
      recipients_count: readNumber(normalized.stats, ["recipients", "delivered", "sent"]),
      opens_count: readNumber(normalized.stats, ["opens", "opens_unique", "unique_opens", "opened"]),
      clicks_count: readNumber(normalized.stats, ["clicks", "clicks_unique", "unique_clicks", "clicked"]),
      conversions_count: readNumber(normalized.stats, [
        "conversions",
        "conversion_uniques",
        "orders",
        "placed_order",
      ]),
      revenue_amount: readNumber(normalized.stats, [
        "conversion_value",
        "revenue",
        "attributed_revenue",
        "value",
      ]),
      currency_code: params.region.currencyCode,
    };
  });
  const rows = mergeFlowRows(rawRows, params.region.slug);

  console.info(
    `[sync:klaviyo] Completed flow report sync for region ${params.region.slug} with ${rows.length} database row(s).`,
  );

  return rows;
}
