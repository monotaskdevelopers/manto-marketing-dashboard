<!--
File description:
This developer guide explains the database-backed Shopify and Klaviyo connection model for the dashboard.
It covers the settings page workflow, encrypted credential storage, platform key creation steps, disconnect
behavior, sync behavior, troubleshooting, and security rules for future developers.
-->

# Platform Connections

## Plain-English Overview

Shopify and Klaviyo accounts should be connected from the dashboard Settings page, not by editing a JSON
environment variable. An internal user enters the region details and platform credentials in the Settings
page. The server encrypts the sensitive keys, saves them in Supabase, and only decrypts them later inside
server-only sync code.

The browser never receives Shopify tokens or Klaviyo private keys.

The flow is:

1. Internal user opens `/settings`.
2. User follows the on-page Shopify and Klaviyo setup guides.
3. User enters the region details, Shopify shop domain, Shopify Admin API token, Klaviyo private key, and optional Klaviyo conversion metric ID.
4. A server action validates the authenticated user.
5. The server encrypts the Shopify and Klaviyo secrets with `APP_ENCRYPTION_KEY`.
6. The encrypted secrets and non-secret connection metadata are saved to Supabase.
7. Hourly cron and manual sync load active connections from Supabase.
8. Sync decrypts secrets only on the server, calls Shopify/Klaviyo, and writes normalized reporting rows.
9. Users can disconnect Shopify or Klaviyo from `/settings`; disconnect removes the encrypted secret from the database.

## Architecture Decision

Previous design:

- Region credentials lived in `REGION_CONFIG_JSON`.

Current design:

- Region display metadata lives in `regions`.
- Platform connection metadata and encrypted secrets live in `platform_connections`.
- Sync reads active database connections instead of parsing `REGION_CONFIG_JSON`.
- `APP_ENCRYPTION_KEY` remains server-only and is never stored in Supabase.

This keeps the tool easier to operate for non-developers while still avoiding plain secret storage.

## Official Docs Used

- Shopify custom app access tokens: `https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin`
- Shopify API access scopes: `https://shopify.dev/docs/api/usage/access-scopes`
- Shopify Admin GraphQL orders query: `https://shopify.dev/docs/api/admin-graphql/latest/queries/orders`
- Klaviyo API authentication: `https://developers.klaviyo.com/en/docs/authenticate_`
- Klaviyo campaign values reports: `https://developers.klaviyo.com/en/reference/query_campaign_values`
- Klaviyo flow values reports: `https://developers.klaviyo.com/en/reference/query_flow_values`
- Supabase API security and RLS: `https://supabase.com/docs/guides/api/securing-your-api`
- Next.js forms and Server Actions: `https://nextjs.org/docs/app/guides/forms`

## Where The Connection Lives In This App

