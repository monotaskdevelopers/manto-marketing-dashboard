-- File description:
-- This migration adds detailed Klaviyo campaign and flow sub-resource storage. It persists campaign
-- messages, campaign audience relationships, flow actions, and flow messages so reports can filter,
-- search, sort, and join against the same targeting/message data Klaviyo exposes through its APIs.

create extension if not exists pg_trgm;

alter table public.klaviyo_tag_relationships
  drop constraint if exists klaviyo_tag_relationships_target_type_check;

alter table public.klaviyo_tag_relationships
  add constraint klaviyo_tag_relationships_target_type_check check (
    target_type in (
      'list',
      'segment',
      'campaign',
      'flow',
      'campaign_message',
      'flow_action',
      'flow_message'
    )
  );

create table if not exists public.klaviyo_campaign_messages (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  campaign_id text not null,
  message_id text not null,
  name text not null,
  channel text,
  status text,
  subject text,
  preview_text text,
  from_email text,
  from_label text,
  reply_to_email text,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_campaign_messages_unique unique (region_id, message_id)
);

create table if not exists public.klaviyo_campaign_audiences (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  campaign_id text not null,
  campaign_message_id text not null default '',
  relationship_name text not null,
  audience_type text not null,
  audience_id text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_campaign_audiences_unique unique (
    region_id,
    campaign_id,
    campaign_message_id,
    relationship_name,
    audience_type,
    audience_id
  )
);

create table if not exists public.klaviyo_flow_actions (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  flow_id text not null,
  action_id text not null,
  action_type text,
  status text,
  name text,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_flow_actions_unique unique (region_id, action_id)
);

create table if not exists public.klaviyo_flow_messages (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  flow_id text not null,
  action_id text not null,
  message_id text not null,
  name text not null,
  channel text,
  status text,
  subject text,
  preview_text text,
  from_email text,
  from_label text,
  reply_to_email text,
  klaviyo_created_at timestamptz,
  klaviyo_updated_at timestamptz,
  search_text text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  last_seen_sync_run_id uuid references public.sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_flow_messages_unique unique (region_id, message_id)
);

create index if not exists klaviyo_campaign_messages_campaign_idx
  on public.klaviyo_campaign_messages(region_id, campaign_id);
create index if not exists klaviyo_campaign_messages_status_idx
  on public.klaviyo_campaign_messages(region_id, channel, status);
create index if not exists klaviyo_campaign_messages_search_idx
  on public.klaviyo_campaign_messages using gin (search_text gin_trgm_ops);
create index if not exists klaviyo_campaign_messages_payload_idx
  on public.klaviyo_campaign_messages using gin (raw_payload);

create index if not exists klaviyo_campaign_audiences_campaign_idx
  on public.klaviyo_campaign_audiences(region_id, campaign_id, relationship_name);
create index if not exists klaviyo_campaign_audiences_message_idx
  on public.klaviyo_campaign_audiences(region_id, campaign_message_id);
create index if not exists klaviyo_campaign_audiences_audience_idx
  on public.klaviyo_campaign_audiences(region_id, audience_type, audience_id);

create index if not exists klaviyo_flow_actions_flow_idx
  on public.klaviyo_flow_actions(region_id, flow_id, action_type);
create index if not exists klaviyo_flow_actions_status_idx
  on public.klaviyo_flow_actions(region_id, status, klaviyo_updated_at desc);
create index if not exists klaviyo_flow_actions_search_idx
  on public.klaviyo_flow_actions using gin (search_text gin_trgm_ops);
create index if not exists klaviyo_flow_actions_payload_idx
  on public.klaviyo_flow_actions using gin (raw_payload);

create index if not exists klaviyo_flow_messages_flow_idx
  on public.klaviyo_flow_messages(region_id, flow_id);
create index if not exists klaviyo_flow_messages_action_idx
  on public.klaviyo_flow_messages(region_id, action_id);
create index if not exists klaviyo_flow_messages_status_idx
  on public.klaviyo_flow_messages(region_id, channel, status);
create index if not exists klaviyo_flow_messages_search_idx
  on public.klaviyo_flow_messages using gin (search_text gin_trgm_ops);
create index if not exists klaviyo_flow_messages_payload_idx
  on public.klaviyo_flow_messages using gin (raw_payload);

alter table public.klaviyo_campaign_messages enable row level security;
alter table public.klaviyo_campaign_audiences enable row level security;
alter table public.klaviyo_flow_actions enable row level security;
alter table public.klaviyo_flow_messages enable row level security;

revoke all on table public.klaviyo_campaign_messages from anon;
revoke all on table public.klaviyo_campaign_audiences from anon;
revoke all on table public.klaviyo_flow_actions from anon;
revoke all on table public.klaviyo_flow_messages from anon;

grant select on table public.klaviyo_campaign_messages to authenticated;
grant select on table public.klaviyo_campaign_audiences to authenticated;
grant select on table public.klaviyo_flow_actions to authenticated;
grant select on table public.klaviyo_flow_messages to authenticated;

grant select, insert, update, delete on table public.klaviyo_campaign_messages to service_role;
grant select, insert, update, delete on table public.klaviyo_campaign_audiences to service_role;
grant select, insert, update, delete on table public.klaviyo_flow_actions to service_role;
grant select, insert, update, delete on table public.klaviyo_flow_messages to service_role;

create policy "Authenticated users can read Klaviyo campaign messages"
  on public.klaviyo_campaign_messages for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo campaign audiences"
  on public.klaviyo_campaign_audiences for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo flow actions"
  on public.klaviyo_flow_actions for select
  to authenticated
  using (true);

create policy "Authenticated users can read Klaviyo flow messages"
  on public.klaviyo_flow_messages for select
  to authenticated
  using (true);
