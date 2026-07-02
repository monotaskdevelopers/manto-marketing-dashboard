/*
File description:
This file parses server-only region integration settings from REGION_CONFIG_JSON. It keeps platform
credentials out of client code and gives the sync service a typed list of Shopify/Klaviyo connections.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import type { RegionIntegrationConfig } from "@/lib/types";

const demoRegions: RegionIntegrationConfig[] = [
  {
    slug: "us",
    name: "United States",
    currencyCode: "USD",
    timezone: "America/New_York",
    shopifyShopDomain: "demo-us.myshopify.com",
    shopifyAdminAccessToken: "demo",
    klaviyoPrivateKey: "demo",
    klaviyoAccountLabel: "US Klaviyo",
  },
  {
    slug: "uk",
    name: "United Kingdom",
    currencyCode: "GBP",
    timezone: "Europe/London",
    shopifyShopDomain: "demo-uk.myshopify.com",
    shopifyAdminAccessToken: "demo",
    klaviyoPrivateKey: "demo",
    klaviyoAccountLabel: "UK Klaviyo",
  },
  {
    slug: "eu",
    name: "Europe",
    currencyCode: "EUR",
    timezone: "Europe/Berlin",
    shopifyShopDomain: "demo-eu.myshopify.com",
    shopifyAdminAccessToken: "demo",
    klaviyoPrivateKey: "demo",
    klaviyoAccountLabel: "EU Klaviyo",
  },
];

function assertString(value: unknown, field: string, index: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`REGION_CONFIG_JSON[${index}].${field} must be a non-empty string.`);
  }

  return value.trim();
}

export function getRegionConfigs(): RegionIntegrationConfig[] {
  if (isDemoMode()) {
    return demoRegions;
  }

  const rawConfig = process.env.REGION_CONFIG_JSON;

  if (!rawConfig) {
    throw new Error("Missing required environment variable: REGION_CONFIG_JSON");
  }

  const parsed = JSON.parse(rawConfig) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("REGION_CONFIG_JSON must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    const record = entry as Record<string, unknown>;

    return {
      slug: assertString(record.slug, "slug", index),
      name: assertString(record.name, "name", index),
      currencyCode: assertString(record.currencyCode, "currencyCode", index).toUpperCase(),
      timezone: assertString(record.timezone, "timezone", index),
      shopifyShopDomain: assertString(record.shopifyShopDomain, "shopifyShopDomain", index),
      shopifyAdminAccessToken: assertString(
        record.shopifyAdminAccessToken,
        "shopifyAdminAccessToken",
        index,
      ),
      klaviyoPrivateKey: assertString(record.klaviyoPrivateKey, "klaviyoPrivateKey", index),
      klaviyoAccountLabel:
        typeof record.klaviyoAccountLabel === "string" ? record.klaviyoAccountLabel : undefined,
      klaviyoConversionMetricId:
        typeof record.klaviyoConversionMetricId === "string"
          ? record.klaviyoConversionMetricId
          : undefined,
    };
  });
}
