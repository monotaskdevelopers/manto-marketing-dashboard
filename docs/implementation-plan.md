<!--
File description:
This file is the step-by-step implementation plan for building the dashboard from the ground up.
It includes a layman explanation for non-engineers and a technical execution plan for developers.
The plan should be kept in sync with the actual implementation as the codebase changes.
-->

# Implementation Plan

## Layman Explanation

We are building one internal website that collects data from Shopify and Klaviyo every hour, saves that data in our own database, and shows it in clean dashboards.

The reason we save the data first is simple: we do not want every dashboard page load to call Shopify and Klaviyo again. That would be slower, more fragile, and more likely to hit API limits. Instead, a background sync fetches data, stores normalized reporting rows, and the dashboard reads from Supabase.

Internal users sign in once, choose a date range and region, and see:

- Overall revenue and orders.
- Klaviyo-attributed revenue.
- Regional comparison.
- Shopify trends.
- Campaign performance.
- Flow performance.
- Last sync status.

If the team needs fresher numbers before the next hourly sync, they can click a manual sync button.

## Technical Plan

### Phase 1: Project Foundation

- Create a Next.js App Router project.
- Add Tailwind CSS for styling.
- Add Supabase SSR helpers.
- Add server-only environment validation.
- Add base layout, global styles, and authenticated app shell.

### Phase 2: Documentation And Contracts

- Create the documentation index.
- Document the product requirements.
- Document API research and architecture decisions.
- Document database plan, routes, API contracts, middleware, components, security, rate limits, and production checklist.

### Phase 3: Database Schema

- Create `regions` for normalized region labels.
- Create `sync_runs` for sync audit history.
- Create `shopify_daily_metrics` for daily Shopify rollups.
- Create `klaviyo_daily_metrics` for daily Klaviyo rollups.
- Create `klaviyo_campaign_reports` for campaign table rows.
- Create `klaviyo_flow_reports` for flow table rows.
- Create comprehensive Klaviyo tables for profiles, audiences, audience memberships, metrics, events, tags,
  campaigns, campaign messages, campaign audiences, flows, flow actions, and flow messages.
- Add indexes for date range and region filters.
- Add search, status, relationship, and JSONB indexes for comprehensive Klaviyo reporting tables.
- Enable RLS on all tables.
- Grant authenticated users read-only access.
- Keep writes server-side through service role sync code.

### Phase 4: Auth

- Add Supabase browser and server clients.
- Add Supabase session refresh proxy.
- Add login and logout flows.
- Protect all dashboard pages behind authentication.
- Keep all service role logic outside browser bundles.

### Phase 5: Data Access Layer

- Build dashboard query functions that read reporting rows from Supabase.
- Add filter parsing for date ranges and regions.
- Add computed metrics:
  - AOV = Shopify revenue / Shopify orders.
  - Klaviyo share = Klaviyo attributed revenue / Shopify revenue.
  - Revenue per recipient = attributed revenue / recipients.
  - Open rate = opens / recipients.
  - Click rate = clicks / recipients.
  - Conversion rate = conversions / recipients.

### Phase 6: External Connectors

- Build Shopify GraphQL client:
  - Uses region Shopify shop domain and Admin API token.
  - Fetches orders by date range.
  - Handles pagination.
  - Aggregates revenue, orders, and customers by day.
  - Avoids logging customer data.

- Build Klaviyo client:
  - Uses region Klaviyo private key.
  - Calls Reporting API campaign values and flow values.
  - Normalizes campaigns and flows into local report rows.
  - Fetches comprehensive Klaviyo profiles, audiences, memberships, metrics, events, tags, campaigns,
    campaign messages, campaign audience relationships, flows, flow actions, and flow messages for local
    analytics/search/filtering.
  - Upserts comprehensive rows with deterministic conflict keys and prunes stale full-snapshot objects after
    successful syncs.
  - Handles rate-limit responses with clear sync failures.

### Phase 7: Sync Orchestration

- Build `runSync` service:
  - Creates a sync run record.
  - Loads region config.
  - Upserts regions.
  - Runs Shopify and Klaviyo sync independently per region based on which credentials are connected.
  - Records success, partial success, or failure.
  - Keeps console logs non-PII and sync-focused.

- Add cron route:
  - `GET /api/cron/hourly-sync`
  - Requires `Authorization: Bearer ${CRON_SECRET}`

- Add manual route:
  - `POST /api/sync`
  - Requires authenticated Supabase user session.

### Phase 8: Dashboard UI

- Add reusable UI components:
  - Metric cards.
  - Filter bar.
  - Sync button.
  - Status badge.
  - Data tables.
  - Basic CSS charts.

- Build pages:
  - Overview.
  - Regional Performance.
  - Shopify.
  - Klaviyo.
  - Campaigns.
  - Flows.

### Phase 9: Verification

- Run lint/type checks if dependencies are available.
- Do not run production build unless explicitly asked.
- Start local dev server if dependencies are installed.
- Verify the main dashboard loads.
- Verify unauthenticated users are redirected to login.
- Verify API routes reject missing credentials.

## Execution Checklist

- [x] Read PRD and official docs.
- [x] Create documentation before implementation.
- [x] Scaffold app files.
- [x] Add Supabase migration.
- [x] Add auth and protected routes.
- [x] Add data queries.
- [x] Add external API clients.
- [x] Add sync routes.
- [x] Add dashboard pages.
- [x] Update documentation after implementation.
- [x] Run allowed verification.

## Implemented Verification

- `npm run lint` passes.
- `npm run typecheck` passes.
- Browser verification passes for the overview page at desktop and mobile widths.
- Browser verification confirms `/campaigns` renders without a runtime error overlay.
- Production build was not run because project instructions say not to run build tests unless explicitly asked.

## Non-Goals

- Do not add complex RBAC for version 1.
- Do not add a custom report builder.
- Do not add AI summaries.
- Do not add campaign or flow management.
- Do not store platform API secrets in client-visible variables.
