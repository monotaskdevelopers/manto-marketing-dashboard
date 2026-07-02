/*
File description:
This client component renders the interactive Settings connection manager. It keeps Shopify and Klaviyo
connection flows separate, opens a step-by-step modal for each platform, submits credentials through
server actions, and only displays sanitized connection metadata that was loaded by the server page.
*/

"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Link2Off,
  Mail,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/status-badge";
import { buttonClassName, SelectControl, TextControl } from "@/components/ui-controls";
import { formatDateTime } from "@/lib/format";
import type { PlatformConnectionSummary } from "@/lib/types";
import {
  deactivateRegionAction,
  disconnectPlatformAction,
  savePlatformConnectionAction,
} from "./actions";

type Provider = "shopify" | "klaviyo";

type ConnectionModalState = {
  provider: Provider;
  connection: PlatformConnectionSummary | null;
};

type GuideStep = {
  title: string;
  description: string;
  bullets: string[];
};

const providerCopy: Record<
  Provider,
  {
    label: string;
    title: string;
    description: string;
    buttonLabel: string;
    connectedLabel: string;
  }
> = {
  shopify: {
    label: "Shopify",
    title: "Connect Shopify",
    description: "Create a custom app, copy the Admin API token, and save the shop domain for this region.",
    buttonLabel: "Save Shopify connection",
    connectedLabel: "Shopify",
  },
  klaviyo: {
    label: "Klaviyo",
    title: "Connect Klaviyo",
    description: "Create a private key with reporting scopes, then save it against the matching region.",
    buttonLabel: "Save Klaviyo connection",
    connectedLabel: "Klaviyo",
  },
};

const guideSteps: Record<Provider, GuideStep[]> = {
  shopify: [
    {
      title: "Open Shopify custom app setup",
      description: "Start inside the Shopify admin for the store you want to report on.",
      bullets: [
        "Open the target Shopify store admin.",
        "Go to Apps and sales channels.",
        "Open the app development or custom app area.",
        "Create a custom app for this internal reporting dashboard.",
      ],
    },
    {
      title: "Grant Admin API scopes",
      description: "Only grant the read access needed for reporting.",
      bullets: [
        "Grant read_orders.",
        "Grant read_all_orders only if the dashboard must report older historical orders.",
        "Avoid write scopes because this dashboard only reads reporting data.",
      ],
    },
    {
      title: "Install and copy credentials",
      description: "Shopify shows the Admin API token once, so copy it before leaving the screen.",
      bullets: [
        "Install the custom app.",
        "Copy the Admin API access token.",
        "Copy the store domain, for example brand-us.myshopify.com.",
      ],
    },
    {
      title: "Save Shopify in this dashboard",
      description: "Paste the shop domain and token below. Saved tokens are encrypted and never shown again.",
      bullets: [
        "Choose the same region that this store belongs to.",
        "Paste the token only when connecting or replacing it.",
        "Run manual sync after saving to confirm the credentials work.",
      ],
    },
  ],
  klaviyo: [
    {
      title: "Open Klaviyo API key settings",
      description: "Start inside the Klaviyo account that matches the reporting region.",
      bullets: [
        "Open the target Klaviyo account.",
        "Go to account settings.",
        "Open API keys.",
        "Create a private API key for this dashboard.",
      ],
    },
    {
      title: "Choose safe reporting scopes",
      description: "Use read-only or custom scopes so the dashboard cannot change Klaviyo data.",
      bullets: [
        "Grant campaigns:read.",
        "Grant flows:read.",
        "Grant metrics:read so the dashboard can detect the conversion metric ID automatically.",
        "If metrics:read is missing, the key can still be saved for campaign and flow sync.",
      ],
    },
    {
      title: "Automatic conversion metric detection",
      description: "The dashboard finds the conversion metric ID after you save the Klaviyo key.",
      bullets: [
        "No metric ID needs to be pasted manually.",
        "The server calls Klaviyo's Metrics API with fields[metric]=id,name,integration.",
        "It prefers revenue metrics like Placed Order or Ordered Product.",
        "If Klaviyo denies the lookup, sync still uses the saved key and revenue metric detection can be retried later.",
      ],
    },
    {
      title: "Copy and save the private key",
      description: "Klaviyo private keys should be copied once and stored only through this secure form.",
      bullets: [
        "Choose the same region that this Klaviyo account belongs to.",
        "Choose a clear account label, such as US Klaviyo.",
        "Paste the key only when connecting or replacing it.",
        "After saving, the dashboard encrypts the key and stores the detected metric ID when Klaviyo allows it.",
      ],
    },
  ],
};

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New York" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Denver", label: "America/Denver" },
  { value: "America/Los_Angeles", label: "America/Los Angeles" },
  { value: "America/Toronto", label: "America/Toronto" },
  { value: "America/Vancouver", label: "America/Vancouver" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Asia/Karachi", label: "Asia/Karachi" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
];

