<!--
File description:
This file documents the Shopify Dashboard page. It explains the source-of-truth ecommerce metrics shown
on the page, the sync dependency, and current limitations of the MVP Shopify reporting layer.
-->

# Shopify Dashboard

## Purpose

Show ecommerce performance from Shopify as the source of truth for actual sales performance.

## Contents

- Revenue.
- Orders.
- Average order value.
- Customers.
- Refund amount when available.
- Cancelled orders when available.
- Daily revenue trend.
- Regional Shopify performance table.

## Features

- Date range filter.
- Region filter.
- Trend bars.
- Summary KPIs.
- Shared carded filter controls.
- Plain-language tooltip explanations on every Shopify KPI, trend, and table column.
- Regional table with clearer row separation, numeric alignment, and mobile-safe horizontal scrolling.
- Table-header search, filter, sort, apply, and reset controls for Shopify regional rows.
- Nested Analytics sidebar placement for Shopify overview and `/shopify/regional` regional performance.

## Security Concerns

- Shopify Admin API tokens must remain server-only.
- Raw order and customer data should not be logged.

## Known Gaps

- Product/category performance is deferred unless the business confirms it is needed.
- New vs returning customers may require additional Shopify queries and is deferred unless available cheaply.
- Additional Shopify subroutes should only be added when a synced data source supports the page without placeholder analytics.
