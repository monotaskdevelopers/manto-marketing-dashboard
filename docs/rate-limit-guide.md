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

### Vercel Cron

The hourly sync route runs with schedule `0 * * * *` in UTC.

## Internal Rate Limit Recommendations

### `POST /api/sync`

Recommended protection:

- Require authenticated Supabase user.
- Cap date range to 90 days.
- Block a new manual sync if another sync is already running.
- In production, add a per-user or global cooldown such as one manual sync every 5 minutes.

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
- Add platform-specific retry queues only if hourly sync becomes unreliable.
- Consider Shopify bulk operations only if order volume becomes too high for bounded hourly GraphQL pagination.
