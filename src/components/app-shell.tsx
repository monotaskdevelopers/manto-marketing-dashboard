/*
File description:
This authenticated app shell provides dashboard navigation, sync status, manual sync access, and sign-out.
It wraps all protected pages so users get a consistent internal-tool layout without duplicating navigation.
*/

import {
  BarChart3,
  Bot,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/auth/actions";
import { formatDateTime } from "@/lib/format";
import type { SyncRun } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { SyncButton } from "@/components/sync-button";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/regional", label: "Regional", icon: Map },
  { href: "/shopify", label: "Shopify", icon: ShoppingBag },
  { href: "/klaviyo", label: "Klaviyo", icon: Mail },
  { href: "/campaigns", label: "Campaigns", icon: BarChart3 },
  { href: "/flows", label: "Flows", icon: ChartNoAxesCombined },
];

export function AppShell({
  children,
  latestSync,
}: {
  children: ReactNode;
  latestSync: SyncRun | null;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-teal-700 p-2 text-white">
                <Bot aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">Internal</p>
                <h1 className="text-base font-semibold text-slate-950">Marketing Reports</h1>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOutAction} className="border-t border-slate-200 p-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Unified Shopify + Klaviyo reporting</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {latestSync ? (
                  <>
                    <StatusBadge status={latestSync.status} />
                    <span className="text-sm text-slate-500">
                      Last sync: {formatDateTime(latestSync.finished_at || latestSync.started_at)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">No sync has run yet.</span>
                )}
              </div>
            </div>
            <SyncButton />
          </div>
          <nav className="grid grid-cols-2 gap-1 border-t border-slate-100 px-4 py-2 sm:flex sm:overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:justify-start sm:gap-2 sm:px-3 sm:text-sm"
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
