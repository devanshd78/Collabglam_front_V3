"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
} from "framer-motion";
import type { Transition, Variants } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { get } from "@/lib/api";
import {
  apiGetBrandLite,
  apiGetBrandWallet,
} from "@/app/brand/services/brandApi";
import HelpDialog, { type SupportMenuKey } from "@/components/common/HelpDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CaretDown,
  CardsThree,
  DotsThree,
  House,
  Lightning,
  MagnifyingGlassIcon,
  NotePencil,
  PaperPlaneTilt,
  Question,
  SignOut,
  UserCircle,
  UserPlus,
  Wallet,
  X,
  FolderSimpleStarIcon,
  ChartLineUp,
} from "@phosphor-icons/react";
import InviteMembersModal from "@/components/ui/brand/inviteMember";

/* -------------------------------- routing -------------------------------- */

const CAMPAIGN_PREFIX = "/brand/campaign";
const SUBSCRIPTION_CARD_HIDDEN_KEY = "brand-subscription-card-hidden";

const ROUTES: Record<string, string> = {
  dashboard: "/brand/dashboard",
  create: "/brand/create-campaign?byAi=1",
  campaigns: "/brand/campaign/all",
  campaigns_all: "/brand/campaign/all",
  campaigns_active: "/brand/campaign/active",
  campaigns_draft: "/brand/campaign/draft",
  campaigns_scheduled: "/brand/campaign/scheduled-campaign",
  hub: "/brand/creator-hub",
  browse: "/brand/browse-influencer",
  inbox: "/brand/inbox",
  // insight_os: "/brand/insight-os",
  wallet: "/brand/wallet",
  invite_user: "",
  notification: "/brand/notifications",
  help: "",
};

/* -------------------------------- types -------------------------------- */

type BrandPlanRes = {
  brandPlanId?: string | null;
  brandPlanName?: string | null;
};

type Item = {
  key: string;
  label: string;
  icon: React.ElementType;
  section: "overview" | "manage";
  right?: React.ReactNode;
  children?: Array<{ key: string; label: string }>;
};

type Workspace = {
  key: string;
  name: string;
  logoSrc?: string;
};

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

export type BrandSidebarProps = {
  drawerOpen?: boolean;
  setDrawerOpen?: (open: boolean) => void;
};

/* -------------------------------- utils -------------------------------- */

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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

function useViewportWidth(fallback = 375) {
  const [w, setW] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : fallback
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });

    return () => window.removeEventListener("resize", onResize);
  }, []);

  return w;
}

