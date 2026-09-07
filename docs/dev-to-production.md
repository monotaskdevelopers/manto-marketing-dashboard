<!--
File description:
This file lists the configuration and operational checks required before pushing the dashboard to production.
It focuses on secrets, redirects, cron behavior, Supabase policies, data sync safety, and user access.
-->

# Development To Production Checklist

## Current release: 7 September 2026

- Live: https://manto-marketing-dashboard-release.vercel.app in the requested Sanasgalaxy Vercel account.
- Final deployment `dpl_9EXwfPoRUub6qF8xdUxWi7eLeRos` is READY and aliased to production. Application source is commit `2a4c3d4`; subsequent changes are handoff documentation and environment-file ignore protection.
- Vercel's production build passed TypeScript and generated all 15 pages, including `/welcome`.
- Production `/welcome` and `/login` return 200. Anonymous `/settings` and `/klaviyo/campaigns` redirect to login; `/api/sync/status` and `/api/cron/hourly-sync` return 401.
- Public Supabase signup was disabled through the owner's dashboard and verified with `disable_signup=true`. No database migrations were applied.
- Sana's private invitation and plain-English onboarding email were sent to the authorized Gmail address; Gmail returned SENT. Recipient delivery, password setup, and first authenticated session are not yet verified.
- Vercel Cron is enabled at `0 3 * * *` (08:00–09:00 Pakistan time on Hobby). First scheduled run remains unobserved.
- GitHub main was pushed. GitHub automatic deployment is not connected; deploy future changes manually to this project.
- The reports' existing placeholder and flow-sync limitations remain documented in `/docs/sana-operator-guide.md`. This release does not certify the remaining checklist below as complete.

Preparation notes at the end of this file are historical and superseded by this release status where they conflict.

## Required Environment Variables

Public browser-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `APP_ENCRYPTION_KEY`
- `DEMO_MODE`

Optional Klaviyo variable:

- `KLAVIYO_REVISION`

## Platform Connection Storage

For the full platform connection guide, required scopes, smoke tests, and troubleshooting flow, see
`/docs/platform-connections.md`.

- Do not configure Shopify or Klaviyo credentials in `REGION_CONFIG_JSON`.
- Use `/settings` to connect or disconnect accounts.
- Store `APP_ENCRYPTION_KEY` as a stable server-only secret.
- Apply `/supabase/migrations/S002-platform-connections.sql` before saving live connections.
- Confirm `platform_connections` is not directly readable by `authenticated` or `anon`.

## Supabase Production Checks

- Apply `/supabase/migrations/S001-initial-analytics-dashboard.sql`.
- Apply `/supabase/migrations/S002-platform-connections.sql`.
- Apply `/supabase/migrations/S003-comprehensive-klaviyo-sync.sql`.
- Apply `/supabase/migrations/S004-klaviyo-campaign-flow-detail-sync.sql`.
- Apply `/supabase/migrations/S005-klaviyo-raw-resource-ingestion.sql`.
- Confirm RLS is enabled on all public reporting tables.
- Confirm authenticated users can read report tables.
- Confirm anonymous users cannot read report tables.
- Confirm anonymous users cannot read comprehensive Klaviyo profile, audience, membership, metric, event, tag,
  campaign, campaign-message, campaign-audience, flow, flow-action, flow-message, or raw-resource tables.
- Confirm service role writes are only used from server routes.
- Configure email/password auth or approved identity provider.
- Restrict signup to internal users through Supabase settings or an invitation workflow.
- Ensure `DEMO_MODE` is `false` or unset. Use `DEMO_MODE=true` only for explicit local UI review without live credentials.

## Initial User Bootstrap

For the full process, see `/docs/initial-user-setup.md`.

- Create the first internal user with a one-time server-side script or Supabase Auth admin tooling.
- Confirm the first user's email during creation so they can sign in immediately.
- Delete any temporary user-creation script after the account is verified.
- Rotate any bootstrap password that was shared through chat, tickets, or other retained systems.
- Keep public signup disabled unless an internal approval workflow is added.

## Shopify Production Checks

- Create or confirm Shopify app access for each shop.
- Grant only the scopes needed for reporting orders: `read_orders`, plus `read_all_orders` only if historical reporting beyond Shopify's default order window is required.
- Store access tokens only through `/settings`, where they are encrypted before being saved to Supabase.
- Confirm API rate behavior on the largest region before enabling hourly sync.

## Klaviyo Production Checks

- Klaviyo campaign-only ingestion is active in cron/manual sync.
- Create private keys with read-only/custom scopes for campaigns, campaign tags, campaign audiences,
  metrics, and campaign values reporting.
- Grant `metrics:read` so the app can detect the conversion metric ID used by synced campaign revenue and
  conversion values.
