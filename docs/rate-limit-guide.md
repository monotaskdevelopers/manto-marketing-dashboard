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

### Klaviyo Reporting API

Klaviyo campaign and flow report endpoints have low steady limits. The sync must:

- Run one bounded reporting sync per region.
- Avoid UI-triggered direct Klaviyo calls.
- Store normalized results locally.
- Treat 429 responses as retryable sync failures, not silent success.

### Klaviyo Comprehensive Data APIs

Klaviyo profiles, lists, segments, memberships, tags, metrics, events, campaigns, and flows are all
cursor-paginated with different page sizes and rate limits. The sync must:

- Use cursor pagination until Klaviyo stops returning `links.next`.
- Keep profile and membership requests server-side only.
- Use date-window filters for events so manual sync range controls event volume.
- Store normalized rows locally and use `raw_payload` JSONB for future report fields.
- Treat 401/403 as missing-scope partial sync failures.
- Treat 429 responses as retryable sync failures.
- Avoid logging profile data, event properties, or raw API payloads.
- Consider moving comprehensive sync to a queue or background worker if account size causes cron/runtime timeouts.

### Vercel Cron

The hourly sync route runs with schedule `0 * * * *` in UTC.

## Internal Rate Limit Recommendations

### `POST /api/sync`

Recommended protection:

- Require authenticated Supabase user.
- Cap date range to 90 days.
- Block a new manual sync if another sync is already running.
- In production, add a per-user or global cooldown such as one manual sync every 5 minutes.
- Consider separate cooldowns or background jobs for comprehensive Klaviyo sync if very large accounts make
  manual refreshes slow.

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
- Consider Shopify bulk operations only if order volume becomes too high for bounded hourly GraphQL pagination.
