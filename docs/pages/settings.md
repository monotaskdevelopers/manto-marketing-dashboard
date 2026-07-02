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
- Separate Shopify connect/update button.
- Separate Klaviyo connect/update button.
- Multi-step Shopify setup modal.
- Multi-step Klaviyo setup modal.
- Provider-specific save forms for region metadata and platform credentials.
- Timezone dropdown for region timezone selection.
- Best-effort Klaviyo conversion metric detection guidance inside the Klaviyo modal.
- Disconnect controls for Shopify and Klaviyo.
- Region deactivation control.

## Features

- Saves region metadata to `regions`.
- Encrypts Shopify and Klaviyo secrets before storing them in `platform_connections`.
- Lets users save Shopify and Klaviyo independently instead of requiring both credentials at the same time.
- Guides users through each provider setup in a focused popup modal before showing the save form.
- Validates timezone values as IANA timezones and gives users a dropdown instead of free text.
- Uses shared pill-shaped buttons, styled native inputs, and a custom-styled timezone dropdown wrapper.
- Tries to detect a Klaviyo conversion metric ID from the connected account using Klaviyo's Metrics API,
  without blocking encrypted key storage if metric lookup is denied.
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
- Future versions can add per-user audit history, test connection buttons, stricter admin-only access, and
  a dedicated region-management flow if the number of regions grows.
