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
| `/` | Dashboard redirect | Server-side redirect to `/dashboard` for older bookmarks and root visits after authentication. | Critical |
| `/dashboard` | Main dashboard workspace | Intentionally blank protected workspace while the reporting UI is redesigned from the ground up. | Critical |
| `/regional` | Regional comparison placeholder | Preserves the protected route but renders no page body during the redesign reset. | High |
| `/shopify` | Shopify reporting placeholder | Preserves the protected Shopify overview route but renders no page body during the redesign reset. | High |
| `/shopify/regional` | Shopify regional reporting placeholder | Reuses the blank `/regional` implementation under the nested Shopify navigation hierarchy. | High |
| `/klaviyo` | Klaviyo reporting placeholder | Preserves the protected Klaviyo overview route but renders no page body during the redesign reset. | High |
| `/klaviyo/campaigns` | Klaviyo campaign drill-down placeholder | Preserves the protected campaign drill-down route but renders no page body during the redesign reset. | High |
| `/klaviyo/flows` | Klaviyo flow drill-down placeholder | Preserves the protected flow drill-down route but renders no page body during the redesign reset. | High |
| `/campaigns` | Campaign reporting placeholder | Preserves the protected top-level campaign route but renders no page body during the redesign reset. | High |
| `/flows` | Flow reporting placeholder | Preserves the protected top-level flow route but renders no page body during the redesign reset. | High |
| `/settings` | Platform connection settings | Lets authenticated users connect, disconnect, and deactivate Shopify/Klaviyo region connections through server actions. | Critical |

## Primary Sidebar Hierarchy

- `Dashboard` links to `/dashboard` and sits outside the Analytics dropdown.
- `Analytics`
- `Analytics > Klaviyo > Overview` links to `/klaviyo` for the future Klaviyo overview rebuild.
- `Analytics > Klaviyo > Campaigns` links to `/klaviyo/campaigns` for the future campaign drill-down rebuild.
- `Analytics > Klaviyo > Flows` links to `/klaviyo/flows` for the future automation drill-down rebuild.
- `Analytics > Shopify > Overview` links to `/shopify` for the future ecommerce reporting rebuild.
- `Analytics > Shopify > Regional Performance` links to `/shopify/regional`, which reuses the same blank placeholder as `/regional` for compatibility.
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
- Date and region filters should remain URL query parameters when analytics pages are rebuilt.
- Analytics pages are intentionally blank during the UI reset, except Settings, which remains operational.
- Future analytics table filters should stay inside the table header, server-rendered, and URL-driven so reports remain shareable without exposing platform credentials or adding client-only reporting state.
- Future pages with multiple tables should use scoped query parameter names so one table's search, filter, and sort state does not overwrite another table's state.
