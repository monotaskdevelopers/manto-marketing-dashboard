/*
File description:
This Flows page renders a Klaviyo-inspired automation performance workspace for the selected date range
and region. It mirrors the Campaigns page design language while showing flow-level engagement, placed
orders, and revenue from synced Klaviyo flow rows.
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
import type { RankedFlow } from "@/lib/types";

const flowFilterOptions: TableControlOption<KlaviyoSimpleTableFilter>[] = [
  { value: "all", label: "Status" },
  { value: "has_conversions", label: "Has placed order" },
  { value: "low_click_rate", label: "Low click rate" },
  { value: "high_revenue_density", label: "High revenue density" },
];

const flowSortOptions: TableControlOption<KlaviyoSimpleTableSort>[] = [
  { value: "revenue_desc", label: "Placed Order" },
  { value: "open_desc", label: "Open rate" },
  { value: "click_desc", label: "Click rate" },
  { value: "conversion_desc", label: "Conversion rate" },
  { value: "recipients_desc", label: "Recipients" },
  { value: "date_desc", label: "Newest first" },
  { value: "name_asc", label: "Name A to Z" },
];

function buildFlowMetrics({
  rows,
  startDate,
  endDate,
  currencyCode,
}: {
  rows: RankedFlow[];
  startDate: string;
  endDate: string;
  currencyCode: string;
}): MarketingPerformanceMetric[] {
  const summary = summarizeKlaviyoPerformanceRows(rows);

  // Flow trends use the same real-row half-range comparison as Campaigns for visual consistency.
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

function toFlowTableRow(row: RankedFlow): MarketingPerformanceTableRow {
  return {
    id: row.id,
    name: row.flow_name,
    audience: row.region_name,
    messageType: "flow",
    messageLabel: "Automated flow",
    status: "Active",
    statusTone: "success",
    dateLabel: formatDateOnlyLabel(row.metric_date),
    recipientsCount: row.recipients_count,
    opensCount: row.opens_count,
    clicksCount: row.clicks_count,
    conversionsCount: row.conversions_count,
    openRate: row.openRate,
    clickRate: row.clickRate,
    conversionRate: row.conversionRate,
    revenue: row.revenue_amount,
    currencyCode: row.currency_code,
  };
}

export default async function FlowsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);
  const data = await getDashboardData(filters);
  const currencyCode = data.selectedRegions[0]?.currency_code || "USD";
  const tableFieldNames = getTableControlFieldNames("flowRows");
  const tableState = parseScopedTableState({
    searchParams: rawSearchParams,
    fieldNames: tableFieldNames,
    sortOptions: flowSortOptions,
    filterOptions: flowFilterOptions,
    defaultSort: "revenue_desc",
    defaultFilter: "all",
  });
  const rows = filterAndSortKlaviyoSimpleRows(data.flowRows, tableState);

  return (
    <MarketingPerformanceReport
      title="Flows"
      performanceTitle={`Flow performance ${getPresetLabel(filters.preset)}`}
      createLabel="Create flow"
      actionPath="/flows"
      filters={filters}
      regions={data.regions}
      fieldNames={tableFieldNames}
      state={tableState}
      filterOptions={flowFilterOptions}
      sortOptions={flowSortOptions}
      preservedFields={buildPreservedTableFields({
        searchParams: rawSearchParams,
        currentFieldNames: tableFieldNames,
      })}
      searchPlaceholder="Search flows"
      tableNameHeader="Flow"
      dateHeader="Last activity"
      rows={rows.map(toFlowTableRow)}
      totalRows={data.flowRows.length}
      metrics={buildFlowMetrics({
        rows: data.flowRows,
        startDate: filters.startDate,
        endDate: filters.endDate,
        currencyCode,
      })}
      emptyMessage="No flow data is available yet."
    />
  );
}
