"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/buttonComp";
import { apiGetPublicCampaign } from "@/app/brand/services/brandApi";

function asArray<T = any>(value: any): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getMediaUrl(item: any): string {
  if (!item) return "";

  if (typeof item === "string") {
    return item.trim();
  }

  if (Array.isArray(item)) {
    return getMediaUrl(item[0]);
  }

  return String(
    item?.dataUrl ??
      item?.url ??
      item?.src ??
      item?.path ??
      item?.image ??
      item?.imageUrl ??
      item?.secure_url ??
      item?.location ??
      item?.fileUrl ??
      ""
  ).trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function buildFallbackSvg(label = "Preview not available") {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <rect width="100%" height="100%" fill="#f3f4f6" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        fill="#6b7280"
        font-size="24"
        font-family="Arial, sans-serif"
      >
        ${label}
      </text>
    </svg>
  `)}`;
}

export default function PublicCampaignPage() {
  const params = useParams();
  const router = useRouter();

  const token = String(
    (params as any)?.token ?? (params as any)?.publictoken ?? ""
  ).trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<any>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Campaign link is invalid.");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const res: any = await apiGetPublicCampaign(token);
        if (cancelled) return;

        const doc = res?.doc ?? res?.data?.doc ?? null;
        if (!doc) {
          throw new Error("Campaign not found");
        }

        setCampaign(doc);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load campaign");
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
  }, [token]);

  const imageItems = useMemo(() => {
    return asArray(campaign?.productImages)
      .map((item: any, idx: number) => {
        const url = getMediaUrl(item);

        return {
          id: String(item?.key || item?.name || `img-${idx}`),
          url,
          alt: String(item?.name || `Campaign image ${idx + 1}`),
        };
      })
      .filter((item) => Boolean(item.url));
  }, [campaign?.productImages]);

  const imageUrls = imageItems.map((item) => item.url);
  const logoUrl = imageUrls[0] || "";

  useEffect(() => {
    setActiveSlide(0);
  }, [imageItems.length]);

  const budget = Number(campaign?.campaignBudget ?? campaign?.budget ?? 0);
  const budgetText = budget ? `USD ${budget.toLocaleString("en-US")}` : "—";

  const startDateText = formatDate(campaign?.startAt);
  const endDateText = formatDate(campaign?.endAt);

  const platformText =
    Array.isArray(campaign?.platformSelection) && campaign.platformSelection.length
      ? campaign.platformSelection.join(", ")
      : "—";

  const campaignTypeText = campaign?.campaignType || "—";
  const paymentTypeText = campaign?.paymentType || "—";

  const authQuery = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("campaignToken", token);

    if (campaign?.campaignId) {
      qs.set("campaignId", String(campaign.campaignId));
    }

    qs.set("returnTo", `/campaign/share/${token}`);
    return qs.toString();
  }, [token, campaign?.campaignId]);

  const goToSignup = () => {
    router.push(`/influencer/signup?${authQuery}`);
  };

  const goToLogin = () => {
    router.push(`/influencer/login?${authQuery}`);
  };

  const scrollToSlide = (idx: number) => {
    const el = carouselRef.current;
    if (!el || imageItems.length === 0) return;

    const clamped = Math.max(0, Math.min(idx, imageItems.length - 1));
    const child = el.children.item(clamped) as HTMLElement | null;

    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#E6E6E6] bg-white p-6">
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 h-60 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E6E6E6] bg-white p-6">
          <div className="text-lg font-semibold text-[#1A1A1A]">
            Campaign not available
          </div>
          <p className="mt-2 text-sm text-red-600">
            {error || "This campaign is unavailable."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-[#E6E6E6] bg-white">
          <div className="bg-gradient-to-r from-[#111111] to-[#2B2B2B] px-6 py-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={campaign?.campaignTitle || "Campaign"}
                      className="h-full w-full object-cover"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = buildFallbackSvg("No image");
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {String(campaign?.campaignTitle ?? "C")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium">
                    {campaign?.brandName || "Brand"}
                  </div>

                  <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                    {campaign?.campaignTitle || "Campaign"}
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                    Join this campaign as an influencer. Create your account to
                    apply, or log in if you already have one.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {campaignTypeText}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {paymentTypeText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  variant="raised"
                  size="sm"
                  onClick={goToSignup}
                  className="my-0 h-11 rounded-xl border border-black bg-white px-5 text-black shadow-none hover:bg-white"
                >
                  <span className="font-semibold">Sign up to apply</span>
                </Button>

                <Button
                  variant="raised"
                  size="sm"
                  onClick={goToLogin}
                  className="my-0 h-11 rounded-xl border border-white/20 bg-transparent px-5 text-white shadow-none hover:bg-white/10"
                >
                  <span className="font-semibold text-white">
                    Already have an account? Log in
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E6E6E6] p-4">
              <div className="text-sm text-[#969696]">Status</div>
              <div className="mt-2 text-base font-semibold text-[#1A1A1A]">
                {campaign?.status || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E6E6] p-4">
              <div className="text-sm text-[#969696]">Budget</div>
              <div className="mt-2 text-base font-semibold text-[#1A1A1A]">
                {budgetText}
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E6E6] p-4">
              <div className="text-sm text-[#969696]">Start date</div>
              <div className="mt-2 text-base font-semibold text-[#1A1A1A]">
                {startDateText}
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E6E6] p-4">
              <div className="text-sm text-[#969696]">End date</div>
              <div className="mt-2 text-base font-semibold text-[#1A1A1A]">
                {endDateText}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#E6E6E6] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Description</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#1A1A1A]">
            {campaign?.description || "—"}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.25rem] border border-[#E6E6E6] bg-white p-6">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">
              Campaign Details
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-[#F1F1F1] pb-3">
                <span className="text-[#969696]">Campaign Type</span>
                <span className="text-right font-medium text-[#1A1A1A]">
                  {campaignTypeText}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-[#F1F1F1] pb-3">
                <span className="text-[#969696]">Payment Type</span>
                <span className="text-right font-medium text-[#1A1A1A]">
                  {paymentTypeText}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-[#E6E6E6] bg-white p-6">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">
              Ready to Apply?
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#4B5563]">
              Create your influencer account to apply for this campaign and continue
              onboarding. If you already have an account, log in and continue with
              your application.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="raised"
                size="sm"
                onClick={goToSignup}
                className="my-0 h-11 rounded-xl border border-black bg-black px-5 text-white shadow-none hover:bg-black"
              >
                <span className="font-semibold text-white">Create account</span>
              </Button>

              <Button
                variant="raised"
                size="sm"
                onClick={goToLogin}
                className="my-0 h-11 rounded-xl border border-[#E6E6E6] bg-white px-5 text-black shadow-none hover:bg-white"
              >
                <span className="font-semibold">Log in</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#E6E6E6] bg-white p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            Images / References
          </h2>

          {imageItems.length ? (
            <>
              <div
                ref={carouselRef}
                onScroll={onCarouselScroll}
                className="mt-5 flex gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {imageItems.map((item) => (
                  <div
                    key={item.id}
                    className="w-[18rem] flex-none overflow-hidden rounded-[1rem] border border-[#E6E6E6] bg-[#F8F8F8]"
                  >
                    <div className="h-[14rem] w-full overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error("Image failed to load:", item.url);
                          e.currentTarget.src = buildFallbackSvg();
                        }}
                      />
                    </div>

                    <div className="border-t border-[#E6E6E6] px-3 py-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[#1A1A1A] underline"
                      >
                        Open image
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="raised"
                  size="sm"
                  onClick={() => scrollToSlide(activeSlide - 1)}
                  disabled={activeSlide <= 0}
                  className="my-0 rounded-xl border border-[#E6E6E6] bg-white shadow-none"
                  leftIcon={<CaretLeft weight="bold" />}
                >
                  Prev
                </Button>

                <div className="flex gap-2">
                  {imageItems.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToSlide(i)}
                      className={`h-2 w-2 rounded-full ${
                        i === activeSlide ? "bg-black" : "bg-[#E5E5E5]"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="raised"
                  size="sm"
                  onClick={() => scrollToSlide(activeSlide + 1)}
                  disabled={activeSlide >= imageItems.length - 1}
                  className="my-0 rounded-xl border border-[#E6E6E6] bg-white shadow-none"
                  leftIcon={<CaretRight weight="bold" />}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-5 text-sm text-[#969696]">No images available</div>
          )}
        </div>
      </div>
    </div>
  );
}