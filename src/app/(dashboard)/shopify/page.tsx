/*
File description:
This Shopify page shows ecommerce source-of-truth reporting from synced Shopify order data. It focuses on
revenue, orders, customers, refunds, cancellations, and daily movement.
*/

import { RotateCcw, ShoppingBag, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
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
    { header: "Region", cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span> },
    { header: "Revenue", align: "right", cell: (row) => formatCurrency(row.shopifyRevenue, row.region.currency_code) },
    { header: "Orders", align: "right", cell: (row) => formatNumber(row.orders) },
    { header: "Customers", align: "right", cell: (row) => formatNumber(row.customers) },
    { header: "AOV", align: "right", cell: (row) => formatCurrency(safeRate(row.shopifyRevenue, row.orders), row.region.currency_code) },
    { header: "Refunds", align: "right", cell: (row) => formatCurrency(row.refunds, row.region.currency_code) },
    { header: "Cancelled", align: "right", cell: (row) => formatNumber(row.cancelledOrders) },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Shopify</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ecommerce sales performance from synced Shopify orders.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper="Actual Shopify revenue."
            icon={TrendingUp}
            accent="teal"
          />
          <MetricCard label="Orders" value={formatNumber(data.summary.orders)} icon={ShoppingCart} accent="blue" />
          <MetricCard
            label="AOV"
            value={formatCurrency(safeRate(data.summary.shopifyRevenue, data.summary.orders), currencyCode)}
            icon={ShoppingBag}
            accent="violet"
          />
          <MetricCard label="Customers" value={formatNumber(data.summary.customers)} icon={Users} accent="amber" />
          <MetricCard
            label="Refunds"
            value={formatCurrency(data.summary.refunds, currencyCode)}
            helper={`${formatNumber(data.summary.cancelledOrders)} cancelled orders`}
            icon={RotateCcw}
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
