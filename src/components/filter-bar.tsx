/*
File description:
This shared filter bar renders date preset, custom date, and region controls. It submits filters through
the URL so reporting views are shareable and every dashboard page receives the same filter contract.
*/

import { CalendarDays, Filter, Search } from "lucide-react";
import type { DashboardFilters, RegionRow } from "@/lib/types";

export function FilterBar({
  filters,
  regions,
}: {
  filters: DashboardFilters;
  regions: RegionRow[];
}) {
  return (
    <form className="flex flex-wrap items-end gap-3 border-y border-slate-200 bg-white px-4 py-3" method="get">
      <div className="flex min-w-40 flex-col gap-1">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500" htmlFor="preset">
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          Date range
        </label>
        <select
          id="preset"
          name="preset"
          defaultValue={filters.preset}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="thisMonth">This month</option>
          <option value="lastMonth">Last month</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="flex min-w-36 flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="start">
          Start
        </label>
        <input
          id="start"
          name="start"
          type="date"
          defaultValue={filters.startDate}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
        />
      </div>
      <div className="flex min-w-36 flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="end">
          End
        </label>
        <input
          id="end"
          name="end"
          type="date"
          defaultValue={filters.endDate}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
        />
      </div>
      <div className="flex min-w-44 flex-col gap-1">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500" htmlFor="region">
          <Filter aria-hidden="true" className="h-3.5 w-3.5" />
          Region
        </label>
        <select
          id="region"
          name="region"
          defaultValue={filters.regionSlug}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
        >
          <option value="all">All regions</option>
          {regions.map((region) => (
            <option key={region.id} value={region.slug}>
              {region.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        Apply
      </button>
    </form>
  );
}
