<!--
File description:
This file documents the Shopify page. It explains the current blank redesign state, source-of-truth
expectations, and security posture for the future Shopify reporting surface.
-->

# Shopify

## Purpose

Preserve the `/shopify` route while the ecommerce reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available under `Analytics > Shopify > Overview`.
- Does not query Shopify reporting data while blank.

## Security Concerns

- Shopify Admin API tokens must remain server-only.
- Raw order and customer data must not be logged or exposed to the browser.

## Known Gaps

- Shopify revenue, orders, AOV, refunds, trend charts, and regional tables need to be rebuilt.
