-- File description:
-- This migration adds sync-date coverage tracking for Klaviyo campaign performance ingestion.
-- It records which report dates were successfully requested from Klaviyo, including dates that returned
-- zero campaign rows, so future cron/manual syncs can skip already-covered history before calling Klaviyo.

create table if not exists public.klaviyo_sync_date_coverage (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  sync_area text not null,
  coverage_date date not null,
  status text not null default 'success',
  row_count integer not null default 0,
  last_sync_run_id uuid references public.sync_runs(id) on delete set null,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klaviyo_sync_date_coverage_unique unique (region_id, sync_area, coverage_date),
  constraint klaviyo_sync_date_coverage_area_check check (sync_area in ('campaign-performance')),
  constraint klaviyo_sync_date_coverage_status_check check (status in ('success', 'failed')),
  constraint klaviyo_sync_date_coverage_row_count_nonnegative check (row_count >= 0)
);

create index if not exists klaviyo_sync_date_coverage_region_area_date_idx
  on public.klaviyo_sync_date_coverage(region_id, sync_area, coverage_date desc);

create index if not exists klaviyo_sync_date_coverage_region_status_idx
  on public.klaviyo_sync_date_coverage(region_id, sync_area, status, coverage_date desc);

-- Existing campaign report rows prove those dates have already been fetched at least once. Seeding coverage
-- prevents the first deploy after this migration from re-requesting the whole stored reporting history.
insert into public.klaviyo_sync_date_coverage (
  region_id,
  sync_area,
  coverage_date,
  status,
  row_count,
  last_synced_at,
  updated_at
)
select
  region_id,
  'campaign-performance',
  send_date,
  'success',
  count(*)::integer,
  coalesce(max(updated_at), now()),
  now()
from public.klaviyo_campaign_reports
group by region_id, send_date
on conflict (region_id, sync_area, coverage_date) do update
set
  status = excluded.status,
  row_count = greatest(public.klaviyo_sync_date_coverage.row_count, excluded.row_count),
  last_synced_at = greatest(public.klaviyo_sync_date_coverage.last_synced_at, excluded.last_synced_at),
  updated_at = now();

alter table public.klaviyo_sync_date_coverage enable row level security;

revoke all on table public.klaviyo_sync_date_coverage from anon;

grant select on table public.klaviyo_sync_date_coverage to authenticated;
grant select, insert, update, delete on table public.klaviyo_sync_date_coverage to service_role;

create policy "Authenticated users can read Klaviyo sync date coverage"
  on public.klaviyo_sync_date_coverage for select
  to authenticated
  using (true);
