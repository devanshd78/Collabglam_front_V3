"use client";

import React, { useEffect, useMemo, useState } from "react";
import BrandCampaignCard from "@/components/ui/brand/card";

import SkeletonLoader, {
  SkeletonProvider,
  SkeletonCard,
  SkeletonInboxList,
} from "@/components/common/SkeletonLoader";
import { Button } from "@/components/ui/buttonComp";
import { PencilSimple } from "@phosphor-icons/react";

import type {
  CampaignStatus,
  CategoryDoc,
  EnrichedCampaignDoc,
} from "@/app/brand/services/brandApi";
import {
  apiCampaignGetByBrand,
  getApiErrorMessage,
  apiGetAllCategories,
} from "@/app/brand/services/brandApi";

import {
  scheduleOrExpiryText,
  statusLabel,
  statusToVariant,
} from "@/utils/campaignUi";
import ListCardView, {
  MetricIcons,
  type ListCardViewItem,
} from "@/components/ui/brand/list";
import CampaignFilter, {
  DEFAULT_DATE_FILTER,
  type DateFilterValue,
  type SelectOption,
} from "./CampaignFilter";
import CampaignCardMenu from "@/components/ui/brand/campaign-card-menu";

type Props = {
  title: string;
  fixedStatus?: CampaignStatus;
};

type ViewMode = "grid" | "list";
type DateField =
  | "createdAt"
  | "updatedAt"
  | "startAt"
  | "endAt"
  | "publishedAt";

const FULLY_MANAGED_PLAN_ID = "e5cb75da-6d0d-481b-b202-69b9cf864940";
const LOCK_TOOLTIP = "Upgrade plan to Fully Managed to access";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYY(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Accepts dd/mm/yyyy, yyyy-mm-dd, or iso datetime strings */
function parseLooseDate(s: string): Date | undefined {
  if (!s) return undefined;
  const cleaned = String(s).trim();
  if (!cleaned) return undefined;

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const out = new Date(y, m - 1, d);
    return isNaN(out.getTime()) ? undefined : out;
  }

  const parts = cleaned.split(/[\/-]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const out = a > 31 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
    return isNaN(out.getTime()) ? undefined : out;
  }

  return undefined;
}

function firstImage(c: any): string | undefined {
  if (c?.productImage) return c.productImage;
  const arr = c?.productImages;
  if (!Array.isArray(arr) || !arr[0]) return undefined;
  const v = arr[0];
  if (typeof v === "string") return v;
  return (
    v?.url ??
    v?.src ??
    v?.image ??
    v?.dataUrl ??
    v?.dataurl ??
    v?.data?.url ??
    undefined
  );
}

function formatBudget(value: any): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN");
}

