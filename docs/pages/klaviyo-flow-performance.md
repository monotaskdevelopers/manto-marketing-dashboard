<!--
File description:
This file documents the Klaviyo Flow Performance page. It explains that the nested Klaviyo route reuses
the rebuilt Flows workspace and records the remaining production control gaps.
-->

# Klaviyo Flow Performance

## Purpose

Expose the rebuilt Flows workspace at `/klaviyo/flows` inside the `Analytics > Klaviyo` navigation
hierarchy.

## Contents

- Same Flows workspace as `/flows`.
- Flow filters.
- Flow table populated from synced flow report rows.

## Features

- Reuses the top-level `/flows` page implementation.
- Preserves the existing nested sidebar destination.
- Uses the same server-side search, metric period filters, flow/message metadata enrichment, and empty states as `/flows`.
- Shows Flow Name, Type, Status, Last Updated, Revenue, and Revenue per recipient columns.

## Security Concerns

- Must require the authenticated dashboard layout and the shared Flows page-level guard before report reads.
- Must not expose Klaviyo private keys, raw API responses, sync credentials, or recipient PII.
- Uses authenticated server-side Supabase reads and renders safe aggregate reporting fields only.

## Known Gaps

- Flow action buttons and advanced filters are still visual placeholders.
- Flow type falls back to conservative name-based inference when flow message channel metadata is unavailable.
