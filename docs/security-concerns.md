<!--
File description:
This file tracks security concerns, mitigations, and follow-ups for the dashboard. It should be updated
whenever a new risk is identified, resolved, accepted, or moved into the production checklist.
-->

# Security Concerns

## Current Security Decisions

- Use Supabase Auth so the dashboard is not public.
- Keep all Shopify and Klaviyo API credentials server-side only.
- Use Supabase service role only inside server-only sync code.
- Enable RLS on all public tables.
- Allow authenticated users to read reporting tables.
- Do not allow browser clients to write reporting data.
- Protect cron sync with `CRON_SECRET`.
- Protect manual sync with authenticated Supabase session checks.
- Avoid logging customer data, order details, emails, tokens, or API payloads.

## Known Risks

### No Role-Based Access In MVP

Risk:

- Any signed-in user can see all regions.

Decision:

- Accepted for MVP because the PRD states no separate roles or permission levels in version 1.

Future mitigation:

- Add organization/role-scoped access if the dashboard expands beyond a small internal group.

### Platform Secrets In Environment Variables

Risk:

- Incorrect variable naming could expose secrets to the browser.

Mitigation:

- Only public Supabase URL and publishable key use `NEXT_PUBLIC_`.
- Shopify tokens, Klaviyo keys, Supabase secret key, and cron secret must never use `NEXT_PUBLIC_`.

### Manual Sync Abuse

Risk:

- Repeated manual syncs could hit Shopify or Klaviyo rate limits.

Mitigation:

- Cap date range.
- Prevent overlapping syncs.
- Add production cooldown before wider rollout.

### Currency Comparisons

Risk:

- Cross-region totals can be misleading if regions use different currencies.

Mitigation:

- Store currency code per row.
- Display currency context.
- Avoid claiming cross-currency totals are financial source-of-truth until conversion is defined.

### Dependency Audit Advisory

Risk:

- `npm audit --omit=dev` reports a moderate transitive `postcss` advisory through the installed Next.js package.
- The automated `npm audit fix --force` recommendation would downgrade Next.js to an old major version and should not be used.

Mitigation:

- Keep the current supported Next.js major version.
- Monitor for the next patched Next.js release that updates the bundled dependency chain.
- Re-run the audit before production deployment and record the result here.

## Production Follow-Ups

- Confirm Supabase email domain restrictions or invitation-only signup.
- Rotate platform tokens before production if they were used in local testing.
- Review Supabase RLS policies with real project settings.
- Add deployment-level security headers if missing.
- Add audit logging for manual sync trigger user IDs if leadership needs traceability.
- Re-check the dependency audit and upgrade Next.js when a safe patched release is available.
