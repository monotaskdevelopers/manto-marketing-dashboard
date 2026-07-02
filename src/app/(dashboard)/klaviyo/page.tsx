/*
File description:
This Klaviyo page shows email marketing performance from synced Klaviyo campaign and flow reports. It
keeps attributed revenue separate from actual Shopify revenue.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RankedCampaign, RankedFlow } from "@/lib/types";

export default async function KlaviyoPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const campaignColumns: DataTableColumn<RankedCampaign>[] = [
    {
      header: "Campaign",
      description: "The Klaviyo campaign name from the synced campaign report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.campaign_name}</span>,
    },
    {
      header: "Region",
      description: "The region connected to the Klaviyo account that produced this campaign row.",
      cell: (row) => row.region_name,
    },
    {
      header: "Open rate",
      description: "Campaign opens divided by campaign recipients.",
      align: "right",
      cell: (row) => formatPercent(row.openRate),
    },
    {
      header: "Click rate",
      description: "Campaign clicks divided by campaign recipients.",
      align: "right",
      cell: (row) => formatPercent(row.clickRate),
    },
    {
      header: "Revenue",
      description: "Klaviyo-attributed revenue reported for this campaign row.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
  ];
  const flowColumns: DataTableColumn<RankedFlow>[] = [
    {
      header: "Flow",
      description: "The Klaviyo automated flow name from the synced flow report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.flow_name}</span>,
    },
    {
      header: "Region",
      description: "The region connected to the Klaviyo account that produced this flow row.",
      cell: (row) => row.region_name,
    },
    {
      header: "Open rate",
      description: "Flow email opens divided by flow recipients.",
      align: "right",
      cell: (row) => formatPercent(row.openRate),
    },
    {
      header: "Click rate",
      description: "Flow email clicks divided by flow recipients.",
      align: "right",
      cell: (row) => formatPercent(row.clickRate),
    },
    {
      header: "Revenue",
      description: "Klaviyo-attributed revenue reported for this flow row.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Marketing attribution"
          title="Klaviyo"
          description="Campaign and flow performance from synced Klaviyo reporting."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Attributed revenue"
            value={formatCurrency(data.summary.klaviyoRevenue, currencyCode)}
            helper={`${formatPercent(safeRate(data.summary.klaviyoRevenue, data.summary.shopifyRevenue))} of Shopify revenue`}
            description="Sum of Klaviyo attributed revenue for campaigns and flows. The helper share is attributed revenue divided by Shopify revenue."
            accent="teal"
          />
          <MetricCard
            label="Campaign revenue"
            value={formatCurrency(data.summary.campaignRevenue, currencyCode)}
            description="Sum of Klaviyo campaign revenue rows for the selected filters."
            accent="blue"
          />
          <MetricCard
            label="Flow revenue"
            value={formatCurrency(data.summary.flowRevenue, currencyCode)}
            description="Sum of Klaviyo automated flow revenue rows for the selected filters."
            accent="amber"
          />
          <MetricCard
            label="Open rate"
            value={formatPercent(safeRate(data.summary.opens, data.summary.recipients))}
            helper={`${formatNumber(data.summary.opens)} opens`}
            description="Total Klaviyo opens divided by total Klaviyo recipients for the selected filters."
            accent="violet"
          />
          <MetricCard
            label="Click rate"
            value={formatPercent(safeRate(data.summary.clicks, data.summary.recipients))}
            helper={`${formatNumber(data.summary.clicks)} clicks`}
            description="Total Klaviyo clicks divided by total Klaviyo recipients for the selected filters."
            accent="rose"
          />
        </div>
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <div className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Top Campaigns</h2>
          <DataTable columns={campaignColumns} rows={data.topCampaigns} emptyMessage="No campaign data is available yet." />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Top Flows</h2>
          <DataTable columns={flowColumns} rows={data.topFlows} emptyMessage="No flow data is available yet." />
        </div>
      </section>
    </div>
  );
}
