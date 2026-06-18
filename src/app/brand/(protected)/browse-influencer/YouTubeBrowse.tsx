"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  Globe,
  Heart,
  Lock,
  Mail,
  PlayCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { DetailPanel } from "./DetailPanel";

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


type BrandMediaKitData = {
  creatorOverview?: {
    creatorName?: string;
    channelName?: string;
    profilePhoto?: string;
    category?: string;
    creatorTier?: string;
    primaryLanguage?: string;
    country?: string;
    estimatedAudienceCountry?: string;
    countryConfidence?: number;
    yearsOnYouTube?: number;
    activeSinceLabel?: string;
  };
  coreMetrics?: {
    subscribers?: number;
    totalViews?: number;
    totalVideos?: number;
    avgViews?: number;
    medianViews?: number;
    avgLikes?: number;
    avgComments?: number;
    engagementRate?: number;
    viewToSubscriberRatio?: number;
    recentUploadDate?: string;
    uploadsLast30Days?: number;
    uploadsLast90Days?: number;
    uploadsLast2Years?: number;
  };
  performanceScores?: {
    engagementScore?: number;
    consistencyScore?: number;
    authenticityScore?: number;
    brandSafetyScore?: number;
    sponsorshipScore?: number;
    relevancyScore?: number;
    campaignFitScore?: number;
    nicheFitScore?: number;
  };
  audienceInsights?: {
    estimatedAudienceCountries?: { country: string; percentage: number }[];
    interestCategories?: string[];
    contentLanguage?: string;
  };
  brandFit?: {
    matchedCampaignKeyword?: string;
    matchedTopics?: string[];
    campaignFit?: string;
    whyThisCreatorFits?: string[];
  };
  contentAnalysis?: {
    contentType?: string;
    uploadFrequency?: string;
    shortsPercentage?: number;
    longFormPercentage?: number;
    averageVideoLengthMinutes?: number | null;
    recentVideoThemes?: string[];
  };
  sponsorshipAnalysis?: {
    sponsoredVideosDetected?: number;
    sponsorshipFrequency?: number;
    recentSponsors?: string[];
    promoCodeMentions?: number;
    affiliateLinksDetected?: boolean;
    collaborationReadiness?: string;
  };
  brandSafety?: {
    score?: number;
    riskLevel?: string;
    flags?: string[];
    safeCategories?: string[];
  };
  topPerformingVideos?: RecentVideo[];
  recentVideos?: RecentVideo[];
  campaignPrediction?: {
    expectedViewsLow?: number;
    expectedViewsHigh?: number;
    expectedEngagementLow?: number;
    expectedEngagementHigh?: number;
    recommendedDeliverables?: string[];
    budgetFit?: string;
  };
  contact?: {
    hasContactInfo?: boolean;
    maskedEmail?: string;
    website?: string;
    socialLinks?: { platform: string; url: string }[];
  };
  collabGlamRecommendation?: {
    recommendation?: string;
    summary?: string;
  };
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

function getRuntimeApiBaseUrl() {
  const explicit = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (explicit) return explicit;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }

    return window.location.origin;
  }

  return "http://localhost:8000";
}

const API_BASE_URL = getRuntimeApiBaseUrl();

const FRONTEND_PAGE_SIZE = 25;
const DISCOVERY_FETCH_LIMIT = 100;
const BROWSE_MIN_RESULTS = 50;
const BROWSE_POLL_DELAY_MS = 4500;
const BROWSE_MAX_POLLS = 8;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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

const BROWSE_STATE_CACHE_KEY = "collabglam.youtubeBrowseState.v1";
const BROWSE_STATE_TTL_MS = 30 * 60 * 1000;

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
  "fast",
  "background",
  "nonBlocking",
  "forceBackground",
  "minimumResults",
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


const DEFAULT_CAMPAIGN_LOADING_BACKGROUNDS = ["🎥", "🎯", "🤝", "📊", "✨", "🔍"];

