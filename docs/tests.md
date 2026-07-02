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

## Verification Plan

- Run lint and type checks after dependencies are installed.
- Do not run production build unless explicitly requested.
- Verify login route redirects authenticated users to dashboard.
- Verify protected dashboard routes redirect unauthenticated users to login.
- Verify cron route rejects missing or invalid `CRON_SECRET`.
- Verify manual sync rejects unauthenticated requests.
- Verify dashboard shows an empty state when no data is synced yet.
- Verify Settings rejects unauthenticated users through dashboard auth.
- Verify Settings does not render saved platform secret values.
- Verify the Shopify connect button opens the Shopify step-by-step modal.
- Verify the Klaviyo connect button opens the Klaviyo step-by-step modal.
- Verify provider-specific save forms do not require the other provider's credential.
- Verify timezone is selected from a dropdown in both provider modals.
- Verify the Klaviyo modal explains that conversion metric ID detection is automatic when `metrics:read` is granted, but key storage still works for campaign and flow sync if metric lookup is blocked.
- Verify disconnect nulls encrypted secret columns.
- Verify sync ignores inactive regions and still runs Shopify-only, Klaviyo-only, and combined connected regions.

## Verification Completed

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | Uses `eslint .` because the installed Next.js version no longer exposes `next lint`. |
| `npm run typecheck` | Passed | Uses `tsc --noEmit`. |
| Browser overview check | Passed | Confirmed dashboard content, sync button, no runtime overlay, and no console errors. |
| Browser campaigns check | Passed | Confirmed campaign report page renders without a runtime overlay or console errors. |
| Browser mobile check | Passed | Confirmed 390px viewport has no page-level horizontal overflow; wide tables scroll inside their own containers. |
| Browser settings provider modal check | Passed | Confirmed separate Shopify and Klaviyo guided modals open, final forms stay provider-specific, timezone uses a dropdown, Klaviyo has no manual conversion metric ID field, and no browser console errors appear. |
| Independent platform sync gate check | Passed | Code path now loads active Shopify-only, Klaviyo-only, and combined connections; sync runner calls only connected platform clients and reports partial success if one platform fails while another syncs. Verified with lint and focused code review, not a live platform sync. |
| Current typecheck after Klaviyo save resilience update | Blocked | `npm run typecheck` now fails on dashboard page `MetricCard` and `DataTable` prop contract mismatches outside the sync/connection files. |
| `GET /api/cron/hourly-sync` without secret | Passed | Returned `401 Unauthorized` with a sanitized JSON error. |
| `GET /api/sync/status` in local demo mode | Passed | Returned sanitized demo sync metadata because `DEMO_MODE=true` locally. |
| Production build | Not run | Project instruction forbids build tests unless explicitly requested. |
| Dependency audit | Warning | `npm audit --omit=dev` reports a moderate transitive `postcss` advisory through the current Next.js package. Do not use the suggested force downgrade; monitor for a patched Next.js release. |
