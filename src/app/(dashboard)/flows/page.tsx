/*
File description:
This Flows page renders the rebuilt Klaviyo-style automation workspace with real synced flow report data.
It keeps the compact Klaviyo-inspired controls and table composition while loading rows through the
server-side dashboard data pipeline.
*/

import { clsx } from "clsx";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  LineChart,
  List,
  Mail,
  MessageSquareText,
  MoreVertical,
  PlayCircle,
  Search,
  ShoppingBag,
} from "lucide-react";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  buildKlaviyoMetadataKey,
  getFlowMessagesByReportRows,
  getFlowMetadataByReportRows,
} from "@/lib/data/klaviyo-metadata";
import { parseDashboardFilters, type RawSearchParams } from "@/lib/filters";
import {
  formatDateOnlyLabel,
  formatPerformanceCurrency,
  getPresetLabel,
} from "@/lib/marketing-performance";
import {
  filterAndSortKlaviyoSimpleRows,
  getTableControlFieldNames,
  klaviyoSimpleTableFilterOptions,
  klaviyoSimpleTableSortOptions,
  parseScopedTableState,
} from "@/lib/report-table-controls";
import type { DashboardFilters, KlaviyoFlow, KlaviyoFlowMessage, RankedFlow } from "@/lib/types";

type FlowsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

type FlowMessageType = "email" | "message" | "multi" | "none";

function getFlowDashboardFilters(searchParams: RawSearchParams) {
  if (searchParams.preset) {
    return parseDashboardFilters(searchParams);
  }

  // Flows use a shorter default metric window to match the Klaviyo-style workspace requested here.
  return parseDashboardFilters({ ...searchParams, preset: "last7" });
}

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

function inferFlowMessageType({
  row,
  messages,
}: {
  row: RankedFlow;
  messages: KlaviyoFlowMessage[];
}): FlowMessageType {
  const name = row.flow_name.toLowerCase();
  const channels = Array.from(new Set(messages.flatMap((message) => (message.channel ? [message.channel] : []))));
  const firstChannel = channels[0]?.toLowerCase() || "";

  if (channels.length > 1) {
    return "multi";
  }

  if (firstChannel.includes("sms") || firstChannel.includes("text") || firstChannel.includes("push")) {
    return "message";
  }

  if (firstChannel.includes("email")) {
    return "email";
  }

  // Flow report rows do not expose channel metadata, so only infer obvious message variants from names.
  if (name.includes("sms") || name.includes("text")) {
    return "message";
  }

  if (name.includes("+") || name.includes("sms") || name.includes("multi")) {
    return "multi";
  }

  return "email";
}

function formatLabel(value: string | null | undefined, fallback: string) {
  const normalized = (value || fallback).replace(/[_-]+/g, " ").trim();

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function getFlowStatusLabel(metadata: KlaviyoFlow | undefined) {
  if (metadata?.archived) {
    return "Archived";
  }

  return formatLabel(metadata?.status, "Live");
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

function getFlowUpdatedAt(row: RankedFlow, metadata: KlaviyoFlow | undefined) {
  return formatTimestampParts(metadata?.klaviyo_updated_at) || {
    date: formatDateOnlyLabel(row.metric_date),
    detail: null,
  };
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
        wide ? "min-w-[180px]" : "min-w-fit",
      )}
    >
      {children}
    </button>
  );
}

function TypeIcon({
  type,
}: {
  type: FlowMessageType;
}) {
  if (type === "none") {
    return <span className="text-base font-medium text-[#4f5359]">-</span>;
  }

  const PrimaryIcon = type === "message" ? MessageSquareText : Mail;

  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
        <PrimaryIcon aria-hidden="true" className="h-4 w-4" />
      </span>
      {type === "multi" ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
          <MessageSquareText aria-hidden="true" className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();
  const live = ["live", "active"].includes(normalizedStatus);
  const scheduled = normalizedStatus.includes("scheduled");

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium",
        live && "bg-[#d8f8e4] text-[#176b3a]",
        scheduled && "bg-[#fff4bc] text-[#675c18]",
        !live && !scheduled && "bg-[#eceef0] text-[#575b61]",
      )}
    >
      <PlayCircle
        aria-hidden="true"
        className={clsx(
          "h-4 w-4",
          live ? "fill-[#2ea461] text-[#2ea461]" : "fill-[#6b7078] text-[#6b7078]",
        )}
      />
      {status}
    </span>
  );
}

