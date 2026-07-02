<!--
File description:
This file records the official documentation reviewed before implementation and the engineering decisions
made from that research. It is meant to help future developers understand why the app uses the selected
API endpoints, data model, auth strategy, sync schedule, and security boundaries.
-->

# Research And Decisions

## Official Sources Reviewed

Klaviyo:

- Klaviyo Query Campaign Values endpoint: `https://developers.klaviyo.com/en/reference/query_campaign_values`
- Klaviyo Query Flow Values endpoint: `https://developers.klaviyo.com/en/reference/query_flow_values`
- Klaviyo Query Metric Aggregates endpoint: `https://developers.klaviyo.com/en/reference/query_metric_aggregates`
- Klaviyo Get Metrics endpoint: `https://developers.klaviyo.com/en/reference/get_metrics`
- Klaviyo Get Profiles endpoint: `https://developers.klaviyo.com/en/reference/get_profiles`
- Klaviyo Get Lists endpoint: `https://developers.klaviyo.com/en/reference/get_lists`
- Klaviyo Get List Profiles endpoint: `https://developers.klaviyo.com/en/reference/get_list_profiles`
- Klaviyo Get Segments endpoint: `https://developers.klaviyo.com/en/reference/get_segments`
- Klaviyo Get Segment Profiles endpoint: `https://developers.klaviyo.com/en/reference/get_segment_profiles`
- Klaviyo Get Tags endpoint: `https://developers.klaviyo.com/en/reference/get_tags`
- Klaviyo Get Events endpoint: `https://developers.klaviyo.com/en/reference/get_events`
- Klaviyo Get Campaigns endpoint: `https://developers.klaviyo.com/en/reference/get_campaigns`
- Klaviyo Get Messages For Campaign endpoint: `https://developers.klaviyo.com/en/reference/get_messages_for_campaign`
- Klaviyo Get Flows endpoint: `https://developers.klaviyo.com/en/reference/get_flows`
- Klaviyo Get Flow Actions For Flow endpoint: `https://developers.klaviyo.com/en/reference/get_flow_actions_for_flow`
- Klaviyo Get Flow Messages For Flow Action endpoint: `https://developers.klaviyo.com/en/reference/get_flow_action_messages`
- Klaviyo API overview/category index: `https://developers.klaviyo.com/en/reference/api_overview`
- Klaviyo Catalogs, Coupons, Forms, Reviews, Templates, Tracking Settings, Web Feeds, and Webhooks API
  reference pages linked from the official API category index.
- Klaviyo API authentication: `https://developers.klaviyo.com/en/docs/authenticate_`
- Klaviyo API versioning policy: `https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy`

Shopify:

- Shopify Admin GraphQL `orders` query: `https://shopify.dev/docs/api/admin-graphql/latest/queries/orders`
- Shopify API limits: `https://shopify.dev/docs/api/usage/limits`
- Shopify API access scopes: `https://shopify.dev/docs/api/usage/access-scopes`
- Shopify custom app/admin access token docs: `https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin`

Supabase:

- Supabase Next.js SSR client guide: `https://supabase.com/docs/guides/auth/server-side/nextjs`
- Supabase API security guide: `https://supabase.com/docs/guides/api/securing-your-api`
- Supabase RLS guide: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase changelog index: `https://supabase.com/changelog.md`

Next.js and Vercel:

- Next.js Route Handlers: `https://nextjs.org/docs/app/getting-started/route-handlers`
- Vercel Cron Jobs: `https://vercel.com/docs/cron-jobs`

## Key Findings

### Klaviyo

- Klaviyo private keys authenticate server-side `/api` requests and should not be exposed in client-side code.
- The current active Klaviyo sync is limited to campaigns, campaign performance, campaign status, campaign
  audiences, campaign tags, and campaign tag IDs.
- Campaigns can be fetched by channel so email, SMS, and mobile push campaign rows can be deduplicated into
  one local campaign table.
- Campaign collection requests should include tags when Klaviyo supports it, reducing per-campaign tag
  endpoint pressure.
- Campaign audience relationship data should come from beta `GET /campaigns?include=campaign-audiences`
  instead of one audience request per campaign.
- Campaign-scoped tag relationship fallback endpoints should not receive `page[size]`; Klaviyo rejects that
  query on those resources.
- Campaign audience beta endpoints should use the `.pre` API revision only for the beta request.
- The Metrics API can return metric `id`, `name`, and `integration` for bounded conversion metric detection
  used by Settings and campaign performance sync.
- Campaign performance uses the Campaign Values Reporting API and must stay at one request per region/window
  unless a future queued reporting job is introduced.
