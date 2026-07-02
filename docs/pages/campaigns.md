<!--
File description:
This file documents the Campaigns page. It explains the rebuilt campaign workspace, visible metrics,
table controls, table columns, security posture, and known implementation gaps.
-->

# Campaigns

## Purpose

Give internal users a Klaviyo-style campaign review workspace for scanning campaign performance,
engagement quality, and placed-order revenue.

## Contents

- Page title and campaign action toolbar.
- Email performance summary for the last 30 days.
- Average open rate.
- Average click rate.
- Placed Order percentage.
- Revenue per recipient.
- Campaign table populated from synced `klaviyo_campaign_reports` rows when present, or synced
  `klaviyo_campaigns` metadata rows as the current campaign-ingestion fallback.
- Campaign name, region, status, send timestamp, channel, audience IDs, tag IDs, tag labels, A/B test metadata, and
  archived state enrichment from synced Klaviyo campaign metadata and relationship tables when available.

## Features

- Client-side search field that filters the already-loaded campaign rows as the user types, without requiring Enter
  and without making another database-backed request.
- Compact modular date range picker wired to the shared `preset`, `start`, and `end` dashboard filters because date
  changes define the reporting dataset.
- Region, Audience, Channels, Status, Tags, and Archived filters run client-side against the already-loaded campaign
  rows and synced metadata from `klaviyo_campaign_audiences`, `klaviyo_tag_relationships`, and `klaviyo_tags`.
- Email performance summary cards recalculate from the same client-filtered rows as the table so search and filter
  changes keep the top metrics aligned with visible results.
- Open Rate and Click Rate use Klaviyo native fractional rates from synced campaign values reports. Their
  sublabels show unique recipient action counts, matching Klaviyo's campaign list behavior instead of raw
  send recipients or raw event totals.
- Table display settings button placeholder.
- Sortable table columns for Campaign, Region, Message Type, Status, Send Date, Open Rate, Click Rate, and
  Placed Order Rev, without row-selection checkboxes.
- Message Type icons expose hover/focus tooltips so users can distinguish email, SMS/text, and A/B test rows.
- `/klaviyo/campaigns` reuses this page so the nested sidebar route and top-level `/campaigns` route stay aligned.

## Security Concerns

- Must require authentication through both the shared dashboard layout and the page-level guard before report reads.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and only renders aggregate report fields plus safe object metadata.

## Known Gaps

- Table display controls are visual placeholders.
- Campaign message type falls back to safe name/channel inference because the active Klaviyo sync does not
  fetch campaign message rows.
- Create campaign, View library, Calendar, benchmarks, and row action controls are visual placeholders.
