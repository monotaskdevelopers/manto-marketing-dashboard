<!--
File description:
This file documents request middleware/proxy behavior for the dashboard. It explains what the Supabase
session refresh proxy does, which paths it covers, and why authorization must still be checked inside
server routes and server components.
-->

# Middleware Details

## Current Middleware/Proxy

### `src/proxy.ts`

Purpose:

- Refresh Supabase auth sessions for App Router requests.
- Keep server components and route handlers aligned with the latest session cookies.

Coverage:

- All non-static application paths.
- Excludes Next.js static assets, image assets, favicon, and common image files.

Importance:

- High. It improves session reliability for authenticated internal dashboard pages.

Security notes:

- The proxy is not the only authorization gate.
- Protected pages and API routes must still verify the user server-side.
- API routes that perform sync work must also use route-specific checks.

## Future Middleware Considerations

- Add request-level security headers if the deployment platform does not provide them.
- Add stricter rate limiting through infrastructure or server-side storage if the manual sync endpoint is abused.
