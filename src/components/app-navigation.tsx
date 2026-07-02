/*
File description:
This client-side navigation component renders the dashboard sidebar with a top-level Dashboard entry,
nested analytics report groups, and active-route styling. Keeping route awareness here lets the server
app shell stay responsible for authentication and sync metadata.
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

// Primary workspace links stay outside report groups so users can return to the main dashboard quickly.
const primaryNavigation: NavigationLeaf[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
];

// Keep analytics report hierarchy in one tree so desktop and mobile navigation cannot drift apart.
const analyticsNavigation: NavigationBranch = {
  type: "group",
  label: "Analytics",
  icon: ChartNoAxesCombined,
  items: [
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

// Sidebar rows intentionally use a flat, monochrome treatment so the nav matches the Klaviyo-style rail
// without changing the route tree or the labels users already rely on.
const navRowClassName =
  "group flex min-h-11 min-w-0 items-center gap-3 self-stretch rounded-[9px] text-[15px] font-medium leading-none tracking-normal transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#656b73]";
const inactiveRowClassName = "text-[#51565d] hover:bg-[#eceff2] hover:text-[#24272c]";
const activeLeafClassName = "bg-[#e4e7eb] text-[#24272c]";
const mutedIconClassName = "h-5 w-5 shrink-0 text-[#646970]";

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
        navRowClassName,
        variant === "sidebar" ? "px-3 py-2.5" : "px-3 py-2.5",
        depth > 0 && "ml-5",
        active ? activeLeafClassName : inactiveRowClassName,
      )}
    >
      <item.icon aria-hidden="true" className={mutedIconClassName} />
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
    <details className={clsx("group/nav min-w-0", depth > 0 && "ml-5")} open={open}>
      <summary
        className={clsx(
          navRowClassName,
          "cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden",
          active ? "text-[#24272c]" : inactiveRowClassName,
        )}
      >
        <item.icon aria-hidden="true" className={mutedIconClassName} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[#62676e] transition-transform duration-150 group-open/nav:rotate-180"
        />
      </summary>
      <div className="mt-1 flex min-w-0 flex-col gap-1">
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
        variant === "sidebar"
          ? "flex flex-col gap-1 px-3 py-4"
          : "flex max-h-[55vh] flex-col gap-1 overflow-y-auto px-4 py-3",
      )}
      aria-label="Dashboard navigation"
    >
      {primaryNavigation.map((item) => (
        <NavigationLink key={item.href} item={item} pathname={pathname} variant={variant} depth={0} />
      ))}
      <NavigationGroup item={analyticsNavigation} pathname={pathname} variant={variant} />
      <div className="mt-3 flex flex-col gap-1 pt-2">
        {utilityNavigation.map((item) => (
          <NavigationLink key={item.href} item={item} pathname={pathname} variant={variant} depth={0} />
        ))}
      </div>
    </nav>
  );
}
