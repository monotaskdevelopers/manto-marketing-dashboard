<!--
File description:
This file documents the Campaigns page. It explains the campaign table, required fields, security posture,
and MVP limitations for campaign analytics.
-->

# Campaigns Dashboard

## Purpose

Help the team identify top-performing and underperforming Klaviyo campaigns across regions and dates.

## Contents

- Campaign name.
- Region.
- Message type indicator.
- Delivery status.
- Send date.
- Recipients.
- Open rate.
- Click rate.
- Conversion rate.
- Orders/conversions attributed to campaign.
- Revenue attributed to campaign.
- Revenue per recipient.

## Features

- Date range filter.
- Region filter.
- Klaviyo-inspired top toolbar with library, list/calendar, and create-action styling.
- Flat performance band for average open rate, average click rate, placed order rate, and revenue per recipient.
- Compact URL-driven controls for search, date preset, audience/region, status-style row filters, and metric sorting.
- Feedback strip and row table styling that mirrors the provided Campaigns reference.
- Mobile-safe horizontal table scrolling for dense campaign rows.

## Security Concerns

- Must require authentication.
- Must not expose Klaviyo API keys.

## Known Gaps

- Campaign creation, editing, and scheduling are out of scope.
- Calendar view and create-campaign actions are visual placeholders until campaign management is implemented.
