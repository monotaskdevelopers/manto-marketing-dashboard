<!--
File description:
This file tracks intentional console logs added to support development and debugging. Logs listed here
must avoid PII and secrets, and they should be reviewed before production to decide what remains.
-->

# Console Logs Update

## Log Registry

| Location | Log purpose | Contains PII? | Production action |
| --- | --- | --- | --- |
| `src/lib/sync/run-sync.ts` | Logs sync start, per-region platform progress, per-table Supabase upsert attempts, zero-row skips, upsert success, sanitized database errors, and sync completion status. | No | Keep only if production observability is needed; otherwise replace with structured logger. |
| `src/lib/integrations/shopify.ts` | Logs sanitized Shopify sync progress and retry context. | No | Keep warnings/errors only. |
| `src/lib/integrations/klaviyo.ts` | Logs sanitized Klaviyo sync progress, Reporting API request metadata, result counts, reporting failures, rate limits, JSON:API error summaries, and Settings metric auto-detection outcomes by region slug. | No | Keep warnings/errors only, and move successful metric detection/request logs to structured observability before production if noisy. |
| `src/lib/settings/platform-connections.ts` | Logs sanitized connect, disconnect, deactivate, metric lookup skip, and syncable connection count events by region slug or count. | No | Keep if operational audit visibility is needed; otherwise move to structured audit table. |

## Rules

- Never log API keys, access tokens, auth headers, customer emails, customer names, phone numbers, raw Shopify orders, or raw Klaviyo payloads.
- Keep logs focused on sync run ID, region slug, provider, endpoint path, API revision, date window, statistic names, group-by fields, table names, conflict targets, row counts, status, and sanitized error messages.
- Klaviyo JSON:API error logs may include status, code, title, detail, source pointer, and source parameter only after secret redaction.
- Supabase write error logs may include PostgREST error code, message, details, and hint only after secret redaction.
- Review this file before production launch.
