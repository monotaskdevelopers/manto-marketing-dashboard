/*
File description:
This file provides explicit demo-only reporting data for local UI review when DEMO_MODE=true. It prevents
the application from needing live Shopify, Klaviyo, or Supabase credentials during early interface checks.
*/

import type {
  DashboardData,
  DashboardFilters,
  KlaviyoCampaignReport,
  KlaviyoDailyMetric,
  KlaviyoFlowReport,
  RegionRow,
  ShopifyDailyMetric,
  SyncRun,
} from "@/lib/types";
import { buildDashboardDataFromRows } from "@/lib/data/transform";

const now = new Date().toISOString();

export const demoRegionRows: RegionRow[] = [
  {
    id: "region-us",
    slug: "us",
    name: "United States",
    currency_code: "USD",
    timezone: "America/New_York",
    shopify_shop_domain: "demo-us.myshopify.com",
    klaviyo_account_label: "US Klaviyo",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "region-uk",
    slug: "uk",
    name: "United Kingdom",
    currency_code: "GBP",
    timezone: "Europe/London",
    shopify_shop_domain: "demo-uk.myshopify.com",
    klaviyo_account_label: "UK Klaviyo",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "region-eu",
    slug: "eu",
    name: "Europe",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    shopify_shop_domain: "demo-eu.myshopify.com",
    klaviyo_account_label: "EU Klaviyo",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

const baseDates = [
  "2026-06-26",
  "2026-06-27",
  "2026-06-28",
  "2026-06-29",
  "2026-06-30",
  "2026-07-01",
  "2026-07-02",
];

export const demoShopifyRows: ShopifyDailyMetric[] = demoRegionRows.flatMap((region, regionIndex) =>
  baseDates.map((date, dayIndex) => ({
    id: `shopify-${region.slug}-${date}`,
    region_id: region.id,
    metric_date: date,
    revenue_amount: 9400 + regionIndex * 2100 + dayIndex * 630,
    orders_count: 96 + regionIndex * 16 + dayIndex * 5,
    customers_count: 82 + regionIndex * 11 + dayIndex * 4,
    refunds_amount: 180 + regionIndex * 25,
    cancelled_orders_count: regionIndex + (dayIndex % 2),
    currency_code: region.currency_code,
  })),
);

export const demoKlaviyoRows: KlaviyoDailyMetric[] = demoRegionRows.flatMap((region, regionIndex) =>
  baseDates.map((date, dayIndex) => ({
    id: `klaviyo-${region.slug}-${date}`,
    region_id: region.id,
    metric_date: date,
    campaign_revenue_amount: 1800 + regionIndex * 360 + dayIndex * 115,
    flow_revenue_amount: 980 + regionIndex * 240 + dayIndex * 75,
    attributed_revenue_amount: 2780 + regionIndex * 600 + dayIndex * 190,
    recipients_count: 22000 + regionIndex * 3200 + dayIndex * 700,
    opens_count: 8800 + regionIndex * 1200 + dayIndex * 270,
    clicks_count: 1820 + regionIndex * 330 + dayIndex * 68,
    conversions_count: 118 + regionIndex * 22 + dayIndex * 7,
    unsubscribes_count: 42 + regionIndex * 7,
    bounces_count: 28 + regionIndex * 6,
    spam_complaints_count: 3 + regionIndex,
    currency_code: region.currency_code,
  })),
);

export const demoCampaignRows: KlaviyoCampaignReport[] = demoRegionRows.flatMap((region, regionIndex) =>
  ["Summer Launch", "VIP Reminder", "Weekend Offer", "Back In Stock"].map((name, itemIndex) => {
    const recipients = 7200 + itemIndex * 1400 + regionIndex * 900;
    const delivered = Math.max(0, recipients - (32 + itemIndex * 5 + regionIndex * 4));
    const opensUnique = 2600 + itemIndex * 330 + regionIndex * 260;
    const clicksUnique = 82 + itemIndex * 24 + regionIndex * 18;
    const conversionsUnique = 42 + itemIndex * 8 + regionIndex * 7;
    const revenue = 1450 + itemIndex * 620 + regionIndex * 510;

    return {
      id: `campaign-${region.slug}-${itemIndex}`,
      region_id: region.id,
      campaign_id: `${region.slug}-campaign-${itemIndex}`,
      campaign_name: name,
      send_date: baseDates[Math.min(itemIndex + regionIndex, baseDates.length - 1)],
      recipients_count: recipients,
      delivered_count: delivered,
      opens_count: opensUnique + 260 + itemIndex * 35,
      opens_unique_count: opensUnique,
      open_rate: delivered ? opensUnique / delivered : 0,
      clicks_count: clicksUnique + 24 + itemIndex * 7,
      clicks_unique_count: clicksUnique,
      click_rate: delivered ? clicksUnique / delivered : 0,
      conversions_count: conversionsUnique,
      conversions_unique_count: conversionsUnique,
      conversion_rate: delivered ? conversionsUnique / delivered : 0,
      revenue_amount: revenue,
      revenue_per_recipient: delivered ? revenue / delivered : 0,
      currency_code: region.currency_code,
    };
  }),
);

export const demoFlowRows: KlaviyoFlowReport[] = demoRegionRows.flatMap((region, regionIndex) =>
  ["Welcome Series", "Abandoned Checkout", "Post Purchase", "Winback"].map((name, itemIndex) => ({
    id: `flow-${region.slug}-${itemIndex}`,
    region_id: region.id,
    flow_id: `${region.slug}-flow-${itemIndex}`,
    flow_name: name,
    metric_date: baseDates[Math.min(itemIndex + 1, baseDates.length - 1)],
    recipients_count: 4100 + itemIndex * 900 + regionIndex * 600,
    opens_count: 1900 + itemIndex * 300 + regionIndex * 240,
    clicks_count: 430 + itemIndex * 84 + regionIndex * 55,
    conversions_count: 30 + itemIndex * 9 + regionIndex * 6,
    revenue_amount: 980 + itemIndex * 530 + regionIndex * 420,
    currency_code: region.currency_code,
  })),
);

export const demoSyncRun: SyncRun = {
  id: "demo-sync",
  triggered_by: "system",
  status: "success",
  started_at: now,
  finished_at: now,
  region_count: demoRegionRows.length,
  message: "Demo data loaded. Configure Supabase and platform credentials for live sync.",
  error_details: null,
};

export function getDemoDashboardData(filters: DashboardFilters): DashboardData {
  return buildDashboardDataFromRows({
    filters,
    regions: demoRegionRows,
    shopifyRows: demoShopifyRows,
    klaviyoRows: demoKlaviyoRows,
    campaignRows: demoCampaignRows,
    flowRows: demoFlowRows,
    latestSync: demoSyncRun,
  });
}
