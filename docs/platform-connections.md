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
3. User enters the region details and the credentials for whichever platform is being connected.
4. A server action validates the authenticated user.
5. When a Klaviyo key is saved, the server calls Klaviyo's Metrics API and stores the best detected conversion metric ID.
6. The server encrypts the Shopify and Klaviyo secrets with `APP_ENCRYPTION_KEY`.
7. The encrypted secrets and non-secret connection metadata are saved to Supabase.
8. Hourly cron and manual sync load active connections from Supabase.
9. Sync decrypts secrets only on the server, calls each connected platform independently, and writes normalized reporting rows.
10. Users can disconnect Shopify or Klaviyo from `/settings`; disconnect removes the encrypted secret from the database.

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
- Klaviyo Get Metrics endpoint: `https://developers.klaviyo.com/en/reference/get_metrics`
- Klaviyo Get Profiles endpoint: `https://developers.klaviyo.com/en/reference/get_profiles`
- Klaviyo Get Lists endpoint: `https://developers.klaviyo.com/en/reference/get_lists`
- Klaviyo Get Segments endpoint: `https://developers.klaviyo.com/en/reference/get_segments`
- Klaviyo Get Tags endpoint: `https://developers.klaviyo.com/en/reference/get_tags`
- Klaviyo Get Events endpoint: `https://developers.klaviyo.com/en/reference/get_events`
- Klaviyo Get Campaigns endpoint: `https://developers.klaviyo.com/en/reference/get_campaigns`
- Klaviyo Get Flows endpoint: `https://developers.klaviyo.com/en/reference/get_flows`
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
| Klaviyo client | `/src/lib/integrations/klaviyo.ts` | Calls Klaviyo reporting endpoints plus profiles, audiences, memberships, tags, metrics, events, campaigns, and flows. |
| Sync orchestrator | `/src/lib/sync/run-sync.ts` | Runs each active connected region, writes rows to Supabase in batches, and marks partial Klaviyo segments separately. |
| DB migration | `/supabase/migrations/S002-platform-connections.sql` | Adds `platform_connections` with RLS and service-role-only writes. |
| DB migration | `/supabase/migrations/S003-comprehensive-klaviyo-sync.sql` | Adds comprehensive Klaviyo data tables with RLS, indexes, and raw JSON payload retention. |

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

Required current scopes for campaign and flow reporting sync:

- `campaigns:read`
- `flows:read`

Required current scopes for comprehensive Klaviyo data sync:

- `profiles:read`
- `lists:read`
- `segments:read`
- `tags:read`
- `metrics:read`
- `events:read`

`metrics:read` lets the app automatically detect the best conversion metric ID through Klaviyo's Metrics
API after the private key is saved. It is also required to store the full metric library used by synced
events. If Klaviyo denies metric lookup during settings save, the app still stores the encrypted private
key so campaign and flow sync can run; the comprehensive sync segment will be marked partial if any
required comprehensive scope is missing.

Steps:

1. Open the target Klaviyo account.
2. Go to account API key settings.
3. Create a private API key.
4. Use read-only or custom scopes.
5. Include `campaigns:read`, `flows:read`, `profiles:read`, `lists:read`, `segments:read`, `tags:read`, `metrics:read`, and `events:read`.
6. Copy the private key immediately.
7. Click `Connect Klaviyo` or `Update Klaviyo` in `/settings`.
8. Follow the multi-step Klaviyo popup guide.
9. Paste the private key into the Klaviyo form.
10. Save the connection.
11. The server stores the encrypted private key before sync ever runs.
12. The server tries Klaviyo's Metrics API with `fields[metric]=id,name,integration`.
13. The server prefers revenue metrics such as `Placed Order` or `Ordered Product`.
14. If metric lookup is denied, reconnect later with `metrics:read`; campaign and flow sync can still run.
15. Run a manual sync to confirm reports and comprehensive Klaviyo tables return data.

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

## Klaviyo Reporting Request Shape

Campaign sync calls:

