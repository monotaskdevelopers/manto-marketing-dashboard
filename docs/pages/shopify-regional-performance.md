<!--
File description:
This file documents the Shopify Regional Performance page. It records the current blank redesign state and
why the nested Shopify route remains available.
-->

# Shopify Regional Performance

## Purpose

Preserve `/shopify/regional` under the Shopify navigation group while the regional reporting UI is
redesigned.

## Contents

- No page-specific body content during the redesign reset.
- Reuses the blank `/regional` page implementation.

## Features

- Nested sidebar placement at `Analytics > Shopify > Regional Performance`.
- Keeps `/shopify/regional` and `/regional` behavior aligned during the reset.
- Does not query Shopify or regional analytics data while blank.

## Security Concerns

- Must require dashboard authentication through the shared dashboard layout.
- Must not expose Shopify or Klaviyo credentials.

## Known Gaps

- Shopify-owned regional metrics, filters, and ranking tables need to be rebuilt.
