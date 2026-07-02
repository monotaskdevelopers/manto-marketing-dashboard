/*
File description:
This Overview page shows the main Shopify and Klaviyo performance summary for the selected date range
and regions. It is the first reporting surface users see after signing in.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
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
      description: "The active store region that the synced Shopify and Klaviyo rows belong to.",
      cell: (row) => <span className="font-medium text-slate-950">{row.region.name}</span>,
    },
    {
      header: "Shopify revenue",
      description:
        "Total revenue from synced Shopify daily order metrics for this region and date range. Currencies are shown in the region's own currency.",
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
      header: "Klaviyo share",
      description: "Klaviyo-attributed revenue divided by Shopify revenue. If Shopify revenue is zero, the share is shown as 0%.",
      align: "right",
      cell: (row) => formatPercent(safeRate(row.klaviyoRevenue, row.shopifyRevenue)),
    },
  ];
  const campaignColumns: DataTableColumn<RankedCampaign>[] = [
    {
      header: "Campaign",
      description: "The Klaviyo campaign name from the synced campaign report row.",
      cell: (row) => <span className="font-medium text-slate-950">{row.campaign_name}</span>,
    },
    {
      header: "Region",
      description: "The region connected to the Klaviyo account that produced this campaign row.",
      cell: (row) => row.region_name,
    },
    {
      header: "Revenue",
      description: "Klaviyo-attributed campaign revenue reported for this campaign row.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
  ];
  const flowColumns: DataTableColumn<RankedFlow>[] = [
    {
      header: "Flow",
      description: "The Klaviyo automated flow name from the synced flow report row.",
      cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span>,
    },
    {
      header: "Region",
      description: "The region connected to the Klaviyo account that produced this flow row.",
      cell: (row) => row.region_name,
    },
    {
      header: "Revenue",
      description: "Klaviyo-attributed flow revenue reported for this flow row.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Executive snapshot"
          title="Overview"
          description="A combined view of Shopify sales and Klaviyo marketing contribution for the selected filters."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Shopify revenue"
            value={formatCurrency(data.summary.shopifyRevenue, currencyCode)}
            helper={currencyHelper}
            description="Sum of Shopify revenue rows for the selected date range and regions. Multiple selected currencies are not converted."
            accent="teal"
          />
          <MetricCard
            label="Orders"
            value={formatNumber(data.summary.orders)}
            helper={`${formatCurrency(safeRate(data.summary.shopifyRevenue, data.summary.orders), currencyCode)} AOV`}
            description="Total synced Shopify orders for the selected filters. Average order value is Shopify revenue divided by orders."
            accent="blue"
          />
          <MetricCard
            label="Customers"
            value={formatNumber(data.summary.customers)}
            helper="Daily Shopify customer counts are summed across the selected range."
            description="Sum of synced Shopify customer counts in the selected date range. A repeat customer can be counted on more than one day."
            accent="violet"
          />
          <MetricCard
            label="Klaviyo-attributed revenue"
            value={formatCurrency(data.summary.klaviyoRevenue, currencyCode)}
            helper={`${formatPercent(safeRate(data.summary.klaviyoRevenue, data.summary.shopifyRevenue))} of Shopify revenue`}
            description="Sum of Klaviyo attributed revenue rows for campaigns and flows in the selected filters. The share is this value divided by Shopify revenue."
            accent="amber"
          />
          <MetricCard
            label="Email clicks"
            value={formatNumber(data.summary.clicks)}
            helper={`${formatPercent(safeRate(data.summary.clicks, data.summary.recipients))} click rate`}
            description="Total Klaviyo email clicks divided by total recipients gives the click rate."
            accent="rose"
          />
          <MetricCard
            label="Conversions"
            value={formatNumber(data.summary.conversions)}
            helper={`${formatPercent(safeRate(data.summary.conversions, data.summary.recipients))} conversion rate`}
            description="Total Klaviyo conversions divided by total recipients gives the conversion rate."
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
