/*
File description:
This Campaigns page renders the rebuilt Klaviyo-style campaign workspace with real synced campaign report
data. It keeps the visual layout close to Klaviyo while loading summary metrics, date filters, search
state, and campaign rows through the server-side dashboard data pipeline.
*/

import { clsx } from "clsx";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  List,
  Mail,
  MessageSquareText,
  MoreVertical,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  buildKlaviyoMetadataKey,
  getCampaignMessagesByReportRows,
  getCampaignMetadataByReportRows,
} from "@/lib/data/klaviyo-metadata";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import {
  buildTrendLabel,
  compareKlaviyoPerformanceByDate,
  formatDateOnlyLabel,
  formatPerformanceCurrency,
  formatPerformancePercent,
  getPerformanceRating,
  getPresetLabel,
  summarizeKlaviyoPerformanceRows,
  type KlaviyoPerformanceMetricKey,
  type PerformanceRating,
} from "@/lib/marketing-performance";
import {
  filterAndSortKlaviyoSimpleRows,
  getTableControlFieldNames,
  klaviyoSimpleTableFilterOptions,
  klaviyoSimpleTableSortOptions,
  parseScopedTableState,
} from "@/lib/report-table-controls";
import type { DashboardFilters, KlaviyoCampaign, KlaviyoCampaignMessage, RankedCampaign } from "@/lib/types";

const filterLabels = ["Audience", "Channels", "Status", "Tags", "A/B test", "Archived"] as const;

type CampaignPageProps = {
  searchParams: Promise<RawSearchParams>;
};

type CampaignMessageType = "text" | "email" | "ab";

type CampaignMetricCard = {
  value: string;
  label: string;
  rating: PerformanceRating;
  trend: {
    label: string;
    tone: "up" | "down";
  } | null;
};

function buildDashboardHiddenFields(filters: DashboardFilters) {
  const fields = [
    { name: "preset", value: filters.preset },
    { name: "region", value: filters.regionSlug },
  ];

  if (filters.preset === "custom") {
    fields.push(
      { name: "start", value: filters.startDate },
      { name: "end", value: filters.endDate },
    );
  }

  return fields;
}

