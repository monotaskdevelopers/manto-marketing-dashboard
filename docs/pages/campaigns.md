<!--
File description:
This file documents the Campaigns page. It explains the campaign table, required fields, security posture,
and MVP limitations for campaign analytics.
-->

# Campaigns Dashboard

## Purpose

Help the team identify top-performing and underperforming Klaviyo campaigns across regions and dates.

## Contents

- Campaign name.
- Region.
- Send date.
- Recipients.
- Open rate.
- Click rate.
- Conversion rate.
- Orders/conversions attributed to campaign.
- Revenue attributed to campaign.
- Revenue per recipient.

## Features

- Date range filter.
- Region filter.
- Sortable reporting-oriented table structure.
- Shared carded filter controls.
- Plain-language tooltip explanations on every campaign KPI and table column.
- Cleaner table styling with aligned metric columns and mobile-safe horizontal scrolling.

## Security Concerns

- Must require authentication.
- Must not expose Klaviyo API keys.

## Known Gaps

- Campaign creation, editing, and scheduling are out of scope.
