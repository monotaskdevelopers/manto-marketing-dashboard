<!--
File description:
This file documents the database schema plan for the dashboard. It explains each table, why it exists,
which indexes are needed for fast reporting, how row-level security works, and what must be updated when
future schema changes are made.
-->

# Database Plan

## Database Purpose

Supabase Postgres stores normalized reporting data fetched from Shopify and Klaviyo. The dashboard reads from these local tables instead of calling external APIs on every page load.

## Migration Files

| File | Purpose |
| --- | --- |
| `/supabase/migrations/S001-initial-analytics-dashboard.sql` | Creates the MVP reporting schema, indexes, grants, and RLS policies. |

## Tables

### `regions`

Stores one row per reporting region.

Important columns:

- `id`: UUID primary key.
- `slug`: stable region identifier used in URLs and sync config.
- `name`: display label.
- `currency_code`: reporting currency for the region.
- `timezone`: region timezone.
- `shopify_shop_domain`: non-secret Shopify shop domain.
- `klaviyo_account_label`: non-secret Klaviyo account label.
- `is_active`: hides retired regions without deleting history.

### `sync_runs`

Stores every automatic or manual sync attempt.

Important columns:

- `id`: UUID primary key.
- `triggered_by`: `cron`, `manual`, or `system`.
- `status`: `running`, `success`, `partial`, or `failed`.
- `started_at`, `finished_at`: sync duration audit fields.
- `region_count`: number of regions attempted.
- `message`: non-secret summary.
- `error_details`: sanitized error details.

### `shopify_daily_metrics`

Stores one Shopify rollup row per region and date.

Important columns:

- `region_id`.
- `metric_date`.
- `revenue_amount`.
- `orders_count`.
- `customers_count`.
- `refunds_amount`.
- `cancelled_orders_count`.
- `currency_code`.

### `klaviyo_daily_metrics`

Stores one Klaviyo rollup row per region and date.

Important columns:

- `region_id`.
- `metric_date`.
- `campaign_revenue_amount`.
- `flow_revenue_amount`.
- `attributed_revenue_amount`.
- `recipients_count`.
- `opens_count`.
- `clicks_count`.
- `conversions_count`.
- `unsubscribes_count`.
- `bounces_count`.
- `spam_complaints_count`.
- `currency_code`.

### `klaviyo_campaign_reports`

Stores campaign-level reporting rows.

Important columns:

- `region_id`.
- `campaign_id`.
- `campaign_name`.
- `send_date`.
- `recipients_count`.
- `opens_count`.
- `clicks_count`.
- `conversions_count`.
- `revenue_amount`.
- `currency_code`.

### `klaviyo_flow_reports`

Stores flow-level reporting rows.

Important columns:

- `region_id`.
- `flow_id`.
- `flow_name`.
- `metric_date`.
- `recipients_count`.
- `opens_count`.
- `clicks_count`.
- `conversions_count`.
- `revenue_amount`.
- `currency_code`.

## Indexing Plan

Indexes target the dashboard's main filters:

- Region lookup by `slug`.
- Date range scans by `metric_date`.
- Region plus date filters for daily metrics.
- Revenue sorting for campaign and flow tables.
- Recent sync status lookup by `started_at`.

## RLS Plan

- Enable RLS on all public reporting tables.
- Authenticated users can select reporting data.
- No browser client can insert, update, or delete reporting rows.
- Server-side sync writes use Supabase service role only.

## Data Retention

For MVP, keep all synced reporting rows indefinitely. If tables grow too large, add a retention policy or monthly partitioning later.

## Schema Change Rule

Any schema change must update this file and add a new numbered migration using the required naming convention:

`S###-{short-description}.sql`
