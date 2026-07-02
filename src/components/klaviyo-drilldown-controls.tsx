/*
File description:
This file renders compact Klaviyo drill-down table-header controls. The form keeps filters in the URL so
report views can be shared, revisited, and audited without hidden background requests or bulky action rows.
*/

import { Search } from "lucide-react";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import type { DashboardFilters } from "@/lib/types";
import { klaviyoEngagementOptions, klaviyoSortOptions, type KlaviyoTableFilters } from "@/lib/klaviyo-reporting";
import { SelectControl, TextControl } from "@/components/ui-controls";

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
    <AutoSubmitForm method="get" action={action} className="w-full">
      {/* Preserve the page-level report scope when users adjust table-specific controls. */}
      <input type="hidden" name="preset" value={filters.preset} />
      <input type="hidden" name="start" value={filters.startDate} />
      <input type="hidden" name="end" value={filters.endDate} />
      <input type="hidden" name="region" value={filters.regionSlug} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="q">
            Search
          </label>
          <span className="relative block">
            <TextControl
              id="q"
              name="q"
              autoComplete="off"
              defaultValue={tableFilters.query}
              placeholder="Name or region…"
              className="bg-slate-50/70 pl-10"
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          </span>
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
            autoComplete="off"
            defaultValue={tableFilters.minRevenue || ""}
            placeholder="0"
            className="bg-slate-50/70"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor="engagement">
            Engagement
          </label>
          <SelectControl id="engagement" name="engagement" defaultValue={tableFilters.engagement} className="bg-slate-50/70">
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
          <SelectControl id="sort" name="sort" defaultValue={tableFilters.sort} className="bg-slate-50/70">
            {klaviyoSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectControl>
        </div>
      </div>
    </AutoSubmitForm>
  );
}
