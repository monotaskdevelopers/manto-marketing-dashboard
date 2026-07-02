<!--
File description:
This document explains how to bootstrap the first internal Supabase Auth user for the dashboard without
opening public signup. It covers the layman purpose, technical flow, one-time script behavior, security
rules, verification steps, and cleanup requirements for initial user creation.
-->

# Initial User Setup

## Purpose

The dashboard is an internal tool, so users should not self-register through a public signup page.
The first user should be created by a trusted developer or operator with Supabase service-role access.

In plain English: the app does not let anyone on the internet create an account. We create the first
approved internal account directly in Supabase Auth, confirm the email, and then that user signs in at
`/login`.

## Account Creation Flow

1. Confirm `.env.local` or the deployment environment contains:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Run a temporary server-side setup script from the project root.
3. Type the desired password into the hidden prompt.
4. The script checks whether the email already exists.
5. If the user does not exist, the script creates the Supabase Auth user.
6. If the user already exists, the script updates the password and confirms the email.
7. The script verifies the user by ID.
8. Delete the temporary script immediately after use.

## Security Rules

- Never add public signup for the MVP unless internal access control is designed first.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Never commit a password, setup script with hardcoded credentials, or real `.env.local` file.
- Do not use `user_metadata` for authorization decisions. It is acceptable here only for display-style
  metadata such as a full name.
- Prefer an invite or admin-only user-management workflow before adding more non-technical operators.

## Verification

After the script reports success:

1. Open `/login`.
2. Sign in with the created email and password.
3. Confirm the app redirects to the dashboard.
4. Confirm `/settings` is accessible only after sign-in.
5. Confirm no password or service-role key was printed in logs.

## Production Notes

- Restrict Supabase Auth signup settings so only approved internal users can access the tool.
- Rotate the bootstrap password if it was pasted into a chat, ticket, or other shared system.
- Add role-based access before broad internal rollout, especially before letting non-admin users manage
  platform connections.
