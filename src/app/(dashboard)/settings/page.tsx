/*
File description:
This Settings page lets authenticated internal users manage Shopify and Klaviyo platform connections.
It loads safe connection summaries on the server, shows global status messages, and delegates the
interactive Shopify/Klaviyo guided connection modals to a client component without rendering secrets.
*/

import { ShieldCheck } from "lucide-react";
import { ReportHeader } from "@/components/report-header";
import { StatusBadge } from "@/components/status-badge";
import { SyncButton } from "@/components/sync-button";
import { getLatestSyncRun } from "@/lib/data/dashboard";
import { formatDateTime } from "@/lib/format";
import { listPlatformConnectionSummaries } from "@/lib/settings/platform-connections";
import { PlatformConnectionManager } from "./platform-connection-manager";

type SettingsSearchParams = {
  status?: string;
  error?: string;
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  const params = await searchParams;
  const [connections, latestSync] = await Promise.all([
    listPlatformConnectionSummaries(),
    getLatestSyncRun(),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <section className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Unified Shopify + Klaviyo reporting</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {latestSync ? (
                <>
                  <StatusBadge status={latestSync.status} />
                  <span className="text-slate-500">
                    Last sync: {formatDateTime(latestSync.finished_at || latestSync.started_at)}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">No sync has run yet.</span>
              )}
            </div>
          </div>
          <SyncButton />
        </div>
      </section>

      <section className="px-4 pt-5 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ReportHeader
            eyebrow="Secure configuration"
            title="Settings"
            description="Connect Shopify and Klaviyo accounts by region. Stored secrets are encrypted and never shown again."
          />
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 shadow-sm shadow-teal-100/60">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Server-side encrypted storage
          </div>
        </div>
      </section>

      {(params.status || params.error) && (
        <section className="px-4 lg:px-6">
          <div
            className={`rounded-lg border p-3 text-sm font-medium shadow-sm ${
              params.error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-teal-200 bg-teal-50 text-teal-700"
            }`}
          >
            {params.error || params.status}
          </div>
        </section>
      )}

      <PlatformConnectionManager connections={connections} />
    </div>
  );
}
