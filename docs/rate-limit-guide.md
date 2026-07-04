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

Klaviyo metric lookup can run when a Settings save includes a new Klaviyo private key with `metrics:read`
and when campaign sync needs to auto-detect a conversion metric ID for campaign performance reports.
The helper must:

- Call only the Metrics API fields needed for conversion metric detection.
- Keep lookup pagination bounded so saving a connection stays responsive.
- Retry 429 responses with a small bounded backoff.
- Avoid calling Klaviyo on every keystroke or page load.

### Klaviyo Data Ingestion APIs

Klaviyo account data ingestion is active only for the current campaign slice. Manual and cron sync call
Klaviyo campaigns, campaign tags, campaign tag IDs, beta campaign-audience endpoints, and one campaign
values report request per selected metric day that still needs campaign performance data from server-only code.

The sync must:

- Use cursor pagination and bounded retry/backoff for 429 responses.
- Filter campaign collection calls by `updated_at` with a 24-hour safety lag after local campaign metadata
  exists, instead of fetching every stored campaign on every hourly/manual run.
- Prefer campaign collection includes for relationship data: stable campaign fetches include tags, and the
  beta campaign relationship-map fetch includes campaign audiences.
- Filter the beta campaign-audience relationship map only by top-level campaign fields such as `updated_at`;
  do not send the stable `messages.channel` filter to that beta endpoint.
- Keep campaign performance reporting to one `campaign-values-reports` request per metric day instead of
  per-campaign report calls.
- Before calling `campaign-values-reports`, inspect `klaviyo_sync_date_coverage` for the requested window,
  skip already-covered stable historical dates, refresh the latest 3 report dates for cron sync, and refresh
  the latest 7 report dates for manual sync.
- Cap selected full-day campaign performance report dates to 8 per sync run after preserving the mutable
  window. Leave additional missing historical dates uncovered so later syncs continue the backfill.
- When an older campaign appears in the Klaviyo `updated_at` metadata result, use a campaign values report
  `campaign_id` filter for that campaign's report date instead of refetching the whole historical day.
- Adding native rate fields and unique action counts to `campaign-values-reports` should be done in the
  existing daily request body, not by adding per-campaign follow-up requests.
- Pace campaign values report requests sequentially; Klaviyo's steady limit is low enough that concurrent
  daily requests will create avoidable 429 responses.
- Do not send `page[size]` to campaign-scoped tag relationship fallback endpoints because Klaviyo rejects
  that query on those resources.
- Treat campaign tag fallback and campaign-audience relationship-map failures as non-fatal sanitized
  warnings after bounded retries. Core campaign fetch failures should still fail the Klaviyo region clearly.
- Treat campaign performance report failures as sanitized warnings so metadata rows can still sync.
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
- Add separate cooldowns or background jobs before expanding beyond the current Klaviyo campaign slice.

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
- Add platform-specific retry queues if hourly sync becomes unreliable or campaign detail pagination outgrows
  the request lifecycle.
- Move broader Klaviyo ingestion for flows, profiles, custom object records, customer-agent conversation
  messages, and subscriptions into queued jobs before enabling full historical crawls.
- Add an explicit backfill queue before allowing operators to force-refresh long historical Klaviyo
  performance ranges, because the Reporting API steady limit is too low for broad synchronous refetches.
- Consider Shopify bulk operations only if order volume becomes too high for bounded hourly GraphQL pagination.
