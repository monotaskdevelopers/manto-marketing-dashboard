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
| `/klaviyo` | Klaviyo reporting | Shows attributed revenue, engagement, campaign and flow rollups. | High |
| `/klaviyo/campaigns` | Klaviyo campaign drill-down | Preserves dashboard date/region filters and adds campaign search, minimum revenue, engagement filtering, sort controls, charts, and a full campaign table. | High |
| `/klaviyo/flows` | Klaviyo flow drill-down | Preserves dashboard date/region filters and adds flow search, minimum revenue, engagement filtering, sort controls, charts, and a full flow table. | High |
| `/campaigns` | Campaign reporting | Lists campaign-level performance across regions and dates. | High |
| `/flows` | Flow reporting | Lists automated flow performance across regions and dates. | High |
| `/settings` | Platform connection settings | Lets authenticated users connect, disconnect, and deactivate Shopify/Klaviyo region connections through server actions. | Critical |

## API Routes

| Route | Purpose | How it works | Importance |
| --- | --- | --- | --- |
| `/api/cron/hourly-sync` | Hourly sync | Vercel Cron calls this route with `CRON_SECRET`; each active connected platform syncs independently. | Critical |
| `/api/sync` | Manual sync | Authenticated user triggers a bounded sync job for Shopify-only, Klaviyo-only, or combined connections. | High |
| `/api/sync/status` | Sync status | Authenticated user reads latest sanitized sync metadata. | Medium |

## Route Rules

- All dashboard routes require Supabase authentication.
- API routes that mutate data must verify auth or cron secret server-side.
- Date and region filters should remain URL query parameters for shareable internal reporting links.
- Drill-down table filters should stay server-rendered and URL-driven so reports remain shareable without exposing platform credentials or adding client-only reporting state.
