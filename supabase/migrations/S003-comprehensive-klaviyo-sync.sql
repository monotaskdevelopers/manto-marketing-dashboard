-- File description:
-- This migration expands Klaviyo storage beyond aggregate reporting rows. It adds searchable, date-filterable
-- tables for profiles, audiences, audience memberships, metrics, events, tags, campaigns, and flows while
-- preserving the full Klaviyo JSON:API payload for future reporting fields that are not promoted yet.

create extension if not exists pg_trgm;

create table if not exists public.klaviyo_profiles (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  profile_id text not null,
  email text,
  phone_number text,
  external_id text,
  first_name text,
  last_name text,
  organization text,
  title text,
  locale text,
  location jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  subscriptions jsonb not null default '{}'::jsonb,
  predictive_analytics jsonb not null default '{}'::jsonb,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  last_event_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_profiles_unique unique (region_id, profile_id)
);

create table if not exists public.klaviyo_audiences (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  audience_type text not null,
  audience_id text not null,
  name text not null,
  opt_in_process text,
  is_active boolean,
  is_starred boolean,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_audiences_type_check check (audience_type in ('list', 'segment')),
  constraint klaviyo_audiences_unique unique (region_id, audience_type, audience_id)
);

create table if not exists public.klaviyo_audience_memberships (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  audience_type text not null,
  audience_id text not null,
  profile_id text not null,
  joined_group_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_audience_memberships_type_check check (audience_type in ('list', 'segment')),
  constraint klaviyo_audience_memberships_unique unique (region_id, audience_type, audience_id, profile_id)
);

create table if not exists public.klaviyo_metrics (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  metric_id text not null,
  name text not null,
  integration_name text,
  integration_category text,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_metrics_unique unique (region_id, metric_id)
);

create table if not exists public.klaviyo_events (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  event_id text not null,
  event_uuid text,
  metric_id text,
  profile_id text,
  event_datetime timestamptz,
  event_timestamp bigint,
  event_value numeric(14, 2),
  event_properties jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_events_unique unique (region_id, event_id)
);

create table if not exists public.klaviyo_tags (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  tag_id text not null,
  name text not null,
  tag_group_id text,
  tag_group_name text,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_tags_unique unique (region_id, tag_id)
);

create table if not exists public.klaviyo_tag_relationships (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  tag_id text not null,
  target_type text not null,
  target_id text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_tag_relationships_target_type_check check (
    target_type in ('list', 'segment', 'campaign', 'flow')
  ),
  constraint klaviyo_tag_relationships_unique unique (region_id, tag_id, target_type, target_id)
);

create table if not exists public.klaviyo_campaigns (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  campaign_id text not null,
  name text not null,
  status text,
  channel text,
  archived boolean,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  scheduled_at timestamptz,
  send_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_campaigns_unique unique (region_id, campaign_id)
);

create table if not exists public.klaviyo_flows (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  flow_id text not null,
  name text not null,
  status text,
  trigger_type text,
  archived boolean,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_flows_unique unique (region_id, flow_id)
);

create index if not exists klaviyo_profiles_region_created_idx
  on public.klaviyo_profiles(region_id, klaviyo_created_at desc);
create index if not exists klaviyo_profiles_region_updated_idx
  on public.klaviyo_profiles(region_id, klaviyo_updated_at desc);
create index if not exists klaviyo_profiles_last_event_idx
  on public.klaviyo_profiles(region_id, last_event_at desc);
create index if not exists klaviyo_profiles_email_idx
  on public.klaviyo_profiles(region_id, email);
create index if not exists klaviyo_profiles_phone_idx
  on public.klaviyo_profiles(region_id, phone_number);
create index if not exists klaviyo_profiles_external_idx
  on public.klaviyo_profiles(region_id, external_id);
create index if not exists klaviyo_profiles_search_idx
  on public.klaviyo_profiles using gin (search_text gin_trgm_ops);
create index if not exists klaviyo_profiles_properties_idx
  on public.klaviyo_profiles using gin (properties);
create index if not exists klaviyo_profiles_subscriptions_idx
  on public.klaviyo_profiles using gin (subscriptions);

create index if not exists klaviyo_audiences_region_type_name_idx
  on public.klaviyo_audiences(region_id, audience_type, name);
create index if not exists klaviyo_audiences_created_idx
  on public.klaviyo_audiences(region_id, klaviyo_created_at desc);
create index if not exists klaviyo_audiences_updated_idx
  on public.klaviyo_audiences(region_id, klaviyo_updated_at desc);
create index if not exists klaviyo_audiences_search_idx
  on public.klaviyo_audiences using gin (search_text gin_trgm_ops);

create index if not exists klaviyo_audience_memberships_audience_idx
  on public.klaviyo_audience_memberships(region_id, audience_type, audience_id, joined_group_at desc);
