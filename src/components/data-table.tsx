/*
File description:
This reusable table component gives report pages a consistent table shell, empty state, and no-scroll
responsive column behavior. It accepts typed column renderers and tooltip descriptions so pages can define
business-specific analytics tables with clear metric explanations and optional table-header controls.
*/

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { InfoTooltip } from "@/components/info-tooltip";

export type DataTableColumn<T> = {
  header: string;
  description: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  visibility?: "always" | "sm" | "md" | "lg" | "xl" | "2xl";
  truncate?: boolean;
};

const columnVisibilityClassName: Record<NonNullable<DataTableColumn<unknown>["visibility"]>, string> = {
  always: "",
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

function getStableRowKey<T>(row: T, rowIndex: number) {
  if (row && typeof row === "object") {
    const record = row as Record<string, unknown>;

    // Prefer database IDs when present so row hover/focus state stays stable as filters change.
    if (typeof record.id === "string") {
      return record.id;
    }

    if (record.region && typeof record.region === "object") {
      const region = record.region as Record<string, unknown>;

      if (typeof region.id === "string") {
        return region.id;
      }
    }
  }

  return rowIndex;
}

export function DataTable<T>({
  columns,
  rows,
  emptyMessage,
  title,
  description,
  actions,
  controls,
  rowSummary,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  controls?: ReactNode;
  rowSummary?: string;
}) {
  // Prefer the explicit controls slot for table search/filter/sort forms while keeping actions compatible.
  const headerControls = controls || actions;

  return (
    <div className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      {title || description || headerControls || rowSummary ? (
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-[1_1_200px]">
              {title ? <h2 className="text-lg font-semibold tracking-normal text-slate-950">{title}</h2> : null}
              {description ? <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{description}</p> : null}
              {rowSummary ? <p className="mt-1 text-xs font-semibold text-slate-400">{rowSummary}</p> : null}
            </div>
            {headerControls ? <div className="min-w-0 flex-[1_1_360px]">{headerControls}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="w-full overflow-visible">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={clsx(
                    "min-w-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 font-semibold text-slate-600 sm:px-5",
                    column.align === "right" ? "text-right" : "text-left",
                    columnVisibilityClassName[column.visibility || "always"],
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex max-w-full items-center gap-1.5",
                      column.align === "right" ? "justify-end" : "justify-start",
                    )}
                  >
                    <span className="min-w-0 truncate">{column.header}</span>
                    <InfoTooltip label={column.header} content={column.description} align={column.align || "left"} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={getStableRowKey(row, rowIndex)} className="bg-white transition duration-150 hover:bg-slate-50">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={clsx(
                        "min-w-0 border-b border-slate-100 px-4 py-4 text-slate-700 sm:px-5",
                        column.align === "right" ? "text-right tabular-nums" : "text-left",
                        columnVisibilityClassName[column.visibility || "always"],
                      )}
                    >
                      <div
                        className={clsx(
                          "min-w-0 max-w-full",
                          column.align === "right" ? "ml-auto" : "",
                          column.truncate === false ? "break-words" : "truncate",
                        )}
                      >
                        {column.cell(row)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
