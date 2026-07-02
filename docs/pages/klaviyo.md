<!--
File description:
This file documents the Klaviyo page. It explains the current blank redesign state, attribution security
expectations, and future email reporting scope.
-->

# Klaviyo

## Purpose

Preserve the `/klaviyo` route while the email reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available under `Analytics > Klaviyo > Overview`.
- Does not query Klaviyo reporting data while blank.

## Security Concerns

- Klaviyo private keys must remain server-only.
- Recipient-level Klaviyo data contains PII and must remain authenticated-only.
- Attributed revenue must be clearly labeled when the reporting UI is rebuilt.

## Known Gaps

- Klaviyo revenue, engagement, deliverability, regional panels, and drill-down links need to be rebuilt.
