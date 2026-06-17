"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  apiGetfetchCampaignbyId,
  getApiErrorMessage,
} from "@/app/influencer/services/influencerApi";
import { ArrowUpRight } from "lucide-react";
import {
  CalendarDots,
  CalendarX,
  CaretLeft,
  CaretRight,
  DotsThree,
  DownloadSimple,
  EnvelopeSimple,
  FilePdf,
  LinkSimple,
  Wallet,
} from "@phosphor-icons/react";
import Image from "next/image";
import api from "@/lib/api";

const PAGE_WRAP =
  "min-h-screen w-full bg-white px-4 pb-28 pt-8 sm:px-6 lg:px-10 xl:px-14";

const CONTENT_WRAP = "mx-auto w-full max-w-[72.5rem]";

const HERO_GRADIENT =
  "linear-gradient(109deg, var(--Neutrals-0, #FFF) 28.8%, #FAFAFA 36.05%, rgba(255, 191, 0, 0.83) 50%, #F6BB2A 57.65%, #F3584E 74.04%, #E078D1 84.62%), var(--Light-Background-Subtle, #F9F9F9)";

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
};

type CampaignFile = {
  name?: string;
  url?: string;
  size?: number | string | null;
  type?: string;
};

type CampaignImage = {
  name?: string;
  url?: string;
  size?: number | string | null;
  type?: string;
};

type CampaignTagRow = {
  id?: string;
  label?: string;
  goal?: string;
  type?: string;
  name?: string;
  title?: string;
  value?: string;
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

  campaignGoalIds?: string[];
  campaignGoalDetails?: CampaignTagRow[];
  campaignGoalRows?: CampaignTagRow[];
  campaignGoals?: string[];

  campaignType?: string;
  campaignTypeRows?: CampaignTagRow[];
  campaignTypes?: string[];

  category?: string[];
  subcategory?: string[];

  payout?: {
    currency?: string;
    min?: number;
    max?: number;
  };

  startAt?: string | null;
  endAt?: string | null;
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
  appliedInfluencerCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CampaignViewData = {
  brand: BrandData;
  influencer: InfluencerData;
  campaign: CampaignData;
};

function asArray<T = any>(value: any): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

function isObjectIdLike(value: any) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function toTitleLabel(value: any) {
  const text = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text || isObjectIdLike(text)) return "";

  return text
    .split(" ")
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function getTagLabel(item: any) {
  if (item === null || item === undefined) return "";

  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim();
  }

  if (typeof item === "object") {
    return pickString(
      item.label,
      item.goal,
      item.goalName,
      item.campaignGoal,
      item.campaignGoalName,
      item.campaignType,
      item.type,
      item.name,
      item.title,
      item.value,
      item.format,
      item.language,
      item.tier,
      item.range,
      item.countryNameEn,
      item.countryName,
      item.countryCode,
      item.categoryName,
      item.subcategoryName
    );
  }

  return "";
}

