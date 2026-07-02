/*
File description:
This reusable metric card displays one key performance indicator with a label, value, optional helper,
and required explanation tooltip. It is used for dashboard KPIs where users need quick scan-friendly
numbers and plain-language calculation details.
*/

import { clsx } from "clsx";
import { InfoTooltip } from "@/components/info-tooltip";

const accentClasses = {
  teal: "bg-teal-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

export function MetricCard({
  label,
  value,
  helper,
  description,
  accent = "teal",
}: {
  label: string;
  value: string;
  helper?: string;
  description: string;
  accent?: keyof typeof accentClasses;
}) {
  return (
    <article className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx("h-2 w-2 rounded-full", accentClasses[accent])} aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <InfoTooltip label={label} content={description} align="right" />
          </div>
          <p className="mt-3 break-words text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
      </div>
      {helper ? <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p> : null}
    </article>
  );
}
