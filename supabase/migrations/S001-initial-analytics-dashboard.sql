-- File description:
-- This migration creates the initial reporting schema for the internal Shopify and Klaviyo dashboard.
-- It stores normalized regional metrics, campaign reports, flow reports, and sync audit history while
-- enabling Row Level Security so authenticated users can read reports and server-only sync code writes data.

create extension if not exists pgcrypto;

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  currency_code text not null default 'USD',
  timezone text not null default 'UTC',
  shopify_shop_domain text,
  klaviyo_account_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regions_slug_format check (slug ~ '^[a-z0-9-]+$'),
  constraint regions_currency_code_format check (currency_code ~ '^[A-Z]{3}$')
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  region_count integer not null default 0,
  message text,
  error_details text,
  created_at timestamptz not null default now(),
  constraint sync_runs_triggered_by_check check (triggered_by in ('cron', 'manual', 'system')),
  constraint sync_runs_status_check check (status in ('running', 'success', 'partial', 'failed'))
);

create table if not exists public.shopify_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  metric_date date not null,
  revenue_amount numeric(14, 2) not null default 0,
  orders_count integer not null default 0,
  customers_count integer not null default 0,
  refunds_amount numeric(14, 2) not null default 0,
  cancelled_orders_count integer not null default 0,
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopify_daily_metrics_unique unique (region_id, metric_date),
  constraint shopify_daily_metrics_currency_code_format check (currency_code ~ '^[A-Z]{3}$')
);

create table if not exists public.klaviyo_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  metric_date date not null,
  campaign_revenue_amount numeric(14, 2) not null default 0,
  flow_revenue_amount numeric(14, 2) not null default 0,
  attributed_revenue_amount numeric(14, 2) not null default 0,
  recipients_count integer not null default 0,
  opens_count integer not null default 0,
  clicks_count integer not null default 0,
  conversions_count integer not null default 0,
  unsubscribes_count integer not null default 0,
  bounces_count integer not null default 0,
  spam_complaints_count integer not null default 0,
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_daily_metrics_unique unique (region_id, metric_date),
  constraint klaviyo_daily_metrics_currency_code_format check (currency_code ~ '^[A-Z]{3}$')
);

create table if not exists public.klaviyo_campaign_reports (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  campaign_id text not null,
  campaign_name text not null,
  send_date date not null,
  recipients_count integer not null default 0,
  opens_count integer not null default 0,
  clicks_count integer not null default 0,
  conversions_count integer not null default 0,
  revenue_amount numeric(14, 2) not null default 0,
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_campaign_reports_unique unique (region_id, campaign_id, send_date),
  constraint klaviyo_campaign_reports_currency_code_format check (currency_code ~ '^[A-Z]{3}$')
);

create table if not exists public.klaviyo_flow_reports (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  flow_id text not null,
  flow_name text not null,
  metric_date date not null,
  recipients_count integer not null default 0,
  opens_count integer not null default 0,
  clicks_count integer not null default 0,
  conversions_count integer not null default 0,
  revenue_amount numeric(14, 2) not null default 0,
  currency_code text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_flow_reports_unique unique (region_id, flow_id, metric_date),
  constraint klaviyo_flow_reports_currency_code_format check (currency_code ~ '^[A-Z]{3}$')
);

create index if not exists regions_slug_idx on public.regions(slug);
create index if not exists regions_active_idx on public.regions(is_active);
create index if not exists sync_runs_started_at_idx on public.sync_runs(started_at desc);
create index if not exists sync_runs_status_started_at_idx on public.sync_runs(status, started_at desc);
create index if not exists shopify_daily_metrics_region_date_idx on public.shopify_daily_metrics(region_id, metric_date desc);
create index if not exists klaviyo_daily_metrics_region_date_idx on public.klaviyo_daily_metrics(region_id, metric_date desc);
create index if not exists klaviyo_campaign_reports_region_date_idx on public.klaviyo_campaign_reports(region_id, send_date desc);
create index if not exists klaviyo_campaign_reports_revenue_idx on public.klaviyo_campaign_reports(revenue_amount desc);
create index if not exists klaviyo_flow_reports_region_date_idx on public.klaviyo_flow_reports(region_id, metric_date desc);
create index if not exists klaviyo_flow_reports_revenue_idx on public.klaviyo_flow_reports(revenue_amount desc);

alter table public.regions enable row level security;
alter table public.sync_runs enable row level security;
alter table public.shopify_daily_metrics enable row level security;
alter table public.klaviyo_daily_metrics enable row level security;
alter table public.klaviyo_campaign_reports enable row level security;
alter table public.klaviyo_flow_reports enable row level security;

revoke all on table public.regions from anon;
revoke all on table public.sync_runs from anon;
revoke all on table public.shopify_daily_metrics from anon;
revoke all on table public.klaviyo_daily_metrics from anon;
revoke all on table public.klaviyo_campaign_reports from anon;
revoke all on table public.klaviyo_flow_reports from anon;

grant usage on schema public to authenticated;
grant select on table public.regions to authenticated;
grant select on table public.sync_runs to authenticated;
grant select on table public.shopify_daily_metrics to authenticated;
grant select on table public.klaviyo_daily_metrics to authenticated;
grant select on table public.klaviyo_campaign_reports to authenticated;
grant select on table public.klaviyo_flow_reports to authenticated;

grant select, insert, update, delete on table public.regions to service_role;
grant select, insert, update, delete on table public.sync_runs to service_role;
grant select, insert, update, delete on table public.shopify_daily_metrics to service_role;
grant select, insert, update, delete on table public.klaviyo_daily_metrics to service_role;
grant select, insert, update, delete on table public.klaviyo_campaign_reports to service_role;
grant select, insert, update, delete on table public.klaviyo_flow_reports to service_role;

create policy "Authenticated users can read regions"
  on public.regions for select
  to authenticated
  using (true);

create policy "Authenticated users can read sync runs"
  on public.sync_runs for select
  to authenticated
  using (true);

create policy "Authenticated users can read Shopify daily metrics"
  on public.shopify_daily_metrics for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo daily metrics"
  on public.klaviyo_daily_metrics for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo campaign reports"
  on public.klaviyo_campaign_reports for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo flow reports"
  on public.klaviyo_flow_reports for select
  to authenticated
  using (true);
