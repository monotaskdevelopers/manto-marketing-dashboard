/*
File description:
This file contains the rebuilt server-only Klaviyo ingestion client. It fetches cursor-paginated Klaviyo
JSON:API resources, promotes campaign and flow fields needed by dashboard filters, stores raw resources
for future API coverage, and keeps logs/error summaries sanitized so private keys and customer data never
leave the server boundary.
*/

import "server-only";

import { getKlaviyoRevision } from "@/lib/env";
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

type KlaviyoSyncRows = {
  dailyMetricRows: Record<string, unknown>[];
  campaignReportRows: Record<string, unknown>[];
  flowReportRows: Record<string, unknown>[];
  profileRows: Record<string, unknown>[];
  audienceRows: Record<string, unknown>[];
  audienceMembershipRows: Record<string, unknown>[];
  metricRows: Record<string, unknown>[];
  eventRows: Record<string, unknown>[];
  tagRows: Record<string, unknown>[];
  tagRelationshipRows: Record<string, unknown>[];
  campaignRows: Record<string, unknown>[];
  campaignMessageRows: Record<string, unknown>[];
  campaignAudienceRows: Record<string, unknown>[];
  flowRows: Record<string, unknown>[];
  flowActionRows: Record<string, unknown>[];
  flowMessageRows: Record<string, unknown>[];
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
  pageSize?: number;
  pageLimit?: number;
  label: string;
  optional?: boolean;
  revision?: string;
};

type KlaviyoReportRow = {
  objectId: string;
  objectName: string;
  metricDate: string;
  recipients: number;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
  unsubscribes: number;
  bounced: number;
  spamComplaints: number;
};

type KlaviyoResourceDefinition = {
  family: string;
  path: string;
  label: string;
  pageSize?: number;
  include?: string;
  revision?: string;
};

class KlaviyoEndpointError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const standardPageSize = 100;
const standardPageLimit = 50;
const profilePageLimit = 25;
const eventPageLimit = 50;
const reportStatistics = [
  "recipients",
  "opens",
  "clicks",
  "conversions",
  "conversion_value",
  "unsubscribes",
  "bounced",
  "spam_complaints",
];

function getKlaviyoBetaRevision() {
  const revision = getKlaviyoRevision();
  return revision.endsWith(".pre") ? revision : `${revision}.pre`;
}

const broadResourceDefinitions: KlaviyoResourceDefinition[] = [
  { family: "accounts", path: "accounts", label: "Accounts" },
  { family: "agent-knowledge", path: "agent-knowledge", label: "Agent knowledge", revision: getKlaviyoBetaRevision() },
  { family: "agent-skills", path: "agent-skills", label: "Agent skills", revision: getKlaviyoBetaRevision() },
  { family: "agent-tools", path: "agent-tools", label: "Agent tools", revision: getKlaviyoBetaRevision() },
  {
    family: "customer-agent-conversations",
    path: "customer-agent-conversations",
    label: "Customer agent conversations",
    pageSize: 100,
    revision: getKlaviyoBetaRevision(),
  },
  { family: "lists", path: "lists", label: "Lists", include: "tags" },
  { family: "segments", path: "segments", label: "Segments", include: "tags" },
  { family: "tags", path: "tags", label: "Tags" },
  { family: "tag-groups", path: "tag-groups", label: "Tag groups" },
  { family: "coupons", path: "coupons", label: "Coupons" },
  { family: "coupon-codes", path: "coupon-codes", label: "Coupon codes" },
  { family: "custom-object-data-sources", path: "data-sources", label: "Custom object data sources" },
  { family: "forms", path: "forms", label: "Forms" },
  { family: "metrics", path: "metrics", label: "Metrics", pageSize: 200 },
  { family: "custom-metrics", path: "custom-metrics", label: "Custom metrics" },
  { family: "mapped-metrics", path: "mapped-metrics", label: "Mapped metrics" },
  { family: "push-tokens", path: "push-tokens", label: "Push tokens", pageSize: 100 },
  { family: "reviews", path: "reviews", label: "Reviews" },
  { family: "templates", path: "templates", label: "Templates" },
  { family: "template-universal-content", path: "template-universal-content", label: "Template universal content" },
  { family: "tracking-settings", path: "tracking-settings", label: "Tracking settings" },
  { family: "translations", path: "translations", label: "Translations", revision: getKlaviyoBetaRevision() },
  { family: "web-feeds", path: "web-feeds", label: "Web feeds" },
  { family: "webhooks", path: "webhooks", label: "Webhooks" },
  { family: "webhook-topics", path: "webhook-topics", label: "Webhook topics" },
  { family: "catalog-items", path: "catalog-items", label: "Catalog items" },
  { family: "catalog-variants", path: "catalog-variants", label: "Catalog variants" },
  { family: "catalog-categories", path: "catalog-categories", label: "Catalog categories" },
];

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

