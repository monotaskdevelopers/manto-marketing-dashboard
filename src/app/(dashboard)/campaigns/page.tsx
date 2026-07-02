/*
File description:
This Campaigns page renders the rebuilt Klaviyo-style campaign workspace. It currently provides the
static UI scaffold for the campaign metrics, compact controls, and campaign table that will be wired to
synced reporting data in a later implementation pass.
*/

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
import { clsx } from "clsx";
import type { ReactNode } from "react";

const performanceMetrics = [
  {
    value: "45.64%",
    label: "Average open rate",
    rating: "Fair",
    tone: "yellow",
    trend: "-1.05%",
    trendTone: "down",
  },
  {
    value: "1.39%",
    label: "Average click rate",
    rating: "Fair",
    tone: "yellow",
    trend: "0.09%",
    trendTone: "up",
  },
  {
    value: "0.08%",
    label: "Placed Order",
    rating: "Good",
    tone: "blue",
    trend: null,
    trendTone: null,
  },
  {
    value: "$0.11",
    label: "Revenue per recipient",
    rating: "Fair",
    tone: "yellow",
    trend: "-$0.04",
    trendTone: "down",
  },
] as const;

const campaignRows = [
  {
    name: "Free-Shipping-SMS-4thJuly",
    audience: "SMS Subscribers",
    messageType: "text",
    status: "Sent",
    sendDate: "Jun 30, 2026",
    sendTime: "3:45 PM",
    openRate: "n/a",
    openMeta: "--",
    clickRate: "6.08%",
    clickMeta: "137 recipients",
    placedOrder: "$1,107.27",
    orderMeta: "10 recipients",
  },
  {
    name: "freeshipping4thofjuly",
    audience: "US-merged-lists, USA LIST GROWING, and USA New List",
    messageType: "email",
    status: "Sent",
    sendDate: "Jun 29, 2026",
    sendTime: "1:15 PM EDT",
    openRate: "45.78%",
    openMeta: "5,437 recipients",
    clickRate: "2.64%",
    clickMeta: "314 recipients",
    placedOrder: "$2,900.77",
    orderMeta: "27 recipients",
  },
  {
    name: "LaunchEmail",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "email",
    status: "Sent",
    sendDate: "Jun 24, 2026",
    sendTime: "1:45 PM EDT",
    openRate: "45.10%",
    openMeta: "7,831 recipients",
    clickRate: "0.71%",
    clickMeta: "123 recipients",
    placedOrder: "$1,264.09",
    orderMeta: "11 recipients",
  },
  {
    name: "SareesLaunch",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "email",
    status: "Sent",
    sendDate: "Jun 15, 2026",
    sendTime: "1:45 PM EDT",
    openRate: "45.67%",
    openMeta: "7,916 recipients",
    clickRate: "1.34%",
    clickMeta: "233 recipients",
    placedOrder: "$1,749.97",
    orderMeta: "11 recipients",
  },
  {
    name: "Father's-Day-Warning",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "email",
    status: "Draft",
    sendDate: "Jun 15, 2026",
    sendTime: "7:33 AM EDT",
    openRate: "--",
    openMeta: "--",
    clickRate: "--",
    clickMeta: "--",
    placedOrder: "--",
    orderMeta: "--",
  },
  {
    name: "Workwear-newlylaunched",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "email",
    status: "Sent",
    sendDate: "Jun 8, 2026",
    sendTime: "1:45 PM EDT",
    openRate: "45.66%",
    openMeta: "7,902 recipients",
    clickRate: "1.22%",
    clickMeta: "211 recipients",
    placedOrder: "$1,593.39",
    orderMeta: "8 recipients",
  },
  {
    name: "Sheesh-Raima-Muskan-Tabeer-Newlylaunched (clone)",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "email",
    status: "Draft",
    sendDate: "Jun 3, 2026",
    sendTime: "3:06 AM EDT",
    openRate: "--",
    openMeta: "--",
    clickRate: "--",
    clickMeta: "--",
    placedOrder: "--",
    orderMeta: "--",
  },
  {
    name: "Sheesh-Raima-Muskan-Tabeer-Newlylaunched",
    audience: "US-merged-lists, Canada Merged Lists, All global mark...",
    messageType: "ab",
    status: "Sent",
    sendDate: "Jun 2, 2026",
    sendTime: "1:45 PM EDT",
    openRate: "46.06%",
    openMeta: "7,956 recipients",
    clickRate: "1.45%",
    clickMeta: "250 recipients",
    placedOrder: "$1,421.88",
    orderMeta: "10 recipients",
  },
] as const;

