"use client";

import React from "react";
import { Button } from "@/components/ui/buttonComp";
import { useRouter, useSearchParams } from "next/navigation";
import Confetti from "@/components/ui/ConfettiUi";
import api, { post, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { DetailPanel } from "@/app/brand/(protected)/browse-influencer/DetailPanel";

const COLORS = ["#FFBF00", "#5E412B", "#F57F17", "#F7E152", "#FEF55B"];

type Tier = {
  key?: string;
  label?: string;
};

type Creator = {
  _id?: string;
  ids?: {
    modashId?: string;
    userId?: string | null;
    youtubeChannelId?: string | null;
  };
  channelId?: string | null;
  source?: string;
  profileSource?: string;
  name?: string;
  fullname?: string;
  username?: string;
  handle?: string;
  platform?: string;
  bio?: string;
  provider?: string;
  followers?: number;
  tier?: Tier;
  categories?: string[];
  category?: string;
  country?: string;
  estimatedAudienceCountry?: string;
  picture?: string;
  profilePicture?: string;
  avatar?: string;
  thumbnail?: string;
  image?: string;
  thumbnails?: any;
  profile?: {
    picture?: string;
    profilePicture?: string;
    avatar?: string;
    thumbnail?: string;
    image?: string;
    thumbnails?: any;
  };
  channel?: {
    thumbnails?: any;
    snippet?: {
      thumbnails?: any;
    };
  };
  snippet?: {
    thumbnails?: any;
  };
  url?: string;
  urls?: {
    url?: string;
  };
  isVerified?: boolean;
  isPrivate?: boolean;
  stats?: {
    engagementRate?: number;
    engagements?: number;
    averageViews?: number;
    authenticityScore?: number;
    audienceAuthenticityScore?: number;
    audienceCountryConfidence?: number;
  };
  location?: {
    country?: string;
    state?: string | null;
    city?: string | null;
  };
  aiScore?: number;
  rawAiScore?: number;
  recommendationScore?: number;
  recommendationReason?: string;
  audienceAuthenticity?: number;
  audienceAuthenticityScore?: number;
  authenticityScore?: number;
  subscribers?: number;
  avgViews?: number;
  engagementRate?: number;
  scores?: {
    recommendationScore?: number;
    campaignFitScore?: number;
    authenticityScore?: number;
    audienceAuthenticityScore?: number;
    audienceCountryConfidence?: number;
    engagementScore?: number;
    brandSafetyScore?: number;
    relevancyScore?: number;
  };
};

type Invitation = {
  _id?: string;
  invitationId?: string;
  brandId?: string | null;
  campaignId?: string | null;
  handle?: string | null;
  platform?: string | null;
  modashUserId?: string | null;
  status?: string | null;
};

type CampaignRecommendationSourceResponse = {
  status?: string;
  campaignId?: string;
  requestedPlatforms?: string[];
  effectivePlatforms?: string[];
  source?: "youtube_api" | "modash_ai";
  rule?: string;
};

type RecommendedCreatorsResponse =
  | Creator[]
  | {
    results?: Creator[];
    data?: Creator[];
    processing?: boolean;
    backgroundStarted?: boolean;
    returnedCount?: number;
    savedCount?: number;
    message?: string;
  };

type InvitationListResponse = {
  status?: string;
  page?: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  data?: Invitation[];
  invitations?: Invitation[];
};

type ModashReportResponse = {
  error?: boolean;
  profile?: any;
  audience?: any;
  stats?: any;
  recentPosts?: any[];
  popularPosts?: any[];
  sponsoredPosts?: any[];
  bio?: string;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  avgReelsPlays?: number;
  averageViews?: number;
  postsCount?: number;
  postsCounts?: number;
  _lastFetchedAt?: string;
  [key: string]: any;
};

type YouTubeProfileData = {
  platform?: "youtube";
  handle?: string | null;
  channelId?: string | null;
  title?: string;
  description?: string;
  country?: string | null;
  defaultLanguage?: string | null;
  thumbnails?: any;
  topicLabels?: string[];
  subscriberCount?: number | null;
  totalViewCount?: number | null;
  totalVideoCount?: number | null;
  avgViewsLast15?: number | null;
  engagementRateLast15?: number | null;
  uploadFrequencyPerWeek?: number | null;
  avgDaysBetweenUploads?: number | null;
  lastUploadAt?: string | null;
  lastVideoId?: string | null;
  lastVideoTitle?: string | null;
  lastVideos?: any[];
  syncedAt?: string;
  updatedAt?: string;
};

type YouTubePreviewResponse = {
  status?: string;
  mode?: string;
  stored?: boolean;
  data?: YouTubeProfileData;
};

type ReportCalculationMethod = "median" | "average";

type ReportDrawerState = {
  open: boolean;
  creator: Creator | null;
  loading: boolean;
  error: string | null;
  data: ModashReportResponse | null;
  raw: ModashReportResponse | null;
  lastFetchedAt: string | null;
  calculationMethod: ReportCalculationMethod;
};

type NavigateTarget = "next" | "dashboard";

function formatCompact(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function normalizeHandle(h?: string | null) {
  if (!h) return "";

  const trimmed = String(h).trim();
  if (!trimmed) return "";

  return trimmed.startsWith("@")
    ? trimmed.toLowerCase()
    : `@${trimmed.toLowerCase()}`;
}

function looksLikeYouTubeChannelId(value?: string | null) {
  const raw = String(value || "").trim().replace(/^@/, "");
  return /^UC[A-Za-z0-9_-]{20,}$/.test(raw);
}

function getCleanCreatorHandle(value?: string | null) {
  if (!value || looksLikeYouTubeChannelId(value)) return "";
  return normalizeHandle(value);
}

function isRecommendationReasonText(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return false;

  return (
    /Matched campaign topic:/i.test(text) ||
    /Creator country matches/i.test(text) ||
    /Best suited for/i.test(text) ||
    /average views/i.test(text) ||
    /engagement rate/i.test(text) ||
    /recommendation score/i.test(text)
  );
}

function normalizePlatformArray(input?: string[] | null) {
  const raw = Array.isArray(input) ? input : [];

  return Array.from(
    new Set(
      raw
        .map((platform) => normalizePlatform(platform))
        .filter((platform) =>
          ["youtube", "instagram", "tiktok"].includes(platform)
        )
    )
  );
}

function getRecommendationSourceFromPlatforms(platforms?: string[] | null) {
  const normalized = normalizePlatformArray(platforms);

  if (normalized.includes("youtube")) {
    return {
      source: "youtube_api" as const,
      effectivePlatforms: ["youtube"],
      rule: "youtube_selected_use_youtube_api_only",
    };
  }

  return {
    source: "modash_ai" as const,
    effectivePlatforms: normalized.filter((p) => p !== "youtube"),
    rule: "no_youtube_use_modash_ai_only",
  };
}

function getResolvedRecommendationSource(
  data?: CampaignRecommendationSourceResponse | null
) {
  const requestedPlatforms = normalizePlatformArray(data?.requestedPlatforms);
  const fallback = getRecommendationSourceFromPlatforms(requestedPlatforms);

  const source = data?.source || fallback.source;
  let effectivePlatforms = normalizePlatformArray(data?.effectivePlatforms);

  if (!effectivePlatforms.length) {
    effectivePlatforms = fallback.effectivePlatforms;
  }

  if (source === "youtube_api") {
    effectivePlatforms = ["youtube"];
  } else {
    effectivePlatforms = effectivePlatforms.filter((p) => p !== "youtube");
  }

  return {
    source,
    requestedPlatforms,
    effectivePlatforms,
    rule:
      data?.rule ||
      (source === "youtube_api"
        ? "youtube_selected_use_youtube_api_only"
        : "no_youtube_use_modash_ai_only"),
  };
}

function normalizePlatform(platform?: string | null) {
  const p = String(platform || "").trim().toLowerCase();

  if (p === "yt") return "youtube";
  if (p === "ig") return "instagram";
  if (p === "tt") return "tiktok";

  return p;
}

function getCreatorName(c: Creator) {
  return c.name || c.fullname || c.username || c.handle || "Unknown Creator";
}

function getCreatorHandle(c: Creator) {
  return getCleanCreatorHandle(c.handle || c.username);
}

function getCreatorPlatform(c: Creator) {
  const platform = normalizePlatform(c.platform || c.provider);
  if (platform) return platform;

  if (
    c.source === "youtube_api" ||
    c.profileSource === "youtube_api" ||
    c.channelId ||
    c.ids?.youtubeChannelId
  ) {
    return "youtube";
  }

  return "";
}

function getCreatorIdentityKey(c: Creator) {
  const platform = getCreatorPlatform(c);
  const modashId = getCreatorModashId(c);
  const channelId = getCreatorChannelId(c);
  const handle = getCreatorHandle(c);
  const url = String(c.url || c.urls?.url || "").trim().toLowerCase();

  if (channelId && platform) return `channel:${platform}:${channelId}`;
  if (modashId && platform) return `modash:${platform}:${modashId}`;
  if (handle && platform) return `handle:${platform}:${handle}`;
  if (url && platform) return `url:${platform}:${url}`;

  return `${platform}:${getCreatorName(c).toLowerCase()}`;
}

type ResolvedRecommendationSource = ReturnType<
  typeof getResolvedRecommendationSource
>;

function normalizeCreatorForRecommendationSource(
  creator: Creator,
  sourceInfo: ResolvedRecommendationSource
): Creator {
  if (sourceInfo.source === "youtube_api") {
    return {
      ...creator,
      picture: getCreatorPicture(creator) || creator.picture,
      platform: "youtube",
      source: creator.source || "youtube_api",
      profileSource: creator.profileSource || "youtube_api",
    };
  }

  const platform = getCreatorPlatform(creator);
  const fallbackPlatform = sourceInfo.effectivePlatforms[0] || platform;

  return {
    ...creator,
    picture: getCreatorPicture(creator) || creator.picture,
    platform: platform || fallbackPlatform,
  };
}

function filterCreatorsForRecommendationSource(
  creators: Creator[],
  sourceInfo: ResolvedRecommendationSource
) {
  const allowedPlatforms = new Set(sourceInfo.effectivePlatforms);
  const deduped = new Map<string, Creator>();

  creators
    .map((creator) =>
      normalizeCreatorForRecommendationSource(creator, sourceInfo)
    )
    .forEach((creator) => {
      const platform = getCreatorPlatform(creator);

      if (!platform || !allowedPlatforms.has(platform)) return;
      if (sourceInfo.source === "youtube_api" && !isYouTubeCreator(creator)) {
        return;
      }

      const key = getCreatorIdentityKey(creator);
      if (!deduped.has(key)) {
        deduped.set(key, creator);
      }
    });

  return Array.from(deduped.values());
}

function getCreatorModashId(c: Creator) {
  return c.ids?.modashId || c.ids?.userId || c._id || "";
}

function getCreatorChannelId(c: Creator) {
  return (
    c.channelId ||
    c.ids?.youtubeChannelId ||
    (getCreatorPlatform(c) === "youtube" ? getCreatorModashId(c) : "") ||
    ""
  );
}

function isYouTubeCreator(c?: Creator | null) {
  if (!c) return false;

  return (
    getCreatorPlatform(c) === "youtube" ||
    c.source === "youtube_api" ||
    c.profileSource === "youtube_api"
  );
}

function pickYouTubeThumb(thumbnails?: any) {
  return (
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    null
  );
}

function numOrUndefined(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function pickVideoThumb(video: any) {
  return (
    video?.thumbnails?.maxres?.url ||
    video?.thumbnails?.standard?.url ||
    video?.thumbnails?.high?.url ||
    video?.thumbnails?.medium?.url ||
    video?.thumbnails?.default?.url ||
    null
  );
}

function sumNumbers(items: any[], key: string) {
  return items.reduce((sum, item) => {
    const value = Number(item?.[key] || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function avgNumber(items: any[], key: string) {
  if (!items.length) return undefined;

  const total = sumNumbers(items, key);
  return Math.round(total / items.length);
}

function mapYouTubePreviewToReport(data: YouTubeProfileData): ModashReportResponse {
  const handle = data.handle || null;
  const username = handle
    ? handle.replace(/^@/, "")
    : data.channelId || null;

  const url = handle
    ? `https://www.youtube.com/${handle}`
    : data.channelId
      ? `https://www.youtube.com/channel/${data.channelId}`
      : null;

  const videos = Array.isArray(data.lastVideos) ? data.lastVideos : [];

  const recentPosts = videos.map((video) => {
    const image = pickVideoThumb(video);

    return {
      id: video.videoId,
      videoId: video.videoId,
      title: video.title,
      text: video.title,
      caption: video.description || video.title,
      description: video.description || "",
      created: video.publishedAt,
      createdAt: video.publishedAt,
      publishedAt: video.publishedAt,
      postedAt: video.publishedAt,
      date: video.publishedAt,
      views: numOrUndefined(video.viewCount),
      plays: numOrUndefined(video.viewCount),
      likes: numOrUndefined(video.likeCount),
      comments: numOrUndefined(video.commentCount),
      duration: video.duration,
      image,
      thumbnail: image,
      url:
        video.videoUrl ||
        (video.videoId
          ? `https://www.youtube.com/watch?v=${video.videoId}`
          : null),
      type: "YouTube video",
    };
  });

  const popularPosts = [...recentPosts].sort(
    (a, b) => Number(b.views || 0) - Number(a.views || 0)
  );

  const avgLikes = avgNumber(videos, "likeCount");
  const avgComments = avgNumber(videos, "commentCount");

  const followers = numOrUndefined(data.subscriberCount);
  const avgViews = numOrUndefined(data.avgViewsLast15);
  const engagementRate = numOrUndefined(data.engagementRateLast15);
  const totalViews = numOrUndefined(data.totalViewCount);
  const totalVideos = numOrUndefined(data.totalVideoCount);
  const uploadFrequencyPerWeek = numOrUndefined(data.uploadFrequencyPerWeek);

  const categoryObjects = Array.isArray(data.topicLabels)
    ? data.topicLabels.map((label) => ({
      categoryName: label,
      name: label,
    }))
    : [];

  const profile = {
    userId: data.channelId || null,
    username,
    handle,
    fullname: data.title || username || "YouTube Creator",
    name: data.title || username || "YouTube Creator",
    url,
    picture: pickYouTubeThumb(data.thumbnails),
    followers,
    engagements: undefined,
    engagementRate,
    averageViews: avgViews,
    avgViews,
    bio: data.description || "",
    description: data.description || "",
    country: data.country || null,
    defaultLanguage: data.defaultLanguage || null,
    language: data.defaultLanguage
      ? { name: data.defaultLanguage }
      : undefined,
    recentPosts,
    popularPosts,
    postsCount: totalVideos,
    postsCounts: totalVideos,
    categories: categoryObjects,
  };

  return {
    _source: "youtube_api",
    _cacheOnly: true,
    _lastFetchedAt: data.syncedAt || data.updatedAt || new Date().toISOString(),
    provider: "youtube",

    profile,

    userId: data.channelId || null,
    username,
    handle,
    fullname: profile.fullname,
    name: profile.name,
    url,
    picture: profile.picture,

    bio: data.description || "",
    description: data.description || "",
    country: data.country || null,
    language: profile.language,

    followers,
    engagementRate,
    avgLikes,
    avgComments,
    avgViews,
    averageViews: avgViews,
    totalViews,
    postsCount: totalVideos,
    postsCounts: totalVideos,

    recentPosts,
    popularPosts,
    sponsoredPosts: [],

    stats: {
      followers: {
        value: followers,
      },
      avgLikes: {
        value: avgLikes,
      },
      avgComments: {
        value: avgComments,
      },
      avgViews: {
        value: avgViews,
      },
      averageViews: avgViews,
      engagementRate,
      uploadFrequencyPerWeek,
      totalViews,
      totalVideos,
    },

    audience: {
      geoCountries: data.country
        ? [{ name: data.country, weight: 1 }]
        : [],
      ages: [],
      genders: [],
      languages: data.defaultLanguage
        ? [{ code: data.defaultLanguage, name: data.defaultLanguage, weight: 1 }]
        : [],
      interests: Array.isArray(data.topicLabels)
        ? data.topicLabels.map((name) => ({ name, weight: 1 }))
        : [],
      credibility: null,
    },

    categories: categoryObjects,
    hashtags: [],
    lookalikes: [],
    statHistory: [],
  };
}

function getCreatorAiScore(c: Creator) {
  if (typeof c.aiScore !== "number" || Number.isNaN(c.aiScore)) return null;

  return Math.max(0, Math.min(100, Math.round(c.aiScore)));
}

function getRecommendedCreators(data: RecommendedCreatorsResponse): Creator[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getExistingInvitations(data: InvitationListResponse): Invitation[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.invitations)) return data.invitations;
  return [];
}

function getCreatorBio(c: Creator) {
  const bio = String(c.bio || "")
    .replace(/\s+/g, " ")
    .trim();

  if (isRecommendationReasonText(bio)) return "";

  return bio;
}

function cleanImageUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("http://")) return raw.replace(/^http:\/\//i, "https://");
  if (raw.startsWith("https://")) return raw;

  return "";
}

function pickThumbnailUrl(thumbnails?: any) {
  if (!thumbnails) return "";
  if (typeof thumbnails === "string") return cleanImageUrl(thumbnails);

  return cleanImageUrl(
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    thumbnails?.url ||
    ""
  );
}

function getCreatorPictureUrls(c: Creator) {
  const candidates = [
    c.picture,
    c.profilePicture,
    c.avatar,
    c.thumbnail,
    c.image,
    c.profile?.picture,
    c.profile?.profilePicture,
    c.profile?.avatar,
    c.profile?.thumbnail,
    c.profile?.image,
    pickThumbnailUrl(c.thumbnails),
    pickThumbnailUrl(c.profile?.thumbnails),
    pickThumbnailUrl(c.channel?.thumbnails),
    pickThumbnailUrl(c.channel?.snippet?.thumbnails),
    pickThumbnailUrl(c.snippet?.thumbnails),
  ];

  const out: string[] = [];
  const seen = new Set<string>();

  candidates.forEach((candidate) => {
    const url = cleanImageUrl(candidate);
    if (!url) return;

    const alternates = [url];

    if (url.includes("yt3.ggpht.com")) {
      alternates.push(url.replace("yt3.ggpht.com", "yt3.googleusercontent.com"));
    }

    if (url.includes("yt3.googleusercontent.com")) {
      alternates.push(url.replace("yt3.googleusercontent.com", "yt3.ggpht.com"));
    }

    alternates.forEach((alternate) => {
      const key = alternate.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(alternate);
    });
  });

  return out;
}

function getCreatorPicture(c: Creator) {
  return getCreatorPictureUrls(c)[0] || "";
}

function CreatorAvatar({ creator, name }: { creator: Creator; name: string }) {
  const imageUrls = React.useMemo(() => getCreatorPictureUrls(creator), [creator]);
  const [imageIndex, setImageIndex] = React.useState(0);

  React.useEffect(() => {
    setImageIndex(0);
  }, [imageUrls.join("|")]);

  const currentImage = imageUrls[imageIndex] || "";

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-200">
      {currentImage ? (
        <img
          src={currentImage}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setImageIndex((prev) => prev + 1);
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-lg font-semibold text-gray-700">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function rowId(c: Creator, index: number) {
  const modashId = getCreatorModashId(c);
  const platform = getCreatorPlatform(c);
  const handle = getCreatorHandle(c);

  if (modashId && platform) return `modash:${platform}:${modashId}`;
  if (handle && platform) return `handle:${platform}:${handle}`;

  return `${index}`;
}

function invitationKey(inv: Invitation) {
  const modashId = String(inv.modashUserId || "").trim();
  const platform = normalizePlatform(inv.platform);
  const handle = normalizeHandle(inv.handle);

  if (modashId && platform) return `modash:${platform}:${modashId}`;
  if (handle && platform) return `handle:${platform}:${handle}`;

  return "";
}

function creatorKeysForMatching(c: Creator, index: number) {
  const keys = new Set<string>();

  const modashId = getCreatorModashId(c);
  const platform = getCreatorPlatform(c);
  const handle = getCreatorHandle(c);

  if (modashId && platform) keys.add(`modash:${platform}:${modashId}`);
  if (handle && platform) keys.add(`handle:${platform}:${handle}`);

  keys.add(rowId(c, index));

  return keys;
}

function isCreatorSelected(
  selected: Set<string>,
  creator: Creator,
  index: number
) {
  const keys = creatorKeysForMatching(creator, index);

  for (const key of keys) {
    if (selected.has(key)) return true;
  }

  return false;
}

function isCreatorAlreadyInvited(
  alreadyInvited: Set<string>,
  creator: Creator,
  index: number
) {
  const keys = creatorKeysForMatching(creator, index);

  for (const key of keys) {
    if (alreadyInvited.has(key)) return true;
  }

  return false;
}

function isInvitationActive(inv: Invitation) {
  const status = String(inv.status || "").toLowerCase();
  return status === "invited";
}

function buildInvitationEmailTemplate(c: Creator) {
  const name = getCreatorName(c);
  const aiScore = getCreatorAiScore(c);

  return {
    subject: "You’re invited to a CollabGlam campaign",
    textBody: `Hi ${name},

We found your profile to be a strong match for one of our brand campaigns on CollabGlam.

${aiScore !== null
        ? `Your campaign match score is ${aiScore}%.`
        : "Your profile looks like a strong match for this campaign."
      }

We would love to invite you to collaborate.

Team CollabGlam`,
    htmlBody: `
      <p>Hi ${name},</p>
      <p>We found your profile to be a strong match for one of our brand campaigns on CollabGlam.</p>
      ${aiScore !== null
        ? `<p><strong>Your campaign match score is ${aiScore}%.</strong></p>`
        : `<p><strong>Your profile looks like a strong match for this campaign.</strong></p>`
      }
      <p>We would love to invite you to collaborate.</p>
      <p>Team CollabGlam</p>
    `,
  };
}

function getStoredBrandMongoId() {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem("brandId") ||
    window.localStorage.getItem("currentBrandId") ||
    ""
  );
}

function getCreatorAudienceAuthenticity(c: Creator) {
  const anyCreator = c as any;
  const candidates = [
    c.audienceAuthenticity,
    anyCreator.audienceAuthenticityScore,
    c.authenticityScore,
    c.scores?.authenticityScore,
    anyCreator.scores?.audienceAuthenticityScore,
    anyCreator.scores?.audienceAuthenticity,
    c.stats?.authenticityScore,
    anyCreator.stats?.audienceAuthenticityScore,
    anyCreator.audience?.authenticityScore,
    anyCreator.audience?.authenticity,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return Math.max(0, Math.min(100, Math.round(n)));
    }
  }

  const followers = Number(c.followers || c.subscribers || 0);
  const avgViews = Number(c.avgViews || c.stats?.averageViews || 0);
  const engagementRate = Number(c.engagementRate || c.stats?.engagementRate || 0);

  if (!followers && !avgViews && !engagementRate) return null;

  let score = 78;
  if (engagementRate >= 5) score += 8;
  else if (engagementRate >= 2) score += 5;
  else if (engagementRate > 0 && engagementRate < 0.5) score -= 12;

  const viewSubscriberRatio = followers > 0 ? (avgViews / followers) * 100 : 0;
  if (viewSubscriberRatio >= 10) score += 7;
  else if (viewSubscriberRatio >= 3) score += 4;
  else if (viewSubscriberRatio > 0 && viewSubscriberRatio < 0.3) score -= 8;

  return Math.max(35, Math.min(95, Math.round(score)));
}

function getAudienceAuthenticityColorClass(value: number | null) {
  if (value === null) return "text-[#202124]";
  if (value >= 75) return "text-[#16803a]";
  if (value >= 35) return "text-[#b7791f]";
  return "text-[#dc2626]";
}

function buildCreatorMediaKitHref(c: Creator, campaignId?: string | null) {
  const channelId = getCreatorChannelId(c);
  if (!channelId) return "";

  const params = new URLSearchParams({
    channelId,
    returnTo: "invitation",
  });

  if (campaignId) {
    params.set("campaignId", campaignId);
  }

  const category = Array.isArray(c.categories) ? c.categories[0] : c.category;
  const country = c.location?.country || c.country || c.estimatedAudienceCountry || "";

  if (category) params.set("category", String(category));
  if (country) params.set("country", String(country));

  return `/brand/media-kit?${params.toString()}`;
}

function AiScoreSparkleIcon() {
  const gradientId = React.useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 13 13"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M10.5022 7.4375C10.5033 7.61588 10.4491 7.79022 10.3471 7.93654C10.245 8.08285 10.1002 8.19394 9.93238 8.25453L7.1116 9.29688L6.07254 12.1198C6.011 12.287 5.89968 12.4313 5.75358 12.5332C5.60748 12.6351 5.43363 12.6897 5.2555 12.6897C5.07738 12.6897 4.90353 12.6351 4.75743 12.5332C4.61133 12.4313 4.50001 12.287 4.43847 12.1198L3.39285 9.29688L0.569879 8.25781C0.402716 8.19628 0.258449 8.08495 0.156544 7.93885C0.0546386 7.79275 0 7.61891 0 7.44078C0 7.26265 0.0546386 7.08881 0.156544 6.94271C0.258449 6.79661 0.402716 6.68528 0.569879 6.62375L3.39285 5.57812L4.43191 2.75516C4.49344 2.58799 4.60477 2.44373 4.75087 2.34182C4.89697 2.23992 5.07081 2.18528 5.24894 2.18528C5.42707 2.18528 5.60091 2.23992 5.74701 2.34182C5.89311 2.44373 6.00444 2.58799 6.06597 2.75516L7.1116 5.57812L9.93457 6.61719C10.1025 6.67832 10.2473 6.79007 10.3489 6.93701C10.4506 7.08395 10.5042 7.25882 10.5022 7.4375ZM7.43972 2.1875H8.31472V3.0625C8.31472 3.17853 8.36082 3.28981 8.44286 3.37186C8.52491 3.45391 8.63619 3.5 8.75222 3.5C8.86826 3.5 8.97954 3.45391 9.06158 3.37186C9.14363 3.28981 9.18972 3.17853 9.18972 3.0625V2.1875H10.0647C10.1808 2.1875 10.292 2.14141 10.3741 2.05936C10.4561 1.97731 10.5022 1.86603 10.5022 1.75C10.5022 1.63397 10.4561 1.52269 10.3741 1.44064C10.292 1.35859 10.1808 1.3125 10.0647 1.3125H9.18972V0.4375C9.18972 0.321468 9.14363 0.210188 9.06158 0.128141C8.97954 0.0460936 8.86826 0 8.75222 0C8.63619 0 8.52491 0.0460936 8.44286 0.128141C8.36082 0.210188 8.31472 0.321468 8.31472 0.4375V1.3125H7.43972C7.32369 1.3125 7.21241 1.35859 7.13036 1.44064C7.04832 1.52269 7.00222 1.63397 7.00222 1.75C7.00222 1.86603 7.04832 1.97731 7.13036 2.05936C7.21241 2.14141 7.32369 2.1875 7.43972 2.1875ZM12.2522 3.9375H11.8147V3.5C11.8147 3.38397 11.7686 3.27269 11.6866 3.19064C11.6045 3.10859 11.4933 3.0625 11.3772 3.0625C11.2612 3.0625 11.1499 3.10859 11.0679 3.19064C10.9858 3.27269 10.9397 3.38397 10.9397 3.5V3.9375H10.5022C10.3862 3.9375 10.2749 3.98359 10.1929 4.06564C10.1108 4.14769 10.0647 4.25897 10.0647 4.375C10.0647 4.49103 10.1108 4.60231 10.1929 4.68436C10.2749 4.76641 10.3862 4.8125 10.5022 4.8125H10.9397V5.25C10.9397 5.36603 10.9858 5.47731 11.0679 5.55936C11.1499 5.64141 11.2612 5.6875 11.3772 5.6875C11.4933 5.6875 11.6045 5.64141 11.6866 5.55936C11.7686 5.47731 11.8147 5.36603 11.8147 5.25V4.8125H12.2522C12.3683 4.8125 12.4795 4.76641 12.5616 4.68436C12.6436 4.60231 12.6897 4.49103 12.6897 4.375C12.6897 4.25897 12.6436 4.14769 12.5616 4.06564C12.4795 3.98359 12.3683 3.9375 12.2522 3.9375Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="-0.765759"
          y1="-1.05748"
          x2="13.2693"
          y2="6.12811"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.129808" stopColor="#FAFAFA" />
          <stop offset="0.379808" stopColor="#FFBF00" stopOpacity="0.83" />
          <stop offset="0.51676" stopColor="#F6BB2A" />
          <stop offset="0.810379" stopColor="#F3584E" />
          <stop offset="1" stopColor="#E078D1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function normalizeReportPlatform(
  platform?: string | null
): "instagram" | "tiktok" | "youtube" {
  const p = normalizePlatform(platform);

  if (p === "instagram" || p === "tiktok" || p === "youtube") {
    return p;
  }

  return "instagram";
}

function getCreatorReportHandle(creator?: Creator | null) {
  if (!creator) return null;

  const handle = getCreatorHandle(creator);
  if (handle) return handle;

  const username = String(creator.username || creator.handle || "")
    .replace(/^@/, "")
    .trim();

  return username ? `@${username}` : null;
}

function getReportLastFetchedAt(data?: ModashReportResponse | null) {
  const value =
    data?._lastFetchedAt ||
    data?.lastFetchedAt ||
    data?.updatedAt ||
    data?.createdAt ||
    null;

  return value ? String(value) : null;
}

function ModashReportSideModal({
  drawer,
  onClose,
  onRefresh,
  onChangeCalc,
  campaignId,
}: {
  drawer: ReportDrawerState;
  onClose: () => void;
  onRefresh: () => void;
  onChangeCalc: (calc: ReportCalculationMethod) => void;
  campaignId?: string | null;
}) {
  const creator = drawer.creator;
  const platform = normalizeReportPlatform(
    getCreatorPlatform(creator || {}) || drawer.data?.provider
  );
  const handle = getCreatorReportHandle(creator);

  return (
    <DetailPanel
      open={drawer.open}
      onClose={onClose}
      loading={drawer.loading}
      error={drawer.error}
      data={(drawer.data as any) || null}
      raw={drawer.raw || drawer.data}
      platform={platform as any}
      emailExists={null}
      onChangeCalc={onChangeCalc}
      brandId={getStoredBrandMongoId()}
      campaignId={campaignId}
      handle={handle}
      lastFetchedAt={drawer.lastFetchedAt}
      onRefreshReport={onRefresh}
      connectedProfiles={[]}
    />
  );
}

export default function InfluencerInvitationPage() {
  const [mounted, setMounted] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);

  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [alreadyInvited, setAlreadyInvited] = React.useState<Set<string>>(
    new Set()
  );
  const [sending, setSending] = React.useState<Set<string>>(new Set());
  const [bulkCreating, setBulkCreating] = React.useState(false);

  const [reportCalculationMethod, setReportCalculationMethod] =
    React.useState<ReportCalculationMethod>("average");

  const [reportDrawer, setReportDrawer] = React.useState<ReportDrawerState>({
    open: false,
    creator: null,
    loading: false,
    error: null,
    data: null,
    raw: null,
    lastFetchedAt: null,
    calculationMethod: "average",
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // Campaign id is taken only from the URL query/header:
  // /brand/influencer-invitation?q=active&campaignId=<campaignid>
  const campaignId = String(searchParams.get("campaignId") || "").trim();
  const q = String(searchParams.get("q") || "").trim();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    setShowConfetti(true);

    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [mounted]);

  const fetchExistingInvitations = React.useCallback(
    async (brandId: string, currentCampaignId: string) => {
      const data = await post<InvitationListResponse>("/newinvitations/list", {
        brandId,
        campaignId: currentCampaignId,
        status: "invited",
        page: 1,
        limit: 200,
      });

      const existing = getExistingInvitations(data);
      const existingKeys = new Set<string>();

      existing.forEach((inv) => {
        if (!isInvitationActive(inv)) return;

        const key = invitationKey(inv);
        if (key) existingKeys.add(key);
      });

      return existingKeys;
    },
    []
  );

  const fetchYouTubeCampaignRecommendations = React.useCallback(
    async (brandId: string, currentCampaignId: string) => {
      const url = `/youtube-data/campaign/${currentCampaignId}/recommend-influencers`;
      const body = {
        brandId,
        campaignId: currentCampaignId,
        limit: 100,
        minimumInfluencers: 50,
        minInfluencers: 50,
        save: true,
        strictCountry: true,
        fast: true,
        background: true,
      };

      const requestOnce = async (forceBackground = false) => {
        const response = await api.post<RecommendedCreatorsResponse>(
          url,
          forceBackground ? { ...body, forceBackground: true } : body,
          {
            // Keep recommendation polling logic unchanged, but allow each API
            // call to wait longer on production when Mongo/YouTube processing
            // needs more time before returning the fast response.
            timeout: 600000,
          }
        );

        return response.data;
      };

      let data = await requestOnce();
      let creators = getRecommendedCreators(data);

      // If this is the first run for the campaign, backend returns processing=true
      // while YouTube discovery is saving recommendations. Keep the page in
      // loading state and poll until at least 50 creators are available.
      for (let attempt = 0; attempt < 72 && creators.length < 50 && !Array.isArray(data) && data?.processing; attempt += 1) {
        await wait(5000);
        data = await requestOnce(attempt === 6);
        creators = getRecommendedCreators(data);
      }

      return data;
    },
    []
  );

  const fetchCreators = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const brandId = getStoredBrandMongoId();

      if (!brandId || !campaignId) {
        throw new Error("Missing brand _id or campaign _id");
      }

      // ✅ Step 1: first check campaign platform by campaignId
      const sourceData = await post<CampaignRecommendationSourceResponse>(
        "/modash/campaign-recommendation-source",
        {
          brandId,
          campaignId,
        }
      );

      const sourceInfo = getResolvedRecommendationSource(sourceData);

      // ✅ Step 2: then fetch suggestions according to the exact source selected by backend.
      // YouTube recommendations use a fast non-blocking API to avoid the 40s frontend timeout.
      const recommendedRequest =
        sourceInfo.source === "youtube_api"
          ? fetchYouTubeCampaignRecommendations(brandId, campaignId)
          : post<RecommendedCreatorsResponse>("/modash/recommended-by-campaign", {
            brandId,
            campaignId,
            limit: 15,
            source: sourceInfo.source,
            platforms: sourceInfo.effectivePlatforms,
            rule: sourceInfo.rule,
          });

      const [recommendedData, existingKeys] = await Promise.all([
        recommendedRequest,
        fetchExistingInvitations(brandId, campaignId),
      ]);

      const rawList = getRecommendedCreators(recommendedData);
      const list = filterCreatorsForRecommendationSource(rawList, sourceInfo);

      const defaultSelected = new Set<string>();

      list.forEach((creator, index) => {
        creatorKeysForMatching(creator, index).forEach((key) => {
          defaultSelected.add(key);
        });
      });

      setCreators(list);
      setAlreadyInvited(existingKeys);
      setSelected(defaultSelected);
      setSending(new Set());
    } catch (e: any) {
      const message = await getApiErrorMessage(e, "Failed to load creators");

      setError(message);
      setCreators([]);
      setAlreadyInvited(new Set());
      setSelected(new Set());
      setSending(new Set());

      toast({
        icon: "error",
        title: "Unable to load creators",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, fetchExistingInvitations, fetchYouTubeCampaignRecommendations]);

  React.useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  const createInvitationForCreator = React.useCallback(
    async (
      creator: Creator,
      index: number,
      brandId: string,
      currentCampaignId: string
    ) => {
      const platform = getCreatorPlatform(creator);
      const handle =
        getCreatorHandle(creator) ||
        (isYouTubeCreator(creator) ? getCreatorChannelId(creator) : "");

      if (!handle) {
        throw new Error(`${getCreatorName(creator)} handle is missing`);
      }

      if (!platform) {
        throw new Error(`${getCreatorName(creator)} platform is missing`);
      }

      await post("/newinvitations/create", {
        brandId,
        campaignId: currentCampaignId,
        handle,
        platform,
        status: "invited",
        modashUserId: getCreatorModashId(creator) || undefined,
        aiScore: getCreatorAiScore(creator),
        rawAiScore:
          typeof creator.rawAiScore === "number"
            ? creator.rawAiScore
            : undefined,
        recommendationReason: creator.recommendationReason || "",
        emailTemplate: buildInvitationEmailTemplate(creator),
      });

      return creatorKeysForMatching(creator, index);
    },
    []
  );

  const fetchYouTubePreview = React.useCallback(async (creator: Creator) => {
    const channelId = getCreatorChannelId(creator);
    const handle = getCreatorHandle(creator);

    if (!channelId && !handle) {
      throw new Error("YouTube channelId or handle is missing");
    }

    const response = await post<YouTubePreviewResponse>(
      "/youtube/profile/preview",
      {
        ...(channelId ? { channelId } : { handle }),
        videosLimit: 15,
      }
    );

    if (!response?.data) {
      throw new Error("YouTube profile data is missing");
    }

    return mapYouTubePreviewToReport(response.data);
  }, []);

  const fetchModashReport = React.useCallback(
    async (
      creator: Creator,
      calculationMethod: ReportCalculationMethod,
      forceRefresh = false
    ) => {
      const brandId = getStoredBrandMongoId();
      const adminId =
        typeof window !== "undefined"
          ? String(window.localStorage.getItem("adminId") || "").trim()
          : "";

      const userId = getCreatorModashId(creator);
      const platform = getCreatorPlatform(creator);
      const handle = getCreatorHandle(creator).replace(/^@/, "");

      if (!brandId && !adminId) {
        throw new Error("Missing brand/admin id");
      }

      if (!userId) {
        throw new Error("Creator Modash userId is missing");
      }

      if (!platform) {
        throw new Error("Creator platform is missing");
      }

      const response = await api.get<ModashReportResponse>("/modash/report", {
        params: {
          userId,
          platform,
          calculationMethod,
          handle,
          username: handle,
          ...(brandId ? { brandId } : {}),
          ...(adminId && !brandId
            ? {
              adminId,
              role: "admin",
            }
            : {}),
          ...(forceRefresh
            ? {
              refresh: "1",
              force: "1",
            }
            : {}),
        },
      });

      return response.data;
    },
    []
  );

  const fetchCreatorReport = React.useCallback(
    async (
      creator: Creator,
      calculationMethod: ReportCalculationMethod,
      forceRefresh = false
    ) => {
      if (isYouTubeCreator(creator)) {
        return fetchYouTubePreview(creator);
      }

      return fetchModashReport(creator, calculationMethod, forceRefresh);
    },
    [fetchModashReport, fetchYouTubePreview]
  );

  const openReportForCreator = React.useCallback(
    async (
      creator: Creator,
      calculationMethod: ReportCalculationMethod = reportCalculationMethod,
      forceRefresh = false
    ) => {
      setReportDrawer({
        open: true,
        creator,
        loading: true,
        error: null,
        data: null,
        raw: null,
        lastFetchedAt: null,
        calculationMethod,
      });

      try {
        const data = await fetchCreatorReport(
          creator,
          calculationMethod,
          forceRefresh
        );

        setReportDrawer({
          open: true,
          creator,
          loading: false,
          error: null,
          data,
          raw: data,
          lastFetchedAt: getReportLastFetchedAt(data),
          calculationMethod,
        });
      } catch (err: any) {
        const message = await getApiErrorMessage(
          err,
          "Failed to load full Creator profile"
        );

        setReportDrawer({
          open: true,
          creator,
          loading: false,
          error: message,
          data: null,
          raw: null,
          lastFetchedAt: null,
          calculationMethod,
        });

        toast({
          icon: "error",
          title: "Report unavailable",
          text: message,
        });
      }
    },
    [fetchCreatorReport, reportCalculationMethod]
  );

  const closeReportDrawer = React.useCallback(() => {
    setReportDrawer((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  const refreshCurrentReport = React.useCallback(() => {
    if (!reportDrawer.creator) return;

    void openReportForCreator(
      reportDrawer.creator,
      reportDrawer.calculationMethod,
      true
    );
  }, [
    openReportForCreator,
    reportDrawer.creator,
    reportDrawer.calculationMethod,
  ]);

  const handleReportCalcChange = React.useCallback(
    (calc: ReportCalculationMethod) => {
      setReportCalculationMethod(calc);

      if (!reportDrawer.creator) return;

      void openReportForCreator(reportDrawer.creator, calc, false);
    },
    [openReportForCreator, reportDrawer.creator]
  );

  const getNavigateHref = React.useCallback(
    (target: NavigateTarget) => {
      if (target === "dashboard") return "/brand/dashboard";

      if (q === "scheduled-campaign") {
        return "/brand/campaign/scheduled-campaign";
      }

      if (q === "active") {
        return "/brand/campaign/active";
      }

      return "/brand/campaign/all";
    },
    [q]
  );

  const toggleCreatorSelection = React.useCallback(
    (creator: Creator, index: number) => {
      if (bulkCreating) return;

      const keys = creatorKeysForMatching(creator, index);
      const currentlySelected = isCreatorSelected(selected, creator, index);

      setSelected((prev) => {
        const next = new Set(prev);

        keys.forEach((key) => {
          if (currentlySelected) {
            next.delete(key);
          } else {
            next.add(key);
          }
        });

        return next;
      });
    },
    [bulkCreating, selected]
  );

  const handleCreateSelectedAndNavigate = async (target: NavigateTarget) => {
    if (loading || bulkCreating) return;

    if (target === "dashboard") {
      router.replace(getNavigateHref("dashboard"));
      return;
    }

    try {
      const brandId = getStoredBrandMongoId();
      const currentCampaignId = campaignId;

      if (!brandId || !currentCampaignId) {
        throw new Error("Missing brand _id or campaign _id");
      }

      const selectedCreators = creators
        .map((creator, index) => ({
          creator,
          index,
          id: rowId(creator, index),
        }))
        .filter(({ creator, index }) => {
          return isCreatorSelected(selected, creator, index);
        });

      if (!selectedCreators.length) {
        toast({
          icon: "error",
          title: "No creators selected",
          text: "Please select at least one creator before continuing.",
        });

        return;
      }

      const pendingCreators = selectedCreators.filter(({ creator, index }) => {
        return !isCreatorAlreadyInvited(alreadyInvited, creator, index);
      });

      if (!pendingCreators.length) {
        toast({
          icon: "success",
          title: "Already invited",
          text: "Selected creators are already invited for this campaign.",
        });

        return;
      }

      setBulkCreating(true);
      setError(null);

      setSending((prev) => {
        const next = new Set(prev);

        pendingCreators.forEach(({ id }) => {
          next.add(id);
        });

        return next;
      });

      const results = await Promise.allSettled(
        pendingCreators.map(async ({ creator, index }) => {
          const keys = await createInvitationForCreator(
            creator,
            index,
            brandId,
            currentCampaignId
          );

          return {
            creator,
            index,
            keys,
          };
        })
      );

      const succeeded = results.filter(
        (
          result
        ): result is PromiseFulfilledResult<{
          creator: Creator;
          index: number;
          keys: Set<string>;
        }> => result.status === "fulfilled"
      );

      const failed = results.filter((result) => result.status === "rejected");

      if (succeeded.length) {
        setAlreadyInvited((prev) => {
          const next = new Set(prev);

          succeeded.forEach(({ value }) => {
            value.keys.forEach((key) => {
              next.add(key);
            });
          });

          return next;
        });

        setSelected((prev) => {
          const next = new Set(prev);

          succeeded.forEach(({ value }) => {
            value.keys.forEach((key) => {
              next.add(key);
            });
          });

          return next;
        });
      }

      if (failed.length) {
        const message = `${failed.length} invitation${failed.length > 1 ? "s" : ""
          } failed. Please try again.`;

        setError(message);

        toast({
          icon: "error",
          title: "Some invitations failed",
          text: message,
        });

        return;
      }

      setShowConfetti(true);

      window.setTimeout(() => {
        setShowConfetti(false);
      }, 2500);

      toast({
        icon: "success",
        title: "Invitations sent",
        text: `${succeeded.length} creator${succeeded.length > 1 ? "s have" : " has"
          } been invited.`,
      });

      // Stay on this invite page. Do not redirect to the full campaign list.
    } catch (err: any) {
      const message = await getApiErrorMessage(
        err,
        "Failed to create invitations"
      );

      setError(message);

      toast({
        icon: "error",
        title: "Unable to continue",
        text: message,
      });
    } finally {
      setBulkCreating(false);

      setSending((prev) => {
        const next = new Set(prev);

        creators.forEach((creator, index) => {
          next.delete(rowId(creator, index));
        });

        return next;
      });
    }
  };

  const total = creators.length;

  const selectedCount = creators.reduce((count, creator, index) => {
    return isCreatorSelected(selected, creator, index) ? count + 1 : count;
  }, 0);

  const isAllSelected = total > 0 && selectedCount === total;

  const isAnySending = sending.size > 0;
  const footerDisabled = loading || bulkCreating || isAnySending;
  const inviteButtonLabel = isAllSelected ? "Invite All" : "Invite selected";

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-white">
      <style jsx global>{`
        @keyframes creatorRowIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .creator-row-animate {
          animation: creatorRowIn 320ms ease both;
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(279.1% 260.1% at 50% -199.66%, rgba(255, 140, 1, 0.62) 61.31%, rgba(255, 191, 0, 0.54) 72.42%, rgba(255, 255, 255, 0.42) 94.53%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 54%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.78) 54%, rgba(0,0,0,0) 100%)",
        }}
      />

      {mounted && (
        <div
          className="pointer-events-none fixed -top-5 left-1/2 z-[9999] w-full max-w-4xl -translate-x-1/2"
          style={{
            height: "100px",
            overflow: "hidden",
            maxWidth: "20rem",
          }}
        >
          <Confetti
            isActive={showConfetti}
            colors={COLORS}
            particleCount={100}
          />
        </div>
      )}

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col px-6 pt-10">
        <div className="mb-5 shrink-0 rounded-lg px-6 py-5 text-center">
          <h1 className="text-[26px] font-semibold leading-[32px] text-gray-950">
            Invite Creators to Your Campaign
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-[15px] leading-[22px] text-gray-800">
            Creators are selected by default. Deselect anyone you do not want to
            invite.
          </p>

          {error ? (
            <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-transparent">
          <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
            {loading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative mx-2 my-1 rounded-lg bg-white/42 backdrop-blur-[1px] after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-black/5 after:content-[''] last:after:hidden"
                  >
                    <div className="flex min-h-[104px] items-center justify-between gap-5 px-6 py-5">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-gray-200" />

                        <div className="min-w-0 space-y-2 pt-1">
                          <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
                          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-gray-100" />
                          <div className="h-4 w-[420px] max-w-full animate-pulse rounded bg-gray-100" />
                        </div>
                      </div>

                      <div className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-gray-200" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {creators.map((c, index) => {
                  const id = rowId(c, index);
                  const isSelected = isCreatorSelected(selected, c, index);
                  const isSending = sending.has(id);

                  const name = getCreatorName(c);
                  const handle = getCreatorHandle(c);
                  const audienceAuthenticity = getCreatorAudienceAuthenticity(c);
                  const creatorBio = getCreatorBio(c);

                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const mediaKitHref = buildCreatorMediaKitHref(c, campaignId);
                        if (isYouTubeCreator(c) && mediaKitHref) {
                          router.push(mediaKitHref);
                          return;
                        }

                        void openReportForCreator(c);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          const mediaKitHref = buildCreatorMediaKitHref(c, campaignId);
                          if (isYouTubeCreator(c) && mediaKitHref) {
                            router.push(mediaKitHref);
                            return;
                          }

                          void openReportForCreator(c);
                        }
                      }}
                      className="creator-row-animate relative mx-2 my-1 cursor-pointer rounded-lg bg-white/42 backdrop-blur-[1px] transition-transform duration-200 ease-out will-change-transform hover:scale-[0.992] after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-black/5 after:content-[''] last:after:hidden"
                      style={{
                        animationDelay: `${Math.min(index * 30, 240)}ms`,
                        transformOrigin: "center center",
                      }}
                    >
                      <div className="flex min-h-[104px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-6">
                        <div className="flex min-w-0 items-start gap-4">
                          <CreatorAvatar creator={c} name={name} />

                          <div className="min-w-0 pt-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                              <h3 className="truncate text-[18px] font-semibold leading-[24px] text-[#202124] sm:text-[20px] sm:leading-[26px]">
                                {name}
                              </h3>

                              {handle ? (
                                <span className="truncate text-[14px] font-normal leading-[20px] text-[#8E8E8E] sm:text-[15px] sm:leading-[21px]">
                                  {handle}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-[19px] sm:text-[15px] sm:leading-[21px]">
                              <span className="font-medium text-[#202124]">
                                {formatCompact(c.followers)}
                              </span>

                              <span className="font-normal text-[#8E8E8E]">
                                Followers
                              </span>

                              <span className="text-[#B5B5B5]">·</span>

                              <span className="font-semibold text-[#202124]">
                                {c.tier?.key || c.tier?.label || "—"}
                              </span>

                              <span className="font-normal text-[#8E8E8E]">
                                Tier
                              </span>

                            </div>

                            {creatorBio ? (
                              <div className="mt-1.5 line-clamp-1 text-[12px] leading-[18px] text-[#8E8E8E]">
                                {creatorBio}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                          <div className="hidden min-w-[92px] text-right sm:block">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a7a38]">
                              Authenticity
                            </p>
                            <p className={`mt-0.5 text-[20px] font-black leading-none ${getAudienceAuthenticityColorClass(audienceAuthenticity)}`}>
                              {audienceAuthenticity !== null ? `${audienceAuthenticity}%` : "—"}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant={isSelected ? undefined : "outline"}
                            className={
                              isSelected
                                ? "h-10 rounded-full border-2 border-[#202124] bg-[#202124] px-7 text-[15px] font-semibold text-white hover:bg-[#202124] hover:text-white disabled:opacity-60"
                                : "h-10 rounded-full border-2 border-[#202124] bg-white px-7 text-[15px] font-semibold text-[#202124] hover:bg-[#F5F5F5] hover:text-[#202124] disabled:opacity-60"
                            }
                            disabled={isSending || bulkCreating}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleCreatorSelection(c, index);
                            }}
                          >
                            {isSending ? "Sending..." : "Invite"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!creators.length && !error ? (
                  <div className="grid min-h-[220px] place-items-center p-8 text-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        No creators found
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        No creators were returned from the API for this
                        campaign.
                      </p>
                    </div>
                  </div>
                ) : null}

                {!creators.length && error ? (
                  <div className="grid min-h-[220px] place-items-center p-8 text-center">
                    <Button
                      variant="outline"
                      className="rounded-full border-2 px-8"
                      onClick={fetchCreators}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-20 shrink-0 border-t border-black/5 bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 w-full max-w-[1280px] flex-col gap-3 px-6 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold text-gray-800">
            {selectedCount}/{total || 0} Selected
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
            <Button
              variant="outline"
              onClick={() => router.replace(getNavigateHref("dashboard"))}
              className="border-none shadow-none text-sm text-gray-900 disabled:opacity-50"
            >
              Go to Dashboard
            </Button>

            <Button
              onClick={() => handleCreateSelectedAndNavigate("next")}
              className="rounded-lg bg-black px-9 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={footerDisabled || !creators.length || selectedCount === 0}
            >
              {bulkCreating ? "Sending..." : inviteButtonLabel}
            </Button>
          </div>
        </div>
      </footer>

      <ModashReportSideModal
        drawer={reportDrawer}
        onClose={closeReportDrawer}
        onRefresh={refreshCurrentReport}
        onChangeCalc={handleReportCalcChange}
        campaignId={campaignId}
      />
    </div>
  );
}