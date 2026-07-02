/*
File description:
This page provides a Klaviyo flow drill-down report. It preserves the dashboard date and region scope,
adds automation-level search/sort/filter controls, and renders full flow metrics for granular analysis.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { KlaviyoDrilldownControls } from "@/components/klaviyo-drilldown-controls";
import { LeaderboardPanel, MetricBarsPanel } from "@/components/klaviyo-report-panels";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  calculateKlaviyoRowRates,
  filterAndSortKlaviyoRows,
  parseKlaviyoTableFilters,
  summarizeKlaviyoRows,
} from "@/lib/klaviyo-reporting";
import type { RankedFlow } from "@/lib/types";

export default async function KlaviyoFlowDrilldownPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);
  const tableFilters = parseKlaviyoTableFilters(rawSearchParams);
  // Keep this page-level guard so unauthenticated requests redirect before report data is queried.
  await requireUser();
  const data = await getDashboardData(filters);
  const rows = filterAndSortKlaviyoRows(data.flowRows, tableFilters);
  const summary = summarizeKlaviyoRows(rows);
  const rates = calculateKlaviyoRowRates(summary);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const columns: DataTableColumn<RankedFlow>[] = [
    {
      header: "Flow",
      description: "The Klaviyo automated flow name from the synced flow report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span>,
    },
    {
      header: "Flow ID",
      description: "Klaviyo's flow identifier, useful when comparing dashboard rows to Klaviyo exports.",
      visibility: "2xl",
      cell: (row) => <span className="font-mono text-xs text-slate-600">{row.flow_id}</span>,
    },
    {
      header: "Region",
      description: "The dashboard region connected to the Klaviyo account that owns the flow.",
      visibility: "sm",
      cell: (row) => row.region_name,
    },
    {
      header: "Date",
      description: "The metric date Klaviyo reports for this flow row.",
      visibility: "md",
      cell: (row) => row.metric_date,
    },
    {
      header: "Recipients",
      description: "Number of recipients Klaviyo reports for this flow row.",
      align: "right",
      visibility: "lg",
      cell: (row) => formatNumber(row.recipients_count),
    },
    {
      header: "Opens",
      description: "Number of opens Klaviyo reports for this flow row.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatNumber(row.opens_count),
    },
    {
      header: "Clicks",
      description: "Number of clicks Klaviyo reports for this flow row.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatNumber(row.clicks_count),
    },
    {
      header: "Conversions",
      description: "Number of conversions Klaviyo attributes to this flow row.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatNumber(row.conversions_count),
    },
    {
      header: "Open rate",
      description: "Flow opens divided by flow recipients.",
      align: "right",
      visibility: "xl",
      cell: (row) => formatPercent(row.openRate),
    },
    {
      header: "Click rate",
      description: "Flow clicks divided by flow recipients.",
      align: "right",
      visibility: "xl",
      cell: (row) => formatPercent(row.clickRate),
    },
    {
      header: "Conversion rate",
      description: "Flow conversions divided by flow recipients.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatPercent(row.conversionRate),
    },
    {
      header: "Revenue",
      description: "Klaviyo-attributed revenue reported for this flow row.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
    {
      header: "Rev/recipient",
      description: "Revenue per recipient. It is flow revenue divided by flow recipients.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatCurrency(row.revenuePerRecipient, row.currency_code),
    },
  ];
  const leaderboardItems = rows.slice(0, 8).map((row) => ({
    id: row.id,
    label: row.flow_name,
    detail: `${row.region_name} · ${row.metric_date}`,
    value: row.revenue_amount,
    formattedValue: formatCurrency(row.revenue_amount, row.currency_code),
    helper: `${formatPercent(row.conversionRate)} conversion`,
  }));

  return (
    <div className="space-y-6 pb-10">
      <section className="px-4 pt-5 lg:px-6">
        <ReportHeader
          eyebrow="Klaviyo drill-down"
          title="Flow Performance"
          description="Automation-level revenue, audience, engagement, conversion, and revenue density for the selected scope."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
      </section>
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Filtered revenue"
            value={formatCurrency(summary.revenue, currencyCode)}
            helper={`${formatCurrency(rates.revenuePerRecipient, currencyCode)} per recipient`}
            description="Total flow revenue after the flow drill-down filters are applied."
            accent="teal"
          />
          <MetricCard
            label="Flow rows"
            value={formatNumber(rows.length)}
            helper={`${formatNumber(data.flowRows.length)} rows before table filters`}
            description="Number of flow report rows visible after search, revenue, engagement, and sort controls are applied."
            accent="slate"
          />
          <MetricCard
            label="Recipients"
            value={formatNumber(summary.recipients)}
            helper={`${formatPercent(rates.openRate)} open rate`}
            description="Total recipients across the visible flow rows."
            accent="blue"
          />
          <MetricCard
            label="Conversion rate"
            value={formatPercent(rates.conversionRate)}
            helper={`${formatNumber(summary.conversions)} conversions`}
            description="Visible flow conversions divided by visible flow recipients."
            accent="rose"
          />
        </div>
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <LeaderboardPanel
          title="Flow revenue distribution"
          description="Highest revenue automations after the drill-down filters are applied."
          items={leaderboardItems}
          emptyMessage="No flow rows match the current table filters."
        />
        <MetricBarsPanel
          title="Flow engagement quality"
          description="Visible flow engagement rates calculated from the filtered table rows."
          emptyMessage="No flow engagement data is available for the current filters."
          items={[
            {
              label: "Open rate",
              formattedValue: formatPercent(rates.openRate),
              value: rates.openRate,
              description: `${formatNumber(summary.opens)} opens`,
              tone: "teal",
            },
            {
              label: "Click rate",
              formattedValue: formatPercent(rates.clickRate),
              value: rates.clickRate,
              description: `${formatNumber(summary.clicks)} clicks`,
              tone: "amber",
            },
            {
              label: "Conversion rate",
              formattedValue: formatPercent(rates.conversionRate),
              value: rates.conversionRate,
              description: `${formatNumber(summary.conversions)} conversions`,
              tone: "rose",
            },
          ]}
        />
      </section>
      <section className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No flow rows match the current filters."
          title="Flow detail table"
          description="Full automation-level rows with search, filter, and sort controls in the table header."
          controls={
            <KlaviyoDrilldownControls
              action="/klaviyo/flows"
              filters={filters}
              tableFilters={tableFilters}
            />
          }
          rowSummary={`${formatNumber(rows.length)} of ${formatNumber(data.flowRows.length)} row(s) shown`}
        />
      </section>
    </div>
  );
}
