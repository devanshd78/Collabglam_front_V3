"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  apiCampaignViewByBrand,
  getApiErrorMessage,
  type EnrichedCampaignDoc,
  apiGetBrandWallet,
  apiBrandWalletTopup,
  apiConfirmBrandWalletTopup,
  apiCampaignRecommendedInfluencers,
  apiCampaignDelete,
  apiCampaignUpdateStatus,
  apiCampaignInviteInfluencer,
  apiGetListByCampaign,
  apiEnableCampaignShare,
} from "@/app/brand/services/brandApi";
import { createPortal } from "react-dom";
import { InfluencerTable, type InfluencerRow } from "@/components/ui/brand/Influencertable";
import { ArrowUpRight } from "lucide-react";
import {
  PencilSimple,
  Users as UsersIcon,
  MoneyWavy,
  CurrencyDollar,
  PlusCircle,
  CalendarDots,
  CalendarX,
  Wallet,
  EnvelopeOpen,
  Eye,
  Link,
  Trash,
  TrashIcon,
  DotsThreeIcon,
  CaretRightIcon,
  EnvelopeIcon,
  PaperPlaneTiltIcon,
  LinkIcon,
  IdentificationCardIcon,
  BookmarkSimple,
  WarningCircle,
  DotsThree,
  Newspaper,
  CaretDown,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  FilePdf,
  FolderSimpleStarIcon,
} from "@phosphor-icons/react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/buttonComp";
import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { toast } from "@/components/ui/toast";
import Image from "next/image";

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
// const stripePromise = loadStripe(
//   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
// );

interface InfluencerContextMenuProps {
  onViewProfile?: () => void;
  onMoveToFolder?: () => void;
  onViewRateCard?: () => void;
  onCopyProfileLink?: () => void;
  onViewInfluencerList?: () => void;
  onInviteInfluencer?: () => void;
  onRaiseDispute?: () => void;
  onSaveToHub?: () => void;
  onMoveToWorkspace?: () => void;
  onNotRelevant?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  hideCopyLink?: boolean;
  hideInviteInfluencer?: boolean;
  hideDelete?: boolean;
  disableDelete?: boolean;
}

function asArray<T = any>(v: any): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeMongoId(id: any): string {
  if (id == null) return "";
  if (typeof id === "string" || typeof id === "number") return String(id);

  if (typeof id === "object") {
    if (typeof (id as any).toHexString === "function") return (id as any).toHexString();
    if (typeof (id as any).$oid === "string") return (id as any).$oid;
    if (typeof (id as any).oid === "string") return (id as any).oid;
    if (typeof (id as any).id === "string" || typeof (id as any).id === "number") {
      return String((id as any).id);
    }
    if ((id as any)._id != null) return normalizeMongoId((id as any)._id);
    if (typeof (id as any).toString === "function") {
      const s = (id as any).toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return "";
}

function normalizePlatform(p: any): "instagram" | "youtube" | "tiktok" | null {
  const s = String(p ?? "").toLowerCase().trim();
  if (s.includes("insta")) return "instagram";
  if (s.includes("you")) return "youtube";
  if (s.includes("tiktok") || s.includes("tik")) return "tiktok";
  return null;
}

function toHandle(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s : `@${s}`;
}

function safeAvatar(x: any) {
  const u = String(
    x?.profilePic ??
    x?.avatarUrl ??
    x?.profile?.avatarUrl ??
    x?.photo ??
    x?.image ??
    x?.profileImage ??
    ""
  ).trim();
  return u || "https://picsum.photos/seed/fallback/200/200";
}

function mapRecommendedToRow(x: any): InfluencerRow {
  const id = normalizeMongoId(x?._id ?? x?.id ?? x?.influencerId);

  const name = String(x?.name ?? x?.profile?.name ?? x?.fullName ?? "Unknown").trim();

  const handle = toHandle(
    x?.handle ?? x?.username ?? x?.instagramHandle ?? x?.profile?.handle ?? x?.socialHandle
  );

  const category = String(
    x?.categories?.[0]?.name ?? x?.category?.name ?? x?.categoryName ?? "—"
  ).trim();

  const rawPlatforms = Array.isArray(x?.platforms)
    ? x.platforms
    : Array.isArray(x?.socials)
      ? x.socials
      : Array.isArray(x?.socialProfiles)
        ? x.socialProfiles
        : [];

  const platforms =
    rawPlatforms.length > 0
      ? (rawPlatforms
        .map((p: any) => {
          const platform = normalizePlatform(p?.platform ?? p?.name ?? p?.type);
          if (!platform) return null;
          return {
            platform,
            followers: Number(p?.followers ?? p?.followerCount ?? p?.followersCount ?? 0) || 0,
            engagement: Number(p?.engagement ?? p?.engagementRate ?? p?.er ?? 0) || 0,
          };
        })
        .filter(Boolean) as any)
      : (asArray(x?.page1)
        .flatMap((q: any) => (q?.question === "Selected platforms" ? asArray(q?.answers) : []))
        .map((p: any) => {
          const platform = normalizePlatform(p);
          if (!platform) return null;
          return { platform, followers: 0, engagement: 0 };
        })
        .filter(Boolean) as any);

  const appliedDateRaw = x?.appliedDate ?? x?.matchedAt ?? x?.createdAt ?? x?.updatedAt ?? "";
  const appliedDate = appliedDateRaw ? String(appliedDateRaw).slice(0, 10) : "—";

  return {
    id: id || "",
    profile: {
      name,
      handle: handle || "—",
      avatarUrl: safeAvatar(x),
    },
    category,
    platforms,
    appliedDate,
  };
}
const copyText = async (text: string) => {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (success) return true;
  }

  return false;
};
const PAGE_WRAP = "flex w-full flex-col items-start gap-7 px-4 py-6 sm:px-6 lg:px-10 xl:px-14";
const TOPBAR_GRADIENT =
  "linear-gradient(109deg, var(--Neutrals-0, #FFF) 28.8%, #FAFAFA 36.05%, rgba(255, 191, 0, 0.83) 50%, #F6BB2A 57.65%, #F3584E 74.04%, #E078D1 84.62%), var(--Light-Background-Subtle, #F9F9F9)";
function pad2(n: number) {
  const x = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return String(x).padStart(2, "0");
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

function Metric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? label : undefined}
      className={[
        "flex flex-col items-start justify-center",
        clickable
          ? "cursor-pointer rounded-xl p-4 transition hover:bg-black/[0.03] active:bg-black/[0.06] focus:outline-none focus:ring-2 focus:ring-black/20"
          : "",
      ].join(" ")}
    >
      <div className="text-xs text-gray-400" style={{ fontFamily: "Inter" }}>
        {label}
      </div>
      <div
        className="mt-2 text-base font-semibold text-[#1A1A1A]"
        style={{ fontFamily: "Inter" }}
      >
        {value}
      </div>
    </div>
  );
}

function getYoutubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || "";
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("shorts");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch { }
  return "";
}

