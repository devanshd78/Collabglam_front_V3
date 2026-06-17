"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MyCampaignNavbarGate from "./myCampaignNavGate";
import SidebarCampaign from "./sidebarCampaign"
import CampaignCard from "@/components/ui/influencer/card";
import MyCampaignCard from "@/components/ui/influencer/myCamapignCard";
import CampaignFilter, {
  DEFAULT_DATE_FILTER,
  type DateFilterValue,
} from "@/components/ui/brand/CampaignFilter";
import api from "@/lib/api";
import {
  apiGetAllCampaigns,
  apiGetAppliedCampaigns,
  apiGetContractedCampaigns,
  apiGetMyCampaigns,
} from "../../services/influencerApi";

import SkeletonLoader, {
  SkeletonProvider,
  SkeletonCircle,
} from "@/components/common/SkeletonLoader";

export type MyCampaignVariant =
  | "all"
  | "active"
  | "applied"
  | "completed"
  | "rejected";

type CampaignImage = {
  name?: string;
  type?: string;
  size?: number;
  dataUrl?: string;
  url?: string;
  src?: string;
  path?: string;
  imageUrl?: string;
};

type CampaignData = {
  id: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  daysLeft: number;
  match: number;
  category: string;
  location: string;
  status: string;
  campaignStatus: string;
  brandId: string;
  brandName: string;
  brandLogoUrl: string;
  applications: number;
  timeline: { startDate: string; endDate: string };
  isActive: number;
  isApproved: number;
  isContracted: number;
  contractId: string;
  hasApplied: number;
  appliedDate: string;
  productImages: CampaignImage[];
  imageUrls: string[];
  platforms: string[];
  milestoneCurrent: number;
  milestoneTotal: number;
  currentMilestoneName: string;
  campaignGoalValues: string[];
  targetAgeGroupValues: string[];
  targetCountryValues: string[];
  gender: string;
  paymentType?: string;
  campaignType?: string;
  byAi: boolean;
};

const PAGE_CONFIG: Record<
  MyCampaignVariant,
  { heading: string; subheading: string; empty: string }
> = {
  all: {
    heading: "All Campaigns",
    subheading: "View all campaigns connected to your creator account.",
    empty: "No campaigns found.",
  },
  active: {
    heading: "Active Campaigns",
    subheading: "Track campaigns that are currently active.",
    empty: "No active campaigns found.",
  },
  applied: {
    heading: "Applied Campaigns",
    subheading: "View campaigns you have already applied to.",
    empty: "No applied campaigns found.",
  },
  completed: {
    heading: "Completed Campaigns",
    subheading: "View contracted and completed campaign collaborations.",
    empty: "No completed campaigns found.",
  },
  rejected: {
    heading: "Rejected Campaigns",
    subheading: "View campaigns or contracts that were rejected.",
    empty: "No rejected campaigns found.",
  },
};

const CONTRACT_STATUS = {
  REJECTED: "REJECTED",
} as const;

const MY_CAMPAIGN_CARD_VARIANTS = new Set<MyCampaignVariant>([
  "all",
  "active",
  "completed",
]);

const APPLIED_STYLE_CARD_VARIANTS = new Set<MyCampaignVariant>([
  "applied",
  "rejected",
]);

