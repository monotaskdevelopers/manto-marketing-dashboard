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
- Campaign table populated from synced `klaviyo_campaign_reports` rows.
- Campaign name, status, send timestamp, and channel/type enrichment from synced `klaviyo_campaigns` and `klaviyo_campaign_messages` metadata when available.

## Features

- Server-rendered search field using the `campaignQ` URL parameter.
- Date range display based on the shared dashboard date filters.
- Audience, Channels, Status, Tags, A/B test, and Archived filter controls.
- Placed Order metric selector.
- Table display settings button.
- Table columns for Campaign, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev.
- `/klaviyo/campaigns` reuses this page so the nested sidebar route and top-level `/campaigns` route stay aligned.

## Security Concerns

- Must require authentication through both the shared dashboard layout and the page-level guard before report reads.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and only renders aggregate report fields plus safe object metadata.

## Known Gaps

- Audience, Channels, Status, Tags, A/B test, Archived, metric selector, and table display controls are visual controls only.
- Campaign message type falls back to safe name-based inference if comprehensive campaign/message metadata has not been synced yet.
- Create campaign, View library, Calendar, benchmarks, and row action controls are visual placeholders.
