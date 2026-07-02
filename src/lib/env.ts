/*
File description:
This file centralizes environment variable access. It keeps secrets server-only, avoids module-scope
client initialization, and gives route handlers clear configuration errors instead of silently running
with missing credentials.
*/

import "server-only";

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseServiceRoleKey() {
  return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getCronSecret() {
  return readRequiredEnv("CRON_SECRET");
}

export function getAppEncryptionKey() {
  return readRequiredEnv("APP_ENCRYPTION_KEY");
}

export function getKlaviyoRevision() {
  return process.env.KLAVIYO_REVISION || "2026-04-15";
}

export function getShopifyApiVersion() {
  return process.env.SHOPIFY_API_VERSION || "2026-07";
}
