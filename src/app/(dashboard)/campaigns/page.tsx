/*
File description:
This Campaigns page lists Klaviyo campaign-level performance across the selected date range and regions.
It helps the team compare individual sends by revenue, engagement, conversion, and recipients.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { formatCurrency, formatNumber, formatPercent, safeRate } from "@/lib/format";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import type { RankedCampaign } from "@/lib/types";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const columns: DataTableColumn<RankedCampaign>[] = [
    {
      header: "Campaign",
      description: "The Klaviyo campaign name from the synced campaign report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.campaign_name}</span>,
    },
    {
      header: "Region",
      description: "The dashboard region connected to the Klaviyo account that sent the campaign.",
      cell: (row) => row.region_name,
    },
    {
      header: "Send date",
      description: "The date Klaviyo reports for the campaign send.",
      cell: (row) => row.send_date,
    },
    {
      header: "Recipients",
      description: "Number of recipients Klaviyo reports for this campaign.",
      align: "right",
      cell: (row) => formatNumber(row.recipients_count),
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
      description: "Klaviyo-attributed revenue reported for this campaign.",
      align: "right",
      cell: (row) => formatCurrency(row.revenue_amount, row.currency_code),
    },
    {
      header: "Rev/recipient",
      description: "Revenue per recipient. It is campaign revenue divided by campaign recipients.",
      align: "right",
      cell: (row) => formatCurrency(row.revenuePerRecipient, row.currency_code),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Campaign reporting"
          title="Campaigns"
          description="Klaviyo campaign performance by send, region, engagement, and attributed revenue."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Campaign revenue"
            value={formatCurrency(data.summary.campaignRevenue, currencyCode)}
            description="Sum of Klaviyo campaign revenue rows for the selected filters."
            accent="teal"
          />
          <MetricCard
            label="Recipients"
            value={formatNumber(data.summary.recipients)}
            description="Total recipients from synced Klaviyo daily metrics for the selected filters."
            accent="blue"
          />
          <MetricCard
            label="Open rate"
            value={formatPercent(safeRate(data.summary.opens, data.summary.recipients))}
            helper={`${formatNumber(data.summary.opens)} opens`}
            description="Total opens divided by total recipients for the selected filters."
            accent="amber"
          />
          <MetricCard
            label="Click rate"
            value={formatPercent(safeRate(data.summary.clicks, data.summary.recipients))}
            helper={`${formatNumber(data.summary.clicks)} clicks`}
            description="Total clicks divided by total recipients for the selected filters."
            accent="rose"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Campaign Report</h2>
        <DataTable columns={columns} rows={data.campaignRows} emptyMessage="No campaign data is available yet." />
      </section>
    </div>
  );
}