const filterLabels = ["Audience", "Channels", "Status", "Tags", "A/B test", "Archived"] as const;

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
  status: "Sent" | "Draft";
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full px-3 text-sm font-medium",
        status === "Sent" ? "bg-[#d8f8e4] text-[#176b3a]" : "bg-[#eceef0] text-[#575b61]",
      )}
    >
      {status}
    </span>
  );
}

export default function CampaignsPage() {
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
              <h2 className="text-base font-semibold text-[#32363c]">Email performance last 30 days</h2>
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
                  {metric.trend && metric.trendTone ? (
                    <TrendPill tone={metric.trendTone}>{metric.trend}</TrendPill>
                  ) : null}
                </div>
                <p className="mt-2 text-base font-semibold text-[#2e3136]">{metric.label}</p>
                <div className="mt-3">
                  <RatingPill tone={metric.tone}>{metric.rating}</RatingPill>
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
                  className="h-9 w-full rounded-[7px] border border-[#d8dde3] bg-white pl-10 pr-3 text-sm text-[#2e3136] placeholder:text-[#80858d]"
                />
              </label>

              <div>
                <p className="mb-1 text-sm font-medium text-[#62666d]">Date range</p>
                <FilterButton>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#62666d]" />
                    Last 30 days
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
          </div>

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
                {campaignRows.map((row) => (
                  <tr key={row.name} className="border-b border-[#eff1f4] text-sm text-[#4f5359]">
                    <td className="px-2 py-3 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        className="h-5 w-5 rounded border-[#aeb4bc]"
                      />
                    </td>
                    <td className="max-w-[360px] px-2 py-3 align-middle">
                      <button type="button" className="text-left font-medium text-[#2d6cff] hover:underline">
                        {row.name}
                      </button>
                      <p className="mt-1 truncate text-sm font-medium text-[#666b72]">{row.audience}</p>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <MessageTypeIcon type={row.messageType} />
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-3 align-middle text-[#34383e]">
                      <p>{row.sendDate}</p>
                      <p className="mt-1 text-sm text-[#666b72]">{row.sendTime}</p>
                    </td>
                    <td className="px-2 py-3 text-right align-middle">
                      <p className={row.openRate.includes("%") ? "font-medium text-[#2d6cff]" : "font-medium text-[#34383e]"}>
                        {row.openRate}
                      </p>
                      <p className="mt-1 text-sm text-[#666b72]">{row.openMeta}</p>
                    </td>
                    <td className="px-2 py-3 text-right align-middle">
                      <p className={row.clickRate.includes("%") ? "font-medium text-[#2d6cff]" : "font-medium text-[#34383e]"}>
                        {row.clickRate}
                      </p>
                      <p className="mt-1 text-sm text-[#666b72]">{row.clickMeta}</p>
                    </td>
                    <td className="px-2 py-3 text-right align-middle">
                      <p className={row.placedOrder.startsWith("$") ? "font-medium text-[#2d6cff]" : "font-medium text-[#34383e]"}>
                        {row.placedOrder}
                      </p>
                      <p className="mt-1 text-sm text-[#666b72]">{row.orderMeta}</p>
                    </td>
                    <td className="px-2 py-3 text-right align-middle">
                      <button
                        type="button"
                        aria-label={`More actions for ${row.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-[#1f2328] hover:bg-[#f3f4f6]"
                      >
                        <MoreVertical aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
