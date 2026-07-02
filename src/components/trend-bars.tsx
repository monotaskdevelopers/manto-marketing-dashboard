/*
File description:
This lightweight chart component renders daily revenue and order trend bars using CSS. It avoids a heavy
charting dependency while still giving users a visual sense of movement over the selected date range.
*/

import type { TrendPoint } from "@/lib/types";
import { formatCompactNumber, formatDateLabel } from "@/lib/format";

export function TrendBars({
  points,
}: {
  points: TrendPoint[];
}) {
  const maxRevenue = Math.max(...points.map((point) => point.shopifyRevenue), 1);
  const labelStride = Math.max(Math.ceil(points.length / 7), 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Revenue Trend</h2>
          <p className="text-sm text-slate-500">Shopify revenue with Klaviyo contribution overlay.</p>
        </div>
      </div>
      {points.length ? (
        <div
          className="mt-6 grid h-56 items-end gap-1 pb-2 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          {points.map((point, index) => {
            const shopifyHeight = Math.max((point.shopifyRevenue / maxRevenue) * 100, 4);
            const klaviyoHeight = Math.max((point.klaviyoRevenue / maxRevenue) * 100, 2);
            // Keep dense date ranges readable by labeling only regular intervals and the final bar.
            const showDateLabel = index % labelStride === 0 || index === points.length - 1;

            return (
              <div key={point.date} className="flex min-w-0 flex-col items-center gap-2">
                <div className="relative flex h-40 w-full items-end rounded-md bg-slate-100">
                  <div
                    className="w-full rounded-md bg-teal-600"
                    style={{ height: `${shopifyHeight}%` }}
                    title={`Shopify: ${formatCompactNumber(point.shopifyRevenue)}`}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 w-1/2 -translate-x-1/2 rounded-t-md bg-amber-400"
                    style={{ height: `${klaviyoHeight}%` }}
                    title={`Klaviyo: ${formatCompactNumber(point.klaviyoRevenue)}`}
                  />
                </div>
                <span className="h-4 max-w-full truncate text-[0.65rem] leading-4 text-slate-500 sm:text-xs">
                  {showDateLabel ? formatDateLabel(point.date) : ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No trend data is available for this filter yet.
        </div>
      )}
    </div>
  );
}
