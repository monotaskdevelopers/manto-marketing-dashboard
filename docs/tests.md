<!--
File description:
This file tracks testing, debugging, demo, and temporary behavior in the dashboard. Anything listed here
must be reviewed before production so temporary development helpers do not accidentally become production
behavior.
-->

# Tests And Temporary Behavior

## Temporary Or Development-Only Behavior

| Item | Location | Purpose | Production action |
| --- | --- | --- | --- |
| `DEMO_MODE=true` | `src/lib/data/demo-data.ts` and data access functions | Allows local UI review when Supabase and platform credentials are not configured. | Must be `false` or unset in production. |
| Manual sync range cap | `src/app/api/sync/route.ts` | Prevents excessive manual sync windows. | Keep and tune based on real usage. |
| Settings credential entry | `/src/app/(dashboard)/settings/platform-connection-manager.tsx` | Lets local/staging users connect Shopify and Klaviyo credentials separately through guided modals. | Keep, but verify `APP_ENCRYPTION_KEY` and RLS before production. |
| Blank report route placeholders | `/src/app/(dashboard)/**/page.tsx` except `/settings`, `/campaigns`, `/klaviyo/campaigns`, `/flows`, and `/klaviyo/flows` | Keeps protected routes available while the UI is redesigned from the ground up. | Replace with production-ready report pages before launch or explicitly accept a blank beta state. |
| Campaigns placeholder actions | `/src/app/(dashboard)/campaigns/page.tsx` | Keeps Klaviyo-style controls for library, calendar, display settings, and row actions while table search/date/region/audience/channel/status/tag/archive controls read synced campaign data. | Connect or remove remaining placeholder actions before production analytics use. |
| Flows visual-only controls | `/src/app/(dashboard)/flows/page.tsx` | Keeps Klaviyo-style controls for analytics, options, advanced filters, and row actions while the table itself reads synced flow data. | Connect or remove visual-only controls before production analytics use. |
| Klaviyo campaign relationship and performance retry limits | `src/lib/integrations/klaviyo-sync.ts` | Keeps hourly/manual sync bounded while the current campaign-only ingestion slice fetches included campaign tags, the beta campaign-audience relationship map, and one paced campaign values report per needed metric day. | Move broader Klaviyo datasets into explicit queued/operator jobs instead of adding them to this sync. |
| Klaviyo already-ingested campaign performance date skip | `src/lib/sync/run-sync.ts` and `src/lib/integrations/klaviyo-sync.ts` | Skips Klaviyo campaign report calls for historical `send_date` values already present in `klaviyo_campaign_reports`, while still refreshing the current sync end date for same-day updates. | Keep; verify with live sync logs before production launch. |

## Verification Plan

- Run lint and type checks after dependencies are installed.
- Do not run production build unless explicitly requested.
- Verify login route redirects authenticated users to dashboard.
- Verify protected dashboard routes redirect unauthenticated users to login.
- Verify cron route rejects missing or invalid `CRON_SECRET`.
- Verify manual sync rejects unauthenticated requests.
- Verify `/dashboard` and blank report routes intentionally render only the shared app shell while placeholders are active.
- Verify `/campaigns` and `/klaviyo/campaigns` render synced campaign report rows or campaign metadata fallback rows, wired campaign search/date/region/audience/channel/status/tag/archive controls, and no secrets or raw API payloads.
- Verify `/flows` and `/klaviyo/flows` render synced flow report rows, flow metadata enrichment, and no secrets or raw API payloads.
- Verify Campaigns and Flows paginate after their active search/filter/sort state, show filtered counts, and avoid internal horizontal table scrollbars.
- Verify wide Campaigns and Flows tables use page-level horizontal scrolling when the viewport is narrower than the table.
- Verify Settings rejects unauthenticated users through dashboard auth.
- Verify Settings does not render saved platform secret values.
- Verify the Shopify connect button opens the Shopify step-by-step modal.
- Verify the Klaviyo connect button opens the Klaviyo step-by-step modal.
- Verify provider-specific save forms do not require the other provider's credential.
- Verify timezone is selected from a dropdown in both provider modals.
- Verify the Klaviyo modal explains that the active sync fetches only campaigns, campaign performance, campaign status, campaign audiences, and campaign tags.
- Verify disconnect nulls encrypted secret columns.
- Verify sync ignores inactive regions and runs Shopify-ready or Klaviyo-ready regions only.
- Verify combined Shopify/Klaviyo regions can sync both platforms and report partial status if only one platform fails.
- Verify Klaviyo-only regions can sync campaign rows or return sanitized partial warnings for missing campaign tag/audience detail scopes.
- Verify a repeated 30-90 day sync logs skipped existing campaign performance dates and only calls Klaviyo for missing historical dates plus the current sync end date.
- Verify Klaviyo Settings metric lookup 400/429 logs include sanitized JSON:API error summaries without API keys, auth headers, raw payloads, or customer data.
- Verify Supabase write logs include table, conflict target, row count, and sanitized PostgREST error details without secrets.

