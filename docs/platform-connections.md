<!--
File description:
This developer guide explains how Shopify and Klaviyo are connected to the internal reporting dashboard.
It covers the plain-English connection model, required platform permissions, environment variable setup,
sync flow, smoke tests, troubleshooting, token rotation, and security rules for maintaining the integration.
-->

# Platform Connections

## Plain-English Overview

This dashboard does not connect to Shopify or Klaviyo from the browser. It stores private platform
credentials in server-only environment variables, runs a background sync on the server, saves normalized
reporting rows into Supabase, and then shows those saved rows in the dashboard.

The flow is:

1. A developer creates or collects one Shopify Admin API token and one Klaviyo private API key for each region.
2. The developer stores those credentials in `REGION_CONFIG_JSON`.
3. Vercel Cron calls `/api/cron/hourly-sync` once per hour.
4. Internal users can click the manual sync button, which calls `/api/sync`.
5. The sync service fetches Shopify order data and Klaviyo campaign/flow reporting data.
6. The sync service writes clean, summarized rows to Supabase.
7. Dashboard pages read Supabase rows instead of calling Shopify or Klaviyo directly.

This design keeps the UI fast, avoids leaking secrets, and reduces the chance of hitting platform rate limits.

## Official Docs Used

- Shopify custom app access tokens: `https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin`
- Shopify API access scopes: `https://shopify.dev/docs/api/usage/access-scopes`
- Shopify Admin GraphQL orders query: `https://shopify.dev/docs/api/admin-graphql/latest/queries/orders`
- Klaviyo API authentication: `https://developers.klaviyo.com/en/docs/authenticate_`
- Klaviyo campaign values reports: `https://developers.klaviyo.com/en/reference/query_campaign_values`
- Klaviyo flow values reports: `https://developers.klaviyo.com/en/reference/query_flow_values`
- Supabase SSR client setup: `https://supabase.com/docs/guides/auth/server-side/nextjs`
- Supabase API security and RLS: `https://supabase.com/docs/guides/api/securing-your-api`

## Where The Connection Lives In This App

| Area | File | Responsibility |
| --- | --- | --- |
| Region config parser | `/src/lib/config/regions.ts` | Reads and validates `REGION_CONFIG_JSON`. |
| Shared config type | `/src/lib/types.ts` | Defines `RegionIntegrationConfig`. |
| Shopify client | `/src/lib/integrations/shopify.ts` | Calls Shopify Admin GraphQL and aggregates orders by day. |
| Klaviyo client | `/src/lib/integrations/klaviyo.ts` | Calls Klaviyo campaign and flow report endpoints. |
| Sync orchestrator | `/src/lib/sync/run-sync.ts` | Runs each region sync and writes rows to Supabase. |
| Cron route | `/src/app/api/cron/hourly-sync/route.ts` | Runs hourly sync when the request has `CRON_SECRET`. |
| Manual route | `/src/app/api/sync/route.ts` | Runs manual sync for authenticated dashboard users. |
| Env example | `/.env.example` | Shows the required environment variable shape. |

## Required Environment Variables

Public browser-safe values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server-only values:

```bash
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
DEMO_MODE=false
KLAVIYO_REVISION=2026-04-15
SHOPIFY_API_VERSION=2026-07
REGION_CONFIG_JSON='[...]'
```

Security rules:

- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may use the `NEXT_PUBLIC_` prefix.
- Shopify tokens, Klaviyo private keys, Supabase secret/service-role keys, and `CRON_SECRET` must never use `NEXT_PUBLIC_`.
- Never paste real secrets into Markdown docs, screenshots, tickets, or browser-visible code.

## `REGION_CONFIG_JSON` Schema

`REGION_CONFIG_JSON` is a JSON array. Each object represents one reporting region and contains the
credentials needed to connect that region's Shopify shop and Klaviyo account.

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

