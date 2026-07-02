<!--
File description:
This file maps the current Klaviyo campaign ingestion slice to the dashboard database. It records the
only Klaviyo resources that should sync right now, the tables that receive them, the endpoints involved,
and the debugging rules for keeping sync failures clear without reintroducing broad account crawls.
-->

# Klaviyo API Ingestion Plan

## Purpose

The active Klaviyo sync is intentionally narrow. For now, it should fetch only campaign data needed by the
Campaigns table:

- Campaigns.
- Campaign status.
- Campaign audiences.
- Campaign tags and campaign tag IDs.
- Campaign performance values for open rate, click rate, conversions, and placed-order revenue.

Do not add flows, metrics, profiles, events, lists, segments, catalogs, coupons, forms, reviews, templates,
web feeds, webhooks, images, or broad raw-resource crawling back into the active Klaviyo sync without a new
product scope decision.

## Official Klaviyo API Documentation Reviewed

- Campaigns API: `https://developers.klaviyo.com/en/reference/get_campaigns`
- Campaign audience beta API: `https://developers.klaviyo.com/en/reference/get_campaign_audience_beta`
- Campaign tags API: `https://developers.klaviyo.com/en/reference/get_tags_for_campaign`
- Campaign tag IDs API: `https://developers.klaviyo.com/en/reference/get_tag_ids_for_campaign`
- Campaign values report API: `https://developers.klaviyo.com/en/reference/query_campaign_values`
- API overview and category index: `https://developers.klaviyo.com/en/reference/api_overview`
- API authentication: `https://developers.klaviyo.com/en/docs/authenticate_`
- API versioning and deprecation policy: `https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy`

## Current Implementation

Code path:

- `src/lib/integrations/klaviyo-sync.ts`
- `src/lib/sync/run-sync.ts`
- `supabase/migrations/S005-klaviyo-raw-resource-ingestion.sql`

Current synced data:

| Klaviyo area | Current sync behavior | Database target |
| --- | --- | --- |
| Campaigns | Fetches email, SMS, and mobile push campaigns. Promotes name, status, channel list, archived flag, A/B test metadata, send dates, and raw campaign payload. | `klaviyo_campaigns`, `klaviyo_raw_resources` |
| Campaign status | Stored from each campaign's attributes and rendered by the Campaigns table filters/status pill. Archived campaigns are treated as archived in UI filtering. | `klaviyo_campaigns.status`, `klaviyo_campaigns.archived` |
| Campaign tags | Uses `GET /campaigns?include=tags` as the primary source for campaign tag IDs/resources, then falls back to campaign-scoped tag/tag-ID endpoints only when a campaign payload lacks tag relationships. Per-campaign fallback endpoints do not send `page[size]` because Klaviyo rejects pagination on these relationship resources. | `klaviyo_tags`, `klaviyo_tag_relationships`, `klaviyo_raw_resources` |
| Campaign audiences | Uses beta `GET /campaigns?include=campaign-audiences` with the `.pre` revision to build one campaign-to-audience relationship map instead of probing every campaign with audience endpoints. | `klaviyo_campaign_audiences`, `klaviyo_campaigns.audience_ids`, `klaviyo_raw_resources` |
| Campaign performance | Uses one `POST /campaign-values-reports` request per metric day in the region sync window with the configured or auto-detected conversion metric ID. Requests include `campaign_id`, `campaign_message_id`, and `send_channel` groupings, then collapse grouped results to campaign/day rows before upsert. | `klaviyo_campaign_reports` |

## Date-Scopable Reporting Rules

- Campaign report rows use `klaviyo_campaign_reports.send_date` as the daily metric date for
  `campaign-values-reports` results. The column name is historical; daily performance ingestion should not
  rewrite report rows back to the campaign's send date.
- Campaign report rows store Klaviyo native `open_rate`, `click_rate`, `conversion_rate`,
  `revenue_per_recipient`, `delivered`, `opens_unique`, `clicks_unique`, and `conversion_uniques` fields.
  Campaigns UI should display those exact rates/counts instead of recomputing from raw opens/clicks over
  `recipients`.
- Campaign metadata fallback rows use `send_at`, then `scheduled_at`, then Klaviyo update/create dates as
  their local date dimension when campaign report rows are not present.
- The Campaigns page still respects the shared `preset`, `start`, and `end` URL filters.
- The Campaigns page also respects the shared `region` URL filter and renders a Region table column.

## Debugging And Rate-Limit Rules

- Logs must show stage start/end, region slug, run ID, endpoint path, revision, status code, retry attempts,
  skipped optional endpoint warnings, and produced row counts.
- Logs must not include API keys, auth headers, raw payloads, customer PII, or recipient-level data.
- Campaigns are required. If campaign fetch fails after retries, the Klaviyo region should fail clearly.
- Campaign tag fallback and campaign-audience relationship-map lookups are optional. After bounded retries,
  they should warn and continue so campaign status and core campaign metadata can still sync.
- Campaign performance lookup is optional. If Klaviyo rejects a daily Reporting API request or no conversion
  metric ID is configured/detectable, sync should log a sanitized warning and keep metadata rows.
- Pace daily campaign performance requests because Klaviyo limits campaign values reports to a low steady
  request rate. Do not fan these requests out concurrently.
- Per-campaign requests should be avoided when collection includes can provide the relationship data.
- Do not add `page[size]` to campaign-scoped tag relationship fallback endpoints.

## Deferred Klaviyo Areas

These datasets are intentionally out of the active sync right now:

- Flows and flow messages.
- Flow Reporting API metric rows and account-level daily Klaviyo metrics.
- Metrics, profiles, events, lists, segments, audience memberships, subscriptions, push tokens, templates,
  forms, reviews, catalogs, coupons, web feeds, webhooks, custom objects, data privacy workflows, agents,
  conversations, and images.

Future ingestion slices should add these back one resource family at a time with explicit database shape,
rate-limit rules, privacy review, and UI/reporting need.
