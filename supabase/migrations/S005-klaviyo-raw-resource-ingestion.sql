-- File description:
-- This migration adds the generic Klaviyo raw resource table used by the rebuilt ingestion pipeline.
-- It also promotes campaign and flow relationship fields that operators need for filtering, including
-- channel lists, tag IDs, audience IDs, A/B test metadata, and archived/status details while preserving
-- the original JSON:API payload for future Klaviyo fields.

create extension if not exists pg_trgm;

alter table public.klaviyo_campaigns
  add column if not exists channel_list text[] not null default '{}'::text[],
  add column if not exists tag_ids text[] not null default '{}'::text[],
  add column if not exists audience_ids text[] not null default '{}'::text[],
  add column if not exists included_payload jsonb not null default '[]'::jsonb,
  add column if not exists a_b_test jsonb not null default '{}'::jsonb,
  add column if not exists send_strategy jsonb not null default '{}'::jsonb,
  add column if not exists tracking_options jsonb not null default '{}'::jsonb;

alter table public.klaviyo_flows
  add column if not exists channel_list text[] not null default '{}'::text[],
  add column if not exists tag_ids text[] not null default '{}'::text[],
  add column if not exists included_payload jsonb not null default '[]'::jsonb,
  add column if not exists trigger_filters jsonb not null default '{}'::jsonb;

alter table public.klaviyo_campaign_messages
  add column if not exists tag_ids text[] not null default '{}'::text[],
  add column if not exists included_payload jsonb not null default '[]'::jsonb,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists render_options jsonb not null default '{}'::jsonb;

alter table public.klaviyo_flow_actions
  add column if not exists tag_ids text[] not null default '{}'::text[],
  add column if not exists included_payload jsonb not null default '[]'::jsonb,
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.klaviyo_flow_messages
  add column if not exists tag_ids text[] not null default '{}'::text[],
  add column if not exists included_payload jsonb not null default '[]'::jsonb,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists render_options jsonb not null default '{}'::jsonb;

create table if not exists public.klaviyo_raw_resources (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  resource_family text not null,
  resource_type text not null,
  resource_id text not null,
  endpoint_path text not null,
  resource_name text,
  resource_created_at timestamptz,
  resource_updated_at timestamptz,
  occurred_at timestamptz,
  attributes jsonb not null default '{}'::jsonb,
  relationships jsonb not null default '{}'::jsonb,
  included_payload jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_raw_resources_unique unique (region_id, resource_family, resource_type, resource_id)
);

create index if not exists klaviyo_campaigns_channel_list_idx
  on public.klaviyo_campaigns using gin (channel_list);
create index if not exists klaviyo_campaigns_tag_ids_idx
  on public.klaviyo_campaigns using gin (tag_ids);
create index if not exists klaviyo_campaigns_audience_ids_idx
  on public.klaviyo_campaigns using gin (audience_ids);
create index if not exists klaviyo_campaigns_included_payload_idx
  on public.klaviyo_campaigns using gin (included_payload);

create index if not exists klaviyo_flows_channel_list_idx
  on public.klaviyo_flows using gin (channel_list);
create index if not exists klaviyo_flows_tag_ids_idx
  on public.klaviyo_flows using gin (tag_ids);
create index if not exists klaviyo_flows_included_payload_idx
  on public.klaviyo_flows using gin (included_payload);

create index if not exists klaviyo_raw_resources_family_updated_idx
  on public.klaviyo_raw_resources(region_id, resource_family, resource_updated_at desc);
create index if not exists klaviyo_raw_resources_family_created_idx
  on public.klaviyo_raw_resources(region_id, resource_family, resource_created_at desc);
create index if not exists klaviyo_raw_resources_occurred_idx
  on public.klaviyo_raw_resources(region_id, resource_family, occurred_at desc);
create index if not exists klaviyo_raw_resources_name_idx
  on public.klaviyo_raw_resources(region_id, resource_family, resource_name);
create index if not exists klaviyo_raw_resources_endpoint_idx
  on public.klaviyo_raw_resources(region_id, endpoint_path);
create index if not exists klaviyo_raw_resources_attributes_idx
  on public.klaviyo_raw_resources using gin (attributes);
create index if not exists klaviyo_raw_resources_relationships_idx
  on public.klaviyo_raw_resources using gin (relationships);
create index if not exists klaviyo_raw_resources_payload_idx
  on public.klaviyo_raw_resources using gin (raw_payload);

alter table public.klaviyo_raw_resources enable row level security;

revoke all on table public.klaviyo_raw_resources from anon;

grant select on table public.klaviyo_raw_resources to authenticated;
grant select, insert, update, delete on table public.klaviyo_raw_resources to service_role;

create policy "Authenticated users can read Klaviyo raw resources"
  on public.klaviyo_raw_resources for select
  to authenticated
  using (true);
