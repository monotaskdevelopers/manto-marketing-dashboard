/*
File description:
This Regional Performance page compares Shopify revenue, orders, AOV, and Klaviyo contribution across
regions. It helps internal users quickly spot stronger and weaker markets.
*/

import { Globe2, MailCheck, ShoppingCart, TrendingUp } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
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
      cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span>,
    },
    {
      header: "Revenue",
      align: "right",
      cell: (row) => formatCurrency(row.shopifyRevenue, row.region.currency_code),
    },
    {
      header: "Orders",
      align: "right",
      cell: (row) => formatNumber(row.orders),
    },
    {
      header: "AOV",
      align: "right",
      cell: (row) => formatCurrency(safeRate(row.shopifyRevenue, row.orders), row.region.currency_code),
    },
    {
      header: "Klaviyo revenue",
      align: "right",
      cell: (row) => formatCurrency(row.klaviyoRevenue, row.region.currency_code),
    },
    {
      header: "Klaviyo share",
      align: "right",
      cell: (row) => formatPercent(safeRate(row.klaviyoRevenue, row.shopifyRevenue)),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Regional Performance</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.selectedRegions.length} region(s), {filters.startDate} to {filters.endDate}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Regions"
            value={formatNumber(data.selectedRegions.length)}
            helper="Active regions in the selected filter."
            icon={Globe2}
            accent="slate"
          />
          <MetricCard
            label="Revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper="Actual Shopify revenue."
            icon={TrendingUp}
            accent="teal"
          />
          <MetricCard
            label="Orders"
            value={formatNumber(data.summary.orders)}
            helper={`${formatCurrency(safeRate(data.summary.shopifyRevenue, data.summary.orders), currencyCode)} AOV`}
            icon={ShoppingCart}
            accent="blue"
          />
          <MetricCard
            label="Klaviyo contribution"
            value={formatPercent(safeRate(data.summary.klaviyoRevenue, data.summary.shopifyRevenue))}
            helper={formatCurrency(data.summary.klaviyoRevenue, currencyCode)}
            icon={MailCheck}
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
