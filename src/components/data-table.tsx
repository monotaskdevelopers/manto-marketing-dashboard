/*
File description:
This reusable table component gives report pages a consistent table shell, empty state, and responsive
overflow behavior. It accepts typed column renderers so pages can define business-specific columns cleanly.
*/

import type { ReactNode } from "react";
import { clsx } from "clsx";

export type DataTableColumn<T> = {
  header: string;
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
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={clsx(
                    "whitespace-nowrap px-4 py-3 font-semibold text-slate-600",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={clsx(
                        "whitespace-nowrap px-4 py-3 text-slate-700",
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
                <td className="px-4 py-10 text-center text-slate-500" colSpan={columns.length}>
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