| Field | Required | Meaning |
| --- | --- | --- |
| `slug` | Yes | Stable lowercase identifier used in filters and database rows, for example `us`, `uk`, or `eu`. |
| `name` | Yes | Human-readable region label shown in the dashboard. |
| `currencyCode` | Yes | ISO currency code used for display and stored rows. |
| `timezone` | Yes | Region timezone for future reporting refinements. Current sync windows use UTC day boundaries. |
| `shopifyShopDomain` | Yes | Shopify shop domain such as `brand-us.myshopify.com`. Do not include admin URLs or API paths. |
| `shopifyAdminAccessToken` | Yes | Shopify Admin API access token for that shop. |
| `klaviyoPrivateKey` | Yes | Klaviyo private API key for that Klaviyo account. |
| `klaviyoAccountLabel` | No | Friendly label stored in the `regions` table. |
| `klaviyoConversionMetricId` | No | Optional Klaviyo conversion metric ID if the account requires an explicit metric for revenue reporting. |

## Shopify Setup

### What Shopify Credential Is Needed

For each Shopify shop, this app needs a Shopify Admin API access token. The token must be stored in
`REGION_CONFIG_JSON` as `shopifyAdminAccessToken`.

The Shopify request uses:

```http
POST https://{shop}.myshopify.com/admin/api/{SHOPIFY_API_VERSION}/graphql.json
Content-Type: application/json
X-Shopify-Access-Token: {shopifyAdminAccessToken}
```

The current code reads order data from the Shopify Admin GraphQL `orders` query.

### Recommended Shopify Scopes

Minimum for the current dashboard:

- `read_orders`

Recommended when reporting ranges may need orders older than Shopify's default recent-order window:

- `read_all_orders`

Important notes:

- Shopify states that `read_all_orders` is used with order scopes such as `read_orders`.
- Shopify may require additional approval for `read_all_orders`.
- Do not request write scopes for this dashboard unless the product scope changes.

### Shopify Connection Steps

1. Open the Shopify admin for the target store.
2. Create or install the custom app used by this internal dashboard.
3. Grant the app `read_orders`.
4. Request and grant `read_all_orders` only if historical reporting beyond the default order window is required.
5. Install the app and copy the Admin API access token.
6. Copy the shop domain, for example `brand-us.myshopify.com`.
7. Add both values to the correct object in `REGION_CONFIG_JSON`.
8. Run a manual sync in development or staging.
9. Confirm rows appear in `shopify_daily_metrics`.
10. Confirm Shopify revenue, orders, refunds, cancellations, and AOV render for that region.

### Shopify Smoke Test

Use this only from a secure terminal. Do not paste real token output into docs or chat.

```bash
curl -sX POST "https://SHOP_DOMAIN/admin/api/2026-07/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: SHOPIFY_ADMIN_ACCESS_TOKEN" \
  -d '{"query":"query { orders(first: 1, sortKey: CREATED_AT, reverse: true) { edges { node { id createdAt currentTotalPriceSet { shopMoney { amount currencyCode } } } } } }"}'
```

Expected result:

- HTTP `200`.
- JSON with `data.orders.edges`.

Failure hints:

- `401` or `403`: token is missing, invalid, not installed, or does not have the needed scope.
- GraphQL permission errors: app scopes are too narrow.
- Empty data: the shop may have no orders in the requested range, or the app lacks older-order access.

## Klaviyo Setup

### What Klaviyo Credential Is Needed

For each Klaviyo account, this app needs a Klaviyo private API key. The key must be stored in
`REGION_CONFIG_JSON` as `klaviyoPrivateKey`.

The Klaviyo request uses:

```http
Authorization: Klaviyo-API-Key {klaviyoPrivateKey}
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json
revision: 2026-04-15
```

The current code calls:

- `POST https://a.klaviyo.com/api/campaign-values-reports`
- `POST https://a.klaviyo.com/api/flow-values-reports`

### Recommended Klaviyo Scopes

Minimum for the current dashboard:

- `campaigns:read`
- `flows:read`

Optional if future work adds broader metric aggregate reporting:

- `metrics:read`

Important notes:

- Use a read-only or custom-scoped key whenever possible.
- Klaviyo private keys cannot be viewed again after creation, so copy the key into the deployment secret store immediately.
- If a key has the wrong scopes, create a new key. Do not reuse broad full-access keys for convenience.

### Klaviyo Connection Steps

1. Open the Klaviyo account for the target region.
2. Go to account settings and create a private API key.
3. Choose read-only or custom scopes.
4. Include `campaigns:read` and `flows:read`.
5. Copy the private key immediately.
6. Add it to the correct object in `REGION_CONFIG_JSON`.
7. If revenue attribution requires a specific conversion metric, add `klaviyoConversionMetricId`.
8. Run a manual sync in development or staging.
9. Confirm rows appear in `klaviyo_campaign_reports`, `klaviyo_flow_reports`, and `klaviyo_daily_metrics`.
10. Confirm campaign, flow, open rate, click rate, conversion rate, and attributed revenue render.

