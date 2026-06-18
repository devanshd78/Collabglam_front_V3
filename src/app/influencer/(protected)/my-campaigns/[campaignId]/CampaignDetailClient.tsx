"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  CalendarDots,
  CheckCircle,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretRight as RowCaretRight,
  DotsThree,
  DownloadSimple,
  EnvelopeSimple,
  FilePdf,
  LinkSimple,
  Wallet,
} from "@phosphor-icons/react";
import {
  apiGetfetchCampaignbyId,
  getApiErrorMessage,
} from "@/app/influencer/services/influencerApi";
import api from "@/lib/api";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { cn } from "@/lib/utils";

const PAGE_WRAP =
  "min-h-screen w-full bg-white px-4 pb-20 pt-8 sm:px-6 lg:px-10 xl:px-14";
const CONTENT_WRAP = "mx-auto w-full max-w-[72.5rem]";

type ActiveTab = "overview" | "milestones" | "payment";

type BrandData = {
  _id?: string;
  brandId?: string;
  brandName?: string;
  name?: string;
  email?: string;
  proxyEmail?: string;
  website?: string;
  profilePic?: string;
  industry?: string;
  companySize?: string;
  companyDetails?: string;
  pocContact?: string;
  currencyFormat?: string;
  preferredLanguage?: string;
  region?: string;
  rating?: number | string;
  [key: string]: any;
};

type InfluencerData = {
  _id?: string;
  influencerId?: string;
  name?: string;
  email?: string;
  profilePic?: string;
  hasApplied?: number;
  hasApproved?: number;
  isContracted?: number;
  isAccepted?: number;
  contractId?: string | null;
  contractStatus?: string | null;
  appliedAt?: string | null;
  [key: string]: any;
};

type CampaignFile = {
  name?: string;
  url?: string;
  size?: number | string | null;
  type?: string;
  [key: string]: any;
};

type CampaignImage = {
  name?: string;
  url?: string;
  size?: number | string | null;
  type?: string;
  [key: string]: any;
};

type CampaignDeliverable = {
  _id?: string;
  id?: string;
  deliverableId?: string;
  milestoneId?: string;
  milestoneHistoryId?: string;
  title?: string;
  name?: string;
  deliverableName?: string;
  contentFormat?: string;
  format?: string;
  delivery?: string;
  deliveries?: string[];
  deliveryTypes?: string[];
  dimensions?: string;
  aspectRatio?: string;
  platform?: string;
  platforms?: string[];
  status?: string;
  quantity?: number | string;
  dueDate?: string | null;
  deadline?: string | null;
  submittedAt?: string | null;
  deliverableLinks?: Array<{ label?: string; url?: string; linkId?: string }>;
  submissionName?: string;
  submissionNotes?: string;
  submittedByInfluencerId?: string;
  draftRequired?: boolean | number | string;
  needDraftFirst?: boolean | number | string;
  requiresDraft?: boolean | number | string;
  preShootScriptRequired?: boolean | number | string;
  draftDue?: string | null;
  draftDate?: string | null;
  draftSubmittedAt?: string | null;
  draftLinks?: Array<{ label?: string; url?: string; linkId?: string }>;
  draftNotes?: string;
  preShootScriptDue?: string | null;
  preShootScriptLinks?: Array<{
    label?: string;
    url?: string;
    linkId?: string;
  }>;
  revisions?: any[];
  draftUrl?: string;
  deliveryUrl?: string;
  [key: string]: any;
};

type CampaignMilestone = {
  _id?: string;
  id?: string;
  milestoneId?: string;
  milestoneHistoryId?: string;
  title?: string;
  name?: string;
  milestoneTitle?: string;
  milestoneName?: string;
  status?: string;
  payoutStatus?: string;
  dueDate?: string | null;
  deadline?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  percent?: number | string;
  progress?: number | string;
  amount?: number | string;
  budget?: number | string;
  milestoneBudget?: number | string;
  description?: string;
  milestoneDescription?: string;
  contentFormat?: string;
  platform?: string;
  platforms?: string[];
  quantity?: number | string;
  deliverables?: CampaignDeliverable[];
  completedDeliverables?: number | string;
  totalDeliverables?: number | string;
  released?: boolean;
  releasedAt?: string | null;
  paidAt?: string | null;
  [key: string]: any;
};

type CampaignData = {
  _id?: string;
  campaignId?: string;
  title?: string;
  status?: string;
  campaignStatus?: string;
  productUrl?: string;
  description?: string;
  additionalNotes?: string;
  campaignGoals?: string[];
  campaignTypes?: string[];
  category?: string[];
  subcategory?: string[];
  payout?: {
    currency?: string;
    min?: number;
    max?: number;
    total?: number;
    upcoming?: number;
    paid?: number;
  };
  totalPayout?: number | string;
  upcomingPayout?: number | string;
  startAt?: string | null;
  endAt?: string | null;
  activeDate?: string | null;
  paymentType?: string;
  numberOfInfluencers?: number;
  influencerTier?: string[];
  contentLanguage?: string[];
  contentFormat?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  hashtags?: string[];
  targetPlatforms?: string[];
  targetCountries?: string[];
  targetAgeGroups?: string[];
  videoReferenceUrl?: string;
  productImages?: CampaignImage[];
  brandGuideline?: CampaignFile | null;
  contractFile?: CampaignFile | null;
  appliedInfluencerCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  milestones?: CampaignMilestone[];
  deliverables?: CampaignDeliverable[];
  completedDeliverables?: number;
  totalDeliverables?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  rating?: number | string;
  contract?: any;
  paymentHistory?: any[];
  transactions?: any[];
  payments?: any[];
  progressSteps?: any[];
  workflowSteps?: any[];
  [key: string]: any;
};

type CampaignViewData = {
  brand: BrandData;
  influencer: InfluencerData;
  campaign: CampaignData;
};

type StepData = {
  title: string;
  subtitle: string;
  date: string;
  percent: number;
};

type NormalizedMilestone = {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: string;
  quantity: string;
  deadline: string;
  raw: CampaignMilestone;
  deliverables: CampaignDeliverable[];
  completedDeliverables: number;
  totalDeliverables: number;
  allDeliverablesSubmitted: boolean;
};

type PaymentHistoryRow = {
  id: string;
  name: string;
  subId: string;
  txnId: string;
  amount: number;
  amountLabel: string;
  type: "credit" | "debit";
  receiptUrl: string;
  status: string;
};

type SubmissionMode = "draft" | "final";

type SubmitDeliverableState = {
  mode: SubmissionMode;
  milestone: NormalizedMilestone;
  deliverable: CampaignDeliverable;
} | null;

type ViewDeliverableState = {
  milestone: NormalizedMilestone;
  deliverable: CampaignDeliverable;
  initialTab?: "about" | "submission";
} | null;

function asArray<T = any>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

function normalizeMongoId(id: any): string {
  if (id == null) return "";
  if (typeof id === "string" || typeof id === "number") return String(id);

  if (typeof id === "object") {
    if (typeof id.toHexString === "function") return id.toHexString();
    if (typeof id.$oid === "string") return id.$oid;
    if (typeof id.oid === "string") return id.oid;
    if (typeof id.id === "string" || typeof id.id === "number") {
      return String(id.id);
    }
    if (id._id != null) return normalizeMongoId(id._id);

    if (typeof id.toString === "function") {
      const value = id.toString();
      if (value && value !== "[object Object]") return value;
    }
  }

  return "";
}

function pickString(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function getFirstValue(source: any, keys: string[]) {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: any) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value))));
}

function compactNumber(value: any) {
  const num = toNumber(value);
  if (!num) return "-";
  return num.toLocaleString("en-US");
}

function currencyPrefix(currency?: string) {
  const code = String(currency || "USD").toUpperCase();

  if (code === "USD") return "USD $";
  if (code === "INR") return "INR ₹";
  if (code === "EUR") return "EUR €";
  if (code === "GBP") return "GBP £";

  return code;
}

function formatMoney(value: any, currency?: string) {
  const num = toNumber(value);
  if (!num) return "-";

  return `${currencyPrefix(currency)} ${Math.abs(num).toLocaleString("en-US")}`;
}

function formatSignedMoney(value: any, currency?: string) {
  const num = toNumber(value);
  if (!num) return "-";
  const sign = num < 0 ? "-" : "+";

  return `${sign}${formatMoney(Math.abs(num), currency)}`;
}

function formatMoneyRange(minValue: any, maxValue: any, currency?: string) {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min && max && min !== max) {
    return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
  }

  if (max) return formatMoney(max, currency);
  if (min) return formatMoney(min, currency);

  return "-";
}

function formatDate(value: any) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function formatTimelineDate(value: any) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatStatusText(value: any) {
  const text = pickString(value, "-");
  if (text === "-") return text;

  return text
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatNumericDate(value: any) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatShortDate(value: any) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatCompactDate(value: any) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function daysBetween(startValue: any, endValue: any) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return 0;
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

function formatCampaignRange(startValue: any, endValue: any) {
  const start = formatCompactDate(startValue);
  const end = formatCompactDate(endValue);
  const days = daysBetween(startValue, endValue);

  if (start && end && days) return `${start} - ${end} (${days} days)`;
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;

  return "-";
}

function formatTimeline(startValue: any, endValue: any) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

  const monthDiff = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth(),
  );

  return `${monthDiff} month${monthDiff === 1 ? "" : "s"}`;
}

