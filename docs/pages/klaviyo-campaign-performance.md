<!--
File description:
This file documents the Klaviyo Campaign Performance page. It explains that the nested Klaviyo route
reuses the rebuilt Campaigns workspace and records the remaining production control gaps.
-->

# Klaviyo Campaign Performance

## Purpose

Expose the rebuilt Campaigns workspace at `/klaviyo/campaigns` inside the `Analytics > Klaviyo`
navigation hierarchy.

## Contents

- Same Campaigns workspace as `/campaigns`.
- Email performance summary.
- Campaign filters.
- Campaign table populated from synced campaign report rows.

## Features

- Reuses the top-level `/campaigns` page implementation.
- Preserves the existing nested sidebar destination.
- Uses the same server-side search, date filters, campaign/message metadata enrichment, and empty states as `/campaigns`.
- Shows Campaign, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev columns.

## Security Concerns

- Must require the authenticated dashboard layout and the shared Campaigns page-level guard before report reads.
- Must not expose Klaviyo private keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and renders safe aggregate reporting fields only.

## Known Gaps

- Campaign action buttons and advanced filters are still visual placeholders.
- Campaign message type falls back to safe name-based inference if comprehensive campaign/message metadata has not been synced yet.
