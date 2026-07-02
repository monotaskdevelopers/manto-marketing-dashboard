<!--
File description:
This file documents the Flows page. It explains the current blank redesign state and the future scope for
the top-level flow reporting route.
-->

# Flows

## Purpose

Preserve `/flows` while the automation reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available for compatibility.
- Does not query flow analytics data while blank.

## Security Concerns

- Must require authentication.
- Must not expose Klaviyo API keys or raw flow payloads.

## Known Gaps

- Flow toolbar, filters, metrics, and table views need to be rebuilt or retired in favor of the nested Klaviyo route.
