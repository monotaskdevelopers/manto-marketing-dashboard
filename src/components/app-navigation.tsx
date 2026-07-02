/*
File description:
This client-side navigation component renders the dashboard's nested analytics hierarchy with active-route
styling. Keeping the route awareness here lets the server app shell stay responsible for authentication
and sync metadata while the navigation still gives users a clear, grouped sense of location.
*/

"use client";

import {
  BarChart3,
  ChartNoAxesCombined,
  ChevronDown,
  LayoutDashboard,
  Mail,
  Map,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationLeaf = {
  type: "link";
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavigationBranch = {
  type: "group";
  label: string;
  icon: typeof LayoutDashboard;
  items: NavigationItem[];
};

type NavigationItem = NavigationLeaf | NavigationBranch;

// Keep the visible sidebar hierarchy in one tree so desktop and mobile navigation cannot drift apart.
const analyticsNavigation: NavigationBranch = {
  type: "group",
  label: "Analytics",
  icon: ChartNoAxesCombined,
  items: [
    { type: "link", href: "/", label: "Overview", icon: LayoutDashboard, exact: true },
    {
      type: "group",
      label: "Klaviyo",
      icon: Mail,
      items: [
        { type: "link", href: "/klaviyo", label: "Overview", icon: LayoutDashboard, exact: true },
        { type: "link", href: "/klaviyo/campaigns", label: "Campaigns", icon: BarChart3 },
        { type: "link", href: "/klaviyo/flows", label: "Flows", icon: ChartNoAxesCombined },
      ],
    },
    {
      type: "group",
      label: "Shopify",
      icon: ShoppingBag,
      items: [
        { type: "link", href: "/shopify", label: "Overview", icon: LayoutDashboard, exact: true },
        { type: "link", href: "/shopify/regional", label: "Regional Performance", icon: Map },
      ],
    },
  ],
};

const utilityNavigation: NavigationLeaf[] = [
  { type: "link", href: "/settings", label: "Settings", icon: Settings },
];

function isActivePath(pathname: string, item: NavigationLeaf) {
  if (item.exact || item.href === "/") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function matchesHref(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemIsActive(pathname: string, item: NavigationItem): boolean {
  if (item.type === "link") {
    return isActivePath(pathname, item);
  }

  // A parent dropdown is active whenever any child link points at the current route.
  return item.items.some((child) => itemIsActive(pathname, child));
}

function NavigationLink({
  item,
  pathname,
  variant,
  depth,
}: {
  item: NavigationLeaf;
  pathname: string;
  variant: "sidebar" | "mobile";
  depth: number;
}) {
  const active = isActivePath(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group inline-flex min-w-0 items-center gap-3 rounded-lg text-sm font-semibold transition duration-150",
        variant === "sidebar" ? "px-3 py-2.5" : "px-3 py-2",
        depth > 0 && "ml-4",
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
}

function NavigationGroup({
  item,
  pathname,
  variant,
  depth = 0,
}: {
  item: NavigationBranch;
  pathname: string;
  variant: "sidebar" | "mobile";
  depth?: number;
}) {
  const active = itemIsActive(pathname, item);
  const hasDescendantPath = item.items.some((child) =>
    child.type === "link" ? matchesHref(pathname, child.href) : itemIsActive(pathname, child),
  );
  // The root Analytics section stays open so users never land on a blank-looking navigation panel.
  const open = depth === 0 || active || hasDescendantPath;

  return (
    <details className={clsx("group/nav min-w-0", depth > 0 && "ml-4")} open={open}>
      <summary
        className={clsx(
          "flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition duration-150 hover:bg-white hover:text-slate-950 hover:shadow-sm hover:shadow-slate-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 [&::-webkit-details-marker]:hidden",
          active && "bg-slate-100 text-slate-950",
        )}
      >
        <item.icon aria-hidden="true" className={clsx("h-4 w-4 shrink-0", active ? "text-teal-700" : "text-slate-400")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-open/nav:rotate-180" />
      </summary>
      <div className="mt-1 flex min-w-0 flex-col gap-1 border-l border-slate-200/80 pl-2">
        {item.items.map((child) =>
          child.type === "link" ? (
            <NavigationLink
              key={child.href}
              item={child}
              pathname={pathname}
              variant={variant}
              depth={depth + 1}
            />
          ) : (
            <NavigationGroup
              key={child.label}
              item={child}
              pathname={pathname}
              variant={variant}
              depth={depth + 1}
            />
          ),
        )}
      </div>
    </details>
  );
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
        variant === "sidebar" ? "flex flex-col gap-2 px-3 py-4" : "flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-4 py-3",
      )}
      aria-label="Dashboard navigation"
    >
      <NavigationGroup item={analyticsNavigation} pathname={pathname} variant={variant} />
      <div className="mt-2 border-t border-slate-200/80 pt-2">
        {utilityNavigation.map((item) => (
          <NavigationLink key={item.href} item={item} pathname={pathname} variant={variant} depth={0} />
        ))}
      </div>
    </nav>
  );
}
