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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import HelpDialog, { type SupportMenuKey } from "@/components/common/HelpDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowSquareRight,
  CaretDown,
  CardsThree,
  DotsThree,
  FilmScript,
  House,
  Lightning,
  MagnifyingGlassIcon,
  PaperPlaneTilt,
  Question,
  SignOut,
  UserCircle,
  UserPlus,
  Wallet,
  X,
} from "@phosphor-icons/react";

/* -------------------------------- routes -------------------------------- */

const ROUTES: Record<string, string> = {
  dashboard: "/influencer/dashboards",
  direct_invites: "/influencer/invitations",

  my_campaigns: "/influencer/my-campaigns",
  my_campaigns_all: "/influencer/my-campaigns/all",
  my_campaigns_applied: "/influencer/my-campaigns/applied",
  my_campaigns_active: "/influencer/my-campaigns/active",
  my_campaigns_completed: "/influencer/my-campaigns/completed",
  my_campaigns_rejected: "/influencer/my-campaigns/rejected",

  discover_campaigns: "/influencer/discover-campaigns",
  inbox: "/influencer/inbox",
  media_kit: "/influencer/media-kit",
  wallet: "/influencer/wallets-payments",
  invite_members: "/influencer/invite-members",
  profile: "/influencer/profile",
  subscriptions: "/influencer/subscriptions",
  help: "",
};

const SUPPORT_NAV_PATHS = [
  "/influencer/support-centre",
  "/influencer/disputes",
  "/influencer/report-issue",
  "/privacy-policy",
];

function isSupportPath(pathname?: string | null) {
  const p = pathname || "";
  return SUPPORT_NAV_PATHS.some(
    (path) => p === path || p.startsWith(`${path}/`)
  );
}

/* -------------------------------- types -------------------------------- */

type Item = {
  key: string;
  label: string;
  icon: React.ElementType;
  section: "overview" | "manage";
  href?: string;
  right?: React.ReactNode;
  iconStyle?: React.CSSProperties;
  children?: Array<{
    key: string;
    label: string;
    href: string;
  }>;
};

type InfluencerProfile = {
  name?: string;
  email?: string;
  profileImage?: string;
  planId?: string | null;
  planName?: string | null;
  expiresAt?: string | null;
};

export type InfluencerSidebarProps = {
  drawerOpen?: boolean;
  setDrawerOpen?: (open: boolean) => void;
  campaignBadge?: React.ReactNode;
  messagesBadge?: React.ReactNode;
  influencerId?: string;
  token?: string;
  walletBalanceLabel?: string;
  inviteMembersHref?: string;
  onInviteMembers?: () => void;
  onLogout?: () => void;
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

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));

  return match ? decodeURIComponent(match[1]) : "";
}

function getLocalValue(keys: string[]) {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    try {
      const value =
        window.localStorage.getItem(key) ||
        window.sessionStorage.getItem(key);

      if (value && value.trim()) return value.trim();
    } catch {
      // ignore storage errors
    }
  }

  return "";
}

