"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
    email?: string;
    rawEmail?: string;
    youtubeAboutEmail?: string;
    emails?: string[];
    totalEmails?: string[];
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

type CountryOption = {
  _id?: string;
  countryName: string;
  countryCode: string;
  flag?: string;
};

function getRuntimeApiBaseUrl() {
  const explicit = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
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
const EMPTY_CREATORS_IMAGE_SRC = "data:image/png;base64,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";

const COMMON_COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  IN: "India",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  BR: "Brazil",
  MX: "Mexico",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  SG: "Singapore",
  AE: "United Arab Emirates",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
};

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

function maskEmailFromFrontend(email?: string | null) {
  const raw = String(email || "").trim();
  if (!raw || !raw.includes("@")) return "";

  const [, domain] = raw.split("@");
  if (!domain) return "";

  return `xxxxxxxx@${domain.trim()}`;
}

function getFrontendMaskedMediaKitEmail(contact?: BrandMediaKitData["contact"] | null) {
  const candidate =
    contact?.rawEmail ||
    contact?.email ||
    contact?.youtubeAboutEmail ||
    contact?.maskedEmail ||
    contact?.totalEmails?.[0] ||
    contact?.emails?.[0] ||
    "";

  return maskEmailFromFrontend(candidate);
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


const AI_TECH_LOADING_ICONS = ["🤖", "🧠", "⚙️", "💻", "📡", "🛰️", "⚡", "🔍"];
const AI_TECH_LOADING_BACKGROUNDS = ["🤖", "🧠", "💻", "📱", "⚙️", "⚡"];

function getCampaignLoadingBackgrounds(topic?: string) {
  const value = String(topic || "").toLowerCase();

  if (/drone|camera|gopro|video|film|photo|vlog/.test(value)) {
    return ["🚁", "📹", "🎬", "📡", "🛰️", "⚡"];
  }

  if (/beauty|makeup|skin|hair|fashion|style|glam/.test(value)) {
    return ["🤖", "✨", "🧠", "📊", "🔍", "⚡"];
  }

  if (/tech|phone|mobile|app|ai|gadget|software|laptop/.test(value)) {
    return ["🤖", "🧠", "💻", "📱", "⚙️", "⚡"];
  }

  if (/food|kitchen|coffee|recipe|restaurant|snack/.test(value)) {
    return ["🤖", "📊", "🔍", "⚡", "🧠", "✨"];
  }

  if (/fitness|gym|health|sport|wellness|yoga/.test(value)) {
    return ["🤖", "⌚", "📈", "🧠", "⚡", "🔍"];
  }

  if (/home|decor|clean|diy|tool|garden|cleaner/.test(value)) {
    return ["🤖", "🛠️", "⚙️", "📊", "🔍", "⚡"];
  }

  return AI_TECH_LOADING_ICONS;
}

function getCreatorSearchLoadingMessages(topicLabel: string) {
  return [
    `Hold on, our AI is searching creators for ${topicLabel}.`,
    "Scanning YouTube channels with AI discovery signals.",
    "Checking creator activity, audience quality, and content fit.",
    "Matching category, country, tier, and campaign relevance.",
    "Filtering weak matches using performance and authenticity signals.",
    "Almost ready — preparing your AI-powered creator shortlist.",
  ];
}

function CreatorSearchLoader({ topic }: { topic?: string }) {
  const icons = useMemo(() => getCampaignLoadingBackgrounds(topic), [topic]);
  const topicLabel = String(topic || "your campaign").trim() || "your campaign";
  const messages = useMemo(() => getCreatorSearchLoadingMessages(topicLabel), [topicLabel]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) =>
        (current + 1) % Math.max(icons.length, AI_TECH_LOADING_BACKGROUNDS.length)
      );
    }, 1050);

    return () => window.clearInterval(timer);
  }, [icons.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 2300);

    return () => window.clearInterval(timer);
  }, [messages.length]);

  const activeIcon = icons[frameIndex % icons.length] || "🤖";
  const activeBackground =
    AI_TECH_LOADING_BACKGROUNDS[frameIndex % AI_TECH_LOADING_BACKGROUNDS.length] || "AI";
  const activeMessage = messages[messageIndex] || messages[0];

  return (
    <div className="grid min-h-[360px] place-items-center px-6 py-10 text-center">
      <style jsx global>{`
        @keyframes cgBrowseAiOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes cgBrowseAiPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.55; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }

        @keyframes cgBrowseAiFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes cgBrowseAiScan {
          0% { transform: translateX(-82px); opacity: 0; }
          18%, 82% { opacity: 0.55; }
          100% { transform: translateX(82px); opacity: 0; }
        }

        @keyframes cgBrowseAiTextFade {
          0% { opacity: 0; transform: translateY(6px); }
          18%, 82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>

      <div className="flex max-w-[660px] flex-col items-center justify-center">
        <div className="relative mb-7 h-[178px] w-[178px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#fff7d8] via-[#f8f4ea] to-white shadow-[0_20px_60px_rgba(25,20,10,0.10)]" />
          <div
            className="absolute inset-[14px] rounded-full border border-[#ead9b5] bg-white/80"
            style={{ animation: "cgBrowseAiPulse 2.2s ease-in-out infinite" }}
          />
          <div className="absolute inset-[28px] rounded-full bg-[#fff8e6]" />

          <div
            className="absolute inset-0"
            style={{ animation: "cgBrowseAiOrbit 5.4s linear infinite" }}
          >
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#d29b22] shadow-[0_0_16px_rgba(210,155,34,0.45)]" />
            <span className="absolute bottom-5 left-4 h-2.5 w-2.5 rounded-full bg-[#4f8f5f] shadow-[0_0_16px_rgba(79,143,95,0.35)]" />
            <span className="absolute bottom-5 right-4 h-2.5 w-2.5 rounded-full bg-[#c06f3d] shadow-[0_0_16px_rgba(192,111,61,0.35)]" />
          </div>

          <div
            className="absolute inset-[44px] overflow-hidden rounded-[32px] border border-[#ead7ad] bg-white shadow-[0_16px_35px_rgba(20,15,5,0.10)]"
            style={{ animation: "cgBrowseAiFloat 2.4s ease-in-out infinite" }}
          >
            <div className="absolute inset-0 grid place-items-center text-[26px] font-black tracking-[-0.04em] text-[#d39c27] opacity-[0.14] transition-all duration-500">
              <span key={activeBackground}>{activeBackground}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-[#fff3c5]/50" />
            <div
              className="absolute left-1/2 top-0 h-full w-[2px] bg-[#d39c27]/55 shadow-[0_0_18px_rgba(211,156,39,0.45)]"
              style={{ animation: "cgBrowseAiScan 1.7s ease-in-out infinite" }}
            />
            <div className="absolute inset-0 grid place-items-center text-[54px] transition-all duration-500">
              <span key={activeIcon}>{activeIcon}</span>
            </div>
          </div>
        </div>

       
        <h3 className="mt-3 text-[24px] font-semibold text-gray-950">
          Finding creators for {topicLabel}
        </h3>
        <p
          key={messageIndex}
          className="mx-auto mt-3 max-w-[560px] text-[15px] leading-6 text-[#71685c]"
          style={{ animation: "cgBrowseAiTextFade 2.25s ease-in-out both" }}
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
  if (value >= 75) return "text-[#4ade80]";
  if (value >= 35) return "text-[#b7791f]";
  return "text-[#dc2626]";
}

function getCountryFlagEmoji(countryCode?: string | null) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";

  return code
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getCreatorCountryDisplay(
  creator: YouTubeCreator,
  countries: CountryOption[] = [],
) {
  const rawCountry = String(creator.country || creator.estimatedAudienceCountry || "").trim();
  if (!rawCountry) {
    return { flag: "🌐", label: "Unknown" };
  }

  const code = normalizeCountryCode(rawCountry);
  const countryFromList = countries.find(
    (item) => normalizeCountryCode(item.countryCode) === code,
  );

  if (/^[A-Z]{2}$/.test(code)) {
    return {
      flag: countryFromList?.flag || getCountryFlagEmoji(code),
      label: countryFromList?.countryName || COMMON_COUNTRY_NAMES[code] || code,
    };
  }

  return { flag: "🌐", label: rawCountry };
}

function getCreatorHandleLabel(creator: YouTubeCreator) {
  const fromUrl = String(creator.channelUrl || "").match(/youtube\.com\/@([^/?#]+)/i)?.[1];
  const raw = String(
    (creator as any).handle ||
      (creator as any).username ||
      fromUrl ||
      creator.channelName ||
      "creator",
  )
    .replace(/^@+/, "")
    .trim();

  if (!raw) return "@creator";

  return `@${raw.replace(/\s+/g, "").toLowerCase()}`;
}

function getLatestVideoThumbnails(creator: YouTubeCreator) {
  return (Array.isArray(creator.recentVideoTitles) ? creator.recentVideoTitles : [])
    .filter((video) => video?.thumbnail || video?.title)
    .slice(0, 2);
}

function getCreatorEmptyStateCopy(searched: boolean) {
  if (searched) {
    return {
      title: "Find creators that match your campaign",
      body: "No creators found for the selected filters. Try another keyword, tier, country, or clear filters to discover creators.",
    };
  }

  return {
    title: "Find creators that match your campaign",
    body: "Search by creator name, username, niche, audience, platform, or location to discover creators for your next collaboration.",
  };
}

function CreatorEmptyState({ searched }: { searched: boolean }) {
  const copy = getCreatorEmptyStateCopy(searched);

  return (
    <div className="grid min-h-[420px] place-items-center px-6 py-20 text-center">
      <div className="mx-auto max-w-[440px]">
        <img
          src={EMPTY_CREATORS_IMAGE_SRC}
          alt="Find creators"
          className="mx-auto mb-5 h-[132px] w-[132px] object-contain"
          loading="eager"
        />

        <h3 className="text-[15px] font-semibold text-black">{copy.title}</h3>
        <p className="mx-auto mt-2 max-w-[360px] text-xs leading-5 text-[#c0b8b0]">
          {copy.body}
        </p>
      </div>
    </div>
  );
}

function CreatorPostPreview({ video }: { video?: RecentVideo }) {
  return (
    <div className="h-[74px] w-[74px] overflow-hidden rounded-[14px] border border-[#eee5da] bg-[#f4f0ea] shadow-sm">
      {video ? (
        <VideoThumbnail src={video.thumbnail} title={video.title} />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold leading-4 text-[#8a8179]">
          Latest post
        </div>
      )}
    </div>
  );
}

const SUBSCRIBER_METRIC_ICON_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAW1JREFUeAGlVMtxgzAQXWHPcAxXPgfogBIowR0Ed0AJ6SBJBSYduAQ6sDtAmeFzDFcOQHYTyFhCwhC/mQVWvH1aSatloECe55ZpmnHf9z5jrJH/D8PAPc9LVbFMHqiq6oBC0W63O9u2namC6rr2kRMvCU9iCZIjWAniFkUR637GNDNsBMVQIiqxCP4JiqWtou89PWjzXddNb0kDgD9+WqNN4PRg45tAe41Lf8PDzGZLRaFntK+BDvO+JVKWCZRl+SJldlkpRna5jaUsDZjDF7wwBIhj0EDgUs2qBC3RQ/d0omoHiKJlLkIlqAbnq2h7xVgjzNygezwCpClouKIgrvtJGuNo4Z93vf6aGrMftORPqag/VDNrsnufHCo9uts/nQXr51VmY0lYVNw6k/lC+dG1efTqzZrE2Gl82AiKuddxItiQmdxpmEqUmoVhGCleeq4T6rrugJzMcZzzoqAsLI/jSVooxNu2TYMgmFXDN8HOB9HyLfrqAAAAAElFTkSuQmCC";

function YouTubeMetricIcon() {
  return (
    <img
      src={SUBSCRIBER_METRIC_ICON_SRC}
      alt="Subscribers"
      className="h-4 w-4 shrink-0 object-contain"
      loading="lazy"
      decoding="async"
    />
  );
}

function MiniTrendIcon() {
  return (
    <svg
      viewBox="0 0 32 16"
      aria-hidden="true"
      className="h-4 w-7 text-[#c7c7c7]"
      fill="none"
    >
      <path
        d="M2 13.2h28"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M3 11.5 9 8.5l5 2.2 6-6 9 2.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompactCreatorMetric({
  icon,
  value,
  trendValue,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  trendValue?: string | number | null;
  label: string;
}) {
  const hasTrendValue = trendValue !== undefined && trendValue !== null && String(trendValue).trim() !== "";

  return (
    <div
      className="grid h-6 grid-cols-[18px_56px_28px_46px] items-center gap-x-2 text-[12px] leading-none text-[#4f463d]"
      title={label}
      aria-label={label}
    >
      <span className="flex w-[18px] shrink-0 justify-center">{icon}</span>
      <span className="w-[56px] tabular-nums text-[#333333]">{value}</span>
      <span className="flex w-[28px] justify-center">
        <MiniTrendIcon />
      </span>
      <span className="w-[46px] tabular-nums text-right text-[#555555]">
        {hasTrendValue ? trendValue : ""}
      </span>
    </div>
  );
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

function getCountryDisplayName(countryCode: string, countries: CountryOption[]) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return "Any country";

  const country = countries.find(
    (item) => normalizeCountryCode(item.countryCode) === code,
  );

  if (!country) return code;
  return `${country.flag ? `${country.flag} ` : ""}${country.countryName} (${country.countryCode})`;
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

async function fetchCountryOptions() {
  const res = await fetch(getApiUrl("/list/countries?limit=300"), {
    method: "GET",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to load countries");
  }

  const rows = Array.isArray(data.data) ? data.data : [];
  return rows
    .map((country: any) => ({
      _id: String(country?._id || ""),
      countryName: String(country?.countryName || "").trim(),
      countryCode: normalizeCountryCode(country?.countryCode),
      flag: String(country?.flag || "").trim(),
    }))
    .filter((country: CountryOption) => country.countryName && country.countryCode)
    .sort((a: CountryOption, b: CountryOption) =>
      a.countryName.localeCompare(b.countryName),
    );
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

function buildDetailPanelRawFromYouTubeCreator(creator?: YouTubeCreator | null) {
  if (!creator) return null;

  const channelId = String(creator.channelId || "").trim();
  const safeHandle = getYouTubeInviteHandle(creator) || channelId;
  const channelName = String(creator.channelName || safeHandle || "Creator").trim();
  const subscribers = getSubs(creator);

  return {
    channelId,
    youtubeChannelId: channelId,
    userId: channelId,
    platform: "youtube",
    profile: {
      channelId,
      youtubeChannelId: channelId,
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
  const frontendMaskedEmail = getFrontendMaskedMediaKitEmail(contact);
  const recommendation = mediaKit?.collabGlamRecommendation;
  const topVideos = mediaKit?.topPerformingVideos || [];
  const fitScore = scoreOrZero(scores?.campaignFitScore || scores?.relevancyScore);
  const hasContact = Boolean(
    contact?.hasContactInfo &&
      (frontendMaskedEmail || contact?.website || (contact?.socialLinks || []).length),
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
                  {frontendMaskedEmail ? (
                    <div className="flex items-center gap-3 text-sm font-semibold text-black"><Mail className="h-4 w-4 text-[#9a6500]" /> {frontendMaskedEmail}</div>
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
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") || "";
  const campaignName = String(searchParams.get("campaignName") || "").trim();
  const brandIdFromQuery = String(searchParams.get("brandId") || "").trim();

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [allCreators, setAllCreators] = useState<YouTubeCreator[]>([]);
  const [frontendPage, setFrontendPage] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<YouTubeCreator | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countryError, setCountryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const tierDropdownRef = useRef<HTMLDivElement | null>(null);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);

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
    setBrandId(brandIdFromQuery || getBrandIdFromStorage());
  }, [brandIdFromQuery]);

  useEffect(() => {
    if (!showMoreFilters || countries.length) return;

    let mounted = true;

    async function loadCountries() {
      try {
        setCountriesLoading(true);
        setCountryError("");
        const rows = await fetchCountryOptions();
        if (mounted) setCountries(rows);
      } catch (err: any) {
        if (mounted) setCountryError(err?.message || "Failed to load countries");
      } finally {
        if (mounted) setCountriesLoading(false);
      }
    }

    loadCountries();

    return () => {
      mounted = false;
    };
  }, [showMoreFilters, countries.length]);

  function openMediaKitPage(creator: YouTubeCreator) {
    const channelId = String(creator.channelId || "").trim();
    if (!channelId) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        BROWSE_STATE_CACHE_KEY,
        JSON.stringify({
          creators: allCreators,
          filters,
          frontendPage,
          selectedChannelId: channelId,
          createdAt: Date.now(),
        }),
      );
    }

    setSelectedCreator(creator);
    setDetailPanelOpen(true);
  }

  function closeDetailPanel() {
    setDetailPanelOpen(false);
    setSelectedCreator(null);
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.subscriberTier) count += 1;
    if (filters.country) count += 1;
    if (filters.minAvgViews) count += 1;
    if (filters.minEngagement) count += 1;
    return count;
  }, [filters]);

  const selectedCountryLabel = useMemo(
    () => getCountryDisplayName(filters.country, countries),
    [filters.country, countries],
  );

  const filteredCountryOptions = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    const rows = query
      ? countries.filter((country) => {
          const haystack = `${country.countryName} ${country.countryCode}`.toLowerCase();
          return haystack.includes(query);
        })
      : countries;

    return rows.slice(0, 120);
  }, [countries, countrySearch]);

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
  const panelCreator = selectedCreator;

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
        countryDropdownRef.current,
      ].some((node) => node?.contains(target));

      if (!clickedInsideDropdown) {
        setShowCategoryDropdown(false);
        setShowMoreFilters(false);
        setShowTierDropdown(false);
        setShowCountryDropdown(false);
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
    setCountrySearch("");
    setShowCountryDropdown(false);
  }

  function handleResetAll() {
    setFilters(defaultFilters);
    setAllCreators([]);
    setFrontendPage(1);
    setShowMoreFilters(false);
    setShowCategoryDropdown(false);
    setShowTierDropdown(false);
    setShowCountryDropdown(false);
    setCountrySearch("");
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

  function handleCountrySelect(value: string) {
    updateFilter("country", normalizeCountryCode(value));
    setCountrySearch("");
    setShowCountryDropdown(false);
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
                setShowCountryDropdown(false);
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
                setShowCountryDropdown(false);
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
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[640px] overflow-visible rounded-[26px] border border-[#eadfd3] bg-white shadow-[0_24px_80px_rgba(28,18,8,0.18)]">
                <div className="rounded-t-[26px] bg-gradient-to-r from-[#fff8ea] via-white to-[#f7f2ed] px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a6500]">
                        Creator discovery
                      </p>
                      <h3 className="mt-1 text-[22px] font-bold text-black">
                        Refine YouTube creators
                      </h3>
                      <p className="mt-1 text-sm text-[#766b60]">
                        Select tier and country from clean dropdowns. Country sends the country code in API payload.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreFilters(false);
                        setShowTierDropdown(false);
                        setShowCountryDropdown(false);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#eadfd3] bg-white text-black shadow-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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
                          className="flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#ddd] bg-white px-4 text-left text-sm text-black outline-none transition hover:border-[#c9b8a6]"
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

                    <div ref={countryDropdownRef} className="relative">
                      <label className="mb-2 block text-sm font-semibold text-black">
                        Country
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCountryDropdown((prev) => !prev);
                          setShowTierDropdown(false);
                        }}
                        className="flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#ddd] bg-white px-4 text-left text-sm text-black outline-none transition hover:border-[#c9b8a6]"
                      >
                        <span className={`truncate ${filters.country ? "text-black" : "text-[#777]"}`}>
                          {filters.country ? selectedCountryLabel : "Select country"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition ${
                            showCountryDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showCountryDropdown && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-[110] w-full overflow-hidden rounded-[18px] border border-[#e6d9cc] bg-white shadow-2xl">
                          <div className="border-b border-[#f0e8df] p-3">
                            <div className="flex h-10 items-center rounded-full border border-[#e6d9cc] bg-[#faf7f2] px-3">
                              <Search className="mr-2 h-4 w-4 text-[#8a8179]" />
                              <input
                                value={countrySearch}
                                onChange={(event) => setCountrySearch(event.target.value)}
                                placeholder="Search country or code"
                                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9288]"
                                autoFocus
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCountrySelect("")}
                            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#faf6f1] ${
                              !filters.country
                                ? "bg-[#f7efe6] font-semibold text-black"
                                : "text-[#555]"
                            }`}
                          >
                            <span>Any country</span>
                            {!filters.country ? (
                              <span className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                                Selected
                              </span>
                            ) : null}
                          </button>

                          <div className="max-h-[260px] overflow-y-auto py-1">
                            {countriesLoading ? (
                              <div className="px-4 py-5 text-sm text-[#777]">
                                Loading countries...
                              </div>
                            ) : countryError ? (
                              <div className="px-4 py-4 text-sm text-[#b91c1c]">
                                {countryError}
                              </div>
                            ) : filteredCountryOptions.length ? (
                              filteredCountryOptions.map((country) => {
                                const selected = normalizeCountryCode(filters.country) === country.countryCode;
                                return (
                                  <button
                                    key={country._id || country.countryCode}
                                    type="button"
                                    onClick={() => handleCountrySelect(country.countryCode)}
                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#faf6f1] ${
                                      selected
                                        ? "bg-[#f7efe6] font-semibold text-black"
                                        : "text-[#555]"
                                    }`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span className="text-lg leading-none">{country.flag || "🌐"}</span>
                                      <span className="truncate">{country.countryName}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full bg-[#f4f0ea] px-2 py-0.5 text-[11px] font-bold text-[#6f6258]">
                                      {country.countryCode}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-4 py-5 text-sm text-[#777]">
                                No country found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
          {filters.country && (
            <span className="rounded-full border border-[#e4d8cc] bg-[#faf7f2] px-3 py-1.5 text-[13px] text-[#6f6258]">
              Country: {selectedCountryLabel}
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
          <CreatorEmptyState searched={hasSearchCriteria(filters, campaignId)} />
        ) : (
          <div className="divide-y divide-[#f0e8df]">
            {creators.map((creator) => {
              const authenticityScore = getCreatorAuthenticityScore(creator);
              const countryDisplay = getCreatorCountryDisplay(creator, countries);
              const tierLabel = getCreatorTierLabel(creator) || "-";
              const handleLabel = getCreatorHandleLabel(creator);
              const thumbnails = getLatestVideoThumbnails(creator);

              return (
                <div
                  key={creator.channelId}
                  className="grid gap-4 px-5 py-4 text-sm text-black transition hover:bg-[#fffdf8] lg:grid-cols-[minmax(300px,1.35fr)_minmax(130px,0.5fr)_180px_minmax(150px,0.55fr)_120px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarImage
                      src={creator.thumbnail}
                      name={creator.channelName}
                      className="h-[74px] w-[74px] shrink-0 rounded-[14px] object-cover"
                    />

                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate font-bold leading-5 text-black">
                          {creator.channelName}
                        </p>
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#2f9cff]" />
                        {tierLabel && tierLabel !== "-" ? (
                          <span className="rounded-full bg-[#f7f4ef] px-2 py-0.5 text-[10px] font-semibold text-[#6f6258]">
                            {tierLabel}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-xs text-[#777]">{handleLabel}</p>

                      <p className="mt-2 text-xs leading-5 text-[#6f6258]">
                        Audience authenticity:{" "}
                        <span className={`font-black ${getAuthenticityColorClass(authenticityScore)}`}>
                          {authenticityScore !== null ? `${authenticityScore}%` : "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-[#eee5da] pl-5 font-medium text-[#4f463d]">
                    <span className="text-base">{countryDisplay.flag}</span>
                    <span className="truncate">{countryDisplay.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreatorPostPreview video={thumbnails[0]} />
                    <CreatorPostPreview video={thumbnails[1]} />
                  </div>

                  <div className="flex min-w-[150px] items-center lg:justify-self-start">
                    <CompactCreatorMetric
                      icon={<YouTubeMetricIcon />}
                      value={formatNumber(getSubs(creator))}
                      trendValue={`${creator.engagementRate || 0}%`}
                      label="YouTube insights"
                    />
                  </div>

                  <div className="flex justify-start lg:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryDropdown(false);
                        setShowMoreFilters(false);
                        setShowTierDropdown(false);
                        openMediaKitPage(creator);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2.5 text-[12px] font-semibold leading-none text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Insights
                    </button>
                  </div>
                </div>
              );
            })}
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
        onClose={closeDetailPanel}
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
        youtubeChannelId={panelCreator?.channelId || null}
        lastFetchedAt={panelCreator?.recentUploadDate || null}
      />
    </div>
  );
}