| Area | File | Responsibility |
| --- | --- | --- |
| Settings page | `/src/app/(dashboard)/settings/page.tsx` | Shows connection status, setup guides, connect form, and disconnect controls. |
| Settings actions | `/src/app/(dashboard)/settings/actions.ts` | Handles authenticated connect/disconnect form submissions. |
| Connection service | `/src/lib/settings/platform-connections.ts` | Validates input, encrypts/decrypts secrets, reads summaries, and writes connection rows. |
| Encryption helper | `/src/lib/security/secret-encryption.ts` | Encrypts and decrypts platform secrets with AES-256-GCM. |
| Region config loader | `/src/lib/config/regions.ts` | Loads active connected regions from Supabase for sync. |
| Shopify client | `/src/lib/integrations/shopify.ts` | Calls Shopify Admin GraphQL and aggregates orders by day. |
| Klaviyo client | `/src/lib/integrations/klaviyo.ts` | Calls Klaviyo campaign and flow report endpoints. |
| Sync orchestrator | `/src/lib/sync/run-sync.ts` | Runs each active connected region and writes rows to Supabase. |
| DB migration | `/supabase/migrations/S002-platform-connections.sql` | Adds `platform_connections` with RLS and service-role-only writes. |

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
APP_ENCRYPTION_KEY=
DEMO_MODE=false
KLAVIYO_REVISION=2026-04-15
SHOPIFY_API_VERSION=2026-07
```

`REGION_CONFIG_JSON` is no longer the live connection source.

## `APP_ENCRYPTION_KEY`

`APP_ENCRYPTION_KEY` protects platform secrets before they are stored in Supabase.

Requirements:

- Must be server-only.
- Must be stable across deployments.
- Must be 32 bytes when decoded.
- Recommended format is base64.

Generate one with:

```bash
openssl rand -base64 32
```

Do not rotate this casually. If it changes before existing secrets are re-encrypted, stored platform
connections cannot be decrypted.

## Database Storage Model

`regions` stores non-secret region metadata:

- `slug`
- `name`
- `currency_code`
- `timezone`
- `shopify_shop_domain`
- `klaviyo_account_label`
- `is_active`

`platform_connections` stores connection metadata and encrypted secrets:

- `region_id`
- `shopify_shop_domain`
- `shopify_admin_token_ciphertext`
- `shopify_connected_at`
- `shopify_disconnected_at`
- `klaviyo_account_label`
- `klaviyo_private_key_ciphertext`
- `klaviyo_conversion_metric_id`
- `klaviyo_connected_at`
- `klaviyo_disconnected_at`
- `created_by`
- `updated_by`

Only server-side code using the Supabase service role can read or write `platform_connections`.
Authenticated browser clients must not be granted direct access to that table.

## Settings Page Workflow

The Settings page should allow internal users to:

- See every configured region.
- See whether Shopify is connected.
- See whether Klaviyo is connected.
- Connect or update a region's Shopify/Klaviyo credentials.
- Disconnect Shopify for a region.
- Disconnect Klaviyo for a region.
- Deactivate a region without deleting historical reporting rows.
- Read step-by-step guidance for creating Shopify custom apps and Klaviyo private keys.

The page should never show existing secret values. If a key needs to change, the user pastes a new key.

## Shopify Setup Guide For The Settings Page

Credential needed:

- Shopify Admin API access token.

Required current scope:

- `read_orders`

Optional historical scope:

- `read_all_orders`

Steps:

1. Open the target Shopify store.
2. Create a new custom app through the current Shopify app creation flow.
3. Grant `read_orders`.
4. Add `read_all_orders` only if reporting must include older orders beyond Shopify's default recent-order window.
5. Install the app.
6. Copy the Admin API access token immediately.
7. Copy the shop domain, for example `brand-us.myshopify.com`.
8. Paste the shop domain and token into `/settings`.
9. Save the connection.
10. Run a manual sync to confirm the token works.

The app sends Shopify requests with:

```http
X-Shopify-Access-Token: {decrypted token}
```

## Klaviyo Setup Guide For The Settings Page

Credential needed:

- Klaviyo private API key.

Required current scopes:

- `campaigns:read`
- `flows:read`

Optional future scope:

- `metrics:read`

Steps:

1. Open the target Klaviyo account.
2. Go to account API key settings.
3. Create a private API key.
4. Use read-only or custom scopes.
5. Include `campaigns:read` and `flows:read`.
6. Copy the private key immediately.
7. Paste the private key into `/settings`.
8. Add a conversion metric ID only if the account needs explicit revenue metric selection.
9. Save the connection.
10. Run a manual sync to confirm reports return data.

The app sends Klaviyo requests with:

```http
Authorization: Klaviyo-API-Key {decrypted private key}
revision: 2026-04-15
```

## Disconnect Behavior

Disconnecting a platform should:

- Set the encrypted secret column to `null`.
- Set the matching connected timestamp to `null`.
- Set the matching disconnected timestamp to `now()`.
- Keep historical reporting rows intact.
- Keep non-secret region metadata unless the user deactivates the region.

Deactivating a region should:

- Set `regions.is_active=false`.
- Prevent future sync from using that region.
- Keep historical rows for past reporting.

## Sync Behavior

Sync should only run a region when:

- `regions.is_active=true`.
- Shopify has an encrypted token.
- Klaviyo has an encrypted private key.
- Neither Shopify nor Klaviyo is marked disconnected.

If no complete active connections exist, sync should fail gracefully with a clear sanitized message.

## Troubleshooting

### Settings Save Fails

Check:

- User is authenticated.
- `APP_ENCRYPTION_KEY` is set.
- Migration `S002-platform-connections.sql` has been applied.
- Required form fields are present.
- Region slug uses lowercase letters, numbers, or dashes.

### Sync Says No Connected Regions

Check:

- Region is active.
- Shopify is connected.
- Klaviyo is connected.
- The encrypted secret columns are not null.
- Disconnect timestamps are null for both platforms.

### Shopify Sync Fails

Check:

- Shop domain is correct.
- Token belongs to that shop.
- Custom app is installed.
- App has `read_orders`.
- Historical sync range does not require missing `read_all_orders`.

### Klaviyo Sync Fails

Check:

- Private key belongs to the correct account.
- Key has `campaigns:read` and `flows:read`.
- `KLAVIYO_REVISION` is supported.
- The account has campaign or flow data in the selected date range.
- `klaviyoConversionMetricId` is configured if revenue returns empty but engagement metrics work.

## Security Rules

- Never store plain Shopify or Klaviyo secrets in Supabase.
- Never return encrypted or decrypted secrets from server actions, API routes, or page props.
- Never expose `APP_ENCRYPTION_KEY` to the browser.
- Never log raw form data from `/settings`.
- Never log platform tokens, auth headers, customer data, raw Shopify orders, or raw Klaviyo payloads.
- Keep direct table access to `platform_connections` service-role-only.
- Use read-only/custom-scoped platform credentials.
- Review `/docs/security-concerns.md` whenever connection behavior changes.

## Developer Change Checklist

- Update this file if settings flow, scopes, env vars, encryption, or connection storage changes.
- Update `/docs/db-plan.md` when connection schema changes.
- Update `/docs/dev-to-production.md` when production setup changes.
- Update `/docs/route-details.md` when Settings routes change.
- Update `/docs/console-logs-update.md` if new sanitized logs are added.
- Keep all credential handling server-only.
- Do not run production build unless explicitly approved.
