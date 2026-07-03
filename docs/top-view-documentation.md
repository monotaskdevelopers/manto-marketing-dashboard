<!--
File description:
This master documentation file is the index for the internal Shopify and Klaviyo analytics dashboard.
It explains which documentation files exist, why they exist, and what each file contains so future
developers can quickly find the current product, architecture, database, API, route, security, and
production-readiness notes before changing the application.
-->

# Top View Documentation

## Purpose

This project is an internal reporting dashboard that combines Shopify sales data and Klaviyo email marketing data into one unified view. Most report pages are currently blank redesign placeholders; Settings remains operational for platform connections, and Campaigns reads local Klaviyo campaign metadata/report rows when rows are present. The active Klaviyo sync is currently limited to campaigns, campaign performance, campaign status, campaign audiences, and campaign tags.

## Documentation Index

| File | Purpose | What it contains |
| --- | --- | --- |
| `/docs/product-requirements.md` | Product source of truth | PRD summary, MVP boundaries, user goals, page requirements, success criteria, and known open questions. |
| `/docs/research-and-decisions.md` | Research record | Official-source research for Klaviyo, Shopify, Supabase, Next.js, and Vercel Cron, plus the architecture decisions that came from that research. |
| `/docs/klaviyo-api-ingestion-plan.md` | Klaviyo API ingestion map | Official Klaviyo API surfaces reviewed, current sync coverage, skipped image handling, date-scopable reporting rules, and follow-up resource groups. |
| `/docs/platform-connections.md` | Platform connection guide | Developer setup for Shopify, Klaviyo, Supabase secrets, region config, smoke tests, sync flow, troubleshooting, and token rotation. |
| `/docs/initial-user-setup.md` | Initial user setup guide | One-time Supabase Auth bootstrap process, security rules, verification, and cleanup requirements. |
| `/docs/implementation-plan.md` | Build plan | Layman explanation, technical sequence, implementation phases, data flow, and execution checklist. |
| `/docs/db-plan.md` | Database plan | Tables, indexes, RLS posture, schema naming, migrations, and data retention assumptions. |
| `/docs/contract-documentation/api-contract-documentation.md` | API contract index | Route handlers, methods, auth requirements, request/response shapes, and criticality. |
| `/docs/middleware-details.md` | Middleware/proxy documentation | Supabase session refresh proxy, route coverage, and security limits. |
| `/docs/route-details.md` | App route index | User-facing pages, primary sidebar hierarchy, and internal API routes with purpose, behavior, and importance. |
| `/docs/rate-limit-guide.md` | Rate limit plan | Platform limits, internal API protections, retry/backoff guidance, and where rate limiting should live. |
| `/docs/security-concerns.md` | Security register | Current security decisions, risks, mitigations, and follow-ups. |
| `/docs/dev-to-production.md` | Production checklist | Environment variables, Supabase setup, Shopify/Klaviyo credentials, cron setup, deployment checks, and go-live reminders. |
| `/docs/console-logs-update.md` | Console log registry | Intentional non-PII console logs created for debugging sync behavior. |
| `/docs/tests.md` | Temporary/testing register | Demo mode, test-only switches, and temporary behavior that must be reviewed before production. |
| `/docs/components.md` | Component inventory | Reusable components, file paths, and one-line descriptions. |
| `/docs/pages/login.md` | Login page doc | Purpose, contents, features, risks, and known gaps for the internal sign-in page. |
| `/docs/pages/overview.md` | Dashboard page doc | Purpose, current blank redesign state, route behavior, risks, and known gaps for the main `/dashboard` page. |
| `/docs/pages/regional-performance.md` | Regional page doc | Purpose, contents, features, risks, and known gaps for region comparison. |
| `/docs/pages/shopify.md` | Shopify page doc | Purpose, contents, features, risks, and known gaps for ecommerce reporting. |
| `/docs/pages/shopify-regional-performance.md` | Shopify regional page doc | Purpose, contents, features, risks, and known gaps for the nested `/shopify/regional` report. |
| `/docs/pages/klaviyo.md` | Klaviyo page doc | Purpose, contents, features, risks, and known gaps for email reporting. |
| `/docs/pages/klaviyo-campaign-performance.md` | Klaviyo campaign drill-down doc | Purpose, contents, features, risks, and known gaps for the `/klaviyo/campaigns` granular campaign report. |
| `/docs/pages/klaviyo-flow-performance.md` | Klaviyo flow drill-down doc | Purpose, contents, features, risks, and known gaps for the `/klaviyo/flows` granular automation report. |
| `/docs/pages/campaigns.md` | Campaigns page doc | Purpose, contents, features, risks, and known gaps for campaign reporting. |
| `/docs/pages/flows.md` | Flows page doc | Purpose, contents, features, risks, and known gaps for flow reporting. |
| `/docs/pages/settings.md` | Settings page doc | Purpose, contents, features, risks, and known gaps for platform connection management. |

## Current MVP Shape

- Framework: Next.js App Router.
- Styling: Tailwind CSS.
- Database and auth: Supabase.
- Data sources: Shopify Admin GraphQL API and the narrowed Klaviyo campaign sync.
- Sync frequency: Vercel Cron calls the sync route every hour.
- Manual sync: authenticated internal users can trigger a fresh Shopify and Klaviyo sync from Settings.
- UI reset: authenticated report pages except Settings, Campaigns, and Flows are intentionally blank placeholders while the new experience is designed.
- Campaigns and Flows: rebuilt Klaviyo-style pages render existing synced report rows, metadata enrichment, and empty states instead of static sample data; Campaigns now uses client-side table search/filters/sorting and filter-aware metric cards over loaded rows plus a compact reusable URL-backed date picker.
- Klaviyo ingestion: encrypted Klaviyo keys stored in Settings are used by cron/manual sync to fetch only campaigns, campaign performance, campaign status, campaign audiences, and campaign tags for the current product slice. Campaign metadata now uses Klaviyo `updated_at` filters after initial storage, campaign performance stores Klaviyo native rate fields and unique recipient action counts, and `klaviyo_sync_date_coverage` lets sync skip already-covered stable dates before external Klaviyo report calls.
- Secrets: platform API credentials are entered through Settings, encrypted server-side, and stored in Supabase.

## Documentation Maintenance Rules

- Update this file whenever a new documentation file is added or removed.
- Update `/docs/db-plan.md` whenever database schema changes are made.
- Update `/docs/contract-documentation/api-contract-documentation.md` whenever an API route is added or changed.
- Update `/docs/route-details.md` whenever a page or route changes.
- Update `/docs/components.md` whenever a reusable component is created.
- Update `/docs/security-concerns.md` whenever a security risk is found or mitigated.
