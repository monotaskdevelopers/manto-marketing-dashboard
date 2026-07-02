/*
File description:
This Klaviyo page shows email marketing performance from synced Klaviyo campaign and flow reports. It
keeps attributed revenue separate from actual Shopify revenue.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import {
  KlaviyoDeliverabilityPanel,
  KlaviyoEngagementFunnelPanel,
  KlaviyoRegionalBreakdownPanel,
  KlaviyoReportLinks,
  KlaviyoRevenueMixPanel,
  KlaviyoRevenueTrendPanel,
} from "@/components/klaviyo-report-panels";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import { buildDashboardHref } from "@/lib/klaviyo-reporting";
import type { RankedCampaign, RankedFlow } from "@/lib/types";

export default async function KlaviyoPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  // Keep this page-level guard so unauthenticated requests redirect before report data is queried.
  await requireUser();
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
      header: "Conversion rate",
      description: "Campaign conversions divided by campaign recipients.",
      align: "right",
      cell: (row) => formatPercent(row.conversionRate),
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
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Marketing attribution"
          title="Klaviyo"
          description="Campaign, flow, engagement, deliverability, and regional contribution from synced Klaviyo reporting."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
            label="Recipients"
            value={formatNumber(data.summary.recipients)}
            helper={`${formatNumber(data.summary.conversions)} conversions`}
            description="Total Klaviyo recipients across synced campaign and flow daily metrics for the selected filters."
            accent="slate"
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
          <MetricCard
            label="Conversion rate"
            value={formatPercent(safeRate(data.summary.conversions, data.summary.recipients))}
            helper={formatCurrency(safeRate(data.summary.klaviyoRevenue, data.summary.recipients), currencyCode)}
            description="Total Klaviyo conversions divided by recipients. The helper is Klaviyo revenue per recipient."
            accent="violet"
          />
        </div>
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:px-6">
        <KlaviyoRevenueTrendPanel points={data.klaviyoTrend} currencyCode={currencyCode} />
        <div className="grid gap-4">
          <KlaviyoRevenueMixPanel
            campaignRevenue={data.summary.campaignRevenue}
            flowRevenue={data.summary.flowRevenue}
            currencyCode={currencyCode}
          />
          <KlaviyoEngagementFunnelPanel
            recipients={data.summary.recipients}
            opens={data.summary.opens}
            clicks={data.summary.clicks}
            conversions={data.summary.conversions}
          />
        </div>
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <KlaviyoDeliverabilityPanel
          recipients={data.summary.recipients}
          unsubscribes={data.summary.unsubscribes}
          bounces={data.summary.bounces}
          spamComplaints={data.summary.spamComplaints}
        />
        <KlaviyoRegionalBreakdownPanel regions={data.regionalSummaries} currencyCode={currencyCode} />
      </section>
      <section className="px-4 lg:px-6">
        <KlaviyoReportLinks
          campaignHref={buildDashboardHref("/klaviyo/campaigns", filters)}
          flowHref={buildDashboardHref("/klaviyo/flows", filters)}
        />
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <div className="min-w-0">
          <DataTable
            columns={campaignColumns}
            rows={data.topCampaigns}
            emptyMessage="No campaign data is available yet."
            title="Campaign snapshot"
            description="Top campaign sends by attributed revenue."
            rowSummary={`${data.campaignRows.length} campaign row(s) in scope`}
          />
        </div>
        <div className="min-w-0">
          <DataTable
            columns={flowColumns}
            rows={data.topFlows}
            emptyMessage="No flow data is available yet."
            title="Flow snapshot"
            description="Top automated flows by attributed revenue."
            rowSummary={`${data.flowRows.length} flow row(s) in scope`}
          />
        </div>
      </section>
    </div>
  );
}