function ConnectionPill({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        connected ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {connected ? (
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
      ) : (
        <Link2Off aria-hidden="true" className="h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function PlatformIcon({ provider }: { provider: Provider }) {
  return provider === "shopify" ? (
    <ShoppingBag aria-hidden="true" className="h-5 w-5" />
  ) : (
    <Mail aria-hidden="true" className="h-5 w-5" />
  );
}

function PlatformConnectionCard({
  connection,
  onConnect,
}: {
  connection: PlatformConnectionSummary;
  onConnect: (provider: Provider, connection: PlatformConnectionSummary) => void;
}) {
  const disabled = !connection.isActive;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{connection.name}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onConnect("shopify", connection)}
          className={buttonClassName({
            variant: "secondary",
            size: "md",
            className: "w-full disabled:opacity-50",
          })}
        >
          <ShoppingBag aria-hidden="true" className="h-4 w-4" />
          {connection.shopifyConnected ? "Update Shopify" : "Connect Shopify"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onConnect("klaviyo", connection)}
          className={buttonClassName({
            variant: "secondary",
            size: "md",
            className: "w-full disabled:opacity-50",
          })}
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
          {connection.klaviyoConnected ? "Update Klaviyo" : "Connect Klaviyo"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={disconnectPlatformAction}>
          <input name="regionId" type="hidden" value={connection.regionId} />
          <input name="provider" type="hidden" value="shopify" />
          <button
            type="submit"
            disabled={disabled || !connection.shopifyConnected}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "disabled:opacity-50",
            })}
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
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "disabled:opacity-50",
            })}
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
            className={buttonClassName({
              variant: "danger",
              size: "sm",
              className: "disabled:opacity-50",
            })}
          >
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            Deactivate region
          </button>
        </form>
      </div>
    </article>
  );
}

function ConnectionFormFields({
  provider,
  connection,
}: {
  provider: Provider;
  connection: PlatformConnectionSummary | null;
}) {
  const hasExistingCredential = provider === "shopify" ? connection?.shopifyConnected : connection?.klaviyoConnected;
  const selectedTimezone = connection?.timezone || "";
  const selectedTimezoneIsListed = timezoneOptions.some((option) => option.value === selectedTimezone);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <input name="provider" type="hidden" value={provider} />
      <Field label="Region slug">
        <TextControl
          name="slug"
          required
          defaultValue={connection?.slug || ""}
          placeholder="us"
          pattern="[a-z0-9-]+"
        />
      </Field>
      <Field label="Region name">
        <TextControl
          name="name"
          required
          defaultValue={connection?.name || ""}
          placeholder="United States"
        />
      </Field>
      <Field label="Currency code">
        <TextControl
          name="currencyCode"
          required
          defaultValue={connection?.currencyCode || ""}
          placeholder="USD"
          maxLength={3}
          className="uppercase"
        />
      </Field>
      <Field label="Timezone">
        <SelectControl
          name="timezone"
          required
          defaultValue={connection?.timezone || ""}
        >
          <option value="" disabled>
            Select timezone
          </option>
          {selectedTimezone && !selectedTimezoneIsListed ? (
            <option value={selectedTimezone}>{selectedTimezone}</option>
          ) : null}
          {timezoneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectControl>
      </Field>

      {provider === "shopify" ? (
        <>
          <Field label="Shopify shop domain" className="md:col-span-2">
            <TextControl
              name="shopifyShopDomain"
              required
              defaultValue={connection?.shopifyShopDomain || ""}
              placeholder="brand-us.myshopify.com"
            />
          </Field>
          <Field label="Shopify Admin API token" className="md:col-span-2">
            <TextControl
              name="shopifyAdminAccessToken"
              type="password"
              required={!hasExistingCredential}
              placeholder={hasExistingCredential ? "Paste only when replacing the saved token" : "Paste Admin API token"}
            />
          </Field>
        </>
      ) : (
        <>
          {connection?.shopifyShopDomain ? (
            <input name="shopifyShopDomain" type="hidden" value={connection.shopifyShopDomain} />
          ) : null}
          <Field label="Klaviyo account label">
            <TextControl
              name="klaviyoAccountLabel"
              required
              defaultValue={connection?.klaviyoAccountLabel || connection?.name || ""}
              placeholder="US Klaviyo"
            />
          </Field>
          <div className="rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm leading-6 text-teal-800">
            The conversion metric ID is detected automatically from Klaviyo after save when the private
            key includes metrics:read. The key is still saved for campaign and flow sync if that lookup is blocked.
          </div>
          <Field label="Klaviyo private key" className="md:col-span-2">
            <TextControl
              name="klaviyoPrivateKey"
              type="password"
              required={!hasExistingCredential}
              placeholder={hasExistingCredential ? "Paste only when replacing the saved key" : "Paste private API key"}
            />
          </Field>
        </>
      )}

      <p className="md:col-span-2 text-sm leading-6 text-slate-500">
        Saved secrets are encrypted and cannot be viewed again. Existing keys stay unchanged when the
        password field is left blank.
      </p>
    </div>
  );
}

