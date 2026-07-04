<!--
File description:
This file tracks every API route created for the dashboard. It documents route paths, methods, purpose,
authentication, request inputs, response shape, and importance so the backend contract remains visible
as the application grows.
-->

# API Contract Documentation

## API Routes

### `GET /api/cron/hourly-sync`

Purpose:

- Runs hourly sync for every active region with Shopify or Klaviyo credentials. Shopify rows and the current
  Klaviyo campaign slice are written server-side.
- Klaviyo campaign metadata uses an `updated_at` cursor after initial storage, and campaign performance
  reads `klaviyo_sync_date_coverage` before external report calls. Covered stable dates are skipped, while
  the latest 3 report dates are refreshed for recent attribution changes.

Authentication:

- Requires `Authorization: Bearer ${CRON_SECRET}`.

Request:

- No body.

Response:

```json
{
  "ok": true,
  "syncRunId": "uuid",
  "status": "success"
}
```

Importance:

- Critical. This keeps dashboard data fresh without manual work.

Security notes:

- Must never run without the cron secret.
- Must not log platform secrets or customer PII.

### `POST /api/sync`

Purpose:

- Allows an authenticated internal user to manually run the latest bounded Shopify and Klaviyo sync.
- Keeps the requested historical window available while avoiding repeated Klaviyo report calls for
  already-covered stable campaign performance dates. Manual sync refreshes the latest 7 report dates in
  the requested window and can pick up targeted older campaign refreshes when Klaviyo metadata changed.

Authentication:

- Requires a valid Supabase user session.

Request:

```json
{
  "rangeDays": 30
}
```

Response:

```json
{
  "ok": true,
  "syncRunId": "uuid",
  "status": "success"
}
```

Importance:

- High. It supports urgent reporting updates outside the hourly schedule.

Security notes:

- Must re-check auth server-side.
- Must cap requested date ranges to avoid abusive long-running syncs.

### `GET /api/sync/status`

Purpose:

- Returns the most recent sync run for display in the dashboard header.

Authentication:

- Requires a valid Supabase user session.

Request:

- No body.

Response:

```json
{
  "ok": true,
  "syncRun": {
    "id": "uuid",
    "status": "success",
    "triggered_by": "cron",
    "started_at": "2026-07-02T00:00:00.000Z",
    "finished_at": "2026-07-02T00:01:00.000Z"
  }
}
```

Importance:

- Medium. It improves trust by showing data freshness.

Security notes:

- Returns sanitized sync metadata only.

## External API Contracts

### Shopify Admin GraphQL

Purpose:

- Fetch orders for regions with a connected Shopify account.

Credential:

- Server-only Shopify Admin API access token.

Important safeguards:

- Query only required fields.
- Paginate through orders.
- Respect query-cost throttling.
- Do not log order/customer details.

### Klaviyo Metrics API

Purpose:

- Detect the preferred conversion metric ID when a Klaviyo private key is saved in Settings or when campaign
  sync needs a metric ID for campaign performance reports.

Credential:

- Server-only Klaviyo private API key.

Important safeguards:

- Use one API revision constant.
- Call only `GET /api/metrics?fields[metric]=id,name,integration` during Settings save or bounded sync
  metric detection.
- Bound lookup pagination so saving a connection cannot crawl the account.
- Retry 429 responses with a small bounded backoff.
- Log only sanitized request metadata and JSON:API error summaries for debugging 400, 401, 403, 429, and 5xx responses.
- Do not expose private keys to the browser.

### Klaviyo Data Ingestion APIs

Purpose:

- Fetch the current Klaviyo campaign slice into local Supabase tables for fast Campaigns table
  filters.

Current behavior:

- Manual and cron sync call campaign, campaign tag, campaign tag ID, beta campaign-audience, and campaign
  values report endpoints when a region has an encrypted Klaviyo private key.
- Campaign collection calls use Klaviyo `updated_at` filters with a 24-hour safety lag after local campaign
  metadata exists, so unchanged stored campaigns are not fetched on every hourly run.
- Campaign-audience relationship-map calls use the beta `.pre` campaign include endpoint with only
  top-level `updated_at` filtering during incremental syncs, because that beta endpoint does not accept the
  stable endpoint's `messages.channel` filter.
- Campaign values report requests persist Klaviyo native delivered counts, unique open/click/conversion
  recipient counts, and fractional rate fields so the Campaigns table does not recalculate campaign-list
  metrics from raw totals.
- Campaign values report requests are planned from `klaviyo_sync_date_coverage`: missing dates and a small
  recent mutable window use full-day requests, full-day catch-up work is capped per run, and older changed
  campaigns use a `campaign_id` report filter instead of refetching a whole historical day.
- Campaign tag and campaign-audience lookups are campaign-scoped optional details. Missing scopes,
  unsupported beta endpoints, 429 exhaustion after bounded retries, and transient detail failures are logged
  as sanitized warnings and do not fail the whole region.
- Campaign values report failures are logged as sanitized warnings and do not block campaign metadata rows.
- Flows, profiles, events, metrics, flow Reporting API rows, account-level daily Klaviyo metrics, lists,
  segments, broad raw resources, and images are not fetched by the active Klaviyo sync.

Important safeguards:

- Any future Klaviyo ingestion must stay server-only and must never log profile PII, event properties, raw
  payloads, API keys, or auth headers.
- Broader Klaviyo datasets should be added back as explicit product slices with their own rate-limit,
  retention, and privacy rules instead of being hidden inside the campaign sync.
- Klaviyo campaign values reports do not expose a general changed-since cursor for statistics, so old metric
  corrections that are not tied to campaign metadata updates require a deliberate backfill/operator job or
  the paced missing-date catch-up path.
