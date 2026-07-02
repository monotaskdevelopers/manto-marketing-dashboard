<!--
File description:
This file maps the Klaviyo API documentation surface to the dashboard ingestion plan. It records which
Klaviyo resources are synced now, which database tables receive them, which resources are intentionally
excluded, and which API categories need follow-up implementation after the campaign/flow ingestion slice.
-->

# Klaviyo API Ingestion Plan

## Purpose

The dashboard needs local Klaviyo data so reports can be filtered by region and date without calling
Klaviyo on page load. The first production slice now syncs campaigns, flows, messages, actions, audiences,
tags, metrics, events, profiles updated in the sync window, Reporting API rows, and a broad raw JSON:API
resource snapshot table. Images are intentionally excluded.

## Official Klaviyo API Documentation Reviewed

- API overview and category index: `https://developers.klaviyo.com/en/reference/api_overview`
- Campaigns API: `https://developers.klaviyo.com/en/reference/get_campaigns`
- Campaign values report: `https://developers.klaviyo.com/en/reference/query_campaign_values`
- Flows API: `https://developers.klaviyo.com/en/reference/get_flows`
- Flow values report: `https://developers.klaviyo.com/en/reference/query_flow_values`
- Metrics API: `https://developers.klaviyo.com/en/reference/get_metrics`
- Profiles API: `https://developers.klaviyo.com/en/reference/get_profiles`
- Events API: `https://developers.klaviyo.com/en/reference/get_events`
- Lists API: `https://developers.klaviyo.com/en/reference/get_lists`
- Segments API: `https://developers.klaviyo.com/en/reference/get_segments`
- Tags API: `https://developers.klaviyo.com/en/reference/get_tags`
- Customer Agent API: `https://developers.klaviyo.com/en/reference/get_agent_knowledge_beta`
- Customer Agent conversations API: `https://developers.klaviyo.com/en/reference/list_customer_agent_conversations_beta`
- Catalogs API: `https://developers.klaviyo.com/en/reference/get_catalog_items`
- Coupons API: `https://developers.klaviyo.com/en/reference/get_coupons`
- Coupon codes API: `https://developers.klaviyo.com/en/reference/get_coupon_codes`
- Custom object data sources API: `https://developers.klaviyo.com/en/reference/get_data_sources`
- Forms API: `https://developers.klaviyo.com/en/reference/get_forms`
- Push tokens API: `https://developers.klaviyo.com/en/reference/get_push_tokens`
- Reviews API: `https://developers.klaviyo.com/en/reference/get_reviews`
- Templates API: `https://developers.klaviyo.com/en/reference/get_templates`
- Universal template content API: `https://developers.klaviyo.com/en/reference/get_template_universal_content`
- Web feeds API: `https://developers.klaviyo.com/en/reference/get_web_feeds`
- Webhooks API: `https://developers.klaviyo.com/en/reference/get_webhooks`
- Tracking settings API: `https://developers.klaviyo.com/en/reference/get_tracking_settings`
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
| Campaigns | Fetches email, SMS, and mobile push campaigns with campaign messages and tags. Promotes status, channels, archived flag, tags, audiences, A/B test metadata, send strategy, tracking options, and raw payload. | `klaviyo_campaigns`, `klaviyo_campaign_messages`, `klaviyo_campaign_audiences`, `klaviyo_tag_relationships`, `klaviyo_raw_resources` |
| Flows | Fetches flows with flow actions and tags, then fetches flow messages for each action. Promotes status, trigger type, channels, tags, action/message metadata, and raw payload. | `klaviyo_flows`, `klaviyo_flow_actions`, `klaviyo_flow_messages`, `klaviyo_tag_relationships`, `klaviyo_raw_resources` |
| Reporting values | Queries campaign and flow value reports day by day for the selected sync window when a conversion metric ID is configured or detected. | `klaviyo_daily_metrics`, `klaviyo_campaign_reports`, `klaviyo_flow_reports` |
| Lists and segments | Fetches list and segment records with tags. | `klaviyo_audiences`, `klaviyo_tag_relationships`, `klaviyo_raw_resources` |
| Metrics | Fetches metrics and uses them to detect a revenue conversion metric if Settings did not already store one. | `klaviyo_metrics`, `klaviyo_raw_resources` |
| Tags and tag groups | Fetches tags, tag groups, promoted tag arrays, and normalized tag relationship rows for filter joins. | `klaviyo_tags`, `klaviyo_tag_relationships`, `klaviyo_raw_resources` |
| Profiles | Fetches profiles updated during the sync window. This avoids full-account profile crawls inside hourly sync. | `klaviyo_profiles`, `klaviyo_raw_resources` |
| Events | Fetches events whose event datetime falls inside the sync window. | `klaviyo_events`, `klaviyo_raw_resources` |
| Accounts, agent metadata, customer-agent conversation metadata, catalogs, coupons, custom object data sources, forms, push tokens, reviews, templates, universal template content, tracking settings, translations, web feeds, webhooks, and webhook topics | Fetches as optional raw resource snapshots when the connected key has the needed read scope. Beta/pre-release endpoints use the `.pre` Klaviyo revision. | `klaviyo_raw_resources` |

