/*
File description:
This file contains server-side authentication helpers for the dashboard. It gives pages and API routes
a single way to require an internal Supabase user while allowing documented demo mode during local setup.
*/

import "server-only";

import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemoMode()) {
    return {
      id: "demo-user",
      email: "demo@example.com",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string } | undefined;

  if (error || !claims?.sub) {
    return null;
  }

  return {
    id: claims.sub,
    email: claims.email || "Internal user",
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
