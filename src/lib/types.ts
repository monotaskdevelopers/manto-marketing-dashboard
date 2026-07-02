/*
File description:
This file contains shared TypeScript types for database rows, computed dashboard data, sync results, and
region integration config. Keeping these types centralized reduces mismatches between pages, API routes,
and sync services.
*/

export type SyncStatus = "running" | "success" | "partial" | "failed";
export type SyncTrigger = "cron" | "manual" | "system";

export type RegionRow = {
  id: string;
  slug: string;
  name: string;
  currency_code: string;
  timezone: string;
  shopify_shop_domain: string | null;
  klaviyo_account_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShopifyDailyMetric = {
  id: string;
  region_id: string;
  metric_date: string;
  revenue_amount: number;
  orders_count: number;
  customers_count: number;
  refunds_amount: number;
  cancelled_orders_count: number;
  currency_code: string;
};

export type KlaviyoDailyMetric = {
  id: string;
  region_id: string;
  metric_date: string;
  campaign_revenue_amount: number;
  flow_revenue_amount: number;
  attributed_revenue_amount: number;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  conversions_count: number;
  unsubscribes_count: number;
  bounces_count: number;
  spam_complaints_count: number;
  currency_code: string;
};

export type KlaviyoCampaignReport = {
  id: string;
  region_id: string;
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

export type KlaviyoFlowReport = {
  id: string;
  region_id: string;
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

export type SyncRun = {
  id: string;
  triggered_by: SyncTrigger;
  status: SyncStatus;
  started_at: string;
  finished_at: string | null;
  region_count: number;
  message: string | null;
  error_details: string | null;
};

export type DashboardFilters = {
  preset: string;
  startDate: string;
  endDate: string;
  regionSlug: string;
};

export type RegionIntegrationConfig = {
  slug: string;
  name: string;
  currencyCode: string;
  timezone: string;
  shopifyShopDomain: string;
  shopifyAdminAccessToken: string;
  klaviyoPrivateKey: string;
  klaviyoAccountLabel?: string;
  klaviyoConversionMetricId?: string;
};

export type RegionalSummary = {
  region: RegionRow;
  shopifyRevenue: number;
  orders: number;
  customers: number;
  refunds: number;
  cancelledOrders: number;
  campaignRevenue: number;
  flowRevenue: number;
  klaviyoRevenue: number;
  recipients: number;
  opens: number;
  clicks: number;
  conversions: number;
};

export type TrendPoint = {
  date: string;
  shopifyRevenue: number;
  klaviyoRevenue: number;
  orders: number;
};

export type RankedCampaign = KlaviyoCampaignReport & {
  region_name: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
};

export type RankedFlow = KlaviyoFlowReport & {
  region_name: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenuePerRecipient: number;
};

export type DashboardData = {
  filters: DashboardFilters;
  regions: RegionRow[];
  selectedRegions: RegionRow[];
  latestSync: SyncRun | null;
  summary: RegionalSummary;
  regionalSummaries: RegionalSummary[];
  trend: TrendPoint[];
  topCampaigns: RankedCampaign[];
  topFlows: RankedFlow[];
  campaignRows: RankedCampaign[];
  flowRows: RankedFlow[];
};

export type SyncRunResult = {
  syncRunId: string;
  status: SyncStatus;
  message: string;
};