## Verification Completed

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | Uses `eslint .` because the installed Next.js version no longer exposes `next lint`. |
| `npm run typecheck` | Passed | Uses `tsc --noEmit`. |
| Browser overview check | Passed | Confirmed dashboard content, sync button, no runtime overlay, and no console errors. |
| Browser campaigns check | Passed | Confirmed campaign report page renders without a runtime overlay or console errors. |
| Browser mobile check before page-level table scroll change | Passed | Confirmed the earlier 390px viewport behavior before Campaigns and Flows were changed to use page-level horizontal scrolling for wide tables. |
| Browser settings provider modal check | Passed | Confirmed separate Shopify and Klaviyo guided modals open, final forms stay provider-specific, timezone uses a dropdown, Klaviyo has no manual conversion metric ID field, and no browser console errors appear. |
| Independent platform sync gate check | Passed | Code path now loads active Shopify-only, Klaviyo-only, and combined connections; sync runner calls only connected platform clients and reports partial success if one platform fails while another syncs. Verified with lint and focused code review, not a live platform sync. |
| Klaviyo Reporting API request contract review | Passed | Updated sync request body to use `bounced`, endpoint-required `group_by` fields, and parser support for Klaviyo `groupings` plus `statistics`. Verified with lint and typecheck; live Klaviyo API sync was not run during this check. |
| Klaviyo database upsert grain review | Passed | Collapsed campaign result groups to campaign/date rows and flow result groups to flow/date rows before Supabase upsert, matching the table unique constraints. Live Klaviyo API sync was not run during this check. |
| Current lint after Klaviyo Reporting API request fix | Passed | `npm run lint`. |
| Current typecheck after Klaviyo Reporting API request fix | Passed | `npm run typecheck`. |
| Current lint after Klaviyo database upsert grain fix | Passed | `npm run lint`. |
| Current typecheck after Klaviyo database upsert grain fix | Passed | `npm run typecheck`. |
| Current typecheck after comprehensive Klaviyo sync expansion | Passed | `npm run typecheck`. |
| Current lint after comprehensive Klaviyo sync expansion | Passed | `npm run lint`. |
| Current static review after Klaviyo raw-resource ingestion rebuild | Completed | Inspected changed files and docs without running lint/typecheck because the current project instruction forbids build/test commands unless explicitly requested. |
| Static review after recoverable Klaviyo endpoint failure fix | Completed | Confirmed top-level campaign/flow metadata fetches now run sequentially with reduced-request fallbacks and sanitized endpoint/status logging. Live sync was not rerun in this turn. |
| Current static review after Klaviyo optional raw-resource hardening | Completed | Ran `git diff --check`, reviewed log statements, and searched for stale paused/pending Klaviyo wording. Did not run lint, typecheck, build, or live sync because the current project instruction forbids build/test commands unless explicitly requested. |
| Static review after Klaviyo campaign-only sync narrowing | Completed | Reviewed the campaign-only sync path, removed `page[size]` from campaign tag relationship fallbacks, replaced per-campaign audience probes with the beta campaign-audience relationship map, and did not run lint/typecheck/build/live sync because the current project instruction forbids build/test commands unless explicitly requested. |
| Read-only Klaviyo campaign metric mismatch diagnostic | Completed | Compared `ProductPush-WorkWearCo-Ords-ZyraMyraAlyrah-26` stored report row against Klaviyo Reporting API without printing credentials. Klaviyo returned `recipients=10398`, `delivered=10353`, `opens_unique=2940`, `open_rate=0.28398`, `clicks_unique=102`, `click_rate=0.00985`, `conversion_uniques=5`, and `conversion_value=447.6`; the stored row had been using raw opens/clicks over recipients. |
| Static review after Klaviyo native campaign metric mapping fix | Completed | Added migration `S006-klaviyo-campaign-report-native-rates.sql`, updated sync mapping to persist native rates/unique counts, and reviewed affected TypeScript/docs. Did not run lint, typecheck, build, or live sync because the current project instruction forbids build/test commands unless explicitly requested. |
| Static review after Klaviyo already-ingested date skip | Completed | Added existing `klaviyo_campaign_reports.send_date` inspection before campaign performance calls, kept the requested manual window intact, and ran `git diff --check`. Did not run lint, typecheck, build, or live sync because the current project instruction forbids build/test commands unless explicitly requested. |
| Static review after table pagination and page-level scroll change | Completed | Added filtered pagination to Campaigns and Flows, removed active inner horizontal table scroll wrappers, updated page docs, and ran `git diff --check`. Did not run lint, typecheck, or build because the current project instruction forbids build/test commands unless explicitly requested. |
| Local cron sync after Klaviyo database upsert grain fix | Passed | Triggered `GET /api/cron/hourly-sync` against the local dev server with the server-side cron secret. Response was `200` with sync run `4786456a-eacd-4bb6-bd46-2d92f37e3d3f` and status `success` for 1 region. |
| `GET /api/cron/hourly-sync` without secret | Passed | Returned `401 Unauthorized` with a sanitized JSON error. |
| `GET /api/sync/status` in local demo mode | Passed | Returned sanitized demo sync metadata because `DEMO_MODE=true` locally. |
| Production build | Not run | Project instruction forbids build tests unless explicitly requested. |
| Dependency audit | Warning | `npm audit --omit=dev` reports a moderate transitive `postcss` advisory through the current Next.js package. Do not use the suggested force downgrade; monitor for a patched Next.js release. |