function normalizeMongoId(id: any): string {
  if (id == null) return "";
  if (typeof id === "string" || typeof id === "number") return String(id);
  if (typeof id === "object") {
    if (typeof (id as any).toHexString === "function") {
      return (id as any).toHexString();
    }
    if (typeof (id as any).$oid === "string") return (id as any).$oid;
    if (typeof (id as any).oid === "string") return (id as any).oid;
    if (typeof (id as any).id !== "undefined") return String((id as any).id);
    if (typeof (id as any).value !== "undefined") {
      return String((id as any).value);
    }
    if ((id as any)._id != null) return normalizeMongoId((id as any)._id);
    if (typeof (id as any).toString === "function") {
      const s = (id as any).toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return "";
}

function isAdminCreated(c: any): boolean {
  const role = String(c?.createdBy?.role ?? "").trim().toLowerCase();
  const userModel = String(c?.createdBy?.userModel ?? "")
    .trim()
    .toLowerCase();

  return (
    role === "admin" ||
    Boolean(c?.byAdmin) ||
    Boolean(c?.isAdminCampaign) ||
    Boolean(c?.createdBy?.isAdmin) ||
    (role === "brand" &&
      userModel === "brand" &&
      (Boolean(c?.isFullyManaged) || Boolean(c?.fullyManaged)))
  );
}

function isFullyManagedCampaign(c: any): boolean {
  const managementType = String(c?.managementType ?? "")
    .trim()
    .toLowerCase();

  return (
    isAdminCreated(c) ||
    Boolean(c?.isFullyManaged) ||
    Boolean(c?.fullyManaged) ||
    managementType === "fully_managed" ||
    managementType === "fully managed"
  );
}

function LockedShell({
  locked,
  children,
  radiusClass = "rounded-[1rem]",
}: {
  locked: boolean;
  children: React.ReactNode;
  radiusClass?: string;
}) {
  const [showTip, setShowTip] = React.useState(false);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const showTooltip = () => {
    if (!locked) return;
    clearHideTimer();
    setShowTip(true);
  };

  const hideTooltip = () => {
    clearHideTimer();
    setShowTip(false);
  };

  const showTooltipOnClick = () => {
    if (!locked) return;
    clearHideTimer();
    setShowTip(true);

    hideTimerRef.current = setTimeout(() => {
      setShowTip(false);
    }, 1400);
  };

  React.useEffect(() => {
    return () => clearHideTimer();
  }, []);

  return (
    <div
      className={`relative h-full min-w-0 ${locked ? "cursor-pointer" : ""}`}
      aria-disabled={locked || undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onClick={showTooltipOnClick}
    >
      {locked ? (
        <div
          className={`pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 transition-all duration-100 ${showTip
            ? "translate-y-0 opacity-100"
            : "-translate-y-1 opacity-0"
            }`}
        >
          <div className="rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-[15px] font-medium text-black shadow-lg whitespace-nowrap">
            {LOCK_TOOLTIP}
          </div>
        </div>
      ) : null}

      <div
        className={`relative h-full ${radiusClass} ${locked ? "overflow-hidden" : ""}`}
      >
        <div
          className={
            locked
              ? "pointer-events-none h-full select-none blur-[1.25px] opacity-75"
              : "h-full"
          }
        >
          {children}
        </div>

        {locked ? (
          <div
            className={`absolute inset-[1px] flex items-center justify-center ${radiusClass} bg-black/5 backdrop-blur-[1px]`}
          >
            <div className="pointer-events-none rounded-full border border-white/20 bg-black/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow">
              Locked
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Convert UI DateFilterValue into backend payload fields:
 * Supported backend presets:
 * today, last7days, last30days, thisweek, thismonth, launchingSoon
 */
function resolveDateParams(df: DateFilterValue): {
  datePreset?: string;
  dateField?: DateField;
  dateFrom?: string;
  dateTo?: string;
} {
  switch (df.quickFilter) {
    case "launching_soon":
      return { datePreset: "launchingSoon" };

    case "today":
      return { dateField: "createdAt", datePreset: "today" };

    case "this_week":
      return { dateField: "createdAt", datePreset: "thisweek" };

    case "this_month":
      return { dateField: "createdAt", datePreset: "thismonth" };

    case "recently_edited":
      return { dateField: "updatedAt", datePreset: "last7days" };

    default:
      break;
  }

  const presetMap: Record<string, string> = {
    last_7: "last7days",
    last_30: "last30days",
  };

  if (
    df.allDatesOption &&
    df.allDatesOption !== "all" &&
    presetMap[df.allDatesOption]
  ) {
    return {
      dateField: "updatedAt",
      datePreset: presetMap[df.allDatesOption],
    };
  }

  if (df.startDate || df.endDate) {
    const from = df.startDate ? parseLooseDate(df.startDate) : undefined;
    const to = df.endDate ? parseLooseDate(df.endDate) : undefined;

    return {
      dateField: "createdAt",
      dateFrom: from ? formatDDMMYYYY(from) : undefined,
      dateTo: to ? formatDDMMYYYY(to) : undefined,
    };
  }

  return {};
}

function canShowEditCampaign(c: any) {
  const status = String(c?.status ?? "").trim().toLowerCase();

  if (status === "draft") return true;

  if (status === "active" || status === "scheduled") {
    const startAtRaw = c?.startAt;
    if (!startAtRaw) return true;

    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) return true;

    const now = new Date();
    return startAt.getTime() > now.getTime();
  }

  return false;
}

function isDraftCampaign(c: any) {
  const status = String(c?.status ?? "").trim().toLowerCase();

  return (
    status === "draft" ||
    c?.isDraft === true ||
    Number(c?.isDraft) === 1 ||
    String(c?.publishStatus ?? "").trim().toLowerCase() === "draft"
  );
}

function getCampaignEditHref(c: any, campaignId: string, campaignTitle?: string) {
  const encodedId = encodeURIComponent(campaignId);
  const encodedTitle = encodeURIComponent(
    String(campaignTitle || c?.campaignTitle || "Campaign").trim()
  );

  if (isDraftCampaign(c)) {
    return `/brand/create-campaign?campaignId=${encodedId}&campaignTitle=${encodedTitle}`;
  }

  return `/brand/edit-campaign?campaignId=${encodedId}&campaignTitle=${encodedTitle}`;
}
function getManageInfluencerHref(campaignId: string, campaignTitle?: string) {
  const params = new URLSearchParams();

  if (campaignId) {
    params.set("campaignId", campaignId);
  }

  if (campaignTitle) {
    params.set("campaignName", campaignTitle);
    params.set("campaignTitle", campaignTitle);
  }

  return `/brand/Influencer/all?${params.toString()}`;
}

function isCardInnerInteractive(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "button,a,input,textarea,select,label,[role='button'],[data-no-card-click='true']"
    )
  );
}

function campaignFooterText(c: any) {
  const status = String(c?.status ?? "").trim().toLowerCase();

  if (status === "completed" || status === "complete") {
    return "Campaign Completed";
  }

  if (status === "scheduled") {
    const scheduledAtRaw = c?.scheduledAt;
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

    if (scheduledAt && !Number.isNaN(scheduledAt.getTime())) {
      const diffMs = scheduledAt.getTime() - Date.now();

      if (diffMs <= 0) {
        return "Publishing soon";
      }

      const minutes = Math.ceil(diffMs / 60000);
      const hours = Math.ceil(diffMs / 3600000);
      const days = Math.ceil(diffMs / 86400000);

      if (minutes < 60) return `${minutes}m left`;
      if (hours < 24) return `${hours}h left`;
      return `${days}d left`;
    }
  }

  return scheduleOrExpiryText(c?.status, c?.startAt ?? null, c?.endAt ?? null);
}

function allImages(c: any): string[] {
  const out: string[] = [];

  if (c?.productImage && typeof c.productImage === "string") {
    out.push(c.productImage);
  }

  const arr = c?.productImages;
  if (Array.isArray(arr)) {
    for (const v of arr) {
      if (typeof v === "string") {
        out.push(v);
        continue;
      }

      const src =
        v?.url ??
        v?.src ??
        v?.image ??
        v?.dataUrl ??
        v?.dataurl ??
        v?.data?.url ??
        undefined;

      if (src) out.push(src);
    }
  }

  return Array.from(new Set(out.filter(Boolean)));
}
function normalizeFilterText(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeFilterKey(value: any) {
  return normalizeFilterText(value).replace(/[\s-]+/g, "_");
}

function getCampaignTypeValue(c: any) {
  return normalizeFilterKey(
    c?.campaignType ??
    c?.type ??
    c?.details?.campaignType ??
    c?.details?.type ??
    ""
  );
}

function getCampaignCategoryIds(c: any) {
  const ids = [
    c?.categoryId,
    c?.category?._id,
    c?.category?.id,
    c?.category?.categoryId,
    c?.details?.categoryId,
    c?.details?.category?._id,
    c?.details?.category?.id,
  ];

  if (Array.isArray(c?.categoryIds)) ids.push(...c.categoryIds);
  if (Array.isArray(c?.details?.categoryIds)) ids.push(...c.details.categoryIds);

  return ids.map(normalizeMongoId).filter(Boolean);
}

function getCampaignSearchText(c: any) {
  return [
    c?.campaignTitle,
    c?.productOrServiceName,
    c?.brandName,
    c?.category?.name,
    c?.details?.category?.name,
    c?.status,
    c?.campaignType,
    c?.type,
    ...(Array.isArray(c?.platformSelection) ? c.platformSelection : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDateByField(c: any, field: DateField) {
  const raw =
    field === "createdAt"
      ? c?.createdAt
      : field === "updatedAt"
        ? c?.updatedAt
        : field === "startAt"
          ? c?.startAt
          : field === "endAt"
            ? c?.endAt
            : c?.publishedAt;

  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function subDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function getDateFilterRange(df: DateFilterValue): {
  field: DateField;
  from?: Date;
  to?: Date;
} | null {
  const now = new Date();

  if (df.quickFilter === "today") {
    return {
      field: "createdAt",
      from: startOfDay(now),
      to: endOfDay(now),
    };
  }

  if (df.quickFilter === "this_week") {
    const start = startOfDay(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);

    return {
      field: "createdAt",
      from: start,
      to: endOfDay(now),
    };
  }

  if (df.quickFilter === "this_month") {
    return {
      field: "createdAt",
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: endOfDay(now),
    };
  }

  if (df.quickFilter === "recently_edited") {
    return {
      field: "updatedAt",
      from: startOfDay(subDays(now, 7)),
      to: endOfDay(now),
    };
  }

  if (df.quickFilter === "launching_soon") {
    return {
      field: "startAt",
      from: startOfDay(now),
      to: endOfDay(subDays(now, -30)),
    };
  }

  const allDatesOption = String(df.allDatesOption || "all");

  if (allDatesOption !== "all") {
    const map: Record<string, number> = {
      last_7: 7,
      last_15: 15,
      last_30: 30,
      last_90: 90,
      last_365: 365,
    };

    if (map[allDatesOption]) {
      return {
        field: "updatedAt",
        from: startOfDay(subDays(now, map[allDatesOption])),
        to: endOfDay(now),
      };
    }

    if (allDatesOption === "last_month") {
      return {
        field: "updatedAt",
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }

    if (allDatesOption === "last_quarter") {
      return {
        field: "updatedAt",
        from: startOfDay(subDays(now, 90)),
        to: endOfDay(now),
      };
    }
  }

  if (df.startDate || df.endDate) {
    const from = df.startDate ? parseLooseDate(df.startDate) : undefined;
    const to = df.endDate ? parseLooseDate(df.endDate) : undefined;

    return {
      field: "createdAt",
      from: from ? startOfDay(from) : undefined,
      to: to ? endOfDay(to) : undefined,
    };
  }

  return null;
}

function matchesDateFilter(c: any, df: DateFilterValue) {
  const range = getDateFilterRange(df);
  if (!range) return true;

  const date = getDateByField(c, range.field);
  if (!date) return false;

  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;

  return true;
}


const GRID_WRAP = "mx-auto w-full max-w-[100vw]";
const CARD_GRID =
  "grid w-full min-w-0 auto-rows-fr gap-[clamp(12px,2vw,24px)] " +
  "[grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]";

const CLICKABLE_CARD_HOVER =
  "h-full min-w-0 cursor-pointer transition-all duration-200 ease-out " +
  "hover:-translate-y-0.5 " +
  "[&>div:last-child]:transition-colors [&>div:last-child]:duration-200 " +
  "hover:[&>div:last-child]:bg-muted/40";

const CLICKABLE_LIST_HOVER =
  "cursor-pointer transition-all duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:bg-muted/40";

const INITIAL_SKELETON_COUNT = 10;

function CampaignListViewSkeleton() {
  return (
    <div className="w-full min-w-0">
      <SkeletonInboxList rows={6} />
    </div>
  );
}

function CampaignCardViewSkeleton() {
  return (
    <div className={GRID_WRAP}>
      <div className={CARD_GRID}>
        {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="min-w-0">
            <SkeletonCard rows={4} tall />
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SkeletonLoader className="h-4 w-32 rounded-md" />
        <SkeletonLoader className="h-4 w-24 rounded-md" />
      </div>

      {viewMode === "list" ? (
        <CampaignListViewSkeleton />
      ) : (
        <CampaignCardViewSkeleton />
      )}
    </div>
  );
}

export default function CampaignListPage({
  title,
  fixedStatus,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [brandId, setBrandId] = useState<string>("");
  const [brandPlanId, setBrandPlanId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id =
      window.localStorage.getItem("brandId") ||
      window.localStorage.getItem("brandID") ||
      window.localStorage.getItem("brand_id") ||
      "";
    setBrandId(id);
  }, []);

  const [campaignType, setCampaignType] = useState<string>("");
  const [creatorStatus, setCreatorStatus] = useState<string>("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [aiCreated, setAiCreated] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedFixedStatus = String(fixedStatus ?? "").trim().toLowerCase();
  const showCreatorStatusFilter =
    normalizedFixedStatus !== "draft" && normalizedFixedStatus !== "scheduled";

  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const [items, setItems] = useState<EnrichedCampaignDoc[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const hasFullyManagedAccess = useMemo(() => {
    return brandPlanId === FULLY_MANAGED_PLAN_ID;
  }, [brandPlanId]);

  const isCampaignLocked = (c: any) => {
    return isFullyManagedCampaign(c) && !hasFullyManagedAccess;
  };

  const filteredItems = useMemo(() => {
    return items.filter((c: any) => {
      const applicantCount = Number(c.applicantCount ?? 0);
      const acceptedCount = Number(c.acceptedContracts ?? 0);

      if (aiCreated && Number(c?.byAi ?? 0) !== 1) {
        return false;
      }

      if (campaignType && campaignType !== "all") {
        const selectedType = normalizeFilterKey(campaignType);
        const itemType = getCampaignTypeValue(c);

        if (itemType !== selectedType) {
          return false;
        }
      }

      if (creatorStatus === "applied" && applicantCount <= 0) {
        return false;
      }

      if (creatorStatus === "approved" && acceptedCount <= 0) {
        return false;
      }

      if (categoryIds.length > 0) {
        const campaignCategoryIds = getCampaignCategoryIds(c);
        const selectedCategoryIds = categoryIds.map(normalizeMongoId).filter(Boolean);

        const hasMatchingCategory = selectedCategoryIds.some((id) =>
          campaignCategoryIds.includes(id)
        );

        if (!hasMatchingCategory) {
          return false;
        }
      }

      if (!matchesDateFilter(c, dateFilter)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const text = getCampaignSearchText(c);

        if (!text.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    aiCreated,
    campaignType,
    creatorStatus,
    categoryIds,
    dateFilter,
    searchQuery,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncBrandPlanId = () => {
      setBrandPlanId(window.localStorage.getItem("brandPlanId") || "");
    };

    syncBrandPlanId();

    window.addEventListener("storage", syncBrandPlanId);
    window.addEventListener("focus", syncBrandPlanId);

    return () => {
      window.removeEventListener("storage", syncBrandPlanId);
      window.removeEventListener("focus", syncBrandPlanId);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (
      !showCreatorStatusFilter &&
      creatorStatus !== "all" &&
      creatorStatus !== ""
    ) {
      setCreatorStatus("all");
    }
  }, [showCreatorStatusFilter, creatorStatus]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setCatLoading(true);
      try {
        const cats: CategoryDoc[] = await apiGetAllCategories();
        if (cancelled) return;

        const opts = (cats ?? [])
          .map((c) => {
            const rawId =
              (c as any)?._id ?? (c as any)?.id ?? (c as any)?.categoryId;
            const value = normalizeMongoId(rawId);
            return { value, label: String((c as any)?.name ?? "") };
          })
          .filter(
            (o) =>
              o.value &&
              o.value !== "[object Object]" &&
              o.value !== "undefined" &&
              o.value !== "null"
          );

        const deduped: SelectOption[] = [];
        const seen = new Set<string>();
        for (const o of opts) {
          if (seen.has(o.value)) continue;
          seen.add(o.value);
          deduped.push(o);
        }

        setCategoryOptions(deduped);
      } catch {
        if (!cancelled) setCategoryOptions([]);
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const dateFilterKey = [
    dateFilter.quickFilter,
    dateFilter.allDatesOption,
    dateFilter.startDate,
    dateFilter.endDate,
  ].join("|");

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setHasMore(true);
    setErrMsg("");
    setHasLoadedOnce(false);
  }, [
    brandId,
    fixedStatus,
    title,
    searchQuery,
    campaignType,
    creatorStatus,
    aiCreated,
    categoryIds.join(","),
    dateFilterKey,
  ]);

  const dateParams = useMemo(() => resolveDateParams(dateFilter), [dateFilter]);

  const payload = useMemo(() => {
    const normalizedTitle = String(title || "").trim().toLowerCase();

    const resolvedStatus =
      normalizedTitle === "all campaigns"
        ? "all"
        : fixedStatus;

    const base: any = {
      brandId,
      page,
      limit,
      search: searchQuery || undefined,
      status: resolvedStatus,
      byAi: aiCreated ? 1 : undefined,
    };

    if (dateParams.datePreset) base.datePreset = dateParams.datePreset;
    if (dateParams.dateField) base.dateField = dateParams.dateField;
    if (dateParams.dateFrom) base.dateFrom = dateParams.dateFrom;
    if (dateParams.dateTo) base.dateTo = dateParams.dateTo;

    if (campaignType && campaignType !== "all") {
      base.campaignType = campaignType;
    }
    if (creatorStatus && creatorStatus !== "all") {
      base.creatorStatus = creatorStatus;
    }
    if (categoryIds.length === 1) base.categoryId = categoryIds[0];
    if (categoryIds.length > 1) base.categoryIds = categoryIds;

    return base;
  }, [
    brandId,
    page,
    limit,
    searchQuery,
    fixedStatus,
    title,
    campaignType,
    creatorStatus,
    categoryIds,
    aiCreated,
    dateParams,
  ]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!brandId) {
        setErrMsg("Brand ID is required.");
        setHasLoadedOnce(true);
        setItems([]);
        setHasMore(false);
        return;
      }

      const isFirstPage = page === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setErrMsg("");

      try {
        const res = await apiCampaignGetByBrand(payload);
        if (cancelled) return;

        setHasLoadedOnce(true);
        const nextItems = (res?.items ?? []) as EnrichedCampaignDoc[];
        const tp = res?.meta?.totalPages;

        if (typeof tp === "number" && tp > 0) {
          setTotalPages(tp);
          setHasMore(page < tp);
        } else {
          setHasMore(nextItems.length === limit);
        }

        setItems((prev) => {
          if (isFirstPage) return nextItems;
          const existing = new Set(
            prev.map((x: any) => normalizeMongoId(x.campaignId ?? x._id ?? x.id))
          );
          return [
            ...prev,
            ...nextItems.filter(
              (x: any) =>
                !existing.has(normalizeMongoId(x.campaignId ?? x._id ?? x.id))
            ),
          ];
        });
      } catch (e) {
        if (cancelled) return;
        setHasLoadedOnce(true);
        setErrMsg(getApiErrorMessage(e, "Failed to load campaigns"));
        if (page === 1) setItems([]);
      } finally {
        if (cancelled) return;
        if (page === 1) setLoading(false);
        else setLoadingMore(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [payload, brandId, page, limit]);

  const renderGridCard = (c: any) => {
    const footerText = campaignFooterText(c);
    const locked = isCampaignLocked(c);
    const fullyManaged = isFullyManagedCampaign(c);

    const campaignId = normalizeMongoId(c.campaignId ?? c._id ?? c.id);
    const campaignTitle = c.campaignTitle ?? "Untitled Campaign";
    const viewHref = `/brand/campaign/${encodeURIComponent(
      campaignId
    )}?campaignTitle=${encodeURIComponent(campaignTitle)}`;
    const inviteHref = `/brand/browse-influencer`;
    const showEditButton = canShowEditCampaign(c);
    const applicantCount = c.applicantCount ?? 0;
    const acceptedCount = c.acceptedContracts ?? 0;
    const totalInfluencers = c.numberOfInfluencers ?? 0;
    const campaignBudget = c.campaignBudget ?? 0;
    const imageUrls = allImages(c);
    const platforms = ((c.platformSelection ?? []) as string[]);

    const goToInfluencers = () => {
      if (locked) return;
      if (typeof window === "undefined") return;

      const href = fullyManaged
        ? `/brand/influ/active?campaignId=${encodeURIComponent(campaignId)}&fm=1`
        : `/brand/influ/active?campaignId=${encodeURIComponent(campaignId)}`;

      window.location.href = href;
    };

    const goToApplied = () => {
      if (locked) return;
      if (typeof window === "undefined") return;

      const href = fullyManaged
        ? `/brand/influ/active?campaignId=${encodeURIComponent(campaignId)}&fm=1`
        : `/brand/influ/applied?campaignId=${encodeURIComponent(campaignId)}`;

      window.location.href = href;
    };

    const handleView = () => {
      if (locked) return;
      if (typeof window !== "undefined") {
        window.location.href = getManageInfluencerHref(campaignId, campaignTitle);
      }
    };

    const handleEdit = () => {
      if (locked) return;
      if (typeof window !== "undefined") {
        window.location.href = getCampaignEditHref(c, campaignId, campaignTitle);
      }
    };

    const handleCardOpen = () => {
      if (locked) return;
      if (typeof window !== "undefined") {
        window.location.href = viewHref;
      }
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (locked || isCardInnerInteractive(e.target)) return;
      handleCardOpen();
    };

    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (locked) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      if (isCardInnerInteractive(e.target)) return;

      e.preventDefault();
      handleCardOpen();
    };

    const edgeBadges = [
      ...(fullyManaged
        ? [
          {
            label: "Fully Managed",
          },
        ]
        : []),
      ...(!fullyManaged && isAdminCreated(c)
        ? [
          {
            label: "By Admin",
            className: "border-[#D7E3FF] bg-[#EEF4FF] text-[#2F5BFF]",
          },
        ]
        : []),
    ];

    return (
      <LockedShell key={campaignId} locked={locked} radiusClass="rounded-[1rem]">
        <div
          role="link"
          tabIndex={locked ? -1 : 0}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          className={locked ? "h-full min-w-0 cursor-pointer" : CLICKABLE_CARD_HOVER}
          title={locked ? LOCK_TOOLTIP : `View ${campaignTitle}`}
        >
          <BrandCampaignCard
            className={locked ? "h-full min-w-0" : CLICKABLE_CARD_HOVER}
            size="md"
            logoUrl={imageUrls[0] || ""}
            logoUrls={imageUrls}
            logoAriaLabel="Product image"
            name={c.campaignTitle}
            statusLabel={statusLabel(c.status)}
            statusVariant={statusToVariant(c.status)}
            edgeBadges={edgeBadges}
            headerRight={
              locked ? null : (
                <div
                  data-no-card-click="true"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <CampaignCardMenu
                    viewHref={viewHref}
                    inviteHref={inviteHref}
                    campaignStatus={c.status}
                    isDraft={c.isDraft}
                    isFullyManaged={fullyManaged}
                  />
                </div>
              )
            }
            tags={[c.category?.name || "No Category"]}
            stats={[
              {
                label: "Platform",
                value: "",
              },
              {
                label: "Budget",
                value: `$${formatBudget(campaignBudget)}`,
              },
              {
                label: "Applicants",
                value: (
                  <button
                    type="button"
                    onClick={goToApplied}
                    className="cursor-pointer text-primary hover:underline"
                  >
                    {applicantCount}
                  </button>
                ),
              },
              {
                label: "Creators",
                value: (
                  <button
                    type="button"
                    onClick={goToInfluencers}
                    className="cursor-pointer text-primary hover:underline"
                  >
                    {acceptedCount}/{totalInfluencers}
                  </button>
                ),
              },
            ]}
            footer={
              <>
                <div className="flex w-full items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-[0.75rem] border-border shadow-none"
                    onClick={handleView}
                    disabled={locked}
                  >
                    Manage Influencer
                  </Button>

                  {showEditButton && !fullyManaged ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-[2.85rem] w-[2.65rem] rounded-[0.75rem] border-border px-0 shadow-none"
                      onClick={handleEdit}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label="Edit campaign"
                      disabled={locked}
                    >
                      <PencilSimple size={18} weight="regular" />
                    </Button>
                  ) : null}
                </div>

                <div className="text-xs text-muted-foreground">
                  {locked ? LOCK_TOOLTIP : footerText}
                </div>
              </>
            }
          />
        </div>
      </LockedShell>
    );
  };

  const listItems: ListCardViewItem[] = useMemo(() => {
    return filteredItems.map((c: any) => {
      const locked = isCampaignLocked(c);
      const platforms = (c.platformSelection ?? []) as string[];
      const campaignId = normalizeMongoId(c.campaignId ?? c._id ?? c.id);
      const campaignTitle = c.campaignTitle ?? "Untitled Campaign";
      const fullyManaged = isFullyManagedCampaign(c);

      const viewHref = `/brand/campaign/${encodeURIComponent(
        campaignId
      )}?campaignTitle=${encodeURIComponent(campaignTitle)}`;
      const inviteHref = `/brand/browse-influencer`;
      const showEditButton = canShowEditCampaign(c);
      const applicantCount = c.applicantCount ?? 0;
      const acceptedCount = c.acceptedContracts ?? 0;
      const totalInfluencers = c.numberOfInfluencers ?? 0;
      const campaignBudget = c.campaignBudget ?? 0;


      const handleView = () => {
        if (locked) return;
        if (typeof window !== "undefined") {
          window.location.href = getManageInfluencerHref(campaignId, campaignTitle);
        }
      };

      const handleEdit = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (locked) return;
        if (typeof window !== "undefined") {
          window.location.href = getCampaignEditHref(c, campaignId, campaignTitle);
        }
      };

      return {
        key: campaignId,
        className: locked ? undefined : CLICKABLE_LIST_HOVER,

        onClick: () => {
          if (locked) return;
          if (typeof window !== "undefined") {
            window.location.href = viewHref;
          }
        },

        logoSrc: firstImage(c),
        logoImages: allImages(c),
        logoAlt: "Product image",
        name: c.campaignTitle,
        badges: [
          c.category?.name || "No Category",
          ...(isAdminCreated(c) ? ["By Admin"] : []),
          ...(isFullyManagedCampaign(c) ? ["Fully Managed"] : []),
        ],
        metrics: [
          {
            id: "platform",
            label: "Platform",
            icon: MetricIcons.Platform,
          },
          {
            id: "applied",
            label: "Applied",
            value: applicantCount,
            icon: MetricIcons.Contract,
          },
          {
            id: "influencer",
            label: "Influencer",
            value: `${acceptedCount}/${totalInfluencers}`,
            icon: MetricIcons.Influencer,
          },
          {
            id: "budget",
            label: "Budget",
            value: formatBudget(campaignBudget),
            icon: MetricIcons.Email,
          },
        ],
        statusLabel: statusLabel(c.status),
        statusVariant: (statusToVariant(c.status) as any) ?? "draft",
        showStatusChevron: true,
        actionSlot: (
          <Button
            variant="outline"
            className="min-w-0 w-full truncate whitespace-nowrap rounded-[0.5rem] border-border shadow-none
max-[520px]:h-9 max-[520px]:px-3 max-[520px]:text-[0.85rem]
min-[981px]:w-auto"
            onClick={handleView}
            disabled={locked}
          >
            Manage Influencer
          </Button>
        ),
        menuSlot: locked ? null : (
          <div
            className="flex items-center gap-2"
            data-no-card-click="true"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {showEditButton && !fullyManaged ? (
              <Button
                type="button"
                variant="outline"
                className="h-[2.85rem] w-[2.78rem] !ml-0 rounded-[0.5rem] border-border p-0 shadow-none"
                onClick={handleEdit}
                aria-label="Edit campaign"
              >
                <PencilSimple size={18} weight="regular" />
              </Button>
            ) : null}

            <CampaignCardMenu
              viewHref={viewHref}
              inviteHref={inviteHref}
              campaignStatus={c.status}
              isDraft={c.isDraft}
              isFullyManaged={fullyManaged}
            />
          </div>
        ),
        showMoreButton: false,
        secondaryText: locked ? LOCK_TOOLTIP : campaignFooterText(c),

        // add these in ListCardViewItem type
        disabled: locked,
        disabledTitle: locked ? LOCK_TOOLTIP : undefined,
        overlayLabel: locked ? "Locked" : undefined,
      } as ListCardViewItem;
    });
  }, [filteredItems, brandPlanId]);

  const showInitialSkeleton = !hasLoadedOnce;
  const showEmptyState =
    hasLoadedOnce && !loading && filteredItems.length === 0 && !errMsg;

  return (
    <SkeletonProvider>
      <div className="w-full min-w-0 px-4 py-6 sm:px-6 md:px-10 lg:px-12">
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
          viewMode={viewMode}
          setViewMode={setViewMode}
          showCreatorStatus={showCreatorStatusFilter}
        />

        {errMsg && <div className="mt-4 text-sm text-red-600">{errMsg}</div>}

        <div className="mt-6">
          {showInitialSkeleton ? (
            <CampaignPageSkeleton viewMode={viewMode} />
          ) : showEmptyState ? (
            <div className="text-sm text-gray-500">No campaigns found.</div>
          ) : (
            <>
              {viewMode === "list" ? (
                <ListCardView items={listItems} />
              ) : (
                <div className={GRID_WRAP}>
                  <div className={CARD_GRID}>
                    {filteredItems.map(renderGridCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="mt-auto flex justify-center pb-6 pt-6">
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              disabled={loading || loadingMore}
              onClick={() => setPage((p) => p + 1)}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : hasLoadedOnce && filteredItems.length > 0 ? (
            <div
              className="text-center text-sm"
              style={{ color: "var(--Light-Text-Subtle, #8C8C8C)" }}
            >
              You've reached the end.
            </div>
          ) : null}
        </footer>
      </div>
    </SkeletonProvider>
  );
}