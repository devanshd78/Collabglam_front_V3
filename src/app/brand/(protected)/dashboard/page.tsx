"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  Plus,
  ArrowUpRight,
  Money,
  Question,
  UsersThree,
  Sparkle,
  X,
  Check,
  ChartLine,
  Clock,
  ArrowDownLeft,
} from "@phosphor-icons/react";
import { post, get } from "@/lib/api";
import {
  apiGetMilestonesByBrand,
  apiSetApplicantDecisionStatus,
} from "../../services/brandApi";

import SkeletonLoader, {
  SkeletonProvider,
  SkeletonCard,
  SkeletonInboxList,
} from "@/components/common/SkeletonLoader";

import PlatformReviewPrompt from "@/components/common/PlatformReviewPrompt";
import { CalendarCard } from "@/components/ui/calendar-card";

/* ---------------- types ---------------- */

type ActiveInfluencerRow = {
  influencerId: string;
  name: string;
  handle?: string;
  profileImage?: string;
  platform?: string;
  followers?: string | number;
  engagementRate?: string | number;
  contractId?: string | null;
  contractMongoId?: string | null;
  contractStatus?: string | null;
  lastActionAt?: string | null;
  assignedAt?: string | null;
};
type DashboardDateFilter = "date" | "all";

type CampaignRow = {
  id: string;
  campaignId?: string;
  campaignsId?: string | null;

  campaignTitle?: string;
  productOrServiceName: string;

  startAt?: string | null;
  endAt?: string | null;

  goals?: string[];
  goal: string;

  budget: number;
  campaignBudget?: number;

  status?: string;
  publishStatus?: string;
  campaignStatus?: string;

  isActive: number;
  createdAt: string | null;
  updatedAt?: string | null;

  hasAcceptedInfluencer: boolean;
  influencerId: string | null;
  contractId: string | null;

  appliedInfluencersCount: number;

  activeInfluencerCount?: number;
  activeInfluencers?: ActiveInfluencerRow[];

  numberOfInfluencers?: number;
  platformSelection?: string[];
  productImage?: string | null;
  productImages?: string[];
};

type BrandDashboardHomePayload = {
  brandId?: string;
  brandName: string;
  totalCreatedCampaigns: number;
  totalHiredInfluencers: number;
  totalAppliedInfluencers: number;
  budgetRemaining: number;
  walletBalance?: number;
  freezeAmount?: number;
  campaignsMode: "all" | "accepted";
  campaigns: CampaignRow[];
};

type WalletFreezeRow = {
  totalFrozenAmount?: number;
  brandId: string;
  campaignId: string;
  influencerId?: string;
  freezeAmount?: number;
  availableToAllocate?: number;
  currentFrozenAmount?: number;
  influencerAllocations?: {
    influencerId: string;
    amount: number;
    releasedAmount: number;
  }[];
  totalAllocatedAmount?: number;
  totalReleasedAmount?: number;
};

type WalletData = {
  brandId: string;
  walletBalance: number;
  frozenBalance: number;
  usableBalance: number;
  freezes: WalletFreezeRow[];
};

type WalletApiResponse = {
  success: boolean;
  data: WalletData;
  requestId?: string;
};

type WalletTab = "used" | "available";

type ApplicantDecisionField = "isShortlisted" | "isUndicided" | "isRejected";

type InboxRow = {
  threadId: string;
  influencer: {
    influencerId: string | null;
    name: string;
    profileImage?: string;
    profilePic?: string;
    avatarUrl?: string;
  };
  subject: string;
  snippet: string;
  lastMessageAt: string | null;
  lastMessageDirection: string | null;
  status: string;
};

type BrandAppliedInfluencerApi = {
  influencerId: string;
  name: string;
  handle?: string;
  profileImage?: string;
  platform?: string;
  followers?: string | number;
  engagementRate?: string | number;
  appliedAt?: string | null;
};

type BrandAppliedCampaignApi = {
  campaignId: string;
  campaignsId?: string | null;
  campaignTitle: string;
  productOrServiceName?: string;
  productImage?: string | null;
  productImages?: string[];
  appliedInfluencerCount?: number;
  appliedInfluencers: BrandAppliedInfluencerApi[];
};

type BrandCampaignsAppliedBrand = {
  brandId: string;
  name: string;
  campaigns: BrandAppliedCampaignApi[];
};

type BrandCampaignsAppliedResponse = {
  success: boolean;
  brand: BrandCampaignsAppliedBrand;
};

type AppliedInfluencerRow = {
  id: string;
  campaignId: string;
  influencerId: string;
  name: string;
  handle: string;
  campaignName: string;
  avatarUrl?: string;
  primaryPlatform: string;
  followers: string | number;
  engagementRate: string | number;
  appliedAt?: string | null;
};

type MilestoneAttachment = {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  key?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BrandMilestoneApiRow = {
  _id?: string;
  milestoneHistoryId?: string;
  milestoneId?: string;
  brandId?: string;
  campaignId?: string;
  influencerId?: string;
  influencerName?: string;

  milestoneTitle?: string;
  milestoneDescription?: string;
  milestoneBudget?: number;
  amount?: number;

  attachments?: MilestoneAttachment[];

  startDate?: string | null;
  endDate?: string | null;

  released?: boolean;
  releasedAt?: string | null;
  payoutStatus?: string;
  paidAt?: string | null;

  deliverablesCount?: number;
  paymentType?: string;
  currency?: string;
};

type GetMilestonesByBrandResponse = {
  message?: string;
  milestones?: BrandMilestoneApiRow[];
};

type ReleaseMilestoneRow = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  campaignName?: string;
  influencerName?: string;
  amount?: number;
  currency?: string;
};

type CampaignStatusVariant =
  | "active"
  | "paused"
  | "completed"
  | "draft"
  | "published"
  | "inactive";

type CampaignListRow = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  statusLabel: string;
  statusVariant: CampaignStatusVariant;
  progress: number;
  daysLeft: string;
  activeInfluencers: ActiveInfluencerRow[];
};

type EngagedInfluencerModalRow = {
  id: string;
  influencerId: string;
  name: string;
  handle?: string;
  profileImage?: string;
  followers?: string | number;
  campaignName: string;
};

type PaymentHistoryApiRow = {
  paymentType: "plan" | "milestone" | string;
  orderId?: string;
  paymentId?: string;
  userId?: string;
  role?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  status?: string;
  receipt?: string;
  invoiceNumber?: string;
  invoiceIssuedAt?: string | null;
  invoiceFilePath?: string;
  paidAt?: string | null;
  createdAt?: string | null;
  subtotalCents?: number;
  discountCents?: number;
  taxCents?: number;
  totalCents?: number;
};

type PaymentHistoryResponse = {
  success: boolean;
  message?: string;
  userId?: string;
  role?: string;
  counts?: {
    plans?: number;
    milestones?: number;
    total?: number;
  };
  history?: PaymentHistoryApiRow[];
};

type PaymentHistoryRow = {
  id: string;
  title: string;
  transactionId: string;
  dateLabel: string;
  amount: number;
  currency: string;
  status: string;
  paymentType: string;
};

/* ---------------- helpers ---------------- */

const fmtDate = (d: string | null | undefined, fmt = "MMM d, yyyy") => {
  if (!d) return "";

  try {
    return format(new Date(d), fmt);
  } catch {
    return "";
  }
};

const formatMoney = (value: number | null | undefined) => {
  return `$${Number(value || 0).toLocaleString()}`;
};