create index if not exists klaviyo_audience_memberships_profile_idx
  on public.klaviyo_audience_memberships(region_id, profile_id);

create index if not exists klaviyo_metrics_region_name_idx
  on public.klaviyo_metrics(region_id, name);
create index if not exists klaviyo_metrics_search_idx
  on public.klaviyo_metrics using gin (search_text gin_trgm_ops);

create index if not exists klaviyo_events_region_datetime_idx
  on public.klaviyo_events(region_id, event_datetime desc);
create index if not exists klaviyo_events_metric_datetime_idx
  on public.klaviyo_events(region_id, metric_id, event_datetime desc);
create index if not exists klaviyo_events_profile_datetime_idx
  on public.klaviyo_events(region_id, profile_id, event_datetime desc);
create index if not exists klaviyo_events_properties_idx
  on public.klaviyo_events using gin (event_properties);

create index if not exists klaviyo_tags_region_name_idx
  on public.klaviyo_tags(region_id, name);
create index if not exists klaviyo_tags_search_idx
  on public.klaviyo_tags using gin (search_text gin_trgm_ops);

create index if not exists klaviyo_tag_relationships_target_idx
  on public.klaviyo_tag_relationships(region_id, target_type, target_id);

create index if not exists klaviyo_campaigns_region_status_idx
  on public.klaviyo_campaigns(region_id, status, scheduled_at desc);
create index if not exists klaviyo_campaigns_created_idx
  on public.klaviyo_campaigns(region_id, klaviyo_created_at desc);
create index if not exists klaviyo_campaigns_search_idx
  on public.klaviyo_campaigns using gin (search_text gin_trgm_ops);

create index if not exists klaviyo_flows_region_status_idx
  on public.klaviyo_flows(region_id, status, klaviyo_updated_at desc);
create index if not exists klaviyo_flows_trigger_idx
  on public.klaviyo_flows(region_id, trigger_type);
create index if not exists klaviyo_flows_search_idx
  on public.klaviyo_flows using gin (search_text gin_trgm_ops);

alter table public.klaviyo_profiles enable row level security;
alter table public.klaviyo_audiences enable row level security;
alter table public.klaviyo_audience_memberships enable row level security;
alter table public.klaviyo_metrics enable row level security;
alter table public.klaviyo_events enable row level security;
alter table public.klaviyo_tags enable row level security;
alter table public.klaviyo_tag_relationships enable row level security;
alter table public.klaviyo_campaigns enable row level security;
alter table public.klaviyo_flows enable row level security;

revoke all on table public.klaviyo_profiles from anon;
revoke all on table public.klaviyo_audiences from anon;
revoke all on table public.klaviyo_audience_memberships from anon;
revoke all on table public.klaviyo_metrics from anon;
revoke all on table public.klaviyo_events from anon;
revoke all on table public.klaviyo_tags from anon;
revoke all on table public.klaviyo_tag_relationships from anon;
revoke all on table public.klaviyo_campaigns from anon;
revoke all on table public.klaviyo_flows from anon;

grant select on table public.klaviyo_profiles to authenticated;
grant select on table public.klaviyo_audiences to authenticated;
grant select on table public.klaviyo_audience_memberships to authenticated;
grant select on table public.klaviyo_metrics to authenticated;
grant select on table public.klaviyo_events to authenticated;
grant select on table public.klaviyo_tags to authenticated;
grant select on table public.klaviyo_tag_relationships to authenticated;
grant select on table public.klaviyo_campaigns to authenticated;
grant select on table public.klaviyo_flows to authenticated;

grant select, insert, update, delete on table public.klaviyo_profiles to service_role;
grant select, insert, update, delete on table public.klaviyo_audiences to service_role;
grant select, insert, update, delete on table public.klaviyo_audience_memberships to service_role;
grant select, insert, update, delete on table public.klaviyo_metrics to service_role;
grant select, insert, update, delete on table public.klaviyo_events to service_role;
grant select, insert, update, delete on table public.klaviyo_tags to service_role;
grant select, insert, update, delete on table public.klaviyo_tag_relationships to service_role;
grant select, insert, update, delete on table public.klaviyo_campaigns to service_role;
grant select, insert, update, delete on table public.klaviyo_flows to service_role;

create policy "Authenticated users can read Klaviyo profiles"
  on public.klaviyo_profiles for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo audiences"
  on public.klaviyo_audiences for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo audience memberships"
  on public.klaviyo_audience_memberships for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo metrics"
  on public.klaviyo_metrics for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo events"
  on public.klaviyo_events for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo tags"
  on public.klaviyo_tags for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo tag relationships"
  on public.klaviyo_tag_relationships for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo campaigns"
  on public.klaviyo_campaigns for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo flows"
  on public.klaviyo_flows for select
  to authenticated
  using (true);