function getStoredValue(keys: string[]) {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

function getInfluencerId() {
  return getStoredValue([
    "influencerId",
    "currentInfluencerId",
    "influencer_id",
    "userId",
    "user_id",
    "_id",
  ]);
}

function getToken() {
  return (
    getStoredValue([
      "influencerToken",
      "influencer_token",
      "token",
      "authToken",
      "accessToken",
    ]) || undefined
  );
}

function getFirstString(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function getThreadIdFromResponse(response: any) {
  return getFirstString(
    response?.data?.data?.threadId,
    response?.data?.data?._id,
    response?.data?.data?.id,
    response?.data?.threadId,
    response?.data?._id,
    response?.data?.id,
    response?.threadId,
    response?._id,
    response?.id
  );
}

function normStatus(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function computeDaysLeft(endAt?: string) {
  if (!endAt) return 0;

  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return 0;

  return Math.max(
    0,
    Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
}

function getImageUrl(image: any) {
  if (!image) return "";
  if (typeof image === "string") return image;

  return (
    image?.dataUrl ||
    image?.url ||
    image?.src ||
    image?.path ||
    image?.imageUrl ||
    ""
  );
}

function getBrandLogoUrl(campaign: any) {
  const logo =
    campaign?.brandprofilepic ||
    campaign?.brandProfilePic ||
    campaign?.brand_profile_pic ||
    campaign?.brandLogo ||
    campaign?.brandLogoUrl ||
    campaign?.brand?.brandprofilepic ||
    campaign?.brand?.brandProfilePic ||
    campaign?.brand?.logo ||
    campaign?.brand?.logoUrl ||
    campaign?.brand?.profileImage ||
    campaign?.brandImage ||
    "";

  if (!logo) return "";
  if (typeof logo === "string") return logo;

  return getImageUrl(logo);
}

function asArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isMongoObjectIdLike(value: any) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function dedupeClean(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => !isMongoObjectIdLike(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getCountryNameFromObject(item: any) {
  if (!item) return "";

  if (typeof item === "string") {
    const value = item.trim();
    return isMongoObjectIdLike(value) ? "" : value;
  }

  const value = getFirstString(
    item.countryNameEn,
    item.countryName,
    item.name,
    item.countryNameLocal,
    item.countryCode,
    item.label,
    item.value
  );

  return isMongoObjectIdLike(value) ? "" : value;
}

function getCountries(value: any) {
  if (!value) return [];

  if (typeof value === "string") {
    return dedupeClean(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return dedupeClean(
    asArray(value)
      .map((item) => getCountryNameFromObject(item))
      .filter(Boolean)
  );
}

function getTagValues(value: any, keys: string[]) {
  return dedupeClean(
    asArray(value)
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          const value = String(item).trim();
          return isMongoObjectIdLike(value) ? "" : value;
        }

        if (item && typeof item === "object") {
          for (const key of keys) {
            const next = item?.[key];

            if (typeof next === "string" && next.trim()) {
              return next.trim();
            }
          }
        }

        return "";
      })
      .filter(Boolean)
  );
}

function isAgeRangeLabel(value: any) {
  const text = String(value || "").trim();

  if (!text || isMongoObjectIdLike(text)) return false;

  return (
    /^\d{1,2}\s*[-–—]\s*\d{1,2}\+?$/.test(text) ||
    /^\d{1,2}\+$/.test(text)
  );
}

function getAgeRangeValues(...values: any[]) {
  return dedupeClean(
    values
      .flatMap((value) => asArray(value))
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item).trim();
        }

        if (item && typeof item === "object") {
          return getFirstString(
            item.range,
            item.ageRange,
            item.label,
            item.name,
            item.title,
            item.value
          );
        }

        return "";
      })
      .filter(isAgeRangeLabel)
  );
}

function compactAgeLabel(ranges: string[]) {
  const clean = getAgeRangeValues(ranges).map((range) =>
    range.replace(/\s*[–—-]\s*/g, "-")
  );

  if (clean.length === 0) return "";
  if (clean.length <= 2) return clean.join(", ");

  const numbers = clean
    .flatMap((range) => range.match(/\d+/g) || [])
    .map(Number)
    .filter((num) => Number.isFinite(num));

  if (numbers.length >= 2) {
    return `${Math.min(...numbers)}-${Math.max(...numbers)}`;
  }

  return clean.join(", ");
}

function extractCampaignList(res: any, variant?: MyCampaignVariant): any[] {
  const data = res?.data ?? res;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.campaigns)) return data.campaigns;
  if (Array.isArray(data?.contracts)) return data.contracts;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  if (variant === "rejected" && Array.isArray(data?.data?.data)) {
    return data.data.data;
  }

  return [];
}

function normalizeRejectedItem(item: any) {
  const campaignDoc = item?.campaignData || item?.campaign || item || {};

  return {
    ...campaignDoc,
    _id:
      campaignDoc?._id ||
      item?.campaignId ||
      item?.campaignData?._id ||
      item?._id,
    campaignId:
      campaignDoc?._id ||
      item?.campaignId ||
      item?.campaignData?._id ||
      item?._id,
    contractId:
      item?.contractMongoId ||
      item?.contract?._id ||
      item?.contractId ||
      campaignDoc?.contractId ||
      "",
    contractMongoId: item?.contractMongoId || item?.contract?._id || "",
    isContracted: 0,
    hasApplied: item?.hasApplied ?? campaignDoc?.hasApplied ?? 1,
    status: item?.status || campaignDoc?.status || CONTRACT_STATUS.REJECTED,
    campaignStatus:
      item?.campaignStatus ||
      item?.status ||
      campaignDoc?.campaignStatus ||
      campaignDoc?.status ||
      CONTRACT_STATUS.REJECTED,
    contractStatus:
      item?.contractStatus || item?.status || CONTRACT_STATUS.REJECTED,
  };
}

function normalizePlatformLabel(value?: string) {
  const v = String(value || "").trim().toLowerCase();

  if (!v) return "";
  if (v.includes("youtube") || v === "yt") return "youtube";
  if (v.includes("instagram") || v === "insta") return "instagram";
  if (v.includes("tiktok") || v === "tt") return "tiktok";

  return v;
}