function getDateRangeLabel(filters: DashboardFilters) {
  if (filters.preset === "custom") {
    return `${formatDateOnlyLabel(filters.startDate)} - ${formatDateOnlyLabel(filters.endDate)}`;
  }

  const label = getPresetLabel(filters.preset);

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function getMetricCurrencyCode(rows: RankedCampaign[]) {
  return rows[0]?.currency_code || "USD";
}

function buildMetricTrend({
  rows,
  filters,
  metric,
  formatter,
}: {
  rows: RankedCampaign[];
  filters: DashboardFilters;
  metric: KlaviyoPerformanceMetricKey;
  formatter: (absoluteValue: number) => string;
}): CampaignMetricCard["trend"] {
  const delta = compareKlaviyoPerformanceByDate({
    rows,
    startDate: filters.startDate,
    endDate: filters.endDate,
    metric,
  });

  if (delta === null) {
    return null;
  }

  const trend = buildTrendLabel({ delta, formatter });

  if (trend.direction === "flat") {
    return null;
  }

  return {
    label: trend.label,
    tone: trend.direction,
  };
}

function buildCampaignMetrics({
  rows,
  filters,
}: {
  rows: RankedCampaign[];
  filters: DashboardFilters;
}): CampaignMetricCard[] {
  const summary = summarizeKlaviyoPerformanceRows(rows);
  const currencyCode = getMetricCurrencyCode(rows);

  // These cards are calculated from the same synced rows as the table so the summary never drifts.
  return [
    {
      value: formatPerformancePercent(summary.openRate),
      label: "Average open rate",
      rating: getPerformanceRating("openRate", summary.openRate),
      trend: buildMetricTrend({
        rows,
        filters,
        metric: "openRate",
        formatter: formatPerformancePercent,
      }),
    },
    {
      value: formatPerformancePercent(summary.clickRate),
      label: "Average click rate",
      rating: getPerformanceRating("clickRate", summary.clickRate),
      trend: buildMetricTrend({
        rows,
        filters,
        metric: "clickRate",
        formatter: formatPerformancePercent,
      }),
    },
    {
      value: formatPerformancePercent(summary.conversionRate),
      label: "Placed Order",
      rating: getPerformanceRating("conversionRate", summary.conversionRate),
      trend: null,
    },
    {
      value: formatPerformanceCurrency(summary.revenuePerRecipient, currencyCode),
      label: "Revenue per recipient",
      rating: getPerformanceRating("revenuePerRecipient", summary.revenuePerRecipient),
      trend: buildMetricTrend({
        rows,
        filters,
        metric: "revenuePerRecipient",
        formatter: (value) => formatPerformanceCurrency(value, currencyCode),
      }),
    },
  ];
}

function inferCampaignMessageType({
  row,
  metadata,
  messages,
}: {
  row: RankedCampaign;
  metadata: KlaviyoCampaign | undefined;
  messages: KlaviyoCampaignMessage[];
}): CampaignMessageType {
  const name = row.campaign_name.toLowerCase();
  const messageChannel = messages.find((message) => message.channel)?.channel?.toLowerCase() || "";
  const channel = messageChannel || metadata?.channel?.toLowerCase() || "";

  if (messages.length > 1 || name.includes("a/b") || name.includes("ab test") || name.includes("split")) {
    return "ab";
  }

  if (channel.includes("sms") || channel.includes("text")) {
    return "text";
  }

  if (channel.includes("email")) {
    return "email";
  }

  // Klaviyo's reporting table does not expose message type, so infer only from synced campaign names.
  if (name.includes("sms") || name.includes("text")) {
    return "text";
  }

  return "email";
}

function formatStatusLabel(value: string | null | undefined, fallback: string) {
  const normalized = (value || fallback).replace(/[_-]+/g, " ").trim();

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function getCampaignStatusLabel(metadata: KlaviyoCampaign | undefined) {
  if (metadata?.archived) {
    return "Archived";
  }

  return formatStatusLabel(metadata?.status, "Sent");
}

function formatTimestampParts(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    detail: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function getCampaignSendDate(row: RankedCampaign, metadata: KlaviyoCampaign | undefined) {
  return formatTimestampParts(metadata?.send_at || metadata?.scheduled_at) || {
    date: formatDateOnlyLabel(row.send_date),
    detail: null,
  };
}

function formatRecipientLabel(value: number) {
  return `${formatNumber(value)} recipient${value === 1 ? "" : "s"}`;
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function formatRateForRow(value: number, denominator: number) {
  if (!denominator) {
    return "n/a";
  }

  return formatPerformancePercent(value);
}

function ToolbarButton({
  children,
  variant = "light",
}: {
  children: ReactNode;
  variant?: "light" | "dark" | "pressed";
}) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border px-4 text-sm font-semibold transition",
        variant === "dark"
          ? "border-[#1f1f23] bg-[#1f1f23] text-white shadow-[0_1px_1px_rgba(0,0,0,0.14)] hover:bg-black"
          : "border-[#d7dbe0] bg-white text-[#24272c] shadow-[0_1px_1px_rgba(16,24,40,0.04)] hover:bg-[#f8f9fb]",
        variant === "pressed" && "bg-[#f2f3f5]",
      )}
    >
      {children}
    </button>
  );
}

function FilterButton({
  children,
  wide = false,
  dotted = false,
}: {
  children: ReactNode;
  wide?: boolean;
  dotted?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex h-9 items-center justify-between gap-2 rounded-[7px] border bg-white px-3 text-sm font-medium text-[#62666d] transition hover:bg-[#fafafa]",
        dotted ? "border-dashed border-[#d5d9df]" : "border-[#d8dde3]",
        wide ? "min-w-[170px]" : "min-w-fit",
      )}
    >
      {children}
    </button>
  );
}

function RatingPill({
  tone,
  children,
}: {
  tone: "yellow" | "blue";
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-fit items-center rounded-full px-3 text-sm font-medium",
        tone === "yellow" ? "bg-[#fff4bc] text-[#675c18]" : "bg-[#dff0ff] text-[#235f9c]",
      )}
    >
      {children}
    </span>
  );
}

function TrendPill({
  tone,
  children,
}: {
  tone: "up" | "down";
  children: ReactNode;
}) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-sm font-medium",
        tone === "up" ? "bg-[#d9f4df] text-[#2f7d51]" : "bg-[#fde2e1] text-[#bd3a3a]",
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {children}
    </span>
  );
}

