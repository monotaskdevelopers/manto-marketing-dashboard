/*
File description:
This reusable metric card displays one key performance indicator with a label, value, optional helper,
and small icon. It is used for dashboard KPIs where users need quick scan-friendly numbers.
*/

import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

const accentClasses = {
  teal: "bg-teal-50 text-teal-700",
  blue: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = "teal",
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  accent?: keyof typeof accentClasses;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className={clsx("rounded-md p-2", accentClasses[accent])}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-3 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
