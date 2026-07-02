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

export type KlaviyoProfileSyncRow = {
  profile_id: string;
  email: string | null;
  phone_number: string | null;
  external_id: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  title: string | null;
  locale: string | null;
  location: KlaviyoJson;
  properties: KlaviyoJson;
  subscriptions: KlaviyoJson;
  predictive_analytics: KlaviyoJson;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  last_event_at: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoAudienceType = "list" | "segment";

export type KlaviyoAudienceSyncRow = {
  audience_type: KlaviyoAudienceType;
  audience_id: string;
  name: string;
  opt_in_process: string | null;
  is_active: boolean | null;
  is_starred: boolean | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoAudienceMembershipSyncRow = {
  audience_type: KlaviyoAudienceType;
  audience_id: string;
  profile_id: string;
  joined_group_at: string | null;
  raw_payload: KlaviyoJson;
};

export type KlaviyoMetricSyncRow = {
  metric_id: string;
  name: string;
  integration_name: string | null;
  integration_category: string | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoEventSyncRow = {
  event_id: string;
  event_uuid: string | null;
  metric_id: string | null;
  profile_id: string | null;
  event_datetime: string | null;
  event_timestamp: number | null;
  event_value: number | null;
  event_properties: KlaviyoJson;
  raw_payload: KlaviyoJson;
};

export type KlaviyoTagSyncRow = {
  tag_id: string;
  name: string;
  tag_group_id: string | null;
  tag_group_name: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoTagRelationshipSyncRow = {
  tag_id: string;
  target_type: "list" | "segment" | "campaign" | "flow";
  target_id: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoCampaignMetadataSyncRow = {
  campaign_id: string;
  name: string;
  status: string | null;
  channel: string | null;
  archived: boolean | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  scheduled_at: string | null;
  send_at: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoFlowMetadataSyncRow = {
  flow_id: string;
  name: string;
  status: string | null;
  trigger_type: string | null;
  archived: boolean | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
  raw_payload: KlaviyoJson;
};

export type KlaviyoComprehensiveSyncData = {
  profiles: KlaviyoProfileSyncRow[];
  audiences: KlaviyoAudienceSyncRow[];
  audienceMemberships: KlaviyoAudienceMembershipSyncRow[];
  metrics: KlaviyoMetricSyncRow[];
  events: KlaviyoEventSyncRow[];
  tags: KlaviyoTagSyncRow[];
  tagRelationships: KlaviyoTagRelationshipSyncRow[];
  campaigns: KlaviyoCampaignMetadataSyncRow[];
  flows: KlaviyoFlowMetadataSyncRow[];
};

type KlaviyoJson = Record<string, unknown>;

type KlaviyoMetricCandidate = {
  id: string;
  name: string;
  integrationName: string;
  integrationCategory: string;
};

type KlaviyoReportType = "campaign-values-report" | "flow-values-report";
type KlaviyoCampaignChannel = "email" | "sms" | "mobile_push";
type KlaviyoQueryValue = string | number | boolean | string[] | null | undefined;

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

const klaviyoProfileFields = [
  "id",
  "email",
  "phone_number",
  "external_id",
  "first_name",
  "last_name",
  "organization",
  "title",
  "locale",
  "location",
  "properties",
  "subscriptions",
  "predictive_analytics",
  "created",
  "updated",
  "last_event_date",
];

const klaviyoListFields = ["id", "name", "opt_in_process", "created", "updated"];
const klaviyoSegmentFields = ["id", "name", "created", "updated", "is_active", "is_starred"];
const klaviyoMetricFields = ["id", "name", "integration", "created", "updated"];
const klaviyoEventFields = ["id", "uuid", "datetime", "timestamp", "event_properties"];
const klaviyoFlowFields = ["id", "name", "status", "trigger_type", "archived", "created", "updated"];

const klaviyoCampaignChannels: KlaviyoCampaignChannel[] = ["email", "sms", "mobile_push"];

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

function readOptionalString(source: KlaviyoJson, keys: string[]) {
  const value = readString(source, keys, "");
  return value || null;
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

function readOptionalNumber(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readOptionalBoolean(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function readRelationshipIds(resource: KlaviyoJson, relationshipName: string) {
  const relationships = asRecord(resource.relationships);
  const relationship = asRecord(relationships[relationshipName]);
  const relationshipData = relationship.data;
  const data = Array.isArray(relationshipData) ? relationshipData : relationshipData ? [relationshipData] : [];

  return data
    .map((item) => readString(asRecord(item), ["id"], ""))
    .filter(Boolean);
}

function buildSearchText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .slice(0, 4000);
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
  context?: "settings" | "sync";
  label?: string;
  authorizationErrorMessage?: string;
  rateLimitErrorMessage?: string;
}) {
  const label = params.label || "Klaviyo request";
  const logPrefix = params.context === "sync" ? "sync:klaviyo" : "settings:klaviyo";
  const path = buildKlaviyoPath(params.path);
  const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Klaviyo-API-Key ${params.privateKey}`,
      Accept: "application/vnd.api+json",
      revision: getKlaviyoRevision(),
    },
  });

  if (response.status === 401 || response.status === 403) {
    console.warn(`[${logPrefix}] ${label} unauthorized for region ${params.regionSlug}.`);
    throw new Error(
      params.authorizationErrorMessage ||
        `Grant the required Klaviyo read scope so ${label.toLowerCase()} can run.`,
    );
  }

  if (response.status === 429) {
    console.warn(`[${logPrefix}] ${label} rate limited for region ${params.regionSlug}.`);
    throw new Error(params.rateLimitErrorMessage || `${label} was rate limited. Wait briefly and try again.`);
  }

  if (!response.ok) {
    const responseText = await response.text();
    const summary = summarizeKlaviyoErrors(parseJsonText(responseText), responseText);

    console.warn(`[${logPrefix}] ${label} failed for region ${params.regionSlug}: ${response.status}. ${summary}`);
    throw new Error(`Unable to fetch ${label.toLowerCase()} for region ${params.regionSlug}. ${summary}`);
  }

  return (await response.json()) as KlaviyoJson;
}

async function fetchKlaviyoCollection(params: {
  region: KlaviyoRegionConfig;
  path: string;
  label: string;
  query?: Record<string, KlaviyoQueryValue>;
}) {
  // Klaviyo collection endpoints use cursor links, so this helper follows links.next until the API stops.
  const items: KlaviyoJson[] = [];
  const included: KlaviyoJson[] = [];
  const seenPaths = new Set<string>();
  let nextPath: string | null = buildKlaviyoPath(params.path, params.query);
  let pageCount = 0;

  while (nextPath) {
    if (seenPaths.has(nextPath)) {
      throw new Error(`Klaviyo pagination repeated a cursor while fetching ${params.label}.`);
    }

    seenPaths.add(nextPath);

    const payload = await klaviyoGetRequest({
      privateKey: params.region.klaviyoPrivateKey,
      path: nextPath,
      regionSlug: params.region.slug,
      context: "sync",
      label: params.label,
    });

    items.push(...asArray(payload.data).map(asRecord));
    included.push(...asArray(payload.included).map(asRecord));

    const links = asRecord(payload.links);
    nextPath = normalizeKlaviyoNextPath(readString(links, ["next"], ""));
    pageCount += 1;
  }

  console.info(
    `[sync:klaviyo] Fetched ${items.length} ${params.label} item(s) for region ${params.region.slug} across ${pageCount} page(s).`,
  );

  return { items, included };
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

function includedResourceMap(included: KlaviyoJson[]) {
  const resources = new Map<string, KlaviyoJson>();

  included.forEach((resource) => {
    const type = readString(resource, ["type"], "");
    const id = readString(resource, ["id"], "");

    if (type && id) {
      resources.set(`${type}:${id}`, resource);
    }
  });

  return resources;
}

function profileFromResponseItem(value: unknown): KlaviyoProfileSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const profileId = readString(record, ["id"], "");

  if (!profileId) {
    return null;
  }

  const location = asRecord(attributes.location);
  const email = readOptionalString(attributes, ["email"]);
  const phoneNumber = readOptionalString(attributes, ["phone_number", "phoneNumber"]);
  const externalId = readOptionalString(attributes, ["external_id", "externalId"]);
  const firstName = readOptionalString(attributes, ["first_name", "firstName"]);
  const lastName = readOptionalString(attributes, ["last_name", "lastName"]);
  const organization = readOptionalString(attributes, ["organization"]);
  const title = readOptionalString(attributes, ["title"]);
  const locale = readOptionalString(attributes, ["locale"]);

  return {
    profile_id: profileId,
    email,
    phone_number: phoneNumber,
    external_id: externalId,
    first_name: firstName,
    last_name: lastName,
    organization,
    title,
    locale,
    location,
    properties: asRecord(attributes.properties),
    subscriptions: asRecord(attributes.subscriptions),
    predictive_analytics: asRecord(attributes.predictive_analytics),
    klaviyo_created_at: readOptionalString(attributes, ["created"]),
    klaviyo_updated_at: readOptionalString(attributes, ["updated"]),
    last_event_at: readOptionalString(attributes, ["last_event_date", "lastEventDate"]),
    search_text: buildSearchText([
      profileId,
      email,
      phoneNumber,
      externalId,
      firstName,
      lastName,
      organization,
      title,
      locale,
      readOptionalString(location, ["city"]),
      readOptionalString(location, ["region"]),
      readOptionalString(location, ["country"]),
      readOptionalString(location, ["zip"]),
    ]),
    raw_payload: record,
  };
}

function audienceFromResponseItem(value: unknown, audienceType: KlaviyoAudienceType): KlaviyoAudienceSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const audienceId = readString(record, ["id"], "");

  if (!audienceId) {
    return null;
  }

  const name = readString(attributes, ["name"], `${audienceType} ${audienceId}`);

  return {
    audience_type: audienceType,
    audience_id: audienceId,
    name,
    opt_in_process: audienceType === "list" ? readOptionalString(attributes, ["opt_in_process"]) : null,
    is_active: audienceType === "segment" ? readOptionalBoolean(attributes, ["is_active"]) : null,
    is_starred: audienceType === "segment" ? readOptionalBoolean(attributes, ["is_starred"]) : null,
    klaviyo_created_at: readOptionalString(attributes, ["created"]),
    klaviyo_updated_at: readOptionalString(attributes, ["updated"]),
    search_text: buildSearchText([audienceType, audienceId, name]),
    raw_payload: record,
  };
}

function membershipFromResponseItem(
  value: unknown,
  audience: KlaviyoAudienceSyncRow,
): KlaviyoAudienceMembershipSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const profileId = readString(record, ["id"], "");

  if (!profileId) {
    return null;
  }

  return {
    audience_type: audience.audience_type,
    audience_id: audience.audience_id,
    profile_id: profileId,
    joined_group_at: readOptionalString(attributes, ["joined_group_at", "joinedGroupAt"]),
    raw_payload: record,
  };
}

function metricFromCollectionItem(value: unknown): KlaviyoMetricSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const integration = asRecord(attributes.integration);
  const metricId = readString(record, ["id"], "");
  const name = readString(attributes, ["name"], "");

  if (!metricId || !name) {
    return null;
  }

  const integrationName = readOptionalString(integration, ["name"]);
  const integrationCategory = readOptionalString(integration, ["category"]);

  return {
    metric_id: metricId,
    name,
    integration_name: integrationName,
    integration_category: integrationCategory,
    klaviyo_created_at: readOptionalString(attributes, ["created"]),
    klaviyo_updated_at: readOptionalString(attributes, ["updated"]),
    search_text: buildSearchText([metricId, name, integrationName, integrationCategory]),
    raw_payload: record,
  };
}

function eventFromResponseItem(value: unknown): KlaviyoEventSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const eventProperties = asRecord(attributes.event_properties);
  const eventId = readString(record, ["id"], readString(attributes, ["uuid"], ""));

  if (!eventId) {
    return null;
  }

  return {
    event_id: eventId,
    event_uuid: readOptionalString(attributes, ["uuid"]),
    metric_id: readRelationshipIds(record, "metric")[0] || null,
    profile_id: readRelationshipIds(record, "profile")[0] || null,
    event_datetime: readOptionalString(attributes, ["datetime"]),
    event_timestamp: readOptionalNumber(attributes, ["timestamp"]),
    event_value: readOptionalNumber({ ...attributes, ...eventProperties }, ["$value", "value", "Value"]),
    event_properties: eventProperties,
    raw_payload: record,
  };
}

function tagFromResponseItem(value: unknown, includedByKey: Map<string, KlaviyoJson>): KlaviyoTagSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const tagId = readString(record, ["id"], "");
  const name = readString(attributes, ["name"], "");

  if (!tagId || !name) {
    return null;
  }

  const tagGroupId = readRelationshipIds(record, "tag-group")[0] || null;
  const tagGroup = tagGroupId ? asRecord(includedByKey.get(`tag-group:${tagGroupId}`)) : {};
  const tagGroupName = readOptionalString(asRecord(tagGroup.attributes), ["name"]);

  return {
    tag_id: tagId,
    name,
    tag_group_id: tagGroupId,
    tag_group_name: tagGroupName,
    search_text: buildSearchText([tagId, name, tagGroupName]),
    raw_payload: record,
  };
}

function tagRelationshipsFromResource(
  value: unknown,
  targetType: KlaviyoTagRelationshipSyncRow["target_type"],
  targetId: string,
) {
  const record = asRecord(value);
  const relationships = asRecord(record.relationships);
  const tagRelationship = asRecord(relationships.tags);

  return readRelationshipIds(record, "tags").map((tagId) => ({
    tag_id: tagId,
    target_type: targetType,
    target_id: targetId,
    raw_payload: {
      target_type: targetType,
      target_id: targetId,
      relationship: tagRelationship,
    },
  }));
}

function campaignFromResponseItem(
  value: unknown,
  channel: KlaviyoCampaignChannel,
): KlaviyoCampaignMetadataSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const campaignId = readString(record, ["id"], "");

  if (!campaignId) {
    return null;
  }

  const name = readString(attributes, ["name"], `Campaign ${campaignId}`);
  const status = readOptionalString(attributes, ["status"]);

  return {
    campaign_id: campaignId,
    name,
    status,
    channel,
    archived: readOptionalBoolean(attributes, ["archived"]),
    klaviyo_created_at: readOptionalString(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readOptionalString(attributes, ["updated_at", "updated"]),
    scheduled_at: readOptionalString(attributes, ["scheduled_at"]),
    send_at: readOptionalString(attributes, ["send_time", "send_at"]),
    search_text: buildSearchText([campaignId, name, status, channel]),
    raw_payload: record,
  };
}

function flowFromResponseItem(value: unknown): KlaviyoFlowMetadataSyncRow | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const flowId = readString(record, ["id"], "");

  if (!flowId) {
    return null;
  }

  const name = readString(attributes, ["name"], `Flow ${flowId}`);
  const status = readOptionalString(attributes, ["status"]);
  const triggerType = readOptionalString(attributes, ["trigger_type"]);

  return {
    flow_id: flowId,
    name,
    status,
    trigger_type: triggerType,
    archived: readOptionalBoolean(attributes, ["archived"]),
    klaviyo_created_at: readOptionalString(attributes, ["created"]),
    klaviyo_updated_at: readOptionalString(attributes, ["updated"]),
    search_text: buildSearchText([flowId, name, status, triggerType]),
    raw_payload: record,
  };
}

function dedupeByKey<T>(rows: T[], readKey: (row: T) => string) {
  return Array.from(new Map(rows.map((row) => [readKey(row), row])).values());
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
      label: "Metrics lookup",
      authorizationErrorMessage:
        "Grant metrics:read to the Klaviyo private key so the conversion metric can be detected.",
      rateLimitErrorMessage: "Klaviyo metric lookup was rate limited. Wait briefly and try again.",
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

async function fetchKlaviyoProfiles(region: KlaviyoRegionConfig) {
  const collection = await fetchKlaviyoCollection({
    region,
    path: "profiles",
    label: "profiles",
    query: {
      "additional-fields[profile]": ["subscriptions", "predictive_analytics"],
      "fields[profile]": klaviyoProfileFields,
      "page[size]": 100,
      sort: "-updated",
    },
  });

  return collection.items.flatMap((item) => {
    const profile = profileFromResponseItem(item);
    return profile ? [profile] : [];
  });
}

async function fetchKlaviyoAudiences(region: KlaviyoRegionConfig) {
  const [lists, segments] = await Promise.all([
    fetchKlaviyoCollection({
      region,
      path: "lists",
      label: "lists",
      query: {
        "fields[list]": klaviyoListFields,
        include: "tags",
        "page[size]": 10,
      },
    }),
    fetchKlaviyoCollection({
      region,
      path: "segments",
      label: "segments",
      query: {
        "fields[segment]": klaviyoSegmentFields,
        include: "tags",
        "page[size]": 10,
      },
    }),
  ]);

  const audiences = [
    ...lists.items.flatMap((item) => {
      const audience = audienceFromResponseItem(item, "list");
      return audience ? [audience] : [];
    }),
    ...segments.items.flatMap((item) => {
      const audience = audienceFromResponseItem(item, "segment");
      return audience ? [audience] : [];
    }),
  ];

  const tagRelationships = [
    ...lists.items.flatMap((item) => {
      const audience = audienceFromResponseItem(item, "list");
      return audience ? tagRelationshipsFromResource(item, "list", audience.audience_id) : [];
    }),
    ...segments.items.flatMap((item) => {
      const audience = audienceFromResponseItem(item, "segment");
      return audience ? tagRelationshipsFromResource(item, "segment", audience.audience_id) : [];
    }),
  ];

  return {
    audiences,
    tagRelationships,
  };
}

async function fetchKlaviyoAudienceMemberships(params: {
  region: KlaviyoRegionConfig;
  audiences: KlaviyoAudienceSyncRow[];
}) {
  const memberships: KlaviyoAudienceMembershipSyncRow[] = [];
  const profiles: KlaviyoProfileSyncRow[] = [];

  // Memberships are scoped under each list/segment, so we fan out after fetching the audience index.
  for (const audience of params.audiences) {
    const collection = await fetchKlaviyoCollection({
      region: params.region,
      path: `${audience.audience_type === "list" ? "lists" : "segments"}/${encodeURIComponent(
        audience.audience_id,
      )}/profiles`,
      label: `${audience.audience_type} profiles`,
      query: {
        "additional-fields[profile]": "subscriptions",
        "fields[profile]": [...klaviyoProfileFields, "joined_group_at"],
        "page[size]": 100,
        sort: "joined_group_at",
      },
    });

    memberships.push(
      ...collection.items.flatMap((item) => {
        const membership = membershipFromResponseItem(item, audience);
        return membership ? [membership] : [];
      }),
    );

    profiles.push(
      ...collection.items.flatMap((item) => {
        const profile = profileFromResponseItem(item);
        return profile ? [profile] : [];
      }),
    );
  }

  console.info(
    `[sync:klaviyo] Fetched ${memberships.length} audience membership row(s) for region ${params.region.slug}.`,
  );

  return {
    memberships,
    profiles,
  };
}

async function fetchKlaviyoMetrics(region: KlaviyoRegionConfig) {
  const collection = await fetchKlaviyoCollection({
    region,
    path: "metrics",
    label: "metrics",
    query: {
      "fields[metric]": klaviyoMetricFields,
    },
  });

  return collection.items.flatMap((item) => {
    const metric = metricFromCollectionItem(item);
    return metric ? [metric] : [];
  });
}

async function fetchKlaviyoEvents(params: {
  region: KlaviyoRegionConfig;
  startDate: string;
  endDate: string;
}) {
  const start = `${params.startDate}T00:00:00Z`;
  const end = `${params.endDate}T23:59:59Z`;
  const collection = await fetchKlaviyoCollection({
    region: params.region,
    path: "events",
    label: "events",
    query: {
      "fields[event]": klaviyoEventFields,
      include: ["metric", "profile"],
      filter: `and(greater-or-equal(datetime,${start}),less-or-equal(datetime,${end}))`,
      "page[size]": 1000,
      sort: "datetime",
    },
  });

  return collection.items.flatMap((item) => {
    const event = eventFromResponseItem(item);
    return event ? [event] : [];
  });
}

async function fetchKlaviyoTags(region: KlaviyoRegionConfig) {
  const collection = await fetchKlaviyoCollection({
    region,
    path: "tags",
    label: "tags",
    query: {
      "fields[tag]": ["id", "name"],
      "fields[tag-group]": ["id", "name"],
      include: "tag-group",
      "page[size]": 50,
    },
  });
  const includedByKey = includedResourceMap(collection.included);

  return collection.items.flatMap((item) => {
    const tag = tagFromResponseItem(item, includedByKey);
    return tag ? [tag] : [];
  });
}

async function fetchKlaviyoCampaignMetadata(region: KlaviyoRegionConfig) {
  const campaigns: KlaviyoCampaignMetadataSyncRow[] = [];
  const tagRelationships: KlaviyoTagRelationshipSyncRow[] = [];

  for (const channel of klaviyoCampaignChannels) {
    const collection = await fetchKlaviyoCollection({
      region,
      path: "campaigns",
      label: `${channel} campaigns`,
      query: {
        filter: `equals(messages.channel,'${channel}')`,
        include: ["campaign-messages", "tags"],
        "page[size]": 100,
      },
    });

    campaigns.push(
      ...collection.items.flatMap((item) => {
        const campaign = campaignFromResponseItem(item, channel);
        return campaign ? [campaign] : [];
      }),
    );

    tagRelationships.push(
      ...collection.items.flatMap((item) => {
        const campaign = campaignFromResponseItem(item, channel);
        return campaign ? tagRelationshipsFromResource(item, "campaign", campaign.campaign_id) : [];
      }),
    );
  }

  return {
    campaigns: dedupeByKey(campaigns, (campaign) => campaign.campaign_id),
    tagRelationships: dedupeByKey(
      tagRelationships,
      (relationship) => `${relationship.tag_id}:${relationship.target_type}:${relationship.target_id}`,
    ),
  };
}

async function fetchKlaviyoFlowMetadata(region: KlaviyoRegionConfig) {
  const collection = await fetchKlaviyoCollection({
    region,
    path: "flows",
    label: "flows",
    query: {
      "fields[flow]": klaviyoFlowFields,
      include: ["flow-actions", "tags"],
      "page[size]": 50,
    },
  });

  const flows = collection.items.flatMap((item) => {
    const flow = flowFromResponseItem(item);
    return flow ? [flow] : [];
  });
  const tagRelationships = collection.items.flatMap((item) => {
    const flow = flowFromResponseItem(item);
    return flow ? tagRelationshipsFromResource(item, "flow", flow.flow_id) : [];
  });

  return {
    flows,
    tagRelationships,
  };
}

export async function fetchKlaviyoComprehensiveData(params: {
  region: KlaviyoRegionConfig;
  startDate: string;
  endDate: string;
}): Promise<KlaviyoComprehensiveSyncData> {
  console.info(`[sync:klaviyo] Starting comprehensive object sync for region ${params.region.slug}.`);

  // Fetch the broad Klaviyo dataset once during sync so reports can query Supabase instead of Klaviyo.
  const profiles = await fetchKlaviyoProfiles(params.region);
  const audienceResult = await fetchKlaviyoAudiences(params.region);
  const membershipResult = await fetchKlaviyoAudienceMemberships({
    region: params.region,
    audiences: audienceResult.audiences,
  });
  const metrics = await fetchKlaviyoMetrics(params.region);
  const tags = await fetchKlaviyoTags(params.region);
  const campaignResult = await fetchKlaviyoCampaignMetadata(params.region);
  const flowResult = await fetchKlaviyoFlowMetadata(params.region);
  const events = await fetchKlaviyoEvents({
    region: params.region,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const data = {
    profiles: dedupeByKey([...profiles, ...membershipResult.profiles], (profile) => profile.profile_id),
    audiences: audienceResult.audiences,
    audienceMemberships: membershipResult.memberships,
    metrics,
    events,
    tags,
    tagRelationships: dedupeByKey(
      [
        ...audienceResult.tagRelationships,
        ...campaignResult.tagRelationships,
        ...flowResult.tagRelationships,
      ],
      (relationship) => `${relationship.tag_id}:${relationship.target_type}:${relationship.target_id}`,
    ),
    campaigns: campaignResult.campaigns,
    flows: flowResult.flows,
  };

  console.info(
    `[sync:klaviyo] Completed comprehensive object sync for region ${params.region.slug}: ` +
      `${data.profiles.length} profiles, ${data.audiences.length} audiences, ` +
      `${data.audienceMemberships.length} memberships, ${data.events.length} events.`,
  );

  return data;
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
