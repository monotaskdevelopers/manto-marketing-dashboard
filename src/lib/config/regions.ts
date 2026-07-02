/*
File description:
This file loads server-only region integration settings for sync. Demo mode returns harmless sample regions,
while live mode reads encrypted database-backed platform connections through the Settings connection service.
*/

import "server-only";

import { demoRegions } from "@/lib/config/demo-regions";
import { isDemoMode } from "@/lib/env";
import { getActiveRegionConnectionConfigs } from "@/lib/settings/platform-connections";
import type { RegionIntegrationConfig } from "@/lib/types";

export async function getRegionConfigs(): Promise<RegionIntegrationConfig[]> {
  if (isDemoMode()) {
    return demoRegions;
  }

  return getActiveRegionConnectionConfigs();
}
