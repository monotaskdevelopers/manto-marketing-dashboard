/*
File description:
This file contains the narrow server-only Klaviyo campaign sync. It intentionally fetches only campaigns,
campaign performance, campaign audiences, campaign tags, and campaign status because that is the current
product scope. It logs each stage with sanitized endpoint/error context so operators can see exactly where a
sync failed.
*/

import "server-only";

import { getKlaviyoRevision } from "@/lib/env";
import { fetchPreferredKlaviyoConversionMetricId } from "@/lib/integrations/klaviyo";
import type { RegionIntegrationConfig } from "@/lib/types";

type KlaviyoJson = Record<string, unknown>;
type KlaviyoQueryValue = string | number | boolean | string[] | null | undefined;

type KlaviyoResourceObject = {
  id?: string;
  type?: string;
  attributes?: KlaviyoJson;
  relationships?: KlaviyoJson;
};

type KlaviyoCollection = {
  data: KlaviyoResourceObject[];
  included: KlaviyoResourceObject[];
  endpointPath: string;
  pageCount: number;
};

type CampaignTags = {
  tagIds: string[];
  tagResources: KlaviyoResourceObject[];
  endpointPaths: string[];
};

type CampaignAudiences = {
  audienceIds: string[];
  audienceResources: KlaviyoResourceObject[];
  endpointPaths: string[];
};

type KlaviyoReportRow = {
  objectId: string;
  objectName: string;
  metricDate: string;
  recipients: number;
  delivered: number;
  opens: number;
  opensUnique: number;
  openRate: number;
  clicks: number;
  clicksUnique: number;
  clickRate: number;
  conversions: number;
  conversionsUnique: number;
  conversionRate: number;
  revenue: number;
  revenuePerRecipient: number;
  unsubscribes: number;
  bounced: number;
  spamComplaints: number;
};

type KlaviyoSyncRows = {
  campaignReportRows: Record<string, unknown>[];
  tagRows: Record<string, unknown>[];
  tagRelationshipRows: Record<string, unknown>[];
  campaignRows: Record<string, unknown>[];
  campaignAudienceRows: Record<string, unknown>[];
  rawResourceRows: Record<string, unknown>[];
  warnings: string[];
};

type KlaviyoClientParams = {
  privateKey: string;
  regionSlug: string;
};

type KlaviyoCollectionParams = KlaviyoClientParams & {
  path: string;
  query?: Record<string, KlaviyoQueryValue>;
  pageSize?: number | null;
  pageLimit?: number;
  label: string;
  revision?: string;
};

class KlaviyoEndpointError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const campaignPageSize = 100;
const relationshipPageSize = 50;
const standardPageLimit = 50;
const perCampaignConcurrency = 1;
const campaignReportRequestDelayMs = 31_000;
const reportStatistics = [
  "recipients",
  "delivered",
  "opens",
  "opens_unique",
  "open_rate",
  "clicks",
  "clicks_unique",
  "click_rate",
  "conversions",
  "conversion_uniques",
  "conversion_rate",
  "conversion_value",
  "revenue_per_recipient",
  "unsubscribes",
  "unsubscribe_uniques",
  "bounced",
  "spam_complaints",
];

function getKlaviyoBetaRevision() {
  const revision = getKlaviyoRevision();
  return revision.endsWith(".pre") ? revision : `${revision}.pre`;
}

function makeEmptyRows(): KlaviyoSyncRows {
  return {
    campaignReportRows: [],
    tagRows: [],
    tagRelationshipRows: [],
    campaignRows: [],
    campaignAudienceRows: [],
    rawResourceRows: [],
    warnings: [],
  };
}

function asRecord(value: unknown): KlaviyoJson {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as KlaviyoJson) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asResource(value: unknown): KlaviyoResourceObject | null {
  const record = asRecord(value);
  const id = readString(record, ["id"]);
  const type = readString(record, ["type"]);

  if (!id && !type) {
    return null;
  }

  return {
    id,
    type,
    attributes: asRecord(record.attributes),
    relationships: asRecord(record.relationships),
  };
}

