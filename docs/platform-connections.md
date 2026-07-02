<!--
File description:
This developer guide explains the database-backed Shopify and Klaviyo connection model for the dashboard.
It covers the settings page workflow, encrypted credential storage, platform key creation steps, disconnect
behavior, current sync behavior, troubleshooting, and security rules for future developers.
-->

# Platform Connections

## Plain-English Overview

Shopify and Klaviyo accounts should be connected from the dashboard Settings page, not by editing a JSON
environment variable. An internal user enters the region details and platform credentials in the Settings
page. The server encrypts the sensitive keys, saves them in Supabase, and only decrypts them later inside
server-only code that needs them.

The browser never receives Shopify tokens or Klaviyo private keys.

The flow is:

1. Internal user opens `/settings`.
2. User follows the on-page Shopify and Klaviyo setup guides.
3. User enters the region details and the credentials for whichever platform is being connected.
4. A server action validates the authenticated user.
5. When a Klaviyo key is saved with `metrics:read`, the server calls Klaviyo's Metrics API and stores the best detected conversion metric ID.
6. The server encrypts the Shopify and Klaviyo secrets with `APP_ENCRYPTION_KEY`.
7. The encrypted secrets and non-secret connection metadata are saved to Supabase.
8. Hourly cron and manual sync currently load Shopify-ready connections from Supabase.
9. Sync decrypts Shopify secrets only on the server and writes normalized Shopify reporting rows.
10. Users can disconnect Shopify or Klaviyo from `/settings`; disconnect removes the encrypted secret from the database.

Klaviyo data ingestion is intentionally paused. The old Reporting API and comprehensive account sync code has
been removed so the next implementation can define a clean data contract before any Klaviyo account data is
pulled or written again.

## Architecture Decision

Previous design:

- Region credentials lived in `REGION_CONFIG_JSON`.

Current design:

- Region display metadata lives in `regions`.
- Platform connection metadata and encrypted secrets live in `platform_connections`.
- Sync reads active database connections instead of parsing `REGION_CONFIG_JSON`.
- Current sync writes Shopify reporting only; saved Klaviyo keys are retained for the upcoming ingestion rebuild.
- `APP_ENCRYPTION_KEY` remains server-only and is never stored in Supabase.

This keeps the tool easier to operate for non-developers while still avoiding plain secret storage.

## Official Docs Used

- Shopify custom app access tokens: `https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin`
- Shopify API access scopes: `https://shopify.dev/docs/api/usage/access-scopes`
- Shopify Admin GraphQL orders query: `https://shopify.dev/docs/api/admin-graphql/latest/queries/orders`
- Klaviyo API authentication: `https://developers.klaviyo.com/en/docs/authenticate_`
- Klaviyo Get Metrics endpoint: `https://developers.klaviyo.com/en/reference/get_metrics`
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
| Klaviyo helper | `/src/lib/integrations/klaviyo.ts` | Performs Settings-time conversion metric detection only; it does not ingest Klaviyo account data. |
| Sync orchestrator | `/src/lib/sync/run-sync.ts` | Runs each active Shopify-ready region, writes rows to Supabase in batches, and skips Klaviyo ingestion while the rebuild is scoped. |
| DB migration | `/supabase/migrations/S002-platform-connections.sql` | Adds `platform_connections` with RLS and service-role-only writes. |
| DB migration | `/supabase/migrations/S003-comprehensive-klaviyo-sync.sql` | Legacy/future Klaviyo data tables retained while the ingestion contract is redesigned. |

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
- `klaviyo_conversion_metric_id`, auto-detected from Klaviyo's Metrics API when a new Klaviyo key is saved
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
- Connect or update Shopify separately from Klaviyo.
- Connect or update Klaviyo separately from Shopify.
- Open a multi-step Shopify modal that guides the user through custom app setup before saving.
- Open a multi-step Klaviyo modal that guides the user through private key setup before saving.
- Select region timezone from a dropdown instead of typing the timezone manually.
- Let the app detect the Klaviyo conversion metric ID automatically after saving a Klaviyo key.
- Disconnect Shopify for a region.
- Disconnect Klaviyo for a region.
- Deactivate a region without deleting historical reporting rows.
- Read step-by-step guidance inside each platform-specific modal.

