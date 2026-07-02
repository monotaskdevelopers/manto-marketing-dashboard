<!--
File description:
This file documents the Flows page. It explains the rebuilt flow workspace, visible controls, table
columns, security posture, and known implementation gaps.
-->

# Flows

## Purpose

Give internal users a Klaviyo-style automation review workspace for scanning flow status, update recency,
revenue, and revenue per recipient.

## Contents

- Page title and flow action toolbar.
- Search and filter controls.
- Flow table populated from synced `klaviyo_flow_reports` rows.
- Flow name, status, trigger type, updated timestamp, and channel/type enrichment from synced `klaviyo_flows` and `klaviyo_flow_messages` metadata when available.

## Features

- Server-rendered search field using the `flowQ` URL parameter.
- Status filter.
- Tags filter.
- Has email sender alerts filter.
- Metric period display based on the shared dashboard date filters, defaulting to the last 7 days for this page.
- Placed Order metric selector.
- Table columns for Flow Name, Type, Status, Last Updated, Revenue, and Revenue per recipient.
- `/klaviyo/flows` reuses this page so the nested sidebar route and top-level `/flows` route stay aligned.

## Security Concerns

- Must require authentication through both the shared dashboard layout and the page-level guard before report reads.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and only renders aggregate report fields plus safe object metadata.

## Known Gaps

- Status, Tags, Has email sender alerts, metric selector, and row action controls are visual controls only.
- Flow type falls back to conservative name-based inference when flow message channel metadata is unavailable.
- Create flow, Analytics, Options, and row action controls are visual placeholders.
