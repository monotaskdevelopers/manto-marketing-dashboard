<!--
File description:
This file documents the Login page. It records the sign-in page purpose, visible contents, security
considerations, and limitations so future UI changes do not weaken the internal authentication boundary.
-->

# Login Page

## Purpose

Let internal users sign in with Supabase email/password authentication before they can access reporting pages.

## Contents

- Internal reporting page label.
- Marketing Reports sign-in title.
- Email field.
- Password field.
- Sign-in button.
- Authentication error message for missing or rejected credentials.

## Features

- Minimal carded sign-in form.
- Shared pill-shaped button and shared text input controls.
- Server action submission through Supabase Auth.
- Redirects already-authenticated users back to the dashboard.

## Security Concerns

- Must not expose Supabase session tokens or server secrets to the browser.
- Must keep error copy generic enough to avoid confirming whether an email address exists.
- Must remain separate from authenticated dashboard routes.

## Known Gaps

- MVP does not include password reset, SSO, MFA, or role-specific login messaging.
