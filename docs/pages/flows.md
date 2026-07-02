<!--
File description:
This file documents the Flows page. It explains the automated flow reporting table, metrics, risks, and
MVP limitations.
-->

# Flows Dashboard

## Purpose

Help the team understand which automated Klaviyo flows are driving revenue and engagement.

## Contents

- Flow name.
- Region.
- Message type indicator.
- Automation status.
- Last activity date.
- Revenue.
- Recipients.
- Open rate.
- Click rate.
- Conversion rate.
- Revenue per recipient.

## Features

- Date range filter.
- Region filter.
- Klaviyo-inspired top toolbar using the same design language as Campaigns.
- Flat performance band for average open rate, average click rate, placed order rate, and revenue per recipient.
- Compact URL-driven controls for search, date preset, audience/region, status-style row filters, and metric sorting.
- Feedback strip and dense row table styling aligned with the Campaigns reference.
- Mobile-safe horizontal table scrolling for dense flow rows.

## Security Concerns

- Must require authentication.
- Must not expose Klaviyo API keys.

## Known Gaps

- Flow editing and journey management are out of scope.
- Calendar view and create-flow actions are visual placeholders until flow management is implemented.
