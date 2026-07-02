-- File description:
-- This migration adds Klaviyo's native campaign-list performance fields to campaign report rows.
-- It keeps the original raw count columns for auditability while storing delivered denominators,
-- unique recipient action counts, and fractional rates exactly as the Klaviyo Reporting API returns them.

alter table public.klaviyo_campaign_reports
  add column if not exists delivered_count integer not null default 0,
  add column if not exists opens_unique_count integer not null default 0,
  add column if not exists clicks_unique_count integer not null default 0,
  add column if not exists conversions_unique_count integer not null default 0,
  add column if not exists open_rate numeric(12, 6) not null default 0,
  add column if not exists click_rate numeric(12, 6) not null default 0,
  add column if not exists conversion_rate numeric(12, 6) not null default 0,
  add column if not exists revenue_per_recipient numeric(14, 6) not null default 0;

-- Existing rows were synced before unique counts/rates were stored. This compatibility backfill preserves
-- their old visible values until the next Klaviyo sync refreshes them with exact Reporting API fields.
update public.klaviyo_campaign_reports
set
  delivered_count = case when delivered_count = 0 then recipients_count else delivered_count end,
  opens_unique_count = case when opens_unique_count = 0 then opens_count else opens_unique_count end,
  clicks_unique_count = case when clicks_unique_count = 0 then clicks_count else clicks_unique_count end,
  conversions_unique_count = case when conversions_unique_count = 0 then conversions_count else conversions_unique_count end,
  open_rate = case
    when open_rate = 0 and recipients_count > 0 then round((opens_count::numeric / recipients_count::numeric), 6)
    else open_rate
  end,
  click_rate = case
    when click_rate = 0 and recipients_count > 0 then round((clicks_count::numeric / recipients_count::numeric), 6)
    else click_rate
  end,
  conversion_rate = case
    when conversion_rate = 0 and recipients_count > 0 then round((conversions_count::numeric / recipients_count::numeric), 6)
    else conversion_rate
  end,
  revenue_per_recipient = case
    when revenue_per_recipient = 0 and recipients_count > 0 then round((revenue_amount::numeric / recipients_count::numeric), 6)
    else revenue_per_recipient
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'klaviyo_campaign_reports_native_metrics_nonnegative'
  ) then
    alter table public.klaviyo_campaign_reports
      add constraint klaviyo_campaign_reports_native_metrics_nonnegative check (
        delivered_count >= 0
        and opens_unique_count >= 0
        and clicks_unique_count >= 0
        and conversions_unique_count >= 0
        and open_rate >= 0
        and click_rate >= 0
        and conversion_rate >= 0
        and revenue_per_recipient >= 0
      );
  end if;
end $$;
