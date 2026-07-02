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
| Settings credential entry | `/src/app/(dashboard)/settings/page.tsx` | Lets local/staging users connect platform credentials for testing. | Keep, but verify `APP_ENCRYPTION_KEY` and RLS before production. |

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
- Verify disconnect nulls encrypted secret columns.
- Verify sync ignores inactive or incomplete platform connections.

## Verification Completed

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | Uses `eslint .` because the installed Next.js version no longer exposes `next lint`. |
| `npm run typecheck` | Passed | Uses `tsc --noEmit`. |
| Browser overview check | Passed | Confirmed dashboard content, sync button, no runtime overlay, and no console errors. |
| Browser campaigns check | Passed | Confirmed campaign report page renders without a runtime overlay or console errors. |
| Browser mobile check | Passed | Confirmed 390px viewport has no page-level horizontal overflow; wide tables scroll inside their own containers. |
| `GET /api/cron/hourly-sync` without secret | Passed | Returned `401 Unauthorized` with a sanitized JSON error. |
| `GET /api/sync/status` in local demo mode | Passed | Returned sanitized demo sync metadata because `DEMO_MODE=true` locally. |
| Production build | Not run | Project instruction forbids build tests unless explicitly requested. |
| Dependency audit | Warning | `npm audit --omit=dev` reports a moderate transitive `postcss` advisory through the current Next.js package. Do not use the suggested force downgrade; monitor for a patched Next.js release. |
