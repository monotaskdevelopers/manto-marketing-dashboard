<!--
File description:
This file documents the Klaviyo Flow Performance page. It explains the current blank redesign state,
route purpose, controls that need to be rebuilt, and security posture.
-->

# Klaviyo Flow Performance

## Purpose

Preserve `/klaviyo/flows` while the granular Klaviyo automation reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available under `Analytics > Klaviyo > Flows`.
- Does not query flow analytics data while blank.

## Security Concerns

- Must require the authenticated dashboard layout.
- Must not expose Klaviyo private keys, raw API responses, or sync credentials to the client.

## Known Gaps

- Flow search, filters, charts, metrics, and detail tables need to be rebuilt.
