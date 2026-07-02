/*
File description:
This client component owns the Campaigns table controls and rows. It receives the campaigns, regions, and
Klaviyo metadata already loaded by the server, then performs search and campaign filters in memory so
typing in the search box or changing filters does not trigger another database-backed page request. It also
recalculates the top campaign metrics from the filtered rows so summary cards match the table results.
*/

"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquareText,
  MoreVertical,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";

import { DateRangePicker, type DateRangeSelection } from "@/components/date-range-picker";
import {
  buildTrendLabel,
  compareKlaviyoPerformanceByDate,
  formatDateOnlyLabel,
  formatPerformanceCurrency,
  formatPerformancePercent,
  getPerformanceRating,
  summarizeKlaviyoPerformanceRows,
  type KlaviyoPerformanceMetricKey,
  type PerformanceRating,
} from "@/lib/marketing-performance";
import { formatNumber } from "@/lib/format";
import type {
  KlaviyoCampaignMetadata,
  KlaviyoCampaignMessage,
  KlaviyoFilterOption,
  RankedCampaign,
  RegionRow,
} from "@/lib/types";

type CampaignMessageType = "text" | "email" | "ab";

type DynamicOptionInput = string | KlaviyoFilterOption;
type CampaignSortKey =
  | "campaign"
  | "region"
  | "messageType"
  | "status"
  | "sendDate"
  | "openRate"
  | "clickRate"
  | "revenue";
type SortDirection = "asc" | "desc";

type CampaignSortState = {
  key: CampaignSortKey;
  direction: SortDirection;
};

type CampaignMetricCard = {
  value: string;
  label: string;
  rating: PerformanceRating;
  trend: {
    label: string;
    tone: "up" | "down";
  } | null;
};

export type CampaignTableFilters = {
  query: string;
  region: string;
  status: string;
  channel: string;
  audience: string;
  tag: string;
  archived: string;
};

type EnrichedCampaignRow = {
  row: RankedCampaign;
  metadata: KlaviyoCampaignMetadata | undefined;
  messages: KlaviyoCampaignMessage[];
  displayName: string;
  status: string;
  channels: string[];
  audienceIds: string[];
  tagIds: string[];
  audienceOptions: KlaviyoFilterOption[];
  tagOptions: KlaviyoFilterOption[];
  regionSlug: string;
  messageType: CampaignMessageType;
  searchText: string;
};

const defaultSortState: CampaignSortState = {
  key: "sendDate",
  direction: "desc",
};

function buildKlaviyoMetadataKey(regionId: string, campaignId: string) {
  return `${regionId}:${campaignId}`;
}

function normalizeOptionValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 120);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function normalizeDynamicOptionInput(option: DynamicOptionInput) {
  if (typeof option === "string") {
    return {
      value: option,
      label: option,
    };
  }

  return option;
}

function buildDynamicOptions(values: DynamicOptionInput[], allLabel: string) {
  const optionsByValue = new Map<string, { value: string; label: string }>();

  values.forEach((option) => {
    const normalizedOption = normalizeDynamicOptionInput(option);
    const label = normalizedOption.label.trim();
    const value = normalizeOptionValue(normalizedOption.value);

    if (label && value && !optionsByValue.has(value)) {
      optionsByValue.set(value, { value, label });
    }
  });

  return [
    { value: "all", label: allLabel },
    ...Array.from(optionsByValue.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "en", { sensitivity: "base" }),
    ),
  ];
}

function optionMatches(selectedValue: string, values: string[]) {
  return selectedValue === "all" || values.some((value) => normalizeOptionValue(value) === selectedValue);
}

