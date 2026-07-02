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
- `REGION_CONFIG_JSON`
- `DEMO_MODE`

Optional Klaviyo variable:

- `KLAVIYO_REVISION`

## `REGION_CONFIG_JSON` Shape

For the full platform connection guide, required scopes, smoke tests, and troubleshooting flow, see
`/docs/platform-connections.md`.

```json
[
  {
    "slug": "us",
    "name": "United States",
    "currencyCode": "USD",
    "timezone": "America/New_York",
    "shopifyShopDomain": "example.myshopify.com",
    "shopifyAdminAccessToken": "shpat_xxx",
    "klaviyoPrivateKey": "pk_xxx",
    "klaviyoAccountLabel": "US Klaviyo",
    "klaviyoConversionMetricId": ""
  }
]
```

## Supabase Production Checks

- Apply `/supabase/migrations/S001-initial-analytics-dashboard.sql`.
- Confirm RLS is enabled on all public reporting tables.
- Confirm authenticated users can read report tables.
- Confirm anonymous users cannot read report tables.
- Confirm service role writes are only used from server routes.
- Configure email/password auth or approved identity provider.
- Restrict signup to internal users through Supabase settings or an invitation workflow.
- Ensure `DEMO_MODE` is `false` or unset. Local development currently uses demo mode so the UI can be reviewed without live credentials.

## Shopify Production Checks

- Create or confirm Shopify app access for each shop.
- Grant only the scopes needed for reporting orders: `read_orders`, plus `read_all_orders` only if historical reporting beyond Shopify's default order window is required.
- Store access tokens only in server-side environment variables.
- Confirm API rate behavior on the largest region before enabling hourly sync.

## Klaviyo Production Checks

- Create private keys with read-only or custom reporting scopes.
- Grant `campaigns:read` and `flows:read`; add `metrics:read` only if future metric aggregate reporting is implemented.
- Confirm campaign and flow report endpoints return expected fields for each account.
- Confirm the API revision is supported.
- Store private keys only in server-side environment variables.

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
- Verify manual sync works for one region.
- Verify hourly cron sync works in production.
- Verify no secrets appear in browser bundle, responses, or logs.
- Verify no demo data appears when `DEMO_MODE=false`.