function decodeJwtPayload(tokenValue?: string) {
  if (!tokenValue || typeof window === "undefined") return null;

  try {
    const payload = tokenValue.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );

    return JSON.parse(window.atob(paddedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function resolveInfluencerAuth(influencerIdProp?: string, tokenProp?: string) {
  const tokenValue =
    tokenProp?.trim() ||
    getLocalValue([
      "influencer_token",
      "influencerToken",
      "token",
      "accessToken",
    ]) ||
    getCookieValue("influencer_token") ||
    getCookieValue("token");

  const decodedToken = decodeJwtPayload(tokenValue);

  const influencerIdValue =
    influencerIdProp?.trim() ||
    getLocalValue([
      "influencerId",
      "currentInfluencerId",
      "influencer_id",
      "userId",
      "_id",
    ]) ||
    getCookieValue("influencerId") ||
    getCookieValue("influencer_id") ||
    pickString(decodedToken, [
      "influencerId",
      "influencer_id",
      "_id",
      "id",
      "userId",
      "sub",
    ]);

  return {
    influencerId: influencerIdValue,
    token: tokenValue,
  };
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

function normalizeProfileImageSrc(value: string) {
  const src = String(value || "").trim();

  if (!src) return "";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  if (src.startsWith("//")) return `https:${src}`;

  return `${API_BASE_URL}/${src.replace(/^\/+/, "")}`;
}

function pickProfileImage(source: unknown): string {
  const record = asRecord(source);
  if (!record) return "";

  const directImage = pickString(record, [
    "profileImage",
    "profilePic",
    "profilePicture",
    "profilePictureUrl",
    "profile_image",
    "profile_image_url",
    "profile_pic",
    "profile_pic_url",
    "avatar",
    "avatarUrl",
    "image",
    "imageUrl",
    "photo",
    "photoUrl",
    "picture",
    "pictureUrl",
    "thumbnail",
    "thumbnailUrl",
    "url",
  ]);

  if (directImage) return directImage;

  for (const nestedKey of ["profile", "user", "owner", "account"]) {
    const nestedImage = pickProfileImage(record[nestedKey]);
    if (nestedImage) return nestedImage;
  }

  return "";
}

function normalizeInfluencerLite(raw: unknown): InfluencerProfile {
  const root = asRecord(raw) ?? {};
  const data =
    asRecord(root.data) ||
    asRecord(root.influencer) ||
    asRecord(root.user) ||
    root;

  const primaryProfile = asRecord(data.primaryProfile);

  const socialProfiles = Array.isArray(data.socialProfiles)
    ? data.socialProfiles
    : [];

  const image =
    pickProfileImage(data) ||
    pickProfileImage(primaryProfile) ||
    socialProfiles.map(pickProfileImage).find(Boolean) ||
    "";

  const name =
    pickString(data, ["name", "fullName", "displayName", "username"]) ||
    pickString(primaryProfile, [
      "name",
      "fullName",
      "displayName",
      "username",
      "handle",
    ]) ||
    "Profile";

  const email = pickString(data, ["email", "proxyEmail", "contactEmail"]);

  const subscription =
    asRecord(data.subscription) || asRecord(data.subscriptionDetails);

  const planName =
    pickString(data, [
      "planName",
      "brandPlanName",
      "influencerPlanName",
      "plan",
    ]) ||
    pickString(subscription, [
      "planName",
      "brandPlanName",
      "influencerPlanName",
      "plan",
    ]);

  const planId =
    pickString(data, ["planId", "brandPlanId", "influencerPlanId"]) ||
    pickString(subscription, ["planId", "brandPlanId", "influencerPlanId"]);

  const expiresAt =
    pickString(data, ["expiresAt", "subscriptionExpiresAt"]) ||
    pickString(subscription, ["expiresAt", "subscriptionExpiresAt"]);

  return {
    name,
    email,
    profileImage: normalizeProfileImageSrc(image),
    planId: planId || null,
    planName: planName || null,
    expiresAt: expiresAt || null,
  };
}

async function apiGetInfluencerLite(
  influencerId?: string,
  token?: string
): Promise<InfluencerProfile> {
  const trimmedInfluencerId = influencerId?.trim() || "";
  const query = trimmedInfluencerId
    ? `?influencerId=${encodeURIComponent(trimmedInfluencerId)}`
    : "";

  const res = await fetch(`${API_BASE_URL}/influencer/lite${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = "Failed to fetch influencer lite profile";

    try {
      const errorData = await res.json();
      message = String(errorData?.message || message);
    } catch {
      // ignore invalid json
    }

    throw new Error(message);
  }

  return normalizeInfluencerLite(await res.json());
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

function NewBadge() {
  return (
    <span
      style={{
        display: "flex",
        padding: "0.25rem",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "stretch",
        borderRadius: "var(--Corner-radius-16, 1rem)",
        color: "var(--Light-Text-Primary, #1A1A1A)",
        textAlign: "center",
        fontFamily: "Inter",
        fontSize: "0.75rem",
        fontStyle: "normal",
        fontWeight: 600,
        lineHeight: "1.25rem",
        border: "1px solid #FDB022",
        background: "#FFF",
        minWidth: "2.75rem",
      }}
    >
      New
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-neutral-100 px-1.5 text-[11px] text-[#1a1a1a]">
      {children}
    </span>
  );
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
  iconStyle,
}: {
  active?: boolean;
  icon: React.ElementType;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  tight?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
  iconStyle?: React.CSSProperties;
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
            tight
              ? "h-9 gap-2 px-2.5 py-2"
              : "h-10 gap-2 px-3 py-2"
          )
      )}
      style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
    >
      <Icon
        size={20}
        weight="regular"
        className="shrink-0 text-current"
        style={iconStyle}
      />

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

function ProfileMenu({
  open,
  onProfile,
  onLogout,
}: {
  open: boolean;
  onProfile: () => void;
  onLogout: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="absolute bottom-[calc(100%+12px)] right-0 z-[70]"
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
        onClick={onProfile}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#1a1a1a] transition hover:bg-[#F5F5F5]"
      >
        <UserCircle size={20} />
        <span>Profile</span>
      </button>

      <div className="h-px w-full bg-neutral-200" />

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-[#F04438] transition hover:bg-[#FFF1F0]"
      >
        <SignOut size={20} />
        <span>Logout</span>
      </button>
    </div>
  );
}

/* -------------------------------- sidebar -------------------------------- */

export default function Sidebar({
  drawerOpen: drawerOpenProp,
  setDrawerOpen: setDrawerOpenProp,
  campaignBadge,
  messagesBadge,
  influencerId,
  token,
  walletBalanceLabel = "$10500",
  inviteMembersHref = ROUTES.invite_members,
  onInviteMembers,
  onLogout,
}: InfluencerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const isShort = useMediaQuery("(max-height: 800px)");
  const vw = useViewportWidth();

  const [profileData, setProfileData] = useState<InfluencerProfile | null>(null);
  const [authContext, setAuthContext] = useState(() =>
    resolveInfluencerAuth(influencerId, token)
  );
  const [profileImageError, setProfileImageError] = useState(false);

  const [active, setActive] = useState<string>("dashboard");
  const [myCampaignOpen, setMyCampaignOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [widthCollapsed, setWidthCollapsed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [drawerOpenInternal, setDrawerOpenInternal] = useState(false);
  const drawerOpen = drawerOpenProp ?? drawerOpenInternal;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpDialogPosition, setHelpDialogPosition] = useState({
    top: 0,
    left: 0,
  });

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const helpAnchorRef = useRef<HTMLDivElement | null>(null);
  const helpDialogRef = useRef<HTMLDivElement | null>(null);

  const tight = isShort;
  const railMode = isDesktop && (collapsed || isClosing);
  const compactUI = isDesktop ? collapsed || isClosing : false;
  const visualActiveKey = helpDialogOpen ? "help" : active;

  const profileName = profileData?.name?.trim() || "Aditya";
  const profileEmail = profileData?.email?.trim() || "aditya@mail.collabgla...";
  const profileImage = profileData?.profileImage?.trim() || "";
  const showProfileImage = Boolean(profileImage) && !profileImageError;

  const normalizedPlanName = useMemo(
    () =>
      profileData?.planName ? profileData.planName.trim().toLowerCase() : null,
    [profileData?.planName]
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

  const items = useMemo<Item[]>(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: House,
        section: "overview",
        href: ROUTES.dashboard,
      },
      {
        key: "direct_invites",
        label: "Direct Invites",
        icon: ArrowSquareRight,
        section: "overview",
        href: ROUTES.direct_invites,
      },
      {
        key: "my_campaigns",
        label: "My Campaigns",
        icon: CardsThree,
        section: "overview",
        href: ROUTES.my_campaigns,
        iconStyle: {
          width: "1rem",
          height: "1rem",
        },
        children: [
          {
            key: "my_campaigns_all",
            label: "All Campaigns",
            href: ROUTES.my_campaigns_all,
          },
          {
            key: "my_campaigns_applied",
            label: "Applied",
            href: ROUTES.my_campaigns_applied,
          },
          {
            key: "my_campaigns_active",
            label: "Active",
            href: ROUTES.my_campaigns_active,
          },
          {
            key: "my_campaigns_completed",
            label: "Completed",
            href: ROUTES.my_campaigns_completed,
          },
          {
            key: "my_campaigns_rejected",
            label: "Rejected",
            href: ROUTES.my_campaigns_rejected,
          },
        ],
      },
      {
        key: "discover_campaigns",
        label: "Discover Campaigns",
        icon: MagnifyingGlassIcon,
        section: "overview",
        href: ROUTES.discover_campaigns,
        right:
          campaignBadge != null ? <Badge>{campaignBadge}</Badge> : undefined,
      },
      {
        key: "inbox",
        label: "Inbox",
        icon: PaperPlaneTilt,
        section: "overview",
        href: ROUTES.inbox,
        right:
          messagesBadge != null ? <Badge>{messagesBadge}</Badge> : undefined,
      },
      {
        key: "media_kit",
        label: "Media Kit",
        icon: FilmScript,
        section: "overview",
        href: ROUTES.media_kit,
        iconStyle: {
          width: "1rem",
          height: "1rem",
        },
      },
      {
        key: "wallet",
        label: "Wallet",
        icon: Wallet,
        section: "manage",
        href: ROUTES.wallet,
        right: <WalletBalancePill value={walletBalanceLabel} />,
      },
      {
        key: "invite_members",
        label: "Invite Members",
        icon: UserPlus,
        section: "manage",
        href: inviteMembersHref,
        right: <NewBadge />,
      },
      {
        key: "help",
        label: "Help & Support",
        icon: Question,
        section: "manage",
        href: "",
      },
    ],
    [campaignBadge, messagesBadge, walletBalanceLabel, inviteMembersHref]
  );

  const overviewItems = useMemo(
    () => items.filter((item) => item.section === "overview"),
    [items]
  );

  const manageItems = useMemo(
    () => items.filter((item) => item.section === "manage"),
    [items]
  );

  const helpMenuItems = useMemo<Array<{ key: SupportMenuKey; label: string }>>(
    () => [
      { key: "dispute", label: "Dispute" },
      { key: "privacy_policy", label: "Privacy Policy" },
    ],
    []
  );

  const setDrawerOpen = useCallback(
    (open: boolean) => {
      if (setDrawerOpenProp) setDrawerOpenProp(open);
      else setDrawerOpenInternal(open);
    },
    [setDrawerOpenProp]
  );

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
    const max = 320;
    const min = 260;
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

  const dropdownScaleY: Variants = useMemo(
    () => ({
      initial: { opacity: 0, height: 0 },
      animate: { opacity: 1, height: "auto" },
      exit: { opacity: 0, height: 0 },
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

  useEffect(() => {
    setAuthContext(resolveInfluencerAuth(influencerId, token));
  }, [influencerId, token]);

  useEffect(() => {
    setProfileImageError(false);
  }, [profileImage]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const res = await apiGetInfluencerLite(
          authContext.influencerId,
          authContext.token
        );

        if (!cancelled) setProfileData(res);
      } catch {
        if (!cancelled) setProfileData(null);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authContext.influencerId, authContext.token]);

  useEffect(() => {
    if (isDesktop) {
      setDrawerOpen(false);
      setCollapsed(false);
      setIsClosing(false);
      setWidthCollapsed(false);
      setProfileMenuOpen(false);
      setHelpDialogOpen(false);
    } else {
      setCollapsed(false);
      setIsClosing(false);
      setWidthCollapsed(false);
    }
  }, [isDesktop, setDrawerOpen]);

  useEffect(() => {
    const p = (pathname || "").replace(/\/+$/, "");
    const tab = searchParams?.get("tab") || "";

    if (isSupportPath(p)) {
      setActive("help");
      return;
    }

    if (p === ROUTES.my_campaigns || p.startsWith(`${ROUTES.my_campaigns}/`)) {
      const slug =
        p
          .replace(ROUTES.my_campaigns, "")
          .split("/")
          .filter(Boolean)[0] ||
        tab ||
        "all";

      const campaignActiveMap: Record<string, string> = {
        all: "my_campaigns_all",
        applied: "my_campaigns_applied",
        active: "my_campaigns_active",
        completed: "my_campaigns_completed",
        rejected: "my_campaigns_rejected",
      };

      setActive(campaignActiveMap[slug] ?? "my_campaigns_all");

      if (!(isDesktop && collapsed)) setMyCampaignOpen(true);
      return;
    }

    const routeMatch = items
      .filter((item) => item.href)
      .sort((a, b) => String(b.href).length - String(a.href).length)
      .find((item) => {
        const href = String(item.href).split("?")[0];
        return p === href || p.startsWith(`${href}/`);
      });

    setActive(routeMatch?.key ?? "dashboard");
    setMyCampaignOpen(false);
  }, [pathname, searchParams, items, isDesktop, collapsed]);

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

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;

      if (helpDialogRef.current?.contains(target)) return;
      if (helpAnchorRef.current?.contains(target)) return;

      setHelpDialogOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [helpDialogOpen]);

  const beginOpenDesktop = useCallback(() => {
    setCollapsed(false);
    setIsClosing(false);
    setWidthCollapsed(false);
  }, []);

  const beginCloseDesktop = useCallback(() => {
    setIsClosing(true);
    setMyCampaignOpen(false);
    setWidthCollapsed(true);
    setProfileMenuOpen(false);
    setHelpDialogOpen(false);
  }, []);

  const handlePlanClick = useCallback(() => {
    router.push(ROUTES.subscriptions);
    if (!isDesktop) setDrawerOpen(false);
  }, [router, isDesktop, setDrawerOpen]);

  const openHelpDialog = useCallback(() => {
    setActive("help");

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
      setActive("help");
      setHelpDialogOpen(false);

      switch (key) {
        case "dispute":
          router.push("/influencer/disputes");
          break;
        case "report_issue":
          router.push("/influencer/report-issue");
          break;
        case "help_center":
          router.push("/influencer/support-centre");
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

  const handleLogout = useCallback(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      document.cookie = "influencerId=; Max-Age=0; path=/";
      document.cookie = "influencer_token=; Max-Age=0; path=/";
      document.cookie = "token=; Max-Age=0; path=/";
    } catch {
      // ignore cleanup errors
    }

    setProfileMenuOpen(false);
    setHelpDialogOpen(false);

    if (!isDesktop) setDrawerOpen(false);

    onLogout?.();
    router.replace("/influencer/login");
  }, [onLogout, router, isDesktop, setDrawerOpen]);

  const handleProfileClick = useCallback(() => {
    setProfileMenuOpen(false);
    router.push(ROUTES.profile);

    if (!isDesktop) setDrawerOpen(false);
  }, [router, isDesktop, setDrawerOpen]);

  const handleSetActive = useCallback(
    (key: string) => {
      const item = items.find((x) => x.key === key);
      if (!item) return;

      setHelpDialogOpen(false);

      if (key === "invite_members" && onInviteMembers) {
        setActive(key);
        onInviteMembers();

        if (!isDesktop) setDrawerOpen(false);
        return;
      }

      if (!item.href) return;

      setActive(key);
      setMyCampaignOpen(false);
      router.push(item.href);

      if (!isDesktop) setDrawerOpen(false);
    },
    [items, router, isDesktop, setDrawerOpen, onInviteMembers]
  );

  const handleMyCampaignParentClick = useCallback(() => {
    setHelpDialogOpen(false);
    setActive("my_campaigns_all");
    setMyCampaignOpen(true);
    router.push(ROUTES.my_campaigns_all);

    if (!isDesktop) setDrawerOpen(false);
  }, [router, isDesktop, setDrawerOpen]);

  const handleMyCampaignChildClick = useCallback(
    (child: { key: string; href?: string }) => {
      const href = child.href || ROUTES[child.key];

      if (!href) return;

      setHelpDialogOpen(false);
      setActive(child.key);
      setMyCampaignOpen(true);
      router.push(href);

      if (!isDesktop) setDrawerOpen(false);
    },
    [router, isDesktop, setDrawerOpen]
  );
  const renderItem = useCallback(
    (item: Item) => {
      const isCollapsed = isDesktop && (collapsed || isClosing);
      const isMyCampaignItem = item.key === "my_campaigns";

      if (item.key === "help") {
        return (
          <div key={item.key} ref={helpAnchorRef}>
            <RowButton
              icon={item.icon}
              label={item.label}
              active={helpDialogOpen || visualActiveKey === "help"}
              tight={tight}
              collapsed={isCollapsed}
              onClick={openHelpDialog}
            />
          </div>
        );
      }

      if (isMyCampaignItem) {
        const isMyCampaignActive =
          visualActiveKey === "my_campaigns" ||
          visualActiveKey.startsWith("my_campaigns_");

        if (isCollapsed) {
          return (
            <RowButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={isMyCampaignActive}
              tight={tight}
              collapsed={isCollapsed}
              iconStyle={item.iconStyle}
              onClick={handleMyCampaignParentClick}
            />
          );
        }

        return (
          <div key={item.key} className="w-full">
            <div
              className={cn(
                "flex h-10 w-full items-center rounded-lg transition-all duration-300",
                FOCUS_RING,
                REST_NAV,
                isMyCampaignActive ? ACTIVE_NAV : HOVER_NAV
              )}
              style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
            >
              <button
                type="button"
                onClick={handleMyCampaignParentClick}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
              >
                <item.icon
                  size={20}
                  weight={isMyCampaignActive ? "fill" : "regular"}
                  className="shrink-0 text-current"
                  style={item.iconStyle}
                />
                <span className="truncate text-[14px] leading-5 text-current">
                  {item.label}
                </span>
              </button>

              <button
                type="button"
                aria-label={
                  myCampaignOpen
                    ? "Close my campaigns menu"
                    : "Open my campaigns menu"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setMyCampaignOpen((prev) => !prev);
                }}
                className="flex h-full items-center px-3 text-current"
              >
                <m.span
                  className="inline-flex items-center"
                  animate={{ rotate: myCampaignOpen ? 180 : 0 }}
                  transition={motionTransitions.content}
                >
                  <CaretDown size={18} className="text-current opacity-70" />
                </m.span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {myCampaignOpen && !(isDesktop && isClosing) && (
                <m.div
                  key="my-campaigns-dropdown"
                  variants={dropdownScaleY}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={motionTransitions.content}
                  className="origin-top overflow-hidden"
                >
                  <div
                    style={{
                      display: "flex",
                      paddingLeft: "1.75rem",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "0.25rem",
                      alignSelf: "stretch",
                      paddingTop: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "14.4375rem",
                        maxWidth: "100%",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "0.25rem",
                      }}
                    >
                      {(item.children ?? []).map((child) => {
                        const isSubActive = visualActiveKey === child.key;

                        return (
                          <button
                            key={child.key}
                            type="button"
                            onClick={() => handleMyCampaignChildClick(child)}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left transition",
                              FOCUS_RING,
                              isSubActive
                                ? "bg-[#EDEDED] text-[#1a1a1a]"
                                : "bg-transparent text-[#1a1a1a] hover:bg-[#F5F5F5]"
                            )}
                            style={{
                              borderRadius: "0.5rem",
                              background: isSubActive
                                ? "var(--Light-Background-NeutralHover, #EDEDED)"
                                : undefined,
                              fontSize: "14px",
                              lineHeight: "20px",
                              fontWeight: child.key === "my_campaigns_all" ? 600 : 400,
                            }}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      return (
        <RowButton
          key={item.key}
          icon={item.icon}
          label={item.label}
          right={item.right}
          active={visualActiveKey === item.key}
          tight={tight}
          collapsed={isCollapsed}
          iconStyle={item.iconStyle}
          onClick={() => handleSetActive(item.key)}
        />
      );
    },
    [
      collapsed,
      dropdownScaleY,
      handleMyCampaignChildClick,
      handleMyCampaignParentClick,
      handleSetActive,
      helpDialogOpen,
      isClosing,
      isDesktop,
      motionTransitions.content,
      myCampaignOpen,
      openHelpDialog,
      tight,
      visualActiveKey,
    ]
  );

  const LogoButton = (
    <button
      type="button"
      onClick={() => {
        if (isDesktop) {
          if (collapsed || isClosing) beginOpenDesktop();
          else router.push(ROUTES.dashboard);
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

  const BottomProfileSection = (
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
            <SidebarTooltip
              content={isPaidPlan ? `Manage ${planLabel} plan` : "Upgrade to PRO"}
            >
              <m.button
                type="button"
                aria-label={
                  isPaidPlan ? `Manage ${planLabel} plan` : "Upgrade to PRO"
                }
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
                {isPaidPlan && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#1a1a1a]" />
                )}
              </m.button>
            </SidebarTooltip>

            <div className="h-px w-full bg-neutral-200" />

            <SidebarTooltip content="Profile">
              <button
                type="button"
                onClick={handleProfileClick}
                aria-label="Open profile"
                className={cn(
                  "h-10 w-10 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 transition hover:bg-neutral-200",
                  FOCUS_RING
                )}
              >
                {showProfileImage ? (
                  <img
                    src={profileImage}
                    alt={profileName}
                    className="h-full w-full object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[15px] font-semibold text-[#1a1a1a]">
                    {profileName.charAt(0).toUpperCase()}
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
            <m.div
              initial="rest"
              animate="rest"
              whileHover="hover"
              transition={upgradeSpring}
              className={cn(
                "relative flex w-full cursor-pointer flex-col items-start gap-2.5 overflow-hidden p-2",
                FOCUS_RING
              )}
              style={upgradeShellStyle}
              tabIndex={0}
              role="button"
              onClick={handlePlanClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePlanClick();
                }
              }}
            >
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
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="relative h-6 w-6">
                    <m.span
                      className="absolute inset-0 grid place-items-center"
                      variants={{
                        rest: { opacity: 1 },
                        hover: { opacity: 0 },
                      }}
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
                      variants={{
                        rest: { opacity: 0 },
                        hover: { opacity: 1 },
                      }}
                      transition={upgradeSpring}
                    >
                      <Lightning
                        size={24}
                        weight="fill"
                        className="text-[#1a1a1a]"
                      />
                    </m.span>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1a]">
                    {planLabel}
                  </span>
                </div>

                <div className="text-[18px] font-semibold leading-[24px] text-[#1a1a1a]">
                  {upgradeCardTitle}
                </div>

                <div className="font-[Inter] text-[14px] font-normal leading-[18px] text-[#1a1a1a]">
                  {upgradeCardDesc}
                </div>
              </div>
            </m.div>

            <div className={cn("my-5 h-px w-full bg-neutral-200", tight ? "my-4" : "")} />

            <div className="relative" ref={profileMenuRef}>
              <div className="flex w-full items-center gap-3 bg-white p-3">
                <SidebarTooltip content="Profile" side="top">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    aria-label="Open profile"
                    className={cn(
                      "h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 transition hover:bg-neutral-200",
                      FOCUS_RING
                    )}
                  >
                    {showProfileImage ? (
                      <img
                        src={profileImage}
                        alt={profileName}
                        className="h-full w-full object-cover"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[15px] font-semibold text-[#1a1a1a]">
                        {profileName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                </SidebarTooltip>

                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[16px] font-semibold text-[#1a1a1a]">
                    {profileName}
                  </div>

                  <div className="truncate text-[12px] text-neutral-500">
                    {profileEmail}
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
                    key="profile-menu"
                    variants={dropdownY}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={motionTransitions.content}
                  >
                    <ProfileMenu
                      open={profileMenuOpen}
                      onProfile={handleProfileClick}
                      onLogout={handleLogout}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );

  const SidebarBody = (
    <div className="flex h-full w-full flex-col">
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
                  For Creators
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
                key="dashboard-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionTransitions.content}
                className="mb-4 w-full text-[16px] font-semibold text-neutral-400"
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
            {overviewItems.map((item) => renderItem(item))}
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
                className="mb-4 w-full text-[16px] font-semibold text-neutral-400"
              >
                Manage
              </m.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex flex-col",
              railMode ? "gap-3" : "w-full gap-2"
            )}
          >
            {manageItems.map((item) => renderItem(item))}
          </div>
        </div>

        {BottomProfileSection}
      </div>
    </div>
  );

  const DesktopAside = (
    <m.aside
      data-cg-sidebar
      id="cg-sidebar"
      className="inline-flex h-dvh flex-col select-none border border-neutral-200 bg-white"
      style={{
        display: "flex",
        padding: "0.75rem 1rem 1rem 1rem",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        alignSelf: "stretch",
        border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
        background: "#FFF",
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
              display: "flex",
              padding: "0.75rem 1rem 1rem 1rem",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
              alignSelf: "stretch",
              border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
              background: "#FFF",
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

  return (
    <TooltipProvider delayDuration={120}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
          <>
            {isDesktop ? DesktopAside : MobileDrawer}

            <HelpDialog
              open={helpDialogOpen}
              dialogRef={helpDialogRef}
              position={helpDialogPosition}
              items={helpMenuItems}
              onSelect={handleHelpMenuSelect}
              focusRingClassName={FOCUS_RING}
            />
          </>
        </MotionConfig>
      </LazyMotion>
    </TooltipProvider>
  );
}