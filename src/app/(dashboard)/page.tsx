/*
File description:
This Overview page shows the main Shopify and Klaviyo performance summary for the selected date range
and regions. It is the first reporting surface users see after signing in.
*/

import { BarChart3, MailCheck, MousePointerClick, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { TrendBars } from "@/components/trend-bars";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RankedCampaign, RankedFlow, RegionalSummary } from "@/lib/types";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const currencyHelper =
    data.selectedRegions.length > 1 ? "Multiple currencies may be included." : "Actual Shopify revenue.";
  const regionColumns: DataTableColumn<RegionalSummary>[] = [
    {
      header: "Region",
      cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span>,
    },
    {
      header: "Shopify revenue",
      align: "right",
      cell: (row) => formatCurrency(row.shopifyRevenue, row.region.currency_code),
    },
    {
      header: "Orders",
      align: "right",
      cell: (row) => formatNumber(row.orders),
    },
    {
      header: "Klaviyo share",
      align: "right",
      cell: (row) => formatPercent(safeRate(row.klaviyoRevenue, row.shopifyRevenue)),
    },
  ];
  const campaignColumns: DataTableColumn<RankedCampaign>[] = [
    { header: "Campaign", cell: (row) => <span className="font-medium text-slate-950">{row.campaign_name}</span> },
    { header: "Region", cell: (row) => row.region_name },
    { header: "Revenue", align: "right", cell: (row) => formatCurrency(row.revenue_amount, row.currency_code) },
  ];
  const flowColumns: DataTableColumn<RankedFlow>[] = [
    { header: "Flow", cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span> },
    { header: "Region", cell: (row) => row.region_name },
    { header: "Revenue", align: "right", cell: (row) => formatCurrency(row.revenue_amount, row.currency_code) },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filters.startDate} to {filters.endDate}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Shopify revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper={currencyHelper}
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
            label="Customers"
            value={formatNumber(data.summary.customers)}
            helper="Unique Shopify customer IDs in synced orders."
            icon={Users}
            accent="violet"
          />
          <MetricCard
            label="Klaviyo-attributed revenue"
            value={formatCurrency(data.summary.klaviyoRevenue, currencyCode)}
            helper={`${formatPercent(safeRate(data.summary.klaviyoRevenue, data.summary.shopifyRevenue))} of Shopify revenue`}
            icon={MailCheck}
            accent="amber"
          />
          <MetricCard
            label="Email clicks"
            value={formatNumber(data.summary.clicks)}
            helper={`${formatPercent(safeRate(data.summary.clicks, data.summary.recipients))} click rate`}
            icon={MousePointerClick}
            accent="rose"
          />
          <MetricCard
            label="Conversions"
            value={formatNumber(data.summary.conversions)}
            helper={`${formatPercent(safeRate(data.summary.conversions, data.summary.recipients))} conversion rate`}
            icon={BarChart3}
            accent="slate"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <TrendBars points={data.trend} />
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-3 lg:px-6">
        <div className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Top Regions</h2>
          <DataTable columns={regionColumns} rows={data.regionalSummaries.slice(0, 5)} emptyMessage="No region data yet." />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Top Campaigns</h2>
          <DataTable columns={campaignColumns} rows={data.topCampaigns} emptyMessage="No campaign data yet." />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Top Flows</h2>
          <DataTable columns={flowColumns} rows={data.topFlows} emptyMessage="No flow data yet." />
        </div>
      </section>
    </div>
  );
}
