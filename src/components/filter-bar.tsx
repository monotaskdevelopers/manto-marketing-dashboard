/*
File description:
This shared filter bar renders date preset, custom date, and region controls. It submits filters through
the URL so reporting views are shareable and every dashboard page receives the same filter contract.
*/

import type { DashboardFilters, RegionRow } from "@/lib/types";
import { DateControl, PillButton, SelectControl } from "@/components/ui-controls";

export function FilterBar({
  filters,
  regions,
}: {
  filters: DashboardFilters;
  regions: RegionRow[];
}) {
  return (
    <section className="px-4 lg:px-6">
      <form
        className="rounded-lg border border-slate-200 bg-white p-3"
        method="get"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Report filters</p>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:max-w-5xl">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500" htmlFor="preset">
                Date range
              </label>
              <SelectControl id="preset" name="preset" defaultValue={filters.preset}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="thisMonth">This month</option>
                <option value="lastMonth">Last month</option>
                <option value="custom">Custom</option>
              </SelectControl>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500" htmlFor="start">
                Start
              </label>
              <DateControl id="start" name="start" defaultValue={filters.startDate} />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500" htmlFor="end">
                End
              </label>
              <DateControl id="end" name="end" defaultValue={filters.endDate} />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500" htmlFor="region">
                Region
              </label>
              <SelectControl id="region" name="region" defaultValue={filters.regionSlug}>
                <option value="all">All regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.slug}>
                    {region.name}
                  </option>
                ))}
              </SelectControl>
            </div>
            <div className="flex items-end">
              <PillButton type="submit" className="w-full">
                Apply
              </PillButton>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
