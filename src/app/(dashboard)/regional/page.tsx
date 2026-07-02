/*
File description:
This Regional Performance page compares Shopify revenue, orders, AOV, and Klaviyo contribution across
regions. It helps internal users quickly spot stronger and weaker markets.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RegionalSummary } from "@/lib/types";

export default async function RegionalPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const columns: DataTableColumn<RegionalSummary>[] = [
    {
      header: "Region",
      description: "The active store region configured in the dashboard.",
      cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span>,
    },
    {
      header: "Revenue",
      description: "Total Shopify revenue for this region and date range, shown in the region's own currency.",
      align: "right",
      cell: (row) => formatCurrency(row.shopifyRevenue, row.region.currency_code),
    },
    {
      header: "Orders",
      description: "Total synced Shopify orders for this region and date range.",
      align: "right",
      cell: (row) => formatNumber(row.orders),
    },
    {
      header: "AOV",
      description: "Average order value. It is calculated as Shopify revenue divided by Shopify orders.",
      align: "right",
      cell: (row) => formatCurrency(safeRate(row.shopifyRevenue, row.orders), row.region.currency_code),
    },
    {
      header: "Klaviyo revenue",
      description: "Klaviyo-attributed campaign and flow revenue synced for this region and date range.",
      align: "right",
      cell: (row) => formatCurrency(row.klaviyoRevenue, row.region.currency_code),
    },
    {
      header: "Klaviyo share",
      description: "Klaviyo-attributed revenue divided by Shopify revenue for this region.",
      align: "right",
      cell: (row) => formatPercent(safeRate(row.klaviyoRevenue, row.shopifyRevenue)),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Market comparison"
          title="Regional Performance"
          description="Compare revenue, order volume, and Klaviyo contribution across active regions."
          meta={`${data.selectedRegions.length} region(s), ${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Regions"
            value={formatNumber(data.selectedRegions.length)}
            helper="Active regions in the selected filter."
            description="Count of active dashboard regions included after the region filter is applied."
            accent="slate"
          />
          <MetricCard
            label="Revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper="Actual Shopify revenue."
            description="Sum of Shopify revenue rows across the selected regions and date range. Multiple currencies are not converted."
            accent="teal"
          />
          <MetricCard
            label="Orders"
            value={formatNumber(data.summary.orders)}
            helper={`${formatCurrency(safeRate(data.summary.shopifyRevenue, data.summary.orders), currencyCode)} AOV`}
            description="Total synced Shopify orders. The helper AOV is Shopify revenue divided by orders."
            accent="blue"
          />
          <MetricCard
            label="Klaviyo contribution"
            value={formatPercent(safeRate(data.summary.klaviyoRevenue, data.summary.shopifyRevenue))}
            helper={formatCurrency(data.summary.klaviyoRevenue, currencyCode)}
            description="Klaviyo-attributed revenue divided by Shopify revenue for the selected regions and dates."
            accent="amber"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Region Ranking</h2>
        <DataTable columns={columns} rows={data.regionalSummaries} emptyMessage="No regional data is available yet." />
      </section>
    </div>
  );
}
