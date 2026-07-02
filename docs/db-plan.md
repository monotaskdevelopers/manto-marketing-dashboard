<!--
File description:
This file documents the database schema plan for the dashboard. It explains each table, why it exists,
which indexes are needed for fast reporting, how row-level security works, and what must be updated when
future schema changes are made.
-->

# Database Plan

## Database Purpose

Supabase Postgres stores normalized reporting data fetched from Shopify and Klaviyo. The dashboard reads
from local tables instead of calling external APIs on every page load. The active Klaviyo sync currently
writes only campaign, campaign status, campaign audience, campaign tag, and raw campaign/tag/audience
resource rows needed by the Campaigns table.

## Migration Files

| File | Purpose |
| --- | --- |
| `/supabase/migrations/S001-initial-analytics-dashboard.sql` | Creates the MVP reporting schema, indexes, grants, and RLS policies. |
| `/supabase/migrations/S002-platform-connections.sql` | Adds database-backed platform connection storage with encrypted secret columns and service-role-only access. |
| `/supabase/migrations/S003-comprehensive-klaviyo-sync.sql` | Adds Klaviyo profile, audience, membership, metric, event, tag, campaign, and flow storage. |
| `/supabase/migrations/S004-klaviyo-campaign-flow-detail-sync.sql` | Adds campaign messages, campaign audience relationships, flow actions, and flow messages for detailed Klaviyo reporting joins. |
| `/supabase/migrations/S005-klaviyo-raw-resource-ingestion.sql` | Adds promoted campaign/flow fields for channels, tags, audiences, A/B tests, and raw included payloads; adds `klaviyo_raw_resources` for broad Klaviyo JSON:API snapshots. |

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

### `platform_connections`

Stores one row per region for Shopify and Klaviyo connection state.

Important columns:

- `id`: UUID primary key.
- `region_id`: unique reference to `regions`.
- `shopify_shop_domain`: non-secret Shopify shop domain.
- `shopify_admin_token_ciphertext`: encrypted Shopify Admin API token.
- `shopify_connected_at`, `shopify_disconnected_at`: Shopify connection state timestamps.
- `klaviyo_account_label`: non-secret Klaviyo account label.
- `klaviyo_private_key_ciphertext`: encrypted Klaviyo private API key.
- `klaviyo_conversion_metric_id`: optional non-secret Klaviyo conversion metric ID that is
  auto-detected from the connected Klaviyo account when a new private key is saved.
- `klaviyo_connected_at`, `klaviyo_disconnected_at`: Klaviyo connection state timestamps.
- `created_by`, `updated_by`: authenticated user IDs for basic operational traceability.

Plain platform API keys must never be stored in this table.

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

### `klaviyo_profiles`

Stores one synced Klaviyo profile per region. This table contains recipient-level PII needed for internal
searching and filtering, so it must stay behind Supabase Auth and RLS.

Important columns:

- `region_id`.
- `profile_id`.
- `email`, `phone_number`, `external_id`.
- `first_name`, `last_name`, `organization`, `title`, `locale`.
- `location`, `properties`, `subscriptions`, `predictive_analytics` as JSONB.
- `klaviyo_created_at`, `klaviyo_updated_at`, `last_event_at`.
- `search_text` for indexed internal search.
- `raw_payload` for full Klaviyo JSON:API detail.

### `klaviyo_audiences`

Stores Klaviyo lists and segments together as audiences.

Important columns:

- `region_id`.
- `audience_type`: `list` or `segment`.
- `audience_id`.
- `name`.
- `opt_in_process` for lists.
- `is_active`, `is_starred` for segments.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `search_text`.
- `raw_payload`.

### `klaviyo_audience_memberships`

Stores profile membership in synced lists and segments.

Important columns:

- `region_id`.
- `audience_type`.
- `audience_id`.
- `profile_id`.
- `joined_group_at`.
- `raw_payload`.

### `klaviyo_metrics`

Stores Klaviyo account metrics so events and reports can be joined to metric names and integrations.

Important columns:

- `region_id`.
- `metric_id`.
- `name`.
- `integration_name`, `integration_category`.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `search_text`.
- `raw_payload`.

### `klaviyo_events`

Stores date-windowed Klaviyo events from the sync range. Events are append/update data and are not pruned
like full-snapshot tables.

Important columns:

- `region_id`.
- `event_id`, `event_uuid`.
- `metric_id`.
- `profile_id`.
- `event_datetime`, `event_timestamp`.
- `event_value`.
- `event_properties`.
- `raw_payload`.

### `klaviyo_tags`

Stores Klaviyo tags and optional tag-group metadata.

Important columns:

- `region_id`.
- `tag_id`.
- `name`.
- `tag_group_id`, `tag_group_name`.
- `search_text`.
- `raw_payload`.

### `klaviyo_tag_relationships`

Stores tag links to synced lists, segments, campaigns, flows, campaign messages, flow actions, and flow messages.

Important columns:

- `region_id`.
- `tag_id`.
- `target_type`: `list`, `segment`, `campaign`, `flow`, `campaign_message`, `flow_action`, or `flow_message`.
- `target_id`.
- `raw_payload`.

### `klaviyo_campaigns`

Stores Klaviyo campaign metadata separately from aggregate campaign report rows.

Important columns:

- `region_id`.
- `campaign_id`.
- `name`, `status`, `channel`, `archived`.
- `channel_list`, `tag_ids`, `audience_ids` for filterable promoted campaign relationships.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `scheduled_at`, `send_at`.
- `a_b_test`, `send_strategy`, `tracking_options`, `included_payload`.
- `search_text`.
- `raw_payload`.