### Klaviyo Smoke Test

Use this only from a secure terminal. The payload below is intentionally minimal and should be adjusted to a
small date range that has known campaign activity.

```bash
curl -sX POST "https://a.klaviyo.com/api/campaign-values-reports" \
  -H "Authorization: Klaviyo-API-Key KLAVIYO_PRIVATE_KEY" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "revision: 2026-04-15" \
  -d '{
    "data": {
      "type": "campaign-values-report",
      "attributes": {
        "timeframe": {
          "start": "2026-07-01T00:00:00Z",
          "end": "2026-07-02T23:59:59Z"
        },
        "statistics": ["recipients", "opens", "clicks", "conversions", "conversion_value"]
      }
    }
  }'
```

Expected result:

- HTTP `200`.
- JSON containing report data or an empty result set for a quiet range.

Failure hints:

- `400`: missing, malformed, or wrong-account key.
- `403`: private key does not have the required scope.
- `429`: Klaviyo rate limit hit. Wait before retrying.
- Empty revenue: confirm the account's attribution setup and whether `klaviyoConversionMetricId` is needed.

## Supabase Setup

Supabase is the local reporting cache. It stores the normalized data that pages read.

Before live sync:

1. Create or choose a Supabase project.
2. Apply `/supabase/migrations/S001-initial-analytics-dashboard.sql`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`.
4. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Set `SUPABASE_SERVICE_ROLE_KEY` or the current Supabase server-side secret key equivalent.
6. Confirm RLS is enabled on reporting tables.
7. Confirm authenticated users can `select` reporting rows.
8. Confirm browser clients cannot insert, update, or delete reporting rows.
9. Confirm service-role writes are used only by server-only sync code.

The sync service writes to:

- `regions`
- `sync_runs`
- `shopify_daily_metrics`
- `klaviyo_daily_metrics`
- `klaviyo_campaign_reports`
- `klaviyo_flow_reports`

Dashboard pages read those same reporting tables through authenticated Supabase server clients.

## Local Development Setup

1. Create `.env.local` from `.env.example`.
2. Use `DEMO_MODE=true` if you only want to inspect the UI.
3. Use `DEMO_MODE=false` when testing real platform connections.
4. Fill in Supabase values.
5. Fill in `REGION_CONFIG_JSON`.
6. Start the dev server.
7. Sign in through Supabase Auth unless demo mode is enabled.
8. Trigger manual sync from the dashboard.
9. Check `sync_runs` for status and sanitized error details.

Do not commit `.env.local`.

## Production Setup

1. Store all environment variables in the deployment platform's secret manager.
2. Keep `DEMO_MODE=false` or unset.
3. Set `CRON_SECRET` to a long random value.
4. Deploy `vercel.json` with the hourly cron route.
5. Confirm `/api/cron/hourly-sync` rejects requests without the bearer token.
6. Confirm Vercel Cron sends the expected bearer token.
7. Run a manual sync for one region.
8. Confirm each expected Supabase table receives rows.
9. Let one hourly cron run complete.
10. Review logs for sanitized sync messages only.

## Sync Behavior

- Manual sync accepts `rangeDays` but caps it to 90 days.
- Cron sync uses the server-side default range.
- Only one running sync is allowed at a time.
- One failed region can produce a `partial` run instead of hiding other successful regions.

Shopify sync:

- Pulls orders by `created_at` range.
- Paginates with GraphQL cursors.
- Aggregates revenue, orders, unique customers, refunds, and cancellations by day.
- Writes daily rows to `shopify_daily_metrics`.

Klaviyo sync:

- Pulls campaign value reports.
- Pulls flow value reports.
- Normalizes report rows into campaign, flow, and daily aggregate tables.
- Writes campaign rows, flow rows, and daily attributed revenue rows.

## Adding A New Region

1. Create or collect the Shopify Admin API token for the new region's shop.
2. Create or collect the Klaviyo private key for the new region's account.
3. Add a new object to `REGION_CONFIG_JSON`.
4. Use a stable `slug`; changing it later creates a new region identity in reporting.
5. Deploy the updated env var.
6. Run a manual sync.
7. Confirm the new region appears in the dashboard region filter.
8. Confirm Supabase has one `regions` row for the new slug.
9. Confirm Shopify and Klaviyo rows exist for the new `region_id`.

## Troubleshooting

### Dashboard Shows Demo Data

Likely cause:

- `DEMO_MODE=true`.

Fix:

- Set `DEMO_MODE=false` or remove the variable in production.

### Manual Sync Returns Unauthorized

Likely cause:

- User is not signed in.
- Supabase auth cookies are missing or invalid.

Fix:

- Sign in again.
- Confirm Supabase URL and publishable key are correct.
- Confirm the Supabase proxy/session refresh code is deployed.

### Cron Sync Returns Unauthorized

Likely cause:

- Missing or incorrect `Authorization: Bearer ${CRON_SECRET}`.

Fix:

- Confirm `CRON_SECRET` is set.
- Confirm Vercel Cron or the caller sends the bearer token.

### Shopify Sync Fails

Common causes:

- Wrong `shopifyShopDomain`.
- Token copied incorrectly.
- Custom app not installed on the shop.
- Missing `read_orders`.
- Historical range requires `read_all_orders`.
- Shopify throttling on a large store.

Debug steps:

1. Run the Shopify smoke test with a one-order query.
2. Confirm the token belongs to the same shop domain.
3. Confirm app scopes in Shopify admin.
4. Retry with a smaller date range.
5. Check `sync_runs.error_details`; it should be sanitized.

### Klaviyo Sync Fails

Common causes:

- Wrong private key.
- Key belongs to a different account.
- Missing `campaigns:read` or `flows:read`.
- Unsupported or retired `KLAVIYO_REVISION`.
- Rate limits from repeated manual sync attempts.
- Missing conversion metric configuration for revenue.

Debug steps:

1. Run the Klaviyo smoke test for a small date range.
2. Confirm key scopes in Klaviyo.
3. Confirm `KLAVIYO_REVISION` is current.
4. Wait before retrying after `429`.
5. Add `klaviyoConversionMetricId` if revenue returns blank but engagement stats work.

### Supabase Writes Fail

Common causes:

- Migration was not applied.
- `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong.
- Table names differ from the migration.
- RLS/grants were changed after migration.

