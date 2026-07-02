<!--
File description:
This file documents the Klaviyo Campaign Performance page. It explains the current blank redesign state,
route purpose, controls that need to be rebuilt, and security posture.
-->

# Klaviyo Campaign Performance

## Purpose

Preserve `/klaviyo/campaigns` while the granular Klaviyo campaign reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available under `Analytics > Klaviyo > Campaigns`.
- Does not query campaign analytics data while blank.

## Security Concerns

- Must require the authenticated dashboard layout.
- Must not expose Klaviyo private keys, raw API responses, or sync credentials to the client.

## Known Gaps

- Campaign search, filters, charts, metrics, and detail tables need to be rebuilt.
