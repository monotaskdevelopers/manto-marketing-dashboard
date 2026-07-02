/*
File description:
This file parses dashboard URL filters into stable date and region settings. It keeps all dashboard pages
using the same date-range logic so numbers remain consistent across Overview, Shopify, Klaviyo, Campaigns,
Flows, and Regional views.
*/

import type { DashboardFilters } from "@/lib/types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const dashboardDatePresets = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "last90",
  "thisMonth",
  "lastMonth",
  "yearToDate",
  "lastYear",
  "allTime",
  "custom",
] as const;

export type DashboardDatePreset = (typeof dashboardDatePresets)[number];

const presets = new Set<string>(dashboardDatePresets);
const allTimeStartDate = "1970-01-01";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcYear(year: number) {
  return new Date(Date.UTC(year, 11, 31));
}

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function getDashboardPresetDateRange(preset: string, referenceDate = new Date()) {
  const today = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

  // Keep preset math in one shared helper so date picker labels and server report queries stay aligned.
  if (preset === "today") {
    return {
      startDate: toDateOnly(today),
      endDate: toDateOnly(today),
    };
  }

  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);

    return {
      startDate: toDateOnly(yesterday),
      endDate: toDateOnly(yesterday),
    };
  }

  if (preset === "last7") {
    return {
      startDate: toDateOnly(addDays(today, -6)),
      endDate: toDateOnly(today),
    };
  }

  if (preset === "last90") {
    return {
      startDate: toDateOnly(addDays(today, -89)),
      endDate: toDateOnly(today),
    };
  }

  if (preset === "thisMonth") {
    return {
      startDate: toDateOnly(startOfUtcMonth(today)),
      endDate: toDateOnly(today),
    };
  }

  if (preset === "lastMonth") {
    const thisMonthStart = startOfUtcMonth(today);
    const lastMonthEnd = addDays(thisMonthStart, -1);
    const lastMonthStart = startOfUtcMonth(lastMonthEnd);

    return {
      startDate: toDateOnly(lastMonthStart),
      endDate: toDateOnly(lastMonthEnd),
    };
  }

  if (preset === "yearToDate") {
    return {
      startDate: toDateOnly(new Date(Date.UTC(today.getUTCFullYear(), 0, 1))),
      endDate: toDateOnly(today),
    };
  }

  if (preset === "lastYear") {
    const lastYear = today.getUTCFullYear() - 1;

    return {
      startDate: toDateOnly(new Date(Date.UTC(lastYear, 0, 1))),
      endDate: toDateOnly(endOfUtcYear(lastYear)),
    };
  }

  if (preset === "allTime") {
    return {
      startDate: allTimeStartDate,
      endDate: toDateOnly(today),
    };
  }

  return {
    startDate: toDateOnly(addDays(today, -29)),
    endDate: toDateOnly(today),
  };
}

export function parseDashboardFilters(searchParams: RawSearchParams): DashboardFilters {
  const now = new Date();
  const requestedPreset = firstValue(searchParams.preset) || "last30";
  const preset = presets.has(requestedPreset) ? requestedPreset : "last30";
  const requestedStart = firstValue(searchParams.start);
  const requestedEnd = firstValue(searchParams.end);
  const regionSlug = firstValue(searchParams.region) || "all";

  if (preset === "custom" && isIsoDate(requestedStart) && isIsoDate(requestedEnd)) {
    return {
      preset,
      startDate: requestedStart as string,
      endDate: requestedEnd as string,
      regionSlug,
    };
  }

  if (preset !== "custom") {
    const presetRange = getDashboardPresetDateRange(preset, now);
    return {
      preset,
      ...presetRange,
      regionSlug,
    };
  }

  const fallbackRange = getDashboardPresetDateRange("last30", now);

  return {
    preset: "last30",
    ...fallbackRange,
    regionSlug,
  };
}

export function inclusiveDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}
