-- File description:
-- This migration adds database-backed platform connection storage for Shopify and Klaviyo accounts.
-- It stores non-secret connection metadata plus encrypted secret ciphertext, keeps direct browser access
-- blocked with RLS and grants, and lets server-only service-role code manage connections safely.

create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  shopify_shop_domain text,
  shopify_admin_token_ciphertext text,
  shopify_connected_at timestamptz,
  shopify_disconnected_at timestamptz,
  klaviyo_account_label text,
  klaviyo_private_key_ciphertext text,
  klaviyo_conversion_metric_id text,
  klaviyo_connected_at timestamptz,
  klaviyo_disconnected_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_connections_region_unique unique (region_id),
  constraint platform_connections_shopify_domain_format check (
    shopify_shop_domain is null
    or shopify_shop_domain ~ '^[a-zA-Z0-9][a-zA-Z0-9.-]*\.myshopify\.com$'
  )
);

create index if not exists platform_connections_region_idx
  on public.platform_connections(region_id);

create index if not exists platform_connections_shopify_connected_idx
  on public.platform_connections(region_id)
  where shopify_admin_token_ciphertext is not null and shopify_disconnected_at is null;

create index if not exists platform_connections_klaviyo_connected_idx
  on public.platform_connections(region_id)
  where klaviyo_private_key_ciphertext is not null and klaviyo_disconnected_at is null;

alter table public.platform_connections enable row level security;

revoke all on table public.platform_connections from anon;
revoke all on table public.platform_connections from authenticated;

grant select, insert, update, delete on table public.platform_connections to service_role;

-- No authenticated policy is intentionally created. Settings and sync code must access this table through
-- server-only service-role helpers so encrypted secrets cannot be selected through browser clients.
