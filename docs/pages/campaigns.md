<!--
File description:
This file documents the Campaigns page. It explains the current blank redesign state and the future scope
for the top-level campaign reporting route.
-->

# Campaigns

## Purpose

Preserve `/campaigns` while the campaign reporting UI is redesigned.

## Contents

- No page-specific body content during the redesign reset.
- The shared authenticated app shell remains visible.

## Features

- Protected route remains available for compatibility.
- Does not query campaign analytics data while blank.

## Security Concerns

- Must require authentication.
- Must not expose Klaviyo API keys or raw campaign payloads.

## Known Gaps

- Campaign toolbar, filters, metrics, and table views need to be rebuilt or retired in favor of the nested Klaviyo route.
