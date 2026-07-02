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
- Campaign name, status, send timestamp, channel, audience IDs, tag IDs, A/B test metadata, and archived
  state enrichment from synced `klaviyo_campaigns` metadata when available.

## Features

- Server-rendered search field using the `campaignQ` URL parameter.
- Date range selector wired to the shared `preset`, `start`, and `end` dashboard filters.
- Audience, Channels, Status, Tags, A/B test, and Archived filters wired to synced campaign metadata.
- Performance filter and table sort controls wired to the campaign table URL parameters.
- Placed Order metric selector placeholder.
- Table display settings button placeholder.
- Table columns for Campaign, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev.
- `/klaviyo/campaigns` reuses this page so the nested sidebar route and top-level `/campaigns` route stay aligned.

## Security Concerns

- Must require authentication through both the shared dashboard layout and the page-level guard before report reads.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and only renders aggregate report fields plus safe object metadata.

## Known Gaps

- Placed Order metric selector and table display controls are visual placeholders.
- Campaign message type falls back to safe name/channel inference because the active Klaviyo sync does not
  fetch campaign message rows.
- Create campaign, View library, Calendar, benchmarks, and row action controls are visual placeholders.
