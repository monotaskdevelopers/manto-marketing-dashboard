<!--
File description:
This file captures the product requirements for the centralized Shopify and Klaviyo analytics dashboard.
It translates the pasted PRD into an implementation-ready product scope while preserving the MVP boundary:
a simple internal reporting tool, not a complex analytics platform or marketing operations suite.
-->

# Product Requirements

## Product Goal

Build a simple internal analytics dashboard that gives the ecommerce and email marketing team one place to view Shopify and Klaviyo performance across regions.

The tool should reduce manual spreadsheet compilation and make it easier to answer:

- Which regions are performing best or worst?
- How much revenue and order volume is Shopify producing?
- How much revenue is attributed to Klaviyo campaigns and flows?
- Which campaigns and flows are driving the most value?
- How does Klaviyo-attributed revenue compare with total Shopify revenue?

## MVP Scope

In scope:

- Overview dashboard.
- Region filtering.
- Date range filtering.
- Shopify revenue, orders, customers, and average order value.
- Klaviyo campaign performance.
- Klaviyo flow performance.
- Cross-region comparison.
- Basic charts and tables.
- Hourly automatic sync.
- Manual sync button.
- Clear separation between actual Shopify revenue and Klaviyo-attributed revenue.

Out of scope:

- Mergn integration.
- User roles or permission tiers.
- Campaign or flow editing.
- Shopify store management.
- Advanced attribution modeling.
- Forecasting.
- AI summaries.
- Custom report builder.
- Profit, inventory, or support analytics.

## Users

Initial users are internal team members:

- Email marketing team.
- Ecommerce team.
- Marketing managers.
- Business owners or senior stakeholders.

All authenticated users have the same dashboard experience for version 1.

## Required Pages

1. Overview Dashboard: high-level business and email marketing performance.
2. Regional Performance Dashboard: compare revenue, orders, AOV, and Klaviyo contribution by region.
3. Shopify Dashboard: ecommerce source-of-truth reporting.
4. Klaviyo Dashboard: email marketing rollup reporting.
5. Campaigns Dashboard: campaign-by-campaign performance table.
6. Flows Dashboard: automated flow performance table.

## Key Metrics

Shopify:

- Total revenue.
- Orders.
- Average order value.
- Customers.
- Refunds and cancellations when available.

Klaviyo:

- Campaign revenue.
- Flow revenue.
- Klaviyo-attributed revenue.
- Opens.
- Open rate.
- Clicks.
- Click rate.
- Conversions.
- Conversion rate.
- Revenue per recipient.
- Unsubscribes.
- Bounce rate.
- Spam complaint rate.

Combined:

- Klaviyo-attributed revenue as a percentage of Shopify revenue.
- Revenue by region.
- Orders by region.
- Campaign revenue by region.
- Flow revenue by region.

## User Experience Requirements

- Keep the interface reporting-focused and fast to scan.
- Avoid excessive charts.
- Use consistent names for metrics.
- Label Shopify revenue as actual ecommerce revenue.
- Label Klaviyo revenue as attributed marketing revenue.
- Make filters predictable across all pages.
- Show last sync status clearly.
- Keep manual sync visible but protected behind authentication.

## Open Questions For The Business

- Which regions should be included first?
- Are regions separate Shopify/Klaviyo accounts or grouped inside one account?
- Which currency should leadership use for cross-region totals?
- Are Shopify refunds required in the first release?
- Does the team need CSV exports in the MVP or immediately after?
- Which Klaviyo conversion metric should be treated as revenue attribution for each account?