function formatFileSize(bytes: any) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${size} B`;
}

function normalizeAssetUrl(value: any) {
  const url = String(value || "").trim();

  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;

  return url;
}

function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || "";
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return videoId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return parts[shortsIndex + 1];
      }
    }
  } catch {
    return "";
  }

  return "";
}

function getVideoThumb(url: string) {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function getStatus(campaign: CampaignData) {
  return pickString(campaign.status, campaign.campaignStatus);
}

function isLiveStatus(status: string) {
  const text = status.toLowerCase();
  return ["active", "live", "running", "ongoing"].some((item) =>
    text.includes(item),
  );
}

function isCompletedStatus(value: any) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  return ["completed", "complete", "approved", "paid", "released"].some(
    (item) => status.includes(item),
  );
}

function isSubmittedStatus(value: any) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  return ["submitted", "approved", "complete", "completed", "paid"].some(
    (item) => status.includes(item),
  );
}

function isTruthy(value: any) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on", "required"].includes(
      value.trim().toLowerCase(),
    );
  }

  return false;
}

function getLinkUrl(value: any) {
  if (!value) return "";
  if (typeof value === "string") return normalizeAssetUrl(value);

  return normalizeAssetUrl(value.url || value.link || value.href || value.path);
}

function getLinkRows(value: any): Array<{ label: string; url: string }> {
  return asArray<any>(value)
    .map((item, index) => ({
      label: pickString(item?.label, item?.name, `Link ${index + 1}`),
      url: getLinkUrl(item),
    }))
    .filter((item) => item.url);
}

function getSubmittedLinks(deliverable: CampaignDeliverable) {
  return [
    ...getLinkRows(deliverable.deliverableLinks),
    ...getLinkRows(deliverable.submissionLinks),
    ...getLinkRows(deliverable.url),
    ...getLinkRows(deliverable.deliveryUrl),
  ];
}

function getDraftLinks(deliverable: CampaignDeliverable) {
  return [
    ...getLinkRows(deliverable.draftLinks),
    ...getLinkRows(deliverable.preShootScriptLinks),
    ...getLinkRows(deliverable.draftUrl),
  ];
}

function getDeliverableSubmissionName(
  deliverable: CampaignDeliverable,
  index = 0,
) {
  return pickString(
    deliverable.submissionName,
    deliverable.submissionTitle,
    deliverable.submittedName,
    getDeliverableTitle(deliverable, index),
  );
}

function getDeliverableAdditionalNotes(deliverable: CampaignDeliverable) {
  return pickString(
    deliverable.submissionNotes,
    deliverable.additionalNotes,
    deliverable.notes,
    deliverable.comments,
  );
}

function hasSubmittedDeliverable(deliverable: CampaignDeliverable) {
  return (
    isSubmittedStatus(deliverable.status) ||
    getSubmittedLinks(deliverable).length > 0
  );
}

function getContractDeliverables(campaign: CampaignData) {
  return asArray<any>(campaign.contract?.content?.scheduleA?.deliverables);
}

function findContractDeliverableMeta(
  campaign: CampaignData,
  milestone: NormalizedMilestone,
  deliverable: CampaignDeliverable,
) {
  const deliverableId = normalizeMongoId(
    deliverable.deliverableId || deliverable._id || deliverable.id,
  );
  const deliverableName = getDeliverableTitle(deliverable, 0).toLowerCase();
  const milestoneId = normalizeMongoId(
    milestone.raw.sourceMilestoneId ||
      milestone.raw.milestoneHistoryId ||
      milestone.raw._id ||
      milestone.raw.id,
  );

  return getContractDeliverables(campaign).find((item) => {
    const itemId = normalizeMongoId(
      item?.deliverableId || item?._id || item?.id,
    );
    const itemMilestoneId = normalizeMongoId(
      item?.milestoneId || item?.sourceMilestoneId,
    );
    const itemName = pickString(
      item?.deliverableName,
      item?.deliverableFormat,
      item?.name,
      item?.title,
    ).toLowerCase();

    if (deliverableId && itemId && deliverableId === itemId) return true;
    if (
      milestoneId &&
      itemMilestoneId &&
      milestoneId === itemMilestoneId &&
      itemName === deliverableName
    )
      return true;
    if (itemName && itemName === deliverableName) return true;

    return false;
  });
}

function shouldShowAddDraft(
  campaign: CampaignData,
  milestone: NormalizedMilestone,
  deliverable: CampaignDeliverable,
) {
  const contractMeta =
    findContractDeliverableMeta(campaign, milestone, deliverable) || {};

  return Boolean(
    isTruthy(deliverable.draftRequired) ||
    isTruthy(deliverable.needDraftFirst) ||
    isTruthy(deliverable.requiresDraft) ||
    isTruthy(deliverable.preShootScriptRequired) ||
    isTruthy(milestone.raw.needDraftFirst) ||
    isTruthy(milestone.raw.draftRequired) ||
    isTruthy(contractMeta?.draftRequired) ||
    isTruthy(contractMeta?.preShootScriptRequired) ||
    isTruthy(campaign.contract?.content?.scheduleA?.preShootScriptRequired),
  );
}

function getDeliverableQuantity(deliverable: CampaignDeliverable) {
  const quantity = toNumber(deliverable.quantity);
  return quantity > 0 ? Math.max(1, Math.round(quantity)) : 1;
}

function getMilestoneCount(campaign: CampaignData) {
  const milestones = asArray<CampaignMilestone>(campaign.milestones);
  const total = toNumber(campaign.totalMilestones) || milestones.length;
  const completed =
    toNumber(campaign.completedMilestones) ||
    milestones.filter((item) =>
      isCompletedStatus(
        item.status || item.payoutStatus || (item.released ? "released" : ""),
      ),
    ).length;

  return { completed, total };
}

function getAllApiDeliverables(campaign: CampaignData) {
  const milestoneDeliverables = asArray<CampaignMilestone>(
    campaign.milestones,
  ).flatMap((milestone) =>
    asArray<CampaignDeliverable>(milestone.deliverables),
  );

  if (milestoneDeliverables.length) return milestoneDeliverables;

  return asArray<CampaignDeliverable>(campaign.deliverables);
}

function getDeliverableCount(campaign: CampaignData) {
  const deliverables = getAllApiDeliverables(campaign);
  const total = toNumber(campaign.totalDeliverables) || deliverables.length;
  const completed =
    toNumber(campaign.completedDeliverables) ||
    deliverables.filter((item) => isSubmittedStatus(item.status)).length;

  return { completed, total };
}

function getMilestoneId(item: CampaignMilestone, index: number) {
  return (
    normalizeMongoId(
      item.milestoneHistoryId || item._id || item.id || item.milestoneId,
    ) || `api-milestone-${index + 1}`
  );
}

function getDeliverableId(item: CampaignDeliverable, index: number) {
  return (
    normalizeMongoId(item.deliverableId || item._id || item.id) ||
    `api-deliverable-${index + 1}`
  );
}

function getDeliverableTitle(item: CampaignDeliverable, index: number) {
  return pickString(
    item.deliverableName,
    item.title,
    item.name,
    `Deliverable ${index + 1}`,
  );
}

function getDeliverableFormat(item: CampaignDeliverable) {
  return pickString(
    item.contentFormat,
    item.format,
    item.delivery,
    asArray<string>(item.deliveries).join(", "),
    asArray<string>(item.deliveryTypes).join(", "),
  );
}

function getDeliverablePlatform(item: CampaignDeliverable) {
  return pickString(item.platform, asArray<string>(item.platforms).join(", "));
}

function getNormalizedMilestones(
  campaign: CampaignData,
): NormalizedMilestone[] {
  const campaignMilestones = asArray<CampaignMilestone>(campaign.milestones);
  const allDeliverables = asArray<CampaignDeliverable>(campaign.deliverables);

  return campaignMilestones.map((item, index) => {
    const id = getMilestoneId(item, index);
    const relatedDeliverables = asArray<CampaignDeliverable>(item.deliverables)
      .concat(
        allDeliverables.filter((deliverable) => {
          const milestoneId = normalizeMongoId(
            deliverable.milestoneHistoryId ||
              deliverable.milestoneId ||
              deliverable.milestone ||
              deliverable.milestone_id,
          );
          return milestoneId && milestoneId === id;
        }),
      )
      .filter(Boolean);

    const firstDeliverable = relatedDeliverables[0] || null;
    const platform = pickString(
      item.platform,
      asArray<string>(item.platforms).join(", "),
      firstDeliverable ? getDeliverablePlatform(firstDeliverable) : "",
    );

    const completedDeliverables = relatedDeliverables.filter(
      hasSubmittedDeliverable,
    ).length;
    const totalDeliverables = relatedDeliverables.length;

    return {
      id,
      title: pickString(
        item.milestoneTitle,
        item.milestoneName,
        item.title,
        item.name,
        `Milestone ${index + 1}`,
      ),
      content: pickString(
        item.contentFormat,
        item.milestoneDescription,
        item.description,
        item.instructions,
        firstDeliverable ? getDeliverableFormat(firstDeliverable) : "",
      ),
      platform,
      status: pickString(
        item.status,
        item.payoutStatus,
        item.released ? "released" : "pending",
      ),
      quantity: compactNumber(item.quantity || relatedDeliverables.length),
      deadline: formatNumericDate(
        item.dueDate || item.deadline || item.date || item.endDate,
      ),
      raw: item,
      deliverables: relatedDeliverables,
      completedDeliverables,
      totalDeliverables,
      allDeliverablesSubmitted:
        totalDeliverables > 0 && completedDeliverables === totalDeliverables,
    };
  });
}

function getPaymentMilestoneRows(campaign: CampaignData) {
  const rows = getNormalizedMilestones(campaign);
  const currency = campaign.payout?.currency;

  return rows.map((row) => {
    const raw = row.raw;
    const completedDeliverables =
      toNumber(raw.completedDeliverables) ||
      row.deliverables.filter((deliverable) =>
        isSubmittedStatus(deliverable.status),
      ).length;
    const totalDeliverables =
      toNumber(raw.totalDeliverables) ||
      toNumber(raw.quantity) ||
      row.deliverables.length;
    const progress =
      clampPercent(raw.percent ?? raw.progress) ||
      (totalDeliverables
        ? Math.min(
            100,
            Math.round(
              (completedDeliverables / Math.max(1, totalDeliverables)) * 100,
            ),
          )
        : 0);
    const budget = toNumber(raw.amount || raw.milestoneBudget || raw.budget);

    return {
      ...row,
      deliverableProgress: `${completedDeliverables}/${totalDeliverables}`,
      progress,
      budgetLabel: formatMoney(budget, currency),
    };
  });
}

function getContractFile(campaign: CampaignData) {
  return (
    campaign.contractFile ||
    campaign.contract?.file ||
    campaign.contract?.contractFile ||
    campaign.contract?.document ||
    campaign.brandGuideline ||
    null
  );
}

function getContractDetails(
  campaign: CampaignData,
  influencer: InfluencerData,
) {
  const contract = campaign.contract || {};

  return [
    {
      label: "Contract ID",
      value: pickString(
        contract.contractId,
        contract._id,
        influencer.contractId,
        "-",
      ),
    },
    {
      label: "Status",
      value: pickString(contract.status, influencer.contractStatus, "-"),
      badge: true,
    },
    {
      label: "Signed by YOU",
      value: formatDate(
        getFirstValue(contract, [
          "signedByYouAt",
          "influencerSignedAt",
          "signedAt",
        ]),
      ),
    },
    {
      label: "Signed by Brand",
      value: formatDate(
        getFirstValue(contract, [
          "signedByBrandAt",
          "brandSignedAt",
          "brandSignedOn",
        ]),
      ),
    },
    {
      label: "Usage Rights",
      value: pickString(contract.usageRights, campaign.usageRights, "-"),
    },
    {
      label: "Content Ownership",
      value: pickString(
        contract.contentOwnership,
        campaign.contentOwnership,
        "-",
      ),
    },
    {
      label: "Payment Type",
      value: pickString(contract.paymentType, campaign.paymentType, "-"),
    },
    {
      label: "Payment Terms",
      value: pickString(contract.paymentTerms, campaign.paymentTerms, "-"),
    },
    {
      label: "Exclusivity Period",
      value: pickString(
        contract.exclusivityPeriod,
        campaign.exclusivityPeriod,
        "-",
      ),
    },
  ];
}

function getPaymentHistory(campaign: CampaignData): PaymentHistoryRow[] {
  const currency = campaign.payout?.currency;
  const sourceRows = asArray<any>(
    campaign.paymentHistory || campaign.transactions || campaign.payments,
  );

  if (sourceRows.length) {
    return sourceRows.map((item, index) => {
      const amount = toNumber(item.amount || item.value || item.total);
      const status = pickString(item.status, item.paymentStatus, "-");
      const type =
        String(item.type || item.kind || "")
          .toLowerCase()
          .includes("fee") || amount < 0
          ? "debit"
          : "credit";
      const signedAmount =
        type === "debit" ? -Math.abs(amount) : Math.abs(amount);

      return {
        id: normalizeMongoId(item._id || item.id) || `payment-${index + 1}`,
        name: pickString(
          item.title,
          item.name,
          item.description,
          `Payment ${index + 1}`,
        ),
        subId: pickString(
          item.referenceId,
          item.reference,
          item.transactionId,
          item.txnId,
          "-",
        ),
        txnId: pickString(item.transactionId, item.txnId, item.id, "-"),
        amount: signedAmount,
        amountLabel: formatSignedMoney(signedAmount, currency),
        type,
        receiptUrl: normalizeAssetUrl(
          item.receiptUrl || item.pdfUrl || item.file?.url,
        ),
        status,
      };
    });
  }

  return [];
}
function extractApiArray(payload: any, keys: string[]) {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.result,
  ];

  for (const source of candidates) {
    if (!source) continue;

    if (Array.isArray(source)) return source;

    for (const key of keys) {
      const value = source?.[key];
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.data)) return value.data;
      if (Array.isArray(value?.items)) return value.items;
    }
  }

  return [];
}

function normalizeMilestoneApiRows(rows: any[]): CampaignMilestone[] {
  return rows.map((row, index) => ({
    ...row,
    id: pickString(
      row.milestoneHistoryId,
      row._id,
      row.id,
      `api-milestone-${index + 1}`,
    ),
    title: pickString(row.milestoneTitle, row.title, row.name),
    name: pickString(row.milestoneTitle, row.title, row.name),
    description: pickString(row.milestoneDescription, row.description),
    amount: row.amount ?? row.milestoneBudget ?? row.budget,
    budget: row.milestoneBudget ?? row.amount ?? row.budget,
    status: pickString(
      row.status,
      row.payoutStatus,
      row.released ? "released" : "pending",
    ),
    endDate: row.endDate ?? row.dueDate ?? row.deadline ?? null,
    deliverables: asArray<CampaignDeliverable>(row.deliverables),
  }));
}

async function fetchMilestonesFromApi({
  influencerId,
  campaignId,
  brandId,
}: {
  influencerId: string;
  campaignId: string;
  brandId?: string;
}) {
  if (!influencerId || !campaignId) return [];

  const response = await api.post("/milestone/getMilestome", {
    influencerId,
    campaignId,
    ...(brandId ? { brandId } : {}),
  });

  const payload = response?.data ?? response;
  const rows = extractApiArray(payload, [
    "milestones",
    "items",
    "data",
    "results",
  ]);

  return normalizeMilestoneApiRows(rows);
}

function mergeCampaignWithApiMilestones(
  campaign: CampaignData,
  apiMilestones: CampaignMilestone[],
): CampaignData {
  if (!apiMilestones.length) {
    return {
      ...campaign,
      milestones: asArray<CampaignMilestone>(campaign.milestones),
      deliverables: asArray<CampaignDeliverable>(campaign.deliverables),
    };
  }

  return {
    ...campaign,
    milestones: apiMilestones,
    deliverables: apiMilestones.flatMap((milestone) =>
      asArray<CampaignDeliverable>(milestone.deliverables),
    ),
    totalMilestones: apiMilestones.length,
    completedMilestones: apiMilestones.filter((milestone) =>
      isCompletedStatus(milestone.status || milestone.payoutStatus),
    ).length,
    totalDeliverables: apiMilestones.reduce(
      (sum, milestone) =>
        sum + asArray<CampaignDeliverable>(milestone.deliverables).length,
      0,
    ),
    completedDeliverables: apiMilestones.reduce(
      (sum, milestone) =>
        sum +
        asArray<CampaignDeliverable>(milestone.deliverables).filter(
          (deliverable) => isSubmittedStatus(deliverable.status),
        ).length,
      0,
    ),
  };
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3 text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[0.75rem] border border-[#E6E6E6] bg-white",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function EmptyValue() {
  return <span className="text-[0.875rem] leading-5 text-[#B8B8B8]">-</span>;
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const dotClass =
    lower.includes("submitted") || lower.includes("paid")
      ? "bg-[#84CAFF]"
      : lower.includes("active") ||
          lower.includes("progress") ||
          lower.includes("complete")
        ? "bg-[#17B26A]"
        : "bg-[#B8B8B8]";

  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F9F9F9] px-3 text-[0.75rem] font-medium leading-5 text-[#969696]">
      <span className={["h-2 w-2 rounded-full", dotClass].join(" ")} />
      {status || "-"}
    </span>
  );
}

function ToolbarFilter() {
  return (
    <button
      type="button"
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[0.5rem] border border-[#E6E6E6] bg-white px-3 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
    >
      Last 7 days
      <CaretDown weight="bold" className="h-3.5 w-3.5" />
    </button>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const lower = platform.toLowerCase();

  if (lower.includes("instagram")) {
    return (
      <Image
        src="/skill-icons_instagram.svg"
        alt="Instagram"
        width={18}
        height={18}
        className="h-[1.125rem] w-[1.125rem]"
      />
    );
  }

  if (lower.includes("youtube")) {
    return (
      <Image
        src="/logos_youtube-icon.svg"
        alt="YouTube"
        width={18}
        height={18}
        className="h-[1.125rem] w-[1.125rem]"
      />
    );
  }

  if (lower.includes("tiktok")) {
    return (
      <Image
        src="/ic_baseline-tiktok.svg"
        alt="TikTok"
        width={18}
        height={18}
        className="h-[1.125rem] w-[1.125rem]"
      />
    );
  }

  return <Pill>{platform}</Pill>;
}

function DetailBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[0.75rem] border border-[#E6E6E6] p-4">
      <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
        {label}
      </div>
      <div className="mt-3 text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
        {children}
      </div>
    </div>
  );
}

function SmallIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white text-[#1A1A1A] transition hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function CampaignHeader({
  brand,
  campaign,
  onMailBrand,
  onCopyLink,
  isOpeningThread,
}: {
  brand: BrandData;
  campaign: CampaignData;
  onMailBrand: () => void;
  onCopyLink: () => void;
  isOpeningThread: boolean;
}) {
  const brandName = pickString(brand.brandName, brand.name, "Brand");
  const campaignTitle = pickString(campaign.title, "Campaign");
  const logoUrl = normalizeAssetUrl(brand.profilePic);
  const website = pickString(brand.website, campaign.productUrl);
  const rating = pickString(campaign.rating, brand.rating);
  const status = getStatus(campaign);

  return (
    <section className="border-b border-[#E6E6E6] pb-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-5">
          <div className="flex h-[6.25rem] w-[6.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F9F9F9]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#F2F2F2] text-[1.5rem] font-bold text-[#1A1A1A]">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.5rem] font-bold leading-8 text-[#1A1A1A]">
                {campaignTitle}
              </h1>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1D9BF0] text-[0.6875rem] font-bold text-white">
                &#10003;
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] leading-4 text-[#969696]">
              <span className="inline-flex items-center gap-1 font-medium text-[#1A1A1A]">
                <span className="text-[#F6BB2A]">★</span>
                {rating}
              </span>

              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#969696] hover:text-[#1A1A1A]"
                >
                  <span className="max-w-[16rem] truncate">
                    {website.replace(/^https?:\/\//, "")}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-2 text-[0.75rem] leading-4 text-[#969696]">
              <CalendarDots weight="bold" className="h-4 w-4" />
              <span>
                {formatCampaignRange(campaign.startAt, campaign.endAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:pt-4">
          <span className="inline-flex h-8 items-center gap-2 rounded-[0.5rem] bg-white px-2 text-[0.875rem] font-medium text-[#6D6D6D]">
            <span
              className={[
                "h-2 w-2 rounded-full",
                isLiveStatus(status) ? "bg-[#17B26A]" : "bg-[#B8B8B8]",
              ].join(" ")}
            />
            {status}
          </span>

          <SmallIconButton
            label="Mail to brand"
            onClick={onMailBrand}
            disabled={isOpeningThread}
          >
            <EnvelopeSimple className="h-4 w-4" />
          </SmallIconButton>

          <SmallIconButton label="Copy link" onClick={onCopyLink}>
            <LinkSimple className="h-4 w-4" />
          </SmallIconButton>

          <SmallIconButton label="More options">
            <DotsThree className="h-5 w-5" />
          </SmallIconButton>
        </div>
      </div>
    </section>
  );
}

function ProgressStepper({ steps }: { steps: StepData[] }) {
  return (
    <section className="border-b border-[#E6E6E6] py-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-[0.375rem] flex-1 overflow-hidden rounded-full bg-[#E6E6E6]">
                <div
                  className="h-full rounded-full bg-[#12A150]"
                  style={{ width: `${step.percent}%` }}
                />
              </div>
              <span className="shrink-0 text-[0.6875rem] font-semibold leading-4 text-[#1A1A1A]">
                {step.percent}%
              </span>
            </div>

            <div className="flex gap-2">
              <span
                className={[
                  "mt-1 h-3 w-3 shrink-0 rounded-full border",
                  step.percent > 0
                    ? "border-[#12A150] bg-[#12A150]"
                    : "border-[#969696] bg-white",
                ].join(" ")}
              />

              <div className="min-w-0">
                <div className="text-[0.75rem] font-semibold leading-4 text-[#1A1A1A]">
                  {step.title}
                </div>
                <div className="mt-1 line-clamp-2 text-[0.6875rem] leading-4 text-[#B8B8B8]">
                  {step.subtitle}
                  {step.date && step.date !== "-" ? ` - ${step.date}` : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CampaignTabs({ activeTab }: { activeTab: ActiveTab }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = useMemo(
    () => pathname.replace(/\/(milestone-and-deliverables|payment)\/?$/, ""),
    [pathname],
  );
  const querySuffix = useMemo(() => {
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }, [searchParams]);

  const tabs = [
    {
      key: "overview" as const,
      label: "Overview",
      href: `${basePath}${querySuffix}`,
    },
    {
      key: "milestones" as const,
      label: "Milestone & Deliverables",
      href: `${basePath}/milestone-and-deliverables${querySuffix}`,
    },
    {
      key: "payment" as const,
      label: "Payment",
      href: `${basePath}/payment${querySuffix}`,
    },
  ];

  return (
    <nav className="border-b border-[#E6E6E6]">
      <div className="flex gap-10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={[
                "relative flex h-14 shrink-0 items-center text-[0.875rem] font-semibold transition",
                active
                  ? "text-[#1A1A1A]"
                  : "text-[#B8B8B8] hover:text-[#1A1A1A]",
              ].join(" ")}
            >
              {tab.label}
              {active ? (
                <span className="absolute bottom-0 left-0 h-[0.1875rem] w-full rounded-t-full bg-[#F6BB2A]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
        {label}
      </div>
      <div className="mt-3 text-[1rem] font-semibold leading-6 text-[#1A1A1A]">
        {children}
      </div>
    </div>
  );
}

function SummaryCard({ campaign }: { campaign: CampaignData }) {
  const milestoneCount = getMilestoneCount(campaign);
  const deliverableCount = getDeliverableCount(campaign);
  const contentFormat = asArray<string>(campaign.contentFormat);
  const contentLanguage = asArray<string>(campaign.contentLanguage).join(", ");
  const activeDate = pickString(
    campaign.activeDate,
    formatShortDate(campaign.startAt),
  );

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-[#E6E6E6] md:grid-cols-3 md:divide-x md:divide-y-0">
        <SummaryCell label="Campaign Fees">
          {formatMoneyRange(
            campaign.payout?.min,
            campaign.payout?.max,
            campaign.payout?.currency,
          )}
        </SummaryCell>
        <SummaryCell label="Milestones">
          {String(milestoneCount.completed).padStart(2, "0")}/
          {String(milestoneCount.total).padStart(2, "0")}
        </SummaryCell>
        <SummaryCell label="Total Deliverables">
          {String(deliverableCount.completed).padStart(2, "0")}/
          {String(deliverableCount.total).padStart(2, "0")}
        </SummaryCell>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[#E6E6E6] border-t border-[#E6E6E6] md:grid-cols-3 md:divide-x md:divide-y-0">
        <SummaryCell label="Content Format">
          <div className="flex flex-wrap gap-2">
            {contentFormat.length ? (
              contentFormat.map((item, index) => (
                <Pill key={`${item}-${index}`}>{item}</Pill>
              ))
            ) : (
              <EmptyValue />
            )}
          </div>
        </SummaryCell>
        <SummaryCell label="Content Language">
          {contentLanguage || "-"}
        </SummaryCell>
        <SummaryCell label="Active Date">{activeDate || "-"}</SummaryCell>
      </div>
    </Card>
  );
}

function AudienceCard({ campaign }: { campaign: CampaignData }) {
  const targetAgeGroups = asArray<string>(campaign.targetAgeGroups);
  const targetCountries = asArray<string>(campaign.targetCountries);
  const targetPlatforms = asArray<string>(campaign.targetPlatforms);
  const videoReferenceUrl = pickString(campaign.videoReferenceUrl);
  const videoThumbUrl = videoReferenceUrl
    ? getVideoThumb(videoReferenceUrl)
    : "";

  return (
    <Card className="p-4">
      <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
        Audience & Platforms
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <DetailBox label="Target age group">
          <div className="flex flex-wrap gap-2">
            {targetAgeGroups.length ? (
              targetAgeGroups.map((item, index) => (
                <Pill key={`${item}-${index}`}>{item}</Pill>
              ))
            ) : (
              <EmptyValue />
            )}
          </div>
        </DetailBox>

        <DetailBox label="Target country">
          <div className="flex flex-wrap gap-1">
            {targetCountries.length ? (
              targetCountries.map((item, index) => (
                <span key={`${item}-${index}`}>
                  {item}
                  {index < targetCountries.length - 1 ? ", " : ""}
                </span>
              ))
            ) : (
              <EmptyValue />
            )}
          </div>
        </DetailBox>

        <DetailBox label="Target Platform">
          <div className="flex flex-wrap items-center gap-3">
            {targetPlatforms.length ? (
              targetPlatforms.map((item, index) => (
                <PlatformIcon key={`${item}-${index}`} platform={item} />
              ))
            ) : (
              <EmptyValue />
            )}
          </div>
        </DetailBox>

        <Card className="p-3">
          <div className="text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
            Video Reference
          </div>

          {videoReferenceUrl ? (
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={videoReferenceUrl}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-1 break-all text-[0.875rem] font-medium leading-5 text-[#B8B8B8] hover:text-[#1A1A1A]"
              >
                {videoReferenceUrl}
              </a>

              <a
                href={videoReferenceUrl}
                target="_blank"
                rel="noreferrer"
                className="h-[10.125rem] w-full max-w-[12.875rem] rounded-[0.25rem] bg-[#F2F2F2] bg-cover bg-center"
                style={{
                  backgroundImage: videoThumbUrl
                    ? `url(${videoThumbUrl})`
                    : undefined,
                }}
                aria-label="Open video reference"
              />
            </div>
          ) : (
            <div className="mt-4 text-[0.875rem] text-[#B8B8B8]">-</div>
          )}
        </Card>
      </div>
    </Card>
  );
}

function ImageReferenceCarousel({ images }: { images: string[] }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const scrollToSlide = (index: number) => {
    const el = carouselRef.current;
    if (!el || !images.length) return;

    const clamped = Math.max(0, Math.min(index, images.length - 1));
    const child = el.children.item(clamped) as HTMLElement | null;

    child?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });

    setActiveSlide(clamped);
  };

  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;

    const children = Array.from(el.children) as HTMLElement[];
    if (!children.length) return;

    const left = el.scrollLeft;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.offsetLeft - left);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    setActiveSlide(bestIndex);
  };

  return (
    <section className="mt-5">
      <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
        Image / Reference
      </h2>

      <div className="relative mt-6">
        {images.length ? (
          <>
            <div
              ref={carouselRef}
              onScroll={onCarouselScroll}
              className="flex w-full items-center gap-8 overflow-x-auto scroll-smooth py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  className="h-[11.5rem] w-[13.8125rem] flex-none cursor-zoom-in rounded-[1.1875rem] bg-contain bg-center bg-no-repeat transition hover:opacity-90"
                  style={{ backgroundImage: `url(${src})` }}
                  aria-label={`Preview campaign image ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide - 1)}
              disabled={activeSlide <= 0}
              className="absolute left-4 top-[5.5rem] flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] disabled:opacity-40"
              aria-label="Previous image"
            >
              <CaretLeft weight="bold" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide + 1)}
              disabled={activeSlide >= images.length - 1}
              className="absolute right-4 top-[5.5rem] flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] disabled:opacity-40"
              aria-label="Next image"
            >
              <CaretRight weight="bold" className="h-5 w-5" />
            </button>

            <div className="mt-1 flex w-full items-center justify-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToSlide(index)}
                  aria-label={`Go to image ${index + 1}`}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      index === activeSlide ? "#1A1A1A" : "#E8E8E8",
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <Card className="flex h-[11.5rem] items-center justify-center text-[0.875rem] text-[#B8B8B8]">
            -
          </Card>
        )}
      </div>

      {previewIndex !== null ? (
        <ImagePreviewModal
          images={images}
          activeIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onPrev={() =>
            setPreviewIndex((current) => {
              if (current === null || !images.length) return current;
              return current <= 0 ? images.length - 1 : current - 1;
            })
          }
          onNext={() =>
            setPreviewIndex((current) => {
              if (current === null || !images.length) return current;
              return current >= images.length - 1 ? 0 : current + 1;
            })
          }
        />
      ) : null}
    </section>
  );
}

