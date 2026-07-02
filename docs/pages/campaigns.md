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
- Campaign table with sample campaign rows.

## Features

- Search field.
- Date range control.
- Audience, Channels, Status, Tags, A/B test, and Archived filter controls.
- Placed Order metric selector.
- Table display settings button.
- Table columns for Campaign, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev.
- `/klaviyo/campaigns` reuses this page so the nested sidebar route and top-level `/campaigns` route stay aligned.

## Security Concerns

- Must require authentication through the shared dashboard layout.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Current rows are static UI scaffold data, not live reporting output.

## Known Gaps

- Search and filters are visual controls only.
- Table rows are static scaffold rows and must be connected to synced campaign reporting data.
- Create campaign, View library, Calendar, benchmarks, and row action controls are visual placeholders.
