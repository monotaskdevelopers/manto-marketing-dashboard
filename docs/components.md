<!--
File description:
This file inventories reusable UI components in the dashboard. It should be updated whenever a reusable
component is created, renamed, moved, or removed.
-->

# Components

| Component | File path | Description |
| --- | --- | --- |
| `AppShell` | `/src/components/app-shell.tsx` | Shared authenticated layout with sidebar navigation, sync status, and logout. |
| `AppNavigation` | `/src/components/app-navigation.tsx` | Client-side dashboard navigation with active-route styling for sidebar and mobile tabs. |
| `FilterBar` | `/src/components/filter-bar.tsx` | Carded date range and region controls shared across dashboard pages. |
| `MetricCard` | `/src/components/metric-card.tsx` | Compact KPI card for revenue, orders, rates, and counts with required plain-language calculation tooltip. |
| `DataTable` | `/src/components/data-table.tsx` | Reusable analytics table wrapper with column explanation tooltips, structured empty states, and contained horizontal scrolling on mobile. |
| `TrendBars` | `/src/components/trend-bars.tsx` | Lightweight CSS bar chart for daily trend summaries with legend and revenue explanation tooltip. |
| `KlaviyoDrilldownControls` | `/src/components/klaviyo-drilldown-controls.tsx` | URL-driven search, revenue floor, engagement filter, sort, apply, and reset controls for Klaviyo drill-down tables. |
| `KlaviyoRevenueTrendPanel`, `KlaviyoRevenueMixPanel`, `KlaviyoEngagementFunnelPanel`, `KlaviyoDeliverabilityPanel`, `KlaviyoRegionalBreakdownPanel`, `KlaviyoReportLinks`, `LeaderboardPanel`, `MetricBarsPanel` | `/src/components/klaviyo-report-panels.tsx` | Reusable Klaviyo report panels for trend charts, contribution mix, funnel analysis, deliverability watch, regional bars, drill-down links, and report leaderboards. |
| `InfoTooltip` | `/src/components/info-tooltip.tsx` | Accessible hover/focus tooltip used to explain metrics and table columns in plain language. |
| `ReportHeader` | `/src/components/report-header.tsx` | Consistent unframed page header for analytics pages with title, description, and optional date/filter meta. |
| `PillButton`, `SelectControl`, `DateControl`, `TextControl` | `/src/components/ui-controls.tsx` | Shared pill-shaped buttons and styled native form controls for filters, login, and Settings forms. |
| `SyncButton` | `/src/components/sync-button.tsx` | Client-side manual sync button with loading and result states. |
| `StatusBadge` | `/src/components/status-badge.tsx` | Small status label for sync and health states. |
| `PlatformConnectionManager` | `/src/app/(dashboard)/settings/platform-connection-manager.tsx` | Page-specific Settings component with separate Shopify and Klaviyo guided connection modals. |
