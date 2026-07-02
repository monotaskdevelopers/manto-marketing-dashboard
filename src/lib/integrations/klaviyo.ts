/*
File description:
This file contains server-only Klaviyo account helpers used by Settings and campaign sync. It detects the
preferred conversion metric through Klaviyo's Metrics API, keeps retry/error handling bounded, and avoids
logging API keys, raw payloads, profile data, or event data.
*/

import "server-only";

import { getKlaviyoRevision } from "@/lib/env";

type KlaviyoJson = Record<string, unknown>;
type KlaviyoQueryValue = string | number | boolean | string[] | null | undefined;

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

function readString(source: KlaviyoJson, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
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
    .replace(/pk_[A-Za-z0-9_-]+/g, "[redacted-klaviyo-key]");
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

async function klaviyoGetRequest(params: {
  privateKey: string;
  path: string;
  regionSlug: string;
  label: string;
  authorizationErrorMessage: string;
  rateLimitErrorMessage: string;
}) {
  const path = buildKlaviyoPath(params.path);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
      method: "GET",
      headers: {
        Authorization: `Klaviyo-API-Key ${params.privateKey}`,
        Accept: "application/vnd.api+json",
        revision: getKlaviyoRevision(),
      },
    });

    if (response.status === 401 || response.status === 403) {
      console.warn(`[klaviyo:metrics] ${params.label} unauthorized for region ${params.regionSlug}.`);
      throw new Error(params.authorizationErrorMessage);
    }

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const retryDelayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(Math.max(retryAfterSeconds * 1000, 500), 10_000)
        : Math.min(1000 * attempt, 5000);

      if (attempt < maxAttempts) {
        console.warn(
          `[klaviyo:metrics] ${params.label} rate limited for region ${params.regionSlug}; retrying attempt ${
            attempt + 1
          }/${maxAttempts} after ${retryDelayMs}ms.`,
        );
        await wait(retryDelayMs);
        continue;
      }

      console.warn(`[klaviyo:metrics] ${params.label} rate limited for region ${params.regionSlug}; retries exhausted.`);
      throw new Error(params.rateLimitErrorMessage);
    }

    if (!response.ok) {
      const responseText = await response.text();
      const summary = summarizeKlaviyoErrors(parseJsonText(responseText), responseText);

      console.warn(
        `[klaviyo:metrics] ${params.label} failed for region ${params.regionSlug}: ${response.status}. ${summary}`,
      );
      throw new Error(`Unable to fetch ${params.label.toLowerCase()} for region ${params.regionSlug}. ${summary}`);
    }

    return (await response.json()) as KlaviyoJson;
  }

  throw new Error(`Unable to fetch ${params.label.toLowerCase()} for region ${params.regionSlug}.`);
}

function metricFromResponseItem(value: unknown): KlaviyoMetricCandidate | null {
  const record = asRecord(value);
  const attributes = asRecord(record.attributes);
  const integration = asRecord(attributes.integration);
  const id = readString(record, ["id"]);
  const name = readString(attributes, ["name"]);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    integrationName: readString(integration, ["name"]),
    integrationCategory: readString(integration, ["category"]),
  };
}

function scoreConversionMetric(metric: KlaviyoMetricCandidate) {
  const name = metric.name.toLowerCase();
  const integrationName = metric.integrationName.toLowerCase();
  const integrationCategory = metric.integrationCategory.toLowerCase();
  const integrationText = `${integrationName} ${integrationCategory}`;
  let score = 0;

  // Prefer purchase/order metrics because downstream reporting should attribute revenue to commerce events.
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

  // Keep this lookup bounded because it runs in both Settings and campaign sync paths.
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

    nextPath = normalizeKlaviyoNextPath(readString(asRecord(payload.links), ["next"]));
    pageCount += 1;
  }

  const bestMetric = metrics
    .map((metric) => ({ metric, score: scoreConversionMetric(metric) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.metric;

  if (!bestMetric) {
    console.warn(`[klaviyo:metrics] No revenue conversion metric detected for region ${params.regionSlug}.`);
    return null;
  }

  console.info(
    `[klaviyo:metrics] Detected conversion metric "${bestMetric.name}" for region ${params.regionSlug}.`,
  );

  return bestMetric.id;
}
