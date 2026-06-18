"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TopbarAction } from "./brandTopbarProvider";
import NotificationCard from "./notificationCard";
import { apiGetBrandLite } from "@/app/brand/services/brandApi";
import {
  BellIcon,
  CaretDownIcon,
  CaretRightIcon,
  ListDashes,
} from "@phosphor-icons/react";

/* -------- tiny util (keeps this file standalone) -------- */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

type BrandLiteFeature = {
  key?: string | null;
  value?: string | number | null;
  limit?: number | null;
  used?: number | null;
  note?: string | null;
  resetsEvery?: string | null;
  resetsAt?: string | null;
};

type BrandLiteSubscription = {
  brandPlanId?: string | null;
  brandPlanName?: string | null;
  plan?: string | null;
  status?: string | null;
  features?: BrandLiteFeature[] | null;
};

type BrandLiteRes = {
  brandId?: string | null;
  name?: string | null;
  proxyEmail?: string | null;
  profilePic?: string | null;
  subscriptionDetails?: BrandLiteSubscription | null;
  subscription?: BrandLiteSubscription | null;
  features?: BrandLiteFeature[] | null;
};

const LABELS: Record<string, string> = {
  brand: "Brand",
  overview: "Overview",
  hub: "Influencer Hub",
  campaigns: "Campaigns",
  inbox: "Inbox",
  wallet: "Wallet",
  browse: "Browse Influencers",
  influ: "Influencer",
  active: "Active",
  "create-camapign": "Create Campaign",
};

const CREDIT_LABELS: Record<string, string> = {
  influencer_search_per_month: "Influencer Search",
  influencer_profile_views_per_month: "Influencer Profile Views",
  invites_per_month: "Invites Per Month",
  active_campaigns: "Active Campaign",
};