function toDisplayTags(...inputs: any[]) {
  const seen = new Set<string>();

  return inputs
    .flatMap((input) => asArray(input))
    .flatMap((item) =>
      typeof item === "string"
        ? item.split(",").map((part) => part.trim())
        : [getTagLabel(item)]
    )
    .map(toTitleLabel)
    .filter(Boolean)
    .filter((label) => {
      const key = label.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function removeTags(values: string[], removeValues: string[]) {
  const removeSet = new Set(
    removeValues.map((value) => value.trim().toLowerCase())
  );

  return values.filter((value) => !removeSet.has(value.trim().toLowerCase()));
}

function toNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactNumber(value: any) {
  const num = toNumber(value);

  if (!num) return "—";

  return num.toLocaleString("en-US");
}

function currencySymbol(currency?: string) {
  const code = String(currency || "USD").toUpperCase();

  if (code === "USD") return "$";
  if (code === "INR") return "₹";
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";

  return `${code} `;
}

function formatMoney(value: any, currency?: string) {
  const num = toNumber(value);

  if (!num) return "—";

  return `${currencySymbol(currency)}${num.toLocaleString("en-US")}`;
}

function formatMoneyRange(minValue: any, maxValue: any, currency?: string) {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min && max && min !== max) {
    return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
  }

  if (max) return formatMoney(max, currency);
  if (min) return formatMoney(min, currency);

  return "—";
}

function formatDate(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatPostedAgo(value: any) {
  if (!value) return "Posted recently";

  const created = new Date(value).getTime();

  if (!Number.isFinite(created)) return "Posted recently";

  const diffMs = Date.now() - created;
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `Posted ${hours} hr${hours === 1 ? "" : "s"} ago`;

  return `Posted ${minutes} min${minutes === 1 ? "" : "s"} ago`;
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3 text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
      {children}
    </h2>
  );
}

function EmptyValue() {
  return <span className="text-[0.875rem] leading-5 text-[#969696]">—</span>;
}

function LineWiseTags({
  values,
  variant = "text",
}: {
  values: string[];
  variant?: "text" | "pill";
}) {
  if (!values.length) return <EmptyValue />;

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      {values.map((value, index) => {
        if (variant === "pill") {
          return <Pill key={`${value}-${index}`}>{value}</Pill>;
        }

        return (
          <span
            key={`${value}-${index}`}
            className="block text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]"
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

function TagCard({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <Card className="flex min-h-[8rem] flex-col items-start gap-5 p-4">
      <div className="text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
        {title}
      </div>

      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value, index) => (
            <Pill key={`${title}-${value}-${index}`}>{value}</Pill>
          ))
        ) : (
          <EmptyValue />
        )}
      </div>
    </Card>
  );
}

function StatRow({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[1rem] font-semibold leading-6 text-[#1A1A1A]">
          {value}
        </div>
        <div className="text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
          {label}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex min-h-[12.375rem] flex-col items-start p-3">
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-[0.5rem] bg-[#F2F2F2]">
          {icon}
        </div>
      ) : null}

      <div className="mt-auto flex w-full flex-col gap-2">
        <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
          {label}
        </div>

        {children ?? (
          <div className="text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {value || "—"}
          </div>
        )}
      </div>
    </Card>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const lower = platform.toLowerCase();

  if (lower.includes("instagram")) {
    return (
      <Image
        src="/skill-icons_instagram.svg"
        alt="Instagram"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    );
  }

  if (lower.includes("youtube")) {
    return (
      <Image
        src="/logos_youtube-icon.svg"
        alt="YouTube"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    );
  }

  if (lower.includes("tiktok")) {
    return (
      <Image
        src="/ic_baseline-tiktok.svg"
        alt="TikTok"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    );
  }

  return <Pill>{platform}</Pill>;
}

function PdfAttachmentCard({
  name,
  size,
  onDownload,
}: {
  name: string;
  size?: string;
  onDownload: () => void;
}) {
  return (
    <Card className="flex min-h-[5rem] items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <FilePdf
          weight="fill"
          className="h-8 w-8 shrink-0 text-[#F04438]"
        />

        <div className="min-w-0">
          <div className="truncate text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {name || "Brandguideline.pdf"}
          </div>

          {size ? (
            <div className="text-[0.875rem] font-normal leading-5 text-[#969696]">
              {size}
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.5rem] text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
        aria-label="Download file"
      >
        <DownloadSimple weight="bold" className="h-4 w-4" />
      </button>
    </Card>
  );
}

function CreatorRequirementGrid({
  numberOfInfluencers,
  influencerTier,
  contentLanguage,
  contentFormat,
  minFollowers,
  maxFollowers,
}: {
  numberOfInfluencers: string;
  influencerTier: string;
  contentLanguage: string;
  contentFormat: string[];
  minFollowers: string;
  maxFollowers: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-[#E6E6E6] md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Number of influencers
          </div>
          <div className="mt-3 text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {numberOfInfluencers}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Influencer Tier
          </div>
          <div className="mt-3 text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {influencerTier}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Content Language
          </div>
          <div className="mt-3 text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {contentLanguage}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[#E6E6E6] border-t border-[#E6E6E6] md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Content Format
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {contentFormat.length ? (
              contentFormat.map((format, index) => (
                <Pill key={`${format}-${index}`}>{format}</Pill>
              ))
            ) : (
              <EmptyValue />
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Min Followers
          </div>
          <div className="mt-3 text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {minFollowers}{" "}
            <span className="text-[0.75rem] text-[#969696]">(min)</span>
          </div>
        </div>

        <div className="p-4">
          <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
            Max Followers
          </div>
          <div className="mt-3 text-[1rem] font-medium leading-6 text-[#1A1A1A]">
            {maxFollowers}{" "}
            <span className="text-[0.75rem] text-[#969696]">(max)</span>
          </div>
        </div>
      </div>
    </Card>
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

export default function ViewCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const idFromQuery = searchParams.get("id");

  const campaignId = useMemo(
    () => normalizeMongoId(idFromQuery ?? (params as any)?.campaignId),
    [idFromQuery, params]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [viewData, setViewData] = useState<CampaignViewData | null>(null);

  const [influencerId, setInfluencerId] = useState("");
  const [token, setToken] = useState("");
  const [isOpeningThread, setIsOpeningThread] = useState(false);

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(0);
const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    let ro: ResizeObserver | null = null;

    const update = () => {
      if (!desktopMq.matches) {
        setSidebarWidth(0);
        return;
      }

      const sidebar = document.querySelector(
        "[data-cg-sidebar]"
      ) as HTMLElement | null;

      if (!sidebar) {
        setSidebarWidth(0);
        return;
      }

      setSidebarWidth(Math.round(sidebar.getBoundingClientRect().width));
    };

    const attachObserver = () => {
      const sidebar = document.querySelector(
        "[data-cg-sidebar]"
      ) as HTMLElement | null;

      if (ro) {
        ro.disconnect();
        ro = null;
      }

      if (sidebar && desktopMq.matches) {
        ro = new ResizeObserver(() => update());
        ro.observe(sidebar);
      }

      update();
    };

    attachObserver();

    window.addEventListener("resize", attachObserver);
    desktopMq.addEventListener?.("change", attachObserver);

    const raf1 = requestAnimationFrame(attachObserver);
    const raf2 = requestAnimationFrame(attachObserver);

    return () => {
      window.removeEventListener("resize", attachObserver);
      desktopMq.removeEventListener?.("change", attachObserver);

      if (ro) ro.disconnect();

      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
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
          token || undefined
        );

        const payload = res?.data?.data ?? res?.data ?? res;

        const nextData: CampaignViewData = {
          brand: payload?.brand ?? {},
          influencer: payload?.influencer ?? {},
          campaign: payload?.campaign ?? {},
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
  }, [influencerId, campaignId, token]);

  if (loading) {
    return (
      <div className={PAGE_WRAP}>
        <div className={CONTENT_WRAP}>
          <div className="overflow-hidden rounded-[0.75rem] border border-[#E6E6E6] bg-white">
            <div
              className="h-[8.5rem] w-full animate-pulse"
              style={{ background: HERO_GRADIENT }}
            />

            <div className="p-6">
              <div className="h-6 w-72 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-96 animate-pulse rounded bg-gray-200" />
              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20.75rem]">
                <div className="h-72 animate-pulse rounded-[0.75rem] bg-gray-100" />
                <div className="h-72 animate-pulse rounded-[0.75rem] bg-gray-100" />
              </div>
            </div>
          </div>
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
              Couldn’t load campaign
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

  const campaignTitle = pickString(campaign.title, "Campaign");
  const brandName = pickString(brand.brandName, brand.name, "Brand");
  const postedText = formatPostedAgo(campaign.createdAt ?? campaign.updatedAt);
  const productUrl = pickString(campaign.productUrl);
  const logoUrl = normalizeAssetUrl(brand.profilePic);
  const descriptionText = pickString(campaign.description);
  const additionalNotesText = pickString(campaign.additionalNotes);

  const payoutText = formatMoneyRange(
    campaign.payout?.min,
    campaign.payout?.max,
    campaign.payout?.currency
  );

  const startDateText = formatDate(campaign.startAt);
  const endDateText = formatDate(campaign.endAt);
  const shortStartDateText = formatShortDate(campaign.startAt);
  const shortEndDateText = formatShortDate(campaign.endAt);
  const paymentTypeText = pickString(campaign.paymentType, "—");

  const hasAppliedValue = Number(influencer.hasApplied ?? 0);
  const appliedCount = toNumber(campaign.appliedInfluencerCount);

  const categoryTags = toDisplayTags(campaign.category);
  const subcategoryTags = toDisplayTags(campaign.subcategory);

  const campaignGoalTags = removeTags(
    toDisplayTags(
      campaign.campaignGoalRows,
      campaign.campaignGoalDetails,
      campaign.campaignGoals
    ),
    [...categoryTags, ...subcategoryTags]
  );

  const campaignTypeTags = removeTags(
    toDisplayTags(
      campaign.campaignTypeRows,
      campaign.campaignType,
      campaign.campaignTypes
    ),
    [...categoryTags, ...subcategoryTags, ...campaignGoalTags]
  );

  const hashtags = toDisplayTags(campaign.hashtags);
  const targetCountries = toDisplayTags(campaign.targetCountries);
  const targetAgeGroups = toDisplayTags(campaign.targetAgeGroups);
  const targetPlatforms = toDisplayTags(campaign.targetPlatforms);
  const contentFormat = toDisplayTags(campaign.contentFormat);

  const numberOfInfluencers = compactNumber(campaign.numberOfInfluencers);
  const influencerTier = toDisplayTags(campaign.influencerTier).join(", ");
  const contentLanguage = toDisplayTags(campaign.contentLanguage).join(", ");
  const minFollowers = compactNumber(campaign.minFollowers);
  const maxFollowers = compactNumber(campaign.maxFollowers);

  const carouselImages = asArray<CampaignImage>(campaign.productImages)
    .map((image) => normalizeAssetUrl(image.url))
    .filter(Boolean);

    const openImagePreview = (index: number) => {
  setPreviewIndex(index);
};

const closeImagePreview = () => {
  setPreviewIndex(null);
};

const showPreviousPreviewImage = () => {
  setPreviewIndex((current) => {
    if (current === null || carouselImages.length === 0) return current;
    return current <= 0 ? carouselImages.length - 1 : current - 1;
  });
};

const showNextPreviewImage = () => {
  setPreviewIndex((current) => {
    if (current === null || carouselImages.length === 0) return current;
    return current >= carouselImages.length - 1 ? 0 : current + 1;
  });
};

  const videoReferenceUrl = pickString(campaign.videoReferenceUrl);
  const videoThumbUrl = videoReferenceUrl ? getVideoThumb(videoReferenceUrl) : "";

  const pdfUrl = normalizeAssetUrl(campaign.brandGuideline?.url);
  const pdfName = pickString(campaign.brandGuideline?.name, "Brandguideline.pdf");
  const pdfSizeText = formatFileSize(campaign.brandGuideline?.size);

  const scrollToSlide = (index: number) => {
    const el = carouselRef.current;

    if (!el || !carouselImages.length) return;

    const clamped = Math.max(0, Math.min(index, carouselImages.length - 1));
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

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard may be blocked by the browser.
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
      response?.id
    );
  };

  const onMailBrand = async () => {
    if (isOpeningThread) return;

    const brandId = pickString(brand.brandId, brand._id);
    const currentInfluencerId = pickString(influencer.influencerId, influencer._id);
    const currentCampaignId = pickString(campaign.campaignId, campaign._id);

    if (!brandId || !currentInfluencerId || !currentCampaignId) {
      setErr("Unable to open inbox. Missing brand, influencer, or campaign details.");
      return;
    }

    setIsOpeningThread(true);

    try {
      const response = await api.post("/emails/threads", {
        brandId,
        influencerId: currentInfluencerId,
        campaignId: currentCampaignId,
        subject: campaignTitle,
        type: "campaign",
        source: "influencer_campaign_view",
      });

      const threadId = getThreadIdFromResponse(response);

      if (!threadId) {
        throw new Error("Thread created, but threadId was not returned.");
      }

      router.push(`/influencer/inbox/${threadId}`);
    } catch (error: any) {
      setErr(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to open brand conversation."
      );
    } finally {
      setIsOpeningThread(false);
    }
  };

  const onDownloadPdf = () => {
    if (!pdfUrl) return;

    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={PAGE_WRAP}>
      <div className={CONTENT_WRAP}>
        <section className="border-b border-[#E6E6E6] pb-6">
          <div
            className="h-[9.5rem] w-full rounded-t-[0.75rem]"
            style={{ background: HERO_GRADIENT }}
          />

          <div className="-mt-[3.125rem] flex flex-col gap-5">
            <div
              className="h-[6.25rem] w-[6.25rem] overflow-hidden rounded-full border border-white/40 bg-black shadow-sm"
              aria-label={`${brandName} logo`}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[2rem] font-bold text-white">
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h1 className="max-w-[32rem] text-[1.5rem] font-bold leading-8 text-[#1A1A1A]">
                  {campaignTitle}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[0.75rem] leading-4 text-[#B8B8B8]">
                  <span>{brandName}</span>
                  <span>·</span>
                  <span>{postedText}</span>
                </div>

                <div className="mt-1">
                  {productUrl ? (
                    <a
                      href={productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-[22rem] items-center gap-1 truncate text-[0.75rem] font-normal leading-4 text-[#B8B8B8]"
                    >
                      <span className="truncate">{productUrl}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[0.75rem] leading-4 text-[#B8B8B8]">
                      —
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onCopyLink}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[0.5rem] bg-white px-2 text-[0.875rem] font-medium text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                >
                  <LinkSimple className="h-4 w-4" />
                  Copy link
                </button>

                <button
                  type="button"
                  onClick={onMailBrand}
                  disabled={isOpeningThread || !pickString(brand.brandId, brand._id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[0.5rem] border border-[#E6E6E6] bg-white px-3 text-[0.875rem] font-medium text-[#1A1A1A] transition hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOpeningThread ? "Opening..." : "Mail to brand"}
                  <EnvelopeSimple className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                  aria-label="More options"
                >
                  <DotsThree className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20.75rem]">
          <Card className="p-5">
            <h2 className="text-[1.25rem] font-semibold leading-7 text-[#1A1A1A]">
              About Campaign
            </h2>

            <p className="mt-5 line-clamp-5 text-[0.875rem] font-normal leading-5 text-[#969696]">
              {descriptionText || "—"}
            </p>

            <div className="mt-8">
              <div className="[font-family:var(--Font-Family-Inter,Inter)] text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                Campaign Goals
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-12 gap-y-3">
                {campaignGoalTags.length ? (
                  campaignGoalTags.map((goal, index) => (
                    <span
                      key={`campaign-goal-${goal}-${index}`}
                      className="[font-family:var(--Font-Family-Inter,Inter)] text-center text-[0.875rem] font-semibold leading-[1.25rem] tracking-[0] text-[#1A1A1A]"
                    >
                      {goal}
                    </span>
                  ))
                ) : (
                  <EmptyValue />
                )}
              </div>

              <div className="mt-8 [font-family:var(--Font-Family-Inter,Inter)] text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                Campaign Type
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {campaignTypeTags.length ? (
                  campaignTypeTags.map((type, index) => (
                    <span
                      key={`campaign-type-${type}-${index}`}
                      className="inline-flex min-h-7 items-center justify-center rounded-[0.375rem] bg-[#F9F9F9] px-3 py-1 [font-family:var(--Font-Family-Inter,Inter)] text-center text-[0.875rem] font-semibold leading-[1.25rem] tracking-[0] text-[#1A1A1A]"
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <EmptyValue />
                )}
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-6 p-5">
            <div>
              <div className="text-[1.25rem] font-bold leading-7 text-[#1A1A1A]">
                {payoutText}
              </div>
              <div className="text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
                Campaign Payout
              </div>
            </div>

            <StatRow
              icon={<CalendarDots weight="bold" className="h-5 w-5" />}
              value={startDateText}
              label="Start Date"
            />

            <StatRow
              icon={<CalendarX weight="bold" className="h-5 w-5" />}
              value={endDateText}
              label="End Date"
            />

            <StatRow
              icon={<Wallet weight="bold" className="h-5 w-5" />}
              value={paymentTypeText}
              label="Payment Type"
            />

            <div>
              <div className="flex items-center">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={index}
                    className="-ml-2 first:ml-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#EDEDED] text-[0.625rem] font-semibold text-[#1A1A1A]"
                  >
                    {index === 3 ? `${appliedCount || 10}+` : ""}
                  </span>
                ))}
              </div>

              <div className="mt-2 text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
                {appliedCount || 0} Influencer Already Applied
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20.75rem]">
          <div className="grid gap-5 md:grid-cols-2">
            <TagCard title="Category" values={categoryTags} />
            <TagCard title="Subcategory" values={subcategoryTags} />
          </div>

          {pdfUrl ? (
            <PdfAttachmentCard
              name={pdfName}
              size={pdfSizeText}
              onDownload={onDownloadPdf}
            />
          ) : (
            <Card className="flex min-h-[5rem] items-center justify-center p-4 text-[0.875rem] text-[#969696]">
              No brand guideline attached
            </Card>
          )}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20.75rem]">
          <div className="min-w-0">
            <SectionTitle>Image / Reference</SectionTitle>

            <div className="relative mt-6">
              {carouselImages.length ? (
                <>
                  <div
                    ref={carouselRef}
                    onScroll={onCarouselScroll}
                    className="flex w-full items-center gap-5 overflow-x-auto scroll-smooth py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {carouselImages.map((src, index) => (
<button
  key={`${src}-${index}`}
  type="button"
  onClick={() => openImagePreview(index)}
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
                    disabled={activeSlide >= carouselImages.length - 1}
                    className="absolute right-4 top-[5.5rem] flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] disabled:opacity-40"
                    aria-label="Next image"
                  >
                    <CaretRight weight="bold" className="h-5 w-5" />
                  </button>

                  <div className="mt-1 flex w-full items-center justify-center gap-2">
                    {carouselImages.map((_, index) => (
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
                <Card className="mt-5 flex h-[11.5rem] items-center justify-center text-[0.875rem] text-[#969696]">
                  —
                </Card>
              )}
            </div>

            <div className="mb-[1.55rem] mt-[1.75rem] h-px w-full bg-[#E6E6E6]" />

            <SectionTitle>Creator Requirement</SectionTitle>

            <div className="mt-6">
              <CreatorRequirementGrid
                numberOfInfluencers={numberOfInfluencers}
                influencerTier={influencerTier || "—"}
                contentLanguage={contentLanguage || "—"}
                contentFormat={contentFormat}
                minFollowers={minFollowers}
                maxFollowers={maxFollowers}
              />
            </div>

            <div className="mb-[1.55rem] mt-[1.75rem] h-px w-full bg-[#E6E6E6]" />

            <SectionTitle>Timeline &amp; Payments</SectionTitle>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <InfoTile
                icon={<CalendarDots weight="bold" className="h-6 w-6" />}
                label="Start date"
                value={shortStartDateText}
              />

              <InfoTile
                icon={<CalendarX weight="bold" className="h-6 w-6" />}
                label="End Date"
                value={shortEndDateText}
              />

              <InfoTile
                icon={<Wallet weight="bold" className="h-6 w-6" />}
                label="Payment type"
                value={paymentTypeText}
              />

              <InfoTile label="Hashtags">
                <div className="flex flex-wrap gap-2">
                  {hashtags.length ? (
                    hashtags.map((tag, index) => (
                      <Pill key={`${tag}-${index}`}>{tag}</Pill>
                    ))
                  ) : (
                    <EmptyValue />
                  )}
                </div>
              </InfoTile>
            </div>

            <div className="mb-[1.55rem] mt-[1.75rem] h-px w-full bg-[#E6E6E6]" />

            <SectionTitle>Audience &amp; Platforms</SectionTitle>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Card className="flex min-h-[4.5rem] flex-col justify-between p-3">
                  <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
                    Target Platform
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {targetPlatforms.length ? (
                      targetPlatforms.map((platform, index) => (
                        <PlatformIcon
                          key={`${platform}-${index}`}
                          platform={platform}
                        />
                      ))
                    ) : (
                      <EmptyValue />
                    )}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
                    Target country
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {targetCountries.length ? (
                      targetCountries.map((country, index) => (
                        <Pill key={`${country}-${index}`}>{country}</Pill>
                      ))
                    ) : (
                      <EmptyValue />
                    )}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-[0.875rem] font-medium leading-5 text-[#B8B8B8]">
                    Target age group
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {targetAgeGroups.length ? (
                      targetAgeGroups.map((age, index) => (
                        <Pill key={`${age}-${index}`}>{age}</Pill>
                      ))
                    ) : (
                      <EmptyValue />
                    )}
                  </div>
                </Card>
              </div>

              <Card className="p-3">
                <div className="text-[0.75rem] font-semibold leading-5 text-[#1A1A1A]">
                  Video Reference
                </div>

                {videoReferenceUrl ? (
                  <div className="mt-5 flex flex-col gap-3">
                    <a
                      href={videoReferenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 break-all text-[0.875rem] font-medium leading-5 text-[#B8B8B8]"
                    >
                      {videoReferenceUrl}
                    </a>

                    <a
                      href={videoReferenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-[10.125rem] w-[12.875rem] rounded-[0.25rem] bg-[#F2F2F2] bg-cover bg-center"
                      style={{
                        backgroundImage: videoThumbUrl
                          ? `url(${videoThumbUrl})`
                          : undefined,
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-5 text-[0.875rem] text-[#969696]">—</div>
                )}
              </Card>
            </div>

            <div className="mb-[1.55rem] mt-[1.75rem] h-px w-full bg-[#E6E6E6]" />

            <Card className="p-5">
              <SectionTitle>Additional Notes</SectionTitle>

              <p className="mt-5 line-clamp-5 text-[0.875rem] font-normal leading-5 text-[#969696]">
                {additionalNotesText || "—"}
              </p>
            </Card>
          </div>

          <div className="hidden lg:block" />
        </div>
      </div>

{previewIndex !== null ? (
  <ImagePreviewModal
    images={carouselImages}
    activeIndex={previewIndex}
    onClose={closeImagePreview}
    onPrev={showPreviousPreviewImage}
    onNext={showNextPreviewImage}
  />
) : null}

      <div
        className="fixed bottom-0 z-40 border-t border-[#E6E6E6] bg-white"
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        <div className="flex h-20 w-full items-center justify-end gap-2 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/influencer/dashboards")}
            className="h-11 rounded-[0.75rem] bg-white px-5 text-[0.875rem] font-medium text-[#1A1A1A] hover:underline"
          >
            Go to Dashboard
          </button>

          {hasAppliedValue === 1 ? (
            <button
              type="button"
              disabled
              className="h-11 cursor-default rounded-[0.75rem] border border-[#E6E6E6] bg-[#F2F2F2] px-8 text-[0.875rem] font-semibold text-[#969696]"
            >
              Applied
            </button>
          ) : (
            <button
              type="button"
              className="h-11 rounded-[0.75rem] bg-[#1A1A1A] px-8 text-[0.875rem] font-semibold text-white transition hover:bg-black/90"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}