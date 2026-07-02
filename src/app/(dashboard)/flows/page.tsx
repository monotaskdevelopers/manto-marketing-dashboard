/*
File description:
This Flows page lists Klaviyo automated flow performance across the selected date range and regions.
It focuses on attributed revenue and engagement for ongoing automated email journeys.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RankedFlow } from "@/lib/types";

export default async function FlowsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const columns: DataTableColumn<RankedFlow>[] = [
    {
      header: "Flow",
      description: "The Klaviyo automated flow name from the synced flow report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span>,
    },
    {
      header: "Region",
      description: "The dashboard region connected to the Klaviyo account that owns the flow.",
      cell: (row) => row.region_name,
    },
    {
      header: "Date",
      description: "The metric date Klaviyo reports for this flow row.",
      cell: (row) => row.metric_date,
    },
    {
      header: "Recipients",
      description: "Number of recipients Klaviyo reports for this flow row.",
      align: "right",
      cell: (row) => formatNumber(row.recipients_count),
    },
    {
      header: "Open rate",
      description: "Flow opens divided by flow recipients.",
      align: "right",
      cell: (row) => formatPercent(row.openRate),
    },
    {
      header: "Click rate",
      description: "Flow clicks divided by flow recipients.",
      align: "right",
      cell: (row) => formatPercent(row.clickRate),
    },
    {
      header: "Conversion rate",
      description: "Flow conversions divided by flow recipients.",
      align: "right",
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
      cell: (row) => formatCurrency(row.revenuePerRecipient, row.currency_code),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Automation reporting"
          title="Flows"
          description="Klaviyo automated flow performance across revenue, recipients, and engagement."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Flow revenue"
            value={formatCurrency(data.summary.flowRevenue, currencyCode)}
            description="Sum of Klaviyo flow revenue rows for the selected filters."
            accent="teal"
          />
          <MetricCard
            label="Recipients"
            value={formatNumber(data.summary.recipients)}
            description="Total recipients from synced Klaviyo daily metrics for the selected filters."
            accent="blue"
          />
          <MetricCard
            label="Open rate"
            value={formatPercent(safeRate(data.summary.opens, data.summary.recipients))}
            helper={`${formatNumber(data.summary.opens)} opens`}
            description="Total opens divided by total recipients for the selected filters."
            accent="amber"
          />
          <MetricCard
            label="Click rate"
            value={formatPercent(safeRate(data.summary.clicks, data.summary.recipients))}
            helper={`${formatNumber(data.summary.clicks)} clicks`}
            description="Total clicks divided by total recipients for the selected filters."
            accent="rose"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Flow Report</h2>
        <DataTable columns={columns} rows={data.flowRows} emptyMessage="No flow data is available yet." />
      </section>
    </div>
  );
}
