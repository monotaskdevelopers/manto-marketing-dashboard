/*
File description:
This reusable tooltip explains analytics labels in plain language. It keeps metric definitions close to
the UI while staying keyboard-accessible, so report users can understand how a number is calculated
without leaving the table, chart, or KPI card they are reading.
*/

import { Info } from "lucide-react";
import { clsx } from "clsx";

export function InfoTooltip({
  label,
  content,
  align = "left",
}: {
  label: string;
  content: string;
  align?: "left" | "right";
}) {
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:border-teal-400 focus-visible:bg-teal-50 focus-visible:text-teal-800"
        aria-label={`${label}: ${content}`}
        title={content}
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={clsx(
          "pointer-events-none absolute top-7 z-40 w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-slate-600 opacity-0 shadow-lg shadow-slate-200/70 transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
          align === "right" ? "right-0 translate-y-1" : "left-0 translate-y-1",
        )}
      >
        {content}
      </span>
    </span>
  );
}
