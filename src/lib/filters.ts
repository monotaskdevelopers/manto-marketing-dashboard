/*
File description:
This file parses dashboard URL filters into stable date and region settings. It keeps all dashboard pages
using the same date-range logic so numbers remain consistent across Overview, Shopify, Klaviyo, Campaigns,
Flows, and Regional views.
*/

import type { DashboardFilters } from "@/lib/types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const presets = new Set([
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "custom",
]);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toDateOnly(date: Date) {
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

function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function parseDashboardFilters(searchParams: RawSearchParams): DashboardFilters {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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

  if (preset === "today") {
    return {
      preset,
      startDate: toDateOnly(today),
      endDate: toDateOnly(today),
      regionSlug,
    };
  }

  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);

    return {
      preset,
      startDate: toDateOnly(yesterday),
      endDate: toDateOnly(yesterday),
      regionSlug,
    };
  }

  if (preset === "last7") {
    return {
      preset,
      startDate: toDateOnly(addDays(today, -6)),
      endDate: toDateOnly(today),
      regionSlug,
    };
  }

  if (preset === "thisMonth") {
    return {
      preset,
      startDate: toDateOnly(startOfUtcMonth(today)),
      endDate: toDateOnly(today),
      regionSlug,
    };
  }

  if (preset === "lastMonth") {
    const thisMonthStart = startOfUtcMonth(today);
    const lastMonthEnd = addDays(thisMonthStart, -1);
    const lastMonthStart = startOfUtcMonth(lastMonthEnd);

    return {
      preset,
      startDate: toDateOnly(lastMonthStart),
      endDate: toDateOnly(lastMonthEnd),
      regionSlug,
    };
  }

  return {
    preset: "last30",
    startDate: toDateOnly(addDays(today, -29)),
    endDate: toDateOnly(today),
    regionSlug,
  };
}

export function inclusiveDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}