function getPlatformValues(campaign: any) {
  const rawPlatforms =
    campaign?.platformSelection ||
    campaign?.platforms ||
    campaign?.selectedPlatforms ||
    campaign?.details?.platforms ||
    [];

  return Array.from(
    new Set(
      asArray(rawPlatforms)
        .map((item) =>
          typeof item === "string"
            ? normalizePlatformLabel(item)
            : normalizePlatformLabel(item?.name || item?.label || item?.platform)
        )
        .filter(Boolean)
    )
  );
}

function getMilestoneStats(source: any) {
  const campaignDoc = source?.campaign || source?.campaignData || source || {};

  const milestones = Array.isArray(campaignDoc?.milestones)
    ? campaignDoc.milestones
    : Array.isArray(source?.milestones)
      ? source.milestones
      : [];

  const total =
    Number(campaignDoc?.totalMilestones) ||
    Number(source?.totalMilestones) ||
    milestones.length ||
    5;

  const completed =
    Number(campaignDoc?.completedMilestones) ||
    Number(source?.completedMilestones) ||
    milestones.filter((item: any) => {
      const status = String(item?.status || "").toLowerCase();
      return status === "completed" || status === "approved";
    }).length ||
    0;

  const currentMilestone =
    milestones.find((item: any) => {
      const status = String(item?.status || "").toLowerCase();
      return status !== "completed" && status !== "approved";
    }) || milestones[0];

  return {
    milestoneCurrent: completed,
    milestoneTotal: total,
    currentMilestoneName:
      currentMilestone?.name ||
      currentMilestone?.title ||
      currentMilestone?.milestoneName ||
      "Milestone Name",
  };
}

function getCardStatus(campaign: CampaignData) {
  const status = normStatus(campaign.status || campaign.campaignStatus);

  if (status === "REJECTED") {
    return { statusVariant: "rejected", statusLabel: "Rejected" };
  }

  if (status === "COMPLETED" || campaign.isContracted === 1) {
    return { statusVariant: "completed", statusLabel: "Completed" };
  }

  if (status === "PENDING") {
    return { statusVariant: "pending", statusLabel: "Pending" };
  }

  if (campaign.daysLeft <= 0 && campaign.timeline.endDate) {
    return { statusVariant: "delayed", statusLabel: "Delayed" };
  }

  return { statusVariant: "on_time", statusLabel: "On time" };
}

