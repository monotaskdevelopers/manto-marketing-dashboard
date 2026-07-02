<!--
File description:
This file documents the Shopify Regional Performance page. It records why the same regional comparison
report is available under the nested Shopify route and how that route should be treated in navigation.
-->

# Shopify Regional Performance

## Purpose

Show Shopify-owned regional performance reporting inside the `Analytics > Shopify` navigation hierarchy.

## Contents

- Same regional comparison report as `/regional`.
- Region name.
- Shopify revenue.
- Orders.
- Average order value.
- Klaviyo-attributed revenue.
- Klaviyo revenue share.
- Table-header search, filter, sort, apply, and reset controls.

## Features

- Nested sidebar placement at `Analytics > Shopify > Regional Performance`.
- Reuses the existing regional report implementation so `/shopify/regional` and `/regional` remain consistent.
- Preserves date and region filters through URL query parameters.
- Keeps table controls server-rendered and URL-driven.

## Security Concerns

- Must require dashboard authentication through the shared dashboard layout.
- Must not expose Shopify or Klaviyo credentials.
- Cross-currency comparisons are informational only until currency conversion is implemented.

## Known Gaps

- Product, order, customer cohort, and channel-specific Shopify subroutes are not implemented until synced source data exists.
