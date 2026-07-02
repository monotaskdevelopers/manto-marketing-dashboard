/*
File description:
This client-side navigation component renders the dashboard links with active-route styling. Keeping the
route awareness here lets the server app shell stay responsible for authentication and sync metadata while
the navigation still gives users a clear sense of location.
*/

"use client";

import {
  BarChart3,
  ChartNoAxesCombined,
  LayoutDashboard,
  Mail,
  Map,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/regional", label: "Regional", icon: Map },
  { href: "/shopify", label: "Shopify", icon: ShoppingBag },
  { href: "/klaviyo", label: "Klaviyo", icon: Mail },
  { href: "/campaigns", label: "Campaigns", icon: BarChart3 },
  { href: "/flows", label: "Flows", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={clsx(
        variant === "sidebar" ? "flex flex-col gap-1 px-3 py-4" : "flex gap-2 overflow-x-auto px-4 py-3",
      )}
      aria-label="Dashboard navigation"
    >
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "group inline-flex min-w-0 items-center gap-3 rounded-full text-sm font-semibold transition duration-150",
              variant === "sidebar" ? "px-3 py-2.5" : "shrink-0 px-3 py-2",
              active
                ? "bg-slate-950 text-white shadow-sm shadow-slate-950/10"
                : "text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-sm hover:shadow-slate-200/70",
            )}
          >
            <item.icon
              aria-hidden="true"
              className={clsx("h-4 w-4 shrink-0", active ? "text-teal-200" : "text-slate-400 group-hover:text-teal-700")}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
