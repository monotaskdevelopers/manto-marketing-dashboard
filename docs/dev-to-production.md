<!--
File description:
This file lists the configuration and operational checks required before pushing the dashboard to production.
It focuses on secrets, redirects, cron behavior, Supabase policies, data sync safety, and user access.
-->

# Development To Production Checklist

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
- Confirm RLS is enabled on all public reporting tables.
- Confirm authenticated users can read report tables.
- Confirm anonymous users cannot read report tables.
- Confirm service role writes are only used from server routes.
- Configure email/password auth or approved identity provider.
- Restrict signup to internal users through Supabase settings or an invitation workflow.
- Ensure `DEMO_MODE` is `false` or unset. Local development currently uses demo mode so the UI can be reviewed without live credentials.

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

- Create private keys with read-only or custom reporting scopes.
- Grant `campaigns:read`, `flows:read`, and `metrics:read`; `metrics:read` is used to auto-detect the conversion metric ID during Klaviyo connection.
- Confirm campaign and flow report endpoints return expected fields for each account.
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
- Verify dashboard pages load.
- Verify `/settings` loads for authenticated users.
- Verify a test region can be connected from `/settings`.
- Verify disconnect removes encrypted Shopify/Klaviyo secrets from `platform_connections`.
- Verify manual sync works for one region.
- Verify hourly cron sync works in production.
- Verify no secrets appear in browser bundle, responses, or logs.
- Verify no demo data appears when `DEMO_MODE=false`.