- Campaign-list open/click/conversion rates should use Klaviyo's native rate fields and unique recipient
  action counts from Campaign Values Reporting API. A live mismatch check showed raw opens/clicks over
  `recipients` can drift from Klaviyo's UI; the stable denominator for native rates is delivered recipients
  when Klaviyo supplies `delivered`.
- Broader Klaviyo datasets such as flows, flow Reporting API rows, account-level daily metrics, profiles,
  events, lists, segments, templates, forms, coupons, web feeds, and webhooks should not be reintroduced
  without a separate scoped decision.
- New integrations should use the latest stable API revision and track deprecation timelines.

Decision:

- Keep the API revision in one constant so it can be upgraded deliberately.
- Store campaign report and metadata rows locally in Supabase so the Campaigns table can filter by region,
  date, status, channel, audience, tag, and archived state without calling Klaviyo on page load.
- Keep Klaviyo request and failure logs sanitized, but include endpoint path, revision, HTTP status, retry
  attempts, region slug, sync run ID, row counts, and JSON:API error summaries.
- Treat campaign fetch as required; if campaigns cannot be fetched after bounded retries, fail the Klaviyo
  region clearly.
- Treat campaign tag fallback and campaign-audience relationship-map endpoints as optional enrichment; after
  bounded retries, log sanitized warnings and continue syncing core campaign rows.
- Treat campaign performance reporting as optional enrichment; after bounded retries, log sanitized warnings
  and continue syncing campaign metadata rows.
- Keep beta/pre-release Klaviyo endpoints optional and non-fatal, and send the `.pre` API revision only for
  endpoints that require it.
- Exclude images and all broader Klaviyo resource families from the active sync because the current product
  slice does not need them.

### Shopify

- Shopify Admin GraphQL `orders` can return order data with filtering, sorting, and pagination.
- Shopify GraphQL API uses query-cost-based rate limiting.
- Shopify custom app Admin API requests use an Admin API access token in the `X-Shopify-Access-Token` header.
- Current order reporting needs `read_orders`; older historical order access may require `read_all_orders` with Shopify approval.
- Apps should query only required fields, cache data, regulate request rate, and retry responsibly.
- Existing admin-created custom apps still work, but new custom apps should be created through Shopify's Dev Dashboard or CLI.

Decision:

- Use Admin GraphQL orders query with date filters and pagination.
- Pull only fields needed for reporting.
- Aggregate order data into daily regional rows in Supabase.
- Keep store access tokens in server-only environment variables.

### Supabase

- Supabase SSR in Next.js needs separate browser and server clients.
- Server code should validate authenticated users with secure auth methods and should not trust client-supplied data.
- Tables exposed through the Data API need explicit grants plus RLS policies.
- Service role or secret keys must never be exposed to client-side code.

Decision:

- Use Supabase Auth for internal login.
- Use authenticated RLS read policies for dashboard tables.
- Use the service role key only in server-only sync code.
- Enable RLS on all public tables.

### Next.js

- Route Handlers live in the App Router `app` directory and are the right fit for sync APIs.
- Route Handlers are not cached by default, which is correct for sync and status endpoints.

Decision:

- Use App Router pages for dashboards.
- Use Route Handlers for cron sync and manual sync.
- Keep external API clients server-only.

### Vercel Cron

- Vercel Cron makes HTTP GET requests to configured route paths.
- Cron jobs are configured in `vercel.json`.
- Cron timezone is UTC.
- Hourly schedule should use `0 * * * *`.

Decision:

- Configure `/api/cron/hourly-sync` on `0 * * * *`.
- Protect cron route with `CRON_SECRET`.
- Keep manual sync separate from cron sync so browser-triggered sync can require an authenticated Supabase user.

## Architecture Decisions

1. Local reporting cache: Supabase stores normalized reporting rows so the dashboard is fast and external APIs are protected from repeated UI reads.
2. Database-backed settings: platform credentials are entered through `/settings`, encrypted with a server-only `APP_ENCRYPTION_KEY`, and stored as ciphertext in `platform_connections`.
3. Simple auth: all signed-in users can view the app; no roles in MVP.
4. Hourly and manual sync: cron keeps data fresh, manual sync handles urgent updates.
5. Date and region filters are URL query parameters so pages can be shared internally.
6. Demo mode is explicit: sample data can be used only when `DEMO_MODE=true`.

## Known Implementation Assumptions

- Each region maps to one Shopify shop and one Klaviyo account.
- Currency conversion is not performed in MVP. Totals across mixed currencies must be interpreted carefully.
- Klaviyo account-specific conversion metric IDs should be auto-detected from the connected account when credentials are saved.
- The app will be deployed on Vercel or a platform that can call the cron route hourly.