function titleize(seg: string) {
  const s = seg.replace(/[-_]/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  let href = "";
  const crumbs: { href: string; label: string }[] = [];

  segments.forEach((seg) => {
    href += `/${seg}`;

    if (seg === "brand") return;

    const decoded = safeDecodeURIComponent(seg);

    crumbs.push({
      href,
      label: LABELS[seg] ?? LABELS[decoded] ?? titleize(decoded),
    });
  });

  return crumbs;
}

function safeDecodeURIComponent(v: string) {
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

function getCampaignTitleFromSearch(searchParams: ReturnType<typeof useSearchParams>) {
  return (
    searchParams.get("campaignTitle") ||
    searchParams.get("campaignName") ||
    searchParams.get("name") ||
    ""
  );
}

function applyCampaignTitleToCrumbs(
  crumbs: { href: string; label: string }[],
  pathname: string,
  campaignTitle: string,
  campaignId?: string | null
) {
  const safeTitle = safeDecodeURIComponent(campaignTitle).trim();
  if (!safeTitle) return crumbs;

  const segments = pathname.split("/").filter(Boolean);
  const lowerSegments = segments.map((seg) => seg.toLowerCase());

  /**
   * Special case:
   * /brand/Influencer/active?campaignId=...&campaignName=...
   *
   * Breadcrumb should be:
   * Influencer > CampaignName > Active
   */
  const influencerIndex = lowerSegments.indexOf("influencer");

  if (influencerIndex >= 0 && segments[influencerIndex + 1]) {
    const influencerHref = `/${segments.slice(0, influencerIndex + 1).join("/")}`;

    const campaignHref = campaignId
      ? `${pathname}?campaignId=${encodeURIComponent(
        campaignId
      )}&campaignName=${encodeURIComponent(safeTitle)}`
      : `${pathname}?campaignName=${encodeURIComponent(safeTitle)}`;

    const nextCrumbs: { href: string; label: string }[] = [];

    crumbs.forEach((crumb) => {
      nextCrumbs.push(crumb);

      if (crumb.href === influencerHref) {
        nextCrumbs.push({
          href: campaignHref,
          label: safeTitle,
        });
      }
    });

    return nextCrumbs;
  }

  /**
   * Existing campaign route support:
   * /brand/campaign/:id?campaignName=...
   */
  const campaignIndex = lowerSegments.indexOf("campaign");

  if (campaignIndex < 0 || !segments[campaignIndex + 1]) {
    return crumbs;
  }

  const campaignIdHref = `/${segments.slice(0, campaignIndex + 2).join("/")}`;

  return crumbs.map((crumb) =>
    crumb.href === campaignIdHref ? { ...crumb, label: safeTitle } : crumb
  );
}


function getDefaultActions(pathname: string): TopbarAction[] {
  if (pathname.startsWith("/brand/campaigns")) {
    return [
      {
        key: "create",
        label: "Create Campaign",
        href: "/brand/create-camapign",
        variant: "primary",
      },
    ];
  }
  return [];
}

function normaliseNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function prettifyFeatureLabel(key?: string | null) {
  const safeKey = String(key || "").trim();
  if (!safeKey) return "Credit";
  if (CREDIT_LABELS[safeKey]) return CREDIT_LABELS[safeKey];
  return safeKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getProgressColor(progress: number) {
  if (progress >= 0.6) return "#F04438";
  return "#22C55E";
}

function ActionButton({ action }: { action: TopbarAction }) {
  if ("static" in action) {
    return (
      <div
        className={[
          "inline-flex items-center gap-2",
          "text-[13px] sm:text-[14px] font-semibold text-[#1A1A1A]",
          action.disabled ? "opacity-50" : "",
          action.className ?? "",
        ].join(" ")}
        aria-disabled={action.disabled}
      >
        {action.icon ? <span className="shrink-0">{action.icon}</span> : null}
        {action.label ? (
          <span className="whitespace-nowrap">{action.label}</span>
        ) : null}
      </div>
    );
  }

  const base =
    "h-9 sm:h-10 px-3 sm:px-4 rounded-lg text-[13px] sm:text-[14px] font-semibold transition inline-flex items-center gap-2 " +
    "whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

  const secondary = "bg-transparent text-[#1A1A1A] hover:bg-[#F5F5F5]";
  const primary = "bg-[#1A1A1A] text-white hover:bg-black";
  const cls = `${base} ${action.variant === "primary" ? primary : secondary
    } ${action.className ?? ""}`;

  const content = (
    <>
      {action.icon ? <span className="shrink-0">{action.icon}</span> : null}
      {action.label ? (
        <span className="whitespace-nowrap">{action.label}</span>
      ) : null}
    </>
  );

  if ("href" in action) {
    return (
      <Link className={cls} href={action.href} aria-disabled={action.disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button
      className={cls}
      onClick={action.onClick}
      disabled={action.disabled}
      type="button"
    >
      {content}
    </button>
  );
}

export default function BrandTopbar({
  actionsOverride,
  onMenuToggle,
}: {
  actionsOverride?: TopbarAction[];
  onMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const topbarRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const creditsCloseTimeoutRef = useRef<number | null>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandLite, setBrandLite] = useState<BrandLiteRes | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [creditsPosition, setCreditsPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const showHamburger = !isDesktop && Boolean(onMenuToggle);

  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;

    const setVar = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--brand-topbar-h",
        `${Math.ceil(h)}px`
      );
    };

    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedBrandId =
      window.localStorage.getItem("brandId") ||
      window.localStorage.getItem("currentBrandId");

    if (storedBrandId) setBrandId(storedBrandId);
  }, []);

  useEffect(() => {
    if (!brandId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiGetBrandLite(brandId);
        if (!cancelled) setBrandLite(data ?? null);
      } catch {
        if (!cancelled) setBrandLite(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const creditUsageItems = useMemo(() => {
    const features =
      brandLite?.subscriptionDetails?.features ??
      brandLite?.subscription?.features ??
      brandLite?.features ??
      [];

    return features.slice(0, 4).map((item) => {
      const limit = normaliseNumber(item?.limit);
      const used = normaliseNumber(item?.used);
      const isUnlimited = limit === -1;
      const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
      const progress = !isUnlimited && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

      return {
        key: String(item?.key || ""),
        label: prettifyFeatureLabel(item?.key),
        limit,
        used,
        isUnlimited,
        remaining,
        progress,
        color: getProgressColor(!isUnlimited && limit > 0 ? used / limit : 0),
      };
    });
  }, [brandLite]);

  const remainingCredits = useMemo(() => {
    const hasUnlimitedFeature = creditUsageItems.some((item) => item.isUnlimited);
    if (hasUnlimitedFeature) return "∞";

    return creditUsageItems.reduce((sum, item) => sum + item.remaining, 0);
  }, [creditUsageItems]);

  const updateNotificationPosition = useCallback(() => {
    const trigger = notificationRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;
    const desiredWidth = 565;

    const width = Math.min(
      desiredWidth,
      Math.max(320, window.innerWidth - viewportPadding * 2)
    );

    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding
    );

    const top = rect.bottom + gap;

    setNotificationPosition({ top, left, width });
  }, []);

  const updateCreditsPosition = useCallback(() => {
    const trigger = creditsRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;
    const desiredWidth = 272;

    const width = Math.min(
      desiredWidth,
      Math.max(240, window.innerWidth - viewportPadding * 2)
    );

    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding
    );

    const top = rect.bottom + gap;

    setCreditsPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!showNotifications) return;

    updateNotificationPosition();

    const handleReposition = () => updateNotificationPosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [showNotifications, updateNotificationPosition]);

  useEffect(() => {
    if (!showCredits) return;

    updateCreditsPosition();

    const handleReposition = () => updateCreditsPosition();

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [showCredits, updateCreditsPosition]);

  useEffect(() => {
    return () => {
      if (creditsCloseTimeoutRef.current) {
        window.clearTimeout(creditsCloseTimeoutRef.current);
      }
    };
  }, []);

  const clearCreditsCloseTimeout = () => {
    if (creditsCloseTimeoutRef.current) {
      window.clearTimeout(creditsCloseTimeoutRef.current);
      creditsCloseTimeoutRef.current = null;
    }
  };

  const openCreditsPopover = () => {
    clearCreditsCloseTimeout();
    updateCreditsPosition();
    setShowCredits(true);
    setShowNotifications(false);
  };

  const scheduleCloseCreditsPopover = () => {
    clearCreditsCloseTimeout();
    creditsCloseTimeoutRef.current = window.setTimeout(() => {
      setShowCredits(false);
    }, 120);
  };

  const crumbs = useMemo(() => {
    const baseCrumbs = getCrumbs(pathname);
    const campaignTitle = getCampaignTitleFromSearch(searchParams);
    const campaignId = searchParams.get("campaignId");

    return applyCampaignTitleToCrumbs(
      baseCrumbs,
      pathname,
      campaignTitle,
      campaignId
    );
  }, [pathname, searchParams]);

  const displayCrumbs = useMemo(() => {
    if (!isNarrow) return crumbs;
    if (crumbs.length <= 2) return crumbs;
    return crumbs.slice(-2);
  }, [crumbs, isNarrow]);

  const actions = useMemo(() => {
    return actionsOverride && actionsOverride.length > 0
      ? actionsOverride
      : getDefaultActions(pathname);
  }, [actionsOverride, pathname]);

  const handleNotificationToggle = () => {
    setShowCredits(false);

    if (showNotifications) {
      setShowNotifications(false);
      return;
    }

    updateNotificationPosition();
    setShowNotifications(true);
  };

  return (
    <>
      <div
        ref={topbarRef}
        className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white"
      >
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 min-w-0">
          {showHamburger ? (
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label="Open menu"
              title="Menu"
              className={[
                "grid h-10 w-10 place-items-center rounded-lg border border-neutral-200 bg-white shadow-sm",
                "hover:bg-neutral-50 transition",
              ].join(" ")}
            >
              <ListDashes size={22} className="text-[#1a1a1a]" />
            </button>
          ) : null}

          {showHamburger ? (
            <div
              className="min-w-0 flex-1 truncate text-[14px] sm:text-[16px] font-semibold text-[#1A1A1A]"
              style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
            >
              {crumbs[crumbs.length - 1]?.label ?? ""}
            </div>
          ) : (
            <nav className="flex items-center gap-2 min-w-0 flex-1">
              {isNarrow && crumbs.length > 2 ? (
                <span
                  className="text-[#B8B8B8] font-semibold"
                  style={{
                    fontFamily: "var(--Font-Family-Inter, Inter)",
                    fontSize: "14px",
                    lineHeight: "20px",
                  }}
                >
                  …
                </span>
              ) : null}

              {displayCrumbs.map((c, idx) => {
                const last = idx === displayCrumbs.length - 1;

                const commonStyle: React.CSSProperties = {
                  fontFamily: "var(--Font-Family-Inter, Inter)",
                  fontSize: "14px",
                  fontStyle: "normal",
                  fontWeight: 600,
                  lineHeight: "20px",
                  letterSpacing: "0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isNarrow ? 140 : 220,
                  display: "inline-block",
                };

                const selectedStyle: React.CSSProperties = {
                  ...commonStyle,
                  color: "#1A1A1A",
                };
                const prevStyle: React.CSSProperties = {
                  ...commonStyle,
                  color: "#B8B8B8",
                };

                return (
                  <React.Fragment key={c.href}>
                    {c.label === "Influencer" ? (
                      <span
                        style={last ? selectedStyle : prevStyle}
                        className="min-w-0"
                      >
                        {c.label}
                      </span>
                    ) : (
                      <Link
                        href={c.href}
                        style={last ? selectedStyle : prevStyle}
                        className="min-w-0"
                      >
                        {c.label}
                      </Link>
                    )}

                    {!last ? (
                      <span
                        className="shrink-0 text-[#B8B8B8]"
                        style={{
                          fontFamily: "var(--Font-Family-Inter, Inter)",
                          fontSize: "14px",
                          fontWeight: 600,
                          lineHeight: "20px",
                        }}
                      >
                        <CaretRightIcon />
                      </span>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
            <div
              ref={creditsRef}
              className="relative shrink-0"
              onMouseEnter={openCreditsPopover}
              onMouseLeave={scheduleCloseCreditsPopover}
            >
              <button
                type="button"
                aria-label={showCredits ? "Close credits dropdown" : "Open credits dropdown"}
                aria-expanded={showCredits}
                title="Credits"
                onClick={() => {
                  if (showCredits) {
                    setShowCredits(false);
                    return;
                  }
                  openCreditsPopover();
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[#1A1A1A] transition hover:bg-neutral-50"
              >
                <img src="/images/bolt.png" alt="star_coin" className="h-6 w-6" />
                <span className="text-[13px] sm:text-[14px] font-semibold text-[#1A1A1A]">
                  {remainingCredits}
                </span>
                <CaretDownIcon
                  size={14}
                  weight="bold"
                  className={[
                    "shrink-0 text-[#1A1A1A] transition-transform duration-200",
                    showCredits ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>
            </div>

            <div className="relative shrink-0" ref={notificationRef}>
              <button
                type="button"
                aria-label="Notifications"
                title="Notifications"
                onClick={handleNotificationToggle}
                className="grid h-10 w-10 border border-bd-subtle place-items-center rounded-lg hover:bg-neutral-50 transition"
              >
                <BellIcon size={16} className="text-[#1A1A1A]" weight="bold" />
              </button>
            </div>
            {/* <button className="flex gap-2 item-center font-bold text-xs p-3   border border-bd-subtle place-items-center rounded-lg hover:bg-neutral-50 transition">
              <BookOpenIcon size={16} weight="bold"/>
              <span>Guide</span>
            </button> */}
            <div
              className={[
                "flex items-center gap-2 sm:gap-6 shrink-0",
                "max-w-[46vw] sm:max-w-none overflow-x-auto",
                "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              ].join(" ")}
            >
              {actions.map((a) => (
                <ActionButton key={a.key} action={a} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCredits && creditsPosition ? (
        <div
          className="fixed z-[95]"
          style={{
            top: creditsPosition.top,
            left: creditsPosition.left,
            width: creditsPosition.width,
          }}
          onMouseEnter={openCreditsPopover}
          onMouseLeave={scheduleCloseCreditsPopover}
        >
          <div className="rounded-lg border border-[#EAEAEA] bg-white p-3">
            <div className="space-y-3">
              {creditUsageItems.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] font-medium text-[#7A7A7A]">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-medium text-[#9A9A9A]">
                      {item.used}/{item.isUnlimited ? "∞" : item.limit}
                    </span>
                  </div>

                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#ECECEC]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.progress}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showNotifications && notificationPosition ? (
        <div
          className="fixed inset-0 z-[100]"
          onMouseDown={() => setShowNotifications(false)}
        >
          <div className="absolute inset-0" />

          <div
            className="absolute"
            style={{
              top: notificationPosition.top,
              left: notificationPosition.left,
              width: notificationPosition.width,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <NotificationCard onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