function mapApiCampaign(source: any): CampaignData {
  const campaignDoc = source?.campaign || source?.campaignData || source || {};
  const details = campaignDoc?.details || {};

  const startDate = getFirstString(
    campaignDoc.startAt,
    campaignDoc.startDate,
    campaignDoc.timeline?.startDate,
    details.startAt,
    details.startDate
  );

  const endDate = getFirstString(
    campaignDoc.endAt,
    campaignDoc.endDate,
    campaignDoc.timeline?.endDate,
    details.endAt,
    details.endDate
  );

  const productImages: CampaignImage[] = Array.isArray(
    campaignDoc.productImages
  )
    ? campaignDoc.productImages
    : Array.isArray(campaignDoc.images)
      ? campaignDoc.images
      : [];

  const imageUrls = productImages.map(getImageUrl).filter(Boolean);

  const category = getFirstString(
    campaignDoc.campaignCategory,
    campaignDoc.categoryName,
    details?.category?.name,
    Array.isArray(campaignDoc.categories) && campaignDoc.categories.length > 0
      ? campaignDoc.categories[0]?.subcategoryName ||
          campaignDoc.categories[0]?.categoryName
      : ""
  );

  const targetCountryValues = dedupeClean([
    ...getCountries(campaignDoc.targetCountryValues),
    ...getCountries(campaignDoc.targetCountries),
    ...getCountries(details.targetCountries),
    ...getCountries(campaignDoc.targetCountry),
    ...getCountries(campaignDoc.targetCountryIds),
  ]);

  const campaignGoalValues = [
    ...getTagValues(campaignDoc.campaignGoalValues, [
      "goal",
      "name",
      "label",
      "title",
    ]),
    ...getTagValues(details.campaignGoals, ["goal", "name", "label", "title"]),
    ...getTagValues(campaignDoc.campaignGoals, [
      "goal",
      "name",
      "label",
      "title",
    ]),
  ];

  const targetAgeGroupValues = getAgeRangeValues(
    campaignDoc.targetAgeGroupValues,
    details.targetAgeRanges,
    campaignDoc.targetAgeRanges,
    campaignDoc.targetAgeRange,
    campaignDoc.ageRanges,
    campaignDoc.targetAgeRangeValues
  );

  const contractMongoId = getFirstString(
    source?.contractMongoId,
    source?.contract?._id,
    source?.contracts?._id
  );

  const resolvedContractId = getFirstString(
    contractMongoId,
    source?.contractId,
    source?.contract?.contractId,
    source?.contracts?.contractId,
    campaignDoc.contractId
  );

  const id = getFirstString(
    campaignDoc._id,
    campaignDoc.id,
    campaignDoc.campaignId,
    source?.campaignId
  );

  const title = getFirstString(
    campaignDoc.campaignTitle,
    campaignDoc.campaignName,
    campaignDoc.name,
    campaignDoc.productOrServiceName,
    source?.content?.campaign?.campaignTitleOrId,
    "Untitled Campaign"
  );

  const budget = Number(
    campaignDoc.campaignBudget ||
      campaignDoc.budget ||
      campaignDoc.influencerBudget ||
      source?.feeAmount ||
      0
  );

  const platforms = getPlatformValues(campaignDoc);
  const milestoneStats = getMilestoneStats(source);

  return {
    id,
    title,
    description: getFirstString(campaignDoc.description, details.description),
    budgetMin: Number(campaignDoc.influencerBudget || 0),
    budgetMax: budget,
    daysLeft: computeDaysLeft(endDate),
    match: Number(campaignDoc.match ?? campaignDoc.matchScore ?? 0),
    category: category || "Uncategorized",
    location: targetCountryValues[0] || "Remote",
    status: getFirstString(campaignDoc.status, source?.status),
    campaignStatus: getFirstString(
      campaignDoc.campaignStatus,
      campaignDoc.status,
      source?.status
    ),
    brandId: getFirstString(
      campaignDoc.brandId,
      campaignDoc.brand?._id,
      campaignDoc.brand?.brandId,
      source?.brandId,
      source?.brand?._id,
      source?.brand?.brandId
    ),
    brandName: getFirstString(
      campaignDoc.brandName,
      source?.brandName,
      campaignDoc.brand?.name,
      "Brand"
    ),
    brandLogoUrl: getBrandLogoUrl(campaignDoc),
    applications: Number(
      campaignDoc.applicantCount ||
        campaignDoc.applicationsCount ||
        source?.applicantCount ||
        0
    ),
    timeline: { startDate, endDate },
    isActive: Number(campaignDoc.isActive ?? 1),
    isApproved: Number(
      campaignDoc.isApproved ??
        campaignDoc.hasApproved ??
        source?.hasApproved ??
        1
    ),
    isContracted: Number(
      campaignDoc.isContracted ?? (resolvedContractId ? 1 : 0)
    ),
    contractId: resolvedContractId,
    hasApplied: Number(campaignDoc.hasApplied ?? source?.hasApplied ?? 1),
    appliedDate: getFirstString(
      source?.appliedDate,
      source?.appliedAt,
      source?.application?.appliedAt,
      campaignDoc.appliedDate,
      campaignDoc.appliedAt
    ),
    productImages,
    imageUrls,
    platforms,
    campaignGoalValues: Array.from(new Set(campaignGoalValues)),
    targetAgeGroupValues: Array.from(new Set(targetAgeGroupValues)),
    targetCountryValues: Array.from(new Set(targetCountryValues)),
    gender: getFirstString(
      campaignDoc.gender,
      campaignDoc.targetGender,
      campaignDoc.audienceGender,
      details.gender,
      details.targetGender
    ),
    paymentType: getFirstString(campaignDoc.paymentType, details.paymentType),
    campaignType: getFirstString(campaignDoc.campaignType, details.campaignType),
    byAi: Number(campaignDoc.byAi ?? source?.byAi ?? 0) === 1,
    milestoneCurrent: milestoneStats.milestoneCurrent,
    milestoneTotal: milestoneStats.milestoneTotal,
    currentMilestoneName: milestoneStats.currentMilestoneName,
  };
}

function matchesVariant(campaign: CampaignData, variant: MyCampaignVariant) {
  if (variant === "all") return true;

  if (variant === "applied") {
    return campaign.hasApplied === 1;
  }

  if (variant === "active") {
    return (
      campaign.isActive === 1 &&
      normStatus(campaign.status) !== CONTRACT_STATUS.REJECTED &&
      normStatus(campaign.campaignStatus) !== CONTRACT_STATUS.REJECTED
    );
  }

  if (variant === "completed") {
    return campaign.isContracted === 1 || Boolean(campaign.contractId);
  }

  if (variant === "rejected") {
    return (
      normStatus(campaign.status) === CONTRACT_STATUS.REJECTED ||
      normStatus(campaign.campaignStatus) === CONTRACT_STATUS.REJECTED
    );
  }

  return true;
}

