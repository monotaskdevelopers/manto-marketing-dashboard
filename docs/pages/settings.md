<!--
File description:
This file documents the Settings page. It explains the purpose, contents, features, security risks, and
known gaps for the database-backed Shopify and Klaviyo connection management screen.
-->

# Settings Page

## Purpose

The Settings page lets authenticated internal users connect, update, disconnect, and deactivate Shopify and
Klaviyo platform connections without editing environment JSON.

## Contents

- Current connection status by region.
- Shopify setup guide.
- Klaviyo setup guide.
- Connect/update form for region metadata and platform credentials.
- Disconnect controls for Shopify and Klaviyo.
- Region deactivation control.

## Features

- Saves region metadata to `regions`.
- Encrypts Shopify and Klaviyo secrets before storing them in `platform_connections`.
- Never shows saved secrets back to the browser.
- Lets non-developer operators manage connections safely.
- Keeps historical reporting rows when a platform or region is disconnected.

## Security Considerations

- All mutations must require an authenticated Supabase user.
- The page must never render decrypted or encrypted credential values.
- `APP_ENCRYPTION_KEY` must remain server-only.
- Direct browser access to `platform_connections` must remain blocked.
- Disconnect should null out encrypted secret columns instead of only flipping a status flag.

## Known Gaps

- MVP does not include role-based settings permissions; any signed-in internal user can manage connections.
- MVP does not run live credential validation before saving; validation happens on the next sync.
- Future versions can add per-user audit history, test connection buttons, and stricter admin-only access.
