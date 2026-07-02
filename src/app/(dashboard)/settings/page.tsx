/*
File description:
This Settings page lets authenticated internal users manage Shopify and Klaviyo platform connections.
It loads safe connection summaries on the server, shows global status messages, and delegates the
interactive Shopify/Klaviyo guided connection modals to a client component without rendering secrets.
*/

import { Settings, ShieldCheck } from "lucide-react";
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
  const connections = await listPlatformConnectionSummaries();

  return (
    <div className="space-y-6 pb-10">
      <section className="border-b border-slate-200 bg-white px-4 py-5 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal text-slate-950">
              <Settings aria-hidden="true" className="h-6 w-6 text-teal-700" />
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Connect Shopify and Klaviyo accounts by region. Stored secrets are encrypted and never shown again.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Server-side encrypted storage
          </div>
        </div>
      </section>

      {(params.status || params.error) && (
        <section className="px-4 lg:px-6">
          <div
            className={`rounded-lg border p-3 text-sm font-medium ${
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
