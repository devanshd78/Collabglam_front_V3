"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Globe,
  Heart,
  Mail,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

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

type BrandMediaKitData = {
  creatorOverview?: {
    creatorName?: string;
    channelName?: string;
    profilePhoto?: string;
    bannerImage?: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function getApiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function formatNumber(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatFullNumber(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en").format(n);
}

function formatPercent(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100) / 100}%`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreOrZero(value?: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function getScoreColorClass(value?: number) {
  const score = scoreOrZero(value);
  if (score >= 75) return "text-[#16803a]";
  if (score >= 35) return "text-[#b7791f]";
  return "text-[#dc2626]";
}

function getScoreBarClass(value?: number) {
  const score = scoreOrZero(value);
  if (score >= 75) return "bg-[#16a34a]";
  if (score >= 35) return "bg-[#f59e0b]";
  return "bg-[#dc2626]";
}

function getCleanSummary(value?: string) {
  return String(value || "")
    .replace(/\bYouTube creator\b/gi, "creator")
    .replace(/\bYoutube creator\b/gi, "creator")
    .replace(/\bcampaign fit score\b/gi, "match score")
    .replace(/\bcampaign-fit score\b/gi, "match score")
    .replace(/\s+/g, " ")
    .trim();
}

function proxyImageUrl(url?: string) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return raw;
  return getApiUrl(`/youtube-data/image-proxy?url=${encodeURIComponent(raw)}`);
}

function getHeroBackgroundImage(data?: BrandMediaKitData | null) {
  const banner = data?.creatorOverview?.bannerImage;
  if (banner) return banner;

  const videoImage =
    data?.topPerformingVideos?.find((video) => video.thumbnail)?.thumbnail ||
    data?.recentVideos?.find((video) => video.thumbnail)?.thumbnail ||
    "";

  return videoImage || data?.creatorOverview?.profilePhoto || "";
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#efdba5] bg-[#fff8e6] px-3 py-1 text-xs font-semibold text-[#7a5a16]">
      {children}
    </span>
  );
}

function ScoreCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  hint?: string;
}) {
  const finalValue = scoreOrZero(value);

  return (
    <div className="rounded-[22px] border border-[#f1e2c2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
          {icon}
        </div>
        <div className="text-right">
          <p className={`text-[28px] font-black leading-none ${getScoreColorClass(finalValue)}`}>{finalValue}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#9a8a73]">/100</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-black">{label}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-[#80725d]">{hint}</p> : null}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f1e2c2]">
        <div
          className={`h-full rounded-full ${getScoreBarClass(finalValue)}`}
          style={{ width: `${finalValue}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[#f1e2c2] bg-white/95 p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
        {icon || <Sparkles className="h-5 w-5" />}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9a8a73]">{label}</p>
      <p className="mt-1 text-[24px] font-black text-black">{value}</p>
      {sub ? <p className="mt-1 text-xs leading-5 text-[#80725d]">{sub}</p> : null}
    </div>
  );
}

