<!--
File description:
This file documents the Klaviyo Dashboard page. It explains how campaign and flow performance is reported,
which metrics are attributed rather than actual store revenue, and where account-specific setup may be needed.
-->

# Klaviyo Dashboard

## Purpose

Show email marketing performance from Klaviyo across campaigns, flows, engagement, deliverability, and regions.

## Contents

- Klaviyo-attributed revenue.
- Campaign revenue.
- Flow revenue.
- Recipients.
- Opens and open rate.
- Clicks and click rate.
- Conversions and conversion rate.
- Unsubscribes.
- Bounces.
- Spam complaints.
- Revenue trend with campaign and flow contribution.
- Revenue mix between campaigns and automated flows.
- Engagement funnel from recipients to conversions.
- Deliverability watch for unsubscribe, bounce, and spam complaint rates.
- Regional Klaviyo revenue distribution.
- Campaign and flow snapshots.
- Links into campaign and flow drill-down pages.

## Features

- Date range filter.
- Region filter.
- Top campaigns.
- Top flows.
- URL-preserved links to `/klaviyo/campaigns` and `/klaviyo/flows`.
- Daily Klaviyo trend panel that uses synced `klaviyo_daily_metrics`.
- Revenue mix, engagement funnel, deliverability, and regional distribution panels.
- Shared carded filter controls.
- Plain-language tooltip explanations on every Klaviyo KPI and table column.
- Cleaner campaign and flow tables with aligned numeric rates and revenue values.

## Security Concerns

- Klaviyo private keys must remain server-only.
- Attributed revenue must be clearly labeled as Klaviyo-attributed, not total store revenue.
- Drill-down controls must keep filtering server-rendered so raw sync internals and credentials never move into client state.

## Known Gaps

- Exact reporting fields may vary by Klaviyo account setup and configured conversion metrics.
