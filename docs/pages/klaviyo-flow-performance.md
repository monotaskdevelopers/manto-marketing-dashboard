<!--
File description:
This file documents the Klaviyo Flow Performance page. It explains that the nested Klaviyo route reuses
the rebuilt Flows workspace and records the remaining data-wiring work.
-->

# Klaviyo Flow Performance

## Purpose

Expose the rebuilt Flows workspace at `/klaviyo/flows` inside the `Analytics > Klaviyo` navigation
hierarchy.

## Contents

- Same Flows workspace as `/flows`.
- Flow filters.
- Flow table scaffold.

## Features

- Reuses the top-level `/flows` page implementation.
- Preserves the existing nested sidebar destination.
- Shows Flow Name, Type, Status, Last Updated, Revenue, and Revenue per recipient columns.

## Security Concerns

- Must require the authenticated dashboard layout.
- Must not expose Klaviyo private keys, raw API responses, sync credentials, or recipient PII.
- Current rows are static UI scaffold data, not live reporting output.

## Known Gaps

- Flow controls and table rows must be connected to synced flow reporting data before production analytics use.