function PdfAttachmentCard({ file }: { file?: CampaignFile | null }) {
  const pdfUrl = normalizeAssetUrl(file?.url);
  const pdfName = pickString(file?.name, "Brandguideline.pdf");
  const pdfSizeText = formatFileSize(file?.size);

  if (!pdfUrl) {
    return (
      <Card className="flex min-h-[5rem] items-center justify-center p-4 text-[0.875rem] text-[#B8B8B8]">
        No brand guideline attached
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[5rem] items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <FilePdf weight="fill" className="h-8 w-8 shrink-0 text-[#F04438]" />
        <div className="min-w-0">
          <div className="truncate text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {pdfName}
          </div>
          {pdfSizeText ? (
            <div className="text-[0.875rem] font-normal leading-5 text-[#969696]">
              {pdfSizeText}
            </div>
          ) : null}
        </div>
      </div>

      <a
        href={pdfUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-[0.5rem] px-2 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
        aria-label="Download file"
      >
        <DownloadSimple weight="bold" className="h-4 w-4" />
        Download
      </a>
    </Card>
  );
}

function RowAction({
  title,
  onClick,
}: {
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-between rounded-[0.75rem] border border-[#E6E6E6] bg-white px-4 text-left text-[1rem] font-medium leading-6 text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
    >
      {title}
      <RowCaretRight weight="bold" className="h-4 w-4" />
    </button>
  );
}

function OverviewPageContent({
  campaign,
  onGoToMilestoneSection,
}: {
  campaign: CampaignData;
  onGoToMilestoneSection: (
    sectionId: "revision-history" | "deliverables",
  ) => void;
}) {
  const descriptionText = pickString(campaign.description);
  const additionalNotesText = pickString(campaign.additionalNotes);
  const hashtags = asArray<string>(campaign.hashtags);
  const carouselImages = asArray<CampaignImage>(campaign.productImages)
    .map((image) => normalizeAssetUrl(image.url))
    .filter(Boolean);

  return (
    <main className="pt-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.5rem] font-semibold leading-8 text-[#1A1A1A]">
            Overview
          </h2>
          <p className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
            Track campaign progress, creator participation, deliverables, and
            overall performance from a single place.
          </p>
        </div>

        <ToolbarFilter />
      </div>

      <SummaryCard campaign={campaign} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,33.25rem)]">
        <Card className="min-h-[31.25rem] p-4">
          <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
            Description
          </h2>
          <p className="mt-5 line-clamp-[18] text-[0.875rem] font-normal leading-5 text-[#969696]">
            {descriptionText || "-"}
          </p>
        </Card>

        <AudienceCard campaign={campaign} />
      </div>

      <ImageReferenceCarousel images={carouselImages} />

      <section className="mt-5">
        <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
          Additional Information
        </h2>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,33.25rem)]">
          <Card className="min-h-[18.5rem] p-4">
            <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
              Additional Notes
            </div>
            <p className="mt-5 line-clamp-[10] text-[0.875rem] font-normal leading-5 text-[#969696]">
              {additionalNotesText || "-"}
            </p>
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="min-h-[11.5rem] p-4">
              <div className="text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
                Hashtags
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {hashtags.length ? (
                  hashtags.map((tag, index) => (
                    <Pill key={`${tag}-${index}`}>{tag}</Pill>
                  ))
                ) : (
                  <EmptyValue />
                )}
              </div>
            </Card>

            <PdfAttachmentCard file={campaign.brandGuideline} />
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3">
        <RowAction
          title="View Revisions history"
          onClick={() => onGoToMilestoneSection("revision-history")}
        />
        <RowAction
          title="View Deliverables"
          onClick={() => onGoToMilestoneSection("deliverables")}
        />
      </div>

      <div className="mt-16 text-center text-[0.875rem] leading-5 text-[#B8B8B8]">
        You have reached the end of the page
      </div>
    </main>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  placeholder,
  rightIcon,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
}) {
  return (
    <div className="relative h-[3.875rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white">
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder=" "
        className={[
          "peer h-full w-full rounded-[0.75rem] border-none bg-transparent pb-[0.625rem] pl-4 pr-12 pt-[1.55rem]",
          "text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A] outline-none",
          "placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-60",
        ].join(" ")}
      />

      <span
        className={[
          "pointer-events-none absolute left-4 top-[0.55rem] z-10 translate-y-0 text-[0.75rem] font-medium leading-4 text-[#969696] transition-all",
          "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[1rem] peer-placeholder-shown:leading-[1.5rem] peer-placeholder-shown:text-[#B8B8B8]",
          "peer-focus:top-[0.55rem] peer-focus:translate-y-0 peer-focus:text-[0.75rem] peer-focus:leading-4 peer-focus:text-[#969696]",
        ].join(" ")}
      >
        {label || placeholder}
      </span>

      {rightIcon ? (
        <span className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-[#969696]">
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
}

function LabeledTextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 5,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block rounded-[0.75rem] border border-[#E6E6E6] bg-white px-4 py-3">
      <span className="block border-b border-[#E6E6E6] pb-2.5 text-[1rem] font-semibold leading-[1.5rem] text-[#969696]">
        {label}
      </span>

      <textarea
        value={value}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full resize-none border-none bg-transparent text-[0.9375rem] leading-[1.5rem] text-[#1A1A1A] outline-none placeholder:text-[#B8B8B8] disabled:cursor-not-allowed disabled:opacity-60"
        placeholder={placeholder}
      />

      {typeof maxLength === "number" ? (
        <div className="text-right text-[0.875rem] leading-5 text-[#B8B8B8]">
          {value.length}/{maxLength}
        </div>
      ) : null}
    </label>
  );
}

function SubmitDeliverableModal({
  state,
  influencerId,
  onClose,
  onSubmitted,
}: {
  state: SubmitDeliverableState;
  influencerId: string;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [submissionName, setSubmissionName] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedInvalid, setConfirmedInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxNotes = 500;

  useEffect(() => {
    if (!state) return;

    const deliverable = state.deliverable;
    const existingLinks =
      state.mode === "draft"
        ? getDraftLinks(deliverable)
        : getSubmittedLinks(deliverable);
    const quantity =
      state.mode === "draft" ? 1 : getDeliverableQuantity(deliverable);
    const nextLinks = Array.from(
      { length: Math.max(1, quantity) },
      (_, index) => existingLinks[index]?.url || "",
    );

    setSubmissionName(getDeliverableSubmissionName(deliverable, 0));
    setLinks(nextLinks);
    setNotes(
      pickString(
        state.mode === "draft"
          ? deliverable.draftNotes
          : getDeliverableAdditionalNotes(deliverable),
      ),
    );
    setConfirmed(false);
    setConfirmedInvalid(false);
    setIsSubmitting(false);
  }, [state]);

  if (!state) return null;

  const { mode, milestone, deliverable } = state;
  const isDraft = mode === "draft";
  const title = `${isDraft ? "Submit Draft" : hasSubmittedDeliverable(deliverable) ? "Update" : "Submit"} ${getDeliverableTitle(deliverable, 0)}`;
  const allLinksValid = links.every((item) => normalizeAssetUrl(item));
  const canSubmit = Boolean(
    submissionName.trim() && allLinksValid && !isSubmitting,
  );

  const updateLink = (index: number, value: string) => {
    setLinks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;

    if (!confirmed) {
      setConfirmedInvalid(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        influencerId,
        milestoneId: pickString(
          milestone.raw.milestoneId,
          milestone.raw.parentMilestoneId,
        ),
        milestoneHistoryId: pickString(
          milestone.raw.milestoneHistoryId,
          milestone.raw._id,
          milestone.id,
        ),
        deliverableId: pickString(
          deliverable.deliverableId,
          deliverable._id,
          deliverable.id,
        ),
        submissionType: isDraft ? "draft" : "final",
        submissionName: submissionName.trim(),
        notes: notes.trim(),
        additionalNotes: notes.trim(),
        deliverableLinks: links.map((url, index) => ({
          label: isDraft
            ? `Draft Link ${index + 1}`
            : `Submission Link ${index + 1}`,
          url: normalizeAssetUrl(url),
        })),
      };

      await api.post("/milestone/submitDeliverable", payload);
      onSubmitted(
        isDraft
          ? "Draft submitted successfully."
          : "Deliverable submitted successfully.",
      );
      onClose();
    } catch (error: any) {
      onSubmitted(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to submit deliverable.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/20 px-4 py-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-[48rem] overflow-y-auto rounded-[1rem] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[#D9D9D9] pb-4">
          <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
            {title}
          </h2>
          <div className="flex items-center gap-6">
            <span className="hidden text-[0.9375rem] font-semibold text-[#B8B8B8] sm:inline">
              {formatDate(new Date())}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[1.5rem] leading-none text-[#1A1A1A]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3.5">
          <FloatingInput
            label="Submission Name"
            value={submissionName}
            onChange={setSubmissionName}
            placeholder="Submission name"
          />

          {links.map((value, index) => (
            <FloatingInput
              key={index}
              label={
                isDraft
                  ? "Draft Link"
                  : links.length > 1
                    ? `Submission Link ${index + 1}`
                    : "Submission Link"
              }
              value={value}
              onChange={(nextValue) => updateLink(index, nextValue)}
              placeholder={
                isDraft
                  ? "Draft link"
                  : links.length > 1
                    ? `Submission link ${index + 1}`
                    : "Submission link"
              }
              rightIcon={<LinkSimple className="h-5 w-5" />}
            />
          ))}

          <LabeledTextArea
            label="Additional Notes"
            value={notes}
            maxLength={maxNotes}
            onChange={setNotes}
            rows={4}
            placeholder="Add a message or additional Information to the brand..."
          />

          <label className="flex items-start gap-3 text-[0.9375rem] leading-6 text-[#1A1A1A]">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => {
                setConfirmed(v === true);
                if (confirmedInvalid) setConfirmedInvalid(false);
              }}
              onClick={() => {
                if (confirmedInvalid) setConfirmedInvalid(false);
              }}
              aria-invalid={confirmedInvalid}
              className={cn(
                "mt-0.5 bg-background border rounded-[4px] w-[20px] h-[20px] p-[4px] shrink-0",
                confirmedInvalid
                  ? "border-[color:var(--Errors-500,#E35141)]"
                  : "border-[color:var(--Border-Primary,#B3B3B3)]",
              )}
            />
            <span>
              I Confirm that Updating the Content follows the Campaign
              Guidelines and requirements.
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[0.75rem] px-5 text-[0.875rem] font-semibold text-[#1A1A1A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="h-9 min-w-[7.5rem] rounded-[0.75rem] bg-[#1A1A1A] px-6 text-[0.875rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting..."
              : hasSubmittedDeliverable(deliverable) && !isDraft
                ? "Update"
                : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliverableDetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
      <div className="text-[0.875rem] font-medium leading-5 text-[#969696]">
        {label}
      </div>
      <div className="min-w-0 break-words text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
        {children || "-"}
      </div>
    </div>
  );
}


function SubmissionOpenLink({
  links,
}: {
  links: Array<{ label?: string; url?: string }>;
}) {
  const rows = links.filter((item) => item.url);

  if (!rows.length) return <EmptyValue />;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 text-[0.875rem] font-semibold leading-5 text-[#1A1A1A] underline underline-offset-2"
        >
          Open Link
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-[0.25rem] bg-[#F2F2F2] text-[#6D6D6D]">
            <LinkSimple className="h-3.5 w-3.5" />
          </span>
        </a>
      ))}
    </div>
  );
}

function SubmissionStatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex h-6 w-fit items-center gap-1.5 rounded-full bg-[#F9F9F9] px-2 text-[0.75rem] font-medium leading-4 text-[#969696]">
      <span className="h-2 w-2 rounded-full bg-[#84CAFF]" />
      {formatStatusText(status)}
    </span>
  );
}

function TimelineStatusIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <CheckCircle
        weight="fill"
        className="relative z-10 h-5 w-5 shrink-0 text-[#28A745]"
      />
    );
  }

  return (
    <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#FDB022] bg-white">
      <span className="h-2 w-2 rounded-full bg-[#FDB022]" />
    </span>
  );
}

function SubmissionTimelineItem({
  title,
  date,
  completed,
  isLast,
}: {
  title: string;
  date: any;
  completed: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={[
        "relative flex gap-3",
        !isLast
          ? "after:absolute after:left-[0.5625rem] after:top-7 after:h-[calc(100%+0.75rem)] after:w-px after:bg-[#E6E6E6]"
          : "",
      ].join(" ")}
    >
      <TimelineStatusIcon completed={completed} />
      <div className="min-w-0 pb-5">
        <div className="text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
          {title}
        </div>
        <div className="mt-0.5 text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
          {formatTimelineDate(date)}
        </div>
      </div>
    </div>
  );
}

function DeliverableViewModal({
  state,
  campaign,
  onClose,
  onSubmitDeliverable,
}: {
  state: ViewDeliverableState;
  campaign: CampaignData;
  onClose: () => void;
  onSubmitDeliverable: (
    milestone: NormalizedMilestone,
    deliverable: CampaignDeliverable,
    mode: SubmissionMode,
  ) => void;
}) {
  const [activeTab, setActiveTab] = useState<"about" | "submission">("about");

  useEffect(() => {
    if (!state) return;
    setActiveTab(state.initialTab || "about");
  }, [state]);

  if (!state) return null;

  const { milestone, deliverable } = state;
  const hasSubmission = hasSubmittedDeliverable(deliverable);
  const submittedLinks = getSubmittedLinks(deliverable);
  const draftLinks = getDraftLinks(deliverable);
  const status = pickString(deliverable.status, "pending");
  const submissionName = getDeliverableSubmissionName(deliverable, 0);
  const submissionNotes = getDeliverableAdditionalNotes(deliverable);
  const revisionRows = asArray<any>(deliverable.revisions);
  const contractMeta =
    findContractDeliverableMeta(campaign, milestone, deliverable) || {};
  const revisionType = revisionRows.length
    ? pickString(revisionRows[revisionRows.length - 1]?.revisionType, "-")
    : "-";
  const revisionPayout = revisionRows.length
    ? formatMoney(
        revisionRows[revisionRows.length - 1]?.revisionBudget,
        campaign.payout?.currency,
      )
    : "-";
  const draftSubmittedAt =
    deliverable.draftSubmittedAt || deliverable.preShootScriptSubmittedAt;
  const preShootViewedAt =
    deliverable.preShootScriptViewedAt ||
    deliverable.draftViewedAt ||
    deliverable.viewedAt;
  const preShootApprovedAt =
    deliverable.preShootScriptApprovedAt ||
    deliverable.draftApprovedAt ||
    deliverable.approvedPreShootAt;
  const hasDraftFlow = Boolean(draftLinks.length || draftSubmittedAt);
  const hasDeliverySubmitted = Boolean(deliverable.submittedAt || submittedLinks.length);
  const fallbackTimelineDate =
    deliverable.submittedAt ||
    draftSubmittedAt ||
    deliverable.deadline ||
    deliverable.dueDate ||
    milestone.raw.endDate;
  const timelineItems = [
    ...(hasDraftFlow
      ? [
          {
            title: "Pre-shoot Script Submitted",
            date: draftSubmittedAt || fallbackTimelineDate,
            completed: Boolean(draftSubmittedAt || draftLinks.length),
          },
          {
            title: "Pre-shoot Viewed by Brand",
            date: preShootViewedAt || draftSubmittedAt || fallbackTimelineDate,
            completed: Boolean(preShootViewedAt || draftLinks.length),
          },
          {
            title: "Pre-shoot Viewed by Brand",
            date:
              preShootApprovedAt ||
              preShootViewedAt ||
              draftSubmittedAt ||
              fallbackTimelineDate,
            completed: Boolean(preShootApprovedAt || preShootViewedAt || draftLinks.length),
          },
        ]
      : []),
    {
      title: hasDeliverySubmitted ? "Delivery Submitted" : "Delivery Not Submitted",
      date: deliverable.submittedAt || fallbackTimelineDate,
      completed: hasDeliverySubmitted,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-stretch justify-end bg-black/20 p-3 pl-0"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-full w-full max-w-[40rem] flex-col overflow-hidden rounded-[0.75rem] border border-[#E6E6E6] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-3 py-2.5">
          <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
            {getDeliverableTitle(deliverable, 0)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[1.5rem] leading-none text-[#1A1A1A]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div
            className="grid rounded-[0.75rem] border border-[#E6E6E6] p-1"
            style={{ gridTemplateColumns: hasSubmission ? "1fr 1fr" : "1fr" }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={[
                "h-8 rounded-[0.5rem] text-[0.875rem] font-semibold",
                activeTab === "about"
                  ? "bg-[#F9F9F9] text-[#1A1A1A]"
                  : "text-[#B8B8B8]",
              ].join(" ")}
            >
              About Deliverable
            </button>
            {hasSubmission ? (
              <button
                type="button"
                onClick={() => setActiveTab("submission")}
                className={[
                  "h-8 rounded-[0.5rem] text-[0.875rem] font-semibold",
                  activeTab === "submission"
                    ? "bg-[#F9F9F9] text-[#1A1A1A]"
                    : "text-[#B8B8B8]",
                ].join(" ")}
              >
                Deliverable Submission
              </button>
            ) : null}
          </div>

          {activeTab === "about" ? (
            <section className="mt-5">
              <h3 className="text-[1.125rem] font-semibold text-[#1A1A1A]">
                About Deliverable
              </h3>
              <div className="mt-6 flex flex-col gap-5">
                <DeliverableDetailRow label="Deliverable Name">
                  {getDeliverableTitle(deliverable, 0)}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Submission Date">
                  {formatDate(
                    deliverable.submittedAt ||
                      deliverable.deadline ||
                      deliverable.dueDate,
                  )}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Platform">
                  {getDeliverablePlatform(deliverable) ? (
                    <PlatformIcon
                      platform={getDeliverablePlatform(deliverable)}
                    />
                  ) : (
                    <EmptyValue />
                  )}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Quantity">
                  {String(getDeliverableQuantity(deliverable)).padStart(2, "0")}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Content Format">
                  {getDeliverableFormat(deliverable) || "-"}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Milestone Payout">
                  {formatMoney(
                    milestone.raw.amount ||
                      milestone.raw.milestoneBudget ||
                      milestone.raw.budget,
                    campaign.payout?.currency,
                  )}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Aspect Ratio">
                  {pickString(
                    deliverable.aspectRatio,
                    deliverable.dimensions,
                    contractMeta?.aspectRatio,
                    "-",
                  )}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Status">
                  <StatusBadge status={status} />
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Under Milestone">
                  {milestone.title}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Milestone Description">
                  {pickString(
                    milestone.raw.milestoneDescription,
                    milestone.raw.description,
                    "-",
                  )}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Additional Notes">
                  {submissionNotes || "-"}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Grace Period">
                  {toNumber(milestone.raw.graceDays) > 0 ? "YES" : "-"}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Revision Type">
                  {revisionType}
                </DeliverableDetailRow>
                <DeliverableDetailRow label="Revision Payout">
                  {revisionPayout}
                </DeliverableDetailRow>
              </div>
            </section>
          ) : null}

          {activeTab === "submission" && hasSubmission ? (
            <section className="mt-4">
              <h3 className="text-[0.9375rem] font-semibold leading-5 text-[#1A1A1A]">
                Deliverable Submission
              </h3>

              <div className="mt-6 flex flex-col gap-5">
                <DeliverableDetailRow label="Deliverable Name">
                  {getDeliverableTitle(deliverable, 0)}
                </DeliverableDetailRow>

                {draftLinks.length ? (
                  <DeliverableDetailRow label="Pre-shoot Script">
                    <SubmissionOpenLink links={draftLinks} />
                  </DeliverableDetailRow>
                ) : null}

                <DeliverableDetailRow label="Submission Link">
                  <SubmissionOpenLink links={submittedLinks} />
                </DeliverableDetailRow>

                <DeliverableDetailRow label="Additional Notes">
                  {submissionNotes || "-"}
                </DeliverableDetailRow>

                <DeliverableDetailRow label="Status">
                  <SubmissionStatusBadge status={status} />
                </DeliverableDetailRow>
              </div>

              <div className="mt-9">
                <h4 className="text-[0.9375rem] font-semibold leading-5 text-[#1A1A1A]">
                  Timeline
                </h4>

                <div className="mt-5 flex flex-col">
                  {timelineItems.map((item, index) => (
                    <SubmissionTimelineItem
                      key={`${item.title}-${index}`}
                      title={item.title}
                      date={item.date}
                      completed={item.completed}
                      isLast={index === timelineItems.length - 1}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E6E6E6] px-3 py-3">
          {/* <button
            type="button"
            className="h-10 rounded-[0.75rem] border border-[#E6E6E6] px-5 text-[0.9375rem] font-semibold text-[#1A1A1A]"
          >
            Get help
          </button> */}
          <button
            type="button"
            onClick={() => onSubmitDeliverable(milestone, deliverable, "final")}
            className="h-10 rounded-[0.75rem] bg-[#1A1A1A] px-5 text-[0.9375rem] font-semibold text-white"
          >
            {hasSubmission ? "Update Deliverable" : "Submit Deliverable"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliverableNestedTable({
  campaign,
  milestone,
  deliverables,
  onSubmitDeliverable,
  onViewDeliverable,
  anchorId,
}: {
  campaign: CampaignData;
  milestone: NormalizedMilestone;
  deliverables: CampaignDeliverable[];
  onSubmitDeliverable: (
    milestone: NormalizedMilestone,
    deliverable: CampaignDeliverable,
    mode: SubmissionMode,
  ) => void;
  onViewDeliverable: (
    milestone: NormalizedMilestone,
    deliverable: CampaignDeliverable,
    initialTab?: "about" | "submission",
  ) => void;
  anchorId?: string;
}) {
  return (
    <div
      id={anchorId}
      className="scroll-mt-24 border-t border-[#E6E6E6] px-3 pb-3 pt-5 sm:px-4"
    >
      <h3 className="text-[1rem] font-semibold leading-6 text-[#1A1A1A]">
        Deliverables
      </h3>

      <div className="mt-3 overflow-hidden rounded-[0.75rem] border border-[#E6E6E6]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left">
            <tbody className="divide-y divide-[#E6E6E6] text-[0.875rem] text-[#1A1A1A]">
              {deliverables.length ? (
                deliverables.map((item, index) => {
                  const status = pickString(item.status, "pending");
                  const hasSubmission = hasSubmittedDeliverable(item);
                  const actionLabel = hasSubmission
                    ? "Update Deliverable"
                    : "Submit Deliverable";
                  const showDraft = shouldShowAddDraft(
                    campaign,
                    milestone,
                    item,
                  );

                  return (
                    <tr key={getDeliverableId(item, index)}>
                      <td className="w-10 px-3.5 py-3.5 font-semibold">
                        {index + 1}.
                      </td>
                      <td className="px-3.5 py-3.5 font-semibold">
                        <button
                          type="button"
                          onClick={() =>
                            onViewDeliverable(milestone, item, "about")
                          }
                          className="text-left font-semibold underline-offset-4 hover:underline"
                        >
                          {getDeliverableTitle(item, index)}
                        </button>
                      </td>
                      <td className="px-3.5 py-3.5 font-semibold">
                        {getDeliverableFormat(item) || "-"}
                      </td>
                      <td className="px-3.5 py-3.5 font-semibold">
                        {pickString(
                          item.dimensions,
                          item.aspectRatio,
                          item.sizeLabel,
                          "-",
                        )}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="flex justify-center">
                          {getDeliverablePlatform(item) ? (
                            <PlatformIcon
                              platform={getDeliverablePlatform(item)}
                            />
                          ) : (
                            <EmptyValue />
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-3.5 py-3.5 font-semibold">
                        {compactNumber(item.quantity || 1)}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onSubmitDeliverable(milestone, item, "final")
                            }
                            className="h-10 whitespace-nowrap rounded-[0.5rem] border border-[#E6E6E6] bg-white px-4 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                          >
                            {actionLabel}
                          </button>
                          {showDraft ? (
                            <button
                              type="button"
                              onClick={() =>
                                onSubmitDeliverable(milestone, item, "draft")
                              }
                              className="h-10 whitespace-nowrap rounded-[0.5rem] border border-[#E6E6E6] bg-white px-4 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                            >
                              {getDraftLinks(item).length
                                ? "Update Draft"
                                : "Add Draft"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-[#B8B8B8]"
                    colSpan={8}
                  >
                    No deliverables found for this milestone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MilestonePageContent({
  campaign,
  influencerId,
  onAction,
  onReload,
}: {
  campaign: CampaignData;
  influencerId: string;
  onAction: (message: string) => void;
  onReload: () => void;
}) {
  const rows = useMemo(() => getNormalizedMilestones(campaign), [campaign]);
  const [openMilestoneId, setOpenMilestoneId] = useState("");
  const [submitState, setSubmitState] = useState<SubmitDeliverableState>(null);
  const [viewState, setViewState] = useState<ViewDeliverableState>(null);
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState("");

  useEffect(() => {
    if (!rows.length) return;
    setOpenMilestoneId((current) => current || rows[0].id);
  }, [rows]);

  useEffect(() => {
    const scrollToHashSection = () => {
      const sectionId = window.location.hash.replace("#", "");
      if (!sectionId) return;

      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 250);
    };

    scrollToHashSection();
    window.addEventListener("hashchange", scrollToHashSection);

    return () => {
      window.removeEventListener("hashchange", scrollToHashSection);
    };
  }, [openMilestoneId, rows.length]);

  const openSubmitDeliverable = (
    milestone: NormalizedMilestone,
    deliverable: CampaignDeliverable,
    mode: SubmissionMode,
  ) => {
    setViewState(null);
    setSubmitState({ milestone, deliverable, mode });
  };

  const openViewDeliverable = (
    milestone: NormalizedMilestone,
    deliverable: CampaignDeliverable,
    initialTab: "about" | "submission" = "about",
  ) => {
    setSubmitState(null);
    setViewState({ milestone, deliverable, initialTab });
  };

  const handleSubmitMilestone = async (row: NormalizedMilestone) => {
    if (!row.allDeliverablesSubmitted || submittingMilestoneId) return;

    setSubmittingMilestoneId(row.id);

    try {
      await api.post("/milestone/submitMilestone", {
        influencerId,
        milestoneId: pickString(row.raw.milestoneId, row.raw.parentMilestoneId),
        milestoneHistoryId: pickString(
          row.raw.milestoneHistoryId,
          row.raw._id,
          row.id,
        ),
      });

      onAction("Milestone submitted successfully.");
      onReload();
    } catch (error: any) {
      onAction(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to submit milestone.",
      );
    } finally {
      setSubmittingMilestoneId("");
    }
  };

  return (
    <main className="pt-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.5rem] font-semibold leading-8 text-[#1A1A1A]">
            Milestone & Deliverables
          </h2>
          <p className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
            Track your progress, complete deliverables, and stay on schedule
            throughout the campaign.
          </p>
        </div>

        <ToolbarFilter />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[63rem]">
          <div className="grid grid-cols-[1.1fr_2fr_0.9fr_0.9fr_0.8fr_1fr_1.35fr] rounded-[0.75rem] bg-[#F9F9F9] px-4 py-5 text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
            <div>Milestone</div>
            <div>Content format</div>
            <div>Platform</div>
            <div>Status</div>
            <div>Quantity</div>
            <div>Deadline</div>
            <div>Action</div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {rows.length === 0 ? (
              <Card className="p-8 text-center text-[0.875rem] text-[#B8B8B8]">
                No milestones found from API for this campaign.
              </Card>
            ) : null}

            {rows.map((row) => {
              const isOpen = row.id === openMilestoneId;
              const canSubmitMilestone = row.allDeliverablesSubmitted;
              const isSubmittingThisMilestone =
                submittingMilestoneId === row.id;

              return (
                <Card key={row.id} className="overflow-hidden">
                  <div className="grid grid-cols-[1.1fr_2fr_0.9fr_0.9fr_0.8fr_1fr_1.35fr] items-center px-4 py-6 text-[0.875rem] leading-5 text-[#1A1A1A]">
                    <div className="font-semibold">{row.title}</div>
                    <div className="pr-6 text-[0.75rem] font-semibold line-clamp-2">
                      {row.content}
                    </div>
                    <div>
                      {row.platform ? (
                        <PlatformIcon platform={row.platform} />
                      ) : (
                        <EmptyValue />
                      )}
                    </div>
                    <div>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="font-semibold">
                      {row.totalDeliverables
                        ? `${row.completedDeliverables}/${row.totalDeliverables}`
                        : row.quantity}
                    </div>
                    <div className="font-semibold">{row.deadline}</div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleSubmitMilestone(row)}
                        disabled={
                          !canSubmitMilestone || isSubmittingThisMilestone
                        }
                        title={
                          !canSubmitMilestone
                            ? "Submit all deliverables under this milestone first."
                            : undefined
                        }
                        className="h-9 whitespace-nowrap rounded-[0.5rem] bg-[#1A1A1A] px-4 text-[0.75rem] font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-[#F2F2F2] disabled:text-[#B8B8B8]"
                      >
                        {isSubmittingThisMilestone
                          ? "Submitting..."
                          : "Submit Milestone"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenMilestoneId(isOpen ? "" : row.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-[0.5rem] transition hover:bg-[#F9F9F9]"
                        aria-label={
                          isOpen ? "Hide deliverables" : "Show deliverables"
                        }
                      >
                        <CaretDown
                          weight="bold"
                          className={[
                            "h-4 w-4 transition-transform",
                            isOpen ? "rotate-180" : "",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <DeliverableNestedTable
                      campaign={campaign}
                      milestone={row}
                      deliverables={row.deliverables}
                      onSubmitDeliverable={openSubmitDeliverable}
                      onViewDeliverable={openViewDeliverable}
                      anchorId="deliverables"
                    />
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <section id="revision-history" className="mt-5 scroll-mt-24">
        <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
          Revision History
        </h2>
        <p className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
          Explore the list of Revision History across all the Deliveries
        </p>

        <Card className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left">
              <thead className="border-b border-[#E6E6E6] text-[0.75rem] font-semibold text-[#1A1A1A]">
                <tr>
                  <th className="px-3.5 py-3.5">Name</th>
                  <th className="px-3.5 py-3.5">Under delivery</th>
                  <th className="px-3.5 py-3.5">Submitted on</th>
                  <th className="px-3.5 py-3.5">Link</th>
                  <th className="px-3.5 py-3.5">Status</th>
                  <th className="px-3.5 py-3.5">Notes</th>
                  <th className="px-3.5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="h-[25rem] px-4 py-10 text-center">
                    <div className="mx-auto flex max-w-[24rem] flex-col items-center justify-center text-center">
                      <div className="relative h-16 w-56 opacity-60">
                        <div className="absolute left-8 top-2 h-6 w-44 rounded border border-[#E6E6E6] bg-white" />
                        <div className="absolute left-0 top-8 h-6 w-44 rounded border border-[#E6E6E6] bg-white" />
                      </div>
                      <div className="mt-4 text-[1rem] font-semibold leading-6 text-[#1A1A1A]">
                        No Revision History found
                      </div>
                      <div className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
                        Revisions History will be shown after raising a revision
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <SubmitDeliverableModal
        state={submitState}
        influencerId={influencerId}
        onClose={() => setSubmitState(null)}
        onSubmitted={(message) => {
          onAction(message);
          onReload();
        }}
      />

      <DeliverableViewModal
        state={viewState}
        campaign={campaign}
        onClose={() => setViewState(null)}
        onSubmitDeliverable={openSubmitDeliverable}
      />

      <div className="mt-16 text-center text-[0.875rem] leading-5 text-[#B8B8B8]">
        You have reached the end of the page
      </div>
    </main>
  );
}

function PaymentStatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
}) {
  return (
    <Card className="flex min-h-[13rem] flex-col p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white text-[#1A1A1A]">
        {icon}
      </div>
      <div className="mt-auto text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
        {label}
      </div>
      <div className="mt-2 text-[1rem] font-semibold leading-6 text-[#1A1A1A]">
        {value}
      </div>
      {subValue ? (
        <div className="mt-1 text-[0.6875rem] leading-4 text-[#B8B8B8]">
          {subValue}
        </div>
      ) : null}
    </Card>
  );
}

function ContractSection({
  campaign,
  influencer,
  onAction,
}: {
  campaign: CampaignData;
  influencer: InfluencerData;
  onAction: (message: string) => void;
}) {
  const file = getContractFile(campaign);
  const fileUrl = normalizeAssetUrl(file?.url);
  const fileName = pickString(file?.name, "BrandxInfluencer_contract.pdf");
  const fileSize = formatFileSize(file?.size);
  const details = getContractDetails(campaign, influencer);

  return (
    <section className="mt-5">
      <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
        Contract
      </h2>

      <Card className="mt-5 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <div className="p-5 lg:border-r lg:border-[#E6E6E6]">
            <div className="grid gap-4">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 text-[0.875rem] leading-5"
                >
                  <div className="font-medium text-[#969696]">
                    {detail.label}
                  </div>
                  <div className="font-semibold text-[#1A1A1A]">
                    {detail.badge ? (
                      <StatusBadge status={detail.value} />
                    ) : (
                      detail.value
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[20rem] flex-col p-5">
            <div className="flex min-w-0 items-start gap-3">
              <FilePdf
                weight="fill"
                className="h-8 w-8 shrink-0 text-[#F04438]"
              />
              <div className="min-w-0">
                <div className="truncate text-[1rem] font-medium leading-6 text-[#1A1A1A]">
                  {fileName}
                </div>
                <div className="text-[0.875rem] leading-5 text-[#969696]">
                  {fileSize}
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-end gap-3">
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-[0.5rem] px-3 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                >
                  <DownloadSimple weight="bold" className="h-4 w-4" />
                  download
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onAction("No contract file available")}
                  className="inline-flex h-9 items-center gap-2 rounded-[0.5rem] px-3 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                >
                  <DownloadSimple weight="bold" className="h-4 w-4" />
                  download
                </button>
              )}

              <button
                type="button"
                onClick={() => onAction("Edit contract selected")}
                className="h-9 rounded-[0.5rem] border border-[#E6E6E6] bg-white px-5 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onAction("Ask changes selected")}
                className="h-9 rounded-[0.5rem] bg-[#1A1A1A] px-5 text-[0.75rem] font-semibold text-white transition hover:bg-black/90"
              >
                Ask changes
              </button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function PaymentHistorySection({
  campaign,
  onAction,
}: {
  campaign: CampaignData;
  onAction: (message: string) => void;
}) {
  const rows = getPaymentHistory(campaign);

  return (
    <section className="mt-5">
      <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
        Payment History
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        {rows.length ? (
          rows.map((row) => (
            <Card
              key={row.id}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center text-[1.5rem] leading-none",
                    row.type === "debit" ? "text-[#1A1A1A]" : "text-[#12A150]",
                  ].join(" ")}
                >
                  {row.type === "debit" ? "↖" : "↘"}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
                    {row.name}
                  </div>
                  <div className="text-[0.875rem] leading-5 text-[#969696]">
                    {row.subId}
                  </div>
                </div>
              </div>

              <div className="text-[0.875rem] font-medium leading-5 text-[#1A1A1A]">
                {row.txnId}
              </div>

              <div
                className={[
                  "inline-flex h-8 min-w-[5rem] items-center justify-center rounded-full bg-[#F9F9F9] px-3 text-[0.875rem] font-semibold leading-5",
                  row.type === "debit" ? "text-[#1A1A1A]" : "text-[#12A150]",
                ].join(" ")}
              >
                {row.amountLabel}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onAction(`View Transaction: ${row.txnId}`)}
                  className="h-9 rounded-[0.5rem] px-3 text-[0.75rem] font-semibold text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                >
                  View Transaction
                </button>

                {row.receiptUrl ? (
                  <a
                    href={row.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-[0.5rem] bg-[#1A1A1A] px-4 text-[0.75rem] font-semibold text-white transition hover:bg-black/90"
                  >
                    <DownloadSimple weight="bold" className="h-4 w-4" />
                    Download PDF
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onAction(`Receipt not available for ${row.txnId}`)
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-[0.5rem] bg-[#1A1A1A] px-4 text-[0.75rem] font-semibold text-white transition hover:bg-black/90"
                  >
                    <DownloadSimple weight="bold" className="h-4 w-4" />
                    Download PDF
                  </button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center text-[0.875rem] text-[#B8B8B8]">
            No payment history found.
          </Card>
        )}
      </div>
    </section>
  );
}

function PaymentPageContent({
  campaign,
  influencer,
  onAction,
}: {
  campaign: CampaignData;
  influencer: InfluencerData;
  onAction: (message: string) => void;
}) {
  const paymentRows = getPaymentMilestoneRows(campaign);
  const currency = campaign.payout?.currency;
  const totalPayout =
    toNumber(campaign.totalPayout) ||
    toNumber(campaign.payout?.total) ||
    toNumber(campaign.payout?.max) ||
    toNumber(campaign.payout?.min);
  const upcomingPayout =
    toNumber(campaign.upcomingPayout) ||
    toNumber(campaign.payout?.upcoming) ||
    paymentRows
      .filter((item) => !item.status.toLowerCase().includes("paid"))
      .reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.raw.amount || item.raw.milestoneBudget || item.raw.budget,
          ),
        0,
      );

  return (
    <main className="pt-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.5rem] font-semibold leading-8 text-[#1A1A1A]">
            Payment
          </h2>
          <p className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
            Track your payouts, complete deliverables, and stay on schedule
            throughout the campaign.
          </p>
        </div>

        <ToolbarFilter />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <PaymentStatCard
          icon={<Wallet weight="bold" className="h-6 w-6" />}
          label="Total Payout"
          value={formatMoney(totalPayout, currency)}
        />
        <PaymentStatCard
          icon={<Wallet weight="bold" className="h-6 w-6" />}
          label="Upcoming Payout"
          value={formatMoney(upcomingPayout, currency)}
        />
        <PaymentStatCard
          icon={<Wallet weight="bold" className="h-6 w-6" />}
          label="Payment Type"
          value={pickString(campaign.paymentType, "-")}
        />
        <PaymentStatCard
          icon={<CalendarDots weight="bold" className="h-6 w-6" />}
          label="Campaign Timeline"
          value={formatTimeline(campaign.startAt, campaign.endAt)}
          subValue={
            campaign.startAt && campaign.endAt
              ? `${formatCompactDate(campaign.startAt)} - ${formatCompactDate(campaign.endAt)}`
              : undefined
          }
        />
      </div>

      <section className="mt-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
              All Milestone
            </h2>
            <p className="mt-2 text-[0.875rem] leading-5 text-[#B8B8B8]">
              Track your payouts, complete deliverables, and stay on schedule
              throughout the campaign.
            </p>
          </div>
          <ToolbarFilter />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[58rem]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_1fr_0.3fr] rounded-[0.75rem] bg-[#F9F9F9] px-4 py-5 text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
              <div>Milestone</div>
              <div>Status</div>
              <div>Deliverables</div>
              <div aria-label="Progress" />
              <div>Budget</div>
              <div>Deadline</div>
              <div />
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {paymentRows.length === 0 ? (
                <Card className="p-8 text-center text-[0.875rem] text-[#B8B8B8]">
                  No milestone payment rows found from API for this campaign.
                </Card>
              ) : null}

              {paymentRows.map((row) => (
                <Card
                  key={row.id}
                  className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_1fr_0.3fr] items-center px-4 py-6 text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]"
                >
                  <div>{row.title}</div>
                  <div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div>{row.deliverableProgress}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-[0.1875rem] w-14 overflow-hidden rounded-full bg-[#E6E6E6]">
                      <div
                        className="h-full rounded-full bg-[#12A150]"
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                    <span className="text-[0.75rem]">{row.progress}%</span>
                  </div>
                  <div>{row.budgetLabel}</div>
                  <div>{row.deadline}</div>
                  <button
                    type="button"
                    onClick={() => onAction(`Milestone options: ${row.title}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-[0.5rem] transition hover:bg-[#F9F9F9]"
                    aria-label={`Open options for ${row.title}`}
                  >
                    <DotsThree className="h-5 w-5" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ContractSection
        campaign={campaign}
        influencer={influencer}
        onAction={onAction}
      />
      <PaymentHistorySection campaign={campaign} onAction={onAction} />

      <div className="mt-16 text-center text-[0.875rem] leading-5 text-[#B8B8B8]">
        You have reached the end of the page
      </div>
    </main>
  );
}

function ImagePreviewModal({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const activeImage = images[activeIndex] || "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  if (!activeImage) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#B3B3B3]/95 px-6 py-20"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-8 top-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#D9D9D9] text-[2rem] font-light leading-none text-[#1A1A1A] transition hover:bg-white"
        aria-label="Close preview"
      >
        ×
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          className="absolute left-8 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
          aria-label="Previous image"
        >
          <CaretLeft weight="bold" className="h-5 w-5" />
        </button>
      ) : null}

      <div
        className="flex max-h-[72vh] w-full max-w-[46rem] items-center justify-center overflow-hidden rounded-[0.75rem] bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={activeImage}
          alt="Campaign reference preview"
          className="max-h-[72vh] w-full object-contain"
          draggable={false}
        />
      </div>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className="absolute right-8 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
          aria-label="Next image"
        >
          <CaretRight weight="bold" className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

function ActionNotice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className="mt-4 flex items-center justify-between gap-4 rounded-[0.75rem] border border-[#E6E6E6] bg-[#F9F9F9] px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="text-[0.875rem] font-medium leading-5 text-[#1A1A1A]">
        {message}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-[0.75rem] font-semibold text-[#969696] hover:text-[#1A1A1A]"
      >
        Close
      </button>
    </div>
  );
}

export default function CampaignDetailClient({
  activeTab,
}: {
  activeTab: ActiveTab;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const idFromQuery = searchParams.get("id");
  const titleFromQuery = pickString(searchParams.get("title"));
  const campaignId = useMemo(
    () => normalizeMongoId(idFromQuery ?? (params as any)?.campaignId),
    [idFromQuery, params],
  );

  const campaignBasePath = useMemo(
    () => pathname.replace(/\/(milestone-and-deliverables|payment)\/?$/, ""),
    [pathname],
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [viewData, setViewData] = useState<CampaignViewData | null>(null);
  const [influencerId, setInfluencerId] = useState("");
  const [token, setToken] = useState("");
  const [isOpeningThread, setIsOpeningThread] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const id =
      localStorage.getItem("influencerId") ||
      localStorage.getItem("influencerID") ||
      localStorage.getItem("influencer_id") ||
      "";

    const savedToken =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";

    setInfluencerId(id);
    setToken(savedToken);

    if (!id) {
      setErr("influencerId not found in localStorage. Please login again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!influencerId || !campaignId) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr("");

      try {
        const res: any = await apiGetfetchCampaignbyId(
          influencerId,
          campaignId,
          token || undefined,
        );

        const payload = res?.data?.data ?? res?.data ?? res;
        const brand = payload?.brand ?? {};
        const influencer = payload?.influencer ?? {};
        const campaign = payload?.campaign ?? {};

        const resolvedCampaignId = pickString(
          campaign.campaignId,
          campaign._id,
          campaignId,
        );
        const resolvedBrandId = pickString(
          brand.brandId,
          brand._id,
          campaign.brandId,
        );

        let apiMilestones: CampaignMilestone[] = [];

        try {
          apiMilestones = await fetchMilestonesFromApi({
            influencerId,
            campaignId: resolvedCampaignId,
            brandId: resolvedBrandId,
          });
        } catch (milestoneError) {
          console.error("Failed to fetch milestone API rows:", milestoneError);
        }

        const nextData: CampaignViewData = {
          brand,
          influencer,
          campaign: mergeCampaignWithApiMilestones(campaign, apiMilestones),
        };

        if (!cancelled) {
          setViewData(nextData);
        }
      } catch (error) {
        if (!cancelled) {
          setErr(getApiErrorMessage(error, "Failed to load campaign"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [influencerId, campaignId, token, reloadKey]);

  useEffect(() => {
    if (!viewData || titleFromQuery) return;

    const campaignTitle = pickString(viewData.campaign?.title);
    if (!campaignTitle) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("title", campaignTitle);

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [viewData, titleFromQuery, searchParams, pathname, router]);

  const notifyAction = (message: string) => {
    setActionNotice(message);

    window.clearTimeout((notifyAction as any).timeoutId);
    (notifyAction as any).timeoutId = window.setTimeout(() => {
      setActionNotice("");
    }, 3500);
  };

  const goToMilestoneSection = (
    sectionId: "revision-history" | "deliverables",
  ) => {
    const query = searchParams.toString();
    const querySuffix = query ? `?${query}` : "";

    router.push(
      `${campaignBasePath}/milestone-and-deliverables${querySuffix}#${sectionId}`,
    );
  };

  if (loading) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CONTENT_WRAP}>
          <div className="flex animate-pulse items-start gap-5 border-b border-[#E6E6E6] pb-8">
            <div className="h-[6.25rem] w-[6.25rem] rounded-full bg-[#F2F2F2]" />
            <div className="flex-1 pt-3">
              <div className="h-7 w-72 rounded bg-[#F2F2F2]" />
              <div className="mt-3 h-4 w-96 rounded bg-[#F2F2F2]" />
              <div className="mt-6 h-16 rounded bg-[#F9F9F9]" />
            </div>
          </div>
          <div className="mt-6 h-96 animate-pulse rounded-[0.75rem] bg-[#F9F9F9]" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CONTENT_WRAP}>
          <Card className="p-6">
            <div className="text-lg font-semibold text-[#1A1A1A]">
              Could not load campaign
            </div>
            <p className="mt-2 text-sm text-red-600">{err}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded-xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A]"
              >
                Go back
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!viewData) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CONTENT_WRAP}>
          <Card className="p-6">
            <div className="text-lg font-semibold text-[#1A1A1A]">
              No campaign found
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const brand = viewData.brand;
  const influencer = viewData.influencer;
  const campaign = viewData.campaign;
  const campaignWithQueryTitle: CampaignData = {
    ...campaign,
    title: pickString(campaign.title, titleFromQuery, "Campaign"),
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notifyAction("Campaign link copied");
    } catch {
      notifyAction(
        "Unable to copy link. Please copy it manually from the browser.",
      );
    }
  };

  const getThreadIdFromResponse = (response: any) => {
    return pickString(
      response?.data?.data?.threadId,
      response?.data?.data?._id,
      response?.data?.data?.id,
      response?.data?.threadId,
      response?.data?._id,
      response?.data?.id,
      response?.threadId,
      response?._id,
      response?.id,
    );
  };

  const onMailBrand = async () => {
    if (isOpeningThread) return;

    const brandId = pickString(brand.brandId, brand._id);
    const currentInfluencerId = pickString(
      influencer.influencerId,
      influencer._id,
      influencerId,
    );
    const currentCampaignId = pickString(
      campaign.campaignId,
      campaign._id,
      campaignId,
    );

    if (!brandId || !currentInfluencerId || !currentCampaignId) {
      notifyAction(
        "Unable to open inbox. Missing brand, influencer, or campaign details.",
      );
      return;
    }

    setIsOpeningThread(true);

    try {
      const response = await api.post("/emails/threads", {
        brandId,
        influencerId: currentInfluencerId,
        campaignId: currentCampaignId,
        subject: pickString(campaign.title, titleFromQuery, "Campaign"),
        type: "campaign",
        source: "influencer_campaign_view",
      });

      const threadId = getThreadIdFromResponse(response);
      if (!threadId)
        throw new Error("Thread created, but threadId was not returned.");

      router.push(`/influencer/inbox/${threadId}`);
    } catch (error: any) {
      notifyAction(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to open brand conversation.",
      );
    } finally {
      setIsOpeningThread(false);
    }
  };

  return (
    <div className={PAGE_WRAP}>
      <div className={CONTENT_WRAP}>
        <CampaignHeader
          brand={brand}
          campaign={campaignWithQueryTitle}
          onMailBrand={onMailBrand}
          onCopyLink={onCopyLink}
          isOpeningThread={isOpeningThread}
        />
        <CampaignTabs activeTab={activeTab} />
        <ActionNotice
          message={actionNotice}
          onClose={() => setActionNotice("")}
        />

        {activeTab === "overview" ? (
          <OverviewPageContent
            campaign={campaignWithQueryTitle}
            onGoToMilestoneSection={goToMilestoneSection}
          />
        ) : null}
        {activeTab === "milestones" ? (
          <MilestonePageContent
            campaign={campaignWithQueryTitle}
            influencerId={influencerId}
            onAction={notifyAction}
            onReload={() => setReloadKey((value) => value + 1)}
          />
        ) : null}
        {activeTab === "payment" ? (
          <PaymentPageContent
            campaign={campaignWithQueryTitle}
            influencer={influencer}
            onAction={notifyAction}
          />
        ) : null}
      </div>
    </div>
  );
}
