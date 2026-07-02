/*
File description:
This file renders the Klaviyo drill-down table controls. The form keeps filters in the URL so report views
can be shared, revisited, and audited without client-only state or hidden background requests.
*/

import Link from "next/link";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { DashboardFilters } from "@/lib/types";
import {
  buildDashboardHref,
  klaviyoEngagementOptions,
  klaviyoSortOptions,
  type KlaviyoTableFilters,
} from "@/lib/klaviyo-reporting";
import { PillButton, SelectControl, TextControl } from "@/components/ui-controls";

export function KlaviyoDrilldownControls({
  action,
  filters,
  tableFilters,
}: {
  action: string;
  filters: DashboardFilters;
  tableFilters: KlaviyoTableFilters;
}) {
  return (
    <form method="get" action={action} className="rounded-lg border border-slate-200 bg-white p-3">
      <input type="hidden" name="preset" value={filters.preset} />
      <input type="hidden" name="start" value={filters.startDate} />
      <input type="hidden" name="end" value={filters.endDate} />
      <input type="hidden" name="region" value={filters.regionSlug} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.7fr_0.9fr_1fr_auto_auto] xl:items-end">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="q">
            Search
          </label>
          <TextControl id="q" name="q" defaultValue={tableFilters.query} placeholder="Name or region" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="minRevenue">
            Min revenue
          </label>
          <TextControl
            id="minRevenue"
            name="minRevenue"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={tableFilters.minRevenue || ""}
            placeholder="0"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="engagement">
            Engagement
          </label>
          <SelectControl id="engagement" name="engagement" defaultValue={tableFilters.engagement}>
            {klaviyoEngagementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectControl>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="sort">
            Sort
          </label>
          <SelectControl id="sort" name="sort" defaultValue={tableFilters.sort}>
            {klaviyoSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectControl>
        </div>
        <PillButton type="submit" variant="primary" className="w-full">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Apply
        </PillButton>
        <Link href={buildDashboardHref(action, filters)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Reset
        </Link>
      </div>
    </form>
  );
}
