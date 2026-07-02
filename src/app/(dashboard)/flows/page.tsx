/*
File description:
This Flows page renders the rebuilt Klaviyo-style automation workspace. It currently provides the static
UI scaffold for flow filters, flow status, revenue metrics, and the flow table that will later be wired to
synced reporting data.
*/

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
import { clsx } from "clsx";
import type { ReactNode } from "react";

type FlowRow = {
  name: string;
  trigger: string;
  type: "email" | "multi" | "none";
  status: "Live" | "Draft";
  updated: string;
  revenue: string;
  revenuePerRecipient: string;
  danger?: boolean;
};

const flowRows: FlowRow[] = [
  {
    name: "150DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "May 15, 6:19 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "1st-2nd Order Journey",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Feb 22, 7:34 AM",
    revenue: "$209.10",
    revenuePerRecipient: "$0.74",
  },
  {
    name: "210DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Apr 21, 1:31 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "270DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Apr 21, 5:31 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "30DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Apr 28, 6:04 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "330DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Feb 21, 8:12 AM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "90DayRetentionJourney",
    trigger: "Placed Order",
    type: "email",
    status: "Live",
    updated: "Apr 21, 1:30 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "Back In Stock - general",
    trigger: "Subscribed to Back in Stock",
    type: "email",
    status: "Live",
    updated: "Dec 20, 2025, 12:53 AM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "Back In Stock - kids!!!",
    trigger: "Subscribed to Back in Stock",
    type: "email",
    status: "Live",
    updated: "Nov 1, 2025, 2:52 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "BrowseAbandonedEC-FINAL",
    trigger: "Active on Site",
    type: "email",
    status: "Live",
    updated: "Feb 17, 7:16 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "CartAbandonedEC+NC-FINAL",
    trigger: "Added to Cart",
    type: "multi",
    status: "Live",
    updated: "Apr 9, 11:48 AM",
    revenue: "$1,684.13",
    revenuePerRecipient: "$2.93",
  },
  {
    name: "Countdown to Birthday Series - Final Email Conversion Split",
    trigger: "Starts 11 days before Birthday. Repeats annually.",
    type: "email",
    status: "Live",
    updated: "Apr 11, 2025, 5:04 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "Flow-trial",
    trigger: "Trigger not setup",
    type: "none",
    status: "Draft",
    updated: "Apr 28, 5:44 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
    danger: true,
  },
  {
    name: "Loox Reviews Request",
    trigger: "Loox - Time To Send Review Request",
    type: "email",
    status: "Live",
    updated: "Apr 3, 2025, 4:11 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "Loyalty Program Welcome - Standard",
    trigger: "Points Earned on Order",
    type: "email",
    status: "Live",
    updated: "May 22, 2025, 1:27 PM",
    revenue: "$0.00",
    revenuePerRecipient: "$0.00",
  },
  {
    name: "NewCustomerAcquisitionPop-Up-FINAL",
    trigger: "Added to Newsletter list",
    type: "multi",
    status: "Live",
    updated: "Mar 6, 2:28 AM",
    revenue: "$923.84",
    revenuePerRecipient: "$3.83",
  },
];

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
  type: "email" | "multi" | "none";
}) {
  if (type === "none") {
    return <span className="text-base font-medium text-[#4f5359]">-</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[#202328]">
        <Mail aria-hidden="true" className="h-4 w-4" />
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
  status: "Live" | "Draft";
}) {
  const live = status === "Live";

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium",
        live ? "bg-[#d8f8e4] text-[#176b3a]" : "bg-[#eceef0] text-[#575b61]",
      )}
    >
      <PlayCircle
        aria-hidden="true"
        className={clsx("h-4 w-4", live ? "fill-[#2ea461] text-[#2ea461]" : "fill-[#6b7078] text-[#6b7078]")}
      />
      {status}
    </span>
  );
}

export default function FlowsPage() {
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
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <label className="relative block h-9 w-full max-w-[250px] sm:w-[250px]">
                <span className="sr-only">Search flows</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777c84]"
                />
                <input
                  type="search"
                  placeholder="Search flows"
                  className="h-9 w-full rounded-[7px] border border-[#d8dde3] bg-white pl-10 pr-3 text-sm text-[#2e3136] placeholder:text-[#80858d]"
                />
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
                    Last 7 days
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
          </div>

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
                {flowRows.map((row) => (
                  <tr key={row.name} className="border-b border-[#eff1f4] text-sm text-[#4f5359]">
                    <td className="px-2 py-3 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        className="h-5 w-5 rounded border-[#aeb4bc]"
                      />
                    </td>
                    <td className="max-w-[420px] px-2 py-3 align-middle">
                      <button
                        type="button"
                        className={clsx(
                          "text-left font-medium hover:underline",
                          row.danger ? "text-[#d33a3a]" : "text-[#2d6cff]",
                        )}
                      >
                        {row.name}
                      </button>
                      <p className="mt-1 truncate text-sm font-medium text-[#666b72]">{row.trigger}</p>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <TypeIcon type={row.type} />
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-2 py-3 align-middle text-[#34383e]">{row.updated}</td>
                    <td className="px-2 py-3 text-right align-middle font-medium text-[#34383e]">{row.revenue}</td>
                    <td className="px-2 py-3 text-right align-middle font-medium text-[#34383e]">{row.revenuePerRecipient}</td>
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
