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

- Runs hourly sync for every active region with a connected Shopify and/or Klaviyo account.

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

- Fetch orders for regions with a connected Shopify account.

Credential:

- Server-only Shopify Admin API access token.

Important safeguards:

- Query only required fields.
- Paginate through orders.
- Respect query-cost throttling.
- Do not log order/customer details.

### Klaviyo Reporting API

Purpose:

- Fetch campaign and flow performance for regions with a connected Klaviyo account.

Credential:

- Server-only Klaviyo private API key.

Important safeguards:

- Use one API revision constant.
- Respect low reporting endpoint rate limits.
- Request `bounced`, not `bounces`, because Klaviyo's campaign and flow values endpoints reject invalid statistic names.
- Include endpoint-required `group_by` fields for campaign and flow reports.
- Parse report `groupings` and `statistics` objects before writing normalized rows.
- Collapse Klaviyo message/channel result groups into campaign/date and flow/date rows before Supabase upsert,
  matching `klaviyo_campaign_reports` and `klaviyo_flow_reports` unique constraints.
- Log only sanitized request metadata and JSON:API error summaries for debugging 400, 401, 403, 429, and 5xx responses.
- Normalize response fields before database writes.
- Do not expose private keys to the browser.

### Klaviyo Comprehensive Data APIs

Purpose:

- Fetch the broader Klaviyo account dataset needed for recipient, audience, metric, event, tag, campaign,
  and flow reporting/search/filtering.

Credential:

- Server-only Klaviyo private API key.

Endpoints used:

- `GET /api/profiles`
- `GET /api/lists`
- `GET /api/lists/{id}/profiles`
- `GET /api/segments`
- `GET /api/segments/{id}/profiles`
- `GET /api/tags`
- `GET /api/metrics`
- `GET /api/events`
- `GET /api/campaigns`
- `GET /api/campaigns/{id}/campaign-messages`
- `GET /api/flows`
- `GET /api/flows/{id}/flow-actions`
- `GET /api/flow-actions/{id}/flow-messages`

Important safeguards:

- Require read-only Klaviyo scopes for profiles, lists, segments, tags, metrics, events, campaigns, and flows;
  campaign messages use `campaigns:read`, and flow actions/messages use `flows:read`.
- Cursor-paginate until `links.next` is absent.
- Filter events by the current sync date window.
- Upsert comprehensive rows in batches.
- Store full source objects in `raw_payload` JSONB while exposing indexed normalized columns for report queries.
- Mark full-snapshot rows with `last_seen_sync_run_id` and prune stale rows after successful full fetches.
- Do not prune `klaviyo_events` as a full snapshot because it is date-windowed event history.
- Upsert campaign messages, campaign audience relationships, flow actions, and flow messages with deterministic
  conflict targets so repeated manual/cron syncs update existing rows instead of duplicating them.
- Preserve original campaign audience relationship names because Klaviyo can expose list, segment, included,
  excluded, or generic audience links depending on channel and API revision.
- Retry Klaviyo GET requests on 429 up to a small bounded limit, respecting `Retry-After` when Klaviyo sends it.
- Log endpoint counts only; never log profile PII, event properties, or raw JSON payloads.
