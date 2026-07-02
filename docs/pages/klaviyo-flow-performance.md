<!--
File description:
This file documents the Klaviyo Flow Performance drill-down page. It explains the purpose, contents,
controls, security posture, and current limitations of the flow-specific analytics route.
-->

# Klaviyo Flow Performance

## Purpose

Help internal users inspect automation-level Klaviyo performance at a granular level while preserving the
same date and region scope used by the main dashboard.

## Contents

- Filtered flow revenue.
- Visible flow row count.
- Flow recipients.
- Open rate.
- Click rate.
- Conversion rate.
- Revenue per recipient.
- Flow revenue distribution chart.
- Flow engagement quality chart.
- Full flow detail table with flow ID, region, metric date, recipients, opens, clicks, conversions, rates, revenue, and revenue per recipient.

## Features

- Shared dashboard date and region filters.
- Flow search by name or region.
- Minimum revenue filter.
- Engagement filters for conversions, low click rate, low conversion rate, and high revenue density.
- Sort controls for revenue, recipients, rates, date, and name.
- URL-driven controls for shareable internal report views.

## Security Concerns

- Requires the authenticated dashboard layout.
- Uses server-rendered data from existing dashboard queries.
- Must not expose Klaviyo private keys, raw API responses, or sync credentials to the client.

## Known Gaps

- Flow editing, journey branching, and message-level creative inspection remain out of scope.
- High revenue density uses a simple revenue-per-recipient threshold and may need account-specific tuning later.
