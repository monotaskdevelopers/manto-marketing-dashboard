/*
File description:
This reusable table component gives report pages a consistent table shell, empty state, and responsive
overflow behavior. It accepts typed column renderers and tooltip descriptions so pages can define
business-specific analytics tables with clear metric explanations.
*/

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { InfoTooltip } from "@/components/info-tooltip";

export type DataTableColumn<T> = {
  header: string;
  description: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage: string;
}) {
  return (
    <div className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={clsx(
                    "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-600",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1.5",
                      column.align === "right" ? "justify-end" : "justify-start",
                    )}
                  >
                    {column.header}
                    <InfoTooltip label={column.header} content={column.description} align={column.align || "left"} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition duration-150 odd:bg-white even:bg-slate-50/45 hover:bg-teal-50/55"
                >
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={clsx(
                        "whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700",
                        column.align === "right" ? "text-right tabular-nums" : "text-left",
                      )}
                    >
                      {column.cell(row)}
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
