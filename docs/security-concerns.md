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
- Store Shopify and Klaviyo secrets encrypted in `platform_connections`, not in JSON env config.
- Keep `APP_ENCRYPTION_KEY` server-only and outside Supabase.

## Known Risks

### No Role-Based Access In MVP

Risk:

- Any signed-in user can see all regions.

Decision:

- Accepted for MVP because the PRD states no separate roles or permission levels in version 1.

Future mitigation:

- Add organization/role-scoped access if the dashboard expands beyond a small internal group.

### Platform Secrets In Settings Database

Risk:

- Platform credentials are sensitive even when stored for operator convenience.
- A direct database leak must not reveal plain Shopify or Klaviyo secrets.

Mitigation:

- Encrypt platform secrets before saving them to Supabase.
- Store only ciphertext in `platform_connections`.
- Keep `APP_ENCRYPTION_KEY` in server-only environment variables.
- Never grant browser clients direct access to `platform_connections`.
- Never render saved secret values back to the Settings page.

### Settings Page Access

Risk:

- In MVP, any signed-in internal user can connect or disconnect platform accounts.

Mitigation:

- Require Supabase authentication for `/settings`.
- Keep all mutations in server actions.
- Track `created_by` and `updated_by` user IDs in `platform_connections`.
- Add admin-only RBAC before opening the tool to a broader internal audience.

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
- Confirm `platform_connections` remains service-role-only.
- Confirm `APP_ENCRYPTION_KEY` backup and rotation procedure before production.
- Add deployment-level security headers if missing.
- Add audit logging for manual sync trigger user IDs if leadership needs traceability.
- Re-check the dependency audit and upgrade Next.js when a safe patched release is available.
