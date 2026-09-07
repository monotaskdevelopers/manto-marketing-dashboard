<!--
File description: Documents the private invitation landing page, password setup flow, authorization,
current limitations, and operational requirements for new internal dashboard users.
-->

# Account invitation

`/welcome` lets an invited internal user select a password of 12–128 characters and open Campaigns.
An operator uses the server-only Supabase Admin `generateLink` method with `type: invite`, then emails
`/welcome#token_hash=<hashed_token>` to the approved recipient. Never log or commit that link.
The browser sends the hash to Supabase only after the recipient submits the form; GET requests do not
consume invitations. No public signup API is added.

The form removes the fragment from history, verifies the invite, checks the current identity before
updating the password, and uses the normal cookie-based session for the dashboard. Tokens remain
sensitive until used or expired. Supabase owns token expiry, replay prevention, and Auth rate limits.
No raw passwords, email addresses, or token values are logged. Existing authenticated users retain
the app's existing full reporting and connection-management access; there is no read-only role.

If verification succeeds but saving fails, the same mounted form can retry the password. Reloading
after partial completion may require an operator to arrange account recovery. There is no general
self-service password recovery page yet. Supabase security settings can reject weak passwords or
require reauthentication. Do not claim recipient login is verified until the recipient completes it.
