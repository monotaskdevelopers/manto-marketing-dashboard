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
- Klaviyo Get Campaigns endpoint: `https://developers.klaviyo.com/en/reference/get_campaigns`
- Klaviyo Get Flows endpoint: `https://developers.klaviyo.com/en/reference/get_flows`
- Klaviyo API versioning policy: `https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy`

Shopify:

- Shopify Admin GraphQL `orders` query: `https://shopify.dev/docs/api/admin-graphql/latest/queries/orders`
- Shopify API limits: `https://shopify.dev/docs/api/usage/limits`
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
- New integrations should use the latest stable API revision and track deprecation timelines.

Decision:

- Use Klaviyo Reporting API for campaign and flow reports.
- Keep the API revision in one constant so it can be upgraded deliberately.
- Store normalized daily and item-level reports locally in Supabase so the UI does not repeatedly hit Klaviyo.

### Shopify

- Shopify Admin GraphQL `orders` can return order data with filtering, sorting, and pagination.
- Shopify GraphQL API uses query-cost-based rate limiting.
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
2. Region config in environment: platform credentials and region connection details live in `REGION_CONFIG_JSON` and are never stored in public client code.
3. Simple auth: all signed-in users can view the app; no roles in MVP.
4. Hourly and manual sync: cron keeps data fresh, manual sync handles urgent updates.
5. Date and region filters are URL query parameters so pages can be shared internally.
6. Demo mode is explicit: sample data can be used only when `DEMO_MODE=true`.

## Known Implementation Assumptions

- Each region maps to one Shopify shop and one Klaviyo account.
- Currency conversion is not performed in MVP. Totals across mixed currencies must be interpreted carefully.
- Klaviyo account-specific conversion metric IDs may need configuration if the default reporting response does not include the expected revenue fields.
- The app will be deployed on Vercel or a platform that can call the cron route hourly.