function readNumber(source: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
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

function eachDate(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
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

async function klaviyoRequest(params: KlaviyoClientParams & {
  path: string;
  label: string;
  method?: "GET" | "POST";
  body?: KlaviyoJson;
  revision?: string;
}) {
  const maxAttempts = 3;
  const revision = params.revision || getKlaviyoRevision();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`https://a.klaviyo.com/api/${params.path}`, {
      method: params.method || "GET",
      headers: {
        Authorization: `Klaviyo-API-Key ${params.privateKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        revision,
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const retryDelayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(Math.max(retryAfterSeconds * 1000, 500), 15_000)
        : Math.min(1000 * attempt, 5000);

      if (attempt < maxAttempts) {
        console.warn(
          `[sync:klaviyo] ${params.label} rate limited for region ${params.regionSlug}; retrying attempt ${
            attempt + 1
          }/${maxAttempts} after ${retryDelayMs}ms.`,
        );
        await wait(retryDelayMs);
        continue;
      }
    }

    if (!response.ok) {
      const responseText = await response.text();
      const summary = summarizeKlaviyoErrors(parseJsonText(responseText), responseText);
      const method = params.method || "GET";

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

function emptyCollection(endpointPath: string): KlaviyoCollection {
  return {
    data: [],
    included: [],
    endpointPath,
    pageCount: 0,
  };
}

async function fetchKlaviyoCollection(params: KlaviyoCollectionParams): Promise<KlaviyoCollection> {
  const pageLimit = Math.max(1, params.pageLimit || standardPageLimit);
  const pageSize = Math.max(1, params.pageSize || standardPageSize);
  const query = {
    ...(params.query || {}),
    "page[size]": pageSize,
  };
  const data: KlaviyoResourceObject[] = [];
  const included: KlaviyoResourceObject[] = [];
  const endpointPath = buildKlaviyoPath(params.path, query);
  let nextPath: string | null = endpointPath;
  let pageCount = 0;

  console.info(
    `[sync:klaviyo] Fetching ${params.label.toLowerCase()} for region ${params.regionSlug}: ${endpointPath}.`,
  );

  while (nextPath && pageCount < pageLimit) {
    try {
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
    } catch (error) {
      if (params.optional && error instanceof KlaviyoEndpointError && [400, 403, 404].includes(error.status)) {
        console.warn(
          `[sync:klaviyo] Optional ${params.label.toLowerCase()} skipped for region ${
            params.regionSlug
          }: ${sanitizeLogText(error.message)}`,
        );
        return { data, included, endpointPath, pageCount };
      }

      throw error;
    }
  }

  if (nextPath) {
    console.warn(
      `[sync:klaviyo] ${params.label} reached ${pageLimit} page(s) for region ${params.regionSlug}; remaining pages will be fetched in a later sync/backfill.`,
    );
  }

  console.info(
    `[sync:klaviyo] ${params.label} fetched ${data.length} resource(s) across ${pageCount} page(s) for region ${params.regionSlug}.`,
  );

  return { data, included, endpointPath, pageCount };
}

async function fetchKlaviyoCollectionOrWarn(
  rows: KlaviyoSyncRows,
  params: KlaviyoCollectionParams,
  recoverableStatuses = [400, 403, 404],
  fallbackQueries: Array<Record<string, KlaviyoQueryValue> | undefined> = [],
) {
  try {
    return await fetchKlaviyoCollection(params);
  } catch (error) {
    if (error instanceof KlaviyoEndpointError && recoverableStatuses.includes(error.status)) {
      for (const fallbackQuery of fallbackQueries) {
        const fallbackLabel = `${params.label} fallback`;

        rows.warnings.push(`${params.label}: primary request failed; retrying reduced request.`);

        try {
          return await fetchKlaviyoCollection({
            ...params,
            label: fallbackLabel,
            query: fallbackQuery,
          });
        } catch (fallbackError) {
          if (
            !(fallbackError instanceof KlaviyoEndpointError) ||
            !recoverableStatuses.includes(fallbackError.status)
          ) {
            throw fallbackError;
          }

          const fallbackWarning = `${fallbackLabel}: ${sanitizeLogText(fallbackError.message)}`;

          rows.warnings.push(fallbackWarning);
          console.warn(
            `[sync:klaviyo] Reduced ${params.label.toLowerCase()} request also failed for region ${params.regionSlug}. ${fallbackWarning}`,
          );
        }
      }

      const query = {
        ...(params.query || {}),
        "page[size]": Math.max(1, params.pageSize || standardPageSize),
      };
      const endpointPath = buildKlaviyoPath(params.path, query);
      const warning = `${params.label}: ${sanitizeLogText(error.message)}`;

      // A missing scope or unavailable optional endpoint should make the sync partial, not discard other
      // campaign/flow data already available from the same account.
      rows.warnings.push(warning);
      console.warn(
        `[sync:klaviyo] Continuing without ${params.label.toLowerCase()} for region ${params.regionSlug}. ${warning}`,
      );

      return emptyCollection(endpointPath);
    }

    throw error;
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput) => Promise<TOutput>,
) {
  const results: TOutput[] = [];
  let cursor = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length || 1);

  // Optional Klaviyo metadata endpoints have lower rate limits than core report endpoints. A small worker
  // pool keeps the sync moving without opening every optional endpoint at once.
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(items[index]);
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

function includedForResource(resource: KlaviyoResourceObject, included: KlaviyoResourceObject[]) {
  const ids = new Set(relationshipItems(resource).map((item) => `${item.type}:${item.id}`));
  return included.filter((item) => ids.has(`${item.type || ""}:${item.id || ""}`));
}

function relationshipIds(resource: KlaviyoResourceObject, typeMatchers: string[]) {
  return uniqueStrings(
    relationshipItems(resource)
      .filter((item) => typeMatchers.some((matcher) => item.type.toLowerCase().includes(matcher)))
      .map((item) => item.id),
  );
}

function relationshipNameIds(resource: KlaviyoResourceObject, nameMatchers: string[]) {
  return uniqueStrings(
    relationshipItems(resource)
      .filter((item) => nameMatchers.some((matcher) => item.relationshipName.toLowerCase().includes(matcher)))
      .map((item) => item.id),
  );
}

function resourceToRawRow(params: {
  regionId: string;
  syncRunId: string;
  family: string;
  endpointPath: string;
  resource: KlaviyoResourceObject;
  included?: KlaviyoResourceObject[];
  occurredAt?: string | null;
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
    resource_name: readString(attributes, ["name", "title", "label", "email", "subject"]) || null,
    resource_created_at: readDate(attributes, ["created", "created_at", "datetime", "send_time", "sent_at"]),
    resource_updated_at: readDate(attributes, ["updated", "updated_at", "modified", "last_modified"]),
    occurred_at: params.occurredAt || readDate(attributes, ["datetime", "timestamp", "event_time"]),
    attributes,
    relationships,
    included_payload: params.included || [],
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

function campaignToRow(params: {
  regionId: string;
  syncRunId: string;
  campaign: KlaviyoResourceObject;
  included: KlaviyoResourceObject[];
}) {
  const attributes = params.campaign.attributes || {};
  const related = includedForResource(params.campaign, params.included);
  const relatedMessages = related.filter((item) => (item.type || "").toLowerCase().includes("campaign-message"));
  const channels = uniqueStrings([
    readString(attributes, ["channel", "message_channel", "send_channel"]),
    ...relatedMessages.map((message) => readString(message.attributes || {}, ["channel", "message_channel", "send_channel"])),
  ]);
  const tagIds = uniqueStrings([
    ...relationshipIds(params.campaign, ["tag"]),
    ...related.filter((item) => (item.type || "").toLowerCase().includes("tag")).map((item) => item.id || ""),
  ]);
  const audienceIds = uniqueStrings([
    ...relationshipIds(params.campaign, ["list", "segment", "audience"]),
    ...relationshipNameIds(params.campaign, ["list", "segment", "audience", "recipient"]),
  ]);
  const name = readString(attributes, ["name"], params.campaign.id || "Untitled campaign");

  return {
    region_id: params.regionId,
    campaign_id: params.campaign.id || "",
    name,
    status: readString(attributes, ["status"]) || null,
    channel: channels[0] || null,
    channel_list: channels,
    archived: readBoolean(attributes, ["archived"]),
    tag_ids: tagIds,
    audience_ids: audienceIds,
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
    included_payload: related,
    a_b_test: asRecord(attributes.a_b_test || attributes.ab_test),
    send_strategy: asRecord(attributes.send_strategy),
    tracking_options: asRecord(attributes.tracking_options),
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function messageToRow(params: {
  regionId: string;
  syncRunId: string;
  campaignId?: string;
  flowId?: string;
  actionId?: string;
  message: KlaviyoResourceObject;
  included?: KlaviyoResourceObject[];
}) {
  const attributes = params.message.attributes || {};
  const sender = asRecord(attributes.sender);
  const definition = asRecord(attributes.definition);
  const content = asRecord(attributes.content || definition.content);
  const renderOptions = asRecord(attributes.render_options || definition.render_options);
  const subject = readString(attributes, ["subject"]) || readString(definition, ["subject"]);
  const previewText = readString(attributes, ["preview_text"]) || readString(definition, ["preview_text"]);
  const fromEmail = readString(attributes, ["from_email"]) || readString(sender, ["from_email", "email"]);
  const fromLabel = readString(attributes, ["from_label"]) || readString(sender, ["from_label", "name"]);
  const replyToEmail = readString(attributes, ["reply_to_email"]) || readString(sender, ["reply_to_email"]);
  const name = readString(attributes, ["name"], params.message.id || "Untitled message");
  const related = params.included ? includedForResource(params.message, params.included) : [];
  const baseRow = {
    message_id: params.message.id || "",
    name,
    channel: readString(attributes, ["channel", "message_channel", "send_channel"]) || null,
    status: readString(attributes, ["status"]) || null,
    subject: subject || null,
    preview_text: previewText || null,
    from_email: fromEmail || null,
    from_label: fromLabel || null,
    reply_to_email: replyToEmail || null,
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    search_text: buildSearchText([name, subject, previewText, fromEmail, fromLabel]),
    tag_ids: relationshipIds(params.message, ["tag"]),
    included_payload: related,
    content,
    render_options: renderOptions,
    raw_payload: {
      id: params.message.id,
      type: params.message.type,
      attributes,
      relationships: params.message.relationships || {},
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Campaign and flow message tables have different parent key columns, so return only the columns that
  // exist on the target table. Extra keys would make Supabase reject the upsert payload.
  if (params.campaignId) {
    return {
      region_id: params.regionId,
      campaign_id: params.campaignId,
      ...baseRow,
    };
  }

  return {
    region_id: params.regionId,
    flow_id: params.flowId || "",
    action_id: params.actionId || "",
    ...baseRow,
  };
}

function audienceRelationshipRows(params: {
  regionId: string;
  syncRunId: string;
  campaignId: string;
  campaignMessageId?: string;
  resource: KlaviyoResourceObject;
}) {
  return relationshipItems(params.resource)
    .filter((item) => {
      const text = `${item.relationshipName} ${item.type}`.toLowerCase();
      return text.includes("audience") || text.includes("list") || text.includes("segment") || text.includes("recipient");
    })
    .map((item) => ({
      region_id: params.regionId,
      campaign_id: params.campaignId,
      campaign_message_id: params.campaignMessageId || "",
      relationship_name: item.relationshipName,
      audience_type: item.type,
      audience_id: item.id,
      raw_payload: item,
      last_seen_sync_run_id: params.syncRunId,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
}

function tagRelationshipRowsForResource(params: {
  regionId: string;
  syncRunId: string;
  targetType: "list" | "segment" | "campaign" | "flow" | "campaign_message" | "flow_action" | "flow_message";
  targetId: string;
  resource: KlaviyoResourceObject;
  included?: KlaviyoResourceObject[];
}) {
  if (!params.targetId) {
    return [];
  }

  const relatedTags = params.included ? includedForResource(params.resource, params.included) : [];
  const tagIds = uniqueStrings([
    ...relationshipItems(params.resource)
      .filter((item) => item.type.toLowerCase() === "tag" || item.relationshipName.toLowerCase().includes("tag"))
      .map((item) => item.id),
    ...relatedTags
      .filter((item) => (item.type || "").toLowerCase() === "tag")
      .map((item) => item.id),
  ]);

  // The promoted tag arrays are convenient for filtering one table. These relationship rows make cross-table
  // tag filters possible without parsing every raw JSON payload at query time.
  return tagIds.map((tagId) => ({
    region_id: params.regionId,
    tag_id: tagId,
    target_type: params.targetType,
    target_id: params.targetId,
    raw_payload: {
      target_type: params.targetType,
      target_id: params.targetId,
      tag_id: tagId,
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

function flowToRow(params: {
  regionId: string;
  syncRunId: string;
  flow: KlaviyoResourceObject;
  included: KlaviyoResourceObject[];
  messageRows: Record<string, unknown>[];
}) {
  const attributes = params.flow.attributes || {};
  const related = includedForResource(params.flow, params.included);
  const channels = uniqueStrings([
    readString(attributes, ["channel", "message_channel", "send_channel"]),
    ...params.messageRows
      .filter((message) => message.flow_id === params.flow.id)
      .map((message) => (typeof message.channel === "string" ? message.channel : "")),
  ]);
  const name = readString(attributes, ["name"], params.flow.id || "Untitled flow");

  return {
    region_id: params.regionId,
    flow_id: params.flow.id || "",
    name,
    status: readString(attributes, ["status"]) || null,
    trigger_type: readString(attributes, ["trigger_type", "trigger"]) || null,
    archived: readBoolean(attributes, ["archived"]),
    channel_list: channels,
    tag_ids: relationshipIds(params.flow, ["tag"]),
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    search_text: buildSearchText([name, readString(attributes, ["status"]), channels.join(" ")]),
    raw_payload: {
      id: params.flow.id,
      type: params.flow.type,
      attributes,
      relationships: params.flow.relationships || {},
    },
    included_payload: related,
    trigger_filters: asRecord(attributes.trigger_filters || attributes.filters),
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function flowActionToRow(params: {
  regionId: string;
  syncRunId: string;
  flowId: string;
  action: KlaviyoResourceObject;
  included?: KlaviyoResourceObject[];
}) {
  const attributes = params.action.attributes || {};
  const name = readString(attributes, ["name", "label"], params.action.id || "Untitled action");
  const related = params.included ? includedForResource(params.action, params.included) : [];

  return {
    region_id: params.regionId,
    flow_id: params.flowId,
    action_id: params.action.id || "",
    action_type: readString(attributes, ["action_type", "type"]) || null,
    status: readString(attributes, ["status"]) || null,
    name,
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    search_text: buildSearchText([name, readString(attributes, ["status"]), readString(attributes, ["action_type"])]),
    tag_ids: relationshipIds(params.action, ["tag"]),
    included_payload: related,
    settings: asRecord(attributes.settings),
    raw_payload: {
      id: params.action.id,
      type: params.action.type,
      attributes,
      relationships: params.action.relationships || {},
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function audienceToRow(params: {
  regionId: string;
  syncRunId: string;
  audienceType: "list" | "segment";
  audience: KlaviyoResourceObject;
}) {
  const attributes = params.audience.attributes || {};
  const name = readString(attributes, ["name"], params.audience.id || "Untitled audience");

  return {
    region_id: params.regionId,
    audience_type: params.audienceType,
    audience_id: params.audience.id || "",
    name,
    opt_in_process: readString(attributes, ["opt_in_process"]) || null,
    is_active: readBoolean(attributes, ["is_active"]),
    is_starred: readBoolean(attributes, ["is_starred"]),
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    search_text: buildSearchText([name, params.audienceType]),
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

function metricToRow(params: { regionId: string; syncRunId: string; metric: KlaviyoResourceObject }) {
  const attributes = params.metric.attributes || {};
  const integration = asRecord(attributes.integration);
  const name = readString(attributes, ["name"], params.metric.id || "Untitled metric");

  return {
    region_id: params.regionId,
    metric_id: params.metric.id || "",
    name,
    integration_name: readString(integration, ["name"]) || null,
    integration_category: readString(integration, ["category"]) || null,
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    search_text: buildSearchText([name, readString(integration, ["name"]), readString(integration, ["category"])]),
    raw_payload: {
      id: params.metric.id,
      type: params.metric.type,
      attributes,
      relationships: params.metric.relationships || {},
    },
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

function profileToRow(params: { regionId: string; syncRunId: string; profile: KlaviyoResourceObject }) {
  const attributes = params.profile.attributes || {};
  const location = asRecord(attributes.location);
  const properties = asRecord(attributes.properties);

  return {
    region_id: params.regionId,
    profile_id: params.profile.id || "",
    email: readString(attributes, ["email"]) || null,
    phone_number: readString(attributes, ["phone_number"]) || null,
    external_id: readString(attributes, ["external_id"]) || null,
    first_name: readString(attributes, ["first_name"]) || null,
    last_name: readString(attributes, ["last_name"]) || null,
    organization: readString(attributes, ["organization"]) || null,
    title: readString(attributes, ["title"]) || null,
    locale: readString(attributes, ["locale"]) || null,
    location,
    properties,
    subscriptions: asRecord(attributes.subscriptions),
    predictive_analytics: asRecord(attributes.predictive_analytics),
    klaviyo_created_at: readDate(attributes, ["created_at", "created"]),
    klaviyo_updated_at: readDate(attributes, ["updated_at", "updated"]),
    last_event_at: readDate(attributes, ["last_event_date", "last_event_at"]),
    search_text: buildSearchText([
      readString(attributes, ["email"]),
      readString(attributes, ["phone_number"]),
      readString(attributes, ["external_id"]),
      readString(attributes, ["first_name"]),
      readString(attributes, ["last_name"]),
      readString(attributes, ["organization"]),
    ]),
    raw_payload: {
      id: params.profile.id,
      type: params.profile.type,
      attributes,
      relationships: params.profile.relationships || {},
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function eventToRow(params: { regionId: string; syncRunId: string; event: KlaviyoResourceObject }) {
  const attributes = params.event.attributes || {};
  const properties = asRecord(attributes.event_properties || attributes.properties);
  const relationships = params.event.relationships || {};
  const metricId = relationshipIds(params.event, ["metric"])[0] || readString(attributes, ["metric_id"]);
  const profileId = relationshipIds(params.event, ["profile"])[0] || readString(attributes, ["profile_id"]);
  const eventDatetime = readDate(attributes, ["datetime", "timestamp", "event_time"]);
  const eventTimestamp = readNumber(attributes, ["event_timestamp"]);

  return {
    region_id: params.regionId,
    event_id: params.event.id || "",
    event_uuid: readString(attributes, ["uuid", "event_uuid"]) || null,
    metric_id: metricId || null,
    profile_id: profileId || null,
    event_datetime: eventDatetime,
    event_timestamp: eventTimestamp ? Math.trunc(eventTimestamp) : null,
    event_value: readNumber(attributes, ["value", "event_value", "$value"]),
    event_properties: properties,
    raw_payload: {
      id: params.event.id,
      type: params.event.type,
      attributes,
      relationships,
    },
    last_seen_sync_run_id: params.syncRunId,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function scoreConversionMetric(metric: KlaviyoResourceObject) {
  const attributes = metric.attributes || {};
  const integration = asRecord(attributes.integration);
  const name = readString(attributes, ["name"]).toLowerCase();
  const integrationText = `${readString(integration, ["name"])} ${readString(integration, ["category"])}`.toLowerCase();
  let score = 0;

  // Revenue/order metrics are the safest default for downstream campaign and flow attribution.
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

function pickConversionMetricId(metricResources: KlaviyoResourceObject[], configuredMetricId?: string) {
  if (configuredMetricId) {
    return configuredMetricId;
  }

  const bestMetric = metricResources
    .map((metric) => ({ metric, score: scoreConversionMetric(metric) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.metric;

  return bestMetric?.id || null;
}

function getStatisticNumber(statistics: KlaviyoJson, keys: string[]) {
  for (const key of keys) {
    const value = statistics[key];

    if (Array.isArray(value)) {
      const sum = value.reduce((total, item) => {
        const numberValue = typeof item === "number" ? item : Number(item);
        return total + (Number.isFinite(numberValue) ? numberValue : 0);
      }, 0);

      return sum;
    }

    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
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
          opens: getStatisticNumber(statistics, ["opens"]),
          clicks: getStatisticNumber(statistics, ["clicks"]),
          conversions: getStatisticNumber(statistics, ["conversions"]),
          revenue: getStatisticNumber(statistics, ["conversion_value", "revenue", "value"]),
          unsubscribes: getStatisticNumber(statistics, ["unsubscribes"]),
          bounced: getStatisticNumber(statistics, ["bounced", "bounces"]),
          spamComplaints: getStatisticNumber(statistics, ["spam_complaints", "spam_complaint"]),
        },
      ];
    });
  });
}

async function fetchKlaviyoValueReport(params: KlaviyoClientParams & {
  endpoint: "campaign-values-reports" | "flow-values-reports";
  label: string;
  metricDate: string;
  conversionMetricId: string;
  groupBy: string[];
  objectIdKeys: string[];
  objectNameById: Map<string, string>;
}) {
  const nextDate = addDays(params.metricDate, 1);
  const payload = await klaviyoRequest({
    privateKey: params.privateKey,
    regionSlug: params.regionSlug,
    method: "POST",
    path: params.endpoint,
    label: params.label,
    body: {
      data: {
        type: params.endpoint === "campaign-values-reports" ? "campaign-values-report" : "flow-values-report",
        attributes: {
          timeframe: {
            start: `${params.metricDate}T00:00:00+00:00`,
            end: `${nextDate}T00:00:00+00:00`,
          },
          conversion_metric_id: params.conversionMetricId,
          statistics: reportStatistics,
          group_by: params.groupBy,
        },
      },
    },
  });

  return parseReportPayload({
    payload,
    objectIdKeys: params.objectIdKeys,
    objectNameById: params.objectNameById,
    metricDate: params.metricDate,
  });
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
    existing.opens += row.opens;
    existing.clicks += row.clicks;
    existing.conversions += row.conversions;
    existing.revenue += row.revenue;
    existing.unsubscribes += row.unsubscribes;
    existing.bounced += row.bounced;
    existing.spamComplaints += row.spamComplaints;
  });

  return Array.from(rowsByKey.values());
}

function makeEmptyRows(): KlaviyoSyncRows {
  return {
    dailyMetricRows: [],
    campaignReportRows: [],
    flowReportRows: [],
    profileRows: [],
    audienceRows: [],
    audienceMembershipRows: [],
    metricRows: [],
    eventRows: [],
    tagRows: [],
    tagRelationshipRows: [],
    campaignRows: [],
    campaignMessageRows: [],
    campaignAudienceRows: [],
    flowRows: [],
    flowActionRows: [],
    flowMessageRows: [],
    rawResourceRows: [],
    warnings: [],
  };
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

export async function fetchKlaviyoSyncRows(params: {
  region: RegionIntegrationConfig & { klaviyoPrivateKey: string };
  regionId: string;
  syncRunId: string;
  startDate: string;
  endDate: string;
}): Promise<KlaviyoSyncRows> {
  const rows = makeEmptyRows();
  const client = {
    privateKey: params.region.klaviyoPrivateKey,
    regionSlug: params.region.slug,
  };

  console.info(
    `[sync:klaviyo] Region ${params.region.slug} metadata sync started for run ${params.syncRunId}.`,
  );

  const campaignEmailCollection = await fetchKlaviyoCollectionOrWarn(
    rows,
    {
      ...client,
      path: "campaigns",
      label: "Email campaigns",
      query: { filter: "equals(messages.channel,'email')", include: "campaign-messages,tags" },
    },
    [400, 403, 404],
    [
      { filter: "equals(messages.channel,'email')", include: "campaign-messages" },
      { filter: "equals(messages.channel,'email')" },
    ],
  );
  const campaignSmsCollection = await fetchKlaviyoCollectionOrWarn(
    rows,
    {
      ...client,
      path: "campaigns",
      label: "SMS campaigns",
      query: { filter: "equals(messages.channel,'sms')", include: "campaign-messages,tags" },
    },
    [400, 403, 404],
    [
      { filter: "equals(messages.channel,'sms')", include: "campaign-messages" },
      { filter: "equals(messages.channel,'sms')" },
    ],
  );
  const campaignPushCollection = await fetchKlaviyoCollectionOrWarn(
    rows,
    {
      ...client,
      path: "campaigns",
      label: "Push campaigns",
      query: { filter: "equals(messages.channel,'mobile_push')", include: "campaign-messages,tags" },
    },
    [400, 403, 404],
    [
      { filter: "equals(messages.channel,'mobile_push')", include: "campaign-messages" },
      { filter: "equals(messages.channel,'mobile_push')" },
    ],
  );
  const filteredCampaignData = [
    ...campaignEmailCollection.data,
    ...campaignSmsCollection.data,
    ...campaignPushCollection.data,
  ];
  const allCampaignCollection = filteredCampaignData.length
    ? emptyCollection("campaigns")
    : await fetchKlaviyoCollectionOrWarn(
        rows,
        {
          ...client,
          path: "campaigns",
          label: "All campaigns",
          query: { include: "campaign-messages,tags" },
        },
        [400, 403, 404],
        [{ include: "campaign-messages" }, undefined],
      );
  const flowCollection = await fetchKlaviyoCollectionOrWarn(
    rows,
    {
      ...client,
      path: "flows",
      label: "Flows",
      query: { include: "flow-actions,tags" },
    },
    [400, 403, 404],
    [{ include: "flow-actions" }, undefined],
  );

  const campaignCollection = {
    data: dedupeResources([
      ...campaignEmailCollection.data,
      ...campaignSmsCollection.data,
      ...campaignPushCollection.data,
      ...allCampaignCollection.data,
    ]),
    included: dedupeResources([
      ...campaignEmailCollection.included,
      ...campaignSmsCollection.included,
      ...campaignPushCollection.included,
      ...allCampaignCollection.included,
    ]),
    endpointPath: "campaigns",
    pageCount:
      campaignEmailCollection.pageCount +
      campaignSmsCollection.pageCount +
      campaignPushCollection.pageCount +
      allCampaignCollection.pageCount,
  };

  rows.campaignRows.push(
    ...campaignCollection.data
      .filter((campaign) => campaign.id)
      .map((campaign) =>
        campaignToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          campaign,
          included: campaignCollection.included,
        }),
      ),
  );

  campaignCollection.data.forEach((campaign) => {
    const related = includedForResource(campaign, campaignCollection.included);
    const campaignMessages = related.filter((item) => (item.type || "").toLowerCase().includes("campaign-message"));

    rows.rawResourceRows.push(
      resourceToRawRow({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        family: "campaigns",
        endpointPath: campaignCollection.endpointPath,
        resource: campaign,
        included: related,
      }),
    );
    rows.campaignAudienceRows.push(
      ...audienceRelationshipRows({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        campaignId: campaign.id || "",
        resource: campaign,
      }),
    );
    rows.tagRelationshipRows.push(
      ...tagRelationshipRowsForResource({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        targetType: "campaign",
        targetId: campaign.id || "",
        resource: campaign,
        included: campaignCollection.included,
      }),
    );
    rows.campaignMessageRows.push(
      ...campaignMessages.map((message) =>
        messageToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          campaignId: campaign.id || "",
          message,
          included: campaignCollection.included,
        }),
      ),
    );
    rows.rawResourceRows.push(
      ...campaignMessages.map((message) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "campaign-messages",
          endpointPath: campaignCollection.endpointPath,
          resource: message,
          included: includedForResource(message, campaignCollection.included),
        }),
      ),
    );
    rows.tagRelationshipRows.push(
      ...campaignMessages.flatMap((message) =>
        tagRelationshipRowsForResource({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          targetType: "campaign_message",
          targetId: message.id || "",
          resource: message,
          included: campaignCollection.included,
        }),
      ),
    );
    rows.campaignAudienceRows.push(
      ...campaignMessages.flatMap((message) =>
        audienceRelationshipRows({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          campaignId: campaign.id || "",
          campaignMessageId: message.id,
          resource: message,
        }),
      ),
    );
  });

  for (const flow of flowCollection.data) {
    if (!flow.id) {
      continue;
    }

    rows.rawResourceRows.push(
      resourceToRawRow({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        family: "flows",
        endpointPath: flowCollection.endpointPath,
        resource: flow,
        included: includedForResource(flow, flowCollection.included),
      }),
    );
    rows.tagRelationshipRows.push(
      ...tagRelationshipRowsForResource({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        targetType: "flow",
        targetId: flow.id,
        resource: flow,
        included: flowCollection.included,
      }),
    );

    const actionCollection = await fetchKlaviyoCollectionOrWarn(rows, {
      ...client,
      path: `flows/${flow.id}/flow-actions`,
      label: `Flow actions for ${flow.id}`,
      pageLimit: 20,
    });

    for (const action of actionCollection.data) {
      if (!action.id) {
        continue;
      }

      const actionRow = flowActionToRow({
        regionId: params.regionId,
        syncRunId: params.syncRunId,
        flowId: flow.id || "",
        action,
        included: actionCollection.included,
      });

      rows.flowActionRows.push(actionRow);
      rows.tagRelationshipRows.push(
        ...tagRelationshipRowsForResource({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          targetType: "flow_action",
          targetId: action.id,
          resource: action,
          included: actionCollection.included,
        }),
      );
      rows.rawResourceRows.push(
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "flow-actions",
          endpointPath: actionCollection.endpointPath,
          resource: action,
          included: includedForResource(action, actionCollection.included),
        }),
      );

      const actionMessageCollection = await fetchKlaviyoCollectionOrWarn(rows, {
        ...client,
        path: `flow-actions/${action.id}/flow-messages`,
        label: `Flow messages for ${action.id}`,
        pageLimit: 20,
      });

      rows.flowMessageRows.push(
        ...actionMessageCollection.data.map((message) =>
          messageToRow({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            flowId: flow.id || "",
            actionId: action.id || "",
            message,
            included: actionMessageCollection.included,
          }),
        ),
      );
      rows.tagRelationshipRows.push(
        ...actionMessageCollection.data.flatMap((message) =>
          tagRelationshipRowsForResource({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            targetType: "flow_message",
            targetId: message.id || "",
            resource: message,
            included: actionMessageCollection.included,
          }),
        ),
      );
      rows.rawResourceRows.push(
        ...actionMessageCollection.data.map((message) =>
          resourceToRawRow({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            family: "flow-messages",
            endpointPath: actionMessageCollection.endpointPath,
            resource: message,
            included: includedForResource(message, actionMessageCollection.included),
          }),
        ),
      );
    }
  }

  rows.flowRows.push(
    ...flowCollection.data
      .filter((flow) => flow.id)
      .map((flow) =>
        flowToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          flow,
          included: flowCollection.included,
          messageRows: rows.flowMessageRows,
        }),
      ),
  );

  const rawCollections = await mapWithConcurrency(
    broadResourceDefinitions,
    3,
    async (definition) => {
      const collection = await fetchKlaviyoCollectionOrWarn(
        rows,
        {
          ...client,
          path: definition.path,
          label: definition.label,
          query: definition.include ? { include: definition.include } : undefined,
          pageSize: definition.pageSize,
          revision: definition.revision,
        },
        [400, 403, 404, 429, 500, 502, 503, 504],
      );

      return { definition, collection };
    },
  );

  rawCollections.forEach(({ definition, collection }) => {
    rows.rawResourceRows.push(
      ...collection.data.map((resource) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: definition.family,
          endpointPath: collection.endpointPath,
          resource,
          included: includedForResource(resource, collection.included),
        }),
      ),
    );

    if (definition.family === "lists" || definition.family === "segments") {
      rows.audienceRows.push(
        ...collection.data.map((audience) =>
          audienceToRow({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            audienceType: definition.family === "lists" ? "list" : "segment",
            audience,
          }),
        ),
      );
      rows.tagRelationshipRows.push(
        ...collection.data.flatMap((audience) =>
          tagRelationshipRowsForResource({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            targetType: definition.family === "lists" ? "list" : "segment",
            targetId: audience.id || "",
            resource: audience,
            included: collection.included,
          }),
        ),
      );
    }

    if (definition.family === "metrics") {
      rows.metricRows.push(
        ...collection.data.map((metric) =>
          metricToRow({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            metric,
          }),
        ),
      );
    }

    if (definition.family === "tags") {
      rows.tagRows.push(
        ...collection.data.map((tag) =>
          tagToRow({
            regionId: params.regionId,
            syncRunId: params.syncRunId,
            tag,
          }),
        ),
      );
    }
  });

  const metricResources = rawCollections.find(({ definition }) => definition.family === "metrics")?.collection.data || [];
  const conversionMetricId = pickConversionMetricId(metricResources, params.region.klaviyoConversionMetricId);

  try {
    const profileCollection = await fetchKlaviyoCollectionOrWarn(rows, {
      ...client,
      path: "profiles",
      label: "Profiles",
      query: { filter: `greater-than(updated,${params.startDate}T00:00:00+00:00)` },
      pageLimit: profilePageLimit,
    });

    rows.profileRows.push(
      ...profileCollection.data.map((profile) =>
        profileToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          profile,
        }),
      ),
    );
    rows.rawResourceRows.push(
      ...profileCollection.data.map((profile) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "profiles",
          endpointPath: profileCollection.endpointPath,
          resource: profile,
        }),
      ),
    );
  } catch (error) {
    rows.warnings.push(`Profiles: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown error")}`);
  }

  try {
    const eventCollection = await fetchKlaviyoCollectionOrWarn(rows, {
      ...client,
      path: "events",
      label: "Events",
      query: {
        filter: `and(greater-or-equal(datetime,${params.startDate}T00:00:00+00:00),less-than(datetime,${addDays(
          params.endDate,
          1,
        )}T00:00:00+00:00))`,
        include: "metric,profile",
      },
      pageLimit: eventPageLimit,
    });

    rows.eventRows.push(
      ...eventCollection.data.map((event) =>
        eventToRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          event,
        }),
      ),
    );
    rows.rawResourceRows.push(
      ...eventCollection.data.map((event) =>
        resourceToRawRow({
          regionId: params.regionId,
          syncRunId: params.syncRunId,
          family: "events",
          endpointPath: eventCollection.endpointPath,
          resource: event,
          included: includedForResource(event, eventCollection.included),
          occurredAt: readDate(event.attributes || {}, ["datetime", "timestamp", "event_time"]),
        }),
      ),
    );
  } catch (error) {
    rows.warnings.push(`Events: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown error")}`);
  }

  if (conversionMetricId) {
    const campaignNameById = resourceNameById(campaignCollection.data);
    const flowNameById = resourceNameById(flowCollection.data);
    const campaignReportRows: KlaviyoReportRow[] = [];
    const flowReportRows: KlaviyoReportRow[] = [];

    try {
      for (const metricDate of eachDate(params.startDate, params.endDate)) {
        const [campaignDayRows, flowDayRows] = await Promise.all([
          fetchKlaviyoValueReport({
            ...client,
            endpoint: "campaign-values-reports",
            label: `Campaign values for ${metricDate}`,
            metricDate,
            conversionMetricId,
            groupBy: ["campaign_id", "campaign_message_id"],
            objectIdKeys: ["campaign_id", "campaign"],
            objectNameById: campaignNameById,
          }),
          fetchKlaviyoValueReport({
            ...client,
            endpoint: "flow-values-reports",
            label: `Flow values for ${metricDate}`,
            metricDate,
            conversionMetricId,
            groupBy: ["flow_id", "flow_message_id"],
            objectIdKeys: ["flow_id", "flow"],
            objectNameById: flowNameById,
          }),
        ]);

        campaignReportRows.push(...campaignDayRows);
        flowReportRows.push(...flowDayRows);
      }

      const collapsedCampaignRows = collapseReportRows(campaignReportRows);
      const collapsedFlowRows = collapseReportRows(flowReportRows);

      rows.campaignReportRows.push(
        ...collapsedCampaignRows.map((row) => ({
          region_id: params.regionId,
          campaign_id: row.objectId,
          campaign_name: row.objectName,
          send_date: row.metricDate,
          recipients_count: Math.trunc(row.recipients),
          opens_count: Math.trunc(row.opens),
          clicks_count: Math.trunc(row.clicks),
          conversions_count: Math.trunc(row.conversions),
          revenue_amount: row.revenue,
          currency_code: params.region.currencyCode,
          updated_at: new Date().toISOString(),
        })),
      );
      rows.flowReportRows.push(
        ...collapsedFlowRows.map((row) => ({
          region_id: params.regionId,
          flow_id: row.objectId,
          flow_name: row.objectName,
          metric_date: row.metricDate,
          recipients_count: Math.trunc(row.recipients),
          opens_count: Math.trunc(row.opens),
          clicks_count: Math.trunc(row.clicks),
          conversions_count: Math.trunc(row.conversions),
          revenue_amount: row.revenue,
          currency_code: params.region.currencyCode,
          updated_at: new Date().toISOString(),
        })),
      );

      eachDate(params.startDate, params.endDate).forEach((metricDate) => {
        const campaignRowsForDate = collapsedCampaignRows.filter((row) => row.metricDate === metricDate);
        const flowRowsForDate = collapsedFlowRows.filter((row) => row.metricDate === metricDate);
        const campaignRevenue = campaignRowsForDate.reduce((sum, row) => sum + row.revenue, 0);
        const flowRevenue = flowRowsForDate.reduce((sum, row) => sum + row.revenue, 0);
        const allRowsForDate = [...campaignRowsForDate, ...flowRowsForDate];

        rows.dailyMetricRows.push({
          region_id: params.regionId,
          metric_date: metricDate,
          campaign_revenue_amount: campaignRevenue,
          flow_revenue_amount: flowRevenue,
          attributed_revenue_amount: campaignRevenue + flowRevenue,
          recipients_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.recipients, 0)),
          opens_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.opens, 0)),
          clicks_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.clicks, 0)),
          conversions_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.conversions, 0)),
          unsubscribes_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.unsubscribes, 0)),
          bounces_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.bounced, 0)),
          spam_complaints_count: Math.trunc(allRowsForDate.reduce((sum, row) => sum + row.spamComplaints, 0)),
          currency_code: params.region.currencyCode,
          updated_at: new Date().toISOString(),
        });
      });
    } catch (error) {
      rows.warnings.push(
        `Reporting API: ${sanitizeLogText(error instanceof Error ? error.message : "Unknown reporting error")}`,
      );
    }
  } else {
    rows.warnings.push(
      "Klaviyo reporting rows were skipped because no conversion metric ID was configured or detected.",
    );
  }

  console.info(
    `[sync:klaviyo] Region ${params.region.slug} produced ${rows.campaignRows.length} campaign(s), ${
      rows.flowRows.length
    } flow(s), ${rows.tagRelationshipRows.length} tag relationship row(s), ${
      rows.rawResourceRows.length
    } raw resource row(s), ${rows.campaignReportRows.length} campaign report row(s), and ${
      rows.flowReportRows.length
    } flow report row(s) for run ${params.syncRunId}.`,
  );

  return rows;
}
