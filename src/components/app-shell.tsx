/*
File description:
This authenticated app shell provides dashboard navigation, mobile navigation access, and sign-out. It
wraps protected pages so route content can own page-specific headers without duplicating sidebar behavior.
*/

import {
  Bot,
  LogOut,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/auth/actions";
import { AppNavigation } from "@/components/app-navigation";
import { buttonClassName } from "@/components/ui-controls";

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <a
        href="#dashboard-main"
        className="sr-only z-50 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip To Main Content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200/80 bg-white/95 backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200/80 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm shadow-slate-950/15">
                <Bot aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-700">Internal reporting</p>
                <h1 className="text-base font-semibold text-slate-950">Marketing Reports</h1>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <AppNavigation />
          </div>
          <form action={signOutAction} className="border-t border-slate-200/80 p-3">
            <button
              type="submit"
              className={buttonClassName({
                variant: "ghost",
                size: "md",
                className: "w-full justify-start px-3",
              })}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur lg:hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Menu aria-hidden="true" className="h-4 w-4 text-slate-400" />
                Navigation
              </span>
              <span className="text-xs font-semibold text-slate-400 group-open:hidden">Open</span>
              <span className="hidden text-xs font-semibold text-slate-400 group-open:inline">Close</span>
            </summary>
            <AppNavigation variant="mobile" />
          </details>
        </header>
        <main id="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
