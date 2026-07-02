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

export type KlaviyoProfile = {
  id: string;
  region_id: string;
  profile_id: string;
  email: string | null;
  phone_number: string | null;
  external_id: string | null;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  title: string | null;
  locale: string | null;
  location: Record<string, unknown>;
  properties: Record<string, unknown>;
  subscriptions: Record<string, unknown>;
  predictive_analytics: Record<string, unknown>;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  last_event_at: string | null;
  search_text: string;
};

export type KlaviyoAudience = {
  id: string;
  region_id: string;
  audience_type: "list" | "segment";
  audience_id: string;
  name: string;
  opt_in_process: string | null;
  is_active: boolean | null;
  is_starred: boolean | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
};

export type KlaviyoAudienceMembership = {
  id: string;
  region_id: string;
  audience_type: "list" | "segment";
  audience_id: string;
  profile_id: string;
  joined_group_at: string | null;
};

export type KlaviyoMetric = {
  id: string;
  region_id: string;
  metric_id: string;
  name: string;
  integration_name: string | null;
  integration_category: string | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
};

export type KlaviyoEvent = {
  id: string;
  region_id: string;
  event_id: string;
  event_uuid: string | null;
  metric_id: string | null;
  profile_id: string | null;
  event_datetime: string | null;
  event_timestamp: number | null;
  event_value: number | null;
  event_properties: Record<string, unknown>;
};

export type KlaviyoTag = {
  id: string;
  region_id: string;
  tag_id: string;
  name: string;
  tag_group_id: string | null;
  tag_group_name: string | null;
  search_text: string;
};

export type KlaviyoTagRelationship = {
  id: string;
  region_id: string;
  tag_id: string;
  target_type: "list" | "segment" | "campaign" | "flow";
  target_id: string;
};

export type KlaviyoCampaign = {
  id: string;
  region_id: string;
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
};

export type KlaviyoFlow = {
  id: string;
  region_id: string;
  flow_id: string;
  name: string;
  status: string | null;
  trigger_type: string | null;
  archived: boolean | null;
  klaviyo_created_at: string | null;
  klaviyo_updated_at: string | null;
  search_text: string;
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
  shopifyShopDomain?: string;
  shopifyAdminAccessToken?: string;
  klaviyoPrivateKey?: string;
  klaviyoAccountLabel?: string;
  klaviyoConversionMetricId?: string;
};

export type PlatformConnectionSummary = {
  id: string | null;
  regionId: string;
  slug: string;
  name: string;
  currencyCode: string;
  timezone: string;
  isActive: boolean;
  shopifyShopDomain: string | null;
  shopifyConnected: boolean;
  shopifyConnectedAt: string | null;
  shopifyDisconnectedAt: string | null;
  klaviyoAccountLabel: string | null;
  klaviyoConnected: boolean;
  klaviyoConnectedAt: string | null;
  klaviyoDisconnectedAt: string | null;
  klaviyoConversionMetricId: string | null;
  updatedAt: string | null;
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
  unsubscribes: number;
  bounces: number;
  spamComplaints: number;
};

export type TrendPoint = {
  date: string;
  shopifyRevenue: number;
  klaviyoRevenue: number;
  orders: number;
};

export type KlaviyoTrendPoint = {
  date: string;
  campaignRevenue: number;
  flowRevenue: number;
  attributedRevenue: number;
  recipients: number;
  opens: number;
  clicks: number;
  conversions: number;
  unsubscribes: number;
  bounces: number;
  spamComplaints: number;
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
  klaviyoTrend: KlaviyoTrendPoint[];
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
