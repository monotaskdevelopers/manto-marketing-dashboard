<!--
File description:
This file documents the Overview Dashboard page. It explains the page purpose, contents, user-facing
features, security concerns, and current limitations so changes to the main dashboard remain intentional.
-->

# Overview Dashboard

## Purpose

Give internal users a fast summary of Shopify and Klaviyo performance across selected regions and dates.

## Contents

- Total Shopify revenue.
- Total orders.
- Average order value.
- Customers.
- Klaviyo-attributed revenue.
- Klaviyo revenue share.
- Campaign revenue.
- Flow revenue.
- Revenue trend.
- Top regions.
- Top campaigns.
- Top flows.

## Features

- Region filter.
- Date range filter.
- Last sync status.
- Manual sync action.

## Security Concerns

- Must require authentication.
- Must not expose platform API credentials.
- Must label attributed revenue clearly to avoid financial misinterpretation.

## Known Gaps

- Currency conversion is not included in MVP.
- CSV export is not included in the initial implementation.
