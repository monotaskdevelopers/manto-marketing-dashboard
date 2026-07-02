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
  KlaviyoCampaignMetadata,
  KlaviyoCampaignMessage,
  KlaviyoFilterOption,
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
const campaignTagRelationshipSelect = "region_id, tag_id, target_id";
const campaignAudienceRelationshipSelect =
  "region_id, campaign_id, relationship_name, audience_type, audience_id, raw_payload";
const campaignTagSelect = "region_id, tag_id, name";
const audienceNameSelect = "region_id, audience_id, name";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CampaignTagRelationshipRow = {
  region_id: string;
  tag_id: string;
  target_id: string;
};

type CampaignAudienceRelationshipRow = {
  region_id: string;
  campaign_id: string;
  relationship_name: string;
  audience_type: string;
  audience_id: string;
  raw_payload?: Record<string, unknown> | null;
};

type CampaignTagRow = {
  region_id: string;
  tag_id: string;
  name: string | null;
};

type AudienceNameRow = {
  region_id: string;
  audience_id: string;
  name: string | null;
};

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function addUniqueValue(valuesByKey: Map<string, string[]>, key: string, value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return;
  }

  const existingValues = valuesByKey.get(key) || [];

  if (!existingValues.includes(trimmedValue)) {
    existingValues.push(trimmedValue);
    valuesByKey.set(key, existingValues);
  }
}

function addFilterOption(
  optionsByKey: Map<string, KlaviyoFilterOption[]>,
  key: string,
  option: KlaviyoFilterOption,
) {
  const value = option.value.trim();
  const label = option.label.trim();

  if (!value || !label) {
    return;
  }

  const existingOptions = optionsByKey.get(key) || [];

  if (!existingOptions.some((existingOption) => existingOption.value === value)) {
    existingOptions.push({ value, label });
    optionsByKey.set(key, existingOptions);
  }
}

function uniqueFilterOptions(options: KlaviyoFilterOption[]) {
  const optionsByValue = new Map<string, KlaviyoFilterOption>();

  options.forEach((option) => {
    const value = option.value.trim();
    const label = option.label.trim();

    if (value && label && !optionsByValue.has(value)) {
      optionsByValue.set(value, { value, label });
    }
  });

  return Array.from(optionsByValue.values());
}

function getAudienceRelationshipLabel(row: CampaignAudienceRelationshipRow) {
  const rawPayload = asRecord(row.raw_payload);
  const attributes = asRecord(rawPayload.attributes);

  return readString(attributes, ["name", "title", "label"]);
}

async function loadCampaignTagRelationships(
  supabase: SupabaseServerClient,
  regionIds: string[],
  campaignIds: string[],
) {
  const rows: CampaignTagRelationshipRow[] = [];

  for (const campaignIdBatch of toBatches(campaignIds)) {
    const { data, error } = await supabase
      .from("klaviyo_tag_relationships")
      .select(campaignTagRelationshipSelect)
      .in("region_id", regionIds)
      .eq("target_type", "campaign")
      .in("target_id", campaignIdBatch);

    if (error) {
      // Relationship tables are additive. Older databases can still render campaign rows from metadata.
      return [];
    }

    rows.push(...((data || []) as CampaignTagRelationshipRow[]));
  }

  return rows;
}

async function loadCampaignAudienceRelationships(
  supabase: SupabaseServerClient,
  regionIds: string[],
  campaignIds: string[],
) {
  const rows: CampaignAudienceRelationshipRow[] = [];

  for (const campaignIdBatch of toBatches(campaignIds)) {
    const { data, error } = await supabase
      .from("klaviyo_campaign_audiences")
      .select(campaignAudienceRelationshipSelect)
      .in("region_id", regionIds)
      .in("campaign_id", campaignIdBatch);

    if (error) {
      // Campaign audience tables are additive. Keep the page usable if a database is mid-migration.
      return [];
    }

    rows.push(...((data || []) as CampaignAudienceRelationshipRow[]));
  }

  return rows;
}

async function loadTagLabelsByKey(supabase: SupabaseServerClient, regionIds: string[], tagIds: string[]) {
  const labelsByKey = new Map<string, string>();

  for (const tagIdBatch of toBatches(tagIds)) {
    const { data, error } = await supabase
      .from("klaviyo_tags")
      .select(campaignTagSelect)
      .in("region_id", regionIds)
      .in("tag_id", tagIdBatch);

    if (error) {
      return labelsByKey;
    }

    ((data || []) as CampaignTagRow[]).forEach((tag) => {
      if (tag.name?.trim()) {
        labelsByKey.set(buildKlaviyoMetadataKey(tag.region_id, tag.tag_id), tag.name.trim());
      }
    });
  }

  return labelsByKey;
}

