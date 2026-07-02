/*
File description:
This reusable report component renders the Klaviyo-inspired Campaigns and Flows pages. It keeps the
reference design language in one place while preserving URL-driven date, region, search, filter, and sort
controls for production-friendly, shareable analytics views.
*/

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  EllipsisVertical,
  List,
  type LucideIcon,
  Mail,
  MessageSquareText,
  Minus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  TrendingDown,
  TrendingUp,
  Workflow,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { formatNumber } from "@/lib/format";
import { formatPerformanceCurrency, formatPerformancePercent } from "@/lib/marketing-performance";
import type { DashboardFilters, RegionRow } from "@/lib/types";
import type {
  PreservedTableField,
  ScopedTableState,
  TableControlFieldNames,
  TableControlOption,
} from "@/lib/report-table-controls";
import type { PerformanceRating, PerformanceTrend } from "@/lib/marketing-performance";

type MessageType = "email" | "sms" | "flow";
type StatusTone = "success" | "neutral";

export type MarketingPerformanceMetric = {
  label: string;
  value: string;
  trend: PerformanceTrend;
  rating: PerformanceRating;
};

export type MarketingPerformanceTableRow = {
  id: string;
  name: string;
  audience: string;
  messageType: MessageType;
  messageLabel: string;
  status: string;
  statusTone: StatusTone;
  dateLabel: string;
  recipientsCount: number;
  opensCount: number;
  clicksCount: number;
  conversionsCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: number;
  currencyCode: string;
  badges?: string[];
};

const datePresetOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const compactControlClassName =
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/[0.03] outline-none transition hover:border-slate-400 hover:bg-slate-50 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-200";

const trendToneClasses = {
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
};

const ratingToneClasses = {
  good: "bg-sky-100 text-sky-800",
  fair: "bg-amber-100 text-amber-800",
};

function ToolbarButton({
  children,
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
        variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        variant === "ghost" && "px-2 text-slate-700 hover:bg-slate-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function CompactSelect({
  children,
  className,
  icon: Icon,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: LucideIcon;
}) {
  return (
    <span className={clsx("relative block", className)}>
      <select
        className={clsx(
          compactControlClassName,
          "w-full appearance-none pr-9",
          Icon ? "pl-10" : "pl-3",
        )}
        {...props}
      >
        {children}
      </select>
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        />
      ) : null}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
    </span>
  );
}

function StaticFilterButton({
  children,
  hasChevron = true,
}: {
  children: ReactNode;
  hasChevron?: boolean;
}) {
  return (
    <button
      type="button"
      aria-disabled="true"
      className={clsx(compactControlClassName, "inline-flex items-center justify-center gap-2 border-dashed")}
    >
      {children}
      {hasChevron ? <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-500" /> : null}
    </button>
  );
}

function PerformanceMetricBlock({ metric }: { metric: MarketingPerformanceMetric }) {
  const TrendIcon =
    metric.trend.direction === "down" ? TrendingDown : metric.trend.direction === "up" ? TrendingUp : Minus;

  return (
    <article className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <p className="break-words text-4xl font-semibold leading-none tracking-normal text-slate-950">
          {metric.value}
        </p>
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
            trendToneClasses[metric.trend.tone],
          )}
        >
          <TrendIcon aria-hidden="true" className="h-4 w-4" />
          {metric.trend.label}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold leading-tight text-slate-800">{metric.label}</p>
      <span
        className={clsx(
          "mt-3 inline-flex rounded-full px-2.5 py-1 text-sm font-medium",
          ratingToneClasses[metric.rating.tone],
        )}
      >
        {metric.rating.label}
      </span>
    </article>
  );
}

function FeedbackBanner() {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-100/70 px-4 py-3 text-emerald-950">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 fill-emerald-600 text-white" />
        <p className="min-w-0 text-sm font-semibold">
          Your total revenue increased! How would you rate your experience?
        </p>
        <div className="flex items-center gap-1 text-slate-700" aria-label="Rate experience from 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} aria-hidden="true" className="h-5 w-5" />
          ))}
        </div>
      </div>
      <button type="button" className="rounded-md p-1 text-emerald-700 transition hover:bg-emerald-200">
        <span className="sr-only">Dismiss feedback prompt</span>
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}

