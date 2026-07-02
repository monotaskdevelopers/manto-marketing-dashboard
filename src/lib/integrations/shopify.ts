/*
File description:
This file contains the server-only Shopify Admin GraphQL integration. It fetches a bounded set of order
fields for reporting, paginates safely, and returns daily aggregate metrics without logging customer data.
*/

import "server-only";

import { getShopifyApiVersion } from "@/lib/env";
import type { RegionIntegrationConfig } from "@/lib/types";

export type ShopifyDailySyncRow = {
  metric_date: string;
  revenue_amount: number;
  orders_count: number;
  customers_count: number;
  refunds_amount: number;
  cancelled_orders_count: number;
  currency_code: string;
};

type ShopifyOrderNode = {
  id: string;
  createdAt: string;
  cancelledAt: string | null;
  customer: { id: string } | null;
  currentTotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  totalRefundedSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
};

type ShopifyOrdersResponse = {
  data?: {
    orders?: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      edges: Array<{
        node: ShopifyOrderNode;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
  extensions?: {
    cost?: {
      throttleStatus?: {
        currentlyAvailable?: number;
        restoreRate?: number;
      };
    };
  };
};

const ordersQuery = `
  query OrdersForDashboard($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          createdAt
          cancelledAt
          customer {
            id
          }
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

function normalizeShopDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function toAmount(value: string | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toShopifyQuery(startDate: string, endDate: string) {
  return `created_at:>=${startDate}T00:00:00Z created_at:<=${endDate}T23:59:59Z`;
}

async function wait(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchOrdersPage(params: {
  region: RegionIntegrationConfig;
  query: string;
  after: string | null;
}) {
  const shopDomain = normalizeShopDomain(params.region.shopifyShopDomain);
  const apiVersion = getShopifyApiVersion();
  const response = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": params.region.shopifyAdminAccessToken,
    },
    body: JSON.stringify({
      query: ordersQuery,
      variables: {
        first: 100,
        after: params.after,
        query: params.query,
      },
    }),
  });

  if (response.status === 429) {
    console.warn(`[sync:shopify] Rate limited for region ${params.region.slug}.`);
    throw new Error(`Shopify rate limit hit for region ${params.region.slug}.`);
  }

  if (!response.ok) {
    console.warn(`[sync:shopify] Request failed for region ${params.region.slug}: ${response.status}.`);
    throw new Error(`Shopify request failed for region ${params.region.slug}.`);
  }

  const payload = (await response.json()) as ShopifyOrdersResponse;

  if (payload.errors?.length) {
    console.warn(`[sync:shopify] GraphQL error for region ${params.region.slug}.`);
    throw new Error(`Shopify GraphQL returned an error for region ${params.region.slug}.`);
  }

  return payload;
}

export async function fetchShopifyDailyMetrics(params: {
  region: RegionIntegrationConfig;
  startDate: string;
  endDate: string;
}): Promise<ShopifyDailySyncRow[]> {
  const rows = new Map<
    string,
    ShopifyDailySyncRow & {
      customerIds: Set<string>;
    }
  >();
  const query = toShopifyQuery(params.startDate, params.endDate);
  let after: string | null = null;
  let page = 0;

  console.info(`[sync:shopify] Starting Shopify order sync for region ${params.region.slug}.`);

  do {
    page += 1;
    const payload = await fetchOrdersPage({
      region: params.region,
      query,
      after,
    });
    const orders = payload.data?.orders;

    orders?.edges.forEach(({ node }) => {
      const metricDate = node.createdAt.slice(0, 10);
      const currencyCode =
        node.currentTotalPriceSet?.shopMoney.currencyCode || params.region.currencyCode;
      const existing =
        rows.get(metricDate) ||
        ({
          metric_date: metricDate,
          revenue_amount: 0,
          orders_count: 0,
          customers_count: 0,
          refunds_amount: 0,
          cancelled_orders_count: 0,
          currency_code: currencyCode,
          customerIds: new Set<string>(),
        } satisfies ShopifyDailySyncRow & { customerIds: Set<string> });

      existing.revenue_amount += toAmount(node.currentTotalPriceSet?.shopMoney.amount);
      existing.refunds_amount += toAmount(node.totalRefundedSet?.shopMoney.amount);
      existing.orders_count += 1;
      existing.cancelled_orders_count += node.cancelledAt ? 1 : 0;

      if (node.customer?.id) {
        existing.customerIds.add(node.customer.id);
      }

      existing.customers_count = existing.customerIds.size;
      rows.set(metricDate, existing);
    });

    after = orders?.pageInfo.hasNextPage ? orders.pageInfo.endCursor : null;

    // A small pause keeps bursty pagination polite and reduces throttle risk on large stores.
    if (after) {
      await wait(350);
    }
  } while (after && page < 50);

  console.info(
    `[sync:shopify] Completed Shopify order sync for region ${params.region.slug} with ${rows.size} daily rows.`,
  );

  return Array.from(rows.values()).map((row) => ({
    metric_date: row.metric_date,
    revenue_amount: row.revenue_amount,
    orders_count: row.orders_count,
    customers_count: row.customers_count,
    refunds_amount: row.refunds_amount,
    cancelled_orders_count: row.cancelled_orders_count,
    currency_code: row.currency_code,
  }));
}
