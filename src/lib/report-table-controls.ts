/*
File description:
This file contains shared server-side table control helpers for analytics pages. It parses scoped URL
state, preserves other table controls when one table is submitted, and filters/sorts regional, campaign,
and flow rows without moving reporting state into the client.
*/

import type { RawSearchParams } from "@/lib/filters";
import { safeRate } from "@/lib/format";
import type { RankedCampaign, RankedFlow, RegionalSummary } from "@/lib/types";

export type TableControlFieldNames = {
  query: string;
  filter: string;
  sort: string;
};

export type TableControlOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};

export type ScopedTableState<TSort extends string, TFilter extends string> = {
  query: string;
  sort: TSort;
  filter: TFilter;
};

export type PreservedTableField = {
  name: string;
  value: string;
};

export type RegionalTableSort =
  | "shopify_revenue_desc"
  | "orders_desc"
  | "klaviyo_share_desc"
  | "refunds_desc"
  | "name_asc";

export type RegionalTableFilter =
  | "all"
  | "has_shopify_revenue"
  | "has_klaviyo_revenue"
  | "high_klaviyo_share"
  | "refund_or_cancel";

export type KlaviyoSimpleTableSort =
  | "revenue_desc"
  | "recipients_desc"
  | "open_desc"
  | "click_desc"
  | "conversion_desc"
  | "date_desc"
  | "name_asc";

export type KlaviyoSimpleTableFilter =
  | "all"
  | "has_conversions"
  | "low_click_rate"
  | "high_revenue_density";

const dashboardFieldNames = new Set(["preset", "start", "end", "region"]);

export const regionalTableSortOptions: TableControlOption<RegionalTableSort>[] = [
  { value: "shopify_revenue_desc", label: "Revenue high to low" },
  { value: "orders_desc", label: "Orders high to low" },
  { value: "klaviyo_share_desc", label: "Klaviyo share high to low" },
  { value: "refunds_desc", label: "Refunds high to low" },
  { value: "name_asc", label: "Region A to Z" },
];

export const regionalTableFilterOptions: TableControlOption<RegionalTableFilter>[] = [
  { value: "all", label: "All regions" },
  { value: "has_shopify_revenue", label: "Has Shopify revenue" },
  { value: "has_klaviyo_revenue", label: "Has Klaviyo revenue" },
  { value: "high_klaviyo_share", label: "High Klaviyo share" },
  { value: "refund_or_cancel", label: "Refunds or cancelled orders" },
];

export const klaviyoSimpleTableSortOptions: TableControlOption<KlaviyoSimpleTableSort>[] = [
  { value: "revenue_desc", label: "Revenue high to low" },
  { value: "recipients_desc", label: "Recipients high to low" },
  { value: "open_desc", label: "Open rate high to low" },
  { value: "click_desc", label: "Click rate high to low" },
  { value: "conversion_desc", label: "Conversion rate high to low" },
  { value: "date_desc", label: "Newest first" },
  { value: "name_asc", label: "Name A to Z" },
];

export const klaviyoSimpleTableFilterOptions: TableControlOption<KlaviyoSimpleTableFilter>[] = [
  { value: "all", label: "All rows" },
  { value: "has_conversions", label: "Has conversions" },
  { value: "low_click_rate", label: "Low click rate" },
  { value: "high_revenue_density", label: "High revenue density" },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function hasOption<TValue extends string>(options: TableControlOption<TValue>[], value: string): value is TValue {
  return options.some((option) => option.value === value);
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function getKlaviyoName(row: RankedCampaign | RankedFlow) {
  return "campaign_name" in row ? row.campaign_name : row.flow_name;
}

function getKlaviyoDate(row: RankedCampaign | RankedFlow) {
  return "send_date" in row ? row.send_date : row.metric_date;
}

export function getTableControlFieldNames(scope: string): TableControlFieldNames {
  return {
    query: `${scope}Q`,
    filter: `${scope}Filter`,
    sort: `${scope}Sort`,
  };
}

export function parseScopedTableState<TSort extends string, TFilter extends string>({
  searchParams,
  fieldNames,
  sortOptions,
  filterOptions,
  defaultSort,
  defaultFilter,
}: {
  searchParams: RawSearchParams;
  fieldNames: TableControlFieldNames;
  sortOptions: TableControlOption<TSort>[];
  filterOptions: TableControlOption<TFilter>[];
  defaultSort: TSort;
  defaultFilter: TFilter;
}): ScopedTableState<TSort, TFilter> {
  const requestedSort = firstValue(searchParams[fieldNames.sort]) || "";
  const requestedFilter = firstValue(searchParams[fieldNames.filter]) || "";

  return {
    // Keep URL state short and predictable because table filters are meant for internal sharing.
    query: (firstValue(searchParams[fieldNames.query]) || "").trim().slice(0, 80),
    sort: hasOption(sortOptions, requestedSort) ? requestedSort : defaultSort,
    filter: hasOption(filterOptions, requestedFilter) ? requestedFilter : defaultFilter,
  };
}

export function buildPreservedTableFields({
  searchParams,
  currentFieldNames,
}: {
  searchParams: RawSearchParams;
  currentFieldNames: TableControlFieldNames;
}): PreservedTableField[] {
  const currentFields = new Set(Object.values(currentFieldNames));
  const fields: PreservedTableField[] = [];

  Object.entries(searchParams).forEach(([key, value]) => {
    if (dashboardFieldNames.has(key) || currentFields.has(key)) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          fields.push({ name: key, value: item });
        }
      });
      return;
    }

    if (value) {
      fields.push({ name: key, value });
    }
  });

  return fields;
}

