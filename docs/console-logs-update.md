<!--
File description:
This file tracks intentional console logs added to support development and debugging. Logs listed here
must avoid PII and secrets, and they should be reviewed before production to decide what remains.
-->

# Console Logs Update

## Log Registry

| Location | Log purpose | Contains PII? | Production action |
| --- | --- | --- | --- |
| `src/lib/sync/run-sync.ts` | Logs sync start, Shopify/Klaviyo per-region progress, Klaviyo campaign metadata cursor planning, campaign performance coverage/date-planning counts, full-day request caps, deferred missing-date counts, per-table batched Supabase upsert attempts, zero-row skips, upsert success, sanitized database errors, and sync completion status. | No | Keep only if production observability is needed; otherwise replace with structured logger. |
| `src/lib/integrations/shopify.ts` | Logs sanitized Shopify sync progress and retry context. | No | Keep warnings/errors only. |
| `src/lib/integrations/klaviyo.ts` | Logs Klaviyo conversion metric lookup outcomes for Settings and campaign sync, bounded 429 retry attempts, authorization failures, and sanitized JSON:API error summaries by region slug. | No | Keep warnings/errors only, and move successful metric detection logs to structured observability before production if noisy. |
| `src/lib/integrations/klaviyo-sync.ts` | Logs Klaviyo sync stage starts, endpoint paths without secrets, API revision, HTTP method/status, endpoint page counts, reduced-request fallbacks, campaign `updated_at` incremental skips, beta campaign-audience relationship-map counts, campaign values report plan counts, targeted campaign filter counts, optional endpoint skips, bounded 429 retries, produced row/coverage counts, and sanitized JSON:API error summaries by region slug. | No | Keep warnings/errors and consider moving count summaries to structured sync telemetry. |
| `src/lib/settings/platform-connections.ts` | Logs sanitized connect, disconnect, deactivate, metric lookup skip, and syncable connection count events by region slug or count. | No | Keep if operational audit visibility is needed; otherwise move to structured audit table. |

## Rules

- Never log API keys, access tokens, auth headers, customer emails, customer names, phone numbers, raw Shopify orders, or raw Klaviyo payloads.
- Keep logs focused on sync run ID, region slug, provider, endpoint path, API revision, table names, conflict targets, row counts, retry attempts, status, and sanitized error messages.
- Klaviyo incremental planner logs may include non-secret dates, date counts, cursor timestamps, request caps, deferred missing-date counts, and campaign ID counts, but not raw payloads or auth headers.
- Klaviyo JSON:API error logs may include status, code, title, detail, source pointer, and source parameter only after secret redaction.
- Supabase write error logs may include PostgREST error code, message, details, and hint only after secret redaction.
- Klaviyo ingestion logs must never include profile emails, phone numbers, names, event properties, audience membership payloads, message payloads, flow message payloads, push tokens, subscription details, or raw JSON:API payloads.
- Review this file before production launch.
