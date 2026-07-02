<!--
File description:
This file documents the Regional Performance page. It explains the current blank redesign state and the
security expectations that still apply while the route is preserved.
-->

# Regional Performance

## Purpose

Preserve the `/regional` route while the regional comparison UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available for compatibility.
- Does not query regional analytics data while blank.

## Security Concerns

- Must require authentication.
- Must not show hidden, inactive, or cross-region reporting data until the new UI is intentionally rebuilt.

## Known Gaps

- Regional filters, KPI cards, ranking tables, and cross-currency guidance need to be rebuilt.