async function loadAudienceLabelsByKey(supabase: SupabaseServerClient, regionIds: string[], audienceIds: string[]) {
  const labelsByKey = new Map<string, string>();

  for (const audienceIdBatch of toBatches(audienceIds)) {
    const { data, error } = await supabase
      .from("klaviyo_audiences")
      .select(audienceNameSelect)
      .in("region_id", regionIds)
      .in("audience_id", audienceIdBatch);

    if (error) {
      return labelsByKey;
    }

    ((data || []) as AudienceNameRow[]).forEach((audience) => {
      if (audience.name?.trim()) {
        labelsByKey.set(buildKlaviyoMetadataKey(audience.region_id, audience.audience_id), audience.name.trim());
      }
    });
  }

  return labelsByKey;
}

async function enrichCampaignRelationshipFilters({
  supabase,
  metadataByKey,
  regionIds,
  campaignIds,
}: {
  supabase: SupabaseServerClient;
  metadataByKey: Map<string, KlaviyoCampaignMetadata>;
  regionIds: string[];
  campaignIds: string[];
}) {
  const tagIdsByCampaignKey = new Map<string, string[]>();
  const audienceIdsByCampaignKey = new Map<string, string[]>();
  const audienceRelationshipOptionsByCampaignKey = new Map<string, KlaviyoFilterOption[]>();

  metadataByKey.forEach((campaign, key) => {
    (campaign.tag_ids || []).forEach((tagId) => addUniqueValue(tagIdsByCampaignKey, key, tagId));
    (campaign.audience_ids || []).forEach((audienceId) =>
      addUniqueValue(audienceIdsByCampaignKey, key, audienceId),
    );
  });

  const [tagRelationships, audienceRelationships] = await Promise.all([
    loadCampaignTagRelationships(supabase, regionIds, campaignIds),
    loadCampaignAudienceRelationships(supabase, regionIds, campaignIds),
  ]);

  tagRelationships.forEach((relationship) => {
    addUniqueValue(
      tagIdsByCampaignKey,
      buildKlaviyoMetadataKey(relationship.region_id, relationship.target_id),
      relationship.tag_id,
    );
  });

  audienceRelationships.forEach((relationship) => {
    const campaignKey = buildKlaviyoMetadataKey(relationship.region_id, relationship.campaign_id);

    addUniqueValue(audienceIdsByCampaignKey, campaignKey, relationship.audience_id);
    addFilterOption(audienceRelationshipOptionsByCampaignKey, campaignKey, {
      value: relationship.audience_id,
      label: getAudienceRelationshipLabel(relationship) || relationship.audience_id,
    });
  });

  const tagIds = uniqueValues(Array.from(tagIdsByCampaignKey.values()).flat());
  const audienceIds = uniqueValues(Array.from(audienceIdsByCampaignKey.values()).flat());
  const [tagLabelsByKey, audienceLabelsByKey] = await Promise.all([
    loadTagLabelsByKey(supabase, regionIds, tagIds),
    loadAudienceLabelsByKey(supabase, regionIds, audienceIds),
  ]);

  metadataByKey.forEach((campaign, key) => {
    const tagIdsForCampaign = uniqueValues(tagIdsByCampaignKey.get(key) || []);
    const audienceIdsForCampaign = uniqueValues(audienceIdsByCampaignKey.get(key) || []);
    const audienceRelationshipOptions = (audienceRelationshipOptionsByCampaignKey.get(key) || []).map((option) => ({
      value: option.value,
      label:
        option.label === option.value
          ? audienceLabelsByKey.get(buildKlaviyoMetadataKey(campaign.region_id, option.value)) || option.label
          : option.label,
    }));

    // Mutate the server-only metadata object so existing filter checks keep using the canonical ID arrays.
    campaign.tag_ids = tagIdsForCampaign;
    campaign.audience_ids = audienceIdsForCampaign;
    campaign.tag_filter_options = uniqueFilterOptions(
      tagIdsForCampaign.map((tagId) => ({
        value: tagId,
        label: tagLabelsByKey.get(buildKlaviyoMetadataKey(campaign.region_id, tagId)) || tagId,
      })),
    );
    campaign.audience_filter_options = uniqueFilterOptions([
      ...audienceRelationshipOptions,
      ...audienceIdsForCampaign.map((audienceId) => ({
        value: audienceId,
        label: audienceLabelsByKey.get(buildKlaviyoMetadataKey(campaign.region_id, audienceId)) || audienceId,
      })),
    ]);
  });
}

export async function getCampaignMetadataByReportRows(rows: RankedCampaign[]) {
  const metadataByKey = new Map<string, KlaviyoCampaignMetadata>();

  if (isDemoMode() || !rows.length) {
    return metadataByKey;
  }

  const supabase = await createClient();
  const regionIds = uniqueValues(rows.map((row) => row.region_id));
  const campaignIds = uniqueValues(rows.map((row) => row.campaign_id));

  for (const campaignIdBatch of toBatches(campaignIds)) {
    const metadataResult = await supabase
      .from("klaviyo_campaigns")
      .select(campaignMetadataSelect)
      .in("region_id", regionIds)
      .in("campaign_id", campaignIdBatch);
    let data: unknown[] | null = metadataResult.data;
    let error = metadataResult.error;

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

  await enrichCampaignRelationshipFilters({
    supabase,
    metadataByKey,
    regionIds,
    campaignIds,
  });

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
