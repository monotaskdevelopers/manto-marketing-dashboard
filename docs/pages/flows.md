<!--
File description:
This file documents the Flows page. It explains the rebuilt flow workspace, visible controls, table
columns, security posture, and known implementation gaps.
-->

# Flows

## Purpose

Give internal users a Klaviyo-style automation review workspace for scanning flow status, update recency,
revenue, and revenue per recipient.

## Contents

- Page title and flow action toolbar.
- Search and filter controls.
- Flow table with sample automation rows.

## Features

- Search field.
- Status filter.
- Tags filter.
- Has email sender alerts filter.
- Metric period date control.
- Placed Order metric selector.
- Table columns for Flow Name, Type, Status, Last Updated, Revenue, and Revenue per recipient.
- `/klaviyo/flows` reuses this page so the nested sidebar route and top-level `/flows` route stay aligned.

## Security Concerns

- Must require authentication through the shared dashboard layout.
- Must not expose Klaviyo API keys, raw API responses, sync credentials, or recipient PII.
- Current rows are static UI scaffold data, not live reporting output.

## Known Gaps

- Search and filters are visual controls only.
- Table rows are static scaffold rows and must be connected to synced flow reporting data.
- Create flow, Analytics, Options, and row action controls are visual placeholders.