```http
POST https://a.klaviyo.com/api/campaign-values-reports
```

with `data.type=campaign-values-report`, `group_by` containing `campaign_id`, `campaign_message_id`,
`campaign_message_name`, and `send_channel`, and statistics including `recipients`, `opens`, `clicks`,
`conversions`, `conversion_value`, `unsubscribes`, `bounced`, and `spam_complaints`.

Flow sync calls:

```http
POST https://a.klaviyo.com/api/flow-values-reports
```

with `data.type=flow-values-report`, `group_by` containing `flow_id`, `flow_message_id`, `flow_name`,
`flow_message_name`, and `send_channel`, and the same statistics list.

Important implementation detail:

- Klaviyo's Reporting API statistic is `bounced`, not `bounces`.
- Klaviyo returns report rows under `groupings` and `statistics`; sync normalization must read both.
- Klaviyo returns message-level or channel-level result groups, while this app stores campaign/date and
  flow/date rows. Sync must collapse duplicate campaign/date and flow/date groups before Supabase upsert.
- Reporting requests should include the auto-detected `conversion_metric_id` so conversion and revenue
  statistics can be calculated.
- Debug logs should show only sanitized request metadata, normalization counts, Supabase write counts,
  and sanitized JSON:API or database error details.

## Klaviyo Comprehensive Data Request Shape

Comprehensive sync calls these Klaviyo GET endpoints:

- `GET /api/profiles` for all account profiles with subscriptions and predictive analytics when allowed.
- `GET /api/lists` and `GET /api/segments` for audience metadata.
- `GET /api/lists/{id}/profiles` and `GET /api/segments/{id}/profiles` for audience memberships.
- `GET /api/tags` for the tag library.
- `GET /api/metrics` for metric names and integration metadata.
- `GET /api/events` for events inside the current sync date window.
- `GET /api/campaigns` for email, SMS, and mobile push campaign metadata.
- `GET /api/flows` for flow metadata.

Important implementation detail:

- Comprehensive sync stores normalized columns plus `raw_payload` JSONB so future reports can use fields
  that are not promoted into first-class columns yet.
- Full-snapshot comprehensive tables use `last_seen_sync_run_id` so removed Klaviyo objects can be pruned
  after a successful full fetch.
- `klaviyo_events` is date-windowed by the manual/cron sync range and is not pruned as a full snapshot.
- Logs must show counts and endpoint names only, never profile emails, phone numbers, names, raw event
  properties, or full Klaviyo payloads.

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
- At least one platform has a connected encrypted credential.
- Shopify sync runs when Shopify has a shop domain, encrypted token, and no Shopify disconnect timestamp.
- Klaviyo sync runs when Klaviyo has an encrypted private key and no Klaviyo disconnect timestamp.

If no active regions have at least one connected platform, sync should fail gracefully with a clear sanitized
message that asks the user to reconnect a platform from Settings. A Klaviyo-only connection should still
sync Klaviyo reports, and a Shopify-only connection should still sync Shopify daily metrics.

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

### Klaviyo Sync Fails

Check:

- Private key belongs to the correct account.
- Key has `campaigns:read` and `flows:read` for reporting.
- Key has `profiles:read`, `lists:read`, `segments:read`, `tags:read`, `metrics:read`, and `events:read` for comprehensive data.
- `KLAVIYO_REVISION` is supported.
- Logs show `conversion_metric_id=present`; reconnect Klaviyo with `metrics:read` if the metric was not detected.
- Logs show requested statistics include `bounced`, not `bounces`.
- Logs show `group_by` includes the required campaign or flow ID fields for the endpoint.
- Logs show campaign and flow result groups being normalized into campaign/date and flow/date database rows.
- Logs show which Supabase table write failed, if any, plus sanitized PostgREST code/message/details/hint.
- Logs show comprehensive row counts only; no profile or event payloads should appear.
- The account has campaign or flow data in the selected date range.
- The Settings save step stored an encrypted Klaviyo key in `platform_connections`; reconnect Klaviyo if only the region label exists.

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
