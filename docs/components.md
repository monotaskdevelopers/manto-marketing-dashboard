<!--
File description:
This file inventories reusable UI components in the dashboard. It should be updated whenever a reusable
component is created, renamed, moved, or removed.
-->

# Components

| Component | File path | Description |
| --- | --- | --- |
| `AppShell` | `/src/components/app-shell.tsx` | Shared authenticated layout with sidebar navigation, keyboard skip link, sync status, and logout. |
| `AppNavigation` | `/src/components/app-navigation.tsx` | Client-side nested dashboard navigation with Analytics, Klaviyo, Shopify, and Settings sections plus active-route styling for sidebar and mobile views. |
| `FilterBar` | `/src/components/filter-bar.tsx` | Carded date range and region controls shared across dashboard pages. |
| `MetricCard` | `/src/components/metric-card.tsx` | Compact KPI card for revenue, orders, rates, and counts with required plain-language calculation tooltip. |
| `AutoSubmitForm` | `/src/components/auto-submit-form.tsx` | Client-side wrapper that auto-submits select changes for compact URL-driven table toolbars while preserving normal form semantics. |
| `DataTable` | `/src/components/data-table.tsx` | Reusable analytics table wrapper with column explanation tooltips, optional table-header controls, structured empty states, and responsive no-horizontal-scroll column visibility. |
| `TableHeaderControls` | `/src/components/table-header-controls.tsx` | Shared URL-driven compact table header form with search, filter, and sort controls for analytics tables. |
| `MarketingPerformanceReport` | `/src/components/marketing-performance-report.tsx` | Klaviyo-inspired Campaigns and Flows report surface with toolbar actions, performance metrics, compact URL-driven controls, feedback strip, and row table styling. |
| `TrendBars` | `/src/components/trend-bars.tsx` | Lightweight CSS bar chart for daily trend summaries with legend and revenue explanation tooltip. |
| `KlaviyoDrilldownControls` | `/src/components/klaviyo-drilldown-controls.tsx` | URL-driven compact table-header search, revenue floor, engagement filter, and sort controls for Klaviyo drill-down tables. |
| `KlaviyoRevenueTrendPanel`, `KlaviyoRevenueMixPanel`, `KlaviyoEngagementFunnelPanel`, `KlaviyoDeliverabilityPanel`, `KlaviyoRegionalBreakdownPanel`, `KlaviyoReportLinks`, `LeaderboardPanel`, `MetricBarsPanel` | `/src/components/klaviyo-report-panels.tsx` | Reusable Klaviyo report panels for trend charts, contribution mix, funnel analysis, deliverability watch, regional bars, drill-down links, and report leaderboards. |
| `InfoTooltip` | `/src/components/info-tooltip.tsx` | Accessible hover/focus tooltip used to explain metrics and table columns in plain language. |
| `ReportHeader` | `/src/components/report-header.tsx` | Consistent unframed page header for analytics pages with balanced title wrapping, description, and optional date/filter meta. |
| `PillButton`, `SelectControl`, `DateControl`, `TextControl` | `/src/components/ui-controls.tsx` | Shared pill-shaped buttons and styled native form controls for filters, login, and Settings forms. |
| `SyncButton` | `/src/components/sync-button.tsx` | Client-side manual sync button with loading and result states. |
| `StatusBadge` | `/src/components/status-badge.tsx` | Small status label for sync and health states. |
| `PlatformConnectionManager` | `/src/app/(dashboard)/settings/platform-connection-manager.tsx` | Page-specific Settings component with separate Shopify and Klaviyo guided connection modals. |
