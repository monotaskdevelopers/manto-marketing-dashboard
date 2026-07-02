/*
File description:
This page provides a Klaviyo campaign drill-down report. It keeps the dashboard date and region scope,
adds campaign-level search/sort/filter controls, and renders full campaign metrics for granular analysis.
*/

import { DataTable, type DataTableColumn } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { KlaviyoDrilldownControls } from "@/components/klaviyo-drilldown-controls";
import { LeaderboardPanel, MetricBarsPanel } from "@/components/klaviyo-report-panels";
import { MetricCard } from "@/components/metric-card";
import { ReportHeader } from "@/components/report-header";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  calculateKlaviyoRowRates,
  filterAndSortKlaviyoRows,
  parseKlaviyoTableFilters,
  summarizeKlaviyoRows,
} from "@/lib/klaviyo-reporting";
import type { RankedCampaign } from "@/lib/types";

export default async function KlaviyoCampaignDrilldownPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);
  const tableFilters = parseKlaviyoTableFilters(rawSearchParams);
  // Keep this page-level guard so unauthenticated requests redirect before report data is queried.
  await requireUser();
  const data = await getDashboardData(filters);
  const rows = filterAndSortKlaviyoRows(data.campaignRows, tableFilters);
  const summary = summarizeKlaviyoRows(rows);
  const rates = calculateKlaviyoRowRates(summary);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const columns: DataTableColumn<RankedCampaign>[] = [
    {
      header: "Campaign",
      description: "The Klaviyo campaign name from the synced campaign report.",
      cell: (row) => <span className="font-medium text-slate-950">{row.campaign_name}</span>,
    },
    {
      header: "Campaign ID",
      description: "Klaviyo's campaign identifier, useful when comparing dashboard rows to Klaviyo exports.",
      cell: (row) => <span className="font-mono text-xs text-slate-600">{row.campaign_id}</span>,
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
      header: "Opens",
      description: "Number of opens Klaviyo reports for this campaign row.",
      align: "right",
      cell: (row) => formatNumber(row.opens_count),
    },
    {
      header: "Clicks",
      description: "Number of clicks Klaviyo reports for this campaign row.",
      align: "right",
      cell: (row) => formatNumber(row.clicks_count),
    },
    {
      header: "Conversions",
      description: "Number of conversions Klaviyo attributes to this campaign row.",
      align: "right",
      cell: (row) => formatNumber(row.conversions_count),
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
  const leaderboardItems = rows.slice(0, 8).map((row) => ({
    id: row.id,
    label: row.campaign_name,
    detail: `${row.region_name} · ${row.send_date}`,
    value: row.revenue_amount,
    formattedValue: formatCurrency(row.revenue_amount, row.currency_code),
    helper: `${formatPercent(row.clickRate)} click`,
  }));

  return (
    <div className="space-y-6 pb-10">
      <FilterBar filters={filters} regions={data.regions} />
      <section className="px-4 lg:px-6">
        <ReportHeader
          eyebrow="Klaviyo drill-down"
          title="Campaign Performance"
          description="Campaign-level revenue, audience, engagement, conversion, and revenue density for the selected scope."
          meta={`${filters.startDate} to ${filters.endDate}`}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Filtered revenue"
            value={formatCurrency(summary.revenue, currencyCode)}
            helper={`${formatCurrency(rates.revenuePerRecipient, currencyCode)} per recipient`}
            description="Total campaign revenue after the campaign drill-down filters are applied."
            accent="teal"
          />
          <MetricCard
            label="Campaign rows"
            value={formatNumber(rows.length)}
            helper={`${formatNumber(data.campaignRows.length)} rows before table filters`}
            description="Number of campaign report rows visible after search, revenue, engagement, and sort controls are applied."
            accent="slate"
          />
          <MetricCard
            label="Recipients"
            value={formatNumber(summary.recipients)}
            helper={`${formatPercent(rates.openRate)} open rate`}
            description="Total recipients across the visible campaign rows."
            accent="blue"
          />
          <MetricCard
            label="Conversion rate"
            value={formatPercent(rates.conversionRate)}
            helper={`${formatNumber(summary.conversions)} conversions`}
            description="Visible campaign conversions divided by visible campaign recipients."
            accent="rose"
          />
        </div>
      </section>
      <section className="px-4 lg:px-6">
        <KlaviyoDrilldownControls action="/klaviyo/campaigns" filters={filters} tableFilters={tableFilters} />
      </section>
      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <LeaderboardPanel
          title="Campaign revenue distribution"
          description="Highest revenue campaigns after the drill-down filters are applied."
          items={leaderboardItems}
          emptyMessage="No campaign rows match the current table filters."
        />
        <MetricBarsPanel
          title="Campaign engagement quality"
          description="Visible campaign engagement rates calculated from the filtered table rows."
          emptyMessage="No campaign engagement data is available for the current filters."
          items={[
            {
              label: "Open rate",
              formattedValue: formatPercent(rates.openRate),
              value: rates.openRate,
              description: `${formatNumber(summary.opens)} opens`,
              tone: "teal",
            },
            {
              label: "Click rate",
              formattedValue: formatPercent(rates.clickRate),
              value: rates.clickRate,
              description: `${formatNumber(summary.clicks)} clicks`,
              tone: "amber",
            },
            {
              label: "Conversion rate",
              formattedValue: formatPercent(rates.conversionRate),
              value: rates.conversionRate,
              description: `${formatNumber(summary.conversions)} conversions`,
              tone: "rose",
            },
          ]}
        />
      </section>
      <section className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No campaign rows match the current filters."
          title="Campaign detail table"
          description="Full campaign-level rows with sortable URL controls above the table."
          rowSummary={`${formatNumber(rows.length)} of ${formatNumber(data.campaignRows.length)} row(s) shown`}
        />
      </section>
    </div>
  );
}