function MessageTypeIcon({ type, label }: { type: MessageType; label: string }) {
  const Icon = type === "sms" ? MessageSquareText : type === "flow" ? Workflow : Mail;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function RateCell({
  rate,
  count,
  countLabel,
}: {
  rate: number;
  count: number;
  countLabel: string;
}) {
  return (
    <div className="text-right tabular-nums">
      <p className="font-medium text-blue-600">{formatPerformancePercent(rate)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {formatNumber(count)} {countLabel}
      </p>
    </div>
  );
}

function RevenueCell({ row }: { row: MarketingPerformanceTableRow }) {
  return (
    <div className="text-right tabular-nums">
      <p className="font-medium text-blue-600">{formatPerformanceCurrency(row.revenue, row.currencyCode)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {formatNumber(row.conversionsCount)} {row.conversionsCount === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

export function MarketingPerformanceReport<TSort extends string, TFilter extends string>({
  title,
  performanceTitle,
  createLabel,
  actionPath,
  filters,
  regions,
  fieldNames,
  state,
  filterOptions,
  sortOptions,
  preservedFields,
  searchPlaceholder,
  tableNameHeader,
  dateHeader,
  rows,
  totalRows,
  metrics,
  emptyMessage,
}: {
  title: string;
  performanceTitle: string;
  createLabel: string;
  actionPath: string;
  filters: DashboardFilters;
  regions: RegionRow[];
  fieldNames: TableControlFieldNames;
  state: ScopedTableState<TSort, TFilter>;
  filterOptions: TableControlOption<TFilter>[];
  sortOptions: TableControlOption<TSort>[];
  preservedFields: PreservedTableField[];
  searchPlaceholder: string;
  tableNameHeader: string;
  dateHeader: string;
  rows: MarketingPerformanceTableRow[];
  totalRows: number;
  metrics: MarketingPerformanceMetric[];
  emptyMessage: string;
}) {
  return (
    <section className="min-h-[calc(100vh-97px)] bg-white text-slate-900">
      <header className="flex min-h-16 flex-col gap-3 border-b border-slate-200 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-lg font-semibold tracking-normal text-slate-900">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton variant="ghost" className="w-10 px-0" aria-label="More page actions">
            <EllipsisVertical aria-hidden="true" className="h-5 w-5" />
          </ToolbarButton>
          <ToolbarButton title={`${title} library is represented by this reporting table.`}>View library</ToolbarButton>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-slate-100 shadow-sm shadow-slate-900/[0.03]">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 bg-white px-3 text-sm font-semibold text-slate-800"
              aria-pressed="true"
            >
              <List aria-hidden="true" className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              aria-disabled="true"
              className="inline-flex h-10 items-center gap-2 border-l border-slate-300 px-3 text-sm font-semibold text-slate-600"
              title="Calendar view is not available in this reporting dashboard yet."
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Calendar
            </button>
          </div>
          <ToolbarButton
            variant="primary"
            title={`${createLabel} is not available in this internal reporting dashboard yet.`}
          >
            {createLabel}
          </ToolbarButton>
        </div>
      </header>

      <section className="px-5 pb-12 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex min-w-0 items-center gap-3">
            <ChevronDown aria-hidden="true" className="h-5 w-5 rotate-180 text-slate-900" />
            <h2 className="text-lg font-semibold tracking-normal text-slate-900">{performanceTitle}</h2>
          </div>
          <ToolbarButton>View benchmarks</ToolbarButton>
        </div>
        <div className="mt-8 grid gap-x-16 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <PerformanceMetricBlock key={metric.label} metric={metric} />
          ))}
        </div>
        <div className="mt-12 md:mt-24">
          <FeedbackBanner />
        </div>
      </section>

      <form method="get" action={actionPath} className="px-5 pt-8">
        {/* Preserve the analytics scope while the compact table controls update search, filter, and sort state. */}
        <input type="hidden" name="start" value={filters.startDate} />
        <input type="hidden" name="end" value={filters.endDate} />
        {preservedFields.map((field, fieldIndex) => (
          <input key={`${field.name}:${field.value}:${fieldIndex}`} type="hidden" name={field.name} value={field.value} />
        ))}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Search {title.toLowerCase()}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                name={fieldNames.query}
                defaultValue={state.query}
                autoComplete="off"
                placeholder={searchPlaceholder}
                className={clsx(compactControlClassName, "w-full pl-10 font-normal")}
              />
            </label>
            <div className="flex min-w-44 flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-500" htmlFor={`${fieldNames.query}-date-range`}>
                Date range
              </label>
              <CompactSelect
                id={`${fieldNames.query}-date-range`}
                name="preset"
                defaultValue={filters.preset}
                icon={CalendarDays}
              >
                {datePresetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CompactSelect>
            </div>
            <CompactSelect name="region" defaultValue={filters.regionSlug} className="min-w-32">
              <option value="all">Audience</option>
              {regions.map((region) => (
                <option key={region.id} value={region.slug}>
                  {region.name}
                </option>
              ))}
            </CompactSelect>
            <StaticFilterButton>Channels</StaticFilterButton>
            <CompactSelect name={fieldNames.filter} defaultValue={state.filter} className="min-w-32">
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CompactSelect>
            <StaticFilterButton>Tags</StaticFilterButton>
            <StaticFilterButton hasChevron={false}>A/B test</StaticFilterButton>
            <StaticFilterButton hasChevron={false}>Archived</StaticFilterButton>
            <CompactSelect name={fieldNames.sort} defaultValue={state.sort} icon={ShoppingBag} className="min-w-64">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </CompactSelect>
          </div>
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-800 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            aria-label="Apply table controls"
          >
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </form>

      <div className="px-5 pb-10 pt-3">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th scope="col" className="w-12 border-b border-slate-200 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300"
                    aria-label={`Select all visible ${title.toLowerCase()}`}
                  />
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-3 font-medium">
                  {tableNameHeader}
                </th>
                <th scope="col" className="w-40 border-b border-slate-200 px-3 py-3 font-medium">
                  Message type
                </th>
                <th scope="col" className="w-32 border-b border-slate-200 px-3 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="w-44 border-b border-slate-200 px-3 py-3 font-medium">
                  {dateHeader}
                </th>
                <th scope="col" className="w-40 border-b border-slate-200 px-3 py-3 text-right font-medium">
                  Open rate
                </th>
                <th scope="col" className="w-40 border-b border-slate-200 px-3 py-3 text-right font-medium">
                  Click rate
                </th>
                <th scope="col" className="w-44 border-b border-slate-200 px-3 py-3 text-right font-medium">
                  Placed Order
                </th>
                <th scope="col" className="w-12 border-b border-l border-slate-100 px-3 py-3">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300"
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <p className="font-medium leading-tight text-blue-600">{row.name}</p>
                      <p className="mt-1 max-w-[34rem] truncate text-sm text-slate-500">{row.audience}</p>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <MessageTypeIcon type={row.messageType} label={row.messageLabel} />
                        {row.badges?.map((badge) => (
                          <span key={badge} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-1 text-sm font-medium",
                          row.statusTone === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle text-slate-700">
                      {row.dateLabel}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <RateCell rate={row.openRate} count={row.opensCount} countLabel="opens" />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <RateCell rate={row.clickRate} count={row.clicksCount} countLabel="clicks" />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 align-middle">
                      <RevenueCell row={row} />
                    </td>
                    <td className="border-b border-l border-slate-100 px-3 py-3 align-middle">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                        aria-label={`Open actions for ${row.name}`}
                      >
                        <EllipsisVertical aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border-b border-slate-100 px-3 py-12 text-center text-slate-500" colSpan={9}>
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-500">
          {formatNumber(rows.length)} of {formatNumber(totalRows)} rows shown
        </p>
      </div>
    </section>
  );
}
