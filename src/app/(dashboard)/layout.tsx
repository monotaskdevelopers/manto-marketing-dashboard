/*
File description:
This authenticated dashboard layout requires a Supabase user before rendering protected report pages.
It wraps protected pages in the shared app shell while page-specific surfaces decide whether to show sync
status or manual refresh controls.
*/

import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