function getCampaignLoadingBackgrounds(topic?: string) {
  const value = String(topic || "").toLowerCase();

  if (/drone|camera|gopro|video|film|photo|vlog/.test(value)) {
    return ["🚁", "📹", "🎬", "📡", "🛰️", "✨"];
  }

  if (/beauty|makeup|skin|hair|fashion|style|glam/.test(value)) {
    return ["💄", "✨", "👜", "👗", "💅", "🌟"];
  }

  if (/tech|phone|mobile|app|ai|gadget|software|laptop/.test(value)) {
    return ["💻", "📱", "⚡", "🤖", "🎧", "🔍"];
  }

  if (/food|kitchen|coffee|recipe|restaurant|snack/.test(value)) {
    return ["🍽️", "☕", "🥗", "🍳", "🛒", "✨"];
  }

  if (/fitness|gym|health|sport|wellness|yoga/.test(value)) {
    return ["🏋️", "💪", "🧘", "⌚", "🥤", "⚡"];
  }

  if (/home|decor|clean|diy|tool|garden|cleaner/.test(value)) {
    return ["🏠", "🛠️", "🧼", "🪴", "📦", "✨"];
  }

  return DEFAULT_CAMPAIGN_LOADING_BACKGROUNDS;
}

function getCreatorSearchLoadingMessages(topicLabel: string) {
  return [
    `Hold on, we are searching creators for ${topicLabel}.`,
    "Scanning YouTube channels and creator signals.",
    "Checking recent uploads and audience authenticity.",
    "Matching tier, country, and campaign relevance.",
    "Filtering creators with stronger brand fit.",
    "Almost ready — polishing your creator shortlist.",
  ];
}

function CreatorSearchLoader({ topic }: { topic?: string }) {
  const backgrounds = useMemo(() => getCampaignLoadingBackgrounds(topic), [topic]);
  const topicLabel = String(topic || "your campaign").trim() || "your campaign";
  const messages = useMemo(() => getCreatorSearchLoadingMessages(topicLabel), [topicLabel]);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBackgroundIndex((current) => (current + 1) % backgrounds.length);
    }, 950);

    return () => window.clearInterval(timer);
  }, [backgrounds.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 1850);

    return () => window.clearInterval(timer);
  }, [messages.length]);

  const activeBackground = backgrounds[backgroundIndex] || "✨";
  const activeMessage = messages[messageIndex] || messages[0];

  return (
    <div className="px-6 py-20 text-center">
      <style jsx global>{`
        @keyframes cgStaticMagnifierFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-3px) scale(1.015);
          }
        }

        @keyframes cgStaticMagnifierScan {
          0% {
            transform: translateX(-108px);
            opacity: 0;
          }
          15% {
            opacity: 0.75;
          }
          85% {
            opacity: 0.75;
          }
          100% {
            transform: translateX(108px);
            opacity: 0;
          }
        }

        @keyframes cgStaticMagnifierGlow {
          0%, 100% {
            opacity: 0.28;
            transform: scale(0.94);
          }
          50% {
            opacity: 0.48;
            transform: scale(1.08);
          }
        }

        @keyframes cgLoaderTextFade {
          0% {
            opacity: 0;
            transform: translateY(5px);
          }
          18%, 82% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px);
          }
        }
      `}</style>

      <div className="mx-auto flex min-h-[270px] max-w-[760px] flex-col items-center justify-center">
        <div className="relative mb-8 h-[150px] w-[260px]">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#c9cbc9] to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-[126px] w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e5e7e5] shadow-[0_18px_45px_rgba(0,0,0,0.12)]" />
          <div
            className="absolute left-1/2 top-1/2 h-[146px] w-[146px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eef0ee]"
            style={{ animation: "cgStaticMagnifierGlow 1.8s ease-in-out infinite" }}
          />

          <div
            className="absolute left-1/2 top-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-[#d7dad7] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
            style={{ animation: "cgStaticMagnifierFloat 1.7s ease-in-out infinite" }}
          >
            <div className="absolute inset-0 grid place-items-center text-[56px] opacity-[0.14] transition-all duration-500">
              <span key={activeBackground}>{activeBackground}</span>
            </div>

            <div className="absolute left-1/2 top-1/2 h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dfe1df] bg-[#f7f8f7]/86" />

            <div className="absolute left-1/2 top-1/2 h-[78px] w-[1px] -translate-y-1/2 bg-[#9ea29e]/70 shadow-[0_0_18px_rgba(120,124,120,0.36)]" style={{ animation: "cgStaticMagnifierScan 1.55s ease-in-out infinite" }} />

            <Search className="absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 text-[#7b807b]" strokeWidth={2.2} />
          </div>

          <span className="absolute left-[calc(50%+34px)] top-[calc(50%+38px)] h-[46px] w-[10px] rotate-[-45deg] rounded-full bg-[#7b807b] shadow-[0_8px_16px_rgba(0,0,0,0.12)]" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a907f]">
          CollabGlam discovery engine
        </p>
        <h3 className="mt-3 text-[22px] font-semibold text-black">
          Finding creators for {topicLabel}
        </h3>
        <p
          key={messageIndex}
          className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-[#71685c]"
          style={{ animation: "cgLoaderTextFade 1.85s ease-in-out both" }}
        >
          {activeMessage}
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

function getCreatorAuthenticityScore(creator: YouTubeCreator) {
  const candidates = [
    (creator as any).audienceAuthenticity,
    (creator as any).authenticityScore,
    creator.scores?.authenticityScore,
    (creator as any).stats?.authenticityScore,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) {
      return Math.max(0, Math.min(100, Math.round(value)));
    }
  }

  return null;
}