## Date-Scopable Reporting Rules

- Campaign and flow Reporting API rows are stored at one row per region, object, and metric date.
- `klaviyo_daily_metrics.metric_date`, `klaviyo_campaign_reports.send_date`, and
  `klaviyo_flow_reports.metric_date` are populated from the daily reporting window, so dashboard date
  selectors can filter the local rows.
- Events use the source event datetime for date filters.
- Raw resources include `resource_created_at`, `resource_updated_at`, and `occurred_at` so future reports can
  choose the most appropriate date dimension per resource type.

## Broad Klaviyo Surface Map

| Requested area | Current status | Notes |
| --- | --- | --- |
| Accounts | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Agents | Raw optional sync | Agent knowledge, skills, and tools are attempted with the beta `.pre` revision; agent secrets are intentionally excluded. |
| Applications | Not found in current official API index | Add if Klaviyo exposes a documented read endpoint for this account surface. |
| Brands | Not found in current official API index | Add if Klaviyo exposes a documented read endpoint for this account surface. |
| Campaigns | Implemented | Promoted plus raw sync. |
| Catalogs | Raw optional sync | Catalog items, variants, and categories are attempted. |
| Conversations | Raw optional metadata sync | Customer-agent conversation metadata is attempted. Conversation messages/content still need a separate privacy-reviewed job. |
| Coupon codes | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Coupons | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Custom objects | Raw optional data-source sync | Data sources are attempted. Object types and records need a follow-up backfill because they are dynamic per data source. |
| Data privacy | Pending operational workflow | Privacy APIs should likely be operator-triggered, not hourly synced. |
| Events | Implemented, date-windowed | Promoted plus raw sync. |
| Flows | Implemented | Promoted plus raw sync. |
| Forms | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Images | Excluded | User explicitly said images are not needed. |
| Lists | Implemented | Stored as audience rows plus raw resources. |
| Metrics | Implemented | Promoted plus raw sync. |
| Profiles | Implemented, updated-window | Full historical profile backfill should be a separate controlled job. |
| Push tokens | Raw optional sync | Stored only behind authenticated RLS. Do not render token values in UI without a separate privacy review. |
| Reviews | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Segments | Implemented | Stored as audience rows plus raw resources. |
| Sender configuration | Not found in current official API index | Sender-like metadata may arrive through campaigns/messages/templates; add a separate endpoint if Klaviyo documents one. |
| Subscriptions | Partially implemented through profiles | Profile subscription JSON is stored; standalone subscription endpoints still need mapping. |
| Tags | Implemented | Promoted tags plus campaign/flow tag arrays. |
| Templates | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Tracking settings | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Translations | Raw optional sync | Attempted with the beta/pre-release revision. |
| Web feeds | Raw optional sync | Stored in `klaviyo_raw_resources`. |
| Webhooks | Raw optional sync | Stored in `klaviyo_raw_resources`. |

## Security And Scale Rules

- Never log private keys, auth headers, profile emails, phone numbers, customer names, event properties, raw
  payloads, push tokens, subscription details, or audience membership payloads.
- Keep optional resource sync non-fatal when a private key lacks a read scope.
- Keep hourly sync bounded. Optional raw endpoints use a small concurrency pool; large full-account profile,
  push-token, subscription, custom-object record, and conversation-message backfills should run as explicit
  backfill jobs, not hidden inside hourly cron.
- Store full JSON:API objects in `klaviyo_raw_resources` first; promote new columns only when a report or
  filter needs them.
