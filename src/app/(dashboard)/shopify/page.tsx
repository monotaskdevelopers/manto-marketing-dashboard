/*
File description:
This Shopify page shows ecommerce source-of-truth reporting from synced Shopify order data. It focuses on
revenue, orders, customers, refunds, cancellations, and daily movement.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { TrendBars } from "@/components/trend-bars";
import { formatCurrency, formatNumber, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RegionalSummary } from "@/lib/types";

export default async function ShopifyPage({
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
      description: "The active Shopify store region represented by this row.",
      cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span>,
    },
    {
      header: "Revenue",
      description: "Total synced Shopify revenue for this region and date range.",
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
      header: "Customers",
      description: "Sum of daily Shopify customer counts for this region. Repeat customers can appear on multiple days.",
      align: "right",
      cell: (row) => formatNumber(row.customers),
    },
    {
      header: "AOV",
      description: "Average order value. It is Shopify revenue divided by Shopify orders.",
      align: "right",
      cell: (row) => formatCurrency(safeRate(row.shopifyRevenue, row.orders), row.region.currency_code),
    },
    {
      header: "Refunds",
      description: "Total synced Shopify refund amount for this region and date range.",
      align: "right",
      cell: (row) => formatCurrency(row.refunds, row.region.currency_code),
    },
    {
      header: "Cancelled",
      description: "Total synced Shopify orders marked as cancelled for this region and date range.",
      align: "right",
      cell: (row) => formatNumber(row.cancelledOrders),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Sales source of truth"
          title="Shopify"
          description="Ecommerce sales performance from synced Shopify order metrics."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper="Actual Shopify revenue."
            description="Sum of Shopify revenue rows for the selected regions and date range. Multiple selected currencies are not converted."
            accent="teal"
          />
          <MetricCard
            label="Orders"
            value={formatNumber(data.summary.orders)}
            description="Total synced Shopify orders for the selected filters."
            accent="blue"
          />
          <MetricCard
            label="AOV"
            value={formatCurrency(safeRate(data.summary.shopifyRevenue, data.summary.orders), currencyCode)}
            description="Average order value. It is calculated as Shopify revenue divided by Shopify orders."
            accent="violet"
          />
          <MetricCard
            label="Customers"
            value={formatNumber(data.summary.customers)}
            description="Sum of daily Shopify customer counts for the selected filters. Repeat customers can be counted on multiple days."
            accent="amber"
          />
          <MetricCard
            label="Refunds"
            value={formatCurrency(data.summary.refunds, currencyCode)}
            helper={`${formatNumber(data.summary.cancelledOrders)} cancelled orders`}
            description="Total synced Shopify refund amount. The helper shows total synced cancelled orders."
            accent="rose"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <TrendBars points={data.trend} />
      </section>
      <section className="px-4 lg:px-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Shopify By Region</h2>
        <DataTable columns={columns} rows={data.regionalSummaries} emptyMessage="No Shopify data is available yet." />
      </section>
    </div>
  );
}
