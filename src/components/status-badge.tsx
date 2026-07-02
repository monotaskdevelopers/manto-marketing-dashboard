/*
File description:
This reusable badge displays compact status labels for sync health and dashboard state. It keeps status
colors consistent across the app without exposing raw technical details to business users.
*/

import { clsx } from "clsx";
import type { SyncStatus } from "@/lib/types";

const statusClasses: Record<SyncStatus, string> = {
  running: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({
  status,
  label,
}: {
  status: SyncStatus;
  label?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {label || status}
    </span>
  );
}