function matchesDateFilter(campaign: CampaignData, dateFilter: DateFilterValue) {
  if (
    !dateFilter.quickFilter &&
    dateFilter.allDatesOption === "all" &&
    !dateFilter.startDate &&
    !dateFilter.endDate
  ) {
    return true;
  }

  const start = campaign.timeline?.startDate
    ? new Date(campaign.timeline.startDate)
    : null;

  if (!start || Number.isNaN(start.getTime())) return true;

  if (dateFilter.quickFilter === "launching_soon") {
    const diff = (start.getTime() - Date.now()) / 86_400_000;
    return diff >= 0 && diff <= 7;
  }

  if (dateFilter.quickFilter === "today") {
    return start.toDateString() === new Date().toDateString();
  }

  if (dateFilter.quickFilter === "this_week") {
    const diff = (start.getTime() - Date.now()) / 86_400_000;
    return diff >= 0 && diff <= 7;
  }

  if (dateFilter.quickFilter === "this_month") {
    const now = new Date();

    return (
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear()
    );
  }

  const rangeMap: Record<string, number> = {
    last_7: 7,
    last_15: 15,
    last_30: 30,
    last_90: 90,
    last_month: 30,
    last_quarter: 90,
    last_365: 365,
  };

  const days = rangeMap[dateFilter.allDatesOption];

  if (days) {
    return (Date.now() - start.getTime()) / 86_400_000 <= days;
  }

  if (dateFilter.startDate || dateFilter.endDate) {
    const from = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
    const to = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

    if (from && start < from) return false;
    if (to && start > to) return false;
  }

  return true;
}