Debug steps:

1. Confirm migration `S001-initial-analytics-dashboard.sql` has run.
2. Confirm the server-only Supabase key is available in the deployment.
3. Check `sync_runs` creation first; if it fails, the sync cannot proceed.
4. Confirm reporting tables exist with the expected unique constraints.

## Token Rotation

Shopify:

- If an Admin-created custom app token must change, Shopify may require uninstalling/reinstalling or recreating the app.
- Update `REGION_CONFIG_JSON` immediately after rotating the token.
- Run a manual sync to confirm the new token works.

Klaviyo:

- Create a new private key with the same minimum scopes.
- Update `REGION_CONFIG_JSON`.
- Delete the old key after the new key is verified.
- Run a manual sync to confirm the new key works.

Supabase:

- Rotate server-side secret/service-role keys only during a planned deployment window.
- Update the deployment secret store first.
- Redeploy.
- Run a manual sync.
- Confirm dashboard reads still work for authenticated users.

## Security Rules

- Never store Shopify or Klaviyo credentials in Supabase tables.
- Never return platform credentials from API routes.
- Never log raw Shopify orders or raw Klaviyo payloads.
- Never log customer emails, names, addresses, phone numbers, API keys, access tokens, or auth headers.
- Keep sync logs to region slug, sync run ID, row counts, status, and sanitized error text.
- Use read-only/custom-scoped platform credentials.
- Treat `REGION_CONFIG_JSON` as a production secret.
- Review `/docs/security-concerns.md` whenever connection behavior changes.

## Developer Change Checklist

- Update this file if scopes, env vars, endpoints, or connection flow change.
- Update `/docs/dev-to-production.md` if production setup changes.
- Update `/docs/rate-limit-guide.md` if API call volume or retry behavior changes.
- Update `/docs/contract-documentation/api-contract-documentation.md` if sync routes change.
- Update `/docs/db-plan.md` if database tables or columns change.
- Keep all new integration code server-only.
- Do not run production build unless explicitly approved.
