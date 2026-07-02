/*
File description:
This authenticated dashboard layout requires a Supabase user before rendering protected report pages.
It also loads the latest sync status for the shared app shell so every page shows data freshness.
*/

import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getLatestSyncRun } from "@/lib/data/dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  const latestSync = await getLatestSyncRun();

  return <AppShell latestSync={latestSync}>{children}</AppShell>;
}