function CampaignCardSkeleton() {
  return (
    <div className="w-full rounded-[1.5rem] border border-[#E6E6E6] bg-white p-3">
      <SkeletonLoader className="h-[10rem] w-full rounded-[1rem]" />

      <div className="mt-3 flex items-center gap-3">
        <SkeletonCircle className="h-[3.25rem] w-[3.25rem] shrink-0" />

        <div className="min-w-0 flex-1">
          <SkeletonLoader className="h-4 w-28 rounded-md" />
          <SkeletonLoader className="mt-2 h-3 w-20 rounded-md" />
        </div>

        <SkeletonLoader className="h-6 w-16 rounded-full" />
      </div>

      <SkeletonLoader className="mt-4 h-5 w-4/5 rounded-md" />
      <SkeletonLoader className="mt-3 h-3 w-full rounded-md" />
      <SkeletonLoader className="mt-2 h-3 w-3/4 rounded-md" />

      <div className="mt-4 flex items-center gap-2">
        <SkeletonLoader className="h-7 w-24 rounded-full" />
        <SkeletonLoader className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-4 border-t border-[#E6E6E6] pt-4">
        <div className="flex items-center justify-between gap-4">
          <SkeletonLoader className="h-7 w-24 rounded-md" />
          <SkeletonLoader className="h-9 w-28 rounded-[0.75rem]" />
        </div>
      </div>
    </div>
  );
}


function AppliedSidebarSkeleton() {
  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[38rem] w-full items-stretch overflow-hidden bg-white">
      <section className="w-[22.0625rem] shrink-0 overflow-hidden pr-0">
        <div className="flex flex-col gap-[1.5rem]">
          {[1, 2].map((item) => (
            <CampaignCardSkeleton key={item} />
          ))}
        </div>
      </section>

      <div className="flex w-[0.625rem] shrink-0 items-start justify-center px-[0.0625rem] pt-[2rem]">
        <div className="h-[4.8125rem] flex-1 rounded-[6.25rem] bg-[#E6E6E6]" />
      </div>

      <section className="relative min-w-0 flex-1 overflow-hidden pb-[4rem]">
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-t-[1rem] rounded-b-none border border-[#E6E6E6] bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto px-[1.25rem] pb-[5rem] pt-[1.25rem]">
            <div className="flex w-full flex-col gap-[1.75rem]">
              <div className="flex items-center gap-4">
                <SkeletonCircle className="h-[6.25rem] w-[6.25rem]" />
                <div className="min-w-0 flex-1">
                  <SkeletonLoader className="h-7 w-1/2 rounded-md" />
                  <SkeletonLoader className="mt-3 h-4 w-1/3 rounded-md" />
                </div>
                <SkeletonLoader className="h-10 w-40 rounded-[0.75rem]" />
              </div>

              <div className="flex gap-6 border-b border-[#E6E6E6] pb-3">
                <SkeletonLoader className="h-5 w-20 rounded-md" />
                <SkeletonLoader className="h-5 w-28 rounded-md" />
              </div>

              <SkeletonLoader className="h-[5.5rem] w-full rounded-[0.75rem]" />
              <SkeletonLoader className="h-[16rem] w-full rounded-[0.75rem]" />
              <SkeletonLoader className="h-[14rem] w-full rounded-[0.75rem]" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-[0.0625rem] z-30 flex h-[4rem] w-auto items-center justify-between border-y border-l border-[#E6E6E6] bg-white px-[1.25rem] shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]">
          <SkeletonLoader className="h-5 w-20 rounded-md" />
          <div className="flex items-center gap-4">
            <SkeletonLoader className="h-5 w-20 rounded-md" />
            <SkeletonLoader className="h-10 w-28 rounded-[0.75rem]" />
          </div>
        </div>
      </section>
    </div>
  );
}

function AppliedCampaignSplitView({
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  getCampaignHref,
  openCampaignThread,
}: {
  campaigns: CampaignData[];
  selectedCampaignId: string;
  setSelectedCampaignId: (campaignId: string) => void;
  getCampaignHref: (campaign: CampaignData) => string;
  openCampaignThread: (campaign: CampaignData) => void;
}) {
  const router = useRouter();

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ||
    campaigns[0] ||
    null;

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[38rem] w-full items-stretch overflow-hidden bg-white">
      <section className="w-[22.0625rem] shrink-0 overflow-y-auto pr-0 [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-[0.375rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[4.8125rem] [&::-webkit-scrollbar-thumb]:rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6]">
        <div className="flex flex-col gap-[1.5rem] pb-8">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              title={campaign.title}
              description={campaign.description}
              imageUrl={campaign.imageUrls[0]}
              imageUrls={campaign.imageUrls}
              brandName={campaign.brandName}
              brandLogoUrl={campaign.brandLogoUrl}
              campaignGoal={campaign.campaignGoalValues[0]}
              category={campaign.category}
              ageLabel={compactAgeLabel(campaign.targetAgeGroupValues)}
              gender={campaign.gender}
              countries={campaign.targetCountryValues}
              budget={campaign.budgetMax}
              viewedCount={campaign.applications}
              hasApplied={campaign.hasApplied === 1}
              isAppliedCard
              appliedDate={campaign.appliedDate}
              onCardClick={() => setSelectedCampaignId(campaign.id)}
              onApply={() => undefined}
              onSave={() => undefined}
              onDeleteApplied={() => {
                // add withdraw/delete applied campaign API here
              }}
              onMore={() => setSelectedCampaignId(campaign.id)}
              className={
                selectedCampaign?.id === campaign.id
                  ? "ring-1 ring-[#1A1A1A]/10"
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      <div
        className={[
          "flex w-[0.625rem] shrink-0 items-start justify-center",
          "gap-[0.5rem] self-stretch",
          "px-[0.0625rem] pb-[0.0625rem] pt-[2rem]",
        ].join(" ")}
      >
        <div className="h-[4.8125rem] flex-1 rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] bg-[#E6E6E6]" />
      </div>

      <section className="sticky top-0 h-full min-h-0 min-w-0 flex-1 overflow-hidden pb-[4rem]">
        {selectedCampaign ? (
          <div className="h-full min-h-0 overflow-hidden">
            <SidebarCampaign
              campaignId={selectedCampaign.id}
              invitationId={selectedCampaign.contractId || selectedCampaign.id}
              invitationStatus="accepted"
              invitationBrandLogo={selectedCampaign.brandLogoUrl}
              invitationAppliedAt={selectedCampaign.appliedDate}
              onInvitationAccepted={() => undefined}
              embedded
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-[#E6E6E6] bg-white text-sm text-[#969696]">
            Select an applied campaign to view campaign details.
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-[0.0625rem] z-30 flex h-[4rem] w-auto flex-wrap items-center content-center justify-between border-y border-l border-[#E6E6E6] bg-white px-[1.25rem] shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]">
          <button
            type="button"
            className="flex h-[2.5rem] items-center justify-center gap-[0.25rem] rounded-[0.75rem] px-[0.5rem] text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]"
          >
            ♡ Save
          </button>

          <div className="ml-auto flex items-center gap-[1rem]">
            <button
              type="button"
              disabled={!selectedCampaign}
              onClick={() => selectedCampaign && openCampaignThread(selectedCampaign)}
              className="flex h-[2.5rem] w-[7rem] items-center justify-center rounded-[0.75rem] px-[0.5rem] text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Message
            </button>

            <button
              type="button"
              disabled={!selectedCampaign}
              onClick={() => selectedCampaign && router.push(getCampaignHref(selectedCampaign))}
              className="flex h-[2.5rem] w-[7rem] items-center justify-center rounded-[0.75rem] bg-[#1A1A1A] px-[0.5rem] text-[0.875rem] font-semibold leading-[1.25rem] text-white disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#B8B8B8] disabled:opacity-60"
            >
              View
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MyCampaignsContent({
  variant = "all",
}: {
  variant?: MyCampaignVariant;
}) {
  const router = useRouter();
  const config = PAGE_CONFIG[variant];

  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [campaignType, setCampaignType] = useState("all");
  const [creatorStatus, setCreatorStatus] = useState("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [aiCreated, setAiCreated] = useState(false);
  const [selectedAppliedCampaignId, setSelectedAppliedCampaignId] = useState("");

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const influencerId = getInfluencerId();
      const token = getToken();

      if (!influencerId) {
        throw new Error("Influencer ID not found. Please sign in again.");
      }

      let res: any;
      let rawCampaigns: any[] = [];

      if (variant === "applied") {
        res = await apiGetAppliedCampaigns(influencerId, token);
        rawCampaigns = extractCampaignList(res, variant);
      } else if (variant === "active") {
        res = await apiGetMyCampaigns(
          {
            influencerId,
            page: 1,
            limit: 100,
            search: "",
          },
          token
        );
        rawCampaigns = extractCampaignList(res, variant);
      } else if (variant === "completed") {
        res = await apiGetContractedCampaigns(influencerId, token);
        rawCampaigns = extractCampaignList(res, variant);
      } else if (variant === "rejected") {
        res = await api.get(`/campaign/rejected/${influencerId}`);
        rawCampaigns = extractCampaignList(res, variant).map(
          normalizeRejectedItem
        );
      } else {
        res = await apiGetAllCampaigns(influencerId);
        rawCampaigns = extractCampaignList(res, variant);
      }

      const mapped = rawCampaigns
        .map(mapApiCampaign)
        .filter((campaign) => Boolean(campaign.id));

      setCampaigns(mapped);
    } catch (error: any) {
      setFetchError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load campaigns."
      );
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    const filtered = campaigns.filter((campaign) => {
      const matchesPageVariant = matchesVariant(campaign, variant);

      const matchesSearch =
        !query ||
        [
          campaign.title,
          campaign.description,
          campaign.brandName,
          campaign.category,
          campaign.location,
          campaign.paymentType,
          campaign.campaignType,
          ...campaign.campaignGoalValues,
          ...campaign.targetAgeGroupValues,
          ...campaign.targetCountryValues,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCampaignType =
        campaignType === "all" ||
        campaign.campaignStatus === campaignType ||
        campaign.campaignType === campaignType ||
        campaign.paymentType === campaignType;

      const matchesCreatorStatus = (() => {
        if (creatorStatus === "all") return true;
        if (creatorStatus === "applied") return campaign.hasApplied === 1;
        if (creatorStatus === "approved") return campaign.isApproved === 1;
        if (creatorStatus === "invited") {
          return campaign.hasApplied === 0 && campaign.isApproved === 0;
        }

        return true;
      })();

      const matchesCategory =
        categoryIds.length === 0 || categoryIds.includes(campaign.category);

      const matchesAi = !aiCreated || campaign.byAi;

      return (
        matchesPageVariant &&
        matchesSearch &&
        matchesCampaignType &&
        matchesCreatorStatus &&
        matchesCategory &&
        matchesAi &&
        matchesDateFilter(campaign, dateFilter)
      );
    });

    filtered.sort((a, b) => b.match - a.match);

    return filtered;
  }, [
    campaigns,
    variant,
    searchInput,
    campaignType,
    creatorStatus,
    categoryIds,
    dateFilter,
    aiCreated,
  ]);

  useEffect(() => {
    if (variant !== "applied") {
      setSelectedAppliedCampaignId("");
      return;
    }

    if (!filteredCampaigns.length) {
      setSelectedAppliedCampaignId("");
      return;
    }

    const selectedStillExists = filteredCampaigns.some(
      (campaign) => campaign.id === selectedAppliedCampaignId
    );

    if (!selectedAppliedCampaignId || !selectedStillExists) {
      setSelectedAppliedCampaignId(filteredCampaigns[0].id);
    }
  }, [filteredCampaigns, selectedAppliedCampaignId, variant]);

  const hasActiveFilters =
    Boolean(searchInput) ||
    campaignType !== "all" ||
    creatorStatus !== "all" ||
    categoryIds.length > 0 ||
    aiCreated ||
    Boolean(dateFilter.quickFilter) ||
    dateFilter.allDatesOption !== "all" ||
    Boolean(dateFilter.startDate) ||
    Boolean(dateFilter.endDate);

  const getCampaignHref = (campaign: CampaignData) => {
    return `/influencer/my-campaigns/${encodeURIComponent(
      campaign.id
    )}?title=${encodeURIComponent(campaign.title || "Campaign Details")}`;
  };

  const openCampaignThread = useCallback(
    async (campaign: CampaignData) => {
      try {
        const influencerId = getInfluencerId();

        if (!campaign.brandId || !influencerId || !campaign.id) {
          setFetchError(
            "Unable to open inbox. Missing brand, influencer, or campaign details."
          );
          return;
        }

        const response = await api.post("/emails/threads", {
          brandId: campaign.brandId,
          influencerId,
          campaignId: campaign.id,
          subject: campaign.title || "Campaign conversation",
          type: "campaign",
          source: "influencer_my_campaigns",
        });

        const threadId = getThreadIdFromResponse(response);

        if (!threadId) {
          throw new Error("Thread created, but threadId was not returned.");
        }

        router.push(`/influencer/inbox/${threadId}`);
      } catch (error: any) {
        setFetchError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to open brand conversation."
        );
      }
    },
    [router]
  );

  return (
    <SkeletonProvider>
      <div className="min-h-screen bg-white">
        <MyCampaignNavbarGate />

        <div className="mx-auto max-w-full px-6 py-10">
          {fetchError ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center gap-3">
                <span>{fetchError}</span>

                <button
                  type="button"
                  onClick={fetchCampaigns}
                  className="ml-auto font-semibold underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <CampaignFilter
            campaignType={campaignType}
            setCampaignType={setCampaignType}
            creatorStatus={creatorStatus}
            setCreatorStatus={setCreatorStatus}
            categoryIds={categoryIds}
            setCategoryIds={setCategoryIds}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            aiCreated={aiCreated}
            setAiCreated={setAiCreated}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
          />

          <div className="mt-8">
            {isLoading ? (
              variant === "applied" ? (
                <AppliedSidebarSkeleton />
              ) : (
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <CampaignCardSkeleton key={index} />
                  ))}
                </div>
              )
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E6E6E6] bg-white px-6 py-24 text-center">
                <h3 className="text-lg font-semibold text-[#1A1A1A]">
                  {config.empty}
                </h3>

                <p className="mt-2 text-sm text-[#969696]">
                  Try adjusting your filters or search query.
                </p>

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setCampaignType("all");
                      setCreatorStatus("all");
                      setCategoryIds([]);
                      setDateFilter(DEFAULT_DATE_FILTER);
                      setAiCreated(false);
                    }}
                    className="mt-5 rounded-lg border border-[#E6E6E6] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F7F7F7]"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            ) : variant === "applied" ? (
              <AppliedCampaignSplitView
                campaigns={filteredCampaigns}
                selectedCampaignId={selectedAppliedCampaignId}
                setSelectedCampaignId={setSelectedAppliedCampaignId}
                getCampaignHref={getCampaignHref}
                openCampaignThread={openCampaignThread}
              />
            ) : (
              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {filteredCampaigns.map((campaign) => {
                  const cardStatus = getCardStatus(campaign);

                  if (MY_CAMPAIGN_CARD_VARIANTS.has(variant)) {
                    return (
                      <MyCampaignCard
                        key={campaign.id}
                        logoUrl={campaign.imageUrls[0]}
                        logoAriaLabel={campaign.title || "Campaign image"}
                        brandName={campaign.brandName}
                        name={campaign.title}
                        statusVariant={cardStatus.statusVariant}
                        statusLabel={cardStatus.statusLabel}
                        category={campaign.category}
                        campaignGoal={campaign.campaignGoalValues[0]}
                        platforms={campaign.platforms}
                        milestoneCurrent={campaign.milestoneCurrent}
                        milestoneTotal={campaign.milestoneTotal}
                        budget={campaign.budgetMax}
                        timelineStartDate={campaign.timeline.startDate}
                        timelineEndDate={campaign.timeline.endDate}
                        footerNote={
                          campaign.daysLeft > 0
                            ? `${
                                campaign.currentMilestoneName ||
                                "Milestone Name"
                              } submission in ${campaign.daysLeft} days`
                            : ""
                        }
                        onCardClick={() => router.push(getCampaignHref(campaign))}
                        onManageCampaign={() =>
                          router.push(getCampaignHref(campaign))
                        }
                        onMessageClick={() => openCampaignThread(campaign)}
                        onMoreClick={() => undefined}
                      />
                    );
                  }

                  return (
                    <CampaignCard
                      key={campaign.id}
                      title={campaign.title}
                      description={campaign.description}
                      imageUrl={campaign.imageUrls[0]}
                      imageUrls={campaign.imageUrls}
                      brandName={campaign.brandName}
                      brandLogoUrl={campaign.brandLogoUrl}
                      campaignGoal={campaign.campaignGoalValues[0]}
                      category={campaign.category}
                      ageLabel={compactAgeLabel(campaign.targetAgeGroupValues)}
                      gender={campaign.gender}
                      countries={campaign.targetCountryValues}
                      budget={campaign.budgetMax}
                      viewedCount={campaign.applications}
                      hasApplied={campaign.hasApplied === 1}
                      isAppliedCard={APPLIED_STYLE_CARD_VARIANTS.has(variant)}
                      appliedDate={campaign.appliedDate}
                      onCardClick={
                        APPLIED_STYLE_CARD_VARIANTS.has(variant)
                          ? undefined
                          : () => router.push(getCampaignHref(campaign))
                      }
                      onApply={() => undefined}
                      onSave={() => undefined}
                      onDeleteApplied={() => {
                        // add withdraw/delete applied campaign API here
                      }}
                      onMore={() => undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SkeletonProvider>
  );
}