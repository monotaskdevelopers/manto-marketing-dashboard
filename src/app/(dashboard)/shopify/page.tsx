/*
File description:
This Shopify page shows ecommerce source-of-truth reporting from synced Shopify order data. It focuses on
revenue, orders, customers, refunds, cancellations, and daily movement.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { TableHeaderControls } from "@/components/table-header-controls";
import { TrendBars } from "@/components/trend-bars";
import { formatCurrency, formatNumber, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import {
  buildPreservedTableFields,
  filterAndSortRegionalRows,
  getTableControlFieldNames,
  parseScopedTableState,
  regionalTableFilterOptions,
  regionalTableSortOptions,
} from "@/lib/report-table-controls";
import type { RegionalSummary } from "@/lib/types";

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const tableFieldNames = getTableControlFieldNames("shopifyRegions");
  const tableState = parseScopedTableState({
    searchParams: rawSearchParams,
    fieldNames: tableFieldNames,
    sortOptions: regionalTableSortOptions,
    filterOptions: regionalTableFilterOptions,
    defaultSort: "shopify_revenue_desc",
    defaultFilter: "all",
  });
  const rows = filterAndSortRegionalRows(data.regionalSummaries, tableState);
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
      visibility: "md",
      cell: (row) => formatNumber(row.customers),
    },
    {
      header: "AOV",
      description: "Average order value. It is Shopify revenue divided by Shopify orders.",
      align: "right",
      visibility: "lg",
      cell: (row) => formatCurrency(safeRate(row.shopifyRevenue, row.orders), row.region.currency_code),
    },
    {
      header: "Refunds",
      description: "Total synced Shopify refund amount for this region and date range.",
      align: "right",
      visibility: "xl",
      cell: (row) => formatCurrency(row.refunds, row.region.currency_code),
    },
    {
      header: "Cancelled",
      description: "Total synced Shopify orders marked as cancelled for this region and date range.",
      align: "right",
      visibility: "2xl",
      cell: (row) => formatNumber(row.cancelledOrders),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section className="px-4 pt-5 lg:px-6">
        <ReportHeader
          eyebrow="Sales source of truth"
          title="Shopify"
          description="Ecommerce sales performance from synced Shopify order metrics."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
      </section>
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No Shopify data is available yet."
          title="Shopify By Region"
          description="Search, filter, and sort Shopify source-of-truth performance by region."
          controls={
            <TableHeaderControls
              action="/shopify"
              filters={filters}
              fieldNames={tableFieldNames}
              state={tableState}
              filterOptions={regionalTableFilterOptions}
              sortOptions={regionalTableSortOptions}
              preservedFields={buildPreservedTableFields({
                searchParams: rawSearchParams,
                currentFieldNames: tableFieldNames,
              })}
              searchPlaceholder="Region or currency…"
            />
          }
          rowSummary={`${formatNumber(rows.length)} of ${formatNumber(data.regionalSummaries.length)} row(s) shown`}
        />
      </section>
    </div>
  );
}
