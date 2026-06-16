"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  Globe,
  Mail,
  Search,
  SlidersHorizontal,
  X,
  Youtube,
} from "lucide-react";

type CreatorScores = {
  sponsorshipScore?: number;
  engagementScore?: number;
  consistencyScore?: number;
  brandSafetyScore?: number;
  relevancyScore?: number;
  authenticityScore?: number;
  audienceCountryConfidence?: number;
  shortlistScore?: number;
  nicheFit?: number;
};

type RecentVideo = {
  videoId?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  publishedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
  url?: string;
};

type YouTubeCreator = {
  channelId: string;
  channelName: string;
  channelUrl?: string;
  thumbnail?: string;
  subscribers?: number;
  subscriberCount?: number;
  country?: string;
  estimatedAudienceCountry?: string;
  primaryLanguage?: string;
  totalVideos?: number;
  totalLifetimeVideos?: number;
  totalViews?: number;
  totalLifetimeViews?: number;
  totalVideosLast90Days?: number;
  totalVideosLast2Years?: number;
  activityLookbackDays?: number;
  activityLookbackStartDate?: string;
  channelCreatedDate?: string;
  yearsOnYouTube?: number;
  sourceVideoTitle?: string;
  sourceVideoUrl?: string;
  foundViaQuery?: string;
  allSearchKeywordsUsed?: string[];
  channelTags?: string[];
  contentFlag?: string;
  avgViews?: number;
  avgLikes?: number;
  avgComments?: number;
  engagementRate?: number;
  recentUploadDate?: string;
  category?: string;
  channelCategory?: string;
  description?: string;
  channelDescription?: string;
  creatorTier?: string;
  recentVideoTitles?: RecentVideo[];
  contact?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    website?: string;
    otherSocials?: string[];
    totalEmails?: string[];
    youtubeAboutEmail?: string;
  };
  shortlist?: {
    nicheFit?: number;
    contentQuality?: string;
    previousSponsors?: string;
    uploadFrequency?: string;
    countryMatch?: string;
    score?: number;
    status?: string;
    filterFailureReason?: string;
  };
  filterMatch?: {
    requestedTier?: string;
    subscriberTierMatch?: boolean;
    countryMatch?: boolean;
    softFiltersApplied?: boolean;
  };
  scores?: CreatorScores;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type Filters = {
  keyword: string;
  category: string;
  subscriberTier: string;
  country: string;
  minSubscribers: string | number;
  maxSubscribers: string | number;
  minAvgViews: string | number;
  minEngagement: string | number;
  sort: string;
  page: number;
  limit: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const FRONTEND_PAGE_SIZE = 25;
const DISCOVERY_FETCH_LIMIT = 100;

const defaultFilters: Filters = {
  keyword: "",
  category: "",
  subscriberTier: "",
  country: "",
  minSubscribers: "",
  maxSubscribers: "",
  minAvgViews: "",
  minEngagement: "",
  sort: "subscribers_desc",
  page: 1,
  limit: FRONTEND_PAGE_SIZE,
};

const YOUTUBE_CATEGORIES = [
  "Film & Animation",
  "Autos & Vehicles",
  "Music",
  "Pets & Animals",
  "Sports",
  "Travel & Events",
  "Gaming",
  "People & Blogs",
  "Comedy",
  "Entertainment",
  "News & Politics",
  "Howto & Style",
  "Education",
  "Science & Technology",
  "Nonprofits & Activism",
  "Movies",
  "Shows",
  "Trailers",
  "Technology",
  "Gadgets",
  "Mobile Phones",
  "Laptops",
  "AI Tools",
  "Software",
  "Finance",
  "Crypto",
  "Stock Market",
  "Business",
  "Marketing",
  "Beauty",
  "Fashion",
  "Skincare",
  "Fitness",
  "Health",
  "Food",
  "Cooking",
  "Parenting",
  "Home Decor",
  "DIY",
  "Automotive",
  "Bike Reviews",
  "Car Reviews",
  "Photography",
  "Cameras",
  "Vlogging",
  "Lifestyle",
  "Travel Vlogs",
  "Education Tech",
  "Online Learning",
  "Product Reviews",
  "Unboxing",
  "Comparison Reviews",
  "Shopping Guides",
  "Entertainment Reviews",
  "Indian Creators",
];

const SUBSCRIBER_TIERS = [
  {
    label: "Nano",
    value: "nano",
    rangeLabel: "1K - 10K",
    minSubscribers: 1000,
    maxSubscribers: 10000,
  },
  {
    label: "Micro",
    value: "micro",
    rangeLabel: "10K - 100K",
    minSubscribers: 10000,
    maxSubscribers: 100000,
  },
  {
    label: "Mid-tier",
    value: "mid-tier",
    rangeLabel: "100K - 500K",
    minSubscribers: 100000,
    maxSubscribers: 500000,
  },
  {
    label: "Macro",
    value: "macro",
    rangeLabel: "500K - 1M",
    minSubscribers: 500000,
    maxSubscribers: 1000000,
  },
  {
    label: "Mega",
    value: "mega",
    rangeLabel: "1M+",
    minSubscribers: 1000000,
    maxSubscribers: null,
  },
];

const allowedParams = [
  "keyword",
  "category",
  "subscriberTier",
  "country",
  "minAvgViews",
  "minEngagement",
  "sort",
  "page",
  "limit",
  "campaignId",
  "frontendPagination",
];

function getApiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function getProxyImageUrl(url?: string) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return getApiUrl(`/youtube-data/image-proxy?url=${encodeURIComponent(raw)}`);
}