The page should never show existing secret values. If a key needs to change, the user pastes a new key.
Existing saved keys remain unchanged when a user updates non-secret metadata and leaves the password field
blank.

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
8. Click `Connect Shopify` or `Update Shopify` in `/settings`.
9. Follow the multi-step Shopify popup guide.
10. Paste the shop domain and token into the Shopify form.
11. Save the connection.
12. Run a manual sync to confirm the token works.

The app sends Shopify requests with:

```http
X-Shopify-Access-Token: {decrypted token}
```

## Klaviyo Setup Guide For The Settings Page

Credential needed:

- Klaviyo private API key.

Optional current scope:

- `metrics:read` lets the app automatically detect the best conversion metric ID through Klaviyo's Metrics
  API after the private key is saved.

Do not grant broader Klaviyo read scopes by default yet. Klaviyo account data ingestion is paused until the
new sync plan defines exactly which resources, fields, retention rules, and write paths are needed.

Steps:

1. Open the target Klaviyo account.
2. Go to account API key settings.
3. Create a private API key.
4. Use read-only or custom scopes.
5. Include only `metrics:read` if conversion metric detection is useful.
6. Copy the private key immediately.
7. Click `Connect Klaviyo` or `Update Klaviyo` in `/settings`.
8. Follow the multi-step Klaviyo popup guide.
9. Paste the private key into the Klaviyo form.
10. Save the connection.
11. The server stores the encrypted private key without starting Klaviyo ingestion.
12. The server tries Klaviyo's Metrics API with `fields[metric]=id,name,integration`.
13. The server prefers revenue metrics such as `Placed Order` or `Ordered Product`.
14. If metric lookup is denied, reconnect later with `metrics:read`.
15. Do not expect manual sync to pull Klaviyo account data until the ingestion rebuild is implemented.

The app sends Klaviyo requests with:

```http
Authorization: Klaviyo-API-Key {decrypted private key}
revision: 2026-04-15
```

Automatic metric ID lookup requests use:

```http
GET https://a.klaviyo.com/api/metrics?fields[metric]=id,name,integration
Authorization: Klaviyo-API-Key {private key with metrics:read}
revision: 2026-04-15
```

## Klaviyo Ingestion Rebuild Status

Klaviyo ingestion is currently disabled in the sync runner.

Current active behavior:

- `/settings` can save, update, and disconnect encrypted Klaviyo private keys.
- `src/lib/integrations/klaviyo.ts` only calls `GET /api/metrics?fields[metric]=id,name,integration` during
  Settings save when a new private key is provided.
- Manual and cron sync do not call Klaviyo Reporting API endpoints.
- Manual and cron sync do not call Klaviyo profile, list, segment, tag, event, campaign, flow, message, or
  action endpoints.
- Manual and cron sync do not write Klaviyo tables.

The rebuild must define the data contract first: target resources, exact fields, retention, rate limits,
PII handling, Supabase schema changes, sync cadence, backfill behavior, and page/query dependencies.

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
- Shopify sync runs when Shopify has a shop domain, encrypted token, and no Shopify disconnect timestamp.
- Klaviyo credentials may be saved, but Klaviyo data sync is currently skipped until the rebuild is implemented.

If no active regions have Shopify credentials, sync should fail gracefully with a clear sanitized message.
If the only active connections are Klaviyo connections, the message should explain that Klaviyo ingestion is
paused rather than implying credentials are missing.

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
- At least one platform is connected.
- For Shopify sync, `shopify_admin_token_ciphertext` is not null, a shop domain is present, and `shopify_disconnected_at` is null.
- For Klaviyo sync, `klaviyo_private_key_ciphertext` is not null and `klaviyo_disconnected_at` is null.
- The region has not been deactivated.

### Shopify Sync Fails

Check:

- Shop domain is correct.
- Token belongs to that shop.
- Custom app is installed.
- App has `read_orders`.
- Historical sync range does not require missing `read_all_orders`.

### Klaviyo Sync Does Not Pull Data

Check:

- This is expected right now. Klaviyo ingestion is paused while the sync plan is rebuilt.
- `/settings` can still store encrypted Klaviyo keys.
- `metrics:read` is only used for optional conversion metric detection during Settings save.
- Manual and cron sync should log that Klaviyo ingestion was skipped for combined Shopify/Klaviyo regions.
- A Klaviyo-only account should receive a clear "Klaviyo ingestion is paused" sync message instead of old Reporting API errors.

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
