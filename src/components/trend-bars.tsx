/*
File description:
This lightweight chart component renders daily revenue and order trend bars using CSS. It avoids a heavy
charting dependency while still giving users a visual sense of movement over the selected date range.
*/

import type { TrendPoint } from "@/lib/types";
import { formatCompactNumber, formatDateLabel } from "@/lib/format";
import { InfoTooltip } from "@/components/info-tooltip";

export function TrendBars({
  points,
}: {
  points: TrendPoint[];
}) {
  const maxRevenue = Math.max(...points.map((point) => point.shopifyRevenue), 1);
  const labelStride = Math.max(Math.ceil(points.length / 7), 1);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">Revenue Trend</h2>
            <InfoTooltip
              label="Revenue Trend"
              content="Each bar shows the Shopify revenue synced for one day. The amber overlay shows the Klaviyo-attributed revenue for that same day."
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">Daily Shopify revenue with Klaviyo contribution overlay.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
            Shopify
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
            Klaviyo
          </span>
        </div>
      </div>
      {points.length ? (
        <div
          className="mt-6 grid h-60 items-end gap-1 rounded-lg border border-slate-100 bg-slate-50/70 px-3 pb-2 pt-4 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          {points.map((point, index) => {
            const shopifyHeight = Math.max((point.shopifyRevenue / maxRevenue) * 100, 4);
            const klaviyoHeight = Math.max((point.klaviyoRevenue / maxRevenue) * 100, 2);
            // Keep dense date ranges readable by labeling only regular intervals and the final bar.
            const showDateLabel = index % labelStride === 0 || index === points.length - 1;

            return (
              <div key={point.date} className="flex min-w-0 flex-col items-center gap-2">
                <div
                  className="relative flex h-40 w-full items-end rounded-full bg-white shadow-inner shadow-slate-200/70"
                  aria-label={`${formatDateLabel(point.date)}: Shopify ${formatCompactNumber(point.shopifyRevenue)}, Klaviyo ${formatCompactNumber(point.klaviyoRevenue)}`}
                >
                  <div
                    className="w-full rounded-full bg-teal-600 transition-all duration-300"
                    style={{ height: `${shopifyHeight}%` }}
                    title={`Shopify: ${formatCompactNumber(point.shopifyRevenue)}`}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 w-1/2 -translate-x-1/2 rounded-full bg-amber-400 transition-all duration-300"
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
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No trend data is available for this filter yet.
        </div>
      )}
    </section>
  );
}
