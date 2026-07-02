/*
File description:
This Settings page lets authenticated internal users manage Shopify and Klaviyo platform connections.
It shows safe connection statuses, step-by-step setup guidance, and server-action forms that save encrypted
credentials without ever rendering stored secrets back to the browser.
*/

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Link2Off,
  Plug,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { listPlatformConnectionSummaries } from "@/lib/settings/platform-connections";
import type { PlatformConnectionSummary } from "@/lib/types";
import {
  deactivateRegionAction,
  disconnectPlatformAction,
  savePlatformConnectionAction,
} from "./actions";

type SettingsSearchParams = {
  status?: string;
  error?: string;
};

function ConnectionPill({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
        connected ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {connected ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <Link2Off aria-hidden="true" className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function GuidePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  );
}

function PlatformConnectionCard({ connection }: { connection: PlatformConnectionSummary }) {
  const disabled = !connection.isActive;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{connection.name}</h2>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {connection.slug}
            </span>
            <StatusBadge status={connection.isActive ? "success" : "failed"} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {connection.currencyCode} · {connection.timezone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConnectionPill connected={connection.shopifyConnected} label="Shopify" />
          <ConnectionPill connected={connection.klaviyoConnected} label="Klaviyo" />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Shopify shop</dt>
          <dd className="mt-1 text-slate-900">{connection.shopifyShopDomain || "Not configured"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Klaviyo account</dt>
          <dd className="mt-1 text-slate-900">{connection.klaviyoAccountLabel || "Not configured"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Shopify connected</dt>
          <dd className="mt-1 text-slate-900">
            {connection.shopifyConnectedAt ? formatDateTime(connection.shopifyConnectedAt) : "No"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Klaviyo connected</dt>
          <dd className="mt-1 text-slate-900">
            {connection.klaviyoConnectedAt ? formatDateTime(connection.klaviyoConnectedAt) : "No"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={disconnectPlatformAction}>
          <input name="regionId" type="hidden" value={connection.regionId} />
          <input name="provider" type="hidden" value="shopify" />
          <button
            type="submit"
            disabled={disabled || !connection.shopifyConnected}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2Off aria-hidden="true" className="h-4 w-4" />
            Disconnect Shopify
          </button>
        </form>
        <form action={disconnectPlatformAction}>
          <input name="regionId" type="hidden" value={connection.regionId} />
          <input name="provider" type="hidden" value="klaviyo" />
          <button
            type="submit"
            disabled={disabled || !connection.klaviyoConnected}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2Off aria-hidden="true" className="h-4 w-4" />
            Disconnect Klaviyo
          </button>
        </form>
        <form action={deactivateRegionAction}>
          <input name="regionId" type="hidden" value={connection.regionId} />
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            Deactivate region
          </button>
        </form>
      </div>
    </article>
  );
}

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

      <section className="grid gap-4 px-4 xl:grid-cols-2 lg:px-6">
        <GuidePanel title="Create a Shopify connection">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create a Shopify custom app through the current Shopify app creation flow.</li>
            <li>Grant `read_orders`; add `read_all_orders` only when old historical orders are required.</li>
            <li>Install the app and copy the Admin API access token.</li>
            <li>Copy the shop domain, for example `brand-us.myshopify.com`.</li>
            <li>Paste the shop domain and token into the connection form below.</li>
          </ol>
        </GuidePanel>
        <GuidePanel title="Create a Klaviyo connection">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Create a private API key in the target Klaviyo account.</li>
            <li>Use read-only or custom scopes.</li>
            <li>Grant `campaigns:read` and `flows:read`.</li>
            <li>Copy the private key immediately; Klaviyo will not display it again.</li>
            <li>Add a conversion metric ID only when revenue attribution needs an explicit metric.</li>
          </ol>
        </GuidePanel>
      </section>

      <section className="px-4 lg:px-6">
        <form action={savePlatformConnectionAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plug aria-hidden="true" className="h-5 w-5 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-950">Connect or update a region</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Region slug
              <input
                name="slug"
                required
                placeholder="us"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Region name
              <input
                name="name"
                required
                placeholder="United States"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Currency code
              <input
                name="currencyCode"
                required
                placeholder="USD"
                maxLength={3}
                className="h-10 rounded-md border border-slate-300 px-3 text-sm uppercase text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Timezone
              <input
                name="timezone"
                required
                placeholder="America/New_York"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Shopify shop domain
              <input
                name="shopifyShopDomain"
                required
                placeholder="brand-us.myshopify.com"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Shopify Admin API token
              <input
                name="shopifyAdminAccessToken"
                type="password"
                placeholder="Paste only when connecting or replacing"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Klaviyo account label
              <input
                name="klaviyoAccountLabel"
                placeholder="US Klaviyo"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Klaviyo private key
              <input
                name="klaviyoPrivateKey"
                type="password"
                placeholder="Paste only when connecting or replacing"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
              Klaviyo conversion metric ID
              <input
                name="klaviyoConversionMetricId"
                placeholder="Optional"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Saved secrets are encrypted and cannot be viewed again. Paste a new key only when connecting or replacing it.
            </p>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <KeyRound aria-hidden="true" className="h-4 w-4" />
              Save connection
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Configured regions</h2>
          <span className="text-sm text-slate-500">{connections.length} total</span>
        </div>
        {connections.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {connections.map((connection) => (
              <PlatformConnectionCard key={connection.regionId} connection={connection} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No regions are configured yet. Add the first Shopify and Klaviyo connection above.
          </div>
        )}
      </section>
    </div>
  );
}
