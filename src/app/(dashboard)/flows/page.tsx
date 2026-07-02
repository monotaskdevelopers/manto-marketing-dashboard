/*
File description:
This Flows page lists Klaviyo automated flow performance across the selected date range and regions.
It focuses on attributed revenue and engagement for ongoing automated email journeys.
*/

import { Activity, MailOpen, MousePointerClick, Workflow } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
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
    { header: "Flow", cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span> },
    { header: "Region", cell: (row) => row.region_name },
    { header: "Date", cell: (row) => row.metric_date },
    { header: "Recipients", align: "right", cell: (row) => formatNumber(row.recipients_count) },
    { header: "Open rate", align: "right", cell: (row) => formatPercent(row.openRate) },
    { header: "Click rate", align: "right", cell: (row) => formatPercent(row.clickRate) },
    { header: "Conversion rate", align: "right", cell: (row) => formatPercent(row.conversionRate) },
    { header: "Revenue", align: "right", cell: (row) => formatCurrency(row.revenue_amount, row.currency_code) },
    { header: "Rev/recipient", align: "right", cell: (row) => formatCurrency(row.revenuePerRecipient, row.currency_code) },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Flows</h1>
          <p className="mt-1 text-sm text-slate-500">Klaviyo automated flow performance.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Flow revenue"
            value={formatCurrency(data.summary.flowRevenue, currencyCode)}
            icon={Workflow}
            accent="teal"
          />
          <MetricCard label="Recipients" value={formatNumber(data.summary.recipients)} icon={Activity} accent="blue" />
          <MetricCard
            label="Open rate"
            value={formatPercent(safeRate(data.summary.opens, data.summary.recipients))}
            helper={`${formatNumber(data.summary.opens)} opens`}
            icon={MailOpen}
            accent="amber"
          />
          <MetricCard
            label="Click rate"
            value={formatPercent(safeRate(data.summary.clicks, data.summary.recipients))}
            helper={`${formatNumber(data.summary.clicks)} clicks`}
            icon={MousePointerClick}
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
