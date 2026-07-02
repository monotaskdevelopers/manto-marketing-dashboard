/*
File description:
This file creates a lazy Supabase admin client for server-only sync operations. It uses the service-role
key to write normalized reporting data and is intentionally isolated from browser/client modules.
*/

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/env";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!cachedAdminClient) {
    const { url } = getSupabasePublicEnv();

    cachedAdminClient = createClient(url, getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedAdminClient;
}
