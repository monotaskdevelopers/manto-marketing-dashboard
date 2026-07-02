<!--
File description:
This file inventories reusable UI components in the dashboard. It should be updated whenever a reusable
component is created, renamed, moved, or removed.
-->

# Components

| Component | File path | Description |
| --- | --- | --- |
| `AppShell` | `/src/components/app-shell.tsx` | Shared authenticated layout with sidebar navigation, sync status, and logout. |
| `FilterBar` | `/src/components/filter-bar.tsx` | Date range and region controls shared across dashboard pages. |
| `MetricCard` | `/src/components/metric-card.tsx` | Compact KPI card for revenue, orders, rates, and counts. |
| `DataTable` | `/src/components/data-table.tsx` | Reusable table wrapper with consistent empty state styling and contained horizontal scrolling on mobile. |
| `TrendBars` | `/src/components/trend-bars.tsx` | Lightweight CSS bar chart for daily trend summaries that fits mobile widths without a charting dependency. |
| `SyncButton` | `/src/components/sync-button.tsx` | Client-side manual sync button with loading and result states. |
| `StatusBadge` | `/src/components/status-badge.tsx` | Small status label for sync and health states. |
| `PlatformConnectionManager` | `/src/app/(dashboard)/settings/platform-connection-manager.tsx` | Page-specific Settings component with separate Shopify and Klaviyo guided connection modals. |
