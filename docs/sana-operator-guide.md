<!--
File description:
Plain-English operator guide for Sana. Covers the dashboard purpose, navigation, daily work, refreshes,
limits, and safe connection handling. Records the live website and invitation handoff.
-->

# Sana’s Marketing Dashboard Guide

Status: live on 7 September 2026. Sana's private invitation and this guide were emailed; her password setup and first sign-in remain for her to complete.

## What and why

This tool brings Shopify sales information and Klaviyo email campaign results into one place. It helps
you check campaign performance without putting every number into a spreadsheet. It is a reporting tool:
it does not send marketing emails or edit campaigns in Klaviyo.

## Where to start

Open https://manto-marketing-dashboard-release.vercel.app/login and sign in with your own approved account.
For your first visit, use the private invitation in your email and choose your own password of at least
12 characters. Your sign-in email is sana.yousuf73@gmail.com. Keep the invitation private; ask the tool
owner for a fresh link if it expires.
Vercel hosts the website; your everyday work happens inside the dashboard, not inside Vercel.
The main Dashboard page is currently blank while it is being redesigned. Use the left menu to open
Analytics → Klaviyo → Campaigns.

## How to use campaign reports

1. Choose a date range and region.
2. Search for a campaign by name.
3. Use the available status, message type, audience, and tag filters to narrow the results.
4. Review open rate (how often messages were opened), click rate (how often links were clicked),
   and placed-order revenue (sales Klaviyo attributes to the campaign).
5. Compare like-for-like date ranges and currencies. Do not add Klaviyo-attributed sales to Shopify
   sales: they can describe the same purchases.

## Daily routine

Automatic updates are enabled once a day, around 08:00–09:00 Pakistan time.
If you need newer data, open Settings and use the manual sync/refresh control. Wait for the result
instead of repeatedly clicking. Older campaign dates may fill in over several updates.
If a result is empty, first check the date range, region, and filters; empty does not always mean zero sales.

## Connections and safe use

Settings shows which Shopify and Klaviyo accounts are connected. Use its step-by-step connection guide
only when you need to add or update an account. Ask the account owner for help obtaining the correct key.
Never email passwords or platform keys. Disconnecting an account stops future updates for that connection;
historical reporting is retained. All approved dashboard users currently have access to connection settings,
so keep your login private and sign out on shared computers.

## Current limits

- Several overview and regional pages are blank during redesign.
- Campaign reporting is the current active Klaviyo feature.
- The Flows page can show older stored results, but fresh flow data is not currently being imported.
- Some action buttons are visual placeholders. Create or edit campaigns in Klaviyo itself.
- If refresh fails or reports look wrong, send the tool owner the page name, date range, region, and error
  wording. Avoid sharing passwords, keys, or screenshots containing private customer information.

## Launch details

- Live website: https://manto-marketing-dashboard-release.vercel.app.
- Personal invitation and getting-started email sent on 7 September 2026. Password setup is completed by Sana.
- Production build and public setup/login pages verified; report/settings pages require sign-in.
- Daily cron is enabled; its first scheduled production run has not yet been observed.
- Future software releases require a manual Vercel deployment; GitHub automatic deployment is not connected.
