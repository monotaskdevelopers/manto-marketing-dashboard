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
      <aside className="fixed inset-y-0 left-0 hidden w-[304px] border-r border-[#e6e8eb] bg-[#f7f8fa] lg:block">
        <div className="flex h-full flex-col">
          <div className="px-4 pb-3 pt-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#646970] text-white">
                <Bot aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#767b82]">Internal reporting</p>
                <h1 className="text-[15px] font-semibold tracking-normal text-[#24272c]">Marketing Reports</h1>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AppNavigation />
          </div>
          <form action={signOutAction} className="p-3">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-start gap-3 rounded-[9px] px-3 py-2.5 text-[15px] font-medium leading-none text-[#51565d] transition-colors duration-150 hover:bg-[#eceff2] hover:text-[#24272c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#656b73]"
            >
              <LogOut aria-hidden="true" className="h-5 w-5 text-[#646970]" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-[304px]">
        <header className="sticky top-0 z-20 border-b border-[#e6e8eb] bg-[#f7f8fa]/95 backdrop-blur lg:hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[#51565d] transition hover:bg-[#eceff2] hover:text-[#24272c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#656b73] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Menu aria-hidden="true" className="h-4 w-4 text-[#646970]" />
                Navigation
              </span>
              <span className="text-xs font-medium text-[#767b82] group-open:hidden">Open</span>
              <span className="hidden text-xs font-medium text-[#767b82] group-open:inline">Close</span>
            </summary>
            <AppNavigation variant="mobile" />
          </details>
        </header>
        <main id="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