function MessageTypeIcon({
  type,
}: {
  type: "text" | "email" | "ab";
}) {
  if (type === "ab") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
          <Mail aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-[#eef0f3] px-2 py-1 text-xs font-semibold text-[#4f5359]">A/B</span>
      </div>
    );
  }

  const Icon = type === "text" ? MessageSquareText : Mail;

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
      <Icon aria-hidden="true" className="h-4 w-4" />
    </span>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();
  const isPositive = ["sent", "live", "active"].includes(normalizedStatus);
  const isScheduled = normalizedStatus.includes("scheduled");

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full px-3 text-sm font-medium",
        isPositive && "bg-[#d8f8e4] text-[#176b3a]",
        isScheduled && "bg-[#fff4bc] text-[#675c18]",
        !isPositive && !isScheduled && "bg-[#eceef0] text-[#575b61]",
      )}
    >
      {status}
    </span>
  );
}

export default async function CampaignsPage({ searchParams }: CampaignPageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);

  // Re-check auth in the page so report reads never race ahead of the protected layout redirect.
  await requireUser();

  const data = await getDashboardData(filters);
  const campaignFieldNames = getTableControlFieldNames("campaign");
  const campaignTableState = parseScopedTableState({
    searchParams: rawSearchParams,
    fieldNames: campaignFieldNames,
    sortOptions: klaviyoSimpleTableSortOptions,
    filterOptions: klaviyoSimpleTableFilterOptions,
    defaultSort: "date_desc",
    defaultFilter: "all",
  });
  const campaignRows = filterAndSortKlaviyoSimpleRows(data.campaignRows, campaignTableState);
  const performanceMetrics = buildCampaignMetrics({ rows: data.campaignRows, filters });
  const [campaignMetadataByKey, campaignMessagesByKey] = await Promise.all([
    getCampaignMetadataByReportRows(data.campaignRows),
    getCampaignMessagesByReportRows(data.campaignRows),
  ]);
  const hiddenDashboardFields = buildDashboardHiddenFields(filters);
  const dateRangeLabel = getDateRangeLabel(filters);

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-3 text-[#26292f] sm:p-5">
      <section className="min-h-[calc(100vh-40px)] overflow-hidden rounded-[14px] border border-[#e2e5e9] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex min-h-14 flex-col gap-3 border-b border-[#eceff3] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-lg font-semibold tracking-normal text-[#24272c]">Campaigns</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="More campaign actions"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#22252a] hover:bg-[#f3f4f6]"
            >
              <MoreVertical aria-hidden="true" className="h-5 w-5" />
            </button>
            <ToolbarButton>View library</ToolbarButton>
            <div className="inline-flex overflow-hidden rounded-[8px] border border-[#d7dbe0] bg-[#eceef1] shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 border-r border-[#d7dbe0] bg-white px-3.5 text-sm font-medium text-[#2e3136]"
              >
                <List aria-hidden="true" className="h-5 w-5" />
                List
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 px-3.5 text-sm font-medium text-[#62666d]"
              >
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Calendar
              </button>
            </div>
            <ToolbarButton variant="dark">Create campaign</ToolbarButton>
          </div>
        </header>

        <section className="px-5 py-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-3">
              <ChevronUp aria-hidden="true" className="h-5 w-5 text-[#24272c]" />
              <h2 className="text-base font-semibold text-[#32363c]">
                Email performance {dateRangeLabel.toLowerCase()}
              </h2>
            </div>
            <ToolbarButton>View benchmarks</ToolbarButton>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {performanceMetrics.map((metric) => (
              <article key={metric.label} className="min-h-[126px]">
                <div className="flex items-center gap-3">
                  <p className="text-[36px] font-semibold leading-none tracking-normal text-[#202328]">
                    {metric.value}
                  </p>
                  {metric.trend ? (
                    <TrendPill tone={metric.trend.tone}>{metric.trend.label}</TrendPill>
                  ) : null}
                </div>
                <p className="mt-2 text-base font-semibold text-[#2e3136]">{metric.label}</p>
                <div className="mt-3">
                  <RatingPill tone={metric.rating.tone === "good" ? "blue" : "yellow"}>
                    {metric.rating.label}
                  </RatingPill>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-5 pb-6">
          <form method="get" className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            {hiddenDashboardFields.map((field) => (
              <input key={field.name} type="hidden" name={field.name} value={field.value} />
            ))}
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <label className="relative block h-9 w-full max-w-[250px] sm:w-[250px]">
                <span className="sr-only">Search campaigns</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777c84]"
                />
                <input
                  name={campaignFieldNames.query}
                  type="search"
                  placeholder="Search campaigns"
                  defaultValue={campaignTableState.query}
                  className="h-9 w-full rounded-[7px] border border-[#d8dde3] bg-white pl-10 pr-3 text-sm text-[#2e3136] placeholder:text-[#80858d]"
                />
                <button type="submit" className="sr-only">
                  Search campaigns
                </button>
              </label>

              <div>
                <p className="mb-1 text-sm font-medium text-[#62666d]">Date range</p>
                <FilterButton>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#62666d]" />
                    {dateRangeLabel}
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                </FilterButton>
              </div>

              {filterLabels.map((label) => (
                <FilterButton key={label} dotted>
                  {label}
                  {label !== "A/B test" && label !== "Archived" ? (
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  ) : null}
                </FilterButton>
              ))}

              <FilterButton wide>
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag aria-hidden="true" className="h-4 w-4 text-[#63a244]" />
                  Placed Order
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </FilterButton>
            </div>

            <button
              type="button"
              aria-label="Table display settings"
              className="inline-flex h-9 w-9 items-center justify-center self-start rounded-[7px] text-[#2e3136] hover:bg-[#f3f4f6] xl:self-end"
            >
              <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebedf0] text-sm font-medium text-[#62666d]">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all campaigns"
                      className="h-5 w-5 rounded border-[#aeb4bc]"
                    />
                  </th>
                  <th className="px-2 py-3 font-medium">Campaign</th>
                  <th className="w-[170px] px-2 py-3 font-medium">Message Type</th>
                  <th className="w-[130px] px-2 py-3 font-medium">Status</th>
                  <th className="w-[190px] px-2 py-3 font-medium">Send Date</th>
                  <th className="w-[150px] px-2 py-3 text-right font-medium">Open Rate</th>
                  <th className="w-[150px] px-2 py-3 text-right font-medium">Click Rate</th>
                  <th className="w-[170px] px-2 py-3 text-right font-medium">Placed Order Rev</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {campaignRows.map((row) => {
                  const metadata = campaignMetadataByKey.get(
                    buildKlaviyoMetadataKey(row.region_id, row.campaign_id),
                  );
                  const messages = campaignMessagesByKey.get(
                    buildKlaviyoMetadataKey(row.region_id, row.campaign_id),
                  ) || [];
                  const displayName = metadata?.name || row.campaign_name;
                  const campaignStatus = getCampaignStatusLabel(metadata);
                  const sendDate = getCampaignSendDate(row, metadata);
                  const messageType = inferCampaignMessageType({ row, metadata, messages });
                  const openRate = formatRateForRow(row.openRate, row.recipients_count);
                  const clickRate = formatRateForRow(row.clickRate, row.recipients_count);
                  const placedOrderRevenue = formatPerformanceCurrency(row.revenue_amount, row.currency_code);

                  return (
                    <tr key={row.id} className="border-b border-[#eff1f4] text-sm text-[#4f5359]">
                      <td className="px-2 py-3 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${displayName}`}
                          className="h-5 w-5 rounded border-[#aeb4bc]"
                        />
                      </td>
                      <td className="max-w-[360px] px-2 py-3 align-middle">
                        <button
                          type="button"
                          className="text-left font-medium text-[#2d6cff] hover:underline"
                        >
                          {displayName}
                        </button>
                        <p className="mt-1 truncate text-sm font-medium text-[#666b72]">{row.region_name}</p>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <MessageTypeIcon type={messageType} />
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <StatusPill status={campaignStatus} />
                      </td>
                      <td className="px-2 py-3 align-middle text-[#34383e]">
                        <p>{sendDate.date}</p>
                        {sendDate.detail ? (
                          <p className="mt-1 text-sm text-[#666b72]">{sendDate.detail}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <p
                          className={
                            openRate.includes("%") ? "font-medium text-[#2d6cff]" : "font-medium text-[#34383e]"
                          }
                        >
                          {openRate}
                        </p>
                        <p className="mt-1 text-sm text-[#666b72]">{formatRecipientLabel(row.recipients_count)}</p>
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <p
                          className={
                            clickRate.includes("%") ? "font-medium text-[#2d6cff]" : "font-medium text-[#34383e]"
                          }
                        >
                          {clickRate}
                        </p>
                        <p className="mt-1 text-sm text-[#666b72]">
                          {formatCountLabel(row.clicks_count, "click", "clicks")}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <p className="font-medium text-[#2d6cff]">{placedOrderRevenue}</p>
                        <p className="mt-1 text-sm text-[#666b72]">
                          {formatRecipientLabel(row.conversions_count)}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <button
                          type="button"
                          aria-label={`More actions for ${displayName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#1f2328] hover:bg-[#f3f4f6]"
                        >
                          <MoreVertical aria-hidden="true" className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!campaignRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-16 text-center text-sm font-medium text-[#666b72]">
                      No campaign data is available for the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