function getAuthenticityColorClass(value: number | null) {
  if (value === null) return "text-[#111111]";
  if (value >= 75) return "text-[#16803a]";
  if (value >= 35) return "text-[#b7791f]";
  return "text-[#dc2626]";
}

function trimText(value?: string, limit = 150) {
  const text = String(value || "").trim();
  if (!text) return "No description available.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
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


async function fetchBrandMediaKit(
  channelId: string,
  filters: Partial<Filters> = {},
) {
  const params = new URLSearchParams();
  ["keyword", "category", "country"].forEach((key) => {
    const value = (filters as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(getApiUrl(`/youtube-data/media-kit/${channelId}${query}`), {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to load media kit");
  }

  return data.data as BrandMediaKitData;
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

function scoreOrZero(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatPercent(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100) / 100}%`;
}

function getTopScoreLabel(score?: number) {
  const value = scoreOrZero(score);
  if (value >= 85) return "Strong Match";
  if (value >= 70) return "Good Match";
  if (value >= 55) return "Moderate Match";
  return "Needs Review";
}


function getBrandIdFromStorage() {
  if (typeof window === "undefined") return "";

  return String(
    window.localStorage.getItem("brandId") ||
      window.localStorage.getItem("brand_id") ||
      window.localStorage.getItem("brandMongoId") ||
      "",
  ).trim();
}

function getYouTubeInviteHandle(creator?: YouTubeCreator | null) {
  const value = String(
    creator?.channelId ||
      (creator as any)?.youtubeChannelId ||
      creator?.channelName ||
      "",
  )
    .replace(/^@/, "")
    .replace(/\s+/g, "")
    .trim();

  return value || null;
}

function buildFallbackYouTubeCreator(channelId: string): YouTubeCreator {
  return {
    channelId,
    channelName: channelId,
  };
}

function buildDetailPanelRawFromYouTubeCreator(creator?: YouTubeCreator | null) {
  if (!creator) return null;

  const channelId = String(creator.channelId || "").trim();
  const safeHandle = getYouTubeInviteHandle(creator) || channelId;
  const channelName = String(creator.channelName || safeHandle || "Creator").trim();
  const subscribers = getSubs(creator);

  return {
    channelId,
    userId: channelId,
    platform: "youtube",
    profile: {
      channelId,
      userId: channelId,
      modashId: channelId,
      username: safeHandle,
      handle: safeHandle,
      fullname: channelName,
      name: channelName,
      picture: creator.thumbnail,
      url: creator.channelUrl,
      provider: "youtube",
      followers: subscribers,
      subscribers,
      avgViews: creator.avgViews,
      averageViews: creator.avgViews,
      avgLikes: creator.avgLikes,
      avgComments: creator.avgComments,
      engagementRate: creator.engagementRate,
      country: creator.country || creator.estimatedAudienceCountry,
      language: creator.primaryLanguage ? { name: creator.primaryLanguage } : undefined,
      bio: creator.description || creator.channelDescription,
      postsCount: creator.totalVideos || creator.totalLifetimeVideos,
      stats: {
        followers: { value: subscribers },
        avgViews: { value: creator.avgViews },
        avgLikes: { value: creator.avgLikes },
        avgComments: { value: creator.avgComments },
      },
      audience: {
        geoCountries: creator.estimatedAudienceCountry
          ? [{ name: creator.estimatedAudienceCountry, weight: 1 }]
          : [],
        languages: creator.primaryLanguage
          ? [{ code: creator.primaryLanguage, weight: 1 }]
          : [],
        interests: Array.isArray(creator.channelTags)
          ? creator.channelTags.map((name) => ({ name, weight: 1 }))
          : [],
        credibility: Number(creator.scores?.authenticityScore || 0) / 100,
      },
      recentPosts: Array.isArray(creator.recentVideoTitles)
        ? creator.recentVideoTitles.map((video) => ({
            title: video.title,
            text: video.description || video.title,
            thumbnail: video.thumbnail,
            image: video.thumbnail,
            url: video.url,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            publishedAt: video.publishedAt,
            createdAt: video.publishedAt,
          }))
        : [],
      popularPosts: [],
      sponsoredPosts: [],
    },
  };
}

function MiniStatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#f1e2c2] bg-white/95 p-4 shadow-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
        {icon}
      </div>
      <p className="text-xs font-semibold text-[#9a8a73]">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-black">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#8b806f]">{sub}</p> : null}
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="min-w-[150px] rounded-[18px] border border-[#f1e2c2] bg-white px-4 py-4 text-center shadow-sm">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
        {icon}
      </div>
      <p className="text-[22px] font-bold text-black">{scoreOrZero(value)}</p>
      <p className="mt-1 text-xs font-medium text-[#8c8171]">{label}</p>
    </div>
  );
}

function YellowProgress({ value }: { value?: number }) {
  const finalValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#f1e2c2]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#facc15]"
        style={{ width: `${finalValue}%` }}
      />
    </div>
  );
}

function KitSection({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[22px] border border-[#f1e2c2] bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        {icon ? <span className="text-[#b7791f]">{icon}</span> : null}
        <h4 className="text-[17px] font-bold text-black">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#efdba5] bg-[#fff8e6] px-3 py-1 text-xs font-semibold text-[#7a5a16]">
      {children}
    </span>
  );
}

function MediaKitDrawer({
  creator,
  open,
  onClose,
  filters,
}: {
  creator: YouTubeCreator | null;
  open: boolean;
  onClose: () => void;
  filters: Filters;
}) {
  const [mediaKit, setMediaKit] = useState<BrandMediaKitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMediaKit() {
      if (!open || !creator?.channelId) return;
      try {
        setLoading(true);
        setError("");
        const data = await fetchBrandMediaKit(creator.channelId, filters);
        if (mounted) setMediaKit(data);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load media kit");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMediaKit();

    return () => {
      mounted = false;
    };
  }, [open, creator?.channelId, filters.keyword, filters.category, filters.country]);

  useEffect(() => {
    if (!open) {
      setMediaKit(null);
      setError("");
    }
  }, [open]);

  if (!open || !creator) return null;

  const overview = mediaKit?.creatorOverview;
  const metrics = mediaKit?.coreMetrics;
  const scores = mediaKit?.performanceScores;
  const audience = mediaKit?.audienceInsights;
  const brandFit = mediaKit?.brandFit;
  const content = mediaKit?.contentAnalysis;
  const sponsorship = mediaKit?.sponsorshipAnalysis;
  const safety = mediaKit?.brandSafety;
  const prediction = mediaKit?.campaignPrediction;
  const contact = mediaKit?.contact;
  const recommendation = mediaKit?.collabGlamRecommendation;
  const topVideos = mediaKit?.topPerformingVideos || [];
  const fitScore = scoreOrZero(scores?.campaignFitScore || scores?.relevancyScore);
  const hasContact = Boolean(
    contact?.hasContactInfo &&
      (contact?.maskedEmail || contact?.website || (contact?.socialLinks || []).length),
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/35" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[940px] overflow-y-auto bg-[#fffdf7] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#f1e2c2] bg-[#fffdf7]/95 px-7 py-5 backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-[#9a7a38]">Influencer media kit</p>
            <h2 className="text-[24px] font-bold text-black">
              {overview?.creatorName || creator.channelName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff3d5] text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-7 py-20">
            <div className="mx-auto max-w-[520px] rounded-[28px] border border-[#f1e2c2] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-black">Building brand-ready media kit</h3>
              <p className="mt-2 text-sm leading-6 text-[#7d725f]">
                We’re preparing performance, audience, brand-fit, safety, and prediction insights for this creator.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="m-7 rounded-[18px] border border-[#fecaca] bg-[#fff1f2] px-5 py-4 text-[#b91c1c]">
            {error}
          </div>
        ) : mediaKit ? (
          <div className="px-7 py-7">
            <section className="overflow-hidden rounded-[26px] border border-[#f1dca6] bg-gradient-to-br from-[#2b1b05] via-[#6f4304] to-[#f2b84b] p-6 text-white shadow-[0_22px_80px_rgba(124,74,16,0.22)]">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <AvatarImage
                    src={overview?.profilePhoto || creator.thumbnail}
                    name={overview?.creatorName || creator.channelName}
                    className="h-24 w-24 rounded-full border-4 border-white/20 object-cover"
                  />
                  <div>
                    <h3 className="text-[32px] font-black leading-tight">
                      {overview?.creatorName || creator.channelName}
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      {overview?.creatorTier || getCreatorTierLabel(creator)} · {overview?.category || creator.category || creator.channelCategory || "YouTube Creator"} · {overview?.primaryLanguage || creator.primaryLanguage || "Language unknown"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{overview?.estimatedAudienceCountry || overview?.country || creator.country || "Audience unknown"}</span>
                      {overview?.activeSinceLabel ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{overview.activeSinceLabel}</span> : null}
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">YouTube</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center rounded-[24px] bg-white/12 px-7 py-5 backdrop-blur">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-[#facc15] bg-black/20 text-2xl font-black">
                    {fitScore}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/75">Campaign fit</p>
                  <span className="mt-2 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
                    {getTopScoreLabel(fitScore)}
                  </span>
                </div>
              </div>
            </section>

            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              <ScoreCard icon={<Heart className="h-4 w-4" />} label="Engagement" value={scores?.engagementScore} />
              <ScoreCard icon={<Users className="h-4 w-4" />} label="Country Confidence" value={overview?.countryConfidence} />
              <ScoreCard icon={<BadgeCheck className="h-4 w-4" />} label="Authenticity" value={scores?.authenticityScore} />
              <ScoreCard icon={<ShieldCheck className="h-4 w-4" />} label="Brand Safety" value={scores?.brandSafetyScore} />
              <ScoreCard icon={<Award className="h-4 w-4" />} label="Sponsorship" value={scores?.sponsorshipScore} />
              <ScoreCard icon={<Target className="h-4 w-4" />} label="Campaign Fit" value={scores?.campaignFitScore} />
            </div>

            <KitSection title="Who Watches This Creator" icon={<Users className="h-5 w-5" />} className="mt-5">
              <div className="grid gap-6 md:grid-cols-[1.2fr_1fr_0.8fr]">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">Top audience countries</p>
                  <div className="space-y-3">
                    {(audience?.estimatedAudienceCountries || []).slice(0, 4).map((item) => (
                      <div key={item.country}>
                        <div className="mb-1 flex justify-between text-xs font-semibold text-[#6d6255]">
                          <span>{item.country}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <YellowProgress value={item.percentage} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">What they care about</p>
                  <div className="flex flex-wrap gap-2">
                    {(audience?.interestCategories || []).slice(0, 10).map((topic) => (
                      <Pill key={topic}>{topic}</Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">Content language</p>
                  <div className="rounded-[18px] bg-[#fff8e6] p-4">
                    <p className="text-sm font-bold text-black">{audience?.contentLanguage || overview?.primaryLanguage || "Unknown"}</p>
                  </div>
                </div>
              </div>
            </KitSection>

            <KitSection title="Reach & Consistency" icon={<TrendingUp className="h-5 w-5" />} className="mt-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MiniStatCard icon={<Users className="h-4 w-4" />} label="Subscribers" value={formatNumber(metrics?.subscribers)} />
                <MiniStatCard icon={<Eye className="h-4 w-4" />} label="Average views" value={formatNumber(metrics?.avgViews)} />
                <MiniStatCard icon={<BarChart3 className="h-4 w-4" />} label="Median views" value={formatNumber(metrics?.medianViews)} />
                <MiniStatCard icon={<Heart className="h-4 w-4" />} label="Engagement rate" value={formatPercent(metrics?.engagementRate)} />
                <MiniStatCard icon={<TrendingUp className="h-4 w-4" />} label="View/subscriber" value={formatPercent(metrics?.viewToSubscriberRatio)} />
                <MiniStatCard icon={<CalendarDays className="h-4 w-4" />} label="Uploads 30 days" value={metrics?.uploadsLast30Days || 0} />
                <MiniStatCard icon={<CalendarDays className="h-4 w-4" />} label="Uploads 90 days" value={metrics?.uploadsLast90Days || 0} />
                <MiniStatCard icon={<Zap className="h-4 w-4" />} label="Upload frequency" value={content?.uploadFrequency || "Unknown"} />
              </div>
            </KitSection>

            <KitSection title="Our Recommendation" icon={<Sparkles className="h-5 w-5" />} className="mt-5 bg-[#fff8e6]">
              <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {recommendation?.recommendation || brandFit?.campaignFit || "Recommended"}
                  </span>
                  <p className="mt-4 text-sm leading-6 text-[#6f6658]">{recommendation?.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(brandFit?.matchedTopics || []).slice(0, 6).map((topic) => (
                      <Pill key={topic}>{topic}</Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">Why we recommend</p>
                  <div className="space-y-2">
                    {(brandFit?.whyThisCreatorFits || []).map((reason) => (
                      <div key={reason} className="flex items-start gap-2 text-sm text-[#4f463d]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#16a34a]" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </KitSection>

            <KitSection title="Content Breakdown" icon={<PlayCircle className="h-5 w-5" />} className="mt-5">
              <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="relative flex h-36 w-36 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#f59e0b ${content?.shortsPercentage || 0}%, #fef3c7 0)`,
                    }}
                  >
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center">
                      <span className="text-2xl font-black text-black">{content?.shortsPercentage || 0}%</span>
                      <span className="text-xs text-[#8b806f]">Shorts est.</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-[#7d725f]">
                    <span>Long-form {content?.longFormPercentage || 0}%</span>
                    <span>Shorts {content?.shortsPercentage || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">Recent video themes</p>
                  <div className="flex flex-wrap gap-2">
                    {(content?.recentVideoThemes || []).slice(0, 12).map((theme) => (
                      <Pill key={theme}>{theme}</Pill>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MiniStatCard icon={<PlayCircle className="h-4 w-4" />} label="Content type" value={content?.contentType || "Mixed"} />
                    <MiniStatCard icon={<CalendarDays className="h-4 w-4" />} label="Recent upload" value={formatDate(metrics?.recentUploadDate)} />
                  </div>
                </div>
              </div>
            </KitSection>

            <KitSection title="Brand Partnership Track Record" icon={<Award className="h-5 w-5" />} className="mt-5">
              <div className="grid gap-4 md:grid-cols-3">
                <MiniStatCard icon={<Award className="h-4 w-4" />} label="Sponsored videos" value={sponsorship?.sponsoredVideosDetected || 0} />
                <MiniStatCard icon={<BarChart3 className="h-4 w-4" />} label="Sponsorship frequency" value={`${sponsorship?.sponsorshipFrequency || 0}%`} />
                <MiniStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Collaboration readiness" value={sponsorship?.collaborationReadiness || "Emerging"} />
              </div>
              {(sponsorship?.recentSponsors || []).length ? (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-bold uppercase text-[#9a8a73]">Past brand partners</p>
                  <div className="flex flex-wrap gap-2">
                    {(sponsorship?.recentSponsors || []).map((brand) => <Pill key={brand}>{brand}</Pill>)}
                  </div>
                </div>
              ) : null}
            </KitSection>

            <section className="mt-5 rounded-[26px] bg-gradient-to-br from-[#201404] via-[#3d2707] to-[#6b4208] p-6 text-white shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#facc15]" />
                <h4 className="text-[18px] font-bold">Safety & Authenticity</h4>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-[#facc15] text-2xl font-black">{safety?.score || scores?.brandSafetyScore || 0}</div>
                  <p className="mt-3 text-sm text-white/75">Brand Safety Score</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-[#f59e0b] text-2xl font-black">{scores?.authenticityScore || 0}</div>
                  <p className="mt-3 text-sm text-white/75">Authenticity Score</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-[#22c55e] text-xl font-black">{safety?.riskLevel || "Low"}</div>
                  <p className="mt-3 text-sm text-white/75">Risk Level</p>
                </div>
              </div>
              <div className="mt-6 rounded-[16px] border border-white/10 bg-white/10 p-4 text-sm text-white/85">
                {(safety?.flags || []).length ? safety?.flags?.join(" · ") : "No major concern detected"}
              </div>
            </section>

            <KitSection title="Proof of Performance" icon={<BarChart3 className="h-5 w-5" />} className="mt-5">
              <div className="divide-y divide-[#f1e2c2]">
                {(topVideos || []).slice(0, 5).map((video) => (
                  <div key={video.title} className="grid grid-cols-[1fr_100px_100px] items-center gap-3 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]"><PlayCircle className="h-4 w-4" /></span>
                      <span className="line-clamp-1 font-medium text-black">{video.title}</span>
                    </div>
                    <span className="font-semibold text-black">{formatNumber(video.views)}</span>
                    <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-center text-xs font-semibold text-[#166534]">High</span>
                  </div>
                ))}
              </div>
            </KitSection>

            <section className="mt-5 rounded-[26px] bg-gradient-to-br from-[#7c4a03] via-[#d97706] to-[#facc15] p-6 text-white shadow-sm">
              <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                <div>
                  <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /><h4 className="text-[18px] font-bold">Predicted Campaign Impact</h4></div>
                  <p className="mt-5 text-[30px] font-black">{formatNumber(prediction?.expectedViewsLow)} - {formatNumber(prediction?.expectedViewsHigh)}</p>
                  <p className="text-sm text-white/80">Predicted views based on recent performance</p>
                  <p className="mt-5 text-[26px] font-black">{formatNumber(prediction?.expectedEngagementLow)} - {formatNumber(prediction?.expectedEngagementHigh)}</p>
                  <p className="text-sm text-white/80">Predicted engagements</p>
                </div>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/75">Recommended deliverables</p>
                  <div className="space-y-2">
                    {(prediction?.recommendedDeliverables || []).map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" /> {item}</div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-[16px] bg-white/15 p-4">
                    <p className="text-xs uppercase text-white/70">Budget fit for this creator</p>
                    <p className="mt-1 text-xl font-bold">{prediction?.budgetFit || "Medium"}</p>
                  </div>
                </div>
              </div>
            </section>

            {hasContact ? (
              <KitSection title="Contact & Actions" icon={<Lock className="h-5 w-5" />} className="mt-5">
                <div className="rounded-[18px] border border-[#f1e2c2] bg-[#fffaf0] p-4">
                  {contact?.maskedEmail ? (
                    <div className="flex items-center gap-3 text-sm font-semibold text-black"><Mail className="h-4 w-4 text-[#9a6500]" /> {contact.maskedEmail}</div>
                  ) : null}
                  {contact?.website ? (
                    <div className="mt-3 flex items-center gap-3 break-all text-sm font-semibold text-black"><Globe className="h-4 w-4 text-[#9a6500]" /> {contact.website}</div>
                  ) : null}
                  {(contact?.socialLinks || []).length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(contact?.socialLinks || []).map((link) => <Pill key={`${link.platform}-${link.url}`}>{link.platform}</Pill>)}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-[#d97706] px-5 py-3 text-sm font-bold text-white">Unlock Contact</button>
                  <button className="rounded-xl border border-[#d9b56d] bg-white px-5 py-3 text-sm font-bold text-black">Add to Campaign</button>
                  <button className="rounded-xl border border-[#d9b56d] bg-white px-5 py-3 text-sm font-bold text-black">Invite Creator</button>
                </div>
              </KitSection>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function YouTubeBrowse() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") || "";
  const campaignName = String(searchParams.get("campaignName") || "").trim();
  const routeChannelId = String(
    searchParams.get("channelId") || searchParams.get("youtubeChannelId") || "",
  ).trim();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [allCreators, setAllCreators] = useState<YouTubeCreator[]>([]);
  const [frontendPage, setFrontendPage] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<YouTubeCreator | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const tierDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const cached = window.sessionStorage.getItem(BROWSE_STATE_CACHE_KEY);
      if (!cached) return;

      const parsed = JSON.parse(cached);
      const createdAt = Number(parsed?.createdAt || 0);
      if (!createdAt || Date.now() - createdAt > BROWSE_STATE_TTL_MS) {
        window.sessionStorage.removeItem(BROWSE_STATE_CACHE_KEY);
        return;
      }

      if (Array.isArray(parsed?.creators) && parsed.creators.length) {
        setAllCreators(parsed.creators);
      }

      if (parsed?.filters && typeof parsed.filters === "object") {
        setFilters((prev) => ({ ...prev, ...parsed.filters }));
      }

      const cachedPage = Number(parsed?.frontendPage || 1);
      if (Number.isFinite(cachedPage) && cachedPage > 0) {
        setFrontendPage(cachedPage);
      }
    } catch (error) {
      window.sessionStorage.removeItem(BROWSE_STATE_CACHE_KEY);
    }
  }, []);

  useEffect(() => {
    setBrandId(getBrandIdFromStorage());
  }, []);

  useEffect(() => {
    if (!routeChannelId) return;

    const creatorFromResults = allCreators.find(
      (creator) => String(creator.channelId || "").trim() === routeChannelId,
    );

    setSelectedCreator(creatorFromResults || buildFallbackYouTubeCreator(routeChannelId));
    setDetailPanelOpen(true);
  }, [routeChannelId, allCreators]);

  function openMediaKitPage(creator: YouTubeCreator) {
    if (!creator.channelId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("mediaKit", "1");
    params.set("channelId", creator.channelId);
    params.set("returnTo", "browse");

    if (campaignId) params.set("campaignId", campaignId);
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.category) params.set("category", filters.category);
    if (filters.country) params.set("country", filters.country);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        BROWSE_STATE_CACHE_KEY,
        JSON.stringify({
          creators: allCreators,
          filters,
          frontendPage,
          createdAt: Date.now(),
        }),
      );
    }

    setSelectedCreator(creator);
    setDetailPanelOpen(true);
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeMediaKitPanel() {
    setDetailPanelOpen(false);
    setSelectedCreator(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("mediaKit");
    params.delete("channelId");
    params.delete("youtubeChannelId");
    params.delete("returnTo");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

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

  const panelCreator = selectedCreator || (routeChannelId ? buildFallbackYouTubeCreator(routeChannelId) : null);

  async function loadCreators(nextFilters: Partial<Filters> = filters) {
    try {
      setLoading(true);
      setError("");
      setWarning("");
      setFrontendPage(1);

      let pollCount = 0;
      let lastResponse: any = null;

      while (true) {
        const response = await fetchYouTubeCreators(
          {
            ...filters,
            ...nextFilters,
            page: 1,
            limit: DISCOVERY_FETCH_LIMIT,
            frontendPagination: true,
            fast: true,
            background: true,
            minimumResults: BROWSE_MIN_RESULTS,
          },
          campaignId,
        );

        lastResponse = response;
        const fetchedCreators = Array.isArray(response.data) ? response.data : [];
        setAllCreators(fetchedCreators);

        const shouldKeepPolling =
          Boolean(response.processing) &&
          fetchedCreators.length < BROWSE_MIN_RESULTS &&
          pollCount < BROWSE_MAX_POLLS;

        if (!shouldKeepPolling) break;

        setWarning(
          response.warning ||
            `Hold on, we are still searching creators... ${fetchedCreators.length}/${BROWSE_MIN_RESULTS} found`,
        );

        pollCount += 1;
        await wait(BROWSE_POLL_DELAY_MS);
      }

      const finalCreators = Array.isArray(lastResponse?.data) ? lastResponse.data : [];
      setAllCreators(finalCreators);
      setWarning(lastResponse?.warning || "");
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
          <CreatorSearchLoader topic={filters.keyword || filters.category || "your campaign"} />
        ) : creators.length === 0 ? (
          <div className="px-6 py-14 text-center text-[#777]">
            {hasSearchCriteria(filters, campaignId)
              ? "No creators found. Try another keyword, change the tier, or clear filters."
              : "Enter a keyword or select a filter, then click Search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="bg-[#faf7f2] text-left text-xs uppercase tracking-wide text-[#777]">
                  <th className="px-5 py-4">Channel</th>
                  <th className="px-5 py-4">Subscribers</th>
                  <th className="px-5 py-4">Tier</th>
                  <th className="px-5 py-4">Country</th>
                  <th className="px-5 py-4">Authenticity</th>
                  <th className="px-5 py-4">Engagement</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator) => {
                  const authenticityScore = getCreatorAuthenticityScore(creator);
                  const countryLabel = creator.country || creator.estimatedAudienceCountry || "-";
                  const tierLabel = getCreatorTierLabel(creator) || "-";

                  return (
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
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {formatNumber(getSubs(creator))}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {tierLabel}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {countryLabel}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-black ${getAuthenticityColorClass(authenticityScore)}`}>
                        {authenticityScore !== null ? `${authenticityScore}%` : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {creator.engagementRate || 0}%
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryDropdown(false);
                          setShowMoreFilters(false);
                          setShowTierDropdown(false);
                          openMediaKitPage(creator);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-[11px] font-semibold leading-none text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Media kit
                      </button>
                    </td>
                  </tr>
                  );
                })}
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

      <DetailPanel
        open={detailPanelOpen}
        onClose={closeMediaKitPanel}
        loading={false}
        error={null}
        data={null}
        raw={buildDetailPanelRawFromYouTubeCreator(panelCreator)}
        platform={"youtube" as any}
        emailExists={Boolean(
          panelCreator?.contact?.youtubeAboutEmail ||
            (panelCreator?.contact?.totalEmails || []).length,
        )}
        onChangeCalc={() => undefined}
        brandId={brandId}
        campaignId={campaignId || null}
        campaignName={campaignName || null}
        handle={panelCreator ? getYouTubeInviteHandle(panelCreator) : null}
        youtubeChannelId={panelCreator?.channelId || routeChannelId || null}
        lastFetchedAt={panelCreator?.recentUploadDate || null}
      />
    </div>
  );
}
