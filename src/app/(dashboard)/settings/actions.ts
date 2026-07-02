/*
File description:
This file contains server actions for the Settings page. It validates the signed-in internal user, sends
platform connection changes to the server-only connection service, and redirects with sanitized status
messages that never include Shopify or Klaviyo secrets.
*/

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  deactivateRegion,
  disconnectPlatform,
  savePlatformConnection,
} from "@/lib/settings/platform-connections";

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function settingsRedirect(params: { status?: string; error?: string }): never {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  redirect(`/settings?${searchParams.toString()}`);
}

function publicError(error: unknown) {
  return error instanceof Error ? error.message : "Settings update failed.";
}

export async function savePlatformConnectionAction(formData: FormData) {
  const user = await requireUser();
  const providerValue = readFormString(formData, "provider");

  if (providerValue !== "shopify" && providerValue !== "klaviyo" && providerValue !== "both") {
    settingsRedirect({ error: "Unknown platform provider." });
  }

  const provider = providerValue;

  try {
    await savePlatformConnection({
      provider,
      slug: readFormString(formData, "slug"),
      name: readFormString(formData, "name"),
      currencyCode: readFormString(formData, "currencyCode"),
      timezone: readFormString(formData, "timezone"),
      shopifyShopDomain: readFormString(formData, "shopifyShopDomain"),
      shopifyAdminAccessToken: readFormString(formData, "shopifyAdminAccessToken"),
      klaviyoPrivateKey: readFormString(formData, "klaviyoPrivateKey"),
      klaviyoAccountLabel: readFormString(formData, "klaviyoAccountLabel"),
      userId: user.id,
    });
  } catch (error) {
    settingsRedirect({ error: publicError(error) });
  }

  revalidatePath("/settings");
  revalidatePath("/");
  settingsRedirect({
    status:
      provider === "shopify"
        ? "Shopify connection saved."
        : provider === "klaviyo"
          ? "Klaviyo connection saved."
          : "Connection saved.",
  });
}

export async function disconnectPlatformAction(formData: FormData) {
  const user = await requireUser();
  const providerValue = readFormString(formData, "provider");

  if (providerValue !== "shopify" && providerValue !== "klaviyo") {
    settingsRedirect({ error: "Unknown platform provider." });
  }

  const provider = providerValue;

  try {
    await disconnectPlatform({
      regionId: readFormString(formData, "regionId"),
      provider,
      userId: user.id,
    });
  } catch (error) {
    settingsRedirect({ error: publicError(error) });
  }

  revalidatePath("/settings");
  revalidatePath("/");
  settingsRedirect({ status: `${provider === "shopify" ? "Shopify" : "Klaviyo"} disconnected.` });
}

export async function deactivateRegionAction(formData: FormData) {
  const user = await requireUser();

  try {
    await deactivateRegion(readFormString(formData, "regionId"), user.id);
  } catch (error) {
    settingsRedirect({ error: publicError(error) });
  }

  revalidatePath("/settings");
  revalidatePath("/");
  settingsRedirect({ status: "Region deactivated." });
}