function getInitials(name?: string) {
  const value = String(name || "?").trim();
  const words = value.split(/\s+/).filter(Boolean);

  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function AvatarImage({
  src,
  name,
  className,
}: {
  src?: string;
  name?: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const proxiedSrc = getProxyImageUrl(src);

  if (!proxiedSrc || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-[#f4f0ea] text-xs font-semibold text-[#6f6258]`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={proxiedSrc}
      alt={name || "Creator"}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function VideoThumbnail({ src, title }: { src?: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  const proxiedSrc = getProxyImageUrl(src);

  if (!proxiedSrc || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f4f0ea] px-4 text-center text-xs font-semibold text-[#8a8179]">
        {trimText(title || "Video", 55)}
      </div>
    );
  }

  return (
    <img
      src={proxiedSrc}
      alt={title || "Video"}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}


const CREATOR_SEARCH_LOADING_STEPS = [
  {
    animal: "🦊",
    title: "Hold on, we’re searching YouTube creators",
    subtitle:
      "CollabGlam is matching your brand with creators who can tell the right story.",
  },
  {
    animal: "🦋",
    title: "Scanning channels, niches, and recent uploads",
    subtitle:
      "We’re checking creator activity, content style, and campaign-fit signals.",
  },
  {
    animal: "🦚",
    title: "Looking for creators with real collaboration potential",
    subtitle:
      "Not just subscribers — we’re sorting by relevance, engagement, and brand safety.",
  },
  {
    animal: "🐼",
    title: "Building a smarter influencer shortlist",
    subtitle:
      "We’re organizing creators so the best-fit profiles are easier to review.",
  },
  {
    animal: "🐬",
    title: "Preparing media-kit insights",
    subtitle:
      "Metrics, recent posts, contact signals, and scores are being assembled.",
  },
  {
    animal: "🦄",
    title: "Almost ready — polishing your discovery list",
    subtitle:
      "Your brand-influencer collaboration matches will appear in a few moments.",
  },
];

function CreatorSearchLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((current) =>
        (current + 1) % CREATOR_SEARCH_LOADING_STEPS.length,
      );
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  const step = CREATOR_SEARCH_LOADING_STEPS[stepIndex];

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-[680px] overflow-hidden rounded-[30px] border border-[#eadfd3] bg-gradient-to-br from-white via-[#fffaf3] to-[#fff1d7] p-7 text-center shadow-[0_22px_70px_rgba(72,52,32,0.12)]">
        <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#ffe9b8] opacity-70 blur-xl animate-pulse" />
          <div className="absolute h-28 w-28 rounded-full border border-[#f0ddc8]" />
          <div className="absolute h-20 w-20 rounded-full border border-dashed border-[#e1c9af] animate-spin" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#e8d7c5] bg-white text-4xl shadow-sm animate-bounce">
            {step.animal}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#eadccd] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6f55]">
          <span className="h-2 w-2 rounded-full bg-[#25c55a] animate-pulse" />
          CollabGlam discovery engine
        </div>

        <h3 className="mt-5 text-[22px] font-semibold text-black">
          {step.title}
        </h3>
        <p className="mx-auto mt-3 max-w-[540px] text-sm leading-6 text-[#776b62]">
          {step.subtitle}
        </p>

        <div className="mx-auto mt-7 flex max-w-[420px] items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee2d8]">
            <div className="h-full w-2/3 rounded-full bg-black animate-pulse" />
          </div>
          <span className="text-xs font-medium text-[#8a8179]">Searching</span>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {CREATOR_SEARCH_LOADING_STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === stepIndex ? "w-7 bg-black" : "w-2 bg-[#d9cabd]"
              }`}
            />
          ))}
        </div>

        <p className="mt-5 text-xs text-[#9b8d82]">
          We are a brand–influencer collaboration platform, curating creators for your campaign.
        </p>
      </div>
    </div>
  );
}

function formatNumber(value?: number) {
  const num = Number(value || 0);
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function trimText(value?: string, limit = 150) {
  const text = String(value || "").trim();
  if (!text) return "No description available.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function maskEmail(value?: string) {
  const email = String(value || "").trim();
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@").pop() || "";
  const extensionMatch = domain.match(/\.[a-z]{2,}$/i);
  return `xxxxxxxx${extensionMatch?.[0] || ".com"}`;
}

function getSubs(creator?: YouTubeCreator | null) {
  return Number(creator?.subscribers || creator?.subscriberCount || 0);
}

function normalizeTier(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

function getCreatorTierValue(creator?: YouTubeCreator | null) {
  const direct = normalizeTier(creator?.creatorTier);
  if (direct) return direct;

  const subs = getSubs(creator);
  if (subs >= 1000000) return "mega";
  if (subs >= 500000) return "macro";
  if (subs >= 100000) return "mid-tier";
  if (subs >= 10000) return "micro";
  if (subs >= 1000) return "nano";
  return "";
}

function getTierDefinition(tier: string) {
  const selected = normalizeTier(tier);
  return SUBSCRIBER_TIERS.find(
    (item) => normalizeTier(item.value) === selected,
  );
}

function getTierLabelWithRange(tier: string) {
  const selected = getTierDefinition(tier);
  if (!selected) return tier || "Any tier";
  return `${selected.label} (${selected.rangeLabel})`;
}

function getCreatorTierLabel(creator?: YouTubeCreator | null) {
  const tierValue = getCreatorTierValue(creator);
  const tier = SUBSCRIBER_TIERS.find(
    (item) => normalizeTier(item.value) === normalizeTier(tierValue),
  );

  return tier?.label || creator?.creatorTier || tierValue || "";
}

function getListingTierText(creator: YouTubeCreator, selectedTier?: string) {
  const label = getCreatorTierLabel(creator);
  if (!label) return "";

  if (
    normalizeTier(selectedTier) &&
    !doesCreatorMatchSelectedTier(creator, selectedTier || "")
  ) {
    return `Other tier: ${label}`;
  }

  return label;
}

function getListingTierTextClass(creator: YouTubeCreator, selectedTier?: string) {
  if (
    normalizeTier(selectedTier) &&
    !doesCreatorMatchSelectedTier(creator, selectedTier || "")
  ) {
    return "text-[#8a8179]";
  }

  return "text-[#1f8f46]";
}

function doesCreatorMatchSelectedTier(creator: YouTubeCreator, tier: string) {
  const selectedTier = getTierDefinition(tier);
  if (!selectedTier) return true;

  const subscribers = getSubs(creator);
  const min = Number(selectedTier.minSubscribers || 0);
  const max =
    selectedTier.maxSubscribers === null
      ? null
      : Number(selectedTier.maxSubscribers);

  if (subscribers < min) return false;
  if (max !== null && subscribers >= max) return false;

  return true;
}

function normalizeCountryCode(value?: string | number | null) {
  return String(value || "").trim().toUpperCase();
}

function getCreatorActualCountryCode(creator: YouTubeCreator) {
  return normalizeCountryCode(creator.country);
}

function doesCreatorMatchSelectedCountry(
  creator: YouTubeCreator,
  country?: string,
) {
  const selectedCountry = normalizeCountryCode(country);
  if (!selectedCountry) return true;

  // Country filter must be exact. Do not use estimated audience country here,
  // otherwise US filter can still show channels with another/unknown channel country.
  return getCreatorActualCountryCode(creator) === selectedCountry;
}

function getCreatorsForSelectedFilters(
  creators: YouTubeCreator[],
  filters: Partial<Filters>,
) {
  const selectedTier = normalizeTier(filters.subscriberTier);
  const selectedCountry = normalizeCountryCode(filters.country);
  const sorted = sortCreatorsBySubscribersDesc(creators);

  const countryFiltered = selectedCountry
    ? sorted.filter((creator) =>
        doesCreatorMatchSelectedCountry(creator, selectedCountry),
      )
    : sorted;

  if (!selectedTier) return countryFiltered;

  const selectedTierCreators: YouTubeCreator[] = [];
  const otherTierCreators: YouTubeCreator[] = [];

  countryFiltered.forEach((creator) => {
    if (doesCreatorMatchSelectedTier(creator, selectedTier)) {
      selectedTierCreators.push(creator);
    } else {
      otherTierCreators.push(creator);
    }
  });

  return [...selectedTierCreators, ...otherTierCreators];
}

function sortCreatorsBySubscribersDesc(creators: YouTubeCreator[]) {
  return [...creators].sort((a, b) => {
    const aSubs = getSubs(a);
    const bSubs = getSubs(b);
    if (aSubs !== bSubs) return bSubs - aSubs;

    const aScore = Number(
      a.shortlist?.score ||
        a.scores?.shortlistScore ||
        a.scores?.relevancyScore ||
        0,
    );
    const bScore = Number(
      b.shortlist?.score ||
        b.scores?.shortlistScore ||
        b.scores?.relevancyScore ||
        0,
    );
    return bScore - aScore;
  });
}

function sortCreatorsForSelectedFilters(
  creators: YouTubeCreator[],
  filters: Partial<Filters>,
) {
  return getCreatorsForSelectedFilters(creators, filters);
}

function buildCleanParams(
  filters: Partial<Filters> & Record<string, unknown>,
  campaignId?: string,
) {
  const params = new URLSearchParams();
  const finalFilters: Record<string, unknown> = {
    ...filters,
    ...(campaignId ? { campaignId } : {}),
  };

  allowedParams.forEach((key) => {
    const value = finalFilters[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });

  return params;
}

async function fetchYouTubeCreators(
  filters: Partial<Filters> & Record<string, unknown>,
  campaignId?: string,
) {
  const params = buildCleanParams(filters, campaignId);
  const res = await fetch(
    getApiUrl(`/youtube-data/creators?${params.toString()}`),
    {
      method: "GET",
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to load YouTube creators");
  }
  return data;
}

function hasSearchCriteria(
  filters: Partial<Filters> & Record<string, unknown>,
  campaignId?: string,
) {
  return Boolean(
    String(filters.keyword || "").trim() ||
    String(filters.category || "").trim() ||
    String(filters.subscriberTier || "").trim() ||
    String(filters.country || "").trim() ||
    String(filters.minAvgViews || "").trim() ||
    String(filters.minEngagement || "").trim() ||
    String(campaignId || "").trim(),
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f1e8df] py-3 last:border-b-0">
      <span className="text-sm font-medium text-[#8a8179]">{label}</span>
      <span className="max-w-[70%] text-right text-sm font-semibold text-black">
        {value || "-"}
      </span>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value?: number }) {
  const finalValue = Number(value || 0);
  return (
    <div className="rounded-[14px] border border-[#eee5da] bg-[#fffdfa] px-4 py-3">
      <p className="text-xs font-semibold text-[#9a928b]">{label}</p>
      <p className="mt-1 text-lg font-bold text-black">{finalValue}%</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#eee5da] bg-white p-4">
      <p className="text-xs font-semibold text-[#a69d95]">{label}</p>
      <p className="mt-2 text-[20px] font-semibold text-black">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#9a928b]">{sub}</p> : null}
    </div>
  );
}

function MediaKitDrawer({
  creator,
  open,
  onClose,
}: {
  creator: YouTubeCreator | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !creator) return null;

  const videos = creator.recentVideoTitles || [];
  const description = creator.channelDescription || creator.description;
  const emails = creator.contact?.totalEmails || [];
  const maskedEmails = Array.from(new Set(emails.map(maskEmail).filter(Boolean)));
  const website = String(creator.contact?.website || "").trim();
  const socialLinks = [
    creator.contact?.instagram,
    creator.contact?.twitter,
    creator.contact?.facebook,
    creator.contact?.linkedin,
    ...(creator.contact?.otherSocials || []),
  ].filter(Boolean) as string[];
  const uniqueSocialLinks = Array.from(new Set(socialLinks));
  const hasContactInfo = Boolean(
    maskedEmails.length || website || uniqueSocialLinks.length,
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/25" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[780px] overflow-y-auto bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee5da] bg-white px-7 py-5">
          <div>
            <p className="text-sm font-semibold text-[#8d837b]">
              Influencer media kit
            </p>
            <h2 className="text-[24px] font-semibold text-black">
              {creator.channelName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f0ea]"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        <div className="px-7 py-7">
          <div className="flex items-start gap-5">
            <AvatarImage
              src={creator.thumbnail}
              name={creator.channelName}
              className="h-24 w-24 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[28px] font-bold text-black">
                  {creator.channelName}
                </h3>
                <span className="rounded-full bg-[#ecfff1] px-3 py-1 text-xs font-semibold text-[#1aa34a]">
                  Active
                </span>
              </div>
              <p className="mt-1 text-sm text-[#8a8179]">
                {creator.creatorTier ||
                  getCreatorTierValue(creator) ||
                  "Creator"}{" "}
                · {creator.category || creator.channelCategory || "YouTube"} ·{" "}
                {creator.primaryLanguage || "Language unknown"}
              </p>
              <p className="mt-1 text-sm text-[#8a8179]">
                {creator.estimatedAudienceCountry ||
                  creator.country ||
                  "Audience country unknown"}
                {creator.scores?.audienceCountryConfidence
                  ? ` · ${creator.scores.audienceCountryConfidence}% country confidence`
                  : ""}
              </p>
              <p className="mt-5 text-sm leading-6 text-[#827970]">
                {trimText(description, 360)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                  Connect With Influencer
                </button>
                {maskEmail(creator.contact?.youtubeAboutEmail) ? (
                  <span className="rounded-xl border border-[#e4d8cc] bg-white px-5 py-3 text-sm font-semibold text-black">
                    {maskEmail(creator.contact?.youtubeAboutEmail)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <InfoCard
              label="Subscribers"
              value={formatNumber(getSubs(creator))}
            />
            <InfoCard
              label="Total views"
              value={formatNumber(
                creator.totalViews || creator.totalLifetimeViews,
              )}
            />
            <InfoCard
              label="Total videos"
              value={formatNumber(
                creator.totalVideos || creator.totalLifetimeVideos,
              )}
            />
            <InfoCard
              label="Years on YouTube"
              value={creator.yearsOnYouTube || "-"}
            />
            <InfoCard
              label="Avg views"
              value={formatNumber(creator.avgViews)}
              sub="recent sample"
            />
            <InfoCard
              label="Avg likes"
              value={formatNumber(creator.avgLikes)}
              sub="recent sample"
            />
            <InfoCard
              label="Avg comments"
              value={formatNumber(creator.avgComments)}
              sub="recent sample"
            />
            <InfoCard
              label="Engagement"
              value={`${creator.engagementRate || 0}%`}
              sub="likes + comments / views"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5">
            <div className="rounded-[20px] border border-[#eee5da] bg-white p-5">
              <h4 className="text-[18px] font-semibold text-black">
                Creator overview
              </h4>
              <div className="mt-3">
                <FieldRow
                  label="Category"
                  value={creator.category || creator.channelCategory || "-"}
                />
                <FieldRow
                  label="Content flag"
                  value={creator.contentFlag || "Original"}
                />
                <FieldRow
                  label="Created date"
                  value={formatDate(creator.channelCreatedDate)}
                />
                <FieldRow
                  label="Recent upload"
                  value={formatDate(creator.recentUploadDate)}
                />
                <FieldRow
                  label="Videos last 90 days"
                  value={creator.totalVideosLast90Days ?? "-"}
                />
                <FieldRow
                  label="Videos last 2 years"
                  value={creator.totalVideosLast2Years ?? "-"}
                />
                <FieldRow
                  label="Activity lookback"
                  value={
                    creator.activityLookbackDays
                      ? `${creator.activityLookbackDays} days`
                      : "-"
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-[#eee5da] bg-white p-5">
            <h4 className="text-[18px] font-semibold text-black">
              All available scores
            </h4>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <ScorePill
                label="Sponsorship"
                value={creator.scores?.sponsorshipScore}
              />
              <ScorePill
                label="Engagement"
                value={creator.scores?.engagementScore}
              />
              <ScorePill
                label="Consistency"
                value={creator.scores?.consistencyScore}
              />
              <ScorePill
                label="Brand safety"
                value={creator.scores?.brandSafetyScore}
              />
              <ScorePill
                label="Relevancy"
                value={creator.scores?.relevancyScore}
              />
              <ScorePill
                label="Authenticity"
                value={creator.scores?.authenticityScore}
              />
              <ScorePill
                label="Audience confidence"
                value={creator.scores?.audienceCountryConfidence}
              />
              <ScorePill
                label="Shortlist"
                value={
                  creator.scores?.shortlistScore || creator.shortlist?.score
                }
              />
            </div>
          </div>

          {hasContactInfo ? (
            <div className="mt-5 rounded-[20px] border border-[#eee5da] bg-white p-5">
              <h4 className="text-[18px] font-semibold text-black">
                Contact information
              </h4>
              <div className="mt-4 grid gap-3 text-sm text-[#6f665f]">
                {maskedEmails.length ? (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4" />
                    {maskedEmails.join(", ")}
                  </div>
                ) : null}
                {website ? (
                  <div className="flex items-center gap-3 break-all">
                    <Globe className="h-4 w-4 shrink-0" />
                    {website}
                  </div>
                ) : null}
                {uniqueSocialLinks.length ? (
                  <div className="flex items-start gap-3">
                    <Youtube className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-all">
                      {uniqueSocialLinks.join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <h4 className="text-[22px] font-semibold text-black">
              Recent Posts
            </h4>
            {videos.length === 0 ? (
              <div className="mt-4 rounded-[20px] border border-[#eee5da] px-5 py-10 text-center text-[#777]">
                No recent video data available.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-5">
                {videos.slice(0, 8).map((video) => (
                  <div
                    key={video.videoId || video.title}
                    className="overflow-hidden rounded-[20px] border border-[#eee5da] bg-white shadow-sm"
                  >
                    <div className="aspect-video bg-[#f4f0ea]">
                      <VideoThumbnail
                        src={video.thumbnail}
                        title={video.title}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-[#8a8179]">
                        <span>{formatNumber(video.views)} views</span>
                        <span>{formatNumber(video.likes)} likes</span>
                        <span>{formatNumber(video.comments)} comments</span>
                      </div>
                      <h5 className="mt-3 line-clamp-2 text-sm font-semibold text-black">
                        {video.title || "Untitled video"}
                      </h5>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#8a8179]">
                        {trimText(video.description, 110)}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#8a8179]">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(video.publishedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YouTubeBrowse() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") || "";

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [allCreators, setAllCreators] = useState<YouTubeCreator[]>([]);
  const [frontendPage, setFrontendPage] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<YouTubeCreator | null>(
    null,
  );
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const tierDropdownRef = useRef<HTMLDivElement | null>(null);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.subscriberTier) count += 1;
    if (filters.country) count += 1;
    if (filters.minAvgViews) count += 1;
    if (filters.minEngagement) count += 1;
    return count;
  }, [filters]);

  const sortedCreators = useMemo(
    () => sortCreatorsForSelectedFilters(allCreators, filters),
    [allCreators, filters.subscriberTier, filters.country, filters.sort],
  );

  const frontendTotalPages = Math.max(
    1,
    Math.ceil(sortedCreators.length / FRONTEND_PAGE_SIZE),
  );
  const currentPage = Math.min(frontendPage, frontendTotalPages);
  const creators = sortedCreators.slice(
    (currentPage - 1) * FRONTEND_PAGE_SIZE,
    currentPage * FRONTEND_PAGE_SIZE,
  );

  async function loadCreators(nextFilters: Partial<Filters> = filters) {
    try {
      setLoading(true);
      setError("");
      setWarning("");
      setFrontendPage(1);

      const response = await fetchYouTubeCreators(
        {
          ...filters,
          ...nextFilters,
          page: 1,
          limit: DISCOVERY_FETCH_LIMIT,
          frontendPagination: true,
        },
        campaignId,
      );

      const fetchedCreators = Array.isArray(response.data) ? response.data : [];
      setAllCreators(fetchedCreators);
      setWarning(response.warning || "");
    } catch (err: any) {
      setAllCreators([]);
      setError(err?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideDropdown = [
        categoryDropdownRef.current,
        filterDropdownRef.current,
        tierDropdownRef.current,
      ].some((node) => node?.contains(target));

      if (!clickedInsideDropdown) {
        setShowCategoryDropdown(false);
        setShowMoreFilters(false);
        setShowTierDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  function handleSearch() {
    const next = { ...filters, page: 1, limit: DISCOVERY_FETCH_LIMIT };

    if (!hasSearchCriteria(next, campaignId)) {
      setFilters(next);
      setAllCreators([]);
      setFrontendPage(1);
      setWarning("");
      setError("");
      return;
    }

    setFilters(next);
    loadCreators(next);
  }

  function handleClearFilters() {
    const next = {
      ...filters,
      subscriberTier: "",
      country: "",
      minSubscribers: "",
      maxSubscribers: "",
      minAvgViews: "",
      minEngagement: "",
      page: 1,
      limit: FRONTEND_PAGE_SIZE,
    };
    setFilters(next);
  }

  function handleResetAll() {
    setFilters(defaultFilters);
    setAllCreators([]);
    setFrontendPage(1);
    setShowMoreFilters(false);
    setShowCategoryDropdown(false);
    setShowTierDropdown(false);
    setWarning("");
    setError("");
  }

  function handleTierChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      subscriberTier: value,
      minSubscribers: "",
      maxSubscribers: "",
      page: 1,
      limit: FRONTEND_PAGE_SIZE,
    }));
  }

  function handleCategorySelect(value: string) {
    updateFilter("category", value);
    setShowCategoryDropdown(false);
  }

  function handleTierSelect(value: string) {
    handleTierChange(value);
    setShowTierDropdown(false);
  }

  function goToPage(page: number) {
    const nextPage = Math.max(1, Math.min(page, frontendTotalPages));
    setFrontendPage(nextPage);
  }

  return (
    <div className="min-h-screen bg-white px-6 py-5 text-black">
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold">Browse influencer</h1>
      </div>

      <div className="rounded-[22px] border border-[#e6d9cc] bg-white px-5 py-4 shadow-sm">
        <div className="flex w-full items-center gap-3">
          <div className="flex h-[52px] flex-1 items-center rounded-full border border-[#e4d8cc] bg-white px-5 shadow-sm">
            <Search className="mr-3 h-5 w-5 text-[#777]" />
            <input
              value={filters.keyword}
              onChange={(e) => updateFilter("keyword", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search creators, keywords, niches, or topics"
              className="h-full flex-1 bg-transparent text-[16px] text-black outline-none placeholder:text-[#8a8a8a]"
            />
          </div>

          <div ref={categoryDropdownRef} className="relative min-w-[230px]">
            <button
              type="button"
              onClick={() => {
                setShowCategoryDropdown((prev) => !prev);
                setShowMoreFilters(false);
                setShowTierDropdown(false);
              }}
              className="flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-[#e4d8cc] bg-white px-5 text-[15px] font-medium text-black shadow-sm outline-none"
            >
              <span className="max-w-[170px] truncate">
                {filters.category || "All categories"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${
                  showCategoryDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showCategoryDropdown && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[90] w-[300px] overflow-hidden rounded-[18px] border border-[#e6d9cc] bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("")}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-[#faf6f1] ${
                    !filters.category
                      ? "bg-[#f7efe6] text-black"
                      : "text-[#555]"
                  }`}
                >
                  All categories
                  {!filters.category && (
                    <span className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                      Selected
                    </span>
                  )}
                </button>

                <div className="max-h-[310px] overflow-y-auto py-1">
                  {YOUTUBE_CATEGORIES.map((category) => {
                    const selected = filters.category === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#faf6f1] ${
                          selected
                            ? "bg-[#f7efe6] font-semibold text-black"
                            : "text-[#555]"
                        }`}
                      >
                        <span className="truncate">{category}</span>
                        {selected && (
                          <span className="ml-3 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div ref={filterDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMoreFilters((prev) => !prev);
                setShowCategoryDropdown(false);
                setShowTierDropdown(false);
              }}
              className="flex h-[52px] min-w-[135px] items-center justify-center gap-2 rounded-full border border-[#e4d8cc] bg-white px-5 text-[16px] font-medium text-black shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[11px] text-white">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className="h-4 w-4" />
            </button>

            {showMoreFilters && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[560px] rounded-[22px] border border-[#e8ded2] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#eee5da] px-6 py-5">
                  <div>
                    <h3 className="text-[20px] font-semibold text-black">
                      Filter
                    </h3>
                    <p className="mt-1 text-sm text-[#777]">
                      Refine creators by tier, country, views, and engagement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMoreFilters(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0ea] text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-6 py-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-black">
                        Subscriber tier
                      </label>
                      <div ref={tierDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTierDropdown((prev) => !prev)}
                          className="flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#ddd] bg-white px-4 text-left text-sm text-black outline-none"
                        >
                          <span className="truncate">
                            {filters.subscriberTier
                              ? getTierLabelWithRange(filters.subscriberTier)
                              : "Any tier"}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition ${
                              showTierDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {showTierDropdown && (
                          <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-full overflow-hidden rounded-[16px] border border-[#e6d9cc] bg-white shadow-xl">
                            <button
                              type="button"
                              onClick={() => handleTierSelect("")}
                              className={`block w-full px-4 py-3 text-left text-sm hover:bg-[#faf6f1] ${
                                !filters.subscriberTier
                                  ? "bg-[#f7efe6] font-semibold text-black"
                                  : "text-[#555]"
                              }`}
                            >
                              Any tier
                            </button>

                            {SUBSCRIBER_TIERS.map((tier) => {
                              const selected =
                                filters.subscriberTier === tier.value;
                              return (
                                <button
                                  key={tier.value}
                                  type="button"
                                  onClick={() => handleTierSelect(tier.value)}
                                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-[#faf6f1] ${
                                    selected
                                      ? "bg-[#f7efe6] font-semibold text-black"
                                      : "text-[#555]"
                                  }`}
                                >
                                  {tier.label} ({tier.rangeLabel})
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-black">
                        Country
                      </label>
                      <input
                        value={filters.country}
                        onChange={(e) =>
                          updateFilter("country", e.target.value)
                        }
                        placeholder="US, IN, GB..."
                        className="h-12 w-full rounded-full border border-[#ddd] bg-white px-4 text-sm text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-black">
                        Min avg views
                      </label>
                      <input
                        type="number"
                        value={filters.minAvgViews}
                        onChange={(e) =>
                          updateFilter("minAvgViews", e.target.value)
                        }
                        placeholder="5000"
                        className="h-12 w-full rounded-full border border-[#ddd] bg-white px-4 text-sm text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-black">
                        Min engagement %
                      </label>
                      <input
                        type="number"
                        value={filters.minEngagement}
                        onChange={(e) =>
                          updateFilter("minEngagement", e.target.value)
                        }
                        placeholder="2"
                        className="h-12 w-full rounded-full border border-[#ddd] bg-white px-4 text-sm text-black outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="rounded-xl border border-[#ddd] bg-white px-5 py-2.5 text-sm font-medium text-black"
                    >
                      Reset all
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="rounded-xl border border-[#ddd] bg-white px-5 py-2.5 text-sm font-medium text-black"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreFilters(false);
                          handleSearch();
                        }}
                        className="rounded-xl bg-black px-7 py-2.5 text-sm font-medium text-white"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="h-[52px] min-w-[125px] rounded-full bg-black px-7 text-[16px] font-semibold text-white disabled:bg-[#d4d4d4] disabled:text-[#777]"
          >
            {loading ? "Searching" : "Search"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#e4d8cc] bg-[#faf7f2] px-3 py-1.5 text-[13px] text-[#6f6258]">
            Platforms: YouTube
          </span>
          {filters.category && (
            <span className="rounded-full border border-[#e4d8cc] bg-[#faf7f2] px-3 py-1.5 text-[13px] text-[#6f6258]">
              Category: {filters.category}
            </span>
          )}
          {filters.subscriberTier && (
            <span className="rounded-full border border-[#e4d8cc] bg-[#faf7f2] px-3 py-1.5 text-[13px] text-[#6f6258]">
              Tier: {getTierLabelWithRange(filters.subscriberTier)}
            </span>
          )}
        </div>
      </div>

      {warning && (
        <div className="mt-5 rounded-[18px] border border-[#f3d195] bg-[#fff8e8] px-5 py-3 text-[#946200]">
          {warning}
        </div>
      )}
      {error && (
        <div className="mt-5 rounded-[18px] border border-[#ff9ca3] bg-[#fff0f1] px-5 py-3 text-[#d91525]">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e6d9cc] bg-white">
        <div className="flex items-center justify-between border-b border-[#eee5da] px-6 py-4">
          <div>
            <h2 className="text-[20px] font-semibold text-black">
              YouTube creators
            </h2>
          </div>
        </div>

        {loading ? (
          <CreatorSearchLoader />
        ) : creators.length === 0 ? (
          <div className="px-6 py-14 text-center text-[#777]">
            {hasSearchCriteria(filters, campaignId)
              ? "No creators found. Try another keyword, change the tier, or clear filters."
              : "Enter a keyword or select a filter, then click Search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-[#faf7f2] text-left text-xs uppercase tracking-wide text-[#777]">
                  <th className="px-5 py-4">Creator</th>
                  <th className="px-5 py-4">Subscribers</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Country</th>
                  <th className="px-5 py-4">Avg views</th>
                  <th className="px-5 py-4">Engagement</th>
                  <th className="px-5 py-4">Recent upload</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator) => (
                  <tr
                    key={creator.channelId}
                    className="border-t border-[#f0e8df] text-sm text-black"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-[245px] items-center gap-3">
                        <AvatarImage
                          src={creator.thumbnail}
                          name={creator.channelName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">{creator.channelName}</p>
                          <p className="mt-1 text-xs text-[#777]">
                            {creator.primaryLanguage || "Language unknown"}
                          </p>
                          {getListingTierText(creator, filters.subscriberTier) ? (
                            <p
                              className={`mt-1 text-[11px] font-medium ${getListingTierTextClass(
                                creator,
                                filters.subscriberTier,
                              )}`}
                            >
                              {getListingTierText(
                                creator,
                                filters.subscriberTier,
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {formatNumber(getSubs(creator))}
                    </td>
                    <td className="px-5 py-4">
                      {creator.category || creator.channelCategory || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <p>
                        {creator.estimatedAudienceCountry ||
                          creator.country ||
                          "-"}
                      </p>
                      {creator.scores?.audienceCountryConfidence ? (
                        <p className="mt-1 text-xs text-[#777]">
                          {creator.scores.audienceCountryConfidence}% confidence
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {formatNumber(creator.avgViews)}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {creator.engagementRate || 0}%
                    </td>
                    <td className="px-5 py-4">
                      {formatDate(creator.recentUploadDate)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryDropdown(false);
                          setShowMoreFilters(false);
                          setShowTierDropdown(false);
                          setSelectedCreator(creator);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-[11px] font-semibold leading-none text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Media kit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#eee5da] px-6 py-5">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => goToPage(currentPage - 1)}
            className="rounded-xl border border-[#ddd] bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#777]">
            Page {currentPage} of {frontendTotalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= frontendTotalPages || loading}
            onClick={() => goToPage(currentPage + 1)}
            className="rounded-xl border border-[#ddd] bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <MediaKitDrawer
        creator={selectedCreator}
        open={Boolean(selectedCreator)}
        onClose={() => setSelectedCreator(null)}
      />
    </div>
  );
}
