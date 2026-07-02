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

- Runs the hourly Shopify and Klaviyo sync.

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

- Allows an authenticated internal user to manually run the latest sync.

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

- Fetch orders per region and date window.

Credential:

- Server-only Shopify Admin API access token.

Important safeguards:

- Query only required fields.
- Paginate through orders.
- Respect query-cost throttling.
- Do not log order/customer details.

### Klaviyo Reporting API

Purpose:

- Fetch campaign and flow performance per region and date window.

Credential:

- Server-only Klaviyo private API key.

Important safeguards:

- Use one API revision constant.
- Respect low reporting endpoint rate limits.
- Normalize response fields before database writes.
- Do not expose private keys to the browser.
