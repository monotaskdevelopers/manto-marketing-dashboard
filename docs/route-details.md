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
| `/klaviyo/campaigns` | Klaviyo campaign workspace | Renders the shared rebuilt Campaigns workspace with synced campaign reports and campaign metadata enrichment under the nested Klaviyo navigation hierarchy. | High |
| `/klaviyo/flows` | Klaviyo flow workspace | Renders the shared rebuilt Flows workspace with synced flow reports and flow metadata enrichment under the nested Klaviyo navigation hierarchy. | High |
| `/campaigns` | Campaign reporting workspace | Renders the rebuilt Klaviyo-style campaign workspace with synced metrics, server-rendered search, campaign metadata enrichment, compact controls, and an empty state when no report rows match. | High |
| `/flows` | Flow reporting workspace | Renders the rebuilt Klaviyo-style flow workspace with synced flow rows, server-rendered search, flow metadata enrichment, compact controls, and an empty state when no report rows match. | High |
| `/settings` | Platform connection settings | Lets authenticated users connect, disconnect, and deactivate Shopify/Klaviyo region connections through server actions. | Critical |

## Primary Sidebar Hierarchy

- `Dashboard` links to `/dashboard` and sits outside the Analytics dropdown.
- `Analytics`
- `Analytics > Klaviyo > Overview` links to `/klaviyo` for the future Klaviyo overview rebuild.
- `Analytics > Klaviyo > Campaigns` links to `/klaviyo/campaigns` for the rebuilt campaign workspace.
- `Analytics > Klaviyo > Flows` links to `/klaviyo/flows` for the rebuilt flow workspace.
- `Analytics > Shopify > Overview` links to `/shopify` for the future ecommerce reporting rebuild.
- `Analytics > Shopify > Regional Performance` links to `/shopify/regional`, which reuses the same blank placeholder as `/regional` for compatibility.
- `Settings` remains separate from Analytics because it changes platform connections and encrypted credentials rather than reporting data.

## API Routes

| Route | Purpose | How it works | Importance |
| --- | --- | --- | --- |
| `/api/cron/hourly-sync` | Hourly sync | Vercel Cron calls this route with `CRON_SECRET`; active Shopify-ready regions sync, while saved Klaviyo accounts are skipped because Klaviyo ingestion is paused for rebuild. | Critical |
| `/api/sync` | Manual sync | Authenticated user triggers a bounded Shopify sync job; Klaviyo-only accounts receive a clear paused-ingestion message instead of calling Klaviyo data APIs. | High |
| `/api/sync/status` | Sync status | Authenticated user reads latest sanitized sync metadata. | Medium |

## Route Rules

- All dashboard routes require Supabase authentication.
- API routes that mutate data must verify auth or cron secret server-side.
- Date and region filters should remain URL query parameters when analytics pages are rebuilt.
- Analytics pages are intentionally blank during the UI reset, except Settings and the rebuilt real-data Campaigns and Flows workspaces.
- Future analytics table filters should stay inside the table header, server-rendered, and URL-driven so reports remain shareable without exposing platform credentials or adding client-only reporting state.
- Future pages with multiple tables should use scoped query parameter names so one table's search, filter, and sort state does not overwrite another table's state.