function Section({
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
    <section className={`rounded-[26px] border border-[#f1e2c2] bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-center gap-2">
        {icon ? <span className="text-[#b7791f]">{icon}</span> : null}
        <h2 className="text-[18px] font-black text-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

async function fetchMediaKit(channelId: string, queryValues: Record<string, string>) {
  const params = new URLSearchParams();
  ["keyword", "category", "country"].forEach((key) => {
    const value = queryValues[key];
    if (value) params.set(key, value);
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

function MediaKitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = String(searchParams.get("channelId") || "").trim();
  const campaignId = String(searchParams.get("campaignId") || "").trim();
  const returnTo = String(searchParams.get("returnTo") || "").trim();

  const queryValues = useMemo(
    () => ({
      keyword: String(searchParams.get("keyword") || "").trim(),
      category: String(searchParams.get("category") || "").trim(),
      country: String(searchParams.get("country") || "").trim(),
    }),
    [searchParams],
  );

  const [data, setData] = useState<BrandMediaKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!channelId) {
        setError("Missing YouTube channel id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const mediaKit = await fetchMediaKit(channelId, queryValues);
        if (mounted) setData(mediaKit);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load media kit");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [channelId, queryValues.keyword, queryValues.category, queryValues.country]);

  const overview = data?.creatorOverview;
  const metrics = data?.coreMetrics;
  const scores = data?.performanceScores;
  const audience = data?.audienceInsights;
  const brandFit = data?.brandFit;
  const content = data?.contentAnalysis;
  const sponsorship = data?.sponsorshipAnalysis;
  const safety = data?.brandSafety;
  const prediction = data?.campaignPrediction;
  const contact = data?.contact;
  const recommendation = data?.collabGlamRecommendation;
  const heroBackgroundImage = getHeroBackgroundImage(data);
  const topVideos = data?.topPerformingVideos || [];
  const recentVideos = data?.recentVideos || [];
  const breadcrumbSourceLabel = returnTo === "invitation" ? "Invite creators" : "Browse influencers";
  const breadcrumbSourceHref = returnTo === "invitation" && campaignId
    ? `/brand/influencer-invitation?q=active&campaignId=${encodeURIComponent(campaignId)}`
    : "/brand/browse-influencer";

  return (
    <main className="min-h-screen bg-[#fffdf9]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,#fff3c4_0%,#fff9ea_38%,rgba(255,255,255,0)_78%)] opacity-70" />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-7 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push(breadcrumbSourceHref)}
            className="font-semibold text-[#6f624e] transition hover:text-black"
          >
            {breadcrumbSourceLabel}
          </button>
          <span className="text-[#b7aa92]">/</span>
          <span className="font-bold text-black">Media kit</span>
        </nav>

        {loading ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="max-w-[520px] rounded-[32px] border border-[#f1e2c2] bg-white p-9 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-black">Building brand media kit</h1>
              <p className="mt-2 text-sm leading-6 text-[#7d725f]">
                Preparing audience, authenticity, performance, safety, sponsorship, and campaign prediction insights.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="max-w-[520px] rounded-[32px] border border-red-100 bg-white p-9 text-center shadow-sm">
              <h1 className="text-2xl font-black text-black">Media kit unavailable</h1>
              <p className="mt-2 text-sm leading-6 text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[34px] border border-[#eadfcb] bg-white shadow-[0_18px_45px_rgba(120,83,20,0.08)]">
              {heroBackgroundImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
                  style={{ backgroundImage: `url(${proxyImageUrl(heroBackgroundImage)})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-br from-white via-white/95 to-[#fff7e2]/85" />

              <div className="relative grid gap-0 lg:grid-cols-[1.18fr_0.82fr]">
                <div className="p-7 sm:p-9">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#f7efe0] shadow-[0_8px_22px_rgba(0,0,0,0.10)] ring-1 ring-[#eadfcb]">
                      {overview?.profilePhoto ? (
                        <img
                          src={proxyImageUrl(overview.profilePhoto)}
                          alt={overview?.creatorName || "Creator"}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-4xl font-black text-[#8a6a2a]">
                          {(overview?.creatorName || "C").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {overview?.creatorTier ? <Pill>{overview.creatorTier}</Pill> : null}
                        {overview?.category ? <Pill>{overview.category}</Pill> : null}
                        {overview?.primaryLanguage ? <Pill>{overview.primaryLanguage}</Pill> : null}
                      </div>
                      <h1 className="text-[36px] font-black leading-tight text-black sm:text-[44px]">
                        {overview?.creatorName || overview?.channelName || "Creator"}
                      </h1>
                      <p className="mt-3 max-w-[640px] line-clamp-2 text-sm leading-6 text-[#6f6658]">
                        {getCleanSummary(recommendation?.summary) ||
                          "Brand-ready creator profile with performance, audience, safety, and match-score signals."}
                      </p>
                      {contact?.maskedEmail ? (
                        <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[#eadfcb] bg-white/85 px-3.5 py-2 text-xs font-bold text-[#5f4b24] shadow-sm backdrop-blur">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-[#9a6500]" />
                          <span className="truncate">{contact.maskedEmail}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eadfcb] bg-[#fffaf0]/90 p-7 text-black backdrop-blur-sm sm:p-9 lg:border-l lg:border-t-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6440]">Match score</p>
                  <p className="mt-2 text-[46px] font-black leading-none text-black">
                    {scoreOrZero(scores?.campaignFitScore || scores?.relevancyScore)}
                  </p>
                  <p className="mt-2 text-lg font-black text-black">
                    {brandFit?.campaignFit || recommendation?.recommendation || "Brand Match"}
                  </p>
                  <div className="mt-7 grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#7a6440]">Authenticity</p>
                      <p className={`mt-1 text-3xl font-black ${getScoreColorClass(scores?.authenticityScore)}`}>
                        {scoreOrZero(scores?.authenticityScore)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-[#7a6440]">Safety</p>
                      <p className={`mt-1 text-3xl font-black ${getScoreColorClass(scores?.brandSafetyScore)}`}>
                        {scoreOrZero(scores?.brandSafetyScore)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Subscribers" value={formatNumber(metrics?.subscribers)} sub={formatFullNumber(metrics?.subscribers)} icon={<Users className="h-5 w-5" />} />
              <MetricCard label="Average views" value={formatNumber(metrics?.avgViews)} sub="Recent video average" icon={<PlayCircle className="h-5 w-5" />} />
              <MetricCard label="Engagement" value={formatPercent(metrics?.engagementRate)} sub="Likes + comments / views" icon={<Heart className="h-5 w-5" />} />
              <MetricCard label="Recent upload" value={formatDate(metrics?.recentUploadDate)} sub={`${metrics?.uploadsLast2Years || 0} uploads in 2 years`} icon={<CalendarDays className="h-5 w-5" />} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ScoreCard icon={<Target className="h-5 w-5" />} label="Relevancy" value={scores?.relevancyScore} hint="Campaign topic and content match" />
              <ScoreCard icon={<ShieldCheck className="h-5 w-5" />} label="Brand safety" value={scores?.brandSafetyScore} hint={safety?.riskLevel ? `${safety.riskLevel} risk` : "Risk screening"} />
              <ScoreCard icon={<Users className="h-5 w-5" />} label="Authenticity" value={scores?.authenticityScore} hint="Audience quality" />
              <ScoreCard icon={<TrendingUp className="h-5 w-5" />} label="Consistency" value={scores?.consistencyScore} hint="Upload activity and stability" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Section title="Audience Insights" icon={<Globe className="h-5 w-5" />}>
                <div className="space-y-4">
                  {(audience?.estimatedAudienceCountries || []).length ? (
                    audience?.estimatedAudienceCountries?.map((item) => (
                      <div key={item.country}>
                        <div className="mb-2 flex items-center justify-between text-sm font-bold text-black">
                          <span>{item.country}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f1e2c2]">
                          <div className="h-full rounded-full bg-[#d97706]" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  ) : null}
                  {(audience?.interestCategories || []).length ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {audience?.interestCategories?.slice(0, 12).map((item) => <Pill key={item}>{item}</Pill>)}
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section title="Brand Fit" icon={<CheckCircle2 className="h-5 w-5" />}>
                {(brandFit?.whyThisCreatorFits || []).length ? (
                  <ul className="space-y-3">
                    {brandFit?.whyThisCreatorFits?.slice(0, 5).map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-[#655b4d]">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3c4] text-[#9a6500]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-[#655b4d]">This creator has been matched using campaign topic, performance, safety, and audience signals.</p>
                )}
              </Section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Section title="Reach & Performance" icon={<BarChart3 className="h-5 w-5" />} className="lg:col-span-2">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label="Total views" value={formatNumber(metrics?.totalViews)} sub={formatFullNumber(metrics?.totalViews)} />
                  <MetricCard label="Total videos" value={formatFullNumber(metrics?.totalVideos)} />
                  <MetricCard label="Median views" value={formatNumber(metrics?.medianViews)} />
                  <MetricCard label="Avg likes" value={formatNumber(metrics?.avgLikes)} />
                  <MetricCard label="Avg comments" value={formatNumber(metrics?.avgComments)} />
                  <MetricCard label="View/sub ratio" value={formatPercent(metrics?.viewToSubscriberRatio)} />
                </div>
              </Section>

              <Section title="Content Breakdown" icon={<Zap className="h-5 w-5" />}>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-bold text-black">
                      <span>Long-form</span>
                      <span>{content?.longFormPercentage || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1e2c2]"><div className="h-full rounded-full bg-[#d97706]" style={{ width: `${content?.longFormPercentage || 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-sm font-bold text-black">
                      <span>Shorts</span>
                      <span>{content?.shortsPercentage || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1e2c2]"><div className="h-full rounded-full bg-[#facc15]" style={{ width: `${content?.shortsPercentage || 0}%` }} /></div>
                  </div>
                  <div className="rounded-[18px] bg-[#fff8e6] p-4 text-sm font-semibold text-[#6f5a2c]">
                    {content?.contentType || "Original creator content"} · {content?.uploadFrequency || "Active"}
                  </div>
                </div>
              </Section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Section title="Sponsorship Experience" icon={<Sparkles className="h-5 w-5" />}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Sponsored videos" value={sponsorship?.sponsoredVideosDetected || 0} />
                  <MetricCard label="Frequency" value={formatPercent(sponsorship?.sponsorshipFrequency)} />
                  <MetricCard label="Readiness" value={sponsorship?.collaborationReadiness || "Medium"} />
                </div>
                {(sponsorship?.recentSponsors || []).length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {sponsorship?.recentSponsors?.slice(0, 10).map((sponsor) => <Pill key={sponsor}>{sponsor}</Pill>)}
                  </div>
                ) : null}
              </Section>

              <Section title="Campaign Prediction" icon={<TrendingUp className="h-5 w-5" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Expected views low" value={formatNumber(prediction?.expectedViewsLow)} />
                  <MetricCard label="Expected views high" value={formatNumber(prediction?.expectedViewsHigh)} />
                  <MetricCard label="Expected engagement low" value={formatNumber(prediction?.expectedEngagementLow)} />
                  <MetricCard label="Expected engagement high" value={formatNumber(prediction?.expectedEngagementHigh)} />
                </div>
                {(prediction?.recommendedDeliverables || []).length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {prediction?.recommendedDeliverables?.map((item) => <Pill key={item}>{item}</Pill>)}
                  </div>
                ) : null}
              </Section>
            </div>

            {(topVideos.length || recentVideos.length) ? (
              <Section title="Top Creator Content" icon={<PlayCircle className="h-5 w-5" />} className="mt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(topVideos.length ? topVideos : recentVideos).slice(0, 6).map((video, index) => (
                    <article key={`${video.videoId || video.title || index}`} className="overflow-hidden rounded-[20px] border border-[#f1e2c2] bg-[#fffdf7]">
                      {video.thumbnail ? (
                        <div className="aspect-video bg-[#fff3c4]">
                          <img src={proxyImageUrl(video.thumbnail)} alt={video.title || "Video"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <div className="p-4">
                        <h3 className="line-clamp-2 text-sm font-black leading-5 text-black">{video.title || "Untitled video"}</h3>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#7d725f]">
                          <span>{formatNumber(video.views)} views</span>
                          <span>·</span>
                          <span>{formatNumber(video.likes)} likes</span>
                          <span>·</span>
                          <span>{formatNumber(video.comments)} comments</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

          </>
        )}
      </div>
    </main>
  );
}

export default function BrandMediaKitPage() {
  return (
    <Suspense fallback={null}>
      <MediaKitPageContent />
    </Suspense>
  );
}
