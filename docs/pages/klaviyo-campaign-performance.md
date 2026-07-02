<!--
File description:
This file documents the Klaviyo Campaign Performance page. It explains that the nested Klaviyo route
reuses the rebuilt Campaigns workspace and records the remaining data-wiring work.
-->

# Klaviyo Campaign Performance

## Purpose

Expose the rebuilt Campaigns workspace at `/klaviyo/campaigns` inside the `Analytics > Klaviyo`
navigation hierarchy.

## Contents

- Same Campaigns workspace as `/campaigns`.
- Email performance summary.
- Campaign filters.
- Campaign table scaffold.

## Features

- Reuses the top-level `/campaigns` page implementation.
- Preserves the existing nested sidebar destination.
- Shows Campaign, Message Type, Status, Send Date, Open Rate, Click Rate, and Placed Order Rev columns.

## Security Concerns

- Must require the authenticated dashboard layout.
- Must not expose Klaviyo private keys, raw API responses, sync credentials, or recipient PII.
- Current rows are static UI scaffold data, not live reporting output.

## Known Gaps

- Campaign controls and table rows must be connected to synced campaign reporting data before production analytics use.
