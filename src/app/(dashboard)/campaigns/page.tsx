/*
File description:
This Campaigns page renders a Klaviyo-inspired campaign performance workspace for the selected date range
and region. It keeps the report server-rendered, URL-filterable, and backed by synced campaign rows while
matching the flat operational UI requested for campaign review.
*/

import {
  MarketingPerformanceReport,
  type MarketingPerformanceMetric,
  type MarketingPerformanceTableRow,
} from "@/components/marketing-performance-report";
import { getDashboardData } from "@/lib/data/dashboard";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import {
  buildTrendLabel,
  compareKlaviyoPerformanceByDate,
  formatDateOnlyLabel,
  formatPerformanceCurrency,
  formatPerformancePercent,
  getPerformanceRating,
  getPresetLabel,
  summarizeKlaviyoPerformanceRows,
} from "@/lib/marketing-performance";
import {
  buildPreservedTableFields,
  filterAndSortKlaviyoSimpleRows,
  getTableControlFieldNames,
  parseScopedTableState,
  type KlaviyoSimpleTableFilter,
  type KlaviyoSimpleTableSort,
  type TableControlOption,
} from "@/lib/report-table-controls";
import type { RankedCampaign } from "@/lib/types";

const campaignFilterOptions: TableControlOption<KlaviyoSimpleTableFilter>[] = [
  { value: "all", label: "Status" },
  { value: "has_conversions", label: "Has placed order" },
  { value: "low_click_rate", label: "Low click rate" },
  { value: "high_revenue_density", label: "High revenue density" },
];

const campaignSortOptions: TableControlOption<KlaviyoSimpleTableSort>[] = [
  { value: "revenue_desc", label: "Placed Order" },
  { value: "open_desc", label: "Open rate" },
  { value: "click_desc", label: "Click rate" },
  { value: "conversion_desc", label: "Conversion rate" },
  { value: "recipients_desc", label: "Recipients" },
  { value: "date_desc", label: "Newest first" },
  { value: "name_asc", label: "Name A to Z" },
];

function buildCampaignMetrics({
  rows,
  startDate,
  endDate,
  currencyCode,
}: {
  rows: RankedCampaign[];
  startDate: string;
  endDate: string;
  currencyCode: string;
}): MarketingPerformanceMetric[] {
  const summary = summarizeKlaviyoPerformanceRows(rows);

  // Trend chips compare real rows from the later half of the filtered range against the earlier half.
  const openDelta = compareKlaviyoPerformanceByDate({ rows, startDate, endDate, metric: "openRate" });
  const clickDelta = compareKlaviyoPerformanceByDate({ rows, startDate, endDate, metric: "clickRate" });
  const conversionDelta = compareKlaviyoPerformanceByDate({ rows, startDate, endDate, metric: "conversionRate" });
  const revenuePerRecipientDelta = compareKlaviyoPerformanceByDate({
    rows,
    startDate,
    endDate,
    metric: "revenuePerRecipient",
  });

  return [
    {
      label: "Average open rate",
      value: formatPerformancePercent(summary.openRate),
      trend: buildTrendLabel({ delta: openDelta, formatter: formatPerformancePercent }),
      rating: getPerformanceRating("openRate", summary.openRate),
    },
    {
      label: "Average click rate",
      value: formatPerformancePercent(summary.clickRate),
      trend: buildTrendLabel({ delta: clickDelta, formatter: formatPerformancePercent }),
      rating: getPerformanceRating("clickRate", summary.clickRate),
    },
    {
      label: "Placed Order",
      value: formatPerformancePercent(summary.conversionRate),
      trend: buildTrendLabel({ delta: conversionDelta, formatter: formatPerformancePercent }),
      rating: getPerformanceRating("conversionRate", summary.conversionRate),
    },
    {
      label: "Revenue per recipient",
      value: formatPerformanceCurrency(summary.revenuePerRecipient, currencyCode),
      trend: buildTrendLabel({
        delta: revenuePerRecipientDelta,
        formatter: (value) => formatPerformanceCurrency(value, currencyCode),
      }),
      rating: getPerformanceRating("revenuePerRecipient", summary.revenuePerRecipient),
    },
  ];
}

function toCampaignTableRow(row: RankedCampaign): MarketingPerformanceTableRow {
  const lowerName = row.campaign_name.toLowerCase();
  const isSms = lowerName.includes("sms");
  const badges = lowerName.includes("a/b") || lowerName.includes("ab test") ? ["A/B"] : undefined;

  return {
    id: row.id,
    name: row.campaign_name,
    audience: row.region_name,
    messageType: isSms ? "sms" : "email",
    messageLabel: isSms ? "SMS campaign" : "Email campaign",
    status: "Sent",
    statusTone: "success",
    dateLabel: formatDateOnlyLabel(row.send_date),
    recipientsCount: row.recipients_count,
    opensCount: row.opens_count,
    clicksCount: row.clicks_count,
    conversionsCount: row.conversions_count,
    openRate: row.openRate,
    clickRate: row.clickRate,
    conversionRate: row.conversionRate,
    revenue: row.revenue_amount,
    currencyCode: row.currency_code,
    badges,
  };
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const tableFieldNames = getTableControlFieldNames("campaignRows");
  const tableState = parseScopedTableState({
    searchParams: rawSearchParams,
    fieldNames: tableFieldNames,
    sortOptions: campaignSortOptions,
    filterOptions: campaignFilterOptions,
    defaultSort: "revenue_desc",
    defaultFilter: "all",
  });
  const rows = filterAndSortKlaviyoSimpleRows(data.campaignRows, tableState);

  return (
    <MarketingPerformanceReport
      title="Campaigns"
      performanceTitle={`Email performance ${getPresetLabel(filters.preset)}`}
      createLabel="Create campaign"
      actionPath="/campaigns"
      filters={filters}
      regions={data.regions}
      fieldNames={tableFieldNames}
      state={tableState}
      filterOptions={campaignFilterOptions}
      sortOptions={campaignSortOptions}
      preservedFields={buildPreservedTableFields({
        searchParams: rawSearchParams,
        currentFieldNames: tableFieldNames,
      })}
      searchPlaceholder="Search campaigns"
      tableNameHeader="Campaign"
      dateHeader="Send date"
      rows={rows.map(toCampaignTableRow)}
      totalRows={data.campaignRows.length}
      metrics={buildCampaignMetrics({
        rows: data.campaignRows,
        startDate: filters.startDate,
        endDate: filters.endDate,
        currencyCode,
      })}
      emptyMessage="No campaign data is available yet."
    />
  );
}