export default async function FlowsPage({ searchParams }: FlowsPageProps) {
  const rawSearchParams = await searchParams;
  const filters = getFlowDashboardFilters(rawSearchParams);

  // Re-check auth in the page so report reads never race ahead of the protected layout redirect.
  await requireUser();

  const data = await getDashboardData(filters);
  const flowFieldNames = getTableControlFieldNames("flow");
  const flowTableState = parseScopedTableState({
    searchParams: rawSearchParams,
    fieldNames: flowFieldNames,
    sortOptions: klaviyoSimpleTableSortOptions,
    filterOptions: klaviyoSimpleTableFilterOptions,
    defaultSort: "date_desc",
    defaultFilter: "all",
  });
  const flowRows = filterAndSortKlaviyoSimpleRows(data.flowRows, flowTableState);
  const [flowMetadataByKey, flowMessagesByKey] = await Promise.all([
    getFlowMetadataByReportRows(data.flowRows),
    getFlowMessagesByReportRows(data.flowRows),
  ]);
  const hiddenDashboardFields = buildDashboardHiddenFields(filters);
  const dateRangeLabel = getDateRangeLabel(filters);

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-3 text-[#26292f] sm:p-5">
      <section className="min-h-[calc(100vh-40px)] overflow-hidden rounded-[14px] border border-[#e2e5e9] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex min-h-14 flex-col gap-3 border-b border-[#eceff3] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-lg font-semibold tracking-normal text-[#24272c]">Flows</h1>
          <div className="flex flex-wrap items-center gap-2">
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
                <LineChart aria-hidden="true" className="h-4 w-4" />
                Analytics
              </button>
            </div>
            <ToolbarButton>
              Options
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton variant="dark">Create flow</ToolbarButton>
          </div>
        </header>

        <section className="px-5 pb-5 pt-11">
          <form method="get" className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            {hiddenDashboardFields.map((field) => (
              <input key={field.name} type="hidden" name={field.name} value={field.value} />
            ))}
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <label className="relative block h-9 w-full max-w-[250px] sm:w-[250px]">
                <span className="sr-only">Search flows</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777c84]"
                />
                <input
                  name={flowFieldNames.query}
                  type="search"
                  placeholder="Search flows"
                  defaultValue={flowTableState.query}
                  className="h-9 w-full rounded-[7px] border border-[#d8dde3] bg-white pl-10 pr-3 text-sm text-[#2e3136] placeholder:text-[#80858d]"
                />
                <button type="submit" className="sr-only">
                  Search flows
                </button>
              </label>

              <FilterButton dotted>
                Status
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </FilterButton>

              <FilterButton dotted>
                Tags
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </FilterButton>

              <FilterButton dotted>
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle aria-hidden="true" className="h-4 w-4 text-[#62666d]" />
                  Has email sender alerts
                </span>
              </FilterButton>

              <div>
                <p className="mb-1 text-sm font-medium text-[#62666d]">Metric period</p>
                <FilterButton>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#62666d]" />
                    {dateRangeLabel}
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                </FilterButton>
              </div>

              <FilterButton wide>
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag aria-hidden="true" className="h-4 w-4 text-[#63a244]" />
                  Placed Order
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </FilterButton>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebedf0] text-sm font-medium text-[#62666d]">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all flows"
                      className="h-5 w-5 rounded border-[#aeb4bc]"
                    />
                  </th>
                  <th className="px-2 py-3 font-medium">Flow Name</th>
                  <th className="w-[170px] px-2 py-3 font-medium">Type</th>
                  <th className="w-[160px] px-2 py-3 font-medium">Status</th>
                  <th className="w-[230px] px-2 py-3 font-medium">Last Updated</th>
                  <th className="w-[150px] px-2 py-3 text-right font-medium">Revenue</th>
                  <th className="w-[210px] px-2 py-3 text-right font-medium">Revenue per recipient</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {flowRows.map((row) => {
                  const metadata = flowMetadataByKey.get(buildKlaviyoMetadataKey(row.region_id, row.flow_id));
                  const messages = flowMessagesByKey.get(buildKlaviyoMetadataKey(row.region_id, row.flow_id)) || [];
                  const displayName = metadata?.name || row.flow_name;
                  const triggerLabel = metadata?.trigger_type
                    ? formatLabel(metadata.trigger_type, row.region_name)
                    : row.region_name;
                  const statusLabel = getFlowStatusLabel(metadata);
                  const updatedAt = getFlowUpdatedAt(row, metadata);
                  const messageType = inferFlowMessageType({ row, messages });

                  return (
                    <tr key={row.id} className="border-b border-[#eff1f4] text-sm text-[#4f5359]">
                      <td className="px-2 py-3 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${displayName}`}
                          className="h-5 w-5 rounded border-[#aeb4bc]"
                        />
                      </td>
                      <td className="max-w-[420px] px-2 py-3 align-middle">
                        <button
                          type="button"
                          className="text-left font-medium text-[#2d6cff] hover:underline"
                        >
                          {displayName}
                        </button>
                        <p className="mt-1 truncate text-sm font-medium text-[#666b72]">{triggerLabel}</p>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <TypeIcon type={messageType} />
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <StatusPill status={statusLabel} />
                      </td>
                      <td className="px-2 py-3 align-middle text-[#34383e]">
                        <p>{updatedAt.date}</p>
                        {updatedAt.detail ? (
                          <p className="mt-1 text-sm text-[#666b72]">{updatedAt.detail}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-right align-middle font-medium text-[#34383e]">
                        {formatPerformanceCurrency(row.revenue_amount, row.currency_code)}
                      </td>
                      <td className="px-2 py-3 text-right align-middle font-medium text-[#34383e]">
                        {formatPerformanceCurrency(row.revenuePerRecipient, row.currency_code)}
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
                {!flowRows.length ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-16 text-center text-sm font-medium text-[#666b72]">
                      No flow data is available for the selected filters.
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
