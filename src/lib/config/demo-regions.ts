/*
File description:
This file contains the demo region connection records used only when DEMO_MODE is enabled. Keeping demo
regions separate lets the Settings page and sync loader share the same harmless sample metadata without
touching real platform credentials.
*/

import type { RegionIntegrationConfig } from "@/lib/types";

export const demoRegions: RegionIntegrationConfig[] = [
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
