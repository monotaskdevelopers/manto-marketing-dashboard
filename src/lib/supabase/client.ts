/*
File description:
This browser Supabase helper creates a client for Client Components that need authenticated browser
behavior. It only uses public Supabase environment variables and must never receive service-role keys.
*/

"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