### `klaviyo_campaign_messages`

Stores Klaviyo campaign message records so reports can filter and search at the message/channel level while
joining back to the campaign metadata table.

Important columns:

- `region_id`.
- `campaign_id`.
- `message_id`.
- `name`, `channel`, `status`.
- `subject`, `preview_text`, `from_email`, `from_label`, `reply_to_email`.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `tag_ids`, `content`, `render_options`, `included_payload`.
- `search_text`.
- `raw_payload`.

### `klaviyo_campaign_audiences`

Stores campaign and campaign-message targeting relationships when Klaviyo exposes list, segment, or audience
relationships in the campaign API response.

Important columns:

- `region_id`.
- `campaign_id`.
- `campaign_message_id`: empty string when the relationship belongs directly to the campaign.
- `relationship_name`: original Klaviyo relationship key, such as `audiences`, `included-lists`, or `excluded-segments`.
- `audience_type`: normalized relationship resource type.
- `audience_id`.
- `raw_payload`.

### `klaviyo_flows`

Stores Klaviyo flow metadata separately from aggregate flow report rows.

Important columns:

- `region_id`.
- `flow_id`.
- `name`, `status`, `trigger_type`, `archived`.
- `channel_list`, `tag_ids`, `trigger_filters`, `included_payload`.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `search_text`.
- `raw_payload`.

### `klaviyo_flow_actions`

Stores Klaviyo flow action records so reports can join flow performance to the action chain and search/filter by
action status or type.

Important columns:

- `region_id`.
- `flow_id`.
- `action_id`.
- `action_type`, `status`, `name`.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `tag_ids`, `settings`, `included_payload`.
- `search_text`.
- `raw_payload`.

### `klaviyo_flow_messages`

Stores Klaviyo flow message records attached to flow actions.

Important columns:

- `region_id`.
- `flow_id`.
- `action_id`.
- `message_id`.
- `name`, `channel`, `status`.
- `subject`, `preview_text`, `from_email`, `from_label`, `reply_to_email`.
- `klaviyo_created_at`, `klaviyo_updated_at`.
- `tag_ids`, `content`, `render_options`, `included_payload`.
- `search_text`.
- `raw_payload`.

### `klaviyo_raw_resources`

Stores raw Klaviyo JSON:API resources across broad resource families such as accounts, catalogs, coupons,
forms, reviews, templates, tracking settings, web feeds, webhooks, and future Klaviyo API categories. Images
are intentionally excluded from ingestion.

Important columns:

- `region_id`.
- `resource_family`: local grouping such as `campaigns`, `flows`, `catalog-items`, or `webhooks`.
- `resource_type`: Klaviyo JSON:API `type`.
- `resource_id`: Klaviyo JSON:API `id`, unique per family/type/region.
- `endpoint_path`: API path used for the sync request.
- `resource_name`.
- `resource_created_at`, `resource_updated_at`, `occurred_at` for future date filters.
- `attributes`, `relationships`, `included_payload`, `raw_payload`.
- `last_seen_sync_run_id`, `synced_at`.

## Indexing Plan

Indexes target the dashboard's main filters:

- Region lookup by `slug`.
- Date range scans by `metric_date`.
- Region plus date filters for daily metrics.
- Revenue sorting for campaign and flow tables.
- Recent sync status lookup by `started_at`.
- Platform connection lookup by `region_id`.
- Active connected Shopify/Klaviyo state filters for sync.
- Klaviyo profile searches by email, phone number, external ID, profile dates, last event date, and trigram `search_text`.
- Klaviyo audience searches by type, name, created/updated dates, and trigram `search_text`.
- Klaviyo membership joins by audience and by profile.
- Klaviyo event reports by event date, metric/date, profile/date, and JSONB event properties.
- Klaviyo tag, campaign, flow, and metric searches by indexed names and `search_text`.
- Klaviyo campaign message searches by campaign, channel/status, raw payload JSONB, and `search_text`.
- Klaviyo campaign audience joins by campaign, message, audience type, and audience ID.
- Klaviyo flow action and flow message joins by flow/action/message, channel/status, raw payload JSONB, and `search_text`.
- Klaviyo raw resource scans by region, resource family, endpoint, resource created/updated dates, occurred date,
  name, JSONB attributes, relationships, and raw payload.

## RLS Plan

- Enable RLS on all public reporting tables.
- Authenticated users can select reporting data.
- No browser client can insert, update, or delete reporting rows.
- Server-side sync writes use Supabase service role only.
- Enable RLS on `platform_connections`.
- Do not grant `authenticated` direct access to `platform_connections`.
- Read and write `platform_connections` only through server-side service role code that returns sanitized summaries.
- Enable RLS on all Klaviyo tables.
- Authenticated users can select Klaviyo data for internal reporting.
- Anonymous users cannot read Klaviyo data.
- Future service-role sync code should be the only writer for Klaviyo data after ingestion is rebuilt.
- Campaign/flow detail tables and `klaviyo_raw_resources` follow the same authenticated-read and
  service-role-write posture.

## Data Retention

For MVP, keep all synced reporting rows indefinitely. The active Klaviyo sync writes snapshot-style campaign
metadata rows with `last_seen_sync_run_id` but does not prune stale rows yet. If broader profile, event, or
Reporting API ingestion is reintroduced, define retention and partitioning before enabling production-scale
backfills.

## Schema Change Rule

Any schema change must update this file and add a new numbered migration using the required naming convention:

`S###-{short-description}.sql`
