/*
File description:
This server-only service manages database-backed Shopify and Klaviyo platform connections. It returns
sanitized connection summaries for the Settings page, encrypts new credentials before saving, decrypts
active credentials only for sync, and removes ciphertext when a platform is disconnected.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import { demoRegions } from "@/lib/config/demo-regions";
import { encryptSecret, decryptSecret } from "@/lib/security/secret-encryption";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PlatformConnectionSummary, RegionIntegrationConfig } from "@/lib/types";

type RegionDbRow = {
  id: string;
  slug: string;
  name: string;
  currency_code: string;
  timezone: string;
  shopify_shop_domain: string | null;
  klaviyo_account_label: string | null;
  is_active: boolean;
  updated_at: string;
};

type PlatformConnectionDbRow = {
  id: string;
  region_id: string;
  shopify_shop_domain: string | null;
  shopify_admin_token_ciphertext: string | null;
  shopify_connected_at: string | null;
  shopify_disconnected_at: string | null;
  klaviyo_account_label: string | null;
  klaviyo_private_key_ciphertext: string | null;
  klaviyo_conversion_metric_id: string | null;
  klaviyo_connected_at: string | null;
  klaviyo_disconnected_at: string | null;
  updated_at: string;
};

export type SavePlatformConnectionInput = {
  slug: string;
  name: string;
  currencyCode: string;
  timezone: string;
  shopifyShopDomain: string;
  shopifyAdminAccessToken?: string;
  klaviyoPrivateKey?: string;
  klaviyoAccountLabel?: string;
  klaviyoConversionMetricId?: string;
  userId: string;
};

export type DisconnectPlatformInput = {
  regionId: string;
  provider: "shopify" | "klaviyo";
  userId: string;
};

function assertNotDemoMode() {
  if (isDemoMode()) {
    throw new Error("Disable demo mode before changing platform connections.");
  }
}

function normalizeSlug(value: string) {
  const slug = value.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Region slug can only contain lowercase letters, numbers, and dashes.");
  }

  return slug;
}

function normalizeCurrencyCode(value: string) {
  const currencyCode = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("Currency code must be a three-letter ISO code like USD, GBP, or EUR.");
  }

  return currencyCode;
}

function normalizeShopDomain(value: string) {
  const domain = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!/^[a-z0-9][a-z0-9.-]*\.myshopify\.com$/.test(domain)) {
    throw new Error("Shopify shop domain must look like example.myshopify.com.");
  }

  return domain;
}

function optionalTrim(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function toSummary(region: RegionDbRow, connection?: PlatformConnectionDbRow): PlatformConnectionSummary {
  const shopifyConnected = Boolean(
    connection?.shopify_admin_token_ciphertext && !connection.shopify_disconnected_at,
  );
  const klaviyoConnected = Boolean(
    connection?.klaviyo_private_key_ciphertext && !connection.klaviyo_disconnected_at,
  );

  return {
    id: connection?.id || null,
    regionId: region.id,
    slug: region.slug,
    name: region.name,
    currencyCode: region.currency_code,
    timezone: region.timezone,
    isActive: region.is_active,
    shopifyShopDomain: connection?.shopify_shop_domain || region.shopify_shop_domain,
    shopifyConnected,
    shopifyConnectedAt: connection?.shopify_connected_at || null,
    shopifyDisconnectedAt: connection?.shopify_disconnected_at || null,
    klaviyoAccountLabel: connection?.klaviyo_account_label || region.klaviyo_account_label,
    klaviyoConnected,
    klaviyoConnectedAt: connection?.klaviyo_connected_at || null,
    klaviyoDisconnectedAt: connection?.klaviyo_disconnected_at || null,
    klaviyoConversionMetricId: connection?.klaviyo_conversion_metric_id || null,
    updatedAt: connection?.updated_at || region.updated_at,
  };
}

export async function listPlatformConnectionSummaries(): Promise<PlatformConnectionSummary[]> {
  if (isDemoMode()) {
    return demoRegions.map((region) => ({
      id: `demo-${region.slug}`,
      regionId: `demo-${region.slug}`,
      slug: region.slug,
      name: region.name,
      currencyCode: region.currencyCode,
      timezone: region.timezone,
      isActive: true,
      shopifyShopDomain: region.shopifyShopDomain,
      shopifyConnected: true,
      shopifyConnectedAt: new Date().toISOString(),
      shopifyDisconnectedAt: null,
      klaviyoAccountLabel: region.klaviyoAccountLabel || region.name,
      klaviyoConnected: true,
      klaviyoConnectedAt: new Date().toISOString(),
      klaviyoDisconnectedAt: null,
      klaviyoConversionMetricId: region.klaviyoConversionMetricId || null,
      updatedAt: new Date().toISOString(),
    }));
  }

  const admin = getSupabaseAdmin();
  const [{ data: regions, error: regionsError }, { data: connections, error: connectionsError }] =
    await Promise.all([
      admin.from("regions").select("*").order("name", { ascending: true }),
      admin.from("platform_connections").select("*"),
    ]);

  if (regionsError) {
    throw new Error("Unable to load regions.");
  }

  if (connectionsError) {
    throw new Error("Unable to load platform connections.");
  }

  const connectionByRegionId = new Map(
    ((connections || []) as PlatformConnectionDbRow[]).map((connection) => [
      connection.region_id,
      connection,
    ]),
  );

  return ((regions || []) as RegionDbRow[]).map((region) =>
    toSummary(region, connectionByRegionId.get(region.id)),
  );
}

export async function savePlatformConnection(input: SavePlatformConnectionInput) {
  assertNotDemoMode();

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug);
  const currencyCode = normalizeCurrencyCode(input.currencyCode);
  const shopDomain = normalizeShopDomain(input.shopifyShopDomain);
  const shopifyToken = optionalTrim(input.shopifyAdminAccessToken);
  const klaviyoPrivateKey = optionalTrim(input.klaviyoPrivateKey);
  const klaviyoAccountLabel = optionalTrim(input.klaviyoAccountLabel) || input.name.trim();
  const klaviyoConversionMetricId = optionalTrim(input.klaviyoConversionMetricId);

  if (!input.name.trim() || !input.timezone.trim()) {
    throw new Error("Region name and timezone are required.");
  }

  const { data: region, error: regionError } = await admin
    .from("regions")
    .upsert(
      {
        slug,
        name: input.name.trim(),
        currency_code: currencyCode,
        timezone: input.timezone.trim(),
        shopify_shop_domain: shopDomain,
        klaviyo_account_label: klaviyoAccountLabel,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "slug" },
    )
    .select("id,slug")
    .single();

  if (regionError || !region) {
    throw new Error("Unable to save region details.");
  }

  const { data: existing } = await admin
    .from("platform_connections")
    .select("*")
    .eq("region_id", region.id)
    .maybeSingle();

  const existingConnection = existing as PlatformConnectionDbRow | null;

  if (!existingConnection && !shopifyToken && !klaviyoPrivateKey) {
    throw new Error("Paste at least one Shopify or Klaviyo credential for a new connection.");
  }

  const payload: Record<string, string | null> = {
    region_id: region.id,
    shopify_shop_domain: shopDomain,
    klaviyo_account_label: klaviyoAccountLabel,
    klaviyo_conversion_metric_id: klaviyoConversionMetricId,
    updated_by: input.userId,
    updated_at: now,
  };

  if (!existingConnection) {
    payload.created_by = input.userId;
    payload.created_at = now;
  }

  if (shopifyToken) {
    payload.shopify_admin_token_ciphertext = encryptSecret(shopifyToken);
    payload.shopify_connected_at = now;
    payload.shopify_disconnected_at = null;
  }

  if (klaviyoPrivateKey) {
    payload.klaviyo_private_key_ciphertext = encryptSecret(klaviyoPrivateKey);
    payload.klaviyo_connected_at = now;
    payload.klaviyo_disconnected_at = null;
  }

  const { error: connectionError } = existingConnection
    ? await admin.from("platform_connections").update(payload).eq("id", existingConnection.id)
    : await admin.from("platform_connections").insert(payload);

  if (connectionError) {
    throw new Error("Unable to save platform connection.");
  }

  console.info(`[settings:connections] Saved platform connection metadata for region ${slug}.`);
}

export async function disconnectPlatform(input: DisconnectPlatformInput) {
  assertNotDemoMode();

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const update =
    input.provider === "shopify"
      ? {
          shopify_admin_token_ciphertext: null,
          shopify_connected_at: null,
          shopify_disconnected_at: now,
          updated_by: input.userId,
          updated_at: now,
        }
      : {
          klaviyo_private_key_ciphertext: null,
          klaviyo_connected_at: null,
          klaviyo_disconnected_at: now,
          updated_by: input.userId,
          updated_at: now,
        };

  const { error } = await admin
    .from("platform_connections")
    .update(update)
    .eq("region_id", input.regionId);

  if (error) {
    throw new Error(`Unable to disconnect ${input.provider}.`);
  }

  console.info(`[settings:connections] Disconnected ${input.provider} for region ${input.regionId}.`);
}

export async function deactivateRegion(regionId: string, userId: string) {
  assertNotDemoMode();

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error: regionError } = await admin
    .from("regions")
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq("id", regionId);

  if (regionError) {
    throw new Error("Unable to deactivate region.");
  }

  const { error: connectionError } = await admin
    .from("platform_connections")
    .update({
      shopify_admin_token_ciphertext: null,
      shopify_connected_at: null,
      shopify_disconnected_at: now,
      klaviyo_private_key_ciphertext: null,
      klaviyo_connected_at: null,
      klaviyo_disconnected_at: now,
      updated_by: userId,
      updated_at: now,
    })
    .eq("region_id", regionId);

  if (connectionError) {
    throw new Error("Region deactivated, but platform secrets could not be removed.");
  }

  console.info(`[settings:connections] Deactivated region ${regionId}.`);
}

export async function getActiveRegionConnectionConfigs(): Promise<RegionIntegrationConfig[]> {
  const admin = getSupabaseAdmin();
  const [{ data: regions, error: regionsError }, { data: connections, error: connectionsError }] =
    await Promise.all([
      admin.from("regions").select("*").eq("is_active", true),
      admin
        .from("platform_connections")
        .select("*")
        .not("shopify_admin_token_ciphertext", "is", null)
        .not("klaviyo_private_key_ciphertext", "is", null)
        .is("shopify_disconnected_at", null)
        .is("klaviyo_disconnected_at", null),
    ]);

  if (regionsError || connectionsError) {
    throw new Error("Unable to load active platform connections.");
  }

  const regionById = new Map(((regions || []) as RegionDbRow[]).map((region) => [region.id, region]));

  return ((connections || []) as PlatformConnectionDbRow[]).flatMap((connection) => {
    const region = regionById.get(connection.region_id);

    if (!region || !connection.shopify_admin_token_ciphertext || !connection.klaviyo_private_key_ciphertext) {
      return [];
    }

    // Decryption stays inside this server-only boundary; callers receive only the config needed for sync.
    return [
      {
        slug: region.slug,
        name: region.name,
        currencyCode: region.currency_code,
        timezone: region.timezone,
        shopifyShopDomain: connection.shopify_shop_domain || region.shopify_shop_domain || "",
        shopifyAdminAccessToken: decryptSecret(connection.shopify_admin_token_ciphertext),
        klaviyoPrivateKey: decryptSecret(connection.klaviyo_private_key_ciphertext),
        klaviyoAccountLabel: connection.klaviyo_account_label || region.klaviyo_account_label || region.name,
        klaviyoConversionMetricId: connection.klaviyo_conversion_metric_id || undefined,
      },
    ];
  });
}