function formatStatusLabel(value: string | null | undefined, fallback: string) {
  const normalized = (value || fallback).replace(/[_-]+/g, " ").trim();

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function getCampaignStatusLabel(metadata: KlaviyoCampaignMetadata | undefined) {
  if (metadata?.archived) {
    return "Archived";
  }

  return formatStatusLabel(metadata?.status, "Sent");
}

function getCampaignChannels(metadata: KlaviyoCampaignMetadata | undefined, messages: KlaviyoCampaignMessage[]) {
  return uniqueStrings([
    metadata?.channel,
    ...(metadata?.channel_list || []),
    ...messages.map((message) => message.channel),
  ]);
}

function getCampaignTagIds(metadata: KlaviyoCampaignMetadata | undefined) {
  return uniqueStrings(metadata?.tag_ids || []);
}

function getCampaignAudienceIds(metadata: KlaviyoCampaignMetadata | undefined) {
  return uniqueStrings(metadata?.audience_ids || []);
}

function getCampaignTagFilterOptions(metadata: KlaviyoCampaignMetadata | undefined) {
  if (metadata?.tag_filter_options?.length) {
    return metadata.tag_filter_options;
  }

  return getCampaignTagIds(metadata).map((tagId) => ({ value: tagId, label: tagId }));
}

function getCampaignAudienceFilterOptions(metadata: KlaviyoCampaignMetadata | undefined) {
  if (metadata?.audience_filter_options?.length) {
    return metadata.audience_filter_options;
  }

  return getCampaignAudienceIds(metadata).map((audienceId) => ({ value: audienceId, label: audienceId }));
}

function inferCampaignMessageType({
  row,
  metadata,
  messages,
}: {
  row: RankedCampaign;
  metadata: KlaviyoCampaignMetadata | undefined;
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

function getCampaignSendDate(row: RankedCampaign, metadata: KlaviyoCampaignMetadata | undefined) {
  return formatTimestampParts(metadata?.send_at || metadata?.scheduled_at) || {
    date: formatDateOnlyLabel(row.send_date),
    detail: null,
  };
}

function formatRecipientLabel(value: number) {
  return `${formatNumber(value)} recipient${value === 1 ? "" : "s"}`;
}

function formatRateForRow(value: number, denominator: number) {
  if (!denominator) {
    return "n/a";
  }

  return formatPerformancePercent(value);
}

function getRateDenominator(row: RankedCampaign) {
  return row.delivered_count || row.recipients_count;
}

function getOpenRecipientCount(row: RankedCampaign) {
  return row.opens_unique_count || row.opens_count;
}

function getClickRecipientCount(row: RankedCampaign) {
  return row.clicks_unique_count || row.clicks_count;
}

function getConversionRecipientCount(row: RankedCampaign) {
  return row.conversions_unique_count || row.conversions_count;
}

function getMetricCurrencyCode(rows: RankedCampaign[]) {
  return rows[0]?.currency_code || "USD";
}

function buildMetricTrend({
  rows,
  dateSelection,
  metric,
  formatter,
}: {
  rows: RankedCampaign[];
  dateSelection: DateRangeSelection;
  metric: KlaviyoPerformanceMetricKey;
  formatter: (absoluteValue: number) => string;
}): CampaignMetricCard["trend"] {
  const delta = compareKlaviyoPerformanceByDate({
    rows,
    startDate: dateSelection.startDate,
    endDate: dateSelection.endDate,
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
  dateSelection,
}: {
  rows: RankedCampaign[];
  dateSelection: DateRangeSelection;
}): CampaignMetricCard[] {
  const summary = summarizeKlaviyoPerformanceRows(rows);
  const currencyCode = getMetricCurrencyCode(rows);

  // These cards use the same filtered campaign rows as the table, so top metrics stay aligned with visible results.
  return [
    {
      value: formatPerformancePercent(summary.openRate),
      label: "Average open rate",
      rating: getPerformanceRating("openRate", summary.openRate),
      trend: buildMetricTrend({
        rows,
        dateSelection,
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
        dateSelection,
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
        dateSelection,
        metric: "revenuePerRecipient",
        formatter: (value) => formatPerformanceCurrency(value, currencyCode),
      }),
    },
  ];
}

function buildMetadataMap(metadata: KlaviyoCampaignMetadata[]) {
  return new Map(metadata.map((item) => [buildKlaviyoMetadataKey(item.region_id, item.campaign_id), item]));
}

function buildMessagesMap(messages: KlaviyoCampaignMessage[]) {
  const messagesByKey = new Map<string, KlaviyoCampaignMessage[]>();

  messages.forEach((message) => {
    const key = buildKlaviyoMetadataKey(message.region_id, message.campaign_id);
    const existingMessages = messagesByKey.get(key) || [];

    existingMessages.push(message);
    messagesByKey.set(key, existingMessages);
  });

  return messagesByKey;
}

function buildSearchText(row: EnrichedCampaignRow) {
  return [
    row.displayName,
    row.row.campaign_name,
    row.row.region_name,
    row.status,
    row.metadata?.search_text,
    row.channels.join(" "),
    row.audienceIds.join(" "),
    row.tagIds.join(" "),
    row.audienceOptions.map((option) => `${option.value} ${option.label}`).join(" "),
    row.tagOptions.map((option) => `${option.value} ${option.label}`).join(" "),
    row.messages.map((message) => `${message.name} ${message.subject || ""} ${message.search_text}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildEnrichedRows({
  rows,
  metadata,
  messages,
  regions,
}: {
  rows: RankedCampaign[];
  metadata: KlaviyoCampaignMetadata[];
  messages: KlaviyoCampaignMessage[];
  regions: RegionRow[];
}) {
  const metadataByKey = buildMetadataMap(metadata);
  const messagesByKey = buildMessagesMap(messages);
  const regionSlugById = new Map(regions.map((region) => [region.id, region.slug]));

  return rows
    .map((row) => {
      const key = buildKlaviyoMetadataKey(row.region_id, row.campaign_id);
      const rowMetadata = metadataByKey.get(key);
      const rowMessages = messagesByKey.get(key) || [];
      const channels = getCampaignChannels(rowMetadata, rowMessages);
      const audienceOptions = getCampaignAudienceFilterOptions(rowMetadata);
      const tagOptions = getCampaignTagFilterOptions(rowMetadata);
      const messageType = inferCampaignMessageType({ row, metadata: rowMetadata, messages: rowMessages });
      const enrichedRow: EnrichedCampaignRow = {
        row,
        metadata: rowMetadata,
        messages: rowMessages,
        displayName: rowMetadata?.name || row.campaign_name,
        status: getCampaignStatusLabel(rowMetadata),
        channels,
        audienceIds: getCampaignAudienceIds(rowMetadata),
        tagIds: getCampaignTagIds(rowMetadata),
        audienceOptions,
        tagOptions,
        regionSlug: regionSlugById.get(row.region_id) || "all",
        messageType,
        searchText: "",
      };

      return {
        ...enrichedRow,
        searchText: buildSearchText(enrichedRow),
      };
    })
    .sort((left, right) =>
      right.row.send_date.localeCompare(left.row.send_date) ||
      right.row.revenue_amount - left.row.revenue_amount ||
      left.displayName.localeCompare(right.displayName, "en", { sensitivity: "base" }),
    );
}

function buildFilterOptions(enrichedRows: EnrichedCampaignRow[], regions: RegionRow[]) {
  const statuses: string[] = [];
  const channels: string[] = [];
  const audiences: DynamicOptionInput[] = [];
  const tags: DynamicOptionInput[] = [];

  enrichedRows.forEach((row) => {
    statuses.push(row.status);
    channels.push(...row.channels);
    audiences.push(...row.audienceOptions);
    tags.push(...row.tagOptions);
  });

  return {
    regionOptions: [
      { value: "all", label: "Region: All" },
      ...regions.map((region) => ({ value: region.slug, label: `Region: ${region.name}` })),
    ],
    statusOptions: buildDynamicOptions(statuses, "Status: All"),
    channelOptions: buildDynamicOptions(channels, "Channels: All"),
    audienceOptions: buildDynamicOptions(audiences, "Audience: All"),
    tagOptions: buildDynamicOptions(tags, "Tags: All"),
  };
}

function filterCampaignRows(rows: EnrichedCampaignRow[], filters: CampaignTableFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (normalizedQuery && !row.searchText.includes(normalizedQuery)) {
      return false;
    }

    if (filters.region !== "all" && row.regionSlug !== filters.region) {
      return false;
    }

    if (!optionMatches(filters.status, [row.status])) {
      return false;
    }

    if (!optionMatches(filters.channel, row.channels)) {
      return false;
    }

    if (!optionMatches(filters.audience, row.audienceIds)) {
      return false;
    }

    if (!optionMatches(filters.tag, row.tagIds)) {
      return false;
    }

    if (filters.archived === "archived" && row.metadata?.archived !== true) {
      return false;
    }

    if (filters.archived === "active" && row.metadata?.archived === true) {
      return false;
    }

    return true;
  });
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function getSortNumber(row: EnrichedCampaignRow, key: CampaignSortKey) {
  if (key === "openRate") {
    return row.row.openRate;
  }

  if (key === "clickRate") {
    return row.row.clickRate;
  }

  if (key === "revenue") {
    return row.row.revenue_amount;
  }

  return 0;
}

function compareCampaignRows(left: EnrichedCampaignRow, right: EnrichedCampaignRow, sortState: CampaignSortState) {
  const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
  let result = 0;

  if (sortState.key === "campaign") {
    result = compareText(left.displayName, right.displayName);
  } else if (sortState.key === "region") {
    result = compareText(left.row.region_name, right.row.region_name);
  } else if (sortState.key === "messageType") {
    result = compareText(left.messageType, right.messageType);
  } else if (sortState.key === "status") {
    result = compareText(left.status, right.status);
  } else if (sortState.key === "sendDate") {
    result = left.row.send_date.localeCompare(right.row.send_date);
  } else {
    result = getSortNumber(left, sortState.key) - getSortNumber(right, sortState.key);
  }

  // Stable fallbacks keep equal values predictable instead of jumping around between renders.
  return (
    result * directionMultiplier ||
    right.row.send_date.localeCompare(left.row.send_date) ||
    right.row.revenue_amount - left.row.revenue_amount ||
    compareText(left.displayName, right.displayName)
  );
}

function sortCampaignRows(rows: EnrichedCampaignRow[], sortState: CampaignSortState) {
  return [...rows].sort((left, right) => compareCampaignRows(left, right, sortState));
}

function getInitialSortDirection(sortKey: CampaignSortKey): SortDirection {
  return ["sendDate", "openRate", "clickRate", "revenue"].includes(sortKey) ? "desc" : "asc";
}

function hasActiveCampaignFilters(filters: CampaignTableFilters) {
  return Boolean(
    filters.query.trim() ||
    filters.region !== "all" ||
    filters.status !== "all" ||
    filters.channel !== "all" ||
    filters.audience !== "all" ||
    filters.tag !== "all" ||
    filters.archived !== "all",
  );
}

function FilterSelect({
  value,
  options,
  ariaLabel,
  wide = false,
  dotted = false,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  wide?: boolean;
  dotted?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <span className={clsx("relative inline-flex", wide ? "min-w-[170px]" : "min-w-fit")}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "h-9 w-full appearance-none rounded-[7px] border bg-white pl-3 pr-9 text-sm font-medium text-[#62666d] transition hover:bg-[#fafafa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]",
          dotted ? "border-dashed border-[#d5d9df]" : "border-[#d8dde3]",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#62666d]"
      />
    </span>
  );
}

function getMessageTypeTooltip(type: CampaignMessageType) {
  if (type === "ab") {
    return "A/B test email campaign";
  }

  if (type === "text") {
    return "SMS or text campaign";
  }

  return "Email campaign";
}

function MessageTypeIcon({
  type,
}: {
  type: CampaignMessageType;
}) {
  const tooltip = getMessageTypeTooltip(type);

  if (type === "ab") {
    return (
      <div
        className="group relative inline-flex items-center gap-2 rounded-[7px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]"
        tabIndex={0}
        aria-label={tooltip}
        title={tooltip}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
          <Mail aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-[#eef0f3] px-2 py-1 text-xs font-semibold text-[#4f5359]">A/B</span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-[7px] bg-[#202328] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition group-hover:opacity-100 group-focus:opacity-100"
        >
          {tooltip}
        </span>
      </div>
    );
  }

  const Icon = type === "text" ? MessageSquareText : Mail;

  return (
    <span
      className="group relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]"
      tabIndex={0}
      aria-label={tooltip}
      title={tooltip}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-[7px] bg-[#202328] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition group-hover:opacity-100 group-focus:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}

function SortableHeader({
  label,
  sortKey,
  sortState,
  align = "left",
  className,
  onSort,
}: {
  label: string;
  sortKey: CampaignSortKey;
  sortState: CampaignSortState;
  align?: "left" | "right";
  className?: string;
  onSort: (sortKey: CampaignSortKey) => void;
}) {
  const isActive = sortState.key === sortKey;
  const SortIcon = isActive ? (sortState.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}
      className={clsx("px-2 py-3 font-medium", className)}
    >
      <button
        type="button"
        className={clsx(
          "inline-flex w-full items-center gap-1.5 rounded-[6px] text-sm font-medium text-[#62666d] transition hover:text-[#202328] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]",
          align === "right" ? "justify-end text-right" : "justify-start text-left",
        )}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <SortIcon aria-hidden="true" className={clsx("h-3.5 w-3.5", isActive ? "text-[#1f5bd8]" : "text-[#9aa0a8]")} />
      </button>
    </th>
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

export function CampaignTable({
  rows,
  regions,
  metadata,
  messages,
  initialFilters,
  dateSelection,
  dateRangeLabel,
  currentDate,
}: {
  rows: RankedCampaign[];
  regions: RegionRow[];
  metadata: KlaviyoCampaignMetadata[];
  messages: KlaviyoCampaignMessage[];
  initialFilters: CampaignTableFilters;
  dateSelection: DateRangeSelection;
  dateRangeLabel: string;
  currentDate: string;
}) {
  const [filters, setFilters] = useState<CampaignTableFilters>(initialFilters);
  const [sortState, setSortState] = useState<CampaignSortState>(defaultSortState);
  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = useMemo(
    () => ({ ...filters, query: deferredQuery }),
    [deferredQuery, filters],
  );
  const enrichedRows = useMemo(
    () => buildEnrichedRows({ rows, metadata, messages, regions }),
    [metadata, messages, regions, rows],
  );
  const filterOptions = useMemo(() => buildFilterOptions(enrichedRows, regions), [enrichedRows, regions]);
  const filteredRows = useMemo(
    () => filterCampaignRows(enrichedRows, effectiveFilters),
    [effectiveFilters, enrichedRows],
  );
  const filteredMetricRows = useMemo(() => filteredRows.map(({ row }) => row), [filteredRows]);
  const performanceMetrics = useMemo(
    () => buildCampaignMetrics({ rows: filteredMetricRows, dateSelection }),
    [dateSelection, filteredMetricRows],
  );
  const visibleRows = useMemo(() => sortCampaignRows(filteredRows, sortState), [filteredRows, sortState]);
  const hasActiveFilters = hasActiveCampaignFilters(filters);
  const normalizedDateRangeLabel = dateRangeLabel || "Selected period";

  function updateFilter<Key extends keyof CampaignTableFilters>(key: Key, value: CampaignTableFilters[Key]) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      query: "",
      region: "all",
      audience: "all",
      channel: "all",
      status: "all",
      tag: "all",
      archived: "all",
    });
  }

  function updateSort(nextSortKey: CampaignSortKey) {
    setSortState((currentSortState) => ({
      key: nextSortKey,
      direction:
        currentSortState.key === nextSortKey
          ? currentSortState.direction === "desc"
            ? "asc"
            : "desc"
          : getInitialSortDirection(nextSortKey),
    }));
  }

  return (
    <>
      <section className="px-5 py-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-3">
            <ChevronUp aria-hidden="true" className="h-5 w-5 text-[#24272c]" />
            <h2 className="text-base font-semibold text-[#32363c]">
              Email performance {normalizedDateRangeLabel.toLowerCase()}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[#d7dbe0] bg-white px-4 text-sm font-semibold text-[#24272c] shadow-[0_1px_1px_rgba(16,24,40,0.04)] transition hover:bg-[#f8f9fb]"
          >
            View benchmarks
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {performanceMetrics.map((metric) => (
            <article key={metric.label} className="min-h-[126px]">
              <div className="flex items-center gap-3">
                <p className="text-[36px] font-semibold leading-none tracking-normal text-[#202328]">
                  {metric.value}
                </p>
                {metric.trend ? <TrendPill tone={metric.trend.tone}>{metric.trend.label}</TrendPill> : null}
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
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <label className="relative block h-9 w-full max-w-[250px] sm:w-[250px]">
              <span className="sr-only">Search campaigns</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777c84]"
              />
              <input
                type="search"
                placeholder="Search campaigns"
                value={filters.query}
                autoComplete="off"
                onChange={(event) => updateFilter("query", event.target.value.slice(0, 80))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }
                }}
                className="h-9 w-full rounded-[7px] border border-[#d8dde3] bg-white pl-10 pr-3 text-sm text-[#2e3136] placeholder:text-[#80858d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]"
              />
            </label>

            <div>
              <p className="mb-1 text-sm font-medium text-[#62666d]">Date range</p>
              <DateRangePicker value={dateSelection} currentDate={currentDate} />
            </div>

            <FilterSelect
              ariaLabel="Filter by region"
              value={filters.region}
              options={filterOptions.regionOptions}
              onChange={(value) => updateFilter("region", value)}
              dotted
              wide
            />
            <FilterSelect
              ariaLabel="Filter by audience"
              value={filters.audience}
              options={filterOptions.audienceOptions}
              onChange={(value) => updateFilter("audience", value)}
              dotted
              wide
            />
            <FilterSelect
              ariaLabel="Filter by channel"
              value={filters.channel}
              options={filterOptions.channelOptions}
              onChange={(value) => updateFilter("channel", value)}
              dotted
            />
            <FilterSelect
              ariaLabel="Filter by status"
              value={filters.status}
              options={filterOptions.statusOptions}
              onChange={(value) => updateFilter("status", value)}
              dotted
            />
            <FilterSelect
              ariaLabel="Filter by tags"
              value={filters.tag}
              options={filterOptions.tagOptions}
              onChange={(value) => updateFilter("tag", value)}
              dotted
              wide
            />
            <FilterSelect
              ariaLabel="Filter archived campaigns"
              value={filters.archived}
              options={[
                { value: "all", label: "Archived: All" },
                { value: "active", label: "Active only" },
                { value: "archived", label: "Archived only" },
              ]}
              onChange={(value) => updateFilter("archived", value)}
              dotted
            />
          </div>

        <div className="flex items-center gap-2 self-start xl:self-end">
          <p className="whitespace-nowrap text-sm font-medium text-[#666b72]" aria-live="polite">
            {visibleRows.length} of {rows.length}
          </p>
          <button
            type="button"
            aria-label={hasActiveFilters ? "Reset campaign table filters" : "Campaign table filters"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] text-[#2e3136] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#a4a9b1]"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#ebedf0] text-sm font-medium text-[#62666d]">
              <SortableHeader label="Campaign" sortKey="campaign" sortState={sortState} onSort={updateSort} />
              <SortableHeader
                label="Region"
                sortKey="region"
                sortState={sortState}
                className="w-[140px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Message Type"
                sortKey="messageType"
                sortState={sortState}
                className="w-[170px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                sortState={sortState}
                className="w-[130px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Send Date"
                sortKey="sendDate"
                sortState={sortState}
                className="w-[190px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Open Rate"
                sortKey="openRate"
                sortState={sortState}
                align="right"
                className="w-[150px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Click Rate"
                sortKey="clickRate"
                sortState={sortState}
                align="right"
                className="w-[150px]"
                onSort={updateSort}
              />
              <SortableHeader
                label="Placed Order Rev"
                sortKey="revenue"
                sortState={sortState}
                align="right"
                className="w-[170px]"
                onSort={updateSort}
              />
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, metadata: rowMetadata, displayName, status, messageType }) => {
              const sendDate = getCampaignSendDate(row, rowMetadata);
              const rateDenominator = getRateDenominator(row);
              const openRate = formatRateForRow(row.openRate, rateDenominator);
              const clickRate = formatRateForRow(row.clickRate, rateDenominator);
              const placedOrderRevenue = formatPerformanceCurrency(row.revenue_amount, row.currency_code);

              return (
                <tr key={row.id} className="border-b border-[#eff1f4] text-sm text-[#4f5359]">
                  <td className="max-w-[360px] px-2 py-3 align-middle">
                    <button
                      type="button"
                      className="text-left font-medium text-[#2d6cff] hover:underline"
                    >
                      {displayName}
                    </button>
                  </td>
                  <td className="px-2 py-3 align-middle font-medium text-[#34383e]">
                    {row.region_name}
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <MessageTypeIcon type={messageType} />
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <StatusPill status={status} />
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
                    <p className="mt-1 text-sm text-[#666b72]">{formatRecipientLabel(getOpenRecipientCount(row))}</p>
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
                      {formatRecipientLabel(getClickRecipientCount(row))}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right align-middle">
                    <p className="font-medium text-[#2d6cff]">{placedOrderRevenue}</p>
                    <p className="mt-1 text-sm text-[#666b72]">
                      {formatRecipientLabel(getConversionRecipientCount(row))}
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
            {!visibleRows.length ? (
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
    </>
  );
}
