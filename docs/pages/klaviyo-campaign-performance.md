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
- Email performance summary with overall generated revenue and currency-aware revenue-per-recipient values that
  recalculate from the client-filtered campaign rows.
- Campaign search and filters.
- Campaign table populated from synced campaign report rows.

## Features

- Reuses the top-level `/campaigns` page implementation.
- Preserves the existing nested sidebar destination.
- Uses the same compact modular date picker, client-side table search/filter/sorting, filter-aware metric cards, campaign/message metadata enrichment, message-type tooltips, and empty states as `/campaigns`.
- Shows Campaign, Region, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev columns without row-selection checkboxes.

## Security Concerns

- Must require the authenticated dashboard layout and the shared Campaigns page-level guard before report reads.
- Must not expose Klaviyo private keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and renders safe aggregate reporting fields only.

## Known Gaps

- View benchmarks and row action controls are still visual placeholders.
- Campaign message type falls back to safe name-based inference if comprehensive campaign/message metadata has not been synced yet.
