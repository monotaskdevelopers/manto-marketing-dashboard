<!--
File description:
This file documents all user-facing and API routes in the dashboard. It should be updated whenever pages
or route handlers are added, removed, renamed, or materially changed.
-->

# Route Details

## User-Facing Routes

| Route | Purpose | How it works | Importance |
| --- | --- | --- | --- |
| `/login` | Internal user sign-in | Uses Supabase email/password authentication through a minimal internal sign-in form. | Critical |
| `/` | Overview dashboard | Shows high-level Shopify and Klaviyo metrics using URL filters. | Critical |
| `/regional` | Regional comparison | Compares revenue, orders, AOV, and Klaviyo contribution by region. | High |
| `/shopify` | Shopify reporting | Shows ecommerce revenue, orders, AOV, customers, and trend data. | High |
| `/shopify/regional` | Shopify regional reporting | Reuses the regional comparison report under the nested Shopify navigation hierarchy. | High |
| `/klaviyo` | Klaviyo reporting | Shows attributed revenue, engagement, campaign and flow rollups. | High |
| `/klaviyo/campaigns` | Klaviyo campaign drill-down | Preserves dashboard date/region filters and adds campaign search, minimum revenue, engagement filtering, sort controls, charts, and a full campaign table. | High |
| `/klaviyo/flows` | Klaviyo flow drill-down | Preserves dashboard date/region filters and adds flow search, minimum revenue, engagement filtering, sort controls, charts, and a full flow table. | High |
| `/campaigns` | Campaign reporting | Renders a Klaviyo-inspired campaign workspace with a toolbar, performance band, compact URL-driven controls, and campaign row table for the selected date/region scope. | High |
| `/flows` | Flow reporting | Renders a Campaigns-matched automation workspace with flow performance metrics, compact URL-driven controls, and flow row table for the selected date/region scope. | High |
| `/settings` | Platform connection settings | Lets authenticated users connect, disconnect, and deactivate Shopify/Klaviyo region connections through server actions. | Critical |

## Primary Sidebar Hierarchy

- `Analytics`
- `Analytics > Overview` links to `/` for the combined Shopify and Klaviyo analytics overview.
- `Analytics > Klaviyo > Overview` links to `/klaviyo` for all connected Klaviyo account and region rollups.
- `Analytics > Klaviyo > Campaigns` links to `/klaviyo/campaigns` for campaign-level search, filters, sort, charts, and detail tables.
- `Analytics > Klaviyo > Flows` links to `/klaviyo/flows` for automation-level search, filters, sort, charts, and detail tables.
- `Analytics > Shopify > Overview` links to `/shopify` for ecommerce source-of-truth reporting.
- `Analytics > Shopify > Regional Performance` links to `/shopify/regional`, which reuses the same report as `/regional` for compatibility.
- `Settings` remains separate from Analytics because it changes platform connections and encrypted credentials rather than reporting data.

## API Routes

| Route | Purpose | How it works | Importance |
| --- | --- | --- | --- |
| `/api/cron/hourly-sync` | Hourly sync | Vercel Cron calls this route with `CRON_SECRET`; each active connected platform syncs independently, and Klaviyo reporting/comprehensive data can finish as separate success or partial segments. | Critical |
| `/api/sync` | Manual sync | Authenticated user triggers a bounded sync job for Shopify-only, Klaviyo-only, or combined connections; Klaviyo events use the requested date window while full-snapshot Klaviyo objects sync all pages. | High |
| `/api/sync/status` | Sync status | Authenticated user reads latest sanitized sync metadata. | Medium |

## Route Rules

- All dashboard routes require Supabase authentication.
- API routes that mutate data must verify auth or cron secret server-side.
- Date and region filters should remain URL query parameters for shareable internal reporting links.
- Analytics pages should render the page title/header first, then shared date and region filters, then KPI cards, charts, and tables unless a page-specific operational surface documents a different layout.
- Analytics table filters should stay inside the table header, server-rendered, and URL-driven so reports remain shareable without exposing platform credentials or adding client-only reporting state.
- Pages with multiple tables should use scoped query parameter names so one table's search, filter, and sort state does not overwrite another table's state.
