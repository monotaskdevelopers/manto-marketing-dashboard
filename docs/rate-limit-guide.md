<!--
File description:
This file documents platform and internal rate-limit guidance for the dashboard. It explains where limits
come from, how sync code should handle them, and what should be added before production if traffic grows.
-->

# Rate Limit Guide

## Platform Limits

### Shopify Admin GraphQL

Shopify Admin GraphQL uses calculated query cost limits. The sync must:

- Query only fields required for reporting.
- Paginate responsibly.
- Read throttle metadata when available.
- Back off when Shopify reports throttling.
- Avoid repeated manual syncs over large date ranges.

### Klaviyo Metrics API

Klaviyo metric lookup can run when a Settings save includes a new Klaviyo private key with `metrics:read`.
The helper must:

- Call only the Metrics API fields needed for conversion metric detection.
- Keep lookup pagination bounded so saving a connection stays responsive.
- Retry 429 responses with a small bounded backoff.
- Avoid calling Klaviyo on every keystroke or page load.

### Klaviyo Data Ingestion APIs

Klaviyo account data ingestion is active for the first campaign/flow reporting slice. Manual and cron sync
call Klaviyo campaign, flow, metric, list, segment, tag, profile, event, Reporting API, and optional raw
resource endpoints from server-only code.

The sync must:

- Use cursor pagination and bounded retry/backoff for 429 responses.
- Keep profile and event ingestion date-windowed in the hourly/manual request path.
- Treat optional broad resource endpoints as non-fatal when a private key lacks a read scope.
- Fetch optional broad resources with a small concurrency pool so one manual sync does not open every
  Klaviyo endpoint at once.
- Keep raw-resource page limits bounded; large backfills should become explicit operator jobs.
- Never log raw payloads, customer PII, auth headers, API keys, push tokens, subscription details, or event properties.

### Vercel Cron

The hourly sync route runs with schedule `0 * * * *` in UTC.

## Internal Rate Limit Recommendations

### `POST /api/sync`

Recommended protection:

- Require authenticated Supabase user.
- Cap date range to 90 days.
- Block a new manual sync if another sync is already running.
- In production, add a per-user or global cooldown such as one manual sync every 5 minutes.
- Add separate cooldowns or background jobs before expanding large Klaviyo full-account backfills.

### `GET /api/cron/hourly-sync`

Recommended protection:

- Require `CRON_SECRET`.
- Reject missing or invalid authorization.
- Do not expose detailed stack traces in responses.

### Settings Server Actions

Recommended protection:

- Require authenticated Supabase user.
- Do not call Shopify or Klaviyo on every keystroke or page load.
- If future "test connection" buttons are added, rate limit them per user and region.

## Future Improvements

- Store manual sync cooldowns in Supabase if multiple app instances are used.
- Add platform-specific retry queues if hourly sync becomes unreliable or comprehensive Klaviyo pagination
  outgrows the request lifecycle.
- Move broad Klaviyo backfills for profiles, custom object records, customer-agent conversation messages, and
  subscriptions into queued jobs before enabling full historical crawls.
- Consider Shopify bulk operations only if order volume becomes too high for bounded hourly GraphQL pagination.
