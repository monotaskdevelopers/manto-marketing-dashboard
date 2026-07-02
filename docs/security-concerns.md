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
- Create bootstrap users only through trusted server-side admin tooling.
- Store active Klaviyo campaign, campaign-audience, campaign-tag, and raw campaign/tag/audience resources
  only in authenticated, RLS-protected Supabase tables.
- Never log Klaviyo raw payloads, auth headers, private keys, or recipient/customer data.

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

### Bootstrap Password Handling

Risk:

- The first user's temporary password can be exposed if it is pasted into a retained chat, shell command,
  script file, or terminal output.

Mitigation:

- Read bootstrap passwords through hidden terminal input when possible.
- Delete one-time setup scripts immediately after use.
- Rotate bootstrap passwords after first login if they were shared in a retained system.
- Move to an invite or admin-only user-management flow before broader rollout.

### Manual Sync Abuse

Risk:

- Repeated manual syncs could hit Shopify or Klaviyo rate limits.

Mitigation:

- Cap date range.
- Prevent overlapping syncs.
- Add production cooldown before wider rollout.

### Broader Klaviyo Profile And Event Data

Risk:

- Historical migrations include tables capable of storing recipient emails, phone numbers, names, locations,
  subscriptions, properties, audience memberships, event properties, campaign message metadata, flow action
  metadata, flow message metadata, broad raw resource snapshots, and raw Klaviyo payloads.
- The active Klaviyo sync no longer fills those broader profile/event/flow/reporting datasets, but they
  remain sensitive if future ingestion slices populate them.
- Any authenticated internal user can currently read Klaviyo reporting tables under the MVP access model.

Mitigation:

- Keep anonymous access revoked.
- Keep RLS enabled on all Klaviyo tables.
- Only the service-role sync path can write Klaviyo data.
- Keep logs count-only and never log raw Klaviyo payloads, profile identifiers, event properties, or
  membership details.
- Keep campaign/flow message payloads server-side only if those datasets are reintroduced; do not render raw
  payloads in the browser unless a future authenticated report explicitly needs those fields.
- Keep push-token raw snapshots authenticated-only and do not render token values in the UI without a
  separate privacy and retention review.
- Do not add images or customer-agent conversation message/content sync without a separate privacy and
  retention review.
- Add RBAC or organization scoping before granting dashboard access to a broader audience.

### Currency Comparisons

Risk:

- Cross-region totals can be misleading if regions use different currencies.

Mitigation:

- Store currency code per row.
- Display currency context.
- Avoid claiming cross-currency totals are financial source-of-truth until conversion is defined.

### Protected Page Data Fetch Before Redirect

Risk:

- App Router can begin child page data work while a protected layout is resolving an auth redirect.
- If a protected report page fetches data before its own auth guard, unauthenticated requests can create noisy server errors or unnecessary reporting-table reads.

Mitigation:

- Keep the shared authenticated dashboard layout.
- Current blank report placeholders avoid page-level reporting queries.
- Add page-level `requireUser()` guards before future server-side reporting queries on any rebuilt protected dashboard route.

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
- Confirm the first internal user can sign in and rotate any password shared during bootstrap.
- Rotate platform tokens before production if they were used in local testing.
- Review Supabase RLS policies with real project settings.
- Confirm `platform_connections` remains service-role-only.
- Confirm Klaviyo tables are still authenticated-only and anonymous access is revoked.
- Confirm `klaviyo_raw_resources` is still authenticated-only and anonymous access is revoked.
- Confirm production users are allowed to access recipient-level Klaviyo data before any future profile,
  event, or audience-membership sync is enabled.
- Confirm `APP_ENCRYPTION_KEY` backup and rotation procedure before production.
- Add deployment-level security headers if missing.
- Add audit logging for manual sync trigger user IDs if leadership needs traceability.
- Re-check the dependency audit and upgrade Next.js when a safe patched release is available.