function getVideoThumb(url: string) {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function getMediaUrl(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();

  return String(
    item?.dataUrl ??
    item?.url ??
    item?.src ??
    item?.path ??
    item?.image ??
    item?.imageUrl ??
    item?.secure_url ??
    ""
  ).trim();
}

const statuses = [
  { label: "Active", dot: "bg-[#28A745]", ring: "bg-[#BCE4C5]" },
  { label: "Paused", dot: "bg-[#DC3545]", ring: "bg-[#F5C6CB]" },
  { label: "Draft", dot: "bg-[#9E9E9E]", ring: "bg-[#E0E0E0]" },
  { label: "Scheduled", dot: "bg-[#4A90D9]", ring: "bg-[#BDD7F5]" },
  { label: "Completed", dot: "bg-[#F07B3F]", ring: "bg-[#FAD6C0]" },
];

function normalizeCampaignStatusValue(status: string) {
  const v = String(status ?? "").trim().toLowerCase();
  if (v === "complete") return "completed";
  return v;
}

function getAllowedNextStatuses(currentStatus: string): string[] {
  const current = normalizeCampaignStatusValue(currentStatus);

  switch (current) {
    case "draft":
      return ["active"];

    case "scheduled":
      return ["active"];

    case "active":
      return ["paused", "completed"];

    case "paused":
      return ["active", "completed"];

    case "completed":
      return [];

    default:
      return [];
  }
}

function StatusDot({ dot, ring }: { dot: string; ring: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full p-[0.125rem] ${ring}`}>
      <span className={`h-[0.5rem] w-[0.5rem] rounded-full ${dot}`} />
    </span>
  );
}

interface CampaignStatusDropdownProps {
  brandId: string;
  campaignId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  forceLocked?: boolean;
}


function CampaignStatusConfirmModal({
  open,
  loading,
  targetStatus,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading?: boolean;
  targetStatus: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const isResume = normalizeCampaignStatusValue(targetStatus) === "active";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-status-modal-title"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="flex w-full max-w-[47.5rem] flex-col overflow-hidden rounded-[1rem] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between self-stretch border-b border-[#E6E6E6] px-4 py-3">
          <h2
            id="campaign-status-modal-title"
            className="m-0 text-[1.25rem] font-semibold leading-[1.75rem] tracking-normal text-[#1A1A1A]"
            style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
          >
            {isResume
              ? "Resume Creator Applications"
              : "Are you sure you want to pause this campaign?"}
          </h2>

          <button
            type="button"
            aria-label="Close"
            disabled={loading}
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[0.5rem] text-[1.75rem] font-light leading-none text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-center gap-2.5 self-stretch px-4 py-10">
          {isResume ? (
            <p
              className="m-0 w-full text-[1rem] font-medium leading-[1.5rem] tracking-normal text-[#969696]"
              style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
            >
              Resuming this campaign will{" "}
              <span className="font-semibold text-[#1A1A1A]">
                reopen creator discovery
              </span>{" "}
              and{" "}
              <span className="font-semibold text-[#1A1A1A]">
                applications
              </span>
              . Existing creators will retain access to all campaign activities
              and deliverables.
            </p>
          ) : (
            <p
              className="m-0 w-full text-[1rem] font-medium leading-[1.5rem] tracking-normal text-[#969696]"
              style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
            >
              New creators will no longer be able to{" "}
              <span className="font-semibold text-[#1A1A1A]">
                discover or apply
              </span>{" "}
              to this campaign. Existing creators will retain access and can
              continue working on their assigned milestones and deliverables.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 self-stretch border-y border-[#E6E6E6] px-4 py-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-11 cursor-pointer items-center justify-center px-2 text-[0.75rem] font-medium leading-5 text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
          >
            Oh sorry don’t do
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={[
              "flex h-11 cursor-pointer items-center justify-center rounded-[0.5rem] px-6 text-[0.75rem] font-semibold leading-5 disabled:cursor-not-allowed disabled:opacity-60",
              isResume
                ? "bg-[#1A1A1A] text-white"
                : "bg-[#FCEEEC] text-[#E35141]",
            ].join(" ")}
            style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
          >
            {loading
              ? "Updating..."
              : isResume
                ? "Resume campaign"
                : "I know that"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CampaignStatusDropdown({
  brandId,
  campaignId,
  currentStatus,
  onStatusChange,
  forceLocked = false,
}: CampaignStatusDropdownProps) {
  const [value, setValue] = useState<string>(
    normalizeCampaignStatusValue(currentStatus || "draft")
  );
  const [loading, setLoading] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");

  useEffect(() => {
    if (currentStatus) {
      setValue(normalizeCampaignStatusValue(currentStatus));
    }
  }, [currentStatus]);

  const currentMeta =
    statuses.find((s) => s.label.toLowerCase() === value) ?? statuses[2];

  const nextStatusValues = useMemo(() => getAllowedNextStatuses(value), [value]);

  const dropdownOptions = useMemo(() => {
    return statuses.filter((s) => nextStatusValues.includes(s.label.toLowerCase()));
  }, [nextStatusValues]);

  const isLocked =
    forceLocked || value === "completed" || dropdownOptions.length === 0;

  const updateCampaignStatus = async (newStatus: string) => {
    const normalizedNewStatus = normalizeCampaignStatusValue(newStatus);
    const previous = value;

    setValue(normalizedNewStatus);
    setLoading(true);

    try {
      const resp: any = await apiCampaignUpdateStatus({
        brandId,
        campaignId,
        status: normalizedNewStatus as any,
      });

      const msg =
        resp?.message ??
        resp?.data?.message ??
        resp?.data?.data?.message ??
        "Status updated";

      toast({ icon: "success", title: msg });
      onStatusChange?.(normalizedNewStatus);

      return true;
    } catch (err: unknown) {
      setValue(previous);
      toast({
        icon: "error",
        title: getApiErrorMessage(err, "Status update failed"),
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (newValue: string | null) => {
    if (!newValue || loading || forceLocked) return;

    const normalizedNewValue = normalizeCampaignStatusValue(newValue);

    if (normalizedNewValue === value) return;

    if (normalizedNewValue === "paused" || normalizedNewValue === "active") {
      setPendingStatus(normalizedNewValue);
      setStatusModalOpen(true);
      return;
    }

    await updateCampaignStatus(normalizedNewValue);
  };

  const closeStatusModal = () => {
    if (loading) return;

    setStatusModalOpen(false);
    setPendingStatus("");
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;

    const updated = await updateCampaignStatus(pendingStatus);

    if (updated) {
      setStatusModalOpen(false);
      setPendingStatus("");
    }
  };

  if (isLocked) {
    return (
      <div className="inline-flex items-center gap-1.5 h-8 px-2 bg-transparent text-sm font-medium text-[#1A1A1A]">
        <StatusDot dot={currentMeta.dot} ring={currentMeta.ring} />
        <span className="capitalize">{value}</span>
      </div>
    );
  }

  return (
    <>
      <Combobox value={value} onValueChange={handleChange}>
        <ComboboxTrigger className="inline-flex items-center gap-1.5 h-8 px-2 bg-transparent text-sm font-medium text-[#1A1A1A]">
          <StatusDot dot={currentMeta.dot} ring={currentMeta.ring} />
          <span className="capitalize">{value}</span>
        </ComboboxTrigger>

        <ComboboxContent
          className="
          w-[13.6875rem]
          max-h-[16.25rem]
          rounded-[0.75rem]
          bg-white
          py-[1rem]
          px-[0.75rem]
        "
        >
          <ComboboxList>
            {dropdownOptions.map((s) => (
              <ComboboxItem
                key={s.label}
                value={s.label.toLowerCase()}
                className="capitalize rounded-lg px-3 py-2"
                showIndicator={false}
              >
                <div className="flex items-center gap-2 w-full text-sm leading-5 font-medium">
                  <StatusDot dot={s.dot} ring={s.ring} />
                  {s.label}
                </div>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <CampaignStatusConfirmModal
        open={statusModalOpen}
        loading={loading}
        targetStatus={pendingStatus}
        onClose={closeStatusModal}
        onConfirm={confirmStatusChange}
      />
    </>
  );
}

const menuItems = [
  { label: "Copy Link", icon: LinkIcon, key: "copylink" },
  { label: "View Influencer list", icon: Eye, key: "viewinfluencerlist" },
  { label: "Invite Influencer", icon: IdentificationCardIcon, key: "inviteinfluencer" },
  { label: "Raise Dispute", icon: WarningCircle, key: "raisedispute" },
];

export function InfluencerContextMenu({
  onViewProfile,
  onMoveToFolder,
  onViewRateCard,
  onCopyProfileLink,
  onViewInfluencerList,
  onInviteInfluencer,
  onRaiseDispute,
  onMoveToWorkspace,
  onDelete,
  hideCopyLink = false,
  hideInviteInfluencer = false,
  hideDelete = false,
  disableDelete = false,
}: InfluencerContextMenuProps) {
  const [workspaceSubmenuOpen, setWorkspaceSubmenuOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRootRef.current) return;
      if (!menuRootRef.current.contains(e.target as Node)) {
        setWorkspaceSubmenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlers: Record<string, (() => void) | undefined> = {
    viewProfile: onViewProfile,
    moveToFolder: onMoveToFolder,
    viewRateCard: onViewRateCard,
    copylink: onCopyProfileLink,
    viewinfluencerlist: onViewInfluencerList,
    inviteinfluencer: onInviteInfluencer,
    raisedispute: onRaiseDispute,
  };

  const visibleMenuItems = menuItems.filter((item) => {
    if (hideCopyLink && item.key === "copylink") return false;
    if (hideInviteInfluencer && item.key === "inviteinfluencer") return false;
    return true;
  });

  const workspaces = [
    { id: "nike", name: "Nike Workspace", logo: <EnvelopeIcon /> },
    { id: "mailchimp", name: "Mailchimp", logo: <PaperPlaneTiltIcon /> },
    { id: "slack", name: "Slack Workspace", logo: <EnvelopeIcon /> },
    { id: "notion", name: "Notion Workspace", logo: <PaperPlaneTiltIcon /> },
  ];

  return (
    <Combobox>
      <ComboboxTrigger
        hideIcon
        aria-label="More actions"
        className="
          my-0
          flex
          h-[2rem] w-[2rem]
          items-center justify-center
          gap-1
          rounded-[0.5rem]
          border border-[#E6E6E6]
          bg-white
          p-0
          shadow-none
          cursor-pointer
        "
      >
        <DotsThreeIcon size={20} weight="bold" />
      </ComboboxTrigger>

      <ComboboxContent
        align="end"
        className="
          w-[13.6875rem]
          rounded-[0.75rem]
          bg-white
          py-[1rem]
          px-[0.75rem]
          shadow-[0_8px_32px_rgba(0,0,0,0.13)]
        "
      >
        <div ref={menuRootRef} className="flex flex-col gap-[0.5rem]">
          {visibleMenuItems.map(({ label, icon: Icon, key }) => {
            const isCaretRight = key === "moveToWorkspace" || key === "linkiemfolder";
            const isWorkspace = key === "moveToWorkspace";

            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();

              if (isWorkspace) {
                setWorkspaceSubmenuOpen((prev) => !prev);
                return;
              }

              setWorkspaceSubmenuOpen(false);
              handlers[key]?.();
            };

            return (
              <div key={key} className="relative">
                <button
                  onClick={handleClick}
                  className="
                    w-full flex items-center gap-[0.5rem]
                    px-[0.5rem] py-[0.5rem]
                    text-[0.875rem] font-medium
                    rounded-[0.5rem]
                    text-[#1A1A1A]
                    hover:bg-[#F5F5F5]
                    transition-colors
                    cursor-pointer
                  "
                >
                  {label === "Move to workspace" ? (
                    <Image
                      width={16}
                      height={16}
                      src="/Component 32.svg"
                      alt="workspace icon"
                      draggable={false}
                    />
                  ) : (
                    Icon && <Icon size={16} className="w-[1rem] h-[1rem] text-[#1A1A1A]" />
                  )}

                  <span className="flex-1 text-left text-sm font-normal">{label}</span>

                  {isCaretRight && <CaretRightIcon size={16} />}
                </button>

                {isWorkspace && workspaceSubmenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="
                      absolute top-0 -left-55 
                      w-[13rem]
                      rounded-[0.75rem]
                      bg-white
                      p-[0.5rem]
                      shadow-[0_8px_32px_rgba(0,0,0,0.13)]
                      z-50
                      flex flex-col gap-[0.25rem]
                    "
                  >
                    <p className="text-[0.7rem] text-[#999] font-medium uppercase tracking-wide ml-2 mb-1">
                      Workspace name
                    </p>

                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMoveToWorkspace?.();
                          setWorkspaceSubmenuOpen(false);
                        }}
                        className="
                          w-full flex items-center gap-3
                          border
                          p-2
                          rounded-md
                          text-sm font-medium
                          hover:bg-[#F5F5F5]
                          transition-colors
                        "
                      >
                        <span className="w-8 h-8 rounded-md bg-black flex items-center justify-center text-white">
                          {ws.logo}
                        </span>
                        {ws.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!hideDelete ? (
            <>
              <div className="border-t border-[#F0F0F0] my-2" />

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    if (disableDelete) {
                      toast({
                        icon: "error",
                        title: "This campaign cannot be deleted because it has active or invited influencers.",
                      });
                      return;
                    }
                    onDelete?.();
                  }}
                  title={
                    disableDelete
                      ? "This campaign cannot be deleted because it has active or invited influencers."
                      : "Delete"
                  }
                  className={`
                      flex w-full items-center gap-2
                      px-2 py-2
                      rounded-md
                      text-sm font-medium
                      transition-colors
                      ${disableDelete
                      ? "text-[#B8B8B8] cursor-not-allowed opacity-60"
                      : "text-[#E53935] hover:bg-[#F5F5F5] cursor-pointer"
                    }
                  `}
                >
                  <Trash size={16} />
                  Delete
                </button>

                {disableDelete ? (
                  <div
                    className="
                      pointer-events-none
                      absolute left-0 top-full z-20 mt-2
                      hidden w-[15rem] rounded-lg border border-[#F1D5D2]
                      bg-[#FFF5F4] px-3 py-2 text-xs font-medium text-[#D14343]
                      shadow-md
                      group-hover:block
                    "
                  >
                    This campaign cannot be deleted because it has active or invited influencers.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </ComboboxContent>
    </Combobox>
  );
}


function parseRecommendedResponse(
  res: any,
  requestedPage: number,
  requestedLimit: number
): { items: any[]; hasMore: boolean | null; limitUsed: number } {
  const items =
    (Array.isArray(res?.items) && res.items) ||
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.docs) && res.docs) ||
    (Array.isArray(res?.data?.docs) && res.data.docs) ||
    (Array.isArray(res?.results) && res.results) ||
    (Array.isArray(res?.data?.results) && res.data.results) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res) && res) ||
    [];

  const pagination = res?.pagination ?? res?.data?.pagination ?? res?.meta ?? res?.data?.meta ?? {};

  const limitUsed =
    Number(res?.limit ?? res?.data?.limit ?? pagination?.limit ?? requestedLimit) || requestedLimit;

  const totalRaw = res?.total ?? res?.data?.total ?? pagination?.total ?? pagination?.count;
  const total = typeof totalRaw === "number" ? totalRaw : Number(String(totalRaw ?? ""));

  const totalPagesRaw = res?.totalPages ?? res?.data?.totalPages ?? pagination?.totalPages;
  const totalPages =
    typeof totalPagesRaw === "number" ? totalPagesRaw : Number(String(totalPagesRaw ?? ""));

  const explicitBool = [
    res?.hasMore,
    res?.data?.hasMore,
    pagination?.hasMore,
    res?.hasNextPage,
    res?.data?.hasNextPage,
    pagination?.hasNextPage,
  ].find((v) => typeof v === "boolean") as boolean | undefined;

  const nextPage = res?.nextPage ?? res?.data?.nextPage ?? pagination?.nextPage ?? null;

  let hasMore: boolean | null = null;

  if (typeof explicitBool === "boolean") hasMore = explicitBool;
  else if (nextPage != null) hasMore = true;
  else if (Number.isFinite(total)) hasMore = requestedPage * limitUsed < total;
  else if (Number.isFinite(totalPages)) hasMore = requestedPage < totalPages;
  else {
    hasMore = items.length === limitUsed ? null : false;
  }

  return { items, hasMore, limitUsed };
}

function RecommendedActionItems({
  row,
  onInvite,
  onDelete,
  onViewProfile,
  onCopyProfileLink,
  onSaveToHub,
  onMoveToWorkspace,
  onNotRelevant,
  isInviting,
}: {
  row: InfluencerRow;
  onInvite?: (row: InfluencerRow) => void;
  onDelete?: (row: InfluencerRow) => void;
  onViewProfile?: (row: InfluencerRow) => void;
  onCopyProfileLink?: (row: InfluencerRow) => void;
  onSaveToHub?: (row: InfluencerRow) => void;
  onMoveToWorkspace?: (row: InfluencerRow) => void;
  onNotRelevant?: (row: InfluencerRow) => void;
  isInviting?: boolean;
}) {
  return (
    <>
      <Button
        onClick={() => onInvite?.(row)}
        disabled={!!isInviting}
        className="my-0 flex items-center justify-center text-white rounded-[0.75rem]"
        style={{
          width: "7.6875rem",
          height: "2rem",
          background: "var(--Light-Background-Selected, #1A1A1A)",
          boxShadow:
            "0 2px 4px -2px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)",
          opacity: isInviting ? 0.6 : 1,
          cursor: isInviting ? "not-allowed" : "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "Inter",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: "1.25rem",
          }}
        >
          {isInviting ? "Sending..." : "Send Invitation"}
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center cursor-pointer rounded-[0.5rem] transition-colors hover:bg-[#EDEDED]"
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--Border-Radius-S, 0.5rem)",
              border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
              background: "var(--Light-Background-Primary, #FFF)",
            }}
          >
            <DotsThree size={18} weight="bold" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="
            w-[13.6875rem]
            rounded-[0.75rem]
            bg-white
            border-0
            p-0
            shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]
            cursor-pointer
          "
        >
          <div className="flex w-full flex-col items-start gap-4 px-3 py-4">
            <div className="flex w-full flex-col gap-3">
              <DropdownMenuItem
                onClick={() => onViewProfile?.(row)}
                className="
                  flex h-8 w-full items-center gap-2 self-stretch
                  px-0 py-0 pl-2 pr-0
                  rounded-[0.5rem]
                  text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                  hover:bg-[#EDEDED]
                  focus:bg-[#EDEDED]
                  data-[highlighted]:bg-[#EDEDED]
                "
              >
                <Eye size={16} weight="bold" className="text-[#1A1A1A]" />
                <span>View Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onCopyProfileLink?.(row)}
                className="
                  flex h-8 w-full items-center gap-2 self-stretch
                  px-0 py-0 pl-2 pr-0
                  rounded-[0.5rem]
                  text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                  hover:bg-[#EDEDED]
                  focus:bg-[#EDEDED]
                  data-[highlighted]:bg-[#EDEDED]
                "
              >
                <Link size={16} weight="bold" className="text-[#1A1A1A]" />
                <span>Copy profile link</span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className="
                    flex h-8 w-full items-center gap-2 self-stretch
                    px-0 py-0 pl-2 pr-0
                    rounded-[0.5rem]
                    text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                    hover:bg-[#EDEDED]
                    focus:bg-[#EDEDED]
                    data-[highlighted]:bg-[#EDEDED]
                    data-[state=open]:bg-[#EDEDED]
                    cursor-pointer
                  "
                >
                  <BookmarkSimple size={16} weight="bold" className="text-[#1A1A1A]" />
                  <span className="flex-1 text-left">Save to HUB</span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent
                  className="
                    w-[13.6875rem]
                    rounded-[0.75rem]
                    bg-white
                    border-0
                    p-0
                    shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]
                    cursor-pointer
                  "
                >
                  <div className="flex w-full flex-col items-start gap-4 px-3 py-4">
                    <DropdownMenuItem
                      onClick={() => onSaveToHub?.(row)}
                      className="
                        flex h-8 w-full items-center gap-2 self-stretch
                        px-0 py-0 pl-2 pr-0
                        rounded-[0.5rem]
                        text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                        hover:bg-[#EDEDED]
                        focus:bg-[#EDEDED]
                        data-[highlighted]:bg-[#EDEDED]
                        cursor-pointer
                      "
                    >
                      <span>Save</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                onClick={(e) => e.preventDefault()}
                className="
                  flex h-8 w-full items-center gap-2 self-stretch
                  px-0 py-0 pl-2 pr-0
                  rounded-[0.5rem]
                  text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                  hover:bg-[#EDEDED]
                  focus:bg-[#EDEDED]
                  data-[highlighted]:bg-[#EDEDED]
                  cursor-pointer
                "
              >
                <Eye size={16} weight="bold" className="text-[#1A1A1A]" />
                <span className="flex-1 text-left">Compare</span>

                <span
                  className="
                    ml-auto inline-flex h-5 items-center justify-center
                    rounded-[1.25rem] bg-[#FFF9E6] px-2
                    text-[0.75rem] font-semibold leading-5 text-[#FFBF00]
                    cursor-pointer
                  "
                >
                  Soon
                </span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className="
                    flex h-8 w-full items-center gap-2 self-stretch
                    px-0 py-0 pl-2 pr-0
                    rounded-[0.5rem]
                    text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                    hover:bg-[#EDEDED]
                    focus:bg-[#EDEDED]
                    data-[highlighted]:bg-[#EDEDED]
                    data-[state=open]:bg-[#EDEDED]
                    cursor-pointer
                  "
                >
                  <Newspaper size={16} weight="bold" className="text-[#1A1A1A]" />
                  <span className="flex-1 text-left">Move to workspace</span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent
                  className="
                    w-[13.6875rem]
                    rounded-[0.75rem]
                    bg-white
                    border-0
                    p-0
                    shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]
                    cursor-pointer
                  "
                >
                  <div className="flex w-full flex-col items-start gap-4 px-3 py-4">
                    <DropdownMenuItem
                      onClick={() => onMoveToWorkspace?.(row)}
                      className="
                        flex h-8 w-full items-center gap-2 self-stretch
                        px-0 py-0 pl-2 pr-0
                        rounded-[0.5rem]
                        text-[0.875rem] font-normal leading-5 text-[#1A1A1A]
                        hover:bg-[#EDEDED]
                        focus:bg-[#EDEDED]
                        data-[highlighted]:bg-[#EDEDED]
                        cursor-pointer
                      "
                    >
                      <span>Move</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </div>

            <div className="h-px w-full bg-[#E6E6E6]" />

            <DropdownMenuItem
              onClick={() => onNotRelevant?.(row)}
              className="
                flex h-8 w-full items-center gap-2 self-stretch
                px-0 py-0 pl-2 pr-0
                rounded-[0.5rem]
                text-[0.875rem] font-normal leading-5 text-[#E53935]
                hover:bg-[#EDEDED]
                focus:bg-[#EDEDED]
                data-[highlighted]:bg-[#EDEDED]
                cursor-pointer
              "
            >
              <WarningCircle size={16} weight="bold" className="text-[#E35141]" />
              <span>Not relevant</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Delete"
        onClick={() => onDelete?.(row)}
        className="flex items-center justify-center cursor-pointer rounded-[0.5rem] transition-colors hover:bg-[#EDEDED]"
        style={{
          height: "2rem",
          padding: "0 0.5rem",
          borderRadius: "0.75rem",
          background: "transparent",
        }}
      >
        <Trash
          weight="fill"
          style={{
            width: "0.88363rem",
            height: "0.95194rem",
            color: "var(--Light-Icon-Negative, #E35141)",
          }}
        />
      </button>
    </>
  );
}

function isFullyManagedCampaign(c: any): boolean {
  const role = String(c?.createdBy?.role ?? "").trim().toLowerCase();
  const userModel = String(c?.createdBy?.userModel ?? "").trim().toLowerCase();
  const managementType = String(c?.managementType ?? "").trim().toLowerCase();

  return (
    role === "admin" ||
    Boolean(c?.byAdmin) ||
    Boolean(c?.isAdminCampaign) ||
    Boolean(c?.createdBy?.isAdmin) ||
    Boolean(c?.isFullyManaged) ||
    Boolean(c?.fullyManaged) ||
    managementType === "fully_managed" ||
    managementType === "fully managed" ||
    (role === "brand" &&
      userModel === "brand" &&
      (Boolean(c?.isFullyManaged) || Boolean(c?.fullyManaged)))
  );
}

function getCampaignStatusForEdit(c: any): string {
  return normalizeCampaignStatusValue(
    c?.status ??
    c?.campaignStatus ??
    c?.publishStatus ??
    c?.details?.status ??
    c?.details?.campaignStatus ??
    ""
  );
}

function canShowEditCampaign(c: any): boolean {
  const status = normalizeCampaignStatusValue(
    c?.status ??
    c?.campaignStatus ??
    c?.publishStatus ??
    c?.details?.status ??
    c?.details?.campaignStatus ??
    ""
  );

  return status === "active" || status === "paused";
}

function ImagePreviewModal({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const activeImage = images[activeIndex] || "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  if (!mounted || !activeImage) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex h-screen w-screen items-center justify-center bg-[#B3B3B3]/95 px-6 py-20"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-8 top-8 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[#D9D9D9] text-[2rem] font-light leading-none text-[#1A1A1A] transition hover:bg-white"
        aria-label="Close preview"
      >
        ×
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          className="absolute left-8 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
          aria-label="Previous image"
        >
          <CaretLeft weight="bold" className="h-5 w-5" />
        </button>
      ) : null}

      <div
        className="flex max-h-[72vh] w-full max-w-[46rem] items-center justify-center overflow-hidden rounded-[0.75rem] bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={activeImage}
          alt="Campaign reference preview"
          className="max-h-[72vh] w-full object-contain"
          draggable={false}
        />
      </div>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className="absolute right-8 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
          aria-label="Next image"
        >
          <CaretRight weight="bold" className="h-5 w-5" />
        </button>
      ) : null}
    </div>,
    document.body
  );
}

export default function ViewCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const idFromQuery = searchParams.get("campaignId") || searchParams.get("id");

  const campaignTitleFromQuery =
    searchParams.get("campaignTitle") ||
    searchParams.get("campaignName") ||
    searchParams.get("name") ||
    "";

  const topupStatus = searchParams.get("topup");
  const stripeSessionId = searchParams.get("session_id");

  const campaignId = useMemo(
    () => normalizeMongoId(idFromQuery ?? (params as any)?.campaignId),
    [idFromQuery, params]
  );

  const decodedCampaignTitleFromQuery = useMemo(() => {
    try {
      return decodeURIComponent(String(campaignTitleFromQuery || "")).trim();
    } catch {
      return String(campaignTitleFromQuery || "").trim();
    }
  }, [campaignTitleFromQuery]);

  const [budgetTab, setBudgetTab] = useState<"remaining" | "used">("remaining");
  const [usableWalletBalance, setUsableWalletBalance] = useState<number>(0);
  const [campaignFreezeAmount, setCampaignFreezeAmount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [doc, setDoc] = useState<EnrichedCampaignDoc | null>(null);

  const [brandId, setBrandId] = useState("");

  const [recommendedRows, setRecommendedRows] = useState<InfluencerRow[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState("");
  const RECO_LIMIT = 10;

  const [recommendedPage, setRecommendedPage] = useState(1);
  const [recommendedHasMore, setRecommendedHasMore] = useState<boolean | null>(null);
  const [recommendedLoadingMore, setRecommendedLoadingMore] = useState(false);

  const [invitingIds, setInvitingIds] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const [otherInfoOpen, setOtherInfoOpen] = useState(false);
  const [audiencePlatformsOpen, setAudiencePlatformsOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);




  useEffect(() => {
    const id =
      localStorage.getItem("brandId") ||
      localStorage.getItem("brandID") ||
      localStorage.getItem("brand_id") ||
      "";
    setBrandId(id);

    if (!id) {
      setErr("brandId not found in localStorage. Please login again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!brandId || !campaignId) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await apiCampaignViewByBrand({ brandId, campaignId });
        if (cancelled) return;
        setDoc(res ?? null);
      } catch (e) {
        if (cancelled) return;
        setErr(getApiErrorMessage(e, "Failed to load campaign"));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [brandId, campaignId]);

  const readBrandWallet = useCallback(async () => {
    if (!brandId || !campaignId) {
      return {
        campaignTotalFrozenAmount: 0,
        campaignCurrentFrozenAmount: 0,
      };
    }

    const walletData = await apiGetBrandWallet({ brandId });

    const freezes = Array.isArray(walletData?.freezes) ? walletData.freezes : [];

    const currentCampaignFreeze = freezes.find((freeze: any) => {
      const freezeCampaignId = normalizeMongoId(freeze?.campaignId);
      return freezeCampaignId === campaignId;
    });

    return {
      campaignTotalFrozenAmount: Number(
        currentCampaignFreeze?.totalFrozenAmount ?? 0
      ),
      campaignCurrentFrozenAmount: Number(
        currentCampaignFreeze?.currentFrozenAmount ?? 0
      ),
    };
  }, [brandId, campaignId]);

  useEffect(() => {
    if (!brandId || !campaignId) return;

    let cancelled = false;

    const run = async () => {
      try {
        const walletSnapshot = await readBrandWallet();

        if (!cancelled) {
          setUsableWalletBalance(walletSnapshot.campaignCurrentFrozenAmount);
          setCampaignFreezeAmount(walletSnapshot.campaignTotalFrozenAmount);
        }
      } catch {
        if (!cancelled) {
          setUsableWalletBalance(0);
          setCampaignFreezeAmount(0);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [brandId, campaignId, readBrandWallet]);

  useEffect(() => {
    if (!brandId || topupStatus !== "success" || !stripeSessionId) return;

    let cancelled = false;

    const confirmTopup = async () => {
      try {
        const res: any = await apiConfirmBrandWalletTopup({
          brandId,
          sessionId: stripeSessionId,
        });

        if (cancelled) return;

        const msg =
          res?.message ??
          res?.data?.message ??
          res?.data?.data?.message ??
          "Funds added successfully";

        const walletSnapshot = await readBrandWallet();

        if (cancelled) return;

        setUsableWalletBalance(walletSnapshot.campaignCurrentFrozenAmount);
        setCampaignFreezeAmount(walletSnapshot.campaignTotalFrozenAmount);
        setTopupAmount("");
        setAddFundsModalOpen(false);

        toast({ icon: "success", title: msg });

        const url = new URL(window.location.href);
        url.searchParams.delete("topup");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      } catch (e) {
        if (cancelled) return;
        toast({
          icon: "error",
          title: getApiErrorMessage(e, "Failed to confirm Stripe payment"),
        });
      }
    };

    confirmTopup();

    return () => {
      cancelled = true;
    };
  }, [brandId, topupStatus, stripeSessionId, readBrandWallet]);

  useEffect(() => {
    if (!brandId || !campaignId) return;

    let cancelled = false;

    const run = async () => {
      setRecommendedLoading(true);
      setRecommendedError("");

      try {
        const page = 1;

        const res: any = await apiCampaignRecommendedInfluencers({
          brandId,
          campaignId,
          page,
          limit: RECO_LIMIT,
        });

        const { items, hasMore } = parseRecommendedResponse(res, page, RECO_LIMIT);

        const rows = asArray(items).map(mapRecommendedToRow);

        if (!cancelled) {
          setRecommendedRows(rows);
          setRecommendedPage(page);

          const finalHasMore = hasMore === null ? (rows.length < RECO_LIMIT ? false : null) : hasMore;
          setRecommendedHasMore(finalHasMore);
        }
      } catch (e) {
        if (!cancelled) {
          setRecommendedError(getApiErrorMessage(e, "Failed to load recommended influencers"));
          setRecommendedHasMore(null);
        }
      } finally {
        if (!cancelled) setRecommendedLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [brandId, campaignId]);

  const handleDelete = async () => {
    if (!brandId || !campaignId) return;

    try {
      await apiCampaignDelete({ brandId, campaignId });
      router.back();
    } catch (e) {
      console.error("Delete failed:", getApiErrorMessage(e, "Failed to delete campaign"));
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleLoadMoreRecommended = async () => {
    if (!brandId || !campaignId) return;
    if (recommendedLoadingMore) return;
    if (recommendedHasMore === false) return;

    const nextPage = recommendedPage + 1;
    setRecommendedLoadingMore(true);

    try {
      const res: any = await apiCampaignRecommendedInfluencers({
        brandId,
        campaignId,
        page: nextPage,
        limit: RECO_LIMIT,
      });

      const { items, hasMore } = parseRecommendedResponse(res, nextPage, RECO_LIMIT);
      const newRows = asArray(items).map(mapRecommendedToRow);

      if (newRows.length === 0) {
        setRecommendedHasMore(false);
        return;
      }

      setRecommendedRows((prev) => {
        const map = new Map<string, InfluencerRow>();
        [...prev, ...newRows].forEach((x) => map.set(x.id, x));
        return Array.from(map.values());
      });

      setRecommendedPage(nextPage);

      const finalHasMore = hasMore === null ? (newRows.length < RECO_LIMIT ? false : null) : hasMore;
      setRecommendedHasMore(finalHasMore);
    } catch (e) {
      setRecommendedError(getApiErrorMessage(e, "Failed to load more influencers"));
    } finally {
      setRecommendedLoadingMore(false);
    }
  };

  const handleInviteInfluencer = async (r: InfluencerRow) => {
    if (!brandId || !campaignId) {
      toast({ icon: "error", title: "Missing brandId/campaignId" });
      return;
    }

    const influencerId = r?.id;
    if (!influencerId) {
      toast({ icon: "error", title: "Invalid influencerId" });
      return;
    }

    if (invitingIds[influencerId]) return;

    setInvitingIds((prev) => ({ ...prev, [influencerId]: true }));

    try {
      const res: any = await apiCampaignInviteInfluencer({
        brandId,
        campaignId,
        influencerId,
      });

      const msg =
        res?.message ??
        res?.data?.message ??
        res?.data?.data?.message ??
        "Invitation sent";

      toast({ icon: "success", title: msg });
    } catch (e) {
      toast({ icon: "error", title: getApiErrorMessage(e, "Failed to send invitation") });
    } finally {
      setInvitingIds((prev) => {
        const next = { ...prev };
        delete next[influencerId];
        return next;
      });
    }
  };

  const handleAddFunds = async () => {
    if (!brandId) {
      toast({ icon: "error", title: "Missing brandId" });
      return;
    }

    const amount = Number(topupAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ icon: "error", title: "Please enter a valid amount" });
      return;
    }

    if (topupLoading) return;

    setTopupLoading(true);

    try {
      const redirectBase = `${window.location.origin}/brand/campaign/${encodeURIComponent(
        campaignId
      )}?campaignTitle=${encodeURIComponent(campaignDisplayTitle)}`;

      const successUrl = `${redirectBase}&topup=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${redirectBase}&topup=cancelled`;

      const res: any = await apiBrandWalletTopup({
        brandId,
        amount,
        currency: "usd",
        successUrl,
        cancelUrl,
      });

      const checkoutUrl =
        res?.data?.checkoutUrl ??
        res?.checkoutUrl ??
        res?.data?.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL not received");
      }

      window.location.href = checkoutUrl;
      return;
    } catch (e) {
      toast({
        icon: "error",
        title: getApiErrorMessage(e, "Failed to start Stripe checkout"),
      });
    } finally {
      setTopupLoading(false);
    }
  };
  const [campaignStatusCounts, setCampaignStatusCounts] = useState({
    active: 0,
    invited: 0,
    total: 0,
  });


  const hasProtectedInfluencers =
    (campaignStatusCounts.active ?? 0) > 0 || (campaignStatusCounts.invited ?? 0) > 0;





  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;

    const run = async () => {
      try {
        const res: any = await apiGetListByCampaign({
          campaignId,
          page: 1,
          limit: 100,
        });

        if (cancelled) return;

        const counts = res?.statusCounts ?? res?.data?.statusCounts ?? {};

        setCampaignStatusCounts({
          total: Number(counts?.total ?? 0),
          active: Number(counts?.active ?? 0),
          invited: Number(counts?.invited ?? 0),
        });
      } catch (e) {
        if (cancelled) return;

        setCampaignStatusCounts({
          total: 0,
          active: 0,
          invited: 0,
        });

        console.error("Failed to load campaign influencer counts:", e);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (loading) {
    return (
      <div className={PAGE_WRAP}>
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="h-6 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={PAGE_WRAP}>
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Couldn’t load campaign</div>
          <p className="mt-2 text-sm text-red-600">{err}</p>

          <div className="mt-4 flex gap-2">
            <Button
              variant="raised"
              size="sm"
              className="my-0 rounded-xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm shadow-none"
              onClick={() => router.refresh()}
            >
              Retry
            </Button>

            <Button
              variant="raised"
              size="sm"
              className="my-0 rounded-xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm shadow-none"
              onClick={() => router.back()}
            >
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className={PAGE_WRAP}>
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">No campaign found</div>
        </div>
      </div>
    );
  }

  const campaign = ((doc as any)?.data?.doc ?? (doc as any)?.doc ?? doc) as any;
  const createdByRole = String(campaign?.createdBy?.role ?? "")
    .trim()
    .toLowerCase();

  const isAdminCreatedCampaign = createdByRole === "admin";

  const details = campaign?.details ?? {};
  const countries = asArray(details?.targetCountries);
  const ages = asArray(details?.targetAgeRanges);
  const platforms = asArray<string>(
    (campaign as any)?.platformSelection ?? details?.platformSelection ?? details?.platforms
  );

  const productImages = asArray<any>(
    (campaign as any)?.productImages ??
    details?.productImages
  );

  const campaignImageUrls = productImages
    .map((img: any) => getMediaUrl(img))
    .filter(Boolean);

  const videoReferenceUrl = String(
    (campaign as any)?.videoReference ??
    (campaign as any)?.videoReferenceUrl ??
    (campaign as any)?.referenceVideoUrl ??
    (campaign as any)?.videoUrl ??
    (campaign as any)?.videoLink ??
    details?.videoReference ??
    details?.videoReferenceUrl ??
    details?.referenceVideoUrl ??
    details?.videoUrl ??
    details?.videoLink ??
    ""
  ).trim();

  const videoThumbUrl = videoReferenceUrl ? getVideoThumb(videoReferenceUrl) : "";

  const targetCountryText = countries.length
    ? countries
      .map((c: any) => {
        const countryName = String(
          c?.countryName ??
          c?.countryNameEn ??
          c?.name ??
          c?.countryCode ??
          ""
        ).trim();

        return `${String(c?.flag ?? "")} ${countryName}`.trim();
      })
      .filter(Boolean)
      .join(", ")
    : "—";

  const productUrlRaw =
    (campaign as any)?.productUrl ??
    (campaign as any)?.productLink ??
    details?.productUrl ??
    details?.productLink ??
    "";

  const productUrl = typeof productUrlRaw === "string" ? productUrlRaw : "";

  const logoUrlRaw =
    (campaign as any)?.brandLogoUrl ??
    (campaign as any)?.brandLogo ??
    details?.brandLogoUrl ??
    details?.brandLogo;

  const explicitLogoUrl = getMediaUrl(logoUrlRaw);
  const logoUrl = explicitLogoUrl || campaignImageUrls[0] || "";

  const totalInfluencers = Number((campaign as any)?.numberOfInfluencers ?? details?.numberOfInfluencers ?? 0) || 0;

  const selectedList =
    (campaign as any)?.selectedInfluencers ??
    (campaign as any)?.selectedInfluencerIds ??
    (campaign as any)?.selectedCreators ??
    (campaign as any)?.selectedInfluencer ??
    details?.selectedInfluencers ??
    details?.selectedInfluencerIds ??
    [];

  const selectedCount =
    Number(
      (campaign as any)?.count ??
      details?.count ??
      0
    ) || 0;

  const selectedInfluencerDisplay = String(
    Number(campaignStatusCounts.active ?? 0)
  );

  const startAt = (campaign as any)?.startAt ?? details?.startAt ?? null;
  const endAt = (campaign as any)?.endAt ?? details?.endAt ?? null;
  const showEditButton = canShowEditCampaign(campaign);

  let timelineText = "—";

  try {
    if (startAt && endAt) {
      const a = new Date(startAt).getTime();
      const b = new Date(endAt).getTime();

      if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
        const days = Math.max(1, Math.ceil((b - a) / 86400000));

        if (days < 7) {
          timelineText = plural(days, "day");
        } else if (days < 30) {
          const weeks = Math.floor(days / 7);
          const remainingDays = days % 7;

          timelineText = remainingDays
            ? `${plural(weeks, "week")} ${plural(remainingDays, "day")}`
            : plural(weeks, "week");
        } else {
          const months = Math.floor(days / 30);
          const remainingDays = days % 30;

          timelineText = remainingDays
            ? `${plural(months, "month")} ${plural(remainingDays, "day")}`
            : plural(months, "month");
        }
      }
    } else if ((campaign as any)?.timeline) {
      timelineText = String((campaign as any)?.timeline);
    }
  } catch { }

  const currency =
    String((campaign as any)?.currency ?? details?.currency ?? (campaign as any)?.budgetCurrency ?? "USD") || "USD";

  const budgetRaw = (campaign as any)?.campaignBudget ?? details?.campaignBudget ?? (campaign as any)?.totalBudget ?? null;

  const budgetNum =
    typeof budgetRaw === "number" ? budgetRaw : Number(String(budgetRaw ?? "").replace(/[^0-9.]/g, ""));

  const budgetText =
    Number.isFinite(budgetNum) && budgetNum > 0 ? `${currency} $${budgetNum.toLocaleString("en-US")}` : "—";

  const statusText = String((campaign as any)?.status ?? "—");

  const campaignDisplayTitle =
    String((campaign as any)?.campaignTitle ?? "").trim() ||
    decodedCampaignTitleFromQuery ||
    "Campaign";

  const brandNameText = String(
    (campaign as any)?.brandName ??
    details?.brandName ??
    ""
  ).trim();

  const postedAtRaw =
    (campaign as any)?.publishedAt ??
    details?.publishedAt ??
    (campaign as any)?.createdAt ??
    details?.createdAt ??
    "";

  const postedDateText =
    postedAtRaw && !Number.isNaN(new Date(postedAtRaw).getTime())
      ? new Date(postedAtRaw).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "";

  const handleEdit = () => {
    const normalizedStatus = String(statusText || "").trim().toLowerCase();
    const encodedId = encodeURIComponent(campaignId);
    const encodedTitle = encodeURIComponent(campaignDisplayTitle);

    if (normalizedStatus === "draft") {
      router.push(
        `/brand/create-campaign?campaignId=${encodedId}&campaignTitle=${encodedTitle}`
      );
      return;
    }

    router.push(
      `/brand/edit-campaign?campaignId=${encodedId}&campaignTitle=${encodedTitle}`
    );
  };

  const startDateText = startAt ? new Date(startAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
  const endDateText = endAt ? new Date(endAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

  const paymentTypeText = String((campaign as any)?.paymentType ?? details?.paymentType ?? "—");

  const descriptionText = String(
    (campaign as any)?.description ??
    (campaign as any)?.campaignDescription ??
    details?.description ??
    details?.campaignDescription ??
    ""
  ).trim();

  const additionalNotesText = String(
    (campaign as any)?.additionalNotes ??
    (campaign as any)?.notes ??
    (campaign as any)?.additionalInformation ??
    details?.additionalNotes ??
    details?.notes ??
    details?.additionalInformation ??
    ""
  ).trim();

  const lorem1 = "Supporting details and references for this campaign.";
  const lorem2 = "Audience demographics and distribution channels defined for the campaign.";
  const lorem3 = "Additional notes and campaign-specific details.";
  const lorem4 = "Suggested creators based on campaign targeting.";

  const carouselImages = Array.from(new Set(campaignImageUrls));
  const openImagePreview = (idx: number) => {
    setActiveSlide(idx);
    setPreviewImageIndex(idx);
    setImagePreviewOpen(true);
  };

  const closeImagePreview = () => {
    setImagePreviewOpen(false);
  };

  const handlePreviewPrev = () => {
    setPreviewImageIndex((prev) => {
      if (!carouselImages.length) return prev;

      const next = prev <= 0 ? carouselImages.length - 1 : prev - 1;
      setActiveSlide(next);

      return next;
    });
  };

  const handlePreviewNext = () => {
    setPreviewImageIndex((prev) => {
      if (!carouselImages.length) return prev;

      const next = prev >= carouselImages.length - 1 ? 0 : prev + 1;
      setActiveSlide(next);

      return next;
    });
  };

  const hashtags = (() => {
    const detailObjs = asArray((details as any)?.preferredHashtags ?? []);
    const byId = new Map<string, string>();

    detailObjs.forEach((h: any) => {
      const key = normalizeMongoId(h?.id ?? h?._id);
      const tag = typeof h?.tag === "string" ? h.tag.trim() : "";
      if (key && tag) byId.set(key, tag);
    });

    const raw =
      (campaign as any)?.preferredHashtags ??
      (details as any)?.preferredHashtags ??
      (campaign as any)?.hashtags ??
      (details as any)?.hashtags ??
      [];

    return asArray(raw)
      .map((h: any) => {
        if (typeof h === "string") {
          const s = h.trim();
          if (byId.has(s)) return byId.get(s)!;
          if (/^[a-f0-9]{24}$/i.test(s)) return "";
          return s;
        }

        if (h && typeof h.tag === "string") return h.tag.trim();
        return "";
      })
      .filter(Boolean);
  })();

  const pdfRaw =
    (campaign as any)?.pdf ??
    (campaign as any)?.pdfAttachment ??
    (campaign as any)?.attachment ??
    (campaign as any)?.attachments ??
    details?.pdf ??
    details?.pdfAttachment ??
    details?.attachment ??
    details?.attachments ??
    null;

  const pdfItem = Array.isArray(pdfRaw) ? pdfRaw[0] : pdfRaw;

  const pdfUrl =
    typeof pdfItem === "string" ? pdfItem : pdfItem?.url || pdfItem?.src || pdfItem?.path || "";

  const pdfName =
    typeof pdfItem === "object" && pdfItem?.name ? String(pdfItem.name) : pdfUrl ? "Attachment.pdf" : "";

  const pdfSizeBytes =
    typeof pdfItem === "object" && pdfItem?.size != null ? Number(pdfItem.size) : NaN;

  const pdfSizeText =
    Number.isFinite(pdfSizeBytes) && pdfSizeBytes > 0
      ? `${(pdfSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : "";

  const onDownloadPdf = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const scrollToSlide = (idx: number) => {
    const el = carouselRef.current;
    if (!el || carouselImages.length === 0) return;

    const clamped = Math.max(0, Math.min(idx, carouselImages.length - 1));
    const child = el.children.item(clamped) as HTMLElement | null;
    if (child) child.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });

    setActiveSlide(clamped);
  };

  const onPrevSlide = () => scrollToSlide(activeSlide - 1);
  const onNextSlide = () => scrollToSlide(activeSlide + 1);

  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;

    const kids = Array.from(el.children) as HTMLElement[];
    if (!kids.length) return;

    const left = el.scrollLeft;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - left);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });

    setActiveSlide(bestIdx);
  };

  const effectiveBudgetTab: "remaining" | "used" =
    isAdminCreatedCampaign ? "remaining" : budgetTab;

  const totalFrozenAmount = Number.isFinite(campaignFreezeAmount)
    ? campaignFreezeAmount
    : 0;

  const currentFrozenAmount = Number.isFinite(usableWalletBalance)
    ? usableWalletBalance
    : 0;

  const usableBudgetValue = currentFrozenAmount;

  const usedBudgetValue = Math.max(
    0,
    totalFrozenAmount - currentFrozenAmount
  );

  const shownBudgetValue =
    effectiveBudgetTab === "remaining" ? usableBudgetValue : usedBudgetValue;

  const shownBudgetText = shownBudgetValue.toLocaleString("en-US");
  const showLoadMore = recommendedRows.length > 0 && recommendedHasMore !== false;
  const goToBrowseInfluencer = () => {
    const id = normalizeMongoId(campaignId);

    const name = String(
      campaignDisplayTitle ||
      (campaign as any)?.campaignTitle ||
      decodedCampaignTitleFromQuery ||
      ""
    ).trim();

    if (!id) {
      toast({ icon: "error", title: "Campaign ID not found" });
      return;
    }

    if (!name) {
      toast({ icon: "error", title: "Campaign name not found" });
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "browseCampaignContext",
        JSON.stringify({
          campaignId: id,
          campaignName: name,
        })
      );
    }

    const query = new URLSearchParams();
    query.set("campaignId", id);
    query.set("campaignName", name);

    router.push(`/brand/browse-influencer?${query.toString()}`);
  };

  return (
    <div className={`${PAGE_WRAP} relative isolate overflow-hidden`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 -z-10 h-[9.4375rem] w-[72.9375rem] max-w-full"
        style={{
          background: TOPBAR_GRADIENT,
        }}
      />

      <div className="w-full mt-[3.5rem]">
        <div className="flex flex-col items-start gap-5 self-stretch pb-5 border-b border-[#E6E6E6]">
          <div className="flex h-[6.25rem] w-[6.25rem] items-center justify-center overflow-hidden rounded-full border border-[#E6E6E6] bg-[#F7F7F7]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${campaignDisplayTitle} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[1.5rem] font-semibold text-[#1A1A1A]">
                {String(campaignDisplayTitle || "C").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex w-full items-center justify-between px-1 gap-3">
            <div className="min-w-0">
              <div
                className="
                  w-full max-w-[25.0625rem]
                  text-[#1A1A1A] font-bold text-[1.5rem] leading-8 tracking-normal
                  line-clamp-2
                "
                style={{ fontFamily: "Inter" }}
                title={campaignDisplayTitle}
              >
                {campaignDisplayTitle}
              </div>
              <div
                className="mt-1 flex flex-wrap items-center gap-1 text-[#969696] text-[0.75rem] font-medium leading-4"
                style={{ fontFamily: "Inter" }}
              >
                <span>{brandNameText || "—"}</span>

                {postedDateText ? (
                  <>
                    <span>·</span>
                    <span>{postedDateText}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-1">
                {productUrl ? (
                  <a
                    href={productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#B8B8B8] text-[0.75rem] leading-4 font-normal"
                    style={{ fontFamily: "Inter" }}
                    title={productUrl}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate max-w-[18rem]">{productUrl}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <div
                    className="text-[#B8B8B8] text-[0.75rem] leading-4 font-normal"
                    style={{ fontFamily: "Inter" }}
                  >
                    —
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-8 items-center gap-[0.5rem]">
              <CampaignStatusDropdown
                campaignId={campaignId}
                brandId={brandId}
                currentStatus={statusText}
                forceLocked={isAdminCreatedCampaign}
                onStatusChange={(newStatus) => {
                  setDoc((prev: any) => {
                    if (!prev) return prev;

                    if (prev?.data?.doc) {
                      return {
                        ...prev,
                        status: newStatus,
                        data: {
                          ...prev.data,
                          doc: {
                            ...prev.data.doc,
                            status: newStatus,
                          },
                        },
                      };
                    }

                    if (prev?.doc) {
                      return {
                        ...prev,
                        status: newStatus,
                        doc: {
                          ...prev.doc,
                          status: newStatus,
                        },
                      };
                    }

                    return {
                      ...prev,
                      status: newStatus,
                    };
                  });
                }}
              />

              {!isAdminCreatedCampaign ? (
                <>
                  <Button
                    variant="raised"
                    size="sm"
                    className="
                      my-0
                      flex
                      h-8
                      items-center
                      justify-center
                      gap-1
                      rounded-[0.5rem]
                      border
                      border-[#E6E6E6]
                      bg-white
                      px-3
                      shadow-none
                      hover:bg-[#F7F7F7]
                    "
                    rightIcon={<UsersIcon weight="bold" style={{ width: "0.875rem", height: "0.875rem" }} />}
                    onClick={goToBrowseInfluencer}
                  >
                    <>
                      <span className="text-center text-[#1A1A1A] text-[0.75rem] font-semibold leading-5 whitespace-nowrap hidden sm:inline">
                        Browse influencers
                      </span>
                      <span className="text-center text-[#1A1A1A] text-[0.75rem] font-semibold leading-5 whitespace-nowrap sm:hidden">
                        Influencers
                      </span>
                    </>
                  </Button>

                  <Button
                    type="button"
                    variant="raised"
                    size="sm"
                    aria-label="Invite influencer"
                    onClick={goToBrowseInfluencer}
                    className="
                      my-0
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-[0.75rem]
                      border
                      border-[#E6E6E6]
                      bg-white
                      p-2
                      shadow-none
                      hover:bg-[#F7F7F7]
                    "
                  >
                    <EnvelopeOpen
                      weight="regular"
                      style={{
                        width: "1rem",
                        height: "1rem",
                        color: "#1A1A1A",
                      }}
                    />
                  </Button>
                </>
              ) : (
                <Button
                  variant="raised"
                  size="sm"
                  rightIcon={
                    <FolderSimpleStarIcon
                      weight="bold"
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />
                  }
                  className="
    my-0
    flex h-[2rem]
    items-center justify-center
    gap-1
    rounded-[0.5rem]
    border border-[#E6E6E6]
    bg-white
    px-2
    shadow-none
    hover:bg-[#F7F7F7]
  "
                  onClick={() =>
                    router.push(`/brand/campaign/${encodeURIComponent(campaignId)}/pitch-folder?campaignTitle=${encodeURIComponent(campaignDisplayTitle)}`)
                  }
                >
                  <span className="text-center text-[#1A1A1A] text-[0.75rem] font-semibold leading-5 whitespace-nowrap hidden sm:inline">
                    Pitch folder
                  </span>
                </Button>
              )}

              <InfluencerContextMenu
                hideCopyLink={isAdminCreatedCampaign}
                hideInviteInfluencer={isAdminCreatedCampaign}
                hideDelete={isAdminCreatedCampaign}
                disableDelete={hasProtectedInfluencers}
                onCopyProfileLink={async () => {
                  try {
                    const res: any = await apiEnableCampaignShare({
                      brandId,
                      campaignId,
                    });

                    const shareUrl =
                      res?.shareUrl ||
                      res?.data?.shareUrl;

                    if (!shareUrl) {
                      throw new Error("Share URL not returned");
                    }

                    const copied = await copyText(shareUrl);

                    if (copied) {
                      toast({ icon: "success", title: "Public campaign link copied" });
                    } else {
                      prompt("Copy this public campaign link:", shareUrl);
                    }
                  } catch (e) {
                    toast({
                      icon: "error",
                      title: getApiErrorMessage(e, "Could not copy public campaign link"),
                    });
                  }
                }}
                onViewInfluencerList={() => {
                  const query = new URLSearchParams();
                  query.set("campaignId", campaignId);
                  query.set("campaignName", campaignDisplayTitle);

                  router.push(`/brand/Influencer/all?${query.toString()}`);
                }}
                onInviteInfluencer={goToBrowseInfluencer}
                onRaiseDispute={() =>
                  router.push(`/brand/disputes/?id=${encodeURIComponent(campaignId)}`)
                }
                onDelete={() => {
                  if (hasProtectedInfluencers) {
                    toast({
                      icon: "error",
                      title: "This campaign cannot be deleted because it has active or invited influencers.",
                    });
                    return;
                  }
                  setDeleteDialogOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="mt-3 flex flex-col items-start gap-6 self-stretch">
          <div className="flex w-full items-center justify-between self-stretch">
            <div
              className="text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]"
              style={{
                color: "var(--Light-Text-Primary, #1A1A1A)",
                fontFamily: "var(--Font-Family-Inter, Inter)",
              }}
            >
              Overview
            </div>

            {showEditButton ? (
              <Button
                variant="raised"
                size="sm"
                className="
      my-0
      ml-auto
      flex
      items-center
      justify-center
      gap-2
      self-stretch
      rounded-[0.75rem]
      bg-transparent
      px-2
      py-0
      shadow-none
      hover:bg-[#F7F7F7]
      active:bg-[#F7F7F7]
    "
                rightIcon={
                  <PencilSimple
                    weight="bold"
                    className="text-[#1A1A1A]"
                    style={{ width: "0.875rem", height: "0.875rem" }}
                  />
                }
                onClick={handleEdit}
              >
                <span className="text-center text-[#1A1A1A] text-[0.75rem] font-semibold leading-5">
                  Edit
                </span>
              </Button>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-5 self-stretch rounded-[0.75rem] border border-[#E6E6E6] p-4">
            <div className="w-full rounded-xl border-[#E6E6E6] p-0">
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Total Influencer"
                  value={totalInfluencers || "—"}
                />
                <Metric
                  label="Selected Influencer"
                  value={selectedInfluencerDisplay}
                  onClick={() => {
                    const query = new URLSearchParams();

                    query.set("campaignId", campaignId);
                    query.set("campaignName", campaignDisplayTitle);

                    router.push(`/brand/Influencer/active?${query.toString()}`);
                  }}
                />
                <Metric label="Timeline" value={timelineText} />
                <Metric label="Total Budget" value={budgetText} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-[1.75rem] mt-[1.75rem] h-px w-full bg-[var(--Light-Border-Subtle,#E6E6E6)]" />

      <div className="flex w-full flex-col items-start gap-6 self-stretch" style={{ fontFamily: "Inter" }}>
        <div className="flex w-full items-center justify-between self-stretch">
          <div className="text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
            Timeline &amp; Payments
          </div>
        </div>

        <div className="flex w-full flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] p-4 h-[12.375rem] gap-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center p-3 rounded-[0.5rem] bg-[#F2F2F2]">
              <MoneyWavy weight="bold" style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>

            <div className="flex h-[3rem] p-2 items-center gap-2 rounded-[0.75rem] bg-[#F9F9F9]">
              <button
                type="button"
                onClick={() => setBudgetTab("remaining")}
                className={`flex h-8 px-3 items-center justify-center gap-1 self-stretch rounded-[0.5rem] ${budgetTab === "remaining" ? "bg-white" : "bg-transparent"
                  }`}
              >
                <span className="text-[#1A1A1A] text-[0.75rem] font-semibold leading-5">
                  Usable Budget
                </span>
              </button>

              {!isAdminCreatedCampaign ? (
                <button
                  type="button"
                  onClick={() => setBudgetTab("used")}
                  className={`flex h-8 px-3 items-center justify-center gap-1 self-stretch rounded-[0.5rem] ${budgetTab === "used" ? "bg-white" : "bg-transparent"
                    }`}
                >
                  <span className="text-[#1A1A1A] text-[0.75rem] font-semibold leading-5">
                    Used Budget
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-auto flex w-full items-end justify-between self-stretch gap-4">
            <div className="flex flex-col items-start gap-2">
              <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
                {effectiveBudgetTab === "remaining" ? "Usable budget" : "Used budget"}
              </div>

              <div className="flex items-center gap-[0.1rem]">
                <div className="text-[#343330] text-[1rem] font-medium leading-[1.5rem]">{currency}</div>
                <CurrencyDollar
                  weight="bold"
                  style={{ width: "1rem", height: "1rem", color: "#343330" }}
                />
                <div className="text-[#1A1A1A] text-[1rem] font-medium leading-[1.5rem]">
                  {shownBudgetText}
                </div>
              </div>
            </div>

            <Button
              variant="raised"
              size="sm"
              onClick={() => setAddFundsModalOpen(true)}
              className="my-0 h-8 w-[6.375rem] px-2 gap-[0.25rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white shadow-none"
              leftIcon={<PlusCircle weight="bold" style={{ width: "0.875rem", height: "0.875rem" }} />}
            >
              <span className="text-center text-[#1A1A1A] font-semibold leading-5">Add funds</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] p-3 min-h-[12.375rem]">
          <div className="flex h-12 w-12 items-center justify-center gap-[0.625rem] rounded-[0.5rem] bg-[#F2F2F2] p-3">
            <CalendarDots weight="bold" style={{ width: "1.5rem", height: "1.5rem" }} />
          </div>

          <div className="mt-auto flex flex-col items-start gap-2 self-stretch">
            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">Start date</div>
            <div className="text-[#1A1A1A] text-[1rem] font-medium leading-[1.5rem]">{startDateText}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] p-3 min-h-[12.375rem]">
          <div className="flex h-12 w-12 items-center justify-center gap-[0.625rem] rounded-[0.5rem] bg-[#F2F2F2] p-3">
            <CalendarX weight="bold" style={{ width: "1.5rem", height: "1.5rem" }} />
          </div>

          <div className="mt-auto flex flex-col items-start gap-2 self-stretch">
            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">End date</div>
            <div className="text-[#1A1A1A] text-[1rem] font-medium leading-[1.5rem]">{endDateText}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] p-3 min-h-[12.375rem]">
          <div className="flex h-12 w-12 items-center justify-center gap-[0.625rem] rounded-[0.5rem] bg-[#F2F2F2] p-3">
            <Wallet weight="bold" style={{ width: "1.5rem", height: "1.5rem" }} />
          </div>

          <div className="mt-auto flex flex-col items-start gap-2 self-stretch">
            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">Payment type</div>
            <div className="text-[#1A1A1A] text-[1rem] font-medium leading-[1.5rem]">
              {paymentTypeText}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-[1.75rem] mt-[1.75rem] h-px w-full bg-[var(--Light-Border-Subtle,#E6E6E6)]" />

      <div className="w-full rounded-[1.25rem] bg-[rgba(218,218,218,0.27)] p-5 flex flex-col items-start gap-6">
        <div className="flex w-full justify-between items-start self-stretch">
          <div className="flex flex-col justify-center items-start gap-1 flex-1">
            <div className="text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
              Other Information
            </div>

            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
              {lorem1}
            </div>
          </div>

          <Button
            variant="raised"
            size="sm"
            onClick={() => setOtherInfoOpen((v) => !v)}
            className="my-0 h-auto w-auto p-0 bg-transparent shadow-none border-0 hover:bg-transparent active:bg-transparent"
            leftIcon={
              <CaretDown
                weight="bold"
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  transform: otherInfoOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
            }
          />
        </div>

        {otherInfoOpen ? (
          <div className="w-full">
            <div className="mt-5 self-stretch text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
              Description
            </div>

            <div className="mt-6 flex h-[14.8125rem] w-full flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3 overflow-auto">
              <div className="text-[#1A1A1A] text-[0.875rem] font-medium leading-[1.25rem] whitespace-pre-wrap">
                {descriptionText || "—"}
              </div>
            </div>

            <div className="mt-6 self-stretch text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
              Image / Reference
            </div>

            <div className="mt-6 relative w-full">
              {carouselImages.length ? (
                <>
                  <div
                    ref={carouselRef}
                    onScroll={onCarouselScroll}
                    className="flex w-full items-center gap-5 py-8 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {carouselImages.map((src, idx) => {
                      const isSelected = idx === activeSlide;

                      return (
                        <div
                          key={`${src}-${idx}`}
                          onClick={() => openImagePreview(idx)}
                          className={[
                            "relative flex-none w-[13.8125rem] h-[11.5rem] overflow-hidden rounded-[1.1875rem] bg-white cursor-pointer",
                            "transition-all duration-300 ease-out",
                            isSelected
                              ? "-translate-y-3 border-2 border-[#1A1A1A] shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
                              : "translate-y-0 border border-[#E6E6E6] hover:-translate-y-2 hover:shadow-[0_14px_28px_rgba(0,0,0,0.12)]",
                          ].join(" ")}
                        >
                          <img
                            src={src}
                            alt={`Campaign image ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    variant="raised"
                    size="sm"
                    onClick={onPrevSlide}
                    disabled={activeSlide <= 0}
                    className="my-0 absolute left-4 top-[5.625rem] h-[2.75rem] w-[2.75rem] px-0 rounded-[2.5rem] bg-[#F2F2F2] border border-transparent shadow-none"
                    leftIcon={<CaretLeft weight="bold" style={{ width: "1.25rem", height: "1.25rem" }} />}
                  />

                  <Button
                    variant="raised"
                    size="sm"
                    onClick={onNextSlide}
                    disabled={activeSlide >= carouselImages.length - 1}
                    className="my-0 absolute right-4 top-[5.625rem] h-[2.75rem] w-[2.75rem] px-0 rounded-[2.5rem] bg-[#F2F2F2] border border-transparent shadow-none"
                    leftIcon={<CaretRight weight="bold" style={{ width: "1.25rem", height: "1.25rem" }} />}
                  />

                  <div className="mt-2 flex w-full items-center justify-center gap-2">
                    {carouselImages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => scrollToSlide(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className="h-2 w-2 rounded-[0.5rem]"
                        style={{ backgroundColor: i === activeSlide ? "#000000" : "#E8E8E8" }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[11.5rem] w-full items-center justify-center rounded-[1.1875rem] border border-[#E6E6E6] bg-white text-[#969696] text-[0.875rem]">
                  —
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 w-full rounded-[1.25rem] bg-[rgba(218,218,218,0.27)] p-5 flex flex-col items-start gap-6">
        <div className="flex w-full justify-between items-start self-stretch">
          <div className="flex flex-col justify-center items-start gap-1 flex-1">
            <div className="text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
              Audience &amp; Platforms
            </div>

            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
              {lorem2}
            </div>
          </div>

          <Button
            variant="raised"
            size="sm"
            onClick={() => setAudiencePlatformsOpen((v) => !v)}
            className="my-0 h-auto w-auto p-0 bg-transparent shadow-none border-0 hover:bg-transparent active:bg-transparent"
            leftIcon={
              <CaretDown
                weight="bold"
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  transform: audiencePlatformsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
            }
          />
        </div>

        {audiencePlatformsOpen ? (
          <div className="w-full mt-6 flex flex-col sm:flex-row gap-6">
            <div className="w-full  flex flex-col gap-3">
              <div className="flex h-[4.5rem] p-3 flex-col justify-between items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white">
                <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
                  Target Platform
                </div>

                <div className="flex items-center gap-2">
                  {platforms.length ? (
                    platforms.map((p, idx) => {
                      const key = `${p}-${idx}`;
                      const lower = String(p).toLowerCase();

                      if (lower === "instagram") {
                        return (
                          <Image
                            key={key}
                            src="/skill-icons_instagram.svg"
                            alt="Instagram"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                        );
                      }

                      if (lower === "youtube") {
                        return (
                          <Image
                            key={key}
                            src="/logos_youtube-icon.svg"
                            alt="YouTube"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                        );
                      }

                      if (lower === "tiktok") {
                        return (
                          <Image
                            key={key}
                            src="/ic_baseline-tiktok.svg"
                            alt="TikTok"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                        );
                      }

                      return (
                        <span
                          key={key}
                          className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                        >
                          <span className="text-[#1A1A1A] text-[0.875rem] font-semibold leading-[1.25rem]">
                            {String(p)}
                          </span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[#969696] text-[0.875rem]">—</span>
                  )}
                </div>
              </div>

              <div className="flex h-[4.5rem] p-3 flex-col justify-between items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white">
                <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
                  Target Country
                </div>

                <div className="mt-2 text-[#1A1A1A] text-[0.875rem] font-semibold leading-[1.25rem]">
                  {targetCountryText}
                </div>
              </div>

              <div className="flex p-3 flex-col items-start gap-3 self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white">
                <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
                  Target age group
                </div>

                <div className="flex flex-wrap gap-2 self-stretch">
                  {ages.length ? (
                    ages.map((a: any, idx: number) => (
                      <span
                        key={`${String(a?.id ?? a?._id ?? a?.range ?? idx)}-${idx}`}
                        className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                      >
                        <span className="text-[#1A1A1A] text-[0.875rem] font-semibold leading-[1.25rem]">
                          {String(a?.range ?? "—")}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[#969696] text-[0.875rem]">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* <div className="w-full sm:w-1/2 flex flex-col items-start gap-[1.3125rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3 h-[15.9375rem]">
              <div className="text-[#1A1A1A] text-[0.75rem] font-semibold leading-[1.25rem] self-stretch">
                Video Reference
              </div>

              {videoReferenceUrl ? (
                <div className="flex flex-col gap-2">
                  <a
                    href={videoReferenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem] break-all"
                  >
                    {videoReferenceUrl}
                  </a>

                  <a
                    href={videoReferenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[10.125rem] w-[12.875rem] items-center justify-center overflow-hidden rounded-[0.25rem] border border-[#E6E6E6] bg-[#F5F5F5]"
                  >
                    {videoThumbUrl ? (
                      <img
                        src={videoThumbUrl}
                        alt="Video reference thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[#969696] text-[0.875rem]">Open video</span>
                    )}
                  </a>
                </div>
              ) : (
                <div className="text-[#969696] text-[0.875rem] font-normal leading-[1.25rem]">—</div>
              )}
            </div> */}
          </div>
        ) : null}
      </div>

      <div className="mt-4 w-full rounded-[1.25rem] bg-[rgba(218,218,218,0.27)] p-5 flex flex-col items-start gap-6">
        <div className="flex w-full justify-between items-start self-stretch">
          <div className="flex flex-col justify-center items-start gap-1 flex-1">
            <div className="text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]">
              Additional Information
            </div>

            <div className="text-[#B8B8B8] text-[0.875rem] font-medium leading-[1.25rem]">
              {lorem3}
            </div>
          </div>

          <Button
            variant="raised"
            size="sm"
            onClick={() => setAdditionalInfoOpen((v) => !v)}
            className="my-0 h-auto w-auto p-0 bg-transparent shadow-none border-0 hover:bg-transparent active:bg-transparent"
            leftIcon={
              <CaretDown
                weight="bold"
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  transform: additionalInfoOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 150ms ease",
                }}
              />
            }
          />
        </div>

        {additionalInfoOpen ? (
          <div className="w-full">
            <div className="flex h-[14.8125rem] flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white overflow-hidden">
              <div className="flex w-full items-center self-stretch px-3 py-2 border-b border-[#E6E6E6] rounded-t-[0.6875rem]">
                <div className="text-[#969696] text-[1rem] font-medium leading-[1.5rem]">
                  Additional Notes
                </div>
              </div>

              <div className="flex flex-1 w-full p-3 items-start justify-between self-stretch overflow-auto">
                <div className="text-[#1A1A1A] text-[0.875rem] font-medium leading-[1.25rem] whitespace-pre-wrap">
                  {additionalNotesText || "—"}
                </div>
              </div>
            </div>

            {pdfUrl ? (
              <div className="mt-5 flex w-full items-center justify-between self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FilePdf weight="bold" style={{ width: "2rem", height: "2rem" }} />

                  <div className="flex flex-col min-w-0">
                    <div className="text-[#1A1A1A] text-[1rem] font-medium leading-[1.5rem] truncate">
                      {pdfName}
                    </div>
                    {pdfSizeText ? (
                      <div className="text-[#969696] text-[0.875rem] font-normal leading-[1.25rem]">
                        {pdfSizeText}
                      </div>
                    ) : null}
                  </div>
                </div>

                <Button
                  variant="raised"
                  size="sm"
                  onClick={onDownloadPdf}
                  className="my-0 h-[2.0625rem] w-[7rem] px-2 rounded-[0.75rem] bg-white border border-transparent shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)]"
                  leftIcon={
                    <DownloadSimple weight="bold" style={{ width: "0.875rem", height: "0.875rem" }} />
                  }
                >
                  <span className="text-center text-[#1A1A1A] text-[0.75rem] font-semibold leading-[1.25rem]">
                    Download
                  </span>
                </Button>
              </div>
            ) : null}

            {/* <div className="mt-5 flex flex-col items-start self-stretch rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3 h-[11.4375rem] gap-[1.3125rem]">
              <div className="text-[#1A1A1A] text-[0.75rem] font-semibold leading-[1.25rem]">
                Hashtags
              </div>

              <div className="flex flex-wrap gap-2 self-stretch">
                {hashtags.length ? (
                  hashtags.map((tag: string, idx: number) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                    >
                      <span className="text-[#1A1A1A] text-[0.75rem] font-medium leading-[1.25rem]">
                        {tag}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-[#969696] text-[0.875rem] leading-[1.25rem]">—</span>
                )}
              </div>
            </div> */}
          </div>
        ) : null}
      </div>
      {!isAdminCreatedCampaign ? (
        <div className="mt-7 w-full flex flex-col items-start self-stretch">
          <div
            className="self-stretch text-[#1A1A1A] text-[1.25rem] font-semibold leading-[1.75rem]"
            style={{ fontFamily: "Inter" }}
          >
            Recommended Influencer
          </div>

          <div
            className="mt-2 self-stretch text-[#B8B8B8] text-[0.875rem] font-normal leading-[1.25rem]"
            style={{ fontFamily: "Inter" }}
          >
            {lorem1}
          </div>

          <div className="mt-6 w-full mb-[3.5rem]">
            {recommendedLoading ? (
              <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-gray-200" />
                <div className="mt-6 h-28 animate-pulse rounded-2xl bg-gray-100" />
              </div>
            ) : recommendedError ? (
              <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  Couldn’t load recommended influencers
                </div>
                <div className="mt-2 text-sm text-red-600">{recommendedError}</div>

                <div className="mt-4">
                  <Button
                    variant="raised"
                    size="sm"
                    className="my-0 rounded-xl border border-[#E6E6E6] bg-white px-4 py-2 text-sm shadow-none"
                    onClick={() => {
                      setRecommendedRows([]);
                      setRecommendedError("");
                      setRecommendedLoading(true);
                      setRecommendedPage(1);
                      setRecommendedHasMore(null);

                      apiCampaignRecommendedInfluencers({
                        brandId,
                        campaignId,
                        page: 1,
                        limit: RECO_LIMIT,
                      })
                        .then((res: any) => {
                          const { items, hasMore } = parseRecommendedResponse(res, 1, RECO_LIMIT);
                          const rows = asArray(items).map(mapRecommendedToRow);

                          setRecommendedRows(rows);

                          const finalHasMore =
                            hasMore === null ? (rows.length < RECO_LIMIT ? false : null) : hasMore;
                          setRecommendedHasMore(finalHasMore);
                        })
                        .catch((e: any) =>
                          setRecommendedError(
                            getApiErrorMessage(e, "Failed to load recommended influencers")
                          )
                        )
                        .finally(() => setRecommendedLoading(false));
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : recommendedRows.length ? (
              <>
                <InfluencerTable
                  rows={recommendedRows}
                  variant="recommended"
                  renderRecommendedActions={(row) => (
                    <RecommendedActionItems
                      row={row}
                      isInviting={!!invitingIds[row.id]}
                      onInvite={handleInviteInfluencer}
                      onDelete={(r) => {
                        setRecommendedRows((prev) => prev.filter((x) => x.id !== r.id));
                        toast({ icon: "success", title: `${r.profile.name} removed` });
                      }}
                      onViewProfile={(r) => toast({ icon: "success", title: `View profile: ${r.profile.name}` })}
                      onCopyProfileLink={async (r) => {
                        const link = `${window.location.origin}/influencer/${r.id}`;
                        try {
                          await navigator.clipboard.writeText(link);
                          toast({ icon: "success", title: "Profile link copied" });
                        } catch {
                          toast({ icon: "error", title: "Could not copy link" });
                        }
                      }}
                      onSaveToHub={(r) =>
                        toast({ icon: "success", title: `Saved ${r.profile.name} to HUB` })
                      }
                      onMoveToWorkspace={(r) =>
                        toast({ icon: "success", title: `Moved ${r.profile.name} to workspace` })
                      }
                      onNotRelevant={(r) => {
                        setRecommendedRows((prev) => prev.filter((x) => x.id !== r.id));
                        toast({ icon: "success", title: `${r.profile.name} marked not relevant` });
                      }}
                    />
                  )}
                />
                {showLoadMore && (
                  <div className="mt-3 mb-14 w-full self-stretch">
                    <Button
                      variant="raised"
                      size="sm"
                      onClick={handleLoadMoreRecommended}
                      disabled={recommendedLoadingMore}
                      className="
                      my-0
                      w-full self-stretch
                      h-8
                      px-3
                      py-0
                      flex items-center justify-center
                      gap-1
                      rounded-[0.75rem]
                      border border-[#E6E6E6]
                      bg-white
                      shadow-none
                    "
                    >
                      <span
                        className="text-[0.875rem] font-semibold text-[#1A1A1A]"
                        style={{ fontFamily: "Inter" }}
                      >
                        {recommendedLoadingMore ? "Loading..." : "Load more"}
                      </span>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  No recommended influencers yet
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {addFundsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[28rem] rounded-[1rem] bg-white p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[#1A1A1A] text-[1.125rem] font-semibold">
                  Add funds
                </div>
                <div className="mt-1 text-[#969696] text-[0.875rem] leading-5">
                  Enter the amount you want to add to your wallet.
                </div>
              </div>

              <Button
                variant="raised"
                size="sm"
                onClick={() => {
                  if (topupLoading) return;
                  setAddFundsModalOpen(false);
                  setTopupAmount("");
                }}
                className="my-0 h-8 px-3 rounded-[0.75rem] border border-[#E6E6E6] bg-white text-[#969696] shadow-none"
              >
                <span className="font-medium">Close</span>
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="wallet-topup-amount"
                className="text-[#1A1A1A] text-[0.875rem] font-medium"
              >
                Amount
              </label>

              <div className="flex items-center gap-3 rounded-[0.75rem] border border-[#E6E6E6] px-4 py-3">
                <span className="text-[#1A1A1A] text-[0.95rem] font-semibold">
                  {currency}
                </span>
                <input
                  id="wallet-topup-amount"
                  type="text"
                  inputMode="decimal"
                  value={topupAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const parts = raw.split(".");
                    const normalized =
                      parts.length > 2
                        ? `${parts[0]}.${parts.slice(1).join("")}`
                        : raw;
                    setTopupAmount(normalized);
                  }}
                  placeholder="Enter amount"
                  className="w-full border-0 bg-transparent text-[1rem] font-medium text-[#1A1A1A] outline-none placeholder:text-[#B8B8B8]"
                />
              </div>

              <div className="text-[#969696] text-[0.8125rem] leading-5">
                Current usable balance: {currency}{" "}
                {usableBudgetValue.toLocaleString("en-US")}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="raised"
                onClick={() => {
                  if (topupLoading) return;
                  setAddFundsModalOpen(false);
                  setTopupAmount("");
                }}
                className="my-0 h-10 px-5 rounded-[0.75rem] border border-[#E6E6E6] bg-white text-[#1A1A1A] shadow-none"
              >
                <span className="font-semibold">Cancel</span>
              </Button>

              <Button
                variant="raised"
                onClick={handleAddFunds}
                disabled={topupLoading}
                className="my-0 h-10 px-5 rounded-[0.75rem] !bg-black !text-white border border-black shadow-none hover:!bg-black disabled:!bg-black disabled:!text-white disabled:opacity-60"
              >
                <span className="font-semibold text-white">
                  {topupLoading ? "Redirecting..." : "Add funds"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="w-[26rem] h-[12rem] rounded-lg bg-white p-6 shadow-xl flex flex-col gap-4">
            <div className="text-[#1A1A1A] text-base font-semibold">Delete this campaign?</div>

            <div className="text-[#B8B8B8] text-sm font-normal leading-5">
              You're about to permanently delete this campaign.
            </div>

            {hasProtectedInfluencers ? (
              <div className="text-sm text-red-500">
                This campaign cannot be deleted because it has active or invited influencers.
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 mt-2">
              <Button
                variant="raised"
                onClick={() => setDeleteDialogOpen(false)}
                className="h-9 px-5 bg-white text-sm shadow-none font-medium text-[#1A1A1A] transition-colors"
              >
                <span className="font-bold">Cancel</span>
              </Button>

              <Button
                variant="raised"
                onClick={handleDelete}
                disabled={hasProtectedInfluencers}
                className={`h-[1rem] w-[8rem] px-2 rounded-lg text-sm font-medium flex items-center gap-2 ${hasProtectedInfluencers
                  ? "bg-gray-100 cursor-not-allowed opacity-60"
                  : "bg-red-100 hover:bg-red-50"
                  }`}
              >
                <div className="flex gap-2 items-center">
                  <TrashIcon className="h-4 w-4 text-red-500" weight="bold" />
                  <span className="text-red-500 font-bold">Delete</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {imagePreviewOpen ? (
        <ImagePreviewModal
          images={carouselImages}
          activeIndex={Math.min(previewImageIndex, carouselImages.length - 1)}
          onClose={closeImagePreview}
          onPrev={handlePreviewPrev}
          onNext={handlePreviewNext}
        />
      ) : null}
    </div>
  );
}