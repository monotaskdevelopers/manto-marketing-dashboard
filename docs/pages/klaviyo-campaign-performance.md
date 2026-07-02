<!--
File description:
This file documents the Klaviyo Campaign Performance drill-down page. It explains the purpose, contents,
controls, security posture, and current limitations of the campaign-specific analytics route.
-->

# Klaviyo Campaign Performance

## Purpose

Help internal users inspect campaign-level Klaviyo performance at a granular level while preserving the
same date and region scope used by the main dashboard.

## Contents

- Filtered campaign revenue.
- Visible campaign row count.
- Campaign recipients.
- Open rate.
- Click rate.
- Conversion rate.
- Revenue per recipient.
- Campaign revenue distribution chart.
- Campaign engagement quality chart.
- Full campaign detail table with campaign ID, region, send date, recipients, opens, clicks, conversions, rates, revenue, and revenue per recipient.

## Features

- Shared dashboard date and region filters.
- Campaign search by name or region.
- Minimum revenue filter.
- Engagement filters for conversions, low click rate, low conversion rate, and high revenue density.
- Sort controls for revenue, recipients, rates, date, and name.
- Search, filter, sort, apply, and reset controls live in the campaign table header for a consistent table workflow.
- URL-driven controls for shareable internal report views.

## Security Concerns

- Requires the authenticated dashboard layout.
- Uses server-rendered data from existing dashboard queries.
- Must not expose Klaviyo private keys, raw API responses, or sync credentials to the client.

## Known Gaps

- Campaign edits, scheduling, and audience membership inspection remain out of scope.
- High revenue density uses a simple revenue-per-recipient threshold and may need account-specific tuning later.
