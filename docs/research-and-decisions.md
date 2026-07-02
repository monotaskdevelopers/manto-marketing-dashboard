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

- Klaviyo provides Reporting API endpoints for campaign values and flow values.
- Klaviyo recommends Reporting API for campaign and flow performance that should match its UI.
- Campaign and flow values endpoints are low-rate endpoints, so sync jobs must avoid repeated rapid calls.
- Klaviyo metric aggregate queries can support broader event rollups, but the MVP should prefer campaign and flow reporting endpoints for campaign/flow tables.
- Klaviyo private keys authenticate server-side `/api` requests and should not be exposed in client-side code.
- The campaign report endpoint requires `campaigns:read`; the flow report endpoint requires `flows:read`.
- Campaign and flow report requests should use the statistic name `bounced`; `bounces` is not accepted by
  the Reporting API.
- Campaign and flow report responses group row identifiers under `groupings` and numeric metrics under
  `statistics`, so sync normalization must read both objects instead of assuming flat attributes.
- Campaign and flow reports can return multiple message or channel result groups for one logical
  campaign/date or flow/date row in our schema.
- The Metrics API can return metric `id`, `name`, and `integration`; use it to automatically detect the conversion metric ID after a Klaviyo key is saved.
- Klaviyo's Metrics API requires `metrics:read`, can filter by integration, and returns up to 200 metrics per page.
- A missing `metrics:read` scope should not block saving a Klaviyo key because campaign and flow sync only need their reporting scopes.
- Klaviyo profiles, lists, segments, list profiles, segment profiles, tags, metrics, events, campaigns,
  campaign messages, flows, flow actions, and flow messages are cursor-paginated JSON:API resources that
  should be followed until `links.next` is absent.
- Use the profile endpoints for recipient-level rows and list/segment profile endpoints for audience
  membership rows; do not log profile PII while syncing those resources.
- Use campaign metadata plus campaign-message resources so reports can filter by campaign status, channel,
  subject, sender metadata, and message-level details.
- Store campaign audience relationships from Klaviyo campaign/message relationship payloads with the
  original relationship key preserved so future reports can distinguish direct, included, and excluded
  audience targeting when Klaviyo exposes it.
- Use flow metadata plus flow-action and flow-message resources so reports can join automation performance
  to the flow action tree and message metadata.
- Avoid sparse fieldsets for the comprehensive object sync unless an endpoint needs a special field because
  `raw_payload` is the future-proof copy used when reporting needs fields not promoted into normalized columns.
- New integrations should use the latest stable API revision and track deprecation timelines.

Decision:

- Use Klaviyo Reporting API for campaign and flow reports.
- Keep the API revision in one constant so it can be upgraded deliberately.
- Store normalized daily and item-level reports locally in Supabase so the UI does not repeatedly hit Klaviyo.
- Do not ask users to paste a conversion metric ID manually; detect it server-side from the connected Klaviyo account when `metrics:read` is available.
- Collapse Klaviyo message/channel result groups into the existing campaign/date and flow/date table grain
  before writing to Supabase instead of expanding the MVP schema to message-level reporting.
- Keep Klaviyo request and failure logs sanitized, but include endpoint path, revision, date window,
  statistics, group-by fields, conversion metric presence, HTTP status, and JSON:API error summaries.
- Store comprehensive Klaviyo objects in normalized report-friendly tables plus `raw_payload` JSONB:
  profiles, audiences, audience memberships, metrics, events, tags, tag relationships, campaigns, campaign
  messages, campaign audience relationships, flows, flow actions, and flow messages.
- Store broad Klaviyo JSON:API resources in `klaviyo_raw_resources` so accounts, catalogs, coupons, forms,
  reviews, templates, tracking settings, web feeds, webhooks, agent metadata, custom object data sources, push
  tokens, translations, and future resource families can be synced without creating a new table for every
  endpoint.
- Keep beta/pre-release Klaviyo endpoints optional and non-fatal, and send the `.pre` API revision only for
  endpoints that require it.
- Exclude images from ingestion because the current reporting product does not need image binaries or image
  metadata.
- Treat profiles, audiences, memberships, metrics, tags, tag relationships, campaigns, campaign messages,
  campaign audiences, flows, flow actions, and flow messages as full-snapshot resources that can prune stale
  rows after a successful full fetch; treat events as date-windowed history that should not be full-snapshot
  pruned.
- Keep the comprehensive sync count-oriented and non-PII in logs: stage starts, page counts, included-resource
  counts, table upsert counts, conflict targets, and sanitized errors are allowed; customer identifiers,
  event properties, and raw payloads are not.

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
