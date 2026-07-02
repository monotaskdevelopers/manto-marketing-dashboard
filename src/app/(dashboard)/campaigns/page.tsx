/*
File description:
This Campaigns page renders the rebuilt Klaviyo-style campaign workspace with real synced campaign report
data. It keeps the visual layout close to Klaviyo while loading the date-filtered campaign rows and metadata
through the server-side dashboard data pipeline before handing table-only filtering to the client component.
*/

import { CampaignTable } from "@/components/campaign-table";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  getCampaignMessagesByReportRows,
  getCampaignMetadataByReportRows,
} from "@/lib/data/klaviyo-metadata";
import { parseDashboardFilters, toDateOnly, type RawSearchParams } from "@/lib/filters";
import {
  formatDateOnlyLabel,
  getPresetLabel,
} from "@/lib/marketing-performance";
import type { DashboardFilters } from "@/lib/types";

type CampaignPageProps = {
  searchParams: Promise<RawSearchParams>;
};

function getSearchParamValue(searchParams: RawSearchParams, name: string) {
  const value = searchParams[name];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getDateRangeLabel(filters: DashboardFilters) {
  if (filters.preset === "custom") {
    return `${formatDateOnlyLabel(filters.startDate)} - ${formatDateOnlyLabel(filters.endDate)}`;
  }

  const label = getPresetLabel(filters.preset);

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function parseCampaignAdvancedFilters(searchParams: RawSearchParams) {
  return {
    status: getSearchParamValue(searchParams, "campaignStatus") || "all",
    channel: getSearchParamValue(searchParams, "campaignChannel") || "all",
    audience: getSearchParamValue(searchParams, "campaignAudience") || "all",
    tag: getSearchParamValue(searchParams, "campaignTag") || "all",
  };
}

export default async function CampaignsPage({ searchParams }: CampaignPageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseDashboardFilters(rawSearchParams);

  // Re-check auth in the page so report reads never race ahead of the protected layout redirect.
  await requireUser();

  const data = await getDashboardData(filters);
  const campaignAdvancedFilters = parseCampaignAdvancedFilters(rawSearchParams);
  const [campaignMetadataByKey, campaignMessagesByKey] = await Promise.all([
    getCampaignMetadataByReportRows(data.campaignRows),
    getCampaignMessagesByReportRows(data.campaignRows),
  ]);
  const campaignMetadata = Array.from(campaignMetadataByKey.values());
  const campaignMessages = Array.from(campaignMessagesByKey.values()).flat();
  const dateRangeLabel = getDateRangeLabel(filters);
  const initialCampaignTableFilters = {
    query: getSearchParamValue(rawSearchParams, "campaignQ").trim().slice(0, 80),
    region: filters.regionSlug,
    ...campaignAdvancedFilters,
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-3 text-[#26292f] sm:p-5">
      <section className="min-h-[calc(100vh-40px)] overflow-hidden rounded-[14px] border border-[#e2e5e9] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex min-h-14 items-center border-b border-[#eceff3] px-5 py-3">
          <h1 className="text-lg font-semibold tracking-normal text-[#24272c]">Campaigns</h1>
        </header>

        <CampaignTable
          rows={data.campaignRows}
          regions={data.regions}
          metadata={campaignMetadata}
          messages={campaignMessages}
          initialFilters={initialCampaignTableFilters}
          dateSelection={{
            preset: filters.preset,
            startDate: filters.startDate,
            endDate: filters.endDate,
          }}
          dateRangeLabel={dateRangeLabel}
          currentDate={toDateOnly(new Date())}
        />
      </section>
    </div>
  );
}
