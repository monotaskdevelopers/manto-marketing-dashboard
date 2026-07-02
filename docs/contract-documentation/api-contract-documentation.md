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

- Runs hourly sync for every active Shopify-ready region. Klaviyo data ingestion is paused while the sync
  contract is rebuilt.

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

- Allows an authenticated internal user to manually run the latest Shopify sync. Saved Klaviyo accounts are
  not ingested by this route until the Klaviyo rebuild is implemented.

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

- Currently disabled. The previous Reporting API and comprehensive Klaviyo account ingestion code has been
  removed so the new data contract can be designed before any account data is synced.

Current behavior:

- Manual and cron sync do not call Klaviyo Reporting API endpoints.
- Manual and cron sync do not call Klaviyo profile, list, segment, tag, event, campaign, flow, message, or
  action endpoints.
- Manual and cron sync do not write Klaviyo tables.

Important safeguards:

- Rebuild must define resources, fields, retention, schema, write paths, rate limits, and PII handling before
  reintroducing Klaviyo ingestion.
- Any future Klaviyo ingestion must stay server-only and must never log profile PII, event properties, raw
  payloads, API keys, or auth headers.
