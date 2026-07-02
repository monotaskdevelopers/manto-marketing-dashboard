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

- Runs hourly sync for every active region with Shopify or Klaviyo credentials. Shopify rows, Klaviyo
  campaign/flow metadata, date-windowed Klaviyo report rows, and optional Klaviyo raw resources are written
  server-side.

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

- Detect the preferred conversion metric ID when a Klaviyo private key is saved in Settings.

Credential:

- Server-only Klaviyo private API key.

Important safeguards:

- Use one API revision constant.
- Call only `GET /api/metrics?fields[metric]=id,name,integration` during Settings save.
- Bound lookup pagination so saving a connection cannot crawl the account.
- Retry 429 responses with a small bounded backoff.
- Log only sanitized request metadata and JSON:API error summaries for debugging 400, 401, 403, 429, and 5xx responses.
- Do not expose private keys to the browser.

### Klaviyo Data Ingestion APIs

Purpose:

- Fetch Klaviyo account data into local Supabase tables for fast, date-scopable reporting and future
  dashboard filters.

Current behavior:

- Manual and cron sync call campaign, flow, metric, list, segment, tag, profile, event, and Reporting API
  endpoints when a region has an encrypted Klaviyo private key.
- Optional broader resource endpoints are attempted as raw snapshots when the connected key has the needed
  read scope; missing scopes, unsupported optional endpoints, and transient optional endpoint failures are
  logged as sanitized warnings and do not fail the whole region.
- Images are not fetched.

Important safeguards:

- Any future Klaviyo ingestion must stay server-only and must never log profile PII, event properties, raw
  payloads, API keys, or auth headers.
- Large profile, subscription, custom-object record, customer-agent conversation message/content, and
  data-privacy jobs should be promoted into explicit backfill/operator flows instead of being hidden inside
  hourly cron.
