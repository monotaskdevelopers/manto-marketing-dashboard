/*
File description:
This file contains formatting helpers for currency, numbers, percentages, dates, and sync timestamps.
The helpers keep dashboard labels consistent so business users see the same metric style on every page.
*/

export function formatCurrency(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(1)}%`;
}

export function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not finished";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function safeRate(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}
