<!--
File description:
This master documentation file is the index for the internal Shopify and Klaviyo analytics dashboard.
It explains which documentation files exist, why they exist, and what each file contains so future
developers can quickly find the current product, architecture, database, API, route, security, and
production-readiness notes before changing the application.
-->

# Top View Documentation

## Purpose

This project is a basic internal reporting dashboard that combines Shopify sales data and Klaviyo email marketing data into one unified view. The first version stays intentionally simple: authenticated internal users can view reports by date range and region, and data is refreshed automatically every hour or manually on demand.

## Documentation Index

| File | Purpose | What it contains |
| --- | --- | --- |
| `/docs/product-requirements.md` | Product source of truth | PRD summary, MVP boundaries, user goals, page requirements, success criteria, and known open questions. |
| `/docs/research-and-decisions.md` | Research record | Official-source research for Klaviyo, Shopify, Supabase, Next.js, and Vercel Cron, plus the architecture decisions that came from that research. |
| `/docs/implementation-plan.md` | Build plan | Layman explanation, technical sequence, implementation phases, data flow, and execution checklist. |
| `/docs/db-plan.md` | Database plan | Tables, indexes, RLS posture, schema naming, migrations, and data retention assumptions. |
| `/docs/contract-documentation/api-contract-documentation.md` | API contract index | Route handlers, methods, auth requirements, request/response shapes, and criticality. |
| `/docs/middleware-details.md` | Middleware/proxy documentation | Supabase session refresh proxy, route coverage, and security limits. |
| `/docs/route-details.md` | App route index | User-facing pages and internal API routes with purpose, behavior, and importance. |
| `/docs/rate-limit-guide.md` | Rate limit plan | Platform limits, internal API protections, retry/backoff guidance, and where rate limiting should live. |
| `/docs/security-concerns.md` | Security register | Current security decisions, risks, mitigations, and follow-ups. |
| `/docs/dev-to-production.md` | Production checklist | Environment variables, Supabase setup, Shopify/Klaviyo credentials, cron setup, deployment checks, and go-live reminders. |
| `/docs/console-logs-update.md` | Console log registry | Intentional non-PII console logs created for debugging sync behavior. |
| `/docs/tests.md` | Temporary/testing register | Demo mode, test-only switches, and temporary behavior that must be reviewed before production. |
| `/docs/components.md` | Component inventory | Reusable components, file paths, and one-line descriptions. |
| `/docs/pages/overview.md` | Overview page doc | Purpose, contents, features, risks, and known gaps for the main dashboard page. |
| `/docs/pages/regional-performance.md` | Regional page doc | Purpose, contents, features, risks, and known gaps for region comparison. |
| `/docs/pages/shopify.md` | Shopify page doc | Purpose, contents, features, risks, and known gaps for ecommerce reporting. |
| `/docs/pages/klaviyo.md` | Klaviyo page doc | Purpose, contents, features, risks, and known gaps for email reporting. |
| `/docs/pages/campaigns.md` | Campaigns page doc | Purpose, contents, features, risks, and known gaps for campaign reporting. |
| `/docs/pages/flows.md` | Flows page doc | Purpose, contents, features, risks, and known gaps for flow reporting. |

## Current MVP Shape

- Framework: Next.js App Router.
- Styling: Tailwind CSS.
- Database and auth: Supabase.
- Data sources: Shopify Admin GraphQL API and Klaviyo APIs.
- Sync frequency: Vercel Cron calls the sync route every hour.
- Manual sync: authenticated internal users can trigger a fresh sync from the dashboard.
- Secrets: platform API credentials stay server-side only through environment variables.

## Documentation Maintenance Rules

- Update this file whenever a new documentation file is added or removed.
- Update `/docs/db-plan.md` whenever database schema changes are made.
- Update `/docs/contract-documentation/api-contract-documentation.md` whenever an API route is added or changed.
- Update `/docs/route-details.md` whenever a page or route changes.
- Update `/docs/components.md` whenever a reusable component is created.
- Update `/docs/security-concerns.md` whenever a security risk is found or mitigated.