export function filterAndSortRegionalRows(
  rows: RegionalSummary[],
  state: ScopedTableState<RegionalTableSort, RegionalTableFilter>,
) {
  const normalizedQuery = state.query.toLowerCase();

  return rows
    .filter((row) => {
      const klaviyoShare = safeRate(row.klaviyoRevenue, row.shopifyRevenue);
      const haystack = `${row.region.name} ${row.region.slug} ${row.region.currency_code}`.toLowerCase();

      if (normalizedQuery && !haystack.includes(normalizedQuery)) {
        return false;
      }

      if (state.filter === "has_shopify_revenue") {
        return row.shopifyRevenue > 0;
      }

      if (state.filter === "has_klaviyo_revenue") {
        return row.klaviyoRevenue > 0;
      }

      if (state.filter === "high_klaviyo_share") {
        return klaviyoShare >= 0.2;
      }

      if (state.filter === "refund_or_cancel") {
        return row.refunds > 0 || row.cancelledOrders > 0;
      }

      return true;
    })
    .sort((left, right) => {
      if (state.sort === "orders_desc") {
        return right.orders - left.orders || right.shopifyRevenue - left.shopifyRevenue;
      }

      if (state.sort === "klaviyo_share_desc") {
        return safeRate(right.klaviyoRevenue, right.shopifyRevenue) - safeRate(left.klaviyoRevenue, left.shopifyRevenue);
      }

      if (state.sort === "refunds_desc") {
        return right.refunds - left.refunds || right.cancelledOrders - left.cancelledOrders;
      }

      if (state.sort === "name_asc") {
        return compareText(left.region.name, right.region.name);
      }

      return right.shopifyRevenue - left.shopifyRevenue || compareText(left.region.name, right.region.name);
    });
}

export function filterAndSortKlaviyoSimpleRows<T extends RankedCampaign | RankedFlow>(
  rows: T[],
  state: ScopedTableState<KlaviyoSimpleTableSort, KlaviyoSimpleTableFilter>,
) {
  const normalizedQuery = state.query.toLowerCase();

  return rows
    .filter((row) => {
      const haystack = `${getKlaviyoName(row)} ${row.region_name}`.toLowerCase();

      if (normalizedQuery && !haystack.includes(normalizedQuery)) {
        return false;
      }

      if (state.filter === "has_conversions") {
        return row.conversions_count > 0;
      }

      if (state.filter === "low_click_rate") {
        return row.recipients_count > 0 && row.clickRate < 0.02;
      }

      if (state.filter === "high_revenue_density") {
        return row.revenuePerRecipient >= 0.2;
      }

      return true;
    })
    .sort((left, right) => {
      if (state.sort === "recipients_desc") {
        return right.recipients_count - left.recipients_count || right.revenue_amount - left.revenue_amount;
      }

      if (state.sort === "open_desc") {
        return right.openRate - left.openRate || right.revenue_amount - left.revenue_amount;
      }

      if (state.sort === "click_desc") {
        return right.clickRate - left.clickRate || right.revenue_amount - left.revenue_amount;
      }

      if (state.sort === "conversion_desc") {
        return right.conversionRate - left.conversionRate || right.revenue_amount - left.revenue_amount;
      }

      if (state.sort === "date_desc") {
        return getKlaviyoDate(right).localeCompare(getKlaviyoDate(left)) || right.revenue_amount - left.revenue_amount;
      }

      if (state.sort === "name_asc") {
        return compareText(getKlaviyoName(left), getKlaviyoName(right)) || right.revenue_amount - left.revenue_amount;
      }

      return right.revenue_amount - left.revenue_amount || compareText(getKlaviyoName(left), getKlaviyoName(right));
    }) as T[];
}