function titleCasePlan(value: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* -------------------------------- styles -------------------------------- */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#1a1a1a]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const ACTIVE_NAV = "bg-[#1a1a1a] text-white";
const HOVER_NAV = "hover:bg-[#1a1a1a]/10 hover:text-[#1a1a1a]";
const REST_NAV = "text-[#1a1a1a]";

const UPGRADE_REST =
  "radial-gradient(140% 140% at 0% 20%, rgba(255, 140, 1, 0.80) 5%, rgba(255, 191, 0, 0.30) 31%, rgba(255, 255, 255, 0.50) 100%)";

const UPGRADE_HOVER =
  "radial-gradient(140% 140% at 0% 20%, rgba(255, 140, 1, 0.80) 8%, rgba(255, 191, 0, 0.40) 51%, rgba(255, 255, 255, 0.50) 100%)";

const UPGRADE_COLLAPSED =
  "radial-gradient(140% 140% at 0% 20%, rgba(255, 140, 1, 0.80) 5%, rgba(255, 191, 0, 0.40) 31%, rgba(255, 255, 255, 0.50) 80%)";

const upgradeSpring: Transition = {
  type: "spring",
  mass: 1,
  stiffness: 100,
  damping: 15,
};

const upgradeShellStyle: React.CSSProperties = {
  borderRadius: "var(--Spacing-8, 8px)",
  border: "1.5px solid var(--Neutrals-75, #F5F5F5)",
};

/* ---------------------------- small components ---------------------------- */

function WorkspaceLogo({ ws }: { ws: Workspace }) {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {ws.logoSrc ? (
        <img
          src={ws.logoSrc}
          alt={ws.name}
          className="h-5 w-5 rounded bg-white object-contain"
        />
      ) : (
        <span className="text-xs font-semibold text-[#1a1a1a]">
          {ws.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SidebarTooltip({
  content,
  children,
  side = "right",
}: {
  content: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align="center">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function PanelCaretGlyph({
  dir,
  className,
}: {
  dir: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("block", className)}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 5.2V18.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {dir === "right" ? (
        <path
          d="M13.2 8.5L17 12l-3.8 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M17 8.5L13.2 12l3.8 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function getWalletAmount(res: unknown) {
  const data = res as Record<string, any> | null | undefined;

  const value =
    data?.walletBalance ??
    data?.balance ??
    data?.availableBalance ??
    data?.data?.walletBalance ??
    data?.data?.balance ??
    0;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatWalletAmount(amount: number | null) {
  if (amount === null) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function WalletBalancePill({ value }: { value: string }) {
  return (
    <div className="ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-[#1a1a1a]">
      <img
        src="/images/dollar_coin.png"
        alt="coin"
        className="h-5 w-5 shrink-0"
      />

      <span
        className="shrink-0 whitespace-nowrap tabular-nums leading-none"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
function normalizeRoutePath(value: string) {
  const pathOnly = value.split("?")[0] ?? value;
  return pathOnly.replace(/\/+$/, "") || "/";
}

const RowButton = React.memo(function RowButton({
  active,
  icon: Icon,
  label,
  right,
  onClick,
  tight,
  collapsed,
  disabled,
}: {
  active?: boolean;
  icon: React.ElementType;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  tight?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
}) {
  const buttonEl = (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "relative flex min-w-0 items-center overflow-hidden rounded-lg transition-all duration-300 disabled:opacity-100",
        disabled ? "cursor-default" : "cursor-pointer",
        FOCUS_RING,
        REST_NAV,
        !disabled && (active ? ACTIVE_NAV : HOVER_NAV),
        collapsed
          ? cn("mx-auto justify-center", tight ? "h-11 w-11" : "h-12 w-12")
          : cn(
            "w-full justify-start",
            tight ? "h-9 gap-2 px-2.5 py-2" : "h-10 gap-2 px-3 py-2"
          )
      )}
      style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
    >
      <Icon size={20} weight="regular" className="shrink-0 text-current" />

      <m.span
        initial={false}
        animate={{
          width: collapsed ? 0 : "auto",
          opacity: collapsed ? 0 : 1,
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "shrink-0 overflow-hidden whitespace-nowrap text-current",
          tight ? "text-[13px]" : "text-[14px]",
          "leading-5"
        )}
      >
        {label}
      </m.span>

      {!collapsed && right && (
        <m.span
          initial={false}
          animate={{ opacity: 1 }}
          className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap text-current"
        >
          {right}
        </m.span>
      )}

      {collapsed && right && !disabled && (
        <span
          className={cn(
            "absolute right-2 top-2 h-2 w-2 rounded-full",
            active ? "bg-white" : "bg-[#1a1a1a]"
          )}
        />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonEl;
});

/* -------------------------------- sidebar -------------------------------- */

export default function BrandSidebar({
  drawerOpen: drawerOpenProp,
  setDrawerOpen: setDrawerOpenProp,
}: BrandSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const isShort = useMediaQuery("(max-height: 800px)");
  const vw = useViewportWidth();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const walletBalanceLabel = useMemo(
    () => formatWalletAmount(walletBalance),
    [walletBalance]
  );

  const [brandLite, setBrandLite] = useState<BrandLiteRes | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpDialogPosition, setHelpDialogPosition] = useState({
    top: 0,
    left: 0,
  });
  const [showSubscriptionCard, setShowSubscriptionCard] = useState(true);

  const helpAnchorRef = useRef<HTMLDivElement | null>(null);
  const helpDialogRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [active, setActive] = useState<string>("dashboard");
  const [campaignOpen, setCampaignOpen] = useState(false);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceKey, setWorkspaceKey] = useState<string>("nike");

  const [collapsed, setCollapsed] = useState(false);
  const [widthCollapsed, setWidthCollapsed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [drawerOpenInternal, setDrawerOpenInternal] = useState(false);
  const drawerOpen = drawerOpenProp ?? drawerOpenInternal;

  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);

  const didFetchPlanRef = useRef(false);
  const campaignHoverRef = useRef(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedCollapsed = useRef(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);

  const tight = isShort;
  const railMode = isDesktop && (collapsed || isClosing);
  const compactUI = isDesktop ? collapsed || isClosing : false;

  const normalizedPlanName = useMemo(
    () => (planName ? planName.trim().toLowerCase() : null),
    [planName]
  );

  const isPaidPlan = useMemo(() => {
    if (!normalizedPlanName) return false;
    return !["free", "basic", "trial"].includes(normalizedPlanName);
  }, [normalizedPlanName]);

  const planLabel = useMemo(
    () => titleCasePlan(normalizedPlanName),
    [normalizedPlanName]
  );

  const upgradeCardTitle = isPaidPlan ? "Manage Plan" : "Upgrade to PRO";
  const upgradeCardDesc = isPaidPlan
    ? `You are currently on the ${planLabel} plan`
    : "Upgrade anytime. No long-term commitment";

  const workspaces = useMemo<Workspace[]>(
    () => [
      {
        key: "nike",
        name: "Nike Workspace",
        logoSrc:
          "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
      },
      {
        key: "jordan",
        name: "Jordan Workspace",
        logoSrc:
          "https://upload.wikimedia.org/wikipedia/en/3/37/Jumpman_logo.svg",
      },
    ],
    []
  );

  const openInviteMemberModal = useCallback(() => {
    setProfileMenuOpen(false);
    setInviteMemberOpen(true);
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.key === workspaceKey) ?? workspaces[0],
    [workspaceKey, workspaces]
  );

  const items = useMemo<Item[]>(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: House,
        section: "overview",
      },
      {
        key: "create",
        label: "Create Campaign",
        icon: NotePencil,
        section: "overview",
      },
      {
        key: "campaigns",
        label: "Campaigns",
        icon: CardsThree,
        section: "overview",
        children: [
          { key: "campaigns_all", label: "All Campaigns" },
          { key: "campaigns_active", label: "Active Campaigns" },
          { key: "campaigns_draft", label: "Draft Campaigns" },
          { key: "campaigns_scheduled", label: "Scheduled Campaigns" },
        ],
      },
      {
        key: "hub",
        label: "Hub",
        icon: FolderSimpleStarIcon,
        section: "overview",
      },
      {
        key: "browse",
        label: "Browse Creators",
        icon: MagnifyingGlassIcon,
        section: "overview",
      },
      {
        key: "inbox",
        label: "Inbox",
        icon: PaperPlaneTilt,
        section: "overview",
      },
      // {
      //   key: "insight_os",
      //   label: "Insight OS",
      //   icon: ChartLineUp,
      //   section: "overview",
      // },
      {
        key: "wallet",
        label: "Wallet",
        icon: Wallet,
        section: "manage",
      },
      {
        key: "help",
        label: "Help & Support",
        icon: Question,
        section: "manage",
      },
    ],
    []
  );

  const dashboardItems = useMemo(
    () => items.filter((i) => i.section === "overview"),
    [items]
  );

  const manageItems = useMemo(
    () => items.filter((i) => i.section === "manage"),
    [items]
  );

  const isCampaignChildActive = active.startsWith("campaigns_");

  const routePairs = useMemo(() => {
    return Object.entries(ROUTES)
      .filter(([key, path]) => key !== "campaigns" && Boolean(path))
      .map(([key, path]) => ({
        key,
        path,
        matchPath: normalizeRoutePath(path),
      }))
      .sort((a, b) => b.matchPath.length - a.matchPath.length);
  }, []);

  const clamp = useCallback((v: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, v));
  }, []);

  const expandedW = useMemo(() => {
    const min = isXl ? 320 : 300;
    const max = isXl ? 380 : 350;
    return Math.round(clamp(vw * 0.2, min, max));
  }, [clamp, vw, isXl]);

  const collapsedW = useMemo(() => {
    const min = 80;
    const max = isXl ? 110 : 100;
    return Math.round(clamp(vw * 0.06, min, max));
  }, [clamp, vw, isXl]);

  const mobileW = useMemo(() => {
    const max = 280;
    const min = 230;
    return Math.max(min, Math.min(max, Math.floor(vw - 24)));
  }, [vw]);

  const motionTransitions = useMemo(() => {
    const content: Transition = reduceMotion
      ? { duration: 0 }
      : { duration: 0.2, ease: [0.4, 0, 0.2, 1] };

    const aside: Transition = reduceMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 320, damping: 32, mass: 0.9 };

    const drawer: Transition = reduceMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 420, damping: 38, mass: 0.85 };

    return { content, aside, drawer };
  }, [reduceMotion]);

  const fadeScale: Variants = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.96 },
    }),
    []
  );

  const dropdownY: Variants = useMemo(
    () => ({
      initial: { opacity: 0, y: -6 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -6 },
    }),
    []
  );

  const dropdownScaleY: Variants = useMemo(
    () => ({
      initial: { opacity: 0, height: 0 },
      animate: { opacity: 1, height: "auto" },
      exit: { opacity: 0, height: 0 },
    }),
    []
  );

  const footerBrandName = brandLite?.name?.trim() || "Brand";
  const footerProxyEmail = brandLite?.proxyEmail?.trim() || "No proxy email";
  const footerProfilePic = brandLite?.profilePic?.trim() || "";

  const helpMenuItems = useMemo<Array<{ key: SupportMenuKey; label: string }>>(
    () => [
      { key: "dispute", label: "Dispute" },
      { key: "privacy_policy", label: "Privacy Policy" },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedToken =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("accessToken");

      const storedBrandId =
        window.localStorage.getItem("brandId") ||
        window.localStorage.getItem("currentBrandId");

      const cachedPlanId = window.localStorage.getItem("brandPlanId");
      const cachedPlanName = window.localStorage.getItem("brandPlanName");

      if (storedToken) setToken(storedToken);
      if (storedBrandId) setBrandId(storedBrandId);
      if (cachedPlanId) setPlanId(cachedPlanId);
      if (cachedPlanName) setPlanName(cachedPlanName.toLowerCase());
    } catch { }
  }, []);

  useEffect(() => {
    if (!brandId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiGetBrandWallet({ brandId });

        if (cancelled) return;
        setWalletBalance(getWalletAmount(res));
      } catch {
        if (!cancelled) setWalletBalance(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  useEffect(() => {
    if (!token || !brandId) return;
    if (didFetchPlanRef.current) return;

    didFetchPlanRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const data = await get<BrandPlanRes>(
          `/subscription/brand/current?brandId=${encodeURIComponent(brandId)}`
        );

        const latestId = data?.brandPlanId ?? null;
        const latestName = data?.brandPlanName
          ? String(data.brandPlanName).toLowerCase()
          : null;

        if (cancelled) return;

        setPlanId(latestId);
        setPlanName(latestName);

        try {
          if (latestId) window.localStorage.setItem("brandPlanId", latestId);
          else window.localStorage.removeItem("brandPlanId");

          if (latestName) window.localStorage.setItem("brandPlanName", latestName);
          else window.localStorage.removeItem("brandPlanName");
        } catch { }
      } catch {
        // keep cached values on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, brandId]);

  useEffect(() => {
    if (isDesktop) {
      if (setDrawerOpenProp) setDrawerOpenProp(false);
      else setDrawerOpenInternal(false);

      setCollapsed(false);
      setWidthCollapsed(false);
      setIsClosing(false);
      setCampaignOpen(false);
      setProfileMenuOpen(false);
      setHelpDialogOpen(false);
      hasInitializedCollapsed.current = true;

      try {
        window.localStorage.setItem("sidebar-collapsed", "false");
      } catch { }
    } else {
      setCollapsed(false);
      setIsClosing(false);
      setWidthCollapsed(false);
      hasInitializedCollapsed.current = false;
    }
  }, [isDesktop, setDrawerOpenProp]);

  useEffect(() => {
    if (!workspaceOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = workspaceRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setWorkspaceOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [workspaceOpen]);

  useEffect(() => {
    if (!pathname) return;

    const currentPath = normalizeRoutePath(pathname);

    const match = routePairs.find(
      ({ matchPath }) =>
        currentPath === matchPath || currentPath.startsWith(`${matchPath}/`)
    );

    const nextKey =
      match?.key ??
      (currentPath === CAMPAIGN_PREFIX ||
        currentPath.startsWith(`${CAMPAIGN_PREFIX}/`)
        ? "campaigns"
        : null);

    if (nextKey && nextKey !== active) setActive(nextKey);
  }, [pathname, routePairs, active]);

  useEffect(() => {
    const inCampaignChildren = active.startsWith("campaigns_");

    if (inCampaignChildren && !(isDesktop && collapsed)) {
      setCampaignOpen(true);
      return;
    }

    setCampaignOpen(false);
  }, [active, isDesktop, collapsed]);

  useEffect(() => {
    if (!brandId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiGetBrandLite(brandId);

        if (cancelled) return;

        setBrandLite(data ?? null);
        const proxyEmail = data?.proxyEmail?.trim() || "";

        if (proxyEmail) {
          window.localStorage.setItem("proxyEmail", proxyEmail);
        } else {
          window.localStorage.removeItem("proxyEmail");
        }

        const nextSubscription =
          data?.subscriptionDetails ?? data?.subscription ?? null;

        const nextPlanId = nextSubscription?.brandPlanId ?? null;
        const nextPlanNameRaw =
          nextSubscription?.brandPlanName ?? nextSubscription?.plan ?? null;

        if (nextPlanId) setPlanId(nextPlanId);
        if (nextPlanNameRaw) setPlanName(String(nextPlanNameRaw).toLowerCase());
      } catch {
        if (!cancelled) setBrandLite(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brandId]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const hidden = window.localStorage.getItem(SUBSCRIPTION_CARD_HIDDEN_KEY);
      setShowSubscriptionCard(hidden !== "true");
    } catch { }
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = profileMenuRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setProfileMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!helpDialogOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpDialogOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpDialogOpen]);

  useEffect(() => {
    if (!helpDialogOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;

      if (helpDialogRef.current?.contains(target)) return;
      if (helpAnchorRef.current?.contains(target)) return;

      setHelpDialogOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [helpDialogOpen]);

  const setDrawerOpen = useCallback(
    (open: boolean) => {
      if (setDrawerOpenProp) setDrawerOpenProp(open);
      else setDrawerOpenInternal(open);
    },
    [setDrawerOpenProp]
  );

  const goTo = useCallback(
    (key: string) => {
      const href = ROUTES[key];
      if (href) router.push(href);
    },
    [router]
  );

  const handlePlanClick = useCallback(() => {
    router.push("/brand/subscriptions");
    if (!isDesktop) setDrawerOpen(false);
  }, [router, isDesktop, setDrawerOpen]);

  const handleHideSubscriptionCard = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      setShowSubscriptionCard(false);

      try {
        window.localStorage.setItem(SUBSCRIPTION_CARD_HIDDEN_KEY, "true");
      } catch { }
    },
    []
  );

  const openHelpDialog = useCallback(() => {
    const rect = helpAnchorRef.current?.getBoundingClientRect();

    if (rect) {
      const DIALOG_HEIGHT = 340;
      const GAP = 12;
      const VIEWPORT_PADDING = 16;

      let top = rect.top;

      if (top + DIALOG_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
        top = window.innerHeight - VIEWPORT_PADDING - DIALOG_HEIGHT;
      }

      top = Math.max(VIEWPORT_PADDING, top);

      setHelpDialogPosition({
        top,
        left: rect.right + GAP,
      });
    }

    setHelpDialogOpen((prev) => !prev);
  }, []);

  const handleHelpMenuSelect = useCallback(
    (key: SupportMenuKey) => {
      setHelpDialogOpen(false);
      setActive("help");

      switch (key) {
        case "dispute":
          router.push("/brand/disputes");
          break;
        case "report_issue":
          router.push("/brand/report-issue");
          break;
        case "help_center":
          router.push("/brand/help-and-support");
          break;
        case "privacy_policy":
          if (typeof window !== "undefined") {
            window.open("/privacy-policy", "_blank", "noopener,noreferrer");
          }
          break;
        default:
          break;
      }

      if (!isDesktop) setDrawerOpen(false);
    },
    [router, isDesktop, setDrawerOpen]
  );

  const handleSetActive = useCallback(
    (key: string) => {
      setActive(key);
      setHelpDialogOpen(false);

      if (!key.startsWith("campaigns")) {
        setCampaignOpen(false);
        campaignHoverRef.current = false;
      }

      goTo(key);

      if (!isDesktop) setDrawerOpen(false);
    },
    [goTo, isDesktop, setDrawerOpen]
  );

  const beginOpenDesktop = useCallback(() => {
    setCollapsed(false);
    setIsClosing(false);
    setWidthCollapsed(false);
    try {
      window.localStorage.setItem("sidebar-collapsed", "false");
    } catch { }
  }, []);

  const beginCloseDesktop = useCallback(() => {
    setIsClosing(true);
    setCampaignOpen(false);
    campaignHoverRef.current = false;
    setWorkspaceOpen(false);
    setWidthCollapsed(true);
    setProfileMenuOpen(false);
    setHelpDialogOpen(false);
    try {
      window.localStorage.setItem("sidebar-collapsed", "true");
    } catch { }
  }, []);

  const handleProfileMenuAction = useCallback(
    (href: string) => {
      setProfileMenuOpen(false);
      router.push(href);

      if (!isDesktop) setDrawerOpen(false);
    },
    [router, isDesktop, setDrawerOpen]
  );

  const handleLogout = useCallback(() => {
    try {
      [
        "token",
        "accessToken",
        "brandId",
        "currentBrandId",
        "brandPlanId",
        "brandPlanName",
        "sidebar-collapsed",
      ].forEach((key) => window.localStorage.removeItem(key));
    } catch { }

    setProfileMenuOpen(false);
    router.replace("/brand/login");

    if (!isDesktop) setDrawerOpen(false);
  }, [router, isDesktop, setDrawerOpen]);

  const renderItem = useCallback(
    (item: Item) => {
      const isHelpOpen = helpDialogOpen;

      const isActiveItem = !isHelpOpen && active === item.key;
      const campaignsActive =
        !isHelpOpen &&
        item.key === "campaigns" &&
        (active === "campaigns" || isCampaignChildActive);

      const isCollapsed = isDesktop && (collapsed || isClosing);

      if (item.key === "wallet") {
        return (
          <RowButton
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={false}
            right={
              !isCollapsed ? (
                <WalletBalancePill value={walletBalanceLabel} />
              ) : undefined
            }
            tight={tight}
            collapsed={isCollapsed}
            onClick={() => handleSetActive("wallet")}
          />
        );
      }

      if (item.key === "help") {
        return (
          <div key={item.key} ref={helpAnchorRef}>
            <RowButton
              icon={item.icon}
              label={item.label}
              active={helpDialogOpen || active === "help"}
              tight={tight}
              collapsed={isCollapsed}
              onClick={openHelpDialog}
            />
          </div>
        );
      }

      return (
        <RowButton
          key={item.key}
          icon={item.icon}
          label={item.label}
          right={item.right}
          active={isActiveItem || campaignsActive}
          tight={tight}
          collapsed={isCollapsed}
          onClick={() => {
            handleSetActive(item.key);
          }}
        />
      );
    },
    [
      active,
      collapsed,
      handleSetActive,
      isCampaignChildActive,
      isClosing,
      isDesktop,
      helpDialogOpen,
      openHelpDialog,
      tight,
      walletBalanceLabel,
    ]
  );

  const LogoButton = (
    <button
      type="button"
      onClick={() => {
        if (isDesktop) {
          if (collapsed || isClosing) beginOpenDesktop();
        } else {
          setDrawerOpen(true);
        }
      }}
      className={cn(
        "grid flex-shrink-0 place-items-center",
        FOCUS_RING,
        isDesktop && collapsed ? "cursor-pointer" : "cursor-default"
      )}
      aria-label={railMode ? "Open sidebar" : "CollabGlam"}
    >
      <img
        src="/logo.png"
        alt="CollabGlam"
        className="h-[40px] w-[40px] rounded-full object-cover"
      />
    </button>
  );

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className={cn("flex flex-col", tight ? "gap-3" : "gap-4")}>
        <div
          className={cn(
            "flex w-full items-center",
            railMode ? "flex-col gap-3" : "gap-3"
          )}
        >
          {railMode ? (
            <SidebarTooltip content="Open sidebar">{LogoButton}</SidebarTooltip>
          ) : (
            LogoButton
          )}

          <AnimatePresence initial={false}>
            {!compactUI && (
              <m.div
                key="brand"
                variants={fadeScale}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={motionTransitions.content}
                className="min-w-0 flex-1"
                style={{ willChange: "transform, opacity" }}
              >
                <div
                  className={cn(
                    "truncate font-semibold text-[#1a1a1a]",
                    tight ? "text-[18px]" : "text-[20px]"
                  )}
                >
                  CollabGlam
                </div>
                <div className="truncate text-[12px] text-neutral-500">
                  For Brand
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {isDesktop ? (
            <SidebarTooltip
              content={collapsed || isClosing ? "Open sidebar" : "Close sidebar"}
              side={collapsed || isClosing ? "right" : "bottom"}
            >
              <button
                type="button"
                onClick={() => {
                  if (collapsed || isClosing) beginOpenDesktop();
                  else beginCloseDesktop();
                }}
                aria-label={collapsed || isClosing ? "Open sidebar" : "Close sidebar"}
                className={cn(
                  "grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg transition",
                  "text-[#343330] hover:bg-[#EDEDED] hover:text-[#1a1a1a]",
                  FOCUS_RING,
                  railMode ? "" : "ml-auto"
                )}
              >
                {collapsed ? (
                  <PanelCaretGlyph dir="right" />
                ) : (
                  <PanelCaretGlyph dir="left" />
                )}
              </button>
            </SidebarTooltip>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className={cn(
                "ml-auto grid h-10 w-10 place-items-center rounded-lg transition",
                "text-[#343330] hover:bg-[#EDEDED] hover:text-[#1a1a1a]",
                FOCUS_RING
              )}
            >
              <X size={22} />
            </button>
          )}
        </div>
      </div>

      <div className={cn("mt-6 flex min-h-0 flex-1 flex-col", tight ? "mt-4" : "")}>
        <div
          className={cn(
            "min-h-0 flex-1",
            railMode
              ? "flex flex-col items-center overflow-y-auto px-1"
              : "overflow-y-auto pr-1"
          )}
        >
          <AnimatePresence initial={false}>
            {!compactUI && (
              <m.div
                key="dash-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionTransitions.content}
                className="mb-4 w-full text-[16px] font-semibold text-neutral-600"
              >
                Overview
              </m.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex flex-col",
              railMode ? "gap-3" : "w-full gap-2"
            )}
          >
            {dashboardItems.map((item) => {
              if (item.key !== "campaigns") return renderItem(item);

              if (isDesktop && (collapsed || isClosing)) {
                return renderItem(item);
              }

              const isCampaignActive =
                !helpDialogOpen &&
                (campaignOpen ||
                  active === "campaigns" ||
                  isCampaignChildActive);

              return (
                <div key={item.key} className="w-full">
                  <div
                    className={cn(
                      "flex h-10 w-full items-center rounded-lg transition-all duration-300",
                      FOCUS_RING,
                      REST_NAV,
                      isCampaignActive ? ACTIVE_NAV : HOVER_NAV
                    )}
                    style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignOpen(false);
                        campaignHoverRef.current = false;
                        handleSetActive("campaigns");
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                    >
                      <item.icon
                        size={20}
                        weight="regular"
                        className="shrink-0 text-current"
                      />
                      <span className="truncate text-[14px] leading-5 text-current">
                        {item.label}
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-label={
                        campaignOpen
                          ? "Close campaigns menu"
                          : "Open campaigns menu"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setCampaignOpen((prev) => !prev);
                      }}
                      className="flex h-full items-center px-3 text-current"
                    >
                      <m.span
                        className="inline-flex items-center"
                        animate={{ rotate: campaignOpen ? 180 : 0 }}
                        transition={motionTransitions.content}
                      >
                        <CaretDown
                          size={18}
                          className="text-current opacity-70"
                        />
                      </m.span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {campaignOpen && !(isDesktop && isClosing) && (
                      <m.div
                        key="campaigns-dropdown"
                        variants={dropdownScaleY}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={motionTransitions.content}
                        className="origin-top overflow-hidden"
                      >
                        <div className="rounded-lg bg-white pt-1">
                          {(item.children ?? []).map((child) => {
                            const isSubActive = !helpDialogOpen && active === child.key;

                            return (
                              <button
                                key={child.key}
                                type="button"
                                onClick={() => handleSetActive(child.key)}
                                className={cn(
                                  "my-1 w-full cursor-pointer rounded-lg px-6 py-2 text-left transition",
                                  FOCUS_RING,
                                  isSubActive
                                    ? "bg-[#dfdfdf] text-[#1a1a1a]"
                                    : "text-[#1a1a1a] hover:bg-[#1a1a1a]/10 hover:text-[#1a1a1a]"
                                )}
                                style={{
                                  fontSize: "13px",
                                  lineHeight: "18px",
                                }}
                              >
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div
            className={cn(
              "my-5 h-px w-full bg-neutral-200",
              isDesktop && collapsed ? "opacity-70" : "",
              tight ? "my-4" : ""
            )}
          />

          <AnimatePresence initial={false}>
            {!compactUI && (
              <m.div
                key="manage-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionTransitions.content}
                className="mb-4 w-full text-[16px] font-semibold text-neutral-600"
              >
              </m.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex flex-col",
              isDesktop && collapsed ? "gap-3" : "w-full gap-2"
            )}
          >
            {manageItems.map((item) => renderItem(item))}
          </div>
        </div>
      </div>

      <div className={cn("mt-auto pt-6", tight ? "pt-4" : "")}>
        <AnimatePresence initial={false} mode="wait">
          {isDesktop && collapsed ? (
            <m.div
              key="collapsed-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionTransitions.content}
              className="flex flex-col items-center gap-4"
            >
              {showSubscriptionCard && (
                <>
                  <div className="relative">
                    <SidebarTooltip
                      content={isPaidPlan ? `Manage ${planLabel} plan` : "Upgrade to PRO"}
                    >
                      <m.button
                        type="button"
                        aria-label={isPaidPlan ? `Manage ${planLabel} plan` : "Upgrade to PRO"}
                        onClick={handlePlanClick}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        transition={upgradeSpring}
                        className={cn(
                          "relative grid place-items-center overflow-hidden",
                          tight ? "h-12 w-12" : "h-14 w-14",
                          FOCUS_RING
                        )}
                        style={{
                          borderRadius: "var(--Spacing-8, 8px)",
                          background: UPGRADE_COLLAPSED,
                          willChange: "transform",
                        }}
                      >
                        <Lightning size={24} className="text-[#1a1a1a]" />
                      </m.button>
                    </SidebarTooltip>

                    <button
                      type="button"
                      aria-label="Hide subscription card"
                      onClick={handleHideSubscriptionCard}
                      className={cn(
                        "absolute -right-2 -top-2 z-10 grid h-5 w-5 place-items-center rounded-full text-[#1a1a1a] shadow-sm transition hover:bg-neutral-100",
                        FOCUS_RING
                      )}
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </div>

                  <div
                    className={cn(
                      "my-5 h-px w-full bg-neutral-200",
                      tight ? "my-4" : ""
                    )}
                  />
                </>
              )}

              <SidebarTooltip content="Profile">
                <button
                  type="button"
                  onClick={() => handleProfileMenuAction("/brand/profile")}
                  aria-label="Open profile"
                  className={cn(
                    "h-10 w-10 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 transition hover:bg-neutral-200",
                    FOCUS_RING
                  )}
                >
                  {footerProfilePic ? (
                    <img
                      src={footerProfilePic}
                      alt={footerBrandName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[15px] font-semibold text-[#1a1a1a]">
                      {footerBrandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </SidebarTooltip>
            </m.div>
          ) : (
            <m.div
              key="expanded-footer"
              variants={fadeScale}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={motionTransitions.content}
              className="w-full"
              style={{ opacity: isDesktop && isClosing ? 0 : 1 }}
            >
              {showSubscriptionCard && (
                <>
                  <m.div
                    initial="rest"
                    animate="rest"
                    whileHover="hover"
                    transition={upgradeSpring}
                    className={cn(
                      "relative flex w-full cursor-pointer flex-col items-start gap-2.5 overflow-hidden p-2 pr-9",
                      FOCUS_RING
                    )}
                    style={upgradeShellStyle}
                    tabIndex={0}
                    role="button"
                    onClick={handlePlanClick}
                  >
                    <button
                      type="button"
                      aria-label="Hide subscription card"
                      onClick={handleHideSubscriptionCard}
                      className={cn(
                        "absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-[#1a1a1a] shadow-sm transition hover:bg-white",
                        FOCUS_RING
                      )}
                    >
                      <X size={14} weight="bold" />
                    </button>

                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: UPGRADE_REST,
                        borderRadius: "inherit",
                      }}
                    />

                    <m.div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: UPGRADE_HOVER,
                        borderRadius: "inherit",
                      }}
                      variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                      transition={upgradeSpring}
                    />

                    <div className="relative z-10 flex w-full flex-col items-start gap-2.5">
                      <div className="relative h-6 w-6">
                        <m.span
                          className="absolute inset-0 grid place-items-center"
                          variants={{ rest: { opacity: 1 }, hover: { opacity: 0 } }}
                          transition={upgradeSpring}
                        >
                          <Lightning
                            size={24}
                            weight="regular"
                            className="text-[#1a1a1a]"
                          />
                        </m.span>

                        <m.span
                          className="absolute inset-0 grid place-items-center"
                          variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
                          transition={upgradeSpring}
                        >
                          <Lightning
                            size={24}
                            weight="fill"
                            className="text-[#1a1a1a]"
                          />
                        </m.span>
                      </div>

                      <div className="text-[18px] font-semibold leading-[24px] text-[#1a1a1a]">
                        {upgradeCardTitle}
                      </div>

                      <div className="font-[Inter] text-[14px] font-normal leading-[18px] text-[#1a1a1a]">
                        {upgradeCardDesc}
                      </div>
                    </div>
                  </m.div>

                  <div
                    className={cn(
                      "my-5 h-px w-full bg-neutral-200",
                      tight ? "my-4" : ""
                    )}
                  />
                </>
              )}

              <div
                className={cn(
                  "my-5 h-px w-full bg-neutral-200",
                  tight ? "my-4" : ""
                )}
              />

              <div className="relative">
                <div className="flex w-full items-center gap-3 bg-white p-3">
                  <SidebarTooltip content="Profile" side="top">
                    <button
                      type="button"
                      onClick={() => handleProfileMenuAction("/brand/profile")}
                      aria-label="Open profile"
                      className={cn(
                        "h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 transition hover:bg-neutral-200",
                        FOCUS_RING
                      )}
                    >
                      {footerProfilePic ? (
                        <img
                          src={footerProfilePic}
                          alt={footerBrandName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[15px] font-semibold text-[#1a1a1a]">
                          {footerBrandName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                  </SidebarTooltip>

                  <button
                    type="button"
                    onClick={() => handleProfileMenuAction("/brand/profile")}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-[16px] font-semibold text-[#1a1a1a]">
                      {footerBrandName}
                    </div>

                    <div className="truncate text-[12px] text-neutral-500">
                      {footerProxyEmail}
                    </div>
                  </button>

                  <SidebarTooltip content="More options" side="top">
                    <button
                      type="button"
                      aria-label="Open profile menu"
                      aria-expanded={profileMenuOpen}
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className={cn(
                        "grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-[#1a1a1a] transition hover:bg-[#EDEDED]",
                        FOCUS_RING
                      )}
                    >
                      <DotsThree size={24} />
                    </button>
                  </SidebarTooltip>
                </div>

                <AnimatePresence initial={false}>
                  {profileMenuOpen && (
                    <m.div
                      ref={profileMenuRef}
                      key="profile-menu"
                      variants={dropdownY}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={motionTransitions.content}
                      className="absolute bottom-[calc(100%+12px)] right-0 z-[70]"
                    >
                      <div
                        style={{
                          display: "flex",
                          width: "13.6875rem",
                          padding: "1rem 0.75rem",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "1rem",
                          borderRadius: "0.75rem",
                          background: "var(--Light-Background-Primary, #FFF)",
                          boxShadow:
                            "0 24px 40px -4px rgba(0, 0, 0, 0.10), 0 0 12px 0 rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleProfileMenuAction("/brand/profile")
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#1a1a1a] transition hover:bg-[#F5F5F5]"
                        >
                          <UserCircle size={20} />
                          <span>Profile</span>
                        </button>

                        {/* <button
                          type="button"
                          onClick={openInviteMemberModal}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#1a1a1a] transition hover:bg-[#F5F5F5]"
                        >
                          <span className="flex items-center gap-3">
                            <UserPlus size={20} />
                            <span>Invite Member</span>
                          </span>

                          <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Invite
                          </span>
                        </button> */}

                        <div className="h-px w-full bg-neutral-200" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#F04438] transition hover:bg-[#FFF1F0]"
                        >
                          <SignOut size={20} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const DesktopAside = (
    <m.aside
      data-cg-sidebar
      id="cg-sidebar"
      className="inline-flex h-dvh flex-col select-none border border-neutral-200 bg-white"
      style={{
        padding: tight ? "12px 16px 16px 16px" : "16px 20px 20px 20px",
        fontFamily: "var(--Font-Family-Inter, Inter)",
        willChange: "width",
      }}
      initial={false}
      animate={{ width: widthCollapsed ? collapsedW : expandedW }}
      transition={motionTransitions.aside}
      onAnimationComplete={() => {
        if (widthCollapsed && isClosing) {
          setCollapsed(true);
          setIsClosing(false);
        }
      }}
    >
      {SidebarBody}
    </m.aside>
  );

  const MobileDrawer = (
    <AnimatePresence>
      {drawerOpen ? (
        <>
          <m.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[99] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTransitions.content}
            onClick={() => setDrawerOpen(false)}
          />

          <m.aside
            data-cg-sidebar
            id="cg-sidebar"
            className="fixed bottom-0 left-0 top-0 z-[100] select-none border-r border-neutral-200 bg-white"
            style={{
              width: mobileW,
              padding: tight ? "12px 16px 16px 16px" : "16px 20px 20px 20px",
              fontFamily: "var(--Font-Family-Inter, Inter)",
              willChange: "transform",
            }}
            initial={{ x: -mobileW - 24 }}
            animate={{ x: 0 }}
            exit={{ x: -mobileW - 24 }}
            transition={motionTransitions.drawer}
          >
            {SidebarBody}
          </m.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  const HelpDialogModal = (
    <HelpDialog
      open={helpDialogOpen}
      dialogRef={helpDialogRef}
      position={helpDialogPosition}
      items={helpMenuItems}
      onSelect={handleHelpMenuSelect}
      focusRingClassName={FOCUS_RING}
    />
  );

  return (
    <TooltipProvider delayDuration={120}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
          <>
            {isDesktop ? DesktopAside : MobileDrawer}
            {HelpDialogModal}

            <InviteMembersModal
              open={inviteMemberOpen}
              onOpenChange={setInviteMemberOpen}
              brandId={brandId}
            />
          </>
        </MotionConfig>
      </LazyMotion>
    </TooltipProvider>
  );
}
