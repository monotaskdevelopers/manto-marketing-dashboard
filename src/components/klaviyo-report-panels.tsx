/*
File description:
This file contains reusable Klaviyo analytics panels for the main email dashboard and its drill-down
pages. The panels render revenue trends, revenue mix, engagement funnels, deliverability rates, regional
distribution, and leaderboard-style charts without adding a heavy client-side charting library.
*/

import Link from "next/link";
import { ArrowRight, BarChart3, Mail, Workflow } from "lucide-react";
import { clsx } from "clsx";
import { formatCurrency, formatDateLabel, formatNumber, formatPercent, safeRate } from "@/lib/format";
import type { KlaviyoTrendPoint, RegionalSummary } from "@/lib/types";

type PanelTone = "slate" | "teal" | "amber" | "rose";

type LeaderboardItem = {
  id: string;
  label: string;
  detail: string;
  value: number;
  formattedValue: string;
  helper?: string;
};

type MetricBarItem = {
  label: string;
  formattedValue: string;
  value: number;
  description: string;
  tone?: PanelTone;
};

const toneClasses: Record<PanelTone, string> = {
  slate: "bg-slate-900",
  teal: "bg-teal-700",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

function panelClassName(className?: string) {
  return clsx("rounded-lg border border-slate-200 bg-white p-4", className);
}

function clampPercent(value: number) {
  return `${Math.min(Math.max(value, 0), 100)}%`;
}

function buildPolyline(points: KlaviyoTrendPoint[], maxValue: number, readValue: (point: KlaviyoTrendPoint) => number) {
  if (!points.length) {
    return "";
  }

  const left = 4;
  const right = 96;
  const top = 6;
  const bottom = 42;
  const usableWidth = right - left;
  const usableHeight = bottom - top;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : left + (index / (points.length - 1)) * usableWidth;
      const y = bottom - (readValue(point) / maxValue) * usableHeight;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function EmptyPanelState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function KlaviyoRevenueTrendPanel({
  points,
  currencyCode,
}: {
  points: KlaviyoTrendPoint[];
  currencyCode: string;
}) {
  const maxRevenue = Math.max(
    ...points.flatMap((point) => [point.attributedRevenue, point.campaignRevenue, point.flowRevenue]),
    1,
  );
  const labelStride = Math.max(Math.ceil(points.length / 6), 1);

  return (
    <section className={panelClassName("min-w-0")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Revenue trend</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Daily Klaviyo-attributed revenue with campaign and flow contribution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-slate-900" aria-hidden="true" />
            Attributed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-teal-700" aria-hidden="true" />
            Campaign
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Flow
          </span>
        </div>
      </div>
      {points.length ? (
        <>
          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <svg
              role="img"
              aria-label="Klaviyo revenue trend chart"
              className="h-64 w-full overflow-visible"
              viewBox="0 0 100 48"
              preserveAspectRatio="none"
            >
              {[12, 24, 36].map((line) => (
                <line
                  key={line}
                  x1="4"
                  x2="96"
                  y1={line}
                  y2={line}
                  stroke="#e2e8f0"
                  strokeWidth="0.35"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <polyline
                points={buildPolyline(points, maxRevenue, (point) => point.flowRevenue)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={buildPolyline(points, maxRevenue, (point) => point.campaignRevenue)}
                fill="none"
                stroke="#0f766e"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={buildPolyline(points, maxRevenue, (point) => point.attributedRevenue)}
                fill="none"
                stroke="#0f172a"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div
            className="mt-3 grid gap-1 text-xs text-slate-500"
            style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          >
            {points.map((point, index) => (
              <span key={point.date} className="truncate text-center">
                {index % labelStride === 0 || index === points.length - 1 ? formatDateLabel(point.date) : ""}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Peak daily attributed revenue: {formatCurrency(maxRevenue, currencyCode)}
          </p>
        </>
      ) : (
        <EmptyPanelState message="No Klaviyo daily trend data is available for this filter yet." />
      )}
    </section>
  );
}

export function KlaviyoRevenueMixPanel({
  campaignRevenue,
  flowRevenue,
  currencyCode,
}: {
  campaignRevenue: number;
  flowRevenue: number;
  currencyCode: string;
}) {
  const total = campaignRevenue + flowRevenue;
  const campaignShare = safeRate(campaignRevenue, total) * 100;
  const flowShare = safeRate(flowRevenue, total) * 100;

  return (
    <section className={panelClassName()}>
      <h2 className="text-base font-semibold text-slate-950">Revenue mix</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Campaign revenue compared with automated flow revenue.</p>
      <div className="mt-5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <div className="flex h-3">
          <div className="bg-teal-700" style={{ width: clampPercent(campaignShare) }} aria-hidden="true" />
          <div className="bg-amber-500" style={{ width: clampPercent(flowShare) }} aria-hidden="true" />
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {[
          {
            label: "Campaigns",
            value: campaignRevenue,
            share: campaignShare,
            tone: "teal" as const,
          },
          {
            label: "Flows",
            value: flowRevenue,
            share: flowShare,
            tone: "amber" as const,
          },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                <span className={clsx("h-2 w-2 rounded-full", toneClasses[item.tone])} aria-hidden="true" />
                {item.label}
              </span>
              <span className="tabular-nums text-slate-950">{formatCurrency(item.value, currencyCode)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className={clsx("h-2 rounded-full", toneClasses[item.tone])} style={{ width: clampPercent(item.share) }} />
              </div>
              <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-500">
                {formatPercent(item.share / 100)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function KlaviyoEngagementFunnelPanel({
  recipients,
  opens,
  clicks,
  conversions,
}: {
  recipients: number;
  opens: number;
  clicks: number;
  conversions: number;
}) {
  const stages = [
    { label: "Recipients", value: recipients, rate: 1, tone: "slate" as const },
    { label: "Opens", value: opens, rate: safeRate(opens, recipients), tone: "teal" as const },
    { label: "Clicks", value: clicks, rate: safeRate(clicks, recipients), tone: "amber" as const },
    { label: "Conversions", value: conversions, rate: safeRate(conversions, recipients), tone: "rose" as const },
  ];

  return (
    <section className={panelClassName()}>
      <h2 className="text-base font-semibold text-slate-950">Engagement funnel</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Audience movement from delivery through conversion.</p>
      <div className="mt-5 space-y-4">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{stage.label}</span>
              <span className="tabular-nums text-slate-950">{formatNumber(stage.value)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className={clsx("h-2 rounded-full", toneClasses[stage.tone])} style={{ width: clampPercent(stage.rate * 100) }} />
              </div>
              <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-500">
                {stage.label === "Recipients" ? "100%" : formatPercent(stage.rate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function KlaviyoDeliverabilityPanel({
  recipients,
  unsubscribes,
  bounces,
  spamComplaints,
}: {
  recipients: number;
  unsubscribes: number;
  bounces: number;
  spamComplaints: number;
}) {
  const items: MetricBarItem[] = [
    {
      label: "Unsubscribe rate",
      formattedValue: formatPercent(safeRate(unsubscribes, recipients)),
      value: safeRate(unsubscribes, recipients),
      description: `${formatNumber(unsubscribes)} unsubscribes`,
      tone: "slate",
    },
    {
      label: "Bounce rate",
      formattedValue: formatPercent(safeRate(bounces, recipients)),
      value: safeRate(bounces, recipients),
      description: `${formatNumber(bounces)} bounces`,
      tone: "amber",
    },
    {
      label: "Spam complaint rate",
      formattedValue: formatPercent(safeRate(spamComplaints, recipients)),
      value: safeRate(spamComplaints, recipients),
      description: `${formatNumber(spamComplaints)} complaints`,
      tone: "rose",
    },
  ];

  return (
    <MetricBarsPanel
      title="Deliverability watch"
      description="Negative engagement signals divided by recipients."
      items={items}
      emptyMessage="No deliverability data is available for this filter yet."
    />
  );
}

export function KlaviyoRegionalBreakdownPanel({
  regions,
  currencyCode,
}: {
  regions: RegionalSummary[];
  currencyCode: string;
}) {
  const maxRevenue = Math.max(...regions.map((region) => region.klaviyoRevenue), 1);

  return (
    <section className={panelClassName()}>
      <h2 className="text-base font-semibold text-slate-950">Regional distribution</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Klaviyo-attributed revenue and Shopify share by region.</p>
      {regions.length ? (
        <div className="mt-5 space-y-4">
          {regions.map((region) => {
            const share = safeRate(region.klaviyoRevenue, region.shopifyRevenue);

            return (
              <div key={region.region.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-700">{region.region.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-950">
                    {formatCurrency(region.klaviyoRevenue, region.region.currency_code || currencyCode)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: clampPercent((region.klaviyoRevenue / maxRevenue) * 100) }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold tabular-nums text-slate-500">
                    {formatPercent(share)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPanelState message="No regional Klaviyo data is available for this filter yet." />
      )}
    </section>
  );
}

export function KlaviyoReportLinks({
  campaignHref,
  flowHref,
}: {
  campaignHref: string;
  flowHref: string;
}) {
  const links = [
    {
      href: campaignHref,
      title: "Campaign drill-down",
      description: "Inspect sends by revenue, engagement, conversion, recipient volume, and region.",
      icon: Mail,
    },
    {
      href: flowHref,
      title: "Flow drill-down",
      description: "Compare automation performance by date, flow, revenue density, and conversion quality.",
      icon: Workflow,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-lg border border-slate-200 bg-white p-4 transition duration-150 hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <item.icon aria-hidden="true" className="h-4 w-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition duration-150 group-hover:translate-x-0.5 group-hover:text-slate-700"
            />
          </div>
        </Link>
      ))}
    </section>
  );
}

export function LeaderboardPanel({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: LeaderboardItem[];
  emptyMessage: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className={panelClassName()}>
      <div className="flex items-center gap-2">
        <BarChart3 aria-hidden="true" className="h-4 w-4 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={item.id}>
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-slate-950">{item.formattedValue}</p>
                  {item.helper ? <p className="mt-0.5 text-xs text-slate-500">{item.helper}</p> : null}
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-slate-900" style={{ width: clampPercent((item.value / maxValue) * 100) }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanelState message={emptyMessage} />
      )}
    </section>
  );
}

export function MetricBarsPanel({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: MetricBarItem[];
  emptyMessage: string;
}) {
  return (
    <section className={panelClassName()}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="tabular-nums text-slate-950">{item.formattedValue}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className={clsx("h-2 rounded-full", toneClasses[item.tone || "slate"])}
                    style={{ width: clampPercent(item.value * 100) }}
                  />
                </div>
                <span className="w-28 truncate text-right text-xs text-slate-500">{item.description}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanelState message={emptyMessage} />
      )}
    </section>
  );
}
