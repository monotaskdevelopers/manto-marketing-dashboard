/*
File description:
This reusable table-header control form standardizes compact search, filter, and sort controls for
analytics tables. It keeps table state URL-driven and server-rendered while preserving the page-level date
and region filters that define each report's scope.
*/

import { Search } from "lucide-react";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { SelectControl, TextControl } from "@/components/ui-controls";
import type {
  PreservedTableField,
  ScopedTableState,
  TableControlFieldNames,
  TableControlOption,
} from "@/lib/report-table-controls";
import type { DashboardFilters } from "@/lib/types";

export function TableHeaderControls<TSort extends string, TFilter extends string>({
  action,
  filters,
  fieldNames,
  state,
  filterOptions,
  sortOptions,
  preservedFields,
  searchLabel = "Search",
  searchPlaceholder = "Name or region…",
}: {
  action: string;
  filters: DashboardFilters;
  fieldNames: TableControlFieldNames;
  state: ScopedTableState<TSort, TFilter>;
  filterOptions: TableControlOption<TFilter>[];
  sortOptions: TableControlOption<TSort>[];
  preservedFields: PreservedTableField[];
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const searchId = `${fieldNames.query}-input`;
  const filterId = `${fieldNames.filter}-select`;
  const sortId = `${fieldNames.sort}-select`;

  return (
    <AutoSubmitForm method="get" action={action} className="w-full">
      {/* Preserve the page-wide analytics scope plus controls from other tables on the same page. */}
      <input type="hidden" name="preset" value={filters.preset} />
      <input type="hidden" name="start" value={filters.startDate} />
      <input type="hidden" name="end" value={filters.endDate} />
      <input type="hidden" name="region" value={filters.regionSlug} />
      {preservedFields.map((field, fieldIndex) => (
        <input key={`${field.name}:${field.value}:${fieldIndex}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor={searchId}>
            {searchLabel}
          </label>
          <span className="relative block">
            <TextControl
              id={searchId}
              name={fieldNames.query}
              autoComplete="off"
              defaultValue={state.query}
              placeholder={searchPlaceholder}
              className="bg-slate-50/70 pl-10"
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor={filterId}>
            Filter
          </label>
          <SelectControl id={filterId} name={fieldNames.filter} defaultValue={state.filter} className="bg-slate-50/70">
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectControl>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500" htmlFor={sortId}>
            Sort
          </label>
          <SelectControl id={sortId} name={fieldNames.sort} defaultValue={state.sort} className="bg-slate-50/70">
            {sortOptions.map((option) => (
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