const formatFollowers = (value: string | number | undefined) => {
  if (value == null || value === "") return "0";

  if (typeof value === "string") return value;

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}k`;

  return String(value);
};

const formatEngagement = (value: string | number | undefined) => {
  if (value == null || value === "") return "0%";

  if (typeof value === "string") {
    return value.includes("%") ? value : `${value}%`;
  }

  return `${value}%`;
};

const dashboardScrollbarClass =
  "overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#CFCFCF_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CFCFCF]";

const getPlatformIconSrc = (platform: string) => {
  const normalized = String(platform || "").toLowerCase();

  if (normalized.includes("youtube")) return "/logos_youtube-icon.svg";
  if (normalized.includes("instagram")) return "/skill-icons_instagram.svg";
  if (normalized.includes("tiktok") || normalized.includes("tik tok")) return "/ic_baseline-tiktok.svg";

  return "";
};

const getCampaignImage = (
  productImage?: string | null,
  productImages?: string[] | null
) => {
  if (productImage) return productImage;

  if (Array.isArray(productImages)) {
    return productImages.find((image) => Boolean(image)) || "";
  }

  return "";
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

const collectBackendMessages = (value: any): string[] => {
  if (!value) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectBackendMessages(item));
  }

  if (typeof value === "object") {
    const messages: string[] = [];

    ["message", "messages", "error", "errors", "detail", "details"].forEach((key) => {
      if (key in value) {
        messages.push(...collectBackendMessages(value[key]));
      }
    });

    return Array.from(new Set(messages));
  }

  return [];
};

const getBackendMessage = (value: any, fallback: string) => {
  const messages = collectBackendMessages(value);

  return messages.length ? messages.join("\n") : fallback;
};

const toMs = (d: string | null | undefined) => {
  const t = d ? new Date(d).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

function dedupeInboxConversations(rows: InboxRow[]): InboxRow[] {
  const map = new Map<string, InboxRow>();

  for (const r of rows || []) {
    const infId = (r?.influencer?.influencerId || "").trim();
    const infName = (r?.influencer?.name || "").trim().toLowerCase();
    const key = infId ? `id:${infId}` : infName ? `name:${infName}` : `thread:${r.threadId}`;

    const prev = map.get(key);

    if (!prev || toMs(r.lastMessageAt) > toMs(prev.lastMessageAt)) {
      map.set(key, r);
    }
  }

  return Array.from(map.values()).sort((a, b) => toMs(b.lastMessageAt) - toMs(a.lastMessageAt));
}

const getTimelineProgress = (startAt?: string | null, endAt?: string | null) => {
  const start = startAt ? new Date(startAt).getTime() : 0;
  const end = endAt ? new Date(endAt).getTime() : 0;
  const now = Date.now();

  if (!start || !end || !Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end <= start) return now >= end ? 100 : 0;
  if (now <= start) return 0;
  if (now >= end) return 100;

  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
};

const getDaysLeft = (endAt?: string | null) => {
  if (!endAt) return "No end date";

  const end = new Date(endAt).getTime();
  const now = Date.now();

  if (!Number.isFinite(end)) return "No end date";

  const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Ended";
  if (days === 1) return "1 day left";

  return `${days} days left`;
};

const getPaymentHistoryRows = (
  history: PaymentHistoryApiRow[]
): PaymentHistoryRow[] => {
  return (history || []).map((item, index) => {
    const totalCents = Number(item.totalCents || 0);
    const rawAmount = Number(item.amount || 0);

    const amount =
      totalCents > 0
        ? totalCents / 100
        : item.paymentType === "plan" && rawAmount > 1000
          ? rawAmount / 100
          : rawAmount;

    const paymentType = String(item.paymentType || "payment");
    const planName = String(item.planName || "").trim();

    const title =
      paymentType === "plan"
        ? `${planName || "Plan"} Payment`
        : "Milestone Payment";

    return {
      id: item.paymentId || item.orderId || item.receipt || `payment-${index}`,
      title,
      transactionId: item.receipt || item.invoiceNumber || item.orderId || "NA",
      dateLabel: fmtDate(item.paidAt || item.createdAt, "MMM d, yyyy hh:mm a"),
      amount,
      currency: item.currency || "USD",
      status: item.status || "created",
      paymentType,
    };
  });
};

const getCampaignStatusMeta = (campaign: CampaignRow) => {
  const rawStatus = String(
    campaign.status ||
    campaign.campaignStatus ||
    campaign.publishStatus ||
    ""
  )
    .trim()
    .toLowerCase();

  if (rawStatus === "active") {
    return {
      label: "Active",
      variant: "active" as const,
    };
  }

  if (rawStatus === "paused") {
    return {
      label: "Paused",
      variant: "paused" as const,
    };
  }

  if (rawStatus === "completed") {
    return {
      label: "Completed",
      variant: "completed" as const,
    };
  }

  if (rawStatus === "draft") {
    return {
      label: "Draft",
      variant: "draft" as const,
    };
  }

  if (rawStatus === "published") {
    return Number(campaign.isActive || 0) === 1
      ? {
        label: "Active",
        variant: "active" as const,
      }
      : {
        label: "Published",
        variant: "published" as const,
      };
  }

  if (Number(campaign.isActive || 0) === 1) {
    return {
      label: "Active",
      variant: "active" as const,
    };
  }

  return {
    label: rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "Inactive",
    variant: "inactive" as const,
  };
};

const getStartOfDayMs = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getEndOfDayMs = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

const isSameSelectedDay = (
  dateValue: string | null | undefined,
  selectedDate: Date
) => {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime())) return false;

  return getStartOfDayMs(date) === getStartOfDayMs(selectedDate);
};

const isCampaignEndedBeforeSelectedDate = (
  endAt: string | null | undefined,
  selectedDate: Date
) => {
  if (!endAt) return false;

  const endDate = new Date(endAt);

  if (!Number.isFinite(endDate.getTime())) return false;

  return getEndOfDayMs(endDate) < getStartOfDayMs(selectedDate);
};

const isSelectedDateInsideCampaignRange = (
  campaign: CampaignRow,
  selectedDate: Date
) => {
  const selectedStart = getStartOfDayMs(selectedDate);
  const selectedEnd = getEndOfDayMs(selectedDate);

  const start = campaign.startAt
    ? getStartOfDayMs(new Date(campaign.startAt))
    : null;

  const end = campaign.endAt
    ? getEndOfDayMs(new Date(campaign.endAt))
    : null;

  if (!start && !end) return false;

  if (start && end) {
    return selectedEnd >= start && selectedStart <= end;
  }

  if (start && !end) {
    return selectedEnd >= start;
  }

  if (!start && end) {
    return selectedStart <= end;
  }

  return false;
};

const isCampaignOnSelectedDate = (
  campaign: CampaignRow,
  selectedDate: Date
) => {
  if (isCampaignEndedBeforeSelectedDate(campaign.endAt, selectedDate)) {
    return false;
  }

  return (
    isSelectedDateInsideCampaignRange(campaign, selectedDate) ||
    isSameSelectedDay(campaign.createdAt, selectedDate) ||
    isSameSelectedDay(campaign.updatedAt, selectedDate)
  );
};

/* ---------------- page ---------------- */

const DashboardPageSkeleton = () => {
  return (
    <SkeletonProvider>
      <div className="min-h-full w-full overflow-x-hidden bg-white">
        <main className="flex w-full flex-col items-start gap-8 p-4 sm:p-6 lg:p-8">
          <header className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-col items-start gap-2 lg:w-[29rem] lg:shrink-0">
              <SkeletonLoader className="h-7 w-64 rounded-md" />
              <SkeletonLoader className="h-4 w-36 rounded-md" />
            </div>

            <div className="flex items-stretch gap-4 lg:ml-auto">
              <SkeletonLoader className="h-10 w-32 rounded-xl" />
              <SkeletonLoader className="h-10 w-40 rounded-xl" />
            </div>
          </header>

          <section className="flex w-full flex-col gap-[1.19rem]">
            <div className="flex w-full flex-col gap-4 py-2 lg:flex-row lg:items-center lg:justify-between">
              <SkeletonLoader className="h-10 w-40 rounded-md" />

              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <SkeletonLoader className="h-10 w-10 rounded-lg" />
                <SkeletonLoader className="h-10 w-10 rounded-lg" />
                <SkeletonLoader className="h-10 w-[11.5625rem] rounded-lg" />
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[10.625rem] w-full flex-col justify-between rounded-lg border border-[#E6E6E6] bg-white px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <SkeletonLoader className="h-5 w-28 rounded-md" />
                    <SkeletonLoader className="h-7 w-7 rounded-md" />
                  </div>

                  <div>
                    <SkeletonLoader className="h-8 w-24 rounded-md" />
                    <SkeletonLoader className="mt-2 h-4 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonLoader key={index} className="h-[3.75rem] rounded-lg" />
              ))}
            </div>
          </section>

          <div className="grid w-full items-start gap-6 xl:grid-cols-12">
            <div className="flex w-full min-w-0 flex-col gap-6 xl:col-span-8 xl:h-[30rem] xl:overflow-hidden">
              <SkeletonCard rows={4} />
              <SkeletonCard rows={5} />
            </div>

            <div className="flex h-full w-full min-w-0 flex-col gap-6 xl:col-span-4">
              <SkeletonCard rows={2} />
              <SkeletonCard rows={5} tall />
            </div>
          </div>

          <SkeletonCard rows={4} />
        </main>
      </div>
    </SkeletonProvider>
  );
};

export default function BrandDashboardHome() {
  const router = useRouter();

  const [data, setData] = useState<BrandDashboardHomePayload | null>(null);
  const [brandAppliedData, setBrandAppliedData] = useState<BrandCampaignsAppliedBrand | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [brandMilestones, setBrandMilestones] = useState<BrandMilestoneApiRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryApiRow[]>([]);
  const [walletView, setWalletView] = useState<WalletTab>("used");

  const [fatalError, setFatalError] = useState<string | null>(null);

  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [applicantDecisionLoading, setApplicantDecisionLoading] = useState<Record<string, boolean>>({});

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilterMode, setDateFilterMode] = useState<DashboardDateFilter>("date");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEngagedInfluencersModalOpen, setIsEngagedInfluencersModalOpen] = useState(false);

  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);

  const todayDate = new Date();
  const todayLabel = format(todayDate, "EEE, dd MMM yyyy");

  const isAllTime = dateFilterMode === "all";
  const selectedDateLabel = isAllTime
    ? "All Time"
    : format(selectedDate, "EEE, MMM d, yyyy").toLowerCase();

  const isSelectedDateToday =
    getStartOfDayMs(selectedDate) >= getStartOfDayMs(todayDate);

  const openAiCampaigns = () => {
    const brandId = typeof window !== "undefined" ? localStorage.getItem("brandId") || "" : "";

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "brandCampaignByAiFilter",
        JSON.stringify({
          brandId,
          byAi: 1,
          limit: 20,
          page: 1,
        })
      );
    }

    router.push("/brand/create-campaign?byAi=1");
  };

  const handleCalendarDateChange = (date: Date) => {
    const safeDate =
      getStartOfDayMs(date) > getStartOfDayMs(todayDate) ? todayDate : date;

    setSelectedDate(safeDate);
    setDateFilterMode("date");
    setIsCalendarOpen(false);
  };

  const handleDateMove = (amount: number) => {
    const baseDate = isAllTime ? todayDate : selectedDate;
    const nextDate = addDays(baseDate, amount);

    handleCalendarDateChange(nextDate);
  };

  const handleAllTimeClick = () => {
    setDateFilterMode("all");
    setIsCalendarOpen(false);
  };

  useEffect(() => {
    if (!isCalendarOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const keepOnDashboard = () => {
      window.history.pushState(
        { dashboardLock: true, path: "/brand/dashboard" },
        "",
        "/brand/dashboard"
      );
    };

    keepOnDashboard();

    const handlePopState = () => {
      keepOnDashboard();
      router.replace("/brand/dashboard");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  useEffect(() => {
    const brandId = typeof window !== "undefined" ? localStorage.getItem("brandId") : null;

    const fetchWallet = async () => {
      if (!brandId) return;

      try {
        const walletJson = await get<WalletApiResponse>("/wallet", {
          brandId,
        });

        if (walletJson?.success && walletJson?.data) {
          setWalletData(walletJson.data);
        } else {
          setWalletData(null);
        }
      } catch {
        setWalletData(null);
      }
    };

    const fetchBrandAppliedCampaigns = async () => {
      if (!brandId) return;

      try {
        const res = await post<any>("/apply/brand-campaigns", { brandId });
        const payload = unwrap<BrandCampaignsAppliedResponse>(res);

        if (payload?.success && payload?.brand) {
          setBrandAppliedData(payload.brand);
        } else {
          setBrandAppliedData(null);
        }
      } catch {
        setBrandAppliedData(null);
      }
    };

    const fetchBrandMilestones = async () => {
      if (!brandId) return;

      try {
        const res = await apiGetMilestonesByBrand({
          brandId,
        });

        const payload = unwrap<GetMilestonesByBrandResponse>(res);

        setBrandMilestones(Array.isArray(payload?.milestones) ? payload.milestones : []);
      } catch {
        setBrandMilestones([]);
      }
    };

    const fetchPaymentHistory = async () => {
      if (!brandId) return;

      try {
        const res = await post<PaymentHistoryResponse>("/payment/history", {
          userId: brandId,
          role: "Brand",
          status: "all",
        });

        const payload = unwrap<PaymentHistoryResponse>(res);

        setPaymentHistory(Array.isArray(payload?.history) ? payload.history : []);
      } catch {
        setPaymentHistory([]);
      }
    };

    (async () => {
      setInboxError(null);
      setInboxLoading(true);

      try {
        const dashRes = await post<BrandDashboardHomePayload>("/dash/brand", { brandId });
        setData(dashRes);
      } catch (err: any) {
        setFatalError(
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not load dashboard"
        );
        setInboxLoading(false);
        return;
      }

      await Promise.all([
        fetchWallet(),
        fetchBrandAppliedCampaigns(),
        fetchBrandMilestones(),
        fetchPaymentHistory(),
      ]);

      try {
        const inboxRes = await post<any>("/emails/brand/inbox", { brandId, limit: 25 });
        const payload = unwrap<any>(inboxRes);

        const conv = payload?.conversations || payload?.data?.conversations || payload?.data || [];
        const list = Array.isArray(conv) ? (conv as InboxRow[]) : [];
        const unique = dedupeInboxConversations(list);

        setInbox(unique);
      } catch (err: any) {
        setInboxError(
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Could not load inbox"
        );
        setInbox([]);
      }

      setInboxLoading(false);
    })();
  }, [router]);

  const filteredInbox = useMemo(() => inbox, [inbox]);

  const appliedInfluencers = useMemo<AppliedInfluencerRow[]>(() => {
    const campaigns = brandAppliedData?.campaigns || [];

    return campaigns.flatMap((campaign) => {
      const campaignId = campaign.campaignId || campaign.campaignsId || "";

      const campaignName =
        campaign.campaignTitle ||
        campaign.productOrServiceName ||
        "Campaign";

      return (campaign.appliedInfluencers || []).map((inf, index) => ({
        id: `${campaignId}-${inf.influencerId}-${index}`,
        campaignId,
        influencerId: inf.influencerId,
        name: inf.name || "Influencer",
        handle: inf.handle || "",
        campaignName,
        avatarUrl: inf.profileImage || "",
        primaryPlatform: inf.platform || "",
        followers: inf.followers || 0,
        engagementRate: inf.engagementRate || 0,
        appliedAt: inf.appliedAt || null,
      }));
    });
  }, [brandAppliedData?.campaigns]);

  const removeAppliedInfluencerFromList = (campaignId: string, influencerId: string) => {
    setBrandAppliedData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        campaigns: (prev.campaigns || []).map((campaign) => {
          const currentCampaignId = campaign.campaignId || campaign.campaignsId || "";

          if (currentCampaignId !== campaignId) return campaign;

          const previousInfluencers = campaign.appliedInfluencers || [];
          const nextInfluencers = previousInfluencers.filter(
            (influencer) => influencer.influencerId !== influencerId
          );

          return {
            ...campaign,
            appliedInfluencers: nextInfluencers,
            appliedInfluencerCount: nextInfluencers.length,
          };
        }),
      };
    });

    setData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        totalAppliedInfluencers: Math.max(
          0,
          Number(prev.totalAppliedInfluencers || 0) - 1
        ),
      };
    });
  };

  const handleApplicantDecision = async (
    row: AppliedInfluencerRow,
    field: ApplicantDecisionField
  ) => {
    const campaignId = row.campaignId?.trim();
    const influencerId = row.influencerId?.trim();

    if (!campaignId || !influencerId) return;

    const loadingKey = `${campaignId}-${influencerId}`;

    setApplicantDecisionLoading((prev) => ({
      ...prev,
      [loadingKey]: true,
    }));

    try {
      const response = await apiSetApplicantDecisionStatus({
        campaignId,
        influencerId,
        field,
      });

      const payload = unwrap<{ message?: string }>(response);

      const successMessage = getBackendMessage(
        payload,
        field === "isShortlisted"
          ? "Influencer shortlisted successfully"
          : field === "isUndicided"
            ? "Influencer marked as undecided"
            : "Influencer rejected successfully"
      );

      setBrandAppliedData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          campaigns: prev.campaigns.map((campaign) => {
            const currentCampaignId = campaign.campaignId || campaign.campaignsId || "";

            if (currentCampaignId !== campaignId) return campaign;

            const updatedAppliedInfluencers = (campaign.appliedInfluencers || []).filter(
              (influencer) => influencer.influencerId !== influencerId
            );

            return {
              ...campaign,
              appliedInfluencers: updatedAppliedInfluencers,
              appliedInfluencerCount: Math.max(
                0,
                Number(campaign.appliedInfluencerCount || 0) - 1
              ),
            };
          }),
        };
      });

      router.refresh();
    } catch (err: any) {
      console.error("Could not update applicant decision", err);

      const errorMessage = getBackendMessage(
        err,
        "Could not update applicant decision"
      );
    } finally {
      setApplicantDecisionLoading((prev) => {
        const next = { ...prev };
        delete next[loadingKey];
        return next;
      });
    }
  };

  const campaignListRows = useMemo<CampaignListRow[]>(() => {
    const appliedCampaignImageMap = new Map<string, string>();

    (brandAppliedData?.campaigns || []).forEach((campaign) => {
      const campaignId = campaign.campaignId || campaign.campaignsId || "";
      const imageUrl = getCampaignImage(
        campaign.productImage,
        campaign.productImages
      );

      if (campaignId && imageUrl) {
        appliedCampaignImageMap.set(campaignId, imageUrl);
      }
    });

    return (data?.campaigns || [])
      .filter((campaign) =>
        dateFilterMode === "all" || isCampaignOnSelectedDate(campaign, selectedDate)
      )
      .map((campaign, index) => {
        const id =
          campaign.campaignId ||
          campaign.campaignsId ||
          campaign.id ||
          `campaign-${index}`;

        const title =
          campaign.campaignTitle ||
          campaign.productOrServiceName ||
          `Campaign ${index + 1}`;

        const imageUrl =
          getCampaignImage(campaign.productImage, campaign.productImages) ||
          appliedCampaignImageMap.get(id) ||
          "";
        const statusMeta = getCampaignStatusMeta(campaign);

        return {
          id,
          title,
          subtitle:
            campaign.goal ||
            campaign.goals?.[0] ||
            campaign.productOrServiceName ||
            "Campaign",
          imageUrl,
          statusLabel: statusMeta.label,
          statusVariant: statusMeta.variant,
          progress: getTimelineProgress(campaign.startAt, campaign.endAt),
          daysLeft: getDaysLeft(campaign.endAt),
          activeInfluencers: Array.isArray(campaign.activeInfluencers)
            ? campaign.activeInfluencers
            : [],
        };
      });
  }, [data?.campaigns, brandAppliedData?.campaigns, dateFilterMode, selectedDate]);

  const engagedInfluencerModalRows = useMemo<EngagedInfluencerModalRow[]>(() => {
    return campaignListRows.flatMap((campaign) =>
      campaign.activeInfluencers.map((influencer, index) => ({
        id:
          `${campaign.id}-${influencer.influencerId || influencer.contractMongoId || influencer.contractId || index}`,
        influencerId: influencer.influencerId || "",
        name: influencer.name || "Influencer",
        handle: influencer.handle || "",
        profileImage: influencer.profileImage || "",
        followers: influencer.followers || 0,
        campaignName: campaign.title || "Campaign",
      }))
    );
  }, [campaignListRows]);

  const workingInfluencers = useMemo<ActiveInfluencerRow[]>(() => {
    const map = new Map<string, ActiveInfluencerRow>();

    campaignListRows.forEach((campaign) => {
      campaign.activeInfluencers.forEach((influencer, index) => {
        const key =
          influencer.influencerId ||
          influencer.contractMongoId ||
          influencer.contractId ||
          `${influencer.name}-${index}`;

        if (!map.has(key)) {
          map.set(key, influencer);
        }
      });
    });

    return Array.from(map.values());
  }, [campaignListRows]);

  const releaseMilestones = useMemo<ReleaseMilestoneRow[]>(() => {
    return brandMilestones
      .filter((item) => !item.released)
      .slice(0, 5)
      .map((item, index) => {
        const firstImage =
          item.attachments?.find((attachment) =>
            String(attachment.type || "").toLowerCase().startsWith("image/")
          ) ||
          item.attachments?.[0];

        return {
          id:
            item.milestoneHistoryId ||
            item.milestoneId ||
            item._id ||
            `milestone-${index}`,
          title: item.milestoneTitle || `Milestone ${index + 1}`,
          description: item.milestoneDescription || "No description added.",
          imageUrl: firstImage?.url || "",
          campaignName: item.campaignId || "",
          influencerName: item.influencerName || "",
          amount: Number(item.amount || item.milestoneBudget || 0),
          currency: item.currency || "USD",
        };
      });
  }, [brandMilestones]);

  const paymentHistoryRows = useMemo(() => {
    return getPaymentHistoryRows(paymentHistory);
  }, [paymentHistory]);

  if (fatalError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">{fatalError}</p>
      </div>
    );
  }

  if (!data) {
    return <DashboardPageSkeleton />;
  }

  const {
    brandName,
    totalCreatedCampaigns,
    totalHiredInfluencers,
    budgetRemaining,
    freezeAmount: dashboardFreezeAmount,
    walletBalance: dashboardWalletBalance,
  } = data;

  const frozenBalanceValue =
    walletData?.frozenBalance ?? dashboardFreezeAmount ?? budgetRemaining ?? 0;

  const walletBalanceValue = walletData?.walletBalance ?? dashboardWalletBalance ?? 0;
  const usableBalanceValue = walletData?.usableBalance ?? walletBalanceValue ?? 0;
  const walletCardValue = walletView === "used" ? usableBalanceValue : walletBalanceValue;

  const hasSelectedDateCampaignData =
    dateFilterMode === "all" || campaignListRows.length > 0;

  const campaignMetricValue = hasSelectedDateCampaignData
    ? String(campaignListRows.length || 0).padStart(2, "0")
    : "00";

  const workingInfluencerMetricValue = hasSelectedDateCampaignData
    ? Number(workingInfluencers.length || 0).toLocaleString()
    : "00";

  const campaignCardRightLabel =
    dateFilterMode === "all"
      ? "All"
      : isSelectedDateToday
        ? "Today"
        : format(selectedDate, "MMM d, yyyy");
  const dashboardCards = [
    {
      title: "All Campaign",
      value: campaignMetricValue,
      subtitle: dateFilterMode === "all" ? "All-time campaigns" : "Active Campaigns on selected date",
      rightLabel: campaignCardRightLabel,
      icon: <CalendarDots size={16} weight="bold" />,
      onClick: () => router.push("/brand/campaign/all"),
    },
    {
      title: "Influencers Engaged",
      value: workingInfluencerMetricValue,
      subtitle: dateFilterMode === "all" ? "All-time working influencers" : "Working influencers",
      avatarUsers: hasSelectedDateCampaignData ? workingInfluencers : [],
      onClick: () => setIsEngagedInfluencersModalOpen(true),
    },
    {
      title: "Escrow Amount",
      value: formatMoney(frozenBalanceValue),
      subtitle: "Frozen balance",
      actionIcon: <ArrowUpRight size={16} weight="bold" />,
      onClick: () => router.push("/brand/wallet"),
    },
    {
      title: "Wallet",
      value: formatMoney(walletCardValue),
      subtitle: walletView === "used" ? "Usable balance" : "Total balance",
      tabs: {
        value: walletView,
        onChange: setWalletView,
      },
      onClick: () => router.push("/brand/wallet"),
    },
  ];

  const quickActions = [
    {
      label: "AI Campaign",
      icon: (
        <img
          src="/Component%207.svg"
          alt="AI Campaign"
          className="h-[1.125rem] w-[1.125rem] object-contain"
        />
      ),
      onClick: openAiCampaigns,
    },
    {
      label: "Find influencer",
      icon: <UsersThree size={18} weight="fill" className="text-[#3A3A3A]" />,
      onClick: () => router.push("/brand/browse-influencer"),
    },
    {
      label: "Add funds",
      icon: (
        <img
          src="/money.png"
          alt="Add funds"
          className="h-[2rem] w-[2rem] object-contain"
        />
      ),
      onClick: () => router.push("/brand/wallet"),
    },
    {
      label: "Raise Dispute",
      icon: (
        <img
          src="/questionmark.png"
          alt="Raise Dispute"
          className="h-[1.25rem] w-[1.25rem] object-contain"
        />
      ),
      onClick: () => router.push("/brand/disputes"),
    },
  ];

  return (
    <SkeletonProvider>
      <div className="min-h-full w-full overflow-x-hidden bg-white">

        <main className="flex w-full flex-col items-start gap-8 p-4 sm:p-6 lg:p-8">
          <PlatformReviewPrompt
            role="brand"
            brandId={data?.brandId}
          />
          <header className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-col items-start gap-1 lg:w-[29rem] lg:shrink-0">
              <h1 className="font-inter text-[1.25rem] font-semibold leading-[1.75rem] tracking-[0] text-[#1A1A1A]">
                Hi {brandName || "Brand"}, welcome back
              </h1>

              <p className="font-inter text-[0.75rem] font-medium leading-4 text-[#969696]">
                {todayLabel}
              </p>
            </div>

            <div className="flex items-stretch gap-4 lg:ml-auto">
              {/* <button
                type="button"
                className="flex items-center justify-center gap-1 rounded-[0.75rem] px-2 text-center font-inter text-[0.75rem] font-medium leading-4 text-[#3A3A3A] transition hover:bg-[#F7F7F7]"
              >
                <Gift size={14} weight="bold" />
                <span>New Updates</span>
              </button> */}
              <button
                type="button"
                onClick={() => router.push("/brand/insight-os")}
                className="flex h-10 items-center justify-center rounded-lg px-2 transition hover:bg-[#F9F9F9] cursor-pointer"
              >
                <span className="font-inter text-[1rem] font-semibold leading-6 tracking-[0] bg-[linear-gradient(90deg,#FFBF00_0%,#F6BB2A_35%,#F3584E_70%,#E078D1_100%)] bg-clip-text text-transparent">
                  InsightOS
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/brand/create-campaign?byAi=1")}
                className="flex items-center justify-center gap-1 rounded-[0.75rem] bg-[#1A1A1A] px-3 text-center font-inter text-[0.75rem] font-medium leading-4 text-white transition hover:bg-black"
              >
                <Plus size={14} weight="bold" />
                <span>Create Campaign</span>
              </button>
            </div>
          </header>

          <section className="flex w-full flex-col gap-[1.19rem]">
            <div className="flex w-full flex-col gap-4 py-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-inter text-[2rem] font-semibold leading-[2.5rem] tracking-[-0.0625rem] text-[#1A1A1A]">
                Overview
              </h2>

              <div
                ref={calendarPopoverRef}
                className="relative flex flex-wrap items-center gap-2 lg:ml-auto"
              >
                <button
                  type="button"
                  onClick={handleAllTimeClick}
                  className={`flex h-10 items-center justify-center rounded-lg border px-4 font-inter text-[0.75rem] font-medium leading-4 transition ${isAllTime
                    ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                    : "border-[#E6E6E6] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]"
                    }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => handleDateMove(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6E6E6] bg-white transition hover:bg-[#F7F7F7]"
                  aria-label="Previous date"
                >
                  <ArrowLeft size={16} weight="bold" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDateMove(1)}
                  disabled={!isAllTime && isSelectedDateToday}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6E6E6] bg-white transition hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next date"
                >
                  <ArrowRight size={16} weight="bold" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode("date");
                    setIsCalendarOpen((prev) => !prev);
                  }}
                  className="flex h-10 w-[11.5625rem] shrink-0 items-center justify-between rounded-lg border border-[#E6E6E6] bg-white px-3 font-inter text-[0.75rem] font-medium leading-4 text-[#1A1A1A] lg:ml-2"
                >
                  <span>{selectedDateLabel}</span>
                  <CalendarDots size={16} weight="bold" />
                </button>

                {isCalendarOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-[22.5rem] rounded-2xl bg-white shadow-xl">
                    <CalendarCard
                      value={selectedDate}
                      onChange={handleCalendarDateChange}
                      maxDate={todayDate}
                      showYear
                      weekStartsOn={1}
                      className="max-w-none border-[#E6E6E6] bg-white"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex h-[10.75rem] w-full items-center overflow-hidden rounded-lg border border-[#E6E6E6] bg-white">
              {dashboardCards.map((card, index) => (
                <React.Fragment key={card.title}>
                  <div className="min-w-0 flex-1 self-stretch">
                    <DashboardMetricCard {...card} />
                  </div>

                  {index < dashboardCards.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="my-5 w-px shrink-0 self-stretch bg-[#E6E6E6]"
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </div>

            <div className="flex h-[3.75rem] w-full items-center overflow-hidden rounded-lg border border-[#E6E6E6] bg-white">
              {quickActions.map((action, index) => (
                <React.Fragment key={action.label}>
                  <div className="group flex h-full min-w-0 flex-1 items-center justify-between bg-white px-5 transition hover:bg-[#F9F9F9] cursor-pointer">
                    <span className="flex items-center gap-2 font-inter text-[1rem] font-medium leading-6 text-[#1A1A1A]">
                      {action.icon}
                      {action.label}
                    </span>

                    <button
                      type="button"
                      onClick={action.onClick}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E6E6] bg-white transition cursor-pointer group-hover:bg-[#F7F7F7]"
                      aria-label={action.label}
                    >
                      <ArrowRight
                        size={16}
                        weight="bold"
                        className="block group-hover:hidden"
                      />

                      <ArrowUpRight
                        size={16}
                        weight="bold"
                        className="hidden group-hover:block"
                      />
                    </button>
                  </div>

                  {index < quickActions.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="my-5 w-px shrink-0 self-stretch bg-[#E6E6E6]"
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </section>

          <div className="grid w-full items-start gap-6 xl:grid-cols-12">
            <div className="flex w-full min-w-0 flex-col gap-6 xl:col-span-8 xl:h-[30rem] xl:overflow-hidden">
              <AppliedInfluencerSection
                rows={appliedInfluencers}
                onDecision={handleApplicantDecision}
                decisionLoadingMap={applicantDecisionLoading}
                onOpenInfluencer={(campaignId: string, campaignDisplayTitle: string) => {
                  const query = new URLSearchParams();

                  query.set("campaignId", campaignId);
                  query.set("campaignName", campaignDisplayTitle);

                  router.push(`/brand/Influencer/applied?${query.toString()}`);
                }}
              />

              <CampaignListSection
                campaigns={campaignListRows}
                onViewAll={() => router.push("/brand/campaign/all")}
                onOpenCampaign={(id) => router.push(`/brand/campaign/view-campaign?id=${id}`)}
              />
            </div>
            <div className="flex w-full min-w-0 flex-col xl:col-span-4 xl:h-[30rem] xl:overflow-hidden">
              {/* <ReleaseMilestoneSection rows={releaseMilestones} /> */}

              <DashboardInboxSection
                rows={filteredInbox}
                loading={inboxLoading}
                error={inboxError}
                onViewAll={() => router.push("/brand/inbox")}
                onOpenThread={(threadId) => router.push(`/brand/inbox/${threadId}`)}
              />
            </div>
          </div>

          <PaymentHistorySection rows={paymentHistoryRows} />
          {isEngagedInfluencersModalOpen ? (
            <EngagedInfluencersModal
              rows={engagedInfluencerModalRows}
              onClose={() => setIsEngagedInfluencersModalOpen(false)}
            />
          ) : null}
        </main>
      </div>
    </SkeletonProvider>
  );
}

/* ---------------- components ---------------- */

type DashboardMetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  rightLabel?: string;
  icon?: React.ReactNode;
  actionIcon?: React.ReactNode;
  avatarUsers?: ActiveInfluencerRow[];
  onClick?: () => void;
  tabs?: {
    value: WalletTab;
    onChange: (value: WalletTab) => void;
  };
};

const DashboardMetricCard = ({
  title,
  value,
  subtitle,
  rightLabel,
  icon,
  actionIcon,
  avatarUsers,
  tabs,
  onClick,
}: DashboardMetricCardProps) => {
  const isClickable = Boolean(onClick);
  const visibleAvatars = avatarUsers?.slice(0, 4) || [];
  const extraAvatars = Math.max(0, (avatarUsers?.length || 0) - visibleAvatars.length);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isClickable) return;

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`flex h-full w-full min-w-0 flex-col items-start justify-between bg-white px-5 py-4 ${isClickable ? "cursor-pointer transition hover:bg-[#F9F9F9]" : ""
        }`}
    >
      <div className="flex w-full min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 truncate font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
          {title}
        </div>

        {rightLabel && icon ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-inter text-[0.625rem] font-medium text-[#B6B6B6]">
              {rightLabel}
            </span>

            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E6E6E6] text-[#1A1A1A]">
              {icon}
            </span>
          </div>
        ) : null}

        {actionIcon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E6E6E6] text-[#1A1A1A]">
            {actionIcon}
          </span>
        ) : null}

        {tabs ? (
          <div className="flex h-7 w-28 shrink-0 items-center gap-1 rounded-lg bg-[#F9F9F9] p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tabs.onChange("used");
              }}
              className={`flex flex-1 self-stretch items-center justify-center rounded-xl px-2 font-inter text-[0.625rem] font-medium transition ${tabs.value === "used" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#6A6A6A]"
                }`}
            >
              Used
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tabs.onChange("available");
              }}
              className={`flex flex-1 self-stretch items-center justify-center rounded-xl px-2 font-inter text-[0.625rem] font-medium transition ${tabs.value === "available" ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#6A6A6A]"
                }`}
            >
              Available
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex w-full min-w-0 items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-inter text-[1.5rem] font-semibold leading-8 text-[#1A1A1A]">
            {value}
          </div>

          <div className="mt-1 max-w-full font-inter text-[0.75rem] font-medium leading-4 text-[#B6B6B6]">
            {subtitle}
          </div>
        </div>

        {avatarUsers ? (
          <div className="flex shrink-0 items-center">
            {visibleAvatars.map((influencer, index) => {
              const initial = (influencer.name || "I").trim().slice(0, 1).toUpperCase();

              return influencer.profileImage ? (
                <img
                  key={`${influencer.influencerId || influencer.name}-${index}`}
                  src={influencer.profileImage}
                  alt={influencer.name || "Influencer"}
                  className="-ml-2 first:ml-0 h-8 w-8 rounded-full border-2 border-white bg-[#F2F2F2] object-cover"
                />
              ) : (
                <span
                  key={`${influencer.influencerId || influencer.name}-${index}`}
                  className="-ml-2 first:ml-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#F2F2F2] font-inter text-[0.625rem] font-semibold text-[#1A1A1A]"
                >
                  {initial}
                </span>
              );
            })}

            {extraAvatars > 0 ? (
              <span className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-[#F7F7F7] px-2 font-inter text-[0.625rem] font-semibold text-[#1A1A1A]">
                {extraAvatars}+
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const AppliedInfluencerSection = ({
  rows,
  onDecision,
  decisionLoadingMap,
  onOpenInfluencer,
}: {
  rows: AppliedInfluencerRow[];
  onDecision: (row: AppliedInfluencerRow, field: ApplicantDecisionField) => void;
  decisionLoadingMap: Record<string, boolean>;
  onOpenInfluencer: (campaignId: string, campaignDisplayTitle: string) => void;
}) => {
  return (
    <section className="flex w-full min-w-0 overflow-hidden rounded-lg border border-[#E6E6E6] bg-white px-5 pt-4 pb-3 pr-1 xl:h-[14.25rem] xl:flex-none">
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h3 className="font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
            Applied Influencer
          </h3>
        </div>

        <div className={`${dashboardScrollbarClass} min-h-0 w-full flex-1`}>
          {!rows.length ? (
            <div className="flex h-full items-center justify-center text-center font-inter text-[0.875rem] text-[#969696]">
              No applied influencers yet.
            </div>
          ) : (
            <div className="flex w-full flex-col">
              {rows.map((row) => (
                <AppliedInfluencerItem
                  key={row.id}
                  row={row}
                  onDecision={onDecision}
                  onOpenInfluencer={onOpenInfluencer}
                  isDecisionLoading={Boolean(
                    decisionLoadingMap[`${row.campaignId}-${row.influencerId}`]
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const AppliedInfluencerItem = ({
  row,
  onDecision,
  onOpenInfluencer,
  isDecisionLoading,
}: {
  row: AppliedInfluencerRow;
  onDecision: (row: AppliedInfluencerRow, field: ApplicantDecisionField) => void;
  onOpenInfluencer: (campaignId: string, campaignDisplayTitle: string) => void;
  isDecisionLoading: boolean;
}) => {
  const platformIcon = getPlatformIconSrc(row.primaryPlatform);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenInfluencer(row.campaignId, row.campaignName)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenInfluencer(row.campaignId, row.campaignName);
        }
      }}
      className="grid w-full min-w-0 cursor-pointer grid-cols-1 gap-3 border-b border-[#E6E6E6] py-3 first:pt-0 transition hover:bg-[#F9F9F9] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AvatarBox src={row.avatarUrl} name={row.name} sizeClass="h-10 w-10" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate font-inter text-[0.875rem] font-semibold leading-5 tracking-[0] text-[#1A1A1A]">
              {row.name}
            </p>

            <span className="shrink-0 font-inter text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
              {row.appliedAt ? fmtDate(row.appliedAt, "MMM d") : "10 min ago"}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-inter text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
              {row.handle || "@handle"}
            </span>

            <span className="h-[0.125rem] w-[0.125rem] shrink-0 bg-[#D9D9D9]" />

            <span className="truncate font-inter text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
              {row.campaignName}
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-4 lg:flex-nowrap lg:gap-5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E6E6E6] p-1">
            {platformIcon ? (
              <img
                src={platformIcon}
                alt={row.primaryPlatform}
                className="h-full w-full object-contain"
              />
            ) : null}
          </span>

          <span className="font-inter text-[0.75rem] font-normal leading-4 text-[#1A1A1A]">
            {formatFollowers(row.followers)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ChartLine size={16} weight="regular" className="text-[#D6D6D6]" />

          <span className="font-inter text-[0.75rem] font-normal leading-4 text-[#1A1A1A]">
            {formatEngagement(row.engagementRate)}
          </span>
        </div>

        <div className="ml-auto flex h-10 shrink-0 items-stretch overflow-hidden rounded-lg border border-[#D6D6D6] bg-white lg:ml-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecision(row, "isRejected");
            }}
            disabled={isDecisionLoading}
            className="group flex w-10 items-center justify-center bg-white text-[#1A1A1A] transition hover:bg-[#F3584E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            aria-label="Reject"
          >
            <X size={24} weight="regular" />
          </button>

          <span className="w-px bg-[#D6D6D6]" aria-hidden="true" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecision(row, "isShortlisted");
            }}
            disabled={isDecisionLoading}
            className="group flex w-10 items-center justify-center bg-white text-[#1A1A1A] transition hover:bg-[#19B36B] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            aria-label="Shortlist"
          >
            <Check size={24} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
};

// const ReleaseMilestoneSection = ({ rows }: { rows: ReleaseMilestoneRow[] }) => {
//   return (
//     <section className="flex w-full min-w-0 rounded-lg border border-[#E6E6E6] bg-white pl-4 pr-0 pt-4">
//       <div className="flex w-full min-w-0 flex-col gap-6">
//         <h3 className="font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
//           Release Milestone
//         </h3>

//         <div className={`${dashboardScrollbarClass} max-h-[11.75rem] w-full !pr-0`}>
//           {!rows.length ? (
//             <div className="pb-4 font-inter text-[0.75rem] text-[#969696]">
//               No milestones to release.
//             </div>
//           ) : (
//             <div className="flex w-full flex-col">
//               {rows.map((row) => (
//                 <div
//                   key={row.id}
//                   className="flex w-full flex-col items-start gap-3 border-b border-[#E6E6E6] pb-3 pr-3 [&:not(:first-child)]:pt-3"
//                 >
//                   <div className="flex w-full min-w-0 items-start gap-2">
//                     <MilestoneImageBox src={row.imageUrl} title={row.title} />

//                     <div className="min-w-0 flex-1">
//                       <p className="truncate font-inter text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
//                         {row.title}
//                       </p>

//                       <p className="line-clamp-1 font-inter text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
//                         {row.description}
//                       </p>

//                       {(row.influencerName || row.amount) ? (
//                         <p className="mt-1 truncate font-inter text-[0.6875rem] font-normal leading-4 text-[#969696]">
//                           {row.influencerName ? row.influencerName : ""}
//                           {row.influencerName && row.amount ? " · " : ""}
//                           {row.amount
//                             ? `${row.currency || "USD"} ${Number(row.amount).toLocaleString()}`
//                             : ""}
//                         </p>
//                       ) : null}
//                     </div>
//                   </div>

//                   {/* <div className="ml-[2.75rem] flex items-center gap-3">
//                     <button
//                       type="button"
//                       className="flex h-7 items-center justify-center rounded-lg border border-[#E6E6E6] bg-white px-4 font-inter text-[0.75rem] font-medium leading-4 text-[#1A1A1A]"
//                     >
//                       Reject
//                     </button>

//                     <button
//                       type="button"
//                       className="flex h-7 items-center justify-center rounded-lg bg-[#1A1A1A] px-4 font-inter text-[0.75rem] font-medium leading-4 text-white"
//                     >
//                       Release
//                     </button>
//                   </div> */}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </section>
//   );
// };

const DashboardInboxSection = ({
  rows,
  loading,
  error,
  onViewAll,
  onOpenThread,
}: {
  rows: InboxRow[];
  loading: boolean;
  error: string | null;
  onViewAll: () => void;
  onOpenThread: (threadId: string) => void;
}) => {
  return (
    <section className="flex h-[30rem] w-full min-w-0 overflow-hidden rounded-lg border border-[#E6E6E6] bg-white px-5 pt-4 pb-3 xl:h-full">
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-6">
        <div className="flex w-full items-center justify-between gap-4">
          <h3 className="font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
            Inbox
          </h3>

          <button
            type="button"
            onClick={onViewAll}
            className="flex shrink-0 items-center gap-1 font-inter text-[0.75rem] font-medium leading-4 text-[#1A1A1A] underline underline-offset-2 cursor-pointer"
          >
            View all
            <ArrowUpRight size={14} weight="bold" />
          </button>
        </div>

        <div className={`${dashboardScrollbarClass} min-h-0 w-full flex-1`}>
          {loading ? (
            <SkeletonInboxList rows={5} />
          ) : error ? (
            <div className="py-4 font-inter text-[0.75rem] text-[#969696]">
              {error}
            </div>
          ) : !rows.length ? (
            <div className="py-4 font-inter text-[0.75rem] text-[#969696]">
              No conversations yet.
            </div>
          ) : (
            <div className="flex w-full flex-col">
              {rows.map((row) => {
                const name = row.influencer?.name || "Influencer";
                const profileImage =
                  row.influencer?.profilePic ||
                  row.influencer?.profileImage ||
                  row.influencer?.avatarUrl ||
                  "";
                const subject = row.subject || "No subject";
                const description = row.snippet || "No message preview";
                const time = row.lastMessageAt ? fmtDate(row.lastMessageAt, "HH:mm") : "";

                return (
                  <button
                    key={row.threadId}
                    type="button"
                    onClick={() => onOpenThread(row.threadId)}
                    className="flex w-full min-w-0 items-start gap-2 border-b border-[#E6E6E6] px-2 pt-2 pb-3 text-left transition hover:bg-[#F9F9F9] cursor-pointer"
                  >
                    <AvatarBox
                      src={profileImage}
                      name={name}
                      sizeClass="h-[1.375rem] w-[1.375rem]"
                      darkFallback
                      roundedFull
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex w-full items-start gap-2">
                        <p className="truncate font-inter text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
                          {name}
                        </p>

                        <span className="ml-auto shrink-0 text-right font-inter text-[0.75rem] font-normal leading-4 text-[#969696]">
                          {time}
                        </span>
                      </div>

                      <p className="truncate font-inter text-[0.75rem] font-semibold leading-5 text-[#969696]">
                        {subject}
                      </p>

                      <p className="truncate font-inter text-[0.75rem] font-normal leading-4 text-[#969696]">
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const CampaignListSection = ({
  campaigns,
  onViewAll,
  onOpenCampaign,
}: {
  campaigns: CampaignListRow[];
  onViewAll: () => void;
  onOpenCampaign: (id: string) => void;
}) => {
  return (
    <section className="flex w-full overflow-hidden rounded-lg border border-[#E6E6E6] bg-white px-5 pt-4 pb-3 pr-1 xl:h-[14.25rem] xl:flex-none">
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h3 className="font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
            All Campaigns
          </h3>

          <button
            type="button"
            onClick={onViewAll}
            className="font-inter text-[0.75rem] font-medium leading-4 text-[#1A1A1A] underline underline-offset-2 pr-2 cursor-pointer"
          >
            View campaigns
          </button>
        </div>

        <div className={`${dashboardScrollbarClass} min-h-0 w-full flex-1`}>
          {!campaigns.length ? (
            <div className="flex h-full items-center justify-center text-center font-inter text-[0.875rem] text-[#969696]">
              No Campaign Found
            </div>
          ) : (
            <div className="flex w-full flex-col">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenCampaign(campaign.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenCampaign(campaign.id);
                    }
                  }}
                  className="flex w-full min-w-0 cursor-pointer flex-col gap-3 border-b border-[#E6E6E6] py-3 text-left last:border-b-0 xl:flex-row xl:items-center xl:justify-between hover:bg-[#F9F9F9]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <AvatarBox
                      src={campaign.imageUrl}
                      name={campaign.title}
                      sizeClass="h-10 w-10"
                      darkFallback
                    />

                    <div className="min-w-0">
                      <p className="truncate font-inter text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
                        {campaign.title}
                      </p>

                      <p className="truncate font-inter text-[0.75rem] font-normal leading-4 text-[#969696]">
                        {campaign.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 shrink-0 flex-wrap items-center xl:flex-nowrap">
                    <CampaignStatusBadge
                      variant={campaign.statusVariant}
                      label={campaign.statusLabel}
                    />

                    <span className="ml-7 flex shrink-0 items-center gap-1 font-inter text-[0.75rem] font-normal leading-4 text-[#1A1A1A]">
                      <Clock size={14} weight="bold" className="text-[#1A1A1A]" />
                      {campaign.daysLeft}
                    </span>

                    <div className="ml-7 flex shrink-0 items-center gap-2">
                      <div className="h-1 w-20 rounded-full bg-[#E6E6E6]">
                        <div
                          className="h-1 rounded-full bg-[#19B36B]"
                          style={{ width: `${campaign.progress}%` }}
                        />
                      </div>

                      <span className="w-8 text-right font-inter text-[0.75rem] font-semibold leading-4 text-[#1A1A1A]">
                        {campaign.progress}%
                      </span>
                    </div>

                    <div className="ml-9 flex shrink-0 items-center">
                      <ActiveInfluencerAvatarStack influencers={campaign.activeInfluencers} />
                    </div>

                    {/* <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="ml-9 flex h-7 items-center justify-center gap-1 rounded-xl px-2 text-[#1A1A1A] hover:bg-[#F9F9F9]"
                      aria-label="More options"
                    >
                      <DotsThree size={22} weight="bold" />
                    </button> */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const CampaignStatusBadge = ({
  variant,
  label,
}: {
  variant: CampaignStatusVariant;
  label: string;
}) => {
  const statusStyles: Record<
    CampaignStatusVariant,
    {
      dotWrap: string;
      dot: string;
      text: string;
    }
  > = {
    active: {
      dotWrap: "bg-[#EAF6EC]",
      dot: "bg-[#19B36B]",
      text: "text-[#19B36B]",
    },
    paused: {
      dotWrap: "bg-[#FFF4E5]",
      dot: "bg-[#FF8A00]",
      text: "text-[#FF8A00]",
    },
    completed: {
      dotWrap: "bg-[#EEF4FF]",
      dot: "bg-[#3B82F6]",
      text: "text-[#3B82F6]",
    },
    draft: {
      dotWrap: "bg-[#F2F2F2]",
      dot: "bg-[#969696]",
      text: "text-[#969696]",
    },
    published: {
      dotWrap: "bg-[#F4EEFF]",
      dot: "bg-[#8B5CF6]",
      text: "text-[#8B5CF6]",
    },
    inactive: {
      dotWrap: "bg-[#F2F2F2]",
      dot: "bg-[#969696]",
      text: "text-[#969696]",
    },
  };

  const currentStyle = statusStyles[variant] || statusStyles.inactive;

  return (
    <span className="flex shrink-0 items-center gap-1 rounded-3xl bg-[#F9F9F9] px-2 py-1 font-inter text-[0.75rem] font-medium leading-4">
      <span className={`flex rounded-2xl p-0.5 ${currentStyle.dotWrap}`}>
        <span className={`h-2 w-2 rounded-full ${currentStyle.dot}`} />
      </span>

      <span className={currentStyle.text}>{label}</span>
    </span>
  );
};

const ActiveInfluencerAvatarStack = ({
  influencers,
}: {
  influencers: ActiveInfluencerRow[];
}) => {
  const visible = influencers.slice(0, 4);
  const extra = Math.max(0, influencers.length - visible.length);

  if (!influencers.length) {
    return (
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#F9F9F9] px-2 font-inter text-[0.625rem] font-semibold text-[#969696] ring-1 ring-[#E6E6E6]">
        -
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center">
      {visible.map((influencer, index) => {
        const initial = (influencer.name || "I").trim().slice(0, 1).toUpperCase();

        return influencer.profileImage ? (
          <img
            key={`${influencer.influencerId}-${index}`}
            src={influencer.profileImage}
            alt={influencer.name || "Influencer"}
            className="-ml-2 first:ml-0 h-7 w-7 rounded-full border-2 border-white bg-[#F2F2F2] object-cover"
          />
        ) : (
          <span
            key={`${influencer.influencerId}-${index}`}
            className="-ml-2 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#F2F2F2] font-inter text-[0.625rem] font-semibold text-[#1A1A1A]"
          >
            {initial}
          </span>
        );
      })}

      {extra > 0 ? (
        <span className="-ml-2 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#F7F7F7] px-2 font-inter text-[0.625rem] font-semibold text-[#1A1A1A]">
          {extra}+
        </span>
      ) : null}
    </div>
  );
};

const PaymentHistorySection = ({ rows }: { rows: PaymentHistoryRow[] }) => {
  const router = useRouter();

  const onViewAll = () => {
    router.push("/brand/wallet/transaction");
  };

  return (
    <section className="flex w-full rounded-lg border border-[#E6E6E6] bg-white px-5 pt-4 pb-3 pr-1">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex w-full items-center justify-between gap-4">
          <h3 className="font-inter text-[1rem] font-medium leading-6 tracking-[0] text-[#1A1A1A]">
            Payment History
          </h3>

          <button
            type="button"
            onClick={onViewAll}
            className="font-inter text-[0.75rem] font-medium leading-4 text-[#1A1A1A] underline underline-offset-2 pr-2 cursor-pointer"
          >
            View transactions
          </button>
        </div>

        <div className={`${dashboardScrollbarClass} max-h-[18rem] w-full`}>
          {!rows.length ? (
            <div className="py-10 text-center font-inter text-[0.875rem] text-[#969696]">
              No payment history found.
            </div>
          ) : (
            <div className="flex w-full flex-col">
              {rows.map((row) => {
                const isPaid = String(row.status).toLowerCase() === "paid";
                const isCredit = row.amount >= 0;

                return (
                  <div
                    key={row.id}
                    className="flex w-full items-center justify-between gap-4 border-b border-[#E6E6E6] py-4 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center text-[#1A1A1A]">
                        <ArrowDownLeft
                          size={18}
                          weight="bold"
                          className={isCredit ? "rotate-0" : "rotate-180"}
                        />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate font-inter text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
                          {row.title}
                        </p>

                        <p className="truncate font-inter text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
                          {row.dateLabel}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-inter text-[0.875rem] font-semibold leading-5 ${isPaid ? "text-[#19B36B]" : "text-[#1A1A1A]"
                          }`}
                      >
                        {row.currency} {Math.abs(row.amount).toLocaleString()}
                      </p>

                      <p
                        className={`font-inter text-[0.75rem] font-medium leading-4 ${isPaid ? "text-[#19B36B]" : "text-[#969696]"
                          }`}
                      >
                        {row.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const EngagedInfluencersModal = ({
  rows,
  onClose,
}: {
  rows: EngagedInfluencerModalRow[];
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="All Engaged Influencer"
        onClick={(event) => event.stopPropagation()}
        className="flex h-[34rem] w-[50.375rem] max-w-[calc(100vw-2rem)] flex-col items-end justify-center gap-[2.1875rem] overflow-hidden rounded-[1rem] bg-white px-8 pt-8 shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]"
      >
        <div className="flex w-full shrink-0 items-center justify-between gap-4">
          <h3 className="font-inter text-[1.25rem] font-medium leading-7 tracking-[0] text-[#1A1A1A]">
            All Engaged Influencer
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1A1A1A] transition hover:bg-[#F7F7F7] cursor-pointer"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="h-[25.75rem] w-full overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[2.833rem] [&::-webkit-scrollbar-thumb]:rounded-[6.25rem] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6]">
          {!rows.length ? (
            <div className="flex h-full items-center justify-center text-center font-inter text-[0.875rem] text-[#969696]">
              No engaged influencers found.
            </div>
          ) : (
            <div className="flex w-full flex-col">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex min-h-[6rem] items-start gap-3 self-stretch border-t-0 border-b border-[#E6E6E6] bg-white px-8 py-4"
                >
                  <AvatarBox
                    src={row.profileImage}
                    name={row.name}
                    sizeClass="h-16 w-16"
                    roundedFull
                    darkFallback
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="line-clamp-1 max-w-[10rem] overflow-hidden text-ellipsis font-inter text-[1.25rem] font-semibold leading-7 tracking-[0] text-[#1A1A1A]">
                        {row.name}
                      </p>

                      <span className="line-clamp-1 max-w-[8.75rem] overflow-hidden text-ellipsis font-inter text-[1rem] font-normal leading-6 tracking-[0] text-[#969696]">
                        {row.handle || "@handle"}
                      </span>
                    </div>

                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1 font-inter text-[0.875rem] font-normal leading-5">
                      <span className="text-[#1A1A1A]">
                        {formatFollowers(row.followers)}
                      </span>

                      <span className="text-[#969696]">Followers</span>

                      <span className="text-[#969696]">·</span>

                      <span className="line-clamp-1 max-w-[22rem] overflow-hidden text-ellipsis text-[#969696]">
                        {row.campaignName}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MilestoneImageBox = ({
  src,
  title,
}: {
  src?: string;
  title: string;
}) => {
  const initial = (title || "M").trim().slice(0, 1).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={title}
        className="h-9 w-9 shrink-0 rounded-lg border border-white/30 bg-black object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-[#1A1A1A] font-inter text-[0.75rem] font-semibold text-white">
      {initial}
    </div>
  );
};

const AvatarBox = ({
  src,
  name,
  sizeClass,
  darkFallback = false,
  roundedFull = false,
}: {
  src?: string;
  name: string;
  sizeClass: string;
  darkFallback?: boolean;
  roundedFull?: boolean;
}) => {
  const initial = (name || "N").trim().slice(0, 1).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 object-cover ${roundedFull ? "rounded-full" : "rounded-lg"
          } border border-white/30 bg-black`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 ${roundedFull ? "rounded-full" : "rounded-lg"
        } flex items-center justify-center border border-white/30 ${darkFallback ? "bg-[#1A1A1A] text-white" : "bg-[#F2F2F2] text-[#1A1A1A]"
        } font-inter text-[0.625rem] font-semibold`}
    >
      {initial}
    </div>
  );
};