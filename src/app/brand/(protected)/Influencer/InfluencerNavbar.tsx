"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useInfluencerCounts } from "./InfluencerCountsContext";
import {
  apiCampaignViewByBrand,
  getApiErrorMessage,
} from "@/app/brand/services/brandApi";

type TabKey =
  | "all influencer"
  | "applied"
  | "active"
  | "shortlisted"
  | "undecided"
  | "rejected";

type TabItem = {
  key: TabKey;
  label: string;
  href: string;
  showCount?: boolean;
};

export default function CampaignNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { counts } = useInfluencerCounts();

  const campaignId = (
    searchParams.get("campaignId") ||
    searchParams.get("id") ||
    ""
  ).trim();
  const campaignTitleFromUrl = useMemo(() => {
    return String(
      searchParams.get("campaignTitle") ||
      searchParams.get("campaignName") ||
      searchParams.get("name") ||
      ""
    ).trim();
  }, [searchParams]);

  useEffect(() => {
    if (campaignTitleFromUrl) {
      setCampaignTitle(campaignTitleFromUrl);
    }
  }, [campaignTitleFromUrl]);

  const [brandId, setBrandId] = useState("");
  const [isAdminCreatedCampaign, setIsAdminCreatedCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");



  useEffect(() => {
    const id =
      localStorage.getItem("brandId") ||
      localStorage.getItem("brandID") ||
      localStorage.getItem("brand_id") ||
      "";

    setBrandId(id);
  }, []);

  useEffect(() => {
    if (!brandId || !campaignId) {
      setIsAdminCreatedCampaign(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const res: any = await apiCampaignViewByBrand({
          brandId,
          campaignId,
        });

        if (cancelled) return;

        const campaign = ((res as any)?.data?.doc ??
          (res as any)?.doc ??
          res) as any;

        const createdByRole = String(campaign?.createdBy?.role ?? "")
          .trim()
          .toLowerCase();

        const title = String(
          campaign?.campaignName ||
          campaign?.campaignTitle ||
          campaign?.title ||
          campaign?.name ||
          campaign?.productOrServiceName ||
          ""
        ).trim();

        if (title) {
          setCampaignTitle(title);
        }

        setIsAdminCreatedCampaign(createdByRole === "admin");
      } catch (e) {
        if (cancelled) return;

        console.error(
          getApiErrorMessage(e, "Failed to load campaign creator role")
        );

        setIsAdminCreatedCampaign(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [brandId, campaignId]);

  const withCampaignParams = (href: string) => {
    const [baseHref, existingQuery = ""] = href.split("?");

    const params = new URLSearchParams(existingQuery);
    const currentParams = new URLSearchParams(searchParams.toString());

    currentParams.forEach((value, key) => {
      params.set(key, value);
    });

    if (campaignId) {
      params.set("campaignId", campaignId);
    }

    const title = String(
      campaignTitle ||
      campaignTitleFromUrl ||
      searchParams.get("campaignName") ||
      searchParams.get("campaignTitle") ||
      ""
    ).trim();

    if (title) {
      params.set("campaignName", title);
      params.set("campaignTitle", title);
    }

    const queryString = params.toString();

    return queryString ? `${baseHref}?${queryString}` : baseHref;
  };

  const tabs: TabItem[] = [
    {
      key: "all influencer",
      label: "All Influencer",
      href: "/brand/Influencer/all",
    },
    {
      key: "applied",
      label: "Applied",
      href: "/brand/Influencer/applied",
    },
    {
      key: "active",
      label: "Active",
      href: "/brand/Influencer/active",
    },
    {
      key: "shortlisted",
      label: "Shortlisted",
      href: "/brand/Influencer/shortlisted",
    },
    {
      key: "rejected",
      label: "Rejected",
      href: "/brand/Influencer/rejected",
    },
  ];

  const visibleTabs = useMemo(() => {
    if (isAdminCreatedCampaign) {
      return tabs.filter((tab) => tab.key === "active");
    }

    return tabs;
  }, [isAdminCreatedCampaign]);

  const tabCounts: Record<TabKey, number> = {
    "all influencer": counts.all,
    applied: counts.applied,
    active: counts.active,
    shortlisted: counts.shortlisted,
    undecided: counts.undecided,
    rejected: counts.rejected,
  };

  const isActiveHref = (href: string) =>
    pathname === href || (pathname?.startsWith(href) ?? false);

  return (
    <header className="flex w-full items-center justify-between border-b border-neutral-200 bg-background px-4 md:px-6">
      <nav
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-xs overflow-x-auto whitespace-nowrap"
        aria-label="Influencer filters"
      >
        {visibleTabs.map((t) => {
          const isActive = isActiveHref(t.href);
          const count = tabCounts[t.key];
          const shouldShowCount = t.showCount !== false;

          return (
            <Link
              key={t.key}
              href={withCampaignParams(t.href)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex shrink-0 items-center justify-center",
                "h-12 md:h-14",
                "px-3 sm:px-4",
                "border-0 border-b-2",
                "text-xs sm:text-sm md:text-base",
                "transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900/35 focus-visible:outline-offset-2",
                isActive
                  ? "border-neutral-900 text-neutral-900 font-semibold"
                  : "border-transparent text-neutral-600 font-medium hover:text-neutral-900 hover:border-neutral-300",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-[var(--Spacing-8,0.5rem)]">
                <span>{t.label}</span>

                {shouldShowCount ? (
                  <span
                    className={[
                      "inline-flex items-center justify-center",
                      "w-6 h-6",
                      "shrink-0",
                      "rounded-[1.25rem]",
                      "border border-[var(--Light-Border-Subtle,#E6E6E6)]",
                      "font-[Inter]",
                      "text-[0.75rem]",
                      "font-semibold",
                      "leading-none",
                      isActive ? "text-neutral-900" : "text-neutral-600",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {!isAdminCreatedCampaign ? (
        <div className="ml-3 flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => router.push(withCampaignParams("/brand/influencer/invite"))}
            className={[
              "inline-flex items-center justify-center",
              "h-9 md:h-10",
              "gap-xs",
              "rounded-s border border-neutral-200 bg-white",
              "px-3 md:px-4",
              "text-xs sm:text-sm md:text-sm",
              "font-medium text-neutral-900",
              "shadow-none",
              "transition-colors",
              "hover:bg-neutral-50",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900/35 focus-visible:outline-offset-2",
              "whitespace-nowrap",
            ].join(" ")}
          >
            <Plus className="shrink-0" />
            <span className="hidden sm:inline">Invite</span>
            <span className="sm:hidden">Invite</span>
          </button>
        </div>
      ) : null}
    </header>
  );
}