- Keep flows, profiles, events, metrics, lists, segments, broad raw resources, and images out of the active
  Klaviyo sync until those datasets have explicit product scope, retention, rate-limit, and privacy rules.
- Confirm the API revision is supported.
- Store private keys only through `/settings`, where they are encrypted before being saved to Supabase.

## Vercel Cron Checks

- Add `vercel.json` cron schedule.
- Set `CRON_SECRET` in production environment.
- Confirm cron runs only on production deployments.
- Confirm logs show sanitized sync status only.

## Go-Live Checks

- Run the production build only when explicitly approved by the project owner.
- Re-run `npm audit --omit=dev`; the current audit has a moderate transitive `postcss` advisory through Next.js and should be revisited before launch.
- Verify login.
- Verify dashboard report pages have been rebuilt, or explicitly accept the blank placeholder state for the release.
- Verify Campaigns displays live synced campaign report/metadata rows plus wired date/region/audience/channel/status/tag/archive controls before using it for production reporting decisions.
- Verify Flows displays live synced flow report rows plus flow metadata enrichment before using it for production reporting decisions.
- Connect or remove the remaining visual-only Campaigns and Flows action controls before production launch.
- Verify `/settings` loads for authenticated users.
- Verify a test region can be connected from `/settings`.
- Verify disconnect removes encrypted Shopify/Klaviyo secrets from `platform_connections`.
- Verify manual sync works for Shopify-ready test regions.
- Verify Klaviyo-only test regions sync campaign performance and metadata rows or return sanitized partial
  warnings for missing campaign report/tag/audience scopes.
- Apply `S006-klaviyo-campaign-report-native-rates.sql`, then run a fresh Klaviyo sync so existing
  campaign rows are replaced with native open/click/conversion rates and unique recipient action counts.
- Apply `S007-klaviyo-incremental-sync-state.sql` before deploying the incremental sync code so existing
  campaign report dates seed `klaviyo_sync_date_coverage` and the first post-deploy sync does not refetch
  the whole stored reporting window.
- Verify the first post-deploy Klaviyo sync logs `fullDayRequestLimit` and `deferredMissing`, then confirm
  any deferred historical report dates continue backfilling across later hourly/manual syncs instead of
  running as one long manual request.
- Verify combined Shopify/Klaviyo test regions sync both platforms and report partial status only when one platform or optional resource fails.
- Verify hourly cron sync works in production.
- Verify no secrets appear in browser bundle, responses, or logs.
- Verify no Klaviyo profile PII or raw event payloads appear in logs.
- Verify no demo data appears when `DEMO_MODE=false`.

## 7 September 2026 Deployment Preparation

- Owner approved daily automatic sync instead of hourly. `vercel.json` now schedules the existing protected
  `/api/cron/hourly-sync` endpoint at `0 3 * * *` (03:00 UTC; 08:00 Pakistan time). On Hobby the invocation
  may occur anywhere within that hour. Manual refresh remains available.
- Target account: Sanasgalaxy (`sanayousuf73-5542`). Deployment is not yet complete.
- The local encryption key had been copied into the uncommitted `.env.example`; its value was removed.
  The committed HEAD example was empty. Review retained copies and re-encrypt stored platform credentials
  before replacing the active key; changing only the environment key breaks existing connections.
- The owner approved the production push and build. `next build` passed, including TypeScript and route
  generation. The initial sandbox attempt failed because a build worker could not bind a local port;
  the approved run outside the sandbox succeeded. No migrations or Sana invitation were run.
- Read-only database checks succeeded for regions, platform connections, and incremental sync coverage.
  Sana does not yet have an Auth user.
- GitHub rejected the push with HTTP 403: the currently authenticated `HashirtheDev` account has no write
  access to `monotaskdevelopers/manto-marketing-dashboard`. The browser account switcher has no other saved
  account. Release remains local until an authorized repository account is connected.
- No production URL exists yet and no onboarding email has been sent.

## Deployment progress after owner sign-in

- Repository pushes now succeed using the existing `monotaskdevelopers` login.
- The browser upload created `https://vercel.com/sanasgalaxy/manto-marketing-dashboard-release`.
  Its initial build compiled successfully but failed during prerendering because production Supabase
  variables were not yet configured. It is not a working production deployment.
- The built `/welcome` invitation flow is pushed to GitHub; it still needs deployment.
- Automatic approval review blocked importing the production environment file pending explicit
  approval to transmit this app's credentials to the named Vercel project's Production environment.
- A read-only Auth settings request returned `disable_signup=false`. Because the current app grants
  authenticated users internal reporting access, disable public signup before launch. The signed-in
  Supabase browser account could not access project `vhloejynikpbrllplduw`; the project owner must sign in.
- No invitation has been created or emailed to Sana, and no migration was applied.