function GuidedConnectionModal({
  modal,
  stepIndex,
  onStepChange,
  onClose,
}: {
  modal: ConnectionModalState;
  stepIndex: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const copy = providerCopy[modal.provider];
  const steps = guideSteps[modal.provider];
  const step = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        aria-modal="true"
        role="dialog"
        aria-labelledby="platform-connection-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/15"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <PlatformIcon provider={modal.provider} />
            </div>
            <div>
              <h2 id="platform-connection-title" className="text-lg font-semibold text-slate-950">
                {copy.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{copy.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "h-9 w-9 shrink-0 px-0",
            })}
            aria-label="Close connection guide"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <form action={savePlatformConnectionAction} className="overflow-y-auto px-4 py-4 sm:px-5">
          <div
            className="mb-5 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            aria-label={`${copy.label} setup progress`}
          >
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onStepChange(index)}
                className={`h-2 rounded-full ${
                  index <= stepIndex ? "bg-teal-600" : "bg-slate-200"
                }`}
                aria-label={`Go to step ${index + 1}: ${item.title}`}
              />
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold text-teal-700">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-950">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {step.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal-600" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {isFinalStep ? (
            <div className="mt-5">
              <h3 className="mb-3 text-base font-semibold text-slate-950">
                {modal.connection ? `Save ${copy.label} for ${modal.connection.name}` : `Save new ${copy.label} connection`}
              </h3>
              <ConnectionFormFields provider={modal.provider} connection={modal.connection} />
            </div>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => (stepIndex === 0 ? onClose() : onStepChange(stepIndex - 1))}
              className={buttonClassName({ variant: "secondary", size: "md" })}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              {stepIndex === 0 ? "Close" : "Back"}
            </button>

            {isFinalStep ? (
              <button
                type="submit"
                className={buttonClassName({ variant: "primary", size: "md" })}
              >
                <KeyRound aria-hidden="true" className="h-4 w-4" />
                {copy.buttonLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStepChange(stepIndex + 1)}
                className={buttonClassName({ variant: "primary", size: "md" })}
              >
                Next
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function PlatformConnectionManager({
  connections,
}: {
  connections: PlatformConnectionSummary[];
}) {
  const [modal, setModal] = useState<ConnectionModalState | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  function openModal(provider: Provider, connection: PlatformConnectionSummary | null = null) {
    setModal({ provider, connection });
    setStepIndex(0);
  }

  return (
    <>
      <section className="px-4 lg:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Connect a platform</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Start Shopify and Klaviyo separately. Each flow opens a guided setup modal and stores only
                encrypted credentials.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={() => openModal("shopify")}
                className={buttonClassName({ variant: "primary", size: "lg", className: "w-full" })}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Connect Shopify
              </button>
              <button
                type="button"
                onClick={() => openModal("klaviyo")}
                className={buttonClassName({ variant: "secondary", size: "lg", className: "w-full" })}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Connect Klaviyo
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Configured regions</h2>
          <span className="text-sm text-slate-500">{connections.length} total</span>
        </div>
        {connections.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {connections.map((connection) => (
              <PlatformConnectionCard
                key={connection.regionId}
                connection={connection}
                onConnect={openModal}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/60">
            No regions are configured yet. Use Connect Shopify or Connect Klaviyo to add the first region.
          </div>
        )}
      </section>

      {modal ? (
        <GuidedConnectionModal
          modal={modal}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onClose={() => setModal(null)}
        />
      ) : null}
    </>
  );
}
