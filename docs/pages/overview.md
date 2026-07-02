<!--
File description:
This file documents the Dashboard page. It explains the current blank redesign state, route behavior,
security expectations, and the future purpose of the main dashboard workspace.
-->

# Dashboard

## Purpose

Hold the primary authenticated workspace at `/dashboard` while the dashboard UI is redesigned from the
ground up.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.
- The root `/` route redirects to `/dashboard` for older bookmarks.

## Features

- Top-level sidebar placement outside the Analytics dropdown.
- Protected by the shared dashboard layout.
- Does not query analytics data while blank.

## Security Concerns

- Must require authentication.
- Must not expose platform API credentials or reporting data while the page is blank.

## Known Gaps

- Dashboard metrics, filters, tables, and charts need to be rebuilt in the next UI pass.
