/*
File description:
This file loads Klaviyo campaign and flow metadata for reporting pages. It keeps metadata lookups
server-only, batches large IN filters to avoid oversized Supabase requests, and returns keyed maps so
pages can enrich report rows without exposing raw Klaviyo payloads or credentials to the browser.
*/

import "server-only";

import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  KlaviyoCampaign,
  KlaviyoCampaignMessage,
  KlaviyoFlow,
  KlaviyoFlowMessage,
  RankedCampaign,
  RankedFlow,
} from "@/lib/types";

const metadataBatchSize = 80;
const campaignMetadataSelect =
  "id, region_id, campaign_id, name, status, channel, channel_list, tag_ids, audience_ids, archived, klaviyo_created_at, klaviyo_updated_at, scheduled_at, send_at, search_text, a_b_test";
const campaignMetadataFallbackSelect =
  "id, region_id, campaign_id, name, status, channel, archived, klaviyo_created_at, klaviyo_updated_at, scheduled_at, send_at, search_text";

export function buildKlaviyoMetadataKey(regionId: string, klaviyoObjectId: string) {
  return `${regionId}:${klaviyoObjectId}`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toBatches(values: string[]) {
  const batches: string[][] = [];

  for (let index = 0; index < values.length; index += metadataBatchSize) {
    batches.push(values.slice(index, index + metadataBatchSize));
  }

  return batches;
}

function throwIfError(error: unknown, label: string) {
  if (error) {
    throw new Error(`${label} failed.`);
  }
}

export async function getCampaignMetadataByReportRows(rows: RankedCampaign[]) {
  const metadataByKey = new Map<string, KlaviyoCampaign>();

  if (isDemoMode() || !rows.length) {
    return metadataByKey;
  }

  const supabase = await createClient();
  const regionIds = uniqueValues(rows.map((row) => row.region_id));
  const campaignIds = uniqueValues(rows.map((row) => row.campaign_id));

  for (const campaignIdBatch of toBatches(campaignIds)) {
    let { data, error } = await supabase
      .from("klaviyo_campaigns")
      .select(campaignMetadataSelect)
      .in("region_id", regionIds)
      .in("campaign_id", campaignIdBatch);

    if (error) {
      // Campaign filter fields come from the latest Klaviyo migration. Fall back to the old shape so the
      // page remains readable while a local or staging database is catching up.
      const fallbackResult = await supabase
        .from("klaviyo_campaigns")
        .select(campaignMetadataFallbackSelect)
        .in("region_id", regionIds)
        .in("campaign_id", campaignIdBatch);

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    throwIfError(error, "Loading Klaviyo campaign metadata");

    ((data || []) as KlaviyoCampaign[]).forEach((campaign) => {
      metadataByKey.set(buildKlaviyoMetadataKey(campaign.region_id, campaign.campaign_id), campaign);
    });
  }

  return metadataByKey;
}

export async function getCampaignMessagesByReportRows(rows: RankedCampaign[]) {
  const messagesByKey = new Map<string, KlaviyoCampaignMessage[]>();

  if (isDemoMode() || !rows.length) {
    return messagesByKey;
  }

  const supabase = await createClient();
  const regionIds = uniqueValues(rows.map((row) => row.region_id));
  const campaignIds = uniqueValues(rows.map((row) => row.campaign_id));

  for (const campaignIdBatch of toBatches(campaignIds)) {
    const { data, error } = await supabase
      .from("klaviyo_campaign_messages")
      .select(
        "id, region_id, campaign_id, message_id, name, channel, status, subject, preview_text, from_email, from_label, reply_to_email, klaviyo_created_at, klaviyo_updated_at, search_text",
      )
      .in("region_id", regionIds)
      .in("campaign_id", campaignIdBatch);

    if (error) {
      // Message detail tables are additive; older databases can still render reports without them.
      return messagesByKey;
    }

    ((data || []) as KlaviyoCampaignMessage[]).forEach((message) => {
      const key = buildKlaviyoMetadataKey(message.region_id, message.campaign_id);
      const existingMessages = messagesByKey.get(key) || [];

      existingMessages.push(message);
      messagesByKey.set(key, existingMessages);
    });
  }

  return messagesByKey;
}

export async function getFlowMetadataByReportRows(rows: RankedFlow[]) {
  const metadataByKey = new Map<string, KlaviyoFlow>();

  if (isDemoMode() || !rows.length) {
    return metadataByKey;
  }

  const supabase = await createClient();
  const regionIds = uniqueValues(rows.map((row) => row.region_id));
  const flowIds = uniqueValues(rows.map((row) => row.flow_id));

  for (const flowIdBatch of toBatches(flowIds)) {
    const { data, error } = await supabase
      .from("klaviyo_flows")
      .select(
        "id, region_id, flow_id, name, status, trigger_type, archived, klaviyo_created_at, klaviyo_updated_at, search_text",
      )
      .in("region_id", regionIds)
      .in("flow_id", flowIdBatch);

    throwIfError(error, "Loading Klaviyo flow metadata");

    ((data || []) as KlaviyoFlow[]).forEach((flow) => {
      metadataByKey.set(buildKlaviyoMetadataKey(flow.region_id, flow.flow_id), flow);
    });
  }

  return metadataByKey;
}

export async function getFlowMessagesByReportRows(rows: RankedFlow[]) {
  const messagesByKey = new Map<string, KlaviyoFlowMessage[]>();

  if (isDemoMode() || !rows.length) {
    return messagesByKey;
  }

  const supabase = await createClient();
  const regionIds = uniqueValues(rows.map((row) => row.region_id));
  const flowIds = uniqueValues(rows.map((row) => row.flow_id));

  for (const flowIdBatch of toBatches(flowIds)) {
    const { data, error } = await supabase
      .from("klaviyo_flow_messages")
      .select(
        "id, region_id, flow_id, action_id, message_id, name, channel, status, subject, preview_text, from_email, from_label, reply_to_email, klaviyo_created_at, klaviyo_updated_at, search_text",
      )
      .in("region_id", regionIds)
      .in("flow_id", flowIdBatch);

    if (error) {
      // Message detail tables are additive; older databases can still render reports without them.
      return messagesByKey;
    }

    ((data || []) as KlaviyoFlowMessage[]).forEach((message) => {
      const key = buildKlaviyoMetadataKey(message.region_id, message.flow_id);
      const existingMessages = messagesByKey.get(key) || [];

      existingMessages.push(message);
      messagesByKey.set(key, existingMessages);
    });
  }

  return messagesByKey;
}