function readString(source: KlaviyoJson, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function readBoolean(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function readDate(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

function datesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildSearchText(values: Array<string | null | undefined>) {
  return uniqueStrings(values)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function buildKlaviyoPath(path: string, query: Record<string, KlaviyoQueryValue> = {}) {
  const normalizedPath = path.replace(/^\/?api\//, "").replace(/^\//, "");
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

function normalizeKlaviyoNextPath(nextLink: string) {
  if (!nextLink) {
    return null;
  }

  if (nextLink.startsWith("https://a.klaviyo.com/api/")) {
    return nextLink.replace("https://a.klaviyo.com/api/", "");
  }

  if (nextLink.startsWith("/api/")) {
    return nextLink.replace("/api/", "");
  }

  return nextLink.replace(/^\/?api\//, "").replace(/^\//, "");
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

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeLogText(value: string) {
  return value
    .replace(/Klaviyo-API-Key\s+[^\s,"']+/gi, "Klaviyo-API-Key [redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/pk_[A-Za-z0-9_-]+/g, "[redacted-klaviyo-key]")
    .slice(0, 900);
}

function summarizeKlaviyoErrors(payload: KlaviyoJson, fallbackText: string) {
  const errors = asArray(payload.errors)
    .slice(0, 3)
    .map((error) => {
      const record = asRecord(error);
      const source = asRecord(record.source);

      return {
        status: readString(record, ["status"]),
        code: readString(record, ["code"]),
        title: readString(record, ["title"]),
        detail: sanitizeLogText(readString(record, ["detail"])).slice(0, 280),
        sourcePointer: readString(source, ["pointer"]),
        sourceParameter: readString(source, ["parameter"]),
      };
    });

  if (errors.length) {
    return JSON.stringify({ errors });
  }

  return fallbackText.trim()
    ? "Klaviyo returned a non-JSON error body."
    : "Klaviyo returned an empty error body.";
}

function getKlaviyoRetryDelayMs(response: Response, responseText: string, attempt: number) {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(Math.max(retryAfterSeconds * 1000, 500), 30_000);
  }

  const expectedAvailableMatch = responseText.match(/Expected available in\s+(\d+)\s+seconds?/i);
  const expectedAvailableSeconds = Number(expectedAvailableMatch?.[1]);

  if (Number.isFinite(expectedAvailableSeconds) && expectedAvailableSeconds > 0) {
    return Math.min(Math.max(expectedAvailableSeconds * 1000, 500), 30_000);
  }

  // Fall back to a small increasing delay when Klaviyo does not return a retry hint.
  return Math.min(1000 * attempt, 10_000);
}

async function klaviyoRequest(params: KlaviyoClientParams & {
  path: string;
  label: string;
  method?: "GET" | "POST";
  body?: KlaviyoJson;
  revision?: string;
}) {
  const maxAttempts = 6;
  const revision = params.revision || getKlaviyoRevision();
  const method = params.method || "GET";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`https://a.klaviyo.com/api/${params.path}`, {
      method,
      headers: {
        Authorization: `Klaviyo-API-Key ${params.privateKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        revision,
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (!response.ok) {
      const responseText = await response.text();
      const summary = summarizeKlaviyoErrors(parseJsonText(responseText), responseText);

      if (response.status === 429 && attempt < maxAttempts) {
        const retryDelayMs = getKlaviyoRetryDelayMs(response, responseText, attempt);

        console.warn(
          `[sync:klaviyo] ${params.label} rate limited for region ${params.regionSlug}; retrying attempt ${
            attempt + 1
          }/${maxAttempts} after ${retryDelayMs}ms. ${summary}`,
        );
        await wait(retryDelayMs);
        continue;
      }

      console.warn(
        `[sync:klaviyo] ${params.label} request failed for region ${params.regionSlug}: ${method} ${
          params.path
        } revision=${revision} status=${response.status}. ${summary}`,
      );

      throw new KlaviyoEndpointError(
        `${params.label} failed for region ${params.regionSlug}: ${response.status}. ${summary}`,
        response.status,
      );
    }

    return (await response.json()) as KlaviyoJson;
  }

  throw new Error(`${params.label} failed for region ${params.regionSlug}.`);
}

async function fetchKlaviyoCollection(params: KlaviyoCollectionParams): Promise<KlaviyoCollection> {
  const pageLimit = Math.max(1, params.pageLimit || standardPageLimit);
  const query = { ...(params.query || {}) };

  if (params.pageSize !== null) {
    query["page[size]"] = Math.max(1, params.pageSize || relationshipPageSize);
  }

  const endpointPath = buildKlaviyoPath(params.path, query);
  const data: KlaviyoResourceObject[] = [];
  const included: KlaviyoResourceObject[] = [];
  let nextPath: string | null = endpointPath;
  let pageCount = 0;

  console.info(
    `[sync:klaviyo] Fetching ${params.label.toLowerCase()} for region ${params.regionSlug}: ${endpointPath}.`,
  );

  while (nextPath && pageCount < pageLimit) {
    const payload = await klaviyoRequest({
      privateKey: params.privateKey,
      regionSlug: params.regionSlug,
      path: nextPath,
      label: params.label,
      revision: params.revision,
    });
    const payloadData = payload.data;
    const pageData = Array.isArray(payloadData) ? payloadData : payloadData ? [payloadData] : [];

    data.push(...pageData.flatMap((item) => {
      const resource = asResource(item);
      return resource ? [resource] : [];
    }));
    included.push(
      ...asArray(payload.included).flatMap((item) => {
        const resource = asResource(item);
        return resource ? [resource] : [];
      }),
    );

    nextPath = normalizeKlaviyoNextPath(readString(asRecord(payload.links), ["next"]));
    pageCount += 1;
  }

  if (nextPath) {
    console.warn(
      `[sync:klaviyo] ${params.label} reached ${pageLimit} page(s) for region ${params.regionSlug}; remaining pages were skipped for this bounded sync.`,
    );
  }

  console.info(
    `[sync:klaviyo] ${params.label} fetched ${data.length} resource(s) across ${pageCount} page(s) for region ${params.regionSlug}.`,
  );

  return { data, included, endpointPath, pageCount };
}

async function fetchOptionalCollection(
  rows: KlaviyoSyncRows,
  params: KlaviyoCollectionParams,
  recoverableStatuses = [400, 403, 404, 429],
) {
  try {
    return await fetchKlaviyoCollection(params);
  } catch (error) {
    if (error instanceof KlaviyoEndpointError && recoverableStatuses.includes(error.status)) {
      const warning = `${params.label}: ${sanitizeLogText(error.message)}`;
      rows.warnings.push(warning);
      console.warn(
        `[sync:klaviyo] Continuing without ${params.label.toLowerCase()} for region ${params.regionSlug}. ${warning}`,
      );

      return { data: [], included: [], endpointPath: buildKlaviyoPath(params.path, params.query), pageCount: 0 };
    }

    throw error;
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
) {
  const results: TOutput[] = [];
  let cursor = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length || 1);

  // Per-campaign tag/audience endpoints are useful but numerous. This worker pool keeps the sync
  // progressive while staying below the lower burst limit on campaign tag endpoints.
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];

        if (item === undefined) {
          continue;
        }

        results[index] = await mapper(item, index);
      }
    }),
  );

  return results;
}

function dedupeResources(resources: KlaviyoResourceObject[]) {
  const byKey = new Map<string, KlaviyoResourceObject>();

  resources.forEach((resource) => {
    const key = `${resource.type || "unknown"}:${resource.id || JSON.stringify(resource.attributes || {})}`;

    if (!byKey.has(key)) {
      byKey.set(key, resource);
    }
  });

  return Array.from(byKey.values());
}

function relationshipItems(resource: KlaviyoResourceObject) {
  return Object.entries(resource.relationships || {}).flatMap(([relationshipName, relationship]) => {
    const data = asRecord(relationship).data;
    const records = Array.isArray(data) ? data : data ? [data] : [];

    return records.flatMap((item) => {
      const record = asRecord(item);
      const id = readString(record, ["id"]);
      const type = readString(record, ["type"]);

      return id && type ? [{ relationshipName, id, type }] : [];
    });
  });
}

function relationshipIds(resource: KlaviyoResourceObject, typeMatchers: string[], nameMatchers: string[] = []) {
  return uniqueStrings(
    relationshipItems(resource)
      .filter((item) =>
        typeMatchers.some((matcher) => item.type.toLowerCase().includes(matcher)) ||
        nameMatchers.some((matcher) => item.relationshipName.toLowerCase().includes(matcher)),
      )
      .map((item) => item.id),
  );
}

function hasRelationship(resource: KlaviyoResourceObject, relationshipNames: string[]) {
  const relationships = resource.relationships || {};

  return relationshipNames.some((relationshipName) => Object.prototype.hasOwnProperty.call(relationships, relationshipName));
}

function resourceNameById(resources: KlaviyoResourceObject[]) {
  return new Map(
    resources.flatMap((resource) => {
      const id = resource.id;
      const name = readString(resource.attributes || {}, ["name"]);

      return id ? [[id, name || id] as const] : [];
    }),
  );
}

function getStatisticNumber(statistics: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = statistics[key];

    if (Array.isArray(value)) {
      return value.reduce((total, item) => {
        const numberValue = typeof item === "number" ? item : Number(item);
        return total + (Number.isFinite(numberValue) ? numberValue : 0);
      }, 0);
    }

    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
}

function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizeRate(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function deriveReportRates(row: KlaviyoReportRow) {
  const denominator = row.delivered || row.recipients;

  // Klaviyo campaign-list rates are based on unique recipient actions over delivered recipients. Recompute
  // collapsed rows from those same building blocks so multi-message campaigns do not sum rate percentages.
  row.openRate = row.openRate || safeRatio(row.opensUnique, denominator);
  row.clickRate = row.clickRate || safeRatio(row.clicksUnique, denominator);
  row.conversionRate = row.conversionRate || safeRatio(row.conversionsUnique || row.conversions, denominator);
  row.revenuePerRecipient = row.revenuePerRecipient || safeRatio(row.revenue, denominator);

  return row;
}

function parseReportPayload(params: {
  payload: KlaviyoJson;
  objectIdKeys: string[];
  objectNameById: Map<string, string>;
  metricDate: string;
}) {
  const data = Array.isArray(params.payload.data) ? params.payload.data : [params.payload.data].filter(Boolean);

  return data.flatMap((item): KlaviyoReportRow[] => {
    const resource = asRecord(item);
    const attributes = asRecord(resource.attributes);
    const results = asArray(attributes.results);

    return results.flatMap((result) => {
      const resultRecord = asRecord(result);
      const resultAttributes = asRecord(resultRecord.attributes || resultRecord);
      const groupings = asRecord(resultAttributes.groupings);
      const statistics = asRecord(resultAttributes.statistics);
      const objectId = readString(groupings, params.objectIdKeys);

      if (!objectId) {
        return [];
      }

      return [
        {
          objectId,
          objectName: params.objectNameById.get(objectId) || objectId,
          metricDate: params.metricDate,
          recipients: getStatisticNumber(statistics, ["recipients"]),
          delivered: getStatisticNumber(statistics, ["delivered"]),
          opens: getStatisticNumber(statistics, ["opens"]),
          opensUnique: getStatisticNumber(statistics, ["opens_unique"]),
          openRate: normalizeRate(getStatisticNumber(statistics, ["open_rate"])),
          clicks: getStatisticNumber(statistics, ["clicks"]),
          clicksUnique: getStatisticNumber(statistics, ["clicks_unique"]),
          clickRate: normalizeRate(getStatisticNumber(statistics, ["click_rate"])),
          conversions: getStatisticNumber(statistics, ["conversions"]),
          conversionsUnique: getStatisticNumber(statistics, ["conversion_uniques"]),
          conversionRate: normalizeRate(getStatisticNumber(statistics, ["conversion_rate"])),
          revenue: getStatisticNumber(statistics, ["conversion_value", "revenue", "value"]),
          revenuePerRecipient: normalizeRate(getStatisticNumber(statistics, ["revenue_per_recipient"])),
          unsubscribes: getStatisticNumber(statistics, ["unsubscribes"]),
          bounced: getStatisticNumber(statistics, ["bounced", "bounces"]),
          spamComplaints: getStatisticNumber(statistics, ["spam_complaints", "spam_complaint"]),
        },
      ];
    });
  });
}

async function fetchKlaviyoCampaignValueReportForDay(params: KlaviyoClientParams & {
  metricDate: string;
  conversionMetricId: string;
  objectNameById: Map<string, string>;
}) {
  const nextDate = addDays(params.metricDate, 1);

  console.info(
    `[sync:klaviyo] Fetching daily campaign performance report for region ${params.regionSlug}: ${params.metricDate}.`,
  );

  const payload = await klaviyoRequest({
    privateKey: params.privateKey,
    regionSlug: params.regionSlug,
    method: "POST",
    path: "campaign-values-reports",
    label: "Campaign values report",
    body: {
      data: {
        type: "campaign-values-report",
        attributes: {
          timeframe: {
            start: `${params.metricDate}T00:00:00+00:00`,
            end: `${nextDate}T00:00:00+00:00`,
          },
          conversion_metric_id: params.conversionMetricId,
          statistics: reportStatistics,
          group_by: ["campaign_id", "campaign_message_id", "send_channel"],
        },
      },
    },
  });

  const rows = parseReportPayload({
    payload,
    objectIdKeys: ["campaign_id", "campaign"],
    objectNameById: params.objectNameById,
    metricDate: params.metricDate,
  });

  console.info(
    `[sync:klaviyo] Daily campaign performance report returned ${rows.length} grouped row(s) for region ${params.regionSlug} on ${params.metricDate}.`,
  );

  return rows;
}

async function fetchKlaviyoDailyCampaignValueReports(params: KlaviyoClientParams & {
  startDate: string;
  endDate: string;
  reportDates?: string[];
  conversionMetricId: string;
  objectNameById: Map<string, string>;
  warnings: string[];
}) {
  const dates = Array.from(new Set(params.reportDates || datesInRange(params.startDate, params.endDate)))
    .filter((date) => date >= params.startDate && date <= params.endDate)
    .sort();
  const rows: KlaviyoReportRow[] = [];

  console.info(
    `[sync:klaviyo] Fetching ${dates.length} daily campaign performance report request(s) for region ${params.regionSlug}: ${params.startDate} to ${params.endDate}.`,
  );

  for (let index = 0; index < dates.length; index += 1) {
    const metricDate = dates[index];

    if (index > 0) {
      // Klaviyo campaign values reports are capped at a steady 2 requests/minute, so keep this loop paced
      // instead of creating avoidable 429 retries during larger historical sync windows.
      await wait(campaignReportRequestDelayMs);
    }

    try {
      rows.push(
        ...(await fetchKlaviyoCampaignValueReportForDay({
          privateKey: params.privateKey,
          regionSlug: params.regionSlug,
          metricDate,
          conversionMetricId: params.conversionMetricId,
          objectNameById: params.objectNameById,
        })),
      );
    } catch (error) {
      const warning = `Campaign performance ${metricDate}: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown report error")}`;

      params.warnings.push(warning);
      console.warn(
        `[sync:klaviyo] Continuing without daily campaign performance rows for region ${params.regionSlug} on ${metricDate}. ${warning}`,
      );
    }
  }

  return rows;
}

function collapseReportRows(rows: KlaviyoReportRow[]) {
  const rowsByKey = new Map<string, KlaviyoReportRow>();

  rows.forEach((row) => {
    const key = `${row.objectId}:${row.metricDate}`;
    const existing = rowsByKey.get(key);

    if (!existing) {
      rowsByKey.set(key, { ...row });
      return;
    }

    existing.recipients += row.recipients;
    existing.delivered += row.delivered;
    existing.opens += row.opens;
    existing.opensUnique += row.opensUnique;
    existing.openRate = 0;
    existing.clicks += row.clicks;
    existing.clicksUnique += row.clicksUnique;
    existing.clickRate = 0;
    existing.conversions += row.conversions;
    existing.conversionsUnique += row.conversionsUnique;
    existing.conversionRate = 0;
    existing.revenue += row.revenue;
    existing.revenuePerRecipient = 0;
    existing.unsubscribes += row.unsubscribes;
    existing.bounced += row.bounced;
    existing.spamComplaints += row.spamComplaints;
  });

  return Array.from(rowsByKey.values()).map(deriveReportRates);
}

function inferCampaignChannels(campaign: KlaviyoResourceObject) {
  const attributes = campaign.attributes || {};
  const relationshipText = relationshipItems(campaign)
    .map((item) => `${item.relationshipName} ${item.type}`)
    .join(" ")
    .toLowerCase();
  const channel = readString(attributes, ["channel", "message_channel", "send_channel"]);

  return uniqueStrings([
    channel,
    relationshipText.includes("sms") ? "sms" : "",
    relationshipText.includes("mobile_push") || relationshipText.includes("push") ? "mobile_push" : "",
    relationshipText.includes("email") ? "email" : "",
  ]);
}

async function resolveConversionMetricId(rows: KlaviyoSyncRows, params: {
  privateKey: string;
  regionSlug: string;
  configuredMetricId?: string;
}) {
  if (params.configuredMetricId) {
    return params.configuredMetricId;
  }

  try {
    const detectedMetricId = await fetchPreferredKlaviyoConversionMetricId({
      privateKey: params.privateKey,
      regionSlug: params.regionSlug,
    });

    if (detectedMetricId) {
      return detectedMetricId;
    }
  } catch (error) {
    rows.warnings.push(
      `Campaign performance metric detection: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown metric lookup error")}`,
    );
  }

  rows.warnings.push(
    "Campaign performance rows were skipped because no Klaviyo conversion metric ID is configured or detectable.",
  );
  return null;
}

function campaignToRow(params: {
  regionId: string;
  syncRunId: string;
  campaign: KlaviyoResourceObject;
  tagIds: string[];
  audienceIds: string[];
}) {
  const attributes = params.campaign.attributes || {};
  const channels = inferCampaignChannels(params.campaign);
  const name = readString(attributes, ["name"], params.campaign.id || "Untitled campaign");

  return {
    region_id: params.regionId,
    campaign_id: params.campaign.id || "",
    name,
    status: readString(attributes, ["status"]) || null,
    channel: channels[0] || null,
    channel_list: channels,
    archived: readBoolean(attributes, ["archived"]),
    tag_ids: params.tagIds,
    audience_ids: params.audienceIds,
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    scheduled_at: readDate(attributes, ["scheduled_at", "scheduled"]),
    send_at: readDate(attributes, ["send_time", "send_at", "sent_at"]),
    search_text: buildSearchText([name, readString(attributes, ["status"]), channels.join(" ")]),
    raw_payload: {
      id: params.campaign.id,
      type: params.campaign.type,
      attributes,
      relationships: params.campaign.relationships || {},
    },
    included_payload: [],
    a_b_test: asRecord(attributes.a_b_test || attributes.ab_test),
    send_strategy: asRecord(attributes.send_strategy),
    tracking_options: asRecord(attributes.tracking_options),
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function tagToRow(params: { regionId: string; syncRunId: string; tag: KlaviyoResourceObject }) {
  const attributes = params.tag.attributes || {};
  const name = readString(attributes, ["name"], params.tag.id || "Untitled tag");
  const tagGroup = asRecord(attributes.tag_group);

  return {
    region_id: params.regionId,
    tag_id: params.tag.id || "",
    name,
    tag_group_id: readString(tagGroup, ["id"]) || relationshipIds(params.tag, ["tag-group"])[0] || null,
    tag_group_name: readString(tagGroup, ["name"]) || null,
    search_text: buildSearchText([name, readString(tagGroup, ["name"])]),
    raw_payload: {
      id: params.tag.id,
      type: params.tag.type,
      attributes,
      relationships: params.tag.relationships || {},
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function campaignAudienceToRow(params: {
  regionId: string;
  syncRunId: string;
  campaignId: string;
  audience: KlaviyoResourceObject;
  relationshipName?: string;
}) {
  const attributes = params.audience.attributes || {};
  const audienceType = params.audience.type || readString(attributes, ["type"], "campaign-audience");

  return {
    region_id: params.regionId,
    campaign_id: params.campaignId,
    campaign_message_id: "",
    relationship_name: params.relationshipName || "campaign_audience",
    audience_type: audienceType,
    audience_id: params.audience.id || "",
    raw_payload: {
      id: params.audience.id,
      type: params.audience.type,
      attributes,
      relationships: params.audience.relationships || {},
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function tagRelationshipRows(params: {
  regionId: string;
  syncRunId: string;
  campaignId: string;
  tagIds: string[];
}) {
  return params.tagIds.map((tagId) => ({
    region_id: params.regionId,
    tag_id: tagId,
    target_type: "campaign",
    target_id: params.campaignId,
    raw_payload: {
      target_type: "campaign",
      target_id: params.campaignId,
      tag_id: tagId,
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

function resourcesFromIds(params: { ids: string[]; type: string; existingResources: KlaviyoResourceObject[] }) {
  const byId = new Map(params.existingResources.flatMap((resource) => (resource.id ? [[resource.id, resource]] : [])));

  params.ids.forEach((id) => {
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        type: params.type,
        attributes: {},
        relationships: {},
      });
    }
  });

  return Array.from(byId.values());
}

function resourceToRawRow(params: {
  regionId: string;
  syncRunId: string;
  family: string;
  endpointPath: string;
  resource: KlaviyoResourceObject;
}) {
  const attributes = params.resource.attributes || {};
  const relationships = params.resource.relationships || {};
  const resourceId = params.resource.id || `${params.family}:${params.endpointPath}`;

  return {
    region_id: params.regionId,
    resource_family: params.family,
    resource_type: params.resource.type || params.family,
    resource_id: resourceId,
    endpoint_path: params.endpointPath,
    resource_name: readString(attributes, ["name", "title", "label", "subject"]) || null,
    resource_created_at: readDate(attributes, ["created", "created_at", "send_time", "sent_at"]),
    resource_updated_at: readDate(attributes, ["updated", "updated_at", "modified", "last_modified"]),
    occurred_at: readDate(attributes, ["send_time", "sent_at", "scheduled_at"]),
    attributes,
    relationships,
    included_payload: [],
    raw_payload: {
      id: params.resource.id,
      type: params.resource.type,
      attributes,
      relationships,
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchCampaigns(rows: KlaviyoSyncRows, client: KlaviyoClientParams) {
  const collections = [];
  const channelFetches = [
    { label: "Email campaigns", filter: "equals(messages.channel,'email')" },
    { label: "SMS campaigns", filter: "equals(messages.channel,'sms')" },
    { label: "Push campaigns", filter: "equals(messages.channel,'mobile_push')" },
  ];

  for (const channelFetch of channelFetches) {
    collections.push(
      await fetchOptionalCollection(
        rows,
        {
          ...client,
          path: "campaigns",
          label: channelFetch.label,
          query: {
            filter: channelFetch.filter,
            include: "tags",
          },
          pageSize: campaignPageSize,
        },
        [400, 403, 404],
      ),
    );
  }

  const campaigns = dedupeResources(collections.flatMap((collection) => collection.data)).filter((campaign) => campaign.id);
  const includedTags = dedupeResources(collections.flatMap((collection) => collection.included)).filter((resource) =>
    (resource.type || "").toLowerCase().includes("tag"),
  );

  if (campaigns.length) {
    return { campaigns, includedTags, endpointPath: "campaigns" };
  }

  console.warn(
    `[sync:klaviyo] Channel-filtered campaign requests returned no campaigns for region ${client.regionSlug}; retrying unfiltered campaigns.`,
  );
  const fallbackCollection = await fetchKlaviyoCollection({
    ...client,
    path: "campaigns",
    label: "All campaigns",
    query: {
      include: "tags",
    },
    pageSize: campaignPageSize,
  }).catch(async (error) => {
    if (error instanceof KlaviyoEndpointError && error.status === 400) {
      rows.warnings.push(`All campaigns with included tags failed; retrying without included tags. ${sanitizeLogText(error.message)}`);
      console.warn(
        `[sync:klaviyo] All campaigns with included tags failed for region ${client.regionSlug}; retrying without included tags.`,
      );

      return fetchKlaviyoCollection({
        ...client,
        path: "campaigns",
        label: "All campaigns without included tags",
        pageSize: campaignPageSize,
      });
    }

    throw error;
  });

  return {
    campaigns: dedupeResources(fallbackCollection.data).filter((campaign) => campaign.id),
    includedTags: dedupeResources(fallbackCollection.included).filter((resource) =>
      (resource.type || "").toLowerCase().includes("tag"),
    ),
    endpointPath: "campaigns",
  };
}

async function fetchCampaignTags(
  rows: KlaviyoSyncRows,
  client: KlaviyoClientParams,
  campaign: KlaviyoResourceObject,
  includedTagsById: Map<string, KlaviyoResourceObject>,
): Promise<CampaignTags> {
  const campaignId = campaign.id || "";
  const tagResources: KlaviyoResourceObject[] = [];
  const tagIds = relationshipIds(campaign, ["tag"], ["tag"]);

  if (hasRelationship(campaign, ["tags"])) {
    tagResources.push(...tagIds.flatMap((tagId) => {
      const tag = includedTagsById.get(tagId);
      return tag ? [tag] : [];
    }));

    return {
      tagIds: uniqueStrings(tagIds),
      tagResources: dedupeResources(tagResources),
      endpointPaths: ["campaigns?include=tags"],
    };
  }

  const tagCollection = await fetchOptionalCollection(rows, {
    ...client,
    path: `campaigns/${campaignId}/tags`,
    label: `Campaign tags for ${campaignId}`,
    pageSize: null,
  });

  tagResources.push(...tagCollection.data);
  tagIds.push(...tagCollection.data.map((tag) => tag.id || ""));

  let tagIdCollection: KlaviyoCollection = {
    data: [],
    included: [],
    endpointPath: `campaigns/${campaignId}/relationships/tags`,
    pageCount: 0,
  };

  // The full tag endpoint already returns tag IDs. Only call the relationship endpoint when we still do
  // not have IDs, which keeps large accounts from making one duplicate request per campaign.
  if (!uniqueStrings(tagIds).length) {
    tagIdCollection = await fetchOptionalCollection(rows, {
      ...client,
      path: `campaigns/${campaignId}/relationships/tags`,
      label: `Campaign tag IDs for ${campaignId}`,
      pageSize: null,
    });
    tagIds.push(...tagIdCollection.data.map((tag) => tag.id || ""));
  }

  return {
    tagIds: uniqueStrings(tagIds),
    tagResources: dedupeResources(tagResources),
    endpointPaths: [tagCollection.endpointPath, tagIdCollection.endpointPath],
  };
}

async function fetchCampaignAudienceMap(rows: KlaviyoSyncRows, client: KlaviyoClientParams) {
  const audienceByCampaignId = new Map<string, CampaignAudiences>();
  const audienceCollection = await fetchOptionalCollection(rows, {
    ...client,
    path: "campaigns",
    label: "Campaign audience relationship map",
    query: {
      include: "campaign-audiences",
    },
    pageSize: campaignPageSize,
    revision: getKlaviyoBetaRevision(),
  });
  const audienceResourcesById = new Map(
    dedupeResources(audienceCollection.included)
      .filter((resource) => (resource.type || "").toLowerCase().includes("campaign-audience"))
      .flatMap((resource) => (resource.id ? [[resource.id, resource] as const] : [])),
  );

  audienceCollection.data.forEach((campaign) => {
    const campaignId = campaign.id || "";

    if (!campaignId) {
      return;
    }

    const audienceIds = relationshipIds(campaign, ["campaign-audience", "audience"], ["campaign-audience", "audience"]);
    const audienceResources = audienceIds.flatMap((audienceId) => {
      const audience = audienceResourcesById.get(audienceId);
      return audience ? [audience] : [];
    });

    audienceByCampaignId.set(campaignId, {
      audienceIds,
      audienceResources: dedupeResources(audienceResources),
      endpointPaths: [audienceCollection.endpointPath],
    });
  });

  console.info(
    `[sync:klaviyo] Campaign audience relationship map found ${Array.from(audienceByCampaignId.values()).reduce(
      (total, audiences) => total + audiences.audienceIds.length,
      0,
    )} audience relationship(s) across ${audienceByCampaignId.size} campaign(s) for region ${client.regionSlug}.`,
  );

  return audienceByCampaignId;
}

export async function fetchKlaviyoSyncRows(params: {
  region: RegionIntegrationConfig & { klaviyoPrivateKey: string };
  regionId: string;
  syncRunId: string;
  startDate: string;
  endDate: string;
  campaignReportDates?: string[];
}): Promise<KlaviyoSyncRows> {
  const rows = makeEmptyRows();
  const client = {
    privateKey: params.region.klaviyoPrivateKey,
    regionSlug: params.region.slug,
  };

  console.info(
    `[sync:klaviyo] Region ${params.region.slug} campaign sync started for run ${params.syncRunId}. Scope=campaigns,campaign-performance,campaign-audiences,campaign-tags,campaign-status.`,
  );

  const { campaigns, includedTags, endpointPath } = await fetchCampaigns(rows, client);
  const includedTagsById = new Map(includedTags.flatMap((tag) => (tag.id ? [[tag.id, tag] as const] : [])));
  const audienceByCampaignId = await fetchCampaignAudienceMap(rows, client);
  const campaignNameById = resourceNameById(campaigns);

  console.info(
    `[sync:klaviyo] Resolving campaign tags and audiences for ${campaigns.length} campaign(s) in region ${params.region.slug} with concurrency ${perCampaignConcurrency}.`,
  );

  const details = await mapWithConcurrency(campaigns, perCampaignConcurrency, async (campaign, index) => {
    const campaignId = campaign.id || `campaign-${index + 1}`;

    console.info(
      `[sync:klaviyo] Campaign detail ${index + 1}/${campaigns.length} started for ${campaignId} in region ${params.region.slug}.`,
    );

    const tags = await fetchCampaignTags(rows, client, campaign, includedTagsById);
    const audiences = audienceByCampaignId.get(campaign.id || "") || {
      audienceIds: [],
      audienceResources: [],
      endpointPaths: ["campaigns?include=campaign-audiences"],
    };

    console.info(
      `[sync:klaviyo] Campaign detail ${index + 1}/${campaigns.length} completed for ${campaignId}: ${tags.tagIds.length} tag id(s), ${audiences.audienceIds.length} audience id(s).`,
    );

    return { campaign, tags, audiences };
  });

  details.forEach(({ campaign, tags, audiences }) => {
    const campaignId = campaign.id || "";
    const tagIds = uniqueStrings(tags.tagIds);
    const audienceIds = uniqueStrings(audiences.audienceIds);
    const tagResources = resourcesFromIds({
      ids: tagIds,
      type: "tag",
      existingResources: tags.tagResources,
    });
    const audienceResources = resourcesFromIds({
      ids: audienceIds,
      type: "campaign-audience",
      existingResources: audiences.audienceResources,
    });

    rows.campaignRows.push(
      campaignToRow({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        campaign,
        tagIds,
        audienceIds,
      }),
    );
    rows.rawResourceRows.push(
      resourceToRawRow({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        family: "campaigns",
        endpointPath,
        resource: campaign,
      }),
    );
    rows.tagRows.push(
      ...tagResources.map((tag) =>
        tagToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          tag,
        }),
      ),
    );
    rows.tagRelationshipRows.push(
      ...tagRelationshipRows({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        campaignId,
        tagIds,
      }),
    );
    rows.campaignAudienceRows.push(
      ...audienceResources.map((audience) =>
        campaignAudienceToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          campaignId,
          audience,
        }),
      ),
    );
    rows.rawResourceRows.push(
      ...audienceResources.map((audience) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "campaign-audiences",
          endpointPath: audiences.endpointPaths[0] || "campaign-audiences",
          resource: audience,
        }),
      ),
      ...tagResources.map((tag) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "campaign-tags",
          endpointPath: tags.endpointPaths[0] || "campaign-tags",
          resource: tag,
        }),
      ),
    );
  });

  const campaignReportDates = params.campaignReportDates || datesInRange(params.startDate, params.endDate);
  const conversionMetricId = campaignReportDates.length
    ? await resolveConversionMetricId(rows, {
        privateKey: params.region.klaviyoPrivateKey,
        regionSlug: params.region.slug,
        configuredMetricId: params.region.klaviyoConversionMetricId,
      })
    : null;

  if (conversionMetricId) {
    try {
      const reportRows = collapseReportRows(
        await fetchKlaviyoDailyCampaignValueReports({
          ...client,
          startDate: params.startDate,
          endDate: params.endDate,
          reportDates: campaignReportDates,
          conversionMetricId,
          objectNameById: campaignNameById,
          warnings: rows.warnings,
        }),
      ).filter((row) => row.metricDate >= params.startDate && row.metricDate <= params.endDate);

      rows.campaignReportRows.push(
        ...reportRows.map((row) => ({
          region_id: params.regionId,
          campaign_id: row.objectId,
          campaign_name: row.objectName,
          send_date: row.metricDate,
          recipients_count: Math.trunc(row.recipients),
          delivered_count: Math.trunc(row.delivered),
          opens_count: Math.trunc(row.opens),
          opens_unique_count: Math.trunc(row.opensUnique || row.opens),
          open_rate: row.openRate,
          clicks_count: Math.trunc(row.clicks),
          clicks_unique_count: Math.trunc(row.clicksUnique || row.clicks),
          click_rate: row.clickRate,
          conversions_count: Math.trunc(row.conversionsUnique || row.conversions),
          conversions_unique_count: Math.trunc(row.conversionsUnique || row.conversions),
          conversion_rate: row.conversionRate,
          revenue_amount: row.revenue,
          revenue_per_recipient: row.revenuePerRecipient,
          currency_code: params.region.currencyCode,
          updated_at: new Date().toISOString(),
        })),
      );

      console.info(
        `[sync:klaviyo] Campaign performance sync produced ${rows.campaignReportRows.length} report row(s) for region ${params.region.slug}.`,
      );
    } catch (error) {
      const warning = `Campaign performance: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown report error")}`;

      rows.warnings.push(warning);
      console.warn(
        `[sync:klaviyo] Continuing without campaign performance rows for region ${params.region.slug}. ${warning}`,
      );
    }
  } else if (!campaignReportDates.length) {
    console.info(
      `[sync:klaviyo] Campaign performance rows skipped for region ${params.region.slug}; all report dates in ${params.startDate} to ${params.endDate} were already ingested.`,
    );
  }

  rows.tagRows = dedupeRows(rows.tagRows, ["region_id", "tag_id"]);
  rows.tagRelationshipRows = dedupeRows(rows.tagRelationshipRows, ["region_id", "tag_id", "target_type", "target_id"]);
  rows.campaignReportRows = dedupeRows(rows.campaignReportRows, ["region_id", "campaign_id", "send_date"]);
  rows.campaignAudienceRows = dedupeRows(rows.campaignAudienceRows, [
    "region_id",
    "campaign_id",
    "campaign_message_id",
    "relationship_name",
    "audience_type",
    "audience_id",
  ]);
  rows.rawResourceRows = dedupeRows(rows.rawResourceRows, ["region_id", "resource_family", "resource_type", "resource_id"]);

  console.info(
    `[sync:klaviyo] Region ${params.region.slug} campaign sync produced ${rows.campaignRows.length} campaign row(s), ${rows.campaignReportRows.length} campaign report row(s), ${rows.campaignAudienceRows.length} campaign audience row(s), ${rows.tagRows.length} tag row(s), ${rows.tagRelationshipRows.length} campaign tag relationship row(s), and ${rows.rawResourceRows.length} raw campaign resource row(s) for run ${params.syncRunId}.`,
  );

  return rows;
}

function dedupeRows(rows: Record<string, unknown>[], keys: string[]) {
  const byKey = new Map<string, Record<string, unknown>>();

  rows.forEach((row) => {
    const key = keys.map((field) => String(row[field] ?? "")).join(":");

    if (!byKey.has(key)) {
      byKey.set(key, row);
    }
  });

  return Array.from(byKey.values());
}
