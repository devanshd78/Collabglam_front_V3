"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

import api from "@/lib/api";
import { post } from "@/lib/api";
import InfluencerFilter, { FilterState } from "./InfluencerFilter";
import {
  InfluencerTable,
  ActionGroup,
  PlatformType,
  type InfluencerRow,
} from "@/components/ui/brand/Influencertable";
import AddMilestoneCard from "@/components/ui/brand/AddMilestoneCard";
import CampaignFeedbackModal from "@/components/common/CampaignFeedbackModal";
import { InfluencerContextMenu } from "@/components/ui/brand/InfluencerContextMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CaretDown,
  CircleNotch,
  CloudArrowUp,
  EnvelopeOpen,
  FileArrowUp,
  FileText,
  PaperPlaneTilt,
  Signature,
} from "@phosphor-icons/react";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import {
  apiGetListByCampaign,
  apiGetCampaignInvitationsByCampaign,
  apiSetApplicantDecisionStatus,
  apiCampaignViewByBrand,
  type ApplicantDecisionField,
  getApiErrorMessage,
} from "@/app/brand/services/brandApi";
import { apiGetfetchBulkInfleuncerId } from "@/app/influencer/services/influencerApi";
import ContractSidebarExtracted from "./ContractSidebar";
import { useInfluencerCounts } from "./InfluencerCountsContext";

const EMAIL_API_BASE = "/emails";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "all" | "applied" | "active" | "shortlisted" | "undecided" | "rejected";

type CreateThreadResponse = {
  success: boolean;
  threadId: string;
  brandAliasEmail: string;
  influencerAliasEmail: string;
  brandDisplayAlias: string;
  influencerDisplayAlias: string;
  subject: string;
};

type ContractMeta = {
  _id: string;
  contractId: string;
  campaignId: string;
  contractSource?: "template" | "uploaded";
  document?: {
    documentSource?: "template" | "uploaded";
    uploadedContract?: {
      originalName?: string;
      bucket?: string;
      folder?: string;
      key?: string;
      mimeType?: string;
      sizeBytes?: number;
      uploadedAt?: string | null;
    } | null;
  };
  status?: string;
  requestedEffectiveDate?: string | null;
  requestedEffectiveDateTimezone?: string | null;
  content?: any;
  flags?: Record<string, any>;
  statusFlags?: Record<string, any>;
  resendIteration?: number;
  audit?: Array<{ type?: string; details?: { reason?: string } }>;
  confirmations?: {
    brand?: { confirmed?: boolean };
    influencer?: { confirmed?: boolean };
  };
  signatures?: {
    brand?: { signed?: boolean; byUserId?: string; name?: string; email?: string; at?: string };
    influencer?: { signed?: boolean };
    collabglam?: { signed?: boolean };
  };
};

export const PAYMENT_TYPE = {
  FIXED: "fixed_payment",
  MILESTONE: "milestone_based",
  GIFTING: "product_gifting",
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

type CampaignFeedbackPayload = {
  campaignId: string;
  brandId: string;
  influencerId: string;
};

type CampaignFeedbackPromptState = {
  shouldPrompt?: boolean;
  showSendFeedbackButton?: boolean;
  canManualSubmit?: boolean;
  reason?: string;
  nextPromptAt?: string | null;
  status?: string;
  review?: {
    status?: string;
    skippedAt?: string | null;
    submittedAt?: string | null;
  } | null;
};

function shouldShowCampaignFeedbackButton(state: CampaignFeedbackPromptState) {
  const reason = String(state?.reason || "").trim().toLowerCase();
  const status = String(state?.review?.status || state?.status || "")
    .trim()
    .toLowerCase();

  if (reason === "review_already_submitted" || status === "submitted") {
    return false;
  }

  if (
    reason === "review_already_skipped" ||
    reason === "review_skipped_until" ||
    reason === "review_skip_window_expired" ||
    status === "skipped"
  ) {
    return true;
  }

  if (state?.showSendFeedbackButton === true) {
    return true;
  }

  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  BRAND_SENT_DRAFT: "BRAND_SENT_DRAFT",
  BRAND_EDITED: "BRAND_EDITED",
  INFLUENCER_EDITED: "INFLUENCER_EDITED",
  BRAND_ACCEPTED: "BRAND_ACCEPTED",
  INFLUENCER_ACCEPTED: "INFLUENCER_ACCEPTED",
  READY_TO_SIGN: "READY_TO_SIGN",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
  MILESTONES_CREATED: "MILESTONES_CREATED",
  REJECTED: "REJECTED",
  SUPERSEDED: "SUPERSEDED",
} as const;

const PAGE_LIMIT = 20;

const OWN_CONTRACT_MAX_BYTES = 15 * 1024 * 1024;

const COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_TITLE =
  "COLLABGLAM CAMPAIGN ACKNOWLEDGEMENT";

const COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_POINTS = [
  "A separate campaign agreement, contract, statement of work, or order form has been reviewed and accepted by both Parties.",
  "This collaboration was initiated through the CollabGlam Platform.",
  "Campaign communications, deliverable submissions, approvals, milestone tracking, and payment activities will be managed through CollabGlam.",
  "The Brand and Creator are solely responsible for the terms, obligations, and performance of their uploaded agreement.",
  "CollabGlam acts only as the platform operator, workflow administrator, and payment facilitator, and is not a party to the uploaded agreement between the Brand and Creator.",
  "For campaigns funded through CollabGlam Lane A, a 10% marketplace fee and applicable payment processing fees may be deducted from the Creator payout in accordance with platform terms, unless otherwise agreed in writing.",
  "Platform records, messages, submissions, approvals, milestone activity, and payment records maintained by CollabGlam may be used as evidence of campaign activity and performance.",
  "By accepting, each Party confirms that it has authority to enter into this collaboration and agrees to be bound by the uploaded agreement and this Acknowledgement.",
];

const COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_TEXT = [
  COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_TITLE,
  "",
  "By accepting this Acknowledgement, the Brand and Creator confirm that:",
  "",
  ...COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_POINTS.map(
    (point, index) => `${index + 1}. ${point}`
  ),
  "",
  "Brand Acceptance",
  "",
  "I have reviewed and accept the uploaded agreement and this Acknowledgement.",
  "",
  "Creator Acceptance",
  "",
  "I have reviewed and accept the uploaded agreement and this Acknowledgement.",
].join("\n");

function formatOwnContractFileSize(size: number) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}


// ─── Payment type helpers ─────────────────────────────────────────────────────

const normalizePaymentType = (raw?: string | null): PaymentType => {
  const v = String(raw || "").trim().toLowerCase();
  if (["fixed", "fixed_payment", "fixed-payment"].includes(v)) return PAYMENT_TYPE.FIXED;
  if (["milestone", "milestone_based", "milestone-based"].includes(v)) return PAYMENT_TYPE.MILESTONE;
  if (["gifting", "product_gifting", "product-gifting"].includes(v)) return PAYMENT_TYPE.GIFTING;
  return PAYMENT_TYPE.FIXED;
};

// ─── Route helpers ────────────────────────────────────────────────────────────

function getTabFromPath(pathname: string | null): Tab {
  const p = pathname ?? "";
  if (p.includes("/brand/influ/applied")) return "applied";
  if (p.includes("/brand/influ/shortlisted")) return "shortlisted";
  if (p.includes("/brand/influ/active")) return "active";
  if (p.includes("/brand/influ/undecided")) return "undecided";
  if (p.includes("/brand/influ/rejected")) return "rejected";
  return "all";
}

// ─── Applicant display helpers ────────────────────────────────────────────────

function toHandle(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s : `@${s}`;
}

function getApplicantDisplayStatus(a: any) {
  const lifecycleRaw = String(a?.lifecycleStatusRaw || "").toUpperCase();
  const isLifecycleActive = lifecycleRaw === "READY_TO_SIGN" || lifecycleRaw === "INFLUENCER_ACCEPTED";
  if (Number(a?.isAccepted) === 1 || isLifecycleActive) return "Active";
  if (Number(a?.isRejected) === 1) return "Rejected";
  if (Number(a?.isShortlisted) === 1) return "Shortlisted";
  if (Number(a?.isUndicided) === 1) return "Undecided";
  if (Number(a?.isAssigned) === 1) return "Shortlisted";
  return "Applied";
}

function doesApplicantBelongToTab(raw: any, tab: Tab) {
  const lifecycleRaw = String(raw?.lifecycleStatusRaw || "").toUpperCase();
  const isLifecycleActive = lifecycleRaw === "READY_TO_SIGN" || lifecycleRaw === "INFLUENCER_ACCEPTED";
  const isAccepted = Number(raw?.isAccepted) === 1 || isLifecycleActive;
  const isShortlisted = Boolean(raw?.isShortlisted) && !isLifecycleActive;
  const isUndicided = Boolean(raw?.isUndicided);
  const isRejected = Boolean(raw?.isRejected);
  const isApplied = !isAccepted && !isShortlisted && !isUndicided && !isRejected;

  if (tab === "all") return true;
  if (tab === "applied") return isApplied;
  if (tab === "shortlisted") return isShortlisted;
  if (tab === "undecided") return isUndicided;
  if (tab === "rejected") return isRejected;
  if (tab === "active") return isAccepted;
  return true;
}

function normalizePlatformType(value: unknown): PlatformType | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "instagram") return "instagram";
  if (v === "youtube") return "youtube";
  if (v === "tiktok" || v === "tik tok") return "tiktok";
  return null;
}

function toEngagementPercent(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return num <= 1 ? num * 100 : num;
}

function buildAvailablePlatforms(a: any): InfluencerRow["platforms"] {
  const result: NonNullable<InfluencerRow["platforms"]> = [];
  const seen = new Set<string>();

  const pushPlatform = (platformValue: unknown, followersValue: unknown, engagementValue: unknown) => {
    const platform = normalizePlatformType(platformValue);
    if (!platform || seen.has(platform)) return;
    seen.add(platform);
    result.push({
      platform,
      followers: Number(followersValue ?? 0) || 0,
    });
  };

  if (Array.isArray(a?.modashProfiles) && a.modashProfiles.length > 0) {
    a.modashProfiles.forEach((profile: any) => {
      pushPlatform(profile?.provider, profile?.followers, profile?.engagementRate);
    });
  }

  if (a?.modashProfile) {
    pushPlatform(a.modashProfile?.provider, a.modashProfile?.followers, a.modashProfile?.engagementRate);
  }

  if (result.length === 0) {
    pushPlatform(a?.primaryPlatform ?? a?.platform, a?.audienceSize, a?.engagementRate);
  }

  return result;
}

function mapAcceptedAdminCreatedInfluencerToRow(a: any): InfluencerRow {
  const influencerId = String(a?.influencerId ?? "").trim();
  const name = String(a?.influencerName ?? "Influencer").trim();
  const createdAtRaw = a?.createdAt ? String(a.createdAt) : "";
  const appliedDate = createdAtRaw ? createdAtRaw.slice(0, 10) : "—";

  const platform = normalizePlatformType(a?.platform);
  const platforms = platform
    ? [
      {
        platform,
        followers: Number(a?.maxFollowers ?? a?.minFollowers ?? 0) || 0,
      },
    ]
    : [];

  return {
    id: influencerId,
    profile: {
      name,
      handle: a?.handle ? toHandle(a.handle) : "—",
      avatarUrl: undefined,
    },
    category: "—",
    platforms,
    followers: Number(a?.maxFollowers ?? 0) || 0,
    engagement: 0,
    appliedDate,
    status: "Active",
    budget:
      Number(a?.influencerBudget ?? a?.campaignBudget ?? 0) > 0
        ? String(a?.influencerBudget ?? a?.campaignBudget)
        : "—",
    __source: "adminAccepted",
    __raw: a,
  } as InfluencerRow;
}

function mapCampaignInvitationToActiveRow(inv: any): InfluencerRow {
  const influencerId = String(
    inv?.influencerId || inv?.influencer?._id || inv?.influencer?.id || ""
  ).trim();

  const name = String(
    inv?.influencerName || inv?.influencer?.name || "Influencer"
  ).trim();

  const createdAtRaw = inv?.createdAt ? String(inv.createdAt) : "";
  const appliedDate = createdAtRaw ? createdAtRaw.slice(0, 10) : "—";

  const platform = normalizePlatformType(inv?.platform);
  const platforms = platform
    ? [
      {
        platform,
        followers: Number(inv?.followers ?? inv?.audienceSize ?? 0) || 0,
      },
    ]
    : [];

  return {
    id: influencerId,
    profile: {
      name,
      handle: inv?.handle ? toHandle(inv.handle) : "—",
      avatarUrl: inv?.profilePic || inv?.avatarUrl || undefined,
    },
    category: "—",
    platforms,
    followers: Number(inv?.followers ?? inv?.audienceSize ?? 0) || 0,
    engagement: 0,
    appliedDate,
    status: "Active",
    budget:
      Number(inv?.influencerBudget ?? inv?.campaignBudget ?? inv?.budget ?? 0) > 0
        ? String(inv?.influencerBudget ?? inv?.campaignBudget ?? inv?.budget)
        : "—",
    __source: "campaignInvitation",
    __raw: {
      ...inv,
      influencerId,
      name,
      isAccepted: 1,
      lifecycleStatusRaw: "INFLUENCER_ACCEPTED",
    },
  } as InfluencerRow;
}

function mapApplicantToRow(a: any): InfluencerRow {
  const influencerId = String(a?.influencerId ?? "").trim();
  const name = String(a?.name ?? "Influencer").trim();
  const createdAtRaw = a?.appliedAt || a?.createdAt ? String(a?.appliedAt || a?.createdAt) : "";
  const appliedDate = createdAtRaw ? createdAtRaw.slice(0, 10) : "—";
  const platforms = buildAvailablePlatforms(a);

  const row: any = {
    id: influencerId,
    profile: {
      name,
      handle: a?.handle ? toHandle(a.handle) : "—",
      avatarUrl: a?.modashProfile?.picture || a?.modashProfiles?.[0]?.picture || undefined,
    },
    category: String(a?.category ?? "—").trim() || "—",
    platforms,
    followers: Number(a?.audienceSize ?? 0) || 0,
    engagement: toEngagementPercent(a?.engagementRate),
    appliedDate,
    status: getProfessionalContractStatusMessage(a, null),
    budget: Number(a?.feeAmount ?? 0) > 0 ? String(a.feeAmount) : "—",
    __source: "applicant",
    __raw: a,
  };

  return row as InfluencerRow;
}

// ─── Contract status helpers ──────────────────────────────────────────────────

function isRejectedMeta(meta?: ContractMeta | null) {
  if (!meta) return false;
  const s = String(meta.status || "").toUpperCase();
  return (
    s === CONTRACT_STATUS.REJECTED ||
    (meta as any).isRejected === 1 ||
    meta.flags?.isRejected ||
    meta.statusFlags?.isRejected
  );
}

function hasExistingContract(raw: any, meta?: ContractMeta | null) {
  return Boolean(
    meta?.contractId ||
    raw?.contractId ||
    raw?.contractMongoId ||
    Number(raw?.isContracted) === 1
  );
}

function needsBrandAcceptance(status?: string | null) {
  return status === CONTRACT_STATUS.INFLUENCER_ACCEPTED;
}

function canSignNow(meta?: ContractMeta | null) {
  return meta?.status === CONTRACT_STATUS.READY_TO_SIGN && !meta?.signatures?.brand?.signed;
}

function isLockedStatus(status?: string | null) {
  return (
    status === CONTRACT_STATUS.CONTRACT_SIGNED ||
    status === CONTRACT_STATUS.MILESTONES_CREATED
  );
}

function isEditableStatus(status?: string | null) {
  return (
    status === CONTRACT_STATUS.BRAND_SENT_DRAFT ||
    status === CONTRACT_STATUS.BRAND_EDITED ||
    status === CONTRACT_STATUS.INFLUENCER_EDITED ||
    status === CONTRACT_STATUS.INFLUENCER_ACCEPTED
  );
}

function hasMilestonesCreated(meta?: ContractMeta | null) {
  if (!meta) return false;
  const status = String(meta.status || "").toUpperCase();
  return (
    status === CONTRACT_STATUS.MILESTONES_CREATED ||
    Boolean((meta as any)?.hasMilestones) ||
    Boolean(meta.flags?.hasMilestones) ||
    Boolean(meta.statusFlags?.hasMilestones)
  );
}

function isUploadedOwnContract(meta?: ContractMeta | null) {
  return (
    meta?.contractSource === "uploaded" ||
    meta?.document?.documentSource === "uploaded"
  );
}

function getProfessionalContractStatusMessage(
  raw: any,
  meta?: ContractMeta | null
): string {
  const status = String(meta?.status || raw?.lifecycleStatusRaw || "").toUpperCase();

  if (!hasExistingContract(raw, meta)) {
    if (Number(raw?.isRejected) === 1) return "Application Rejected";
    if (Number(raw?.isUndicided) === 1) return "Under Review";
    if (Number(raw?.isShortlisted) === 1) return "Shortlisted";
    if (Number(raw?.isAccepted) === 1) return "Approved";
    return "Application Received";
  }

  switch (status) {
    case CONTRACT_STATUS.DRAFT:
      return "Draft Saved";
    case CONTRACT_STATUS.BRAND_SENT_DRAFT:
      return "Contract Sent";
    case CONTRACT_STATUS.BRAND_EDITED:
      return "Updated by Brand";
    case CONTRACT_STATUS.INFLUENCER_EDITED:
      return "Changes Requested by Influencer";
    case CONTRACT_STATUS.BRAND_ACCEPTED:
      return "Accepted by Brand";
    case CONTRACT_STATUS.INFLUENCER_ACCEPTED:
      return "Accepted by Influencer";
    case CONTRACT_STATUS.READY_TO_SIGN:
      return "Ready for Signature";
    case CONTRACT_STATUS.CONTRACT_SIGNED:
      return "Contract Signed";
    case CONTRACT_STATUS.MILESTONES_CREATED:
      return "Milestones Created";
    case CONTRACT_STATUS.REJECTED:
      return "Contract Declined";
    case CONTRACT_STATUS.SUPERSEDED:
      return "Superseded";
    default:
      return "Contract in Progress";
  }
}

function getPrimaryAction(raw: any, meta?: ContractMeta | null): { label: string; viewOnly: boolean } {
  const statusStr = String(meta?.status || "");
  const locked = isLockedStatus(statusStr);

  if (!hasExistingContract(raw, meta)) return { label: "Send Contract", viewOnly: false };
  if (isRejectedMeta(meta)) return { label: "Resend Contract", viewOnly: false };
  if (isUploadedOwnContract(meta)) return { label: "View Contract", viewOnly: true };
  if (locked) return { label: "View Contract", viewOnly: true };
  if (isEditableStatus(statusStr)) return { label: "Update Contract", viewOnly: false };
  return { label: "View Contract", viewOnly: true };
}

/** Whether a row is eligible for bulk contract sending (no existing contract, or rejected). */
function isBulkSelectableRow(raw: any, meta?: ContractMeta | null): boolean {
  return !hasExistingContract(raw, meta) || isRejectedMeta(meta);
}

// ─── Toast / confirm helpers ──────────────────────────────────────────────────

const toast = (opts: { icon: "success" | "error" | "info"; title: string; text?: string }) =>
  Swal.fire({
    ...opts,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    background: "white",
    customClass: { popup: "rounded-lg border border-gray-200" },
  });

const askConfirm = async (title: string, text?: string) => {
  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, continue",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    background: "white",
  });
  return result.isConfirmed;
};

// ─── ActionButtons ────────────────────────────────────────────────────────────

function ActionButtons({
  primaryLabel,
  onPrimary,
  contractChoiceMode,
  onUseTemplate,
  onUploadOwnContract,
  onManage,
  onMail,
  moreMenu,
  showAccept,
  onAccept,
  showSign,
  onSign,
  showViewContract,
  onViewContract,
  isViewContractLoading,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  contractChoiceMode?: boolean;
  onUseTemplate?: () => void;
  onUploadOwnContract?: () => void;
  onManage: () => void;
  onMail: () => void;
  moreMenu?: ReactNode;
  showAccept?: boolean;
  onAccept?: () => void;
  showSign?: boolean;
  onSign?: () => void;
  showViewContract?: boolean;
  onViewContract?: () => void;
  isViewContractLoading?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 104;
    const gap = 6;

    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - gap;
    }

    setMenuPosition({
      top: Math.max(8, top),
      left: Math.max(8, left),
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    updateMenuPosition();

    const close = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }

      setMenuOpen(false);
    };

    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, updateMenuPosition]);

  const handlePrimaryClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (contractChoiceMode) {
      updateMenuPosition();
      setMenuOpen((prev) => !prev);
      return;
    }

    onPrimary();
  };

  const secondaryButton =
    "inline-flex h-8 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white px-3 text-[12px] font-medium text-[#1A1A1A] hover:bg-[#F7F7F7]";

  const blackButton =
    "inline-flex h-8 shrink-0 items-center justify-center rounded-[0.5rem] bg-[#1A1A1A] px-4 text-[12px] font-medium text-white hover:opacity-90";

  const contractChoiceMenu =
    typeof document !== "undefined" && contractChoiceMode && menuOpen
      ? createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPosition.top, left: menuPosition.left }}
          className="fixed z-[99999] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              onUploadOwnContract?.();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            <FileArrowUp size={15} />
            Upload Own Contract
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
              onUseTemplate?.();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-50"
          >
            <FileText size={15} />
            Use Template
          </button>
        </div>,
        document.body
      )
      : null;

  return (
    <div className="flex w-max min-w-max flex-row items-center justify-end gap-2 whitespace-nowrap">
      <button
        ref={buttonRef}
        type="button"
        onClick={handlePrimaryClick}
        className={secondaryButton}
      >
        {primaryLabel}
        {contractChoiceMode ? (
          <CaretDown size={12} weight="bold" className="ml-1" />
        ) : null}
      </button>

      {contractChoiceMenu}

      {showViewContract && onViewContract ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewContract();
          }}
          className={secondaryButton}
        >
          {isViewContractLoading ? "Opening…" : "View Contract"}
        </button>
      ) : null}

      {showSign && onSign ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSign();
          }}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-[0.5rem] bg-[#1A1A1A] px-3 text-[12px] font-medium text-white hover:opacity-90"
        >
          <Signature size={14} />
          Sign
        </button>
      ) : null}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onManage();
        }}
        className={blackButton}
      >
        Manage
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMail();
        }}
        aria-label="Open inbox"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white hover:bg-[#F7F7F7]"
      >
        <EnvelopeOpen size={18} weight="regular" />
        <span
          aria-hidden="true"
          className="absolute right-[0.35rem] top-[0.35rem] h-[0.375rem] w-[0.375rem] rounded-full bg-[#28A745]"
        />
      </button>

      {moreMenu ? <span className="shrink-0">{moreMenu}</span> : null}
    </div>
  );
}

// ─── ActiveMilestoneActions ───────────────────────────────────────────────────

function ActiveMilestoneActions({
  onAddMilestone,
  showViewMilestone,
  onViewMilestone,
  onSendFeedback,
  showSendFeedback,
  onManage,
  onMail,
  moreMenu,
  showAccept,
  onAccept,
  showSign,
  onSign,
  isAdminCreatedCampaign = false,
  showViewContract,
  onViewContract,
}: {
  onAddMilestone: () => void;
  showViewMilestone: boolean;
  onViewMilestone: () => void;
  onSendFeedback?: () => void;
  showSendFeedback?: boolean;
  onManage: () => void;
  onMail: () => void;
  moreMenu?: ReactNode;
  showAccept?: boolean;
  onAccept?: () => void;
  showSign?: boolean;
  onSign?: () => void;
  isAdminCreatedCampaign?: boolean;
  showViewContract?: boolean;
  onViewContract?: () => void;
}) {
  const secondaryButton =
    "inline-flex h-8 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white px-3 text-[12px] font-medium text-[#1A1A1A] hover:bg-[#F7F7F7]";

  const blackButton =
    "inline-flex h-8 shrink-0 items-center justify-center rounded-[0.5rem] bg-[#1A1A1A] px-4 text-[12px] font-medium text-white hover:opacity-90";

  return (
    <div className="flex w-max min-w-max flex-row items-center justify-end gap-2 whitespace-nowrap">
      {isAdminCreatedCampaign ? (
        <button
          type="button"
          onClick={onViewMilestone}
          className={secondaryButton}
        >
          View Milestone
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddMilestone}
          className={secondaryButton}
        >
          Add Milestone
        </button>
      )}

      {showViewMilestone && !isAdminCreatedCampaign ? (
        <button
          type="button"
          onClick={onViewMilestone}
          className={secondaryButton}
        >
          View Milestone
        </button>
      ) : null}

      {showViewContract && onViewContract ? (
        <button
          type="button"
          onClick={onViewContract}
          className={secondaryButton}
        >
          View Contract
        </button>
      ) : null}

      {showSendFeedback && onSendFeedback ? (
        <button
          type="button"
          onClick={onSendFeedback}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#BCE4C5] bg-[#EAF6EC] px-3 text-[12px] font-medium text-[#1A1A1A] hover:bg-[#DCF1E1]"
        >
          Send Feedback
        </button>
      ) : null}

      {showSign && onSign ? (
        <button
          type="button"
          onClick={onSign}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-[0.5rem] bg-[#1A1A1A] px-3 text-[12px] font-medium text-white hover:opacity-90"
        >
          <Signature size={14} />
          Sign
        </button>
      ) : null}

      <button
        type="button"
        onClick={onManage}
        className={blackButton}
      >
        Manage
      </button>

      <button
        type="button"
        onClick={onMail}
        aria-label="Open inbox"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white hover:bg-[#F7F7F7]"
      >
        <EnvelopeOpen size={18} weight="regular" />
        <span
          aria-hidden="true"
          className="absolute right-[0.35rem] top-[0.35rem] h-[0.375rem] w-[0.375rem] rounded-full bg-[#28A745]"
        />
      </button>

      {moreMenu ? <span className="shrink-0">{moreMenu}</span> : null}
    </div>
  );
}


// ─── OwnContractUploadDialog ──────────────────────────────────────────────────

function OwnContractUploadDialog({
  open,
  targetName,
  file,
  accepted,
  error,
  isSubmitting,
  onClose,
  onFileSelected,
  onClearFile,
  onAcceptedChange,
  onSubmit,
}: {
  open: boolean;
  targetName?: string;
  file: File | null;
  accepted: boolean;
  error?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onFileSelected: (file: File | null) => void;
  onClearFile: () => void;
  onAcceptedChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsDragging(false);
      setShowTerms(false);
    }
  }, [open]);

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (isSubmitting) return;
    onFileSelected(event.dataTransfer.files?.[0] || null);
  };

  const dialogDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date())
      .replace(",", "");
  }, [open]);

  const hasReadyFile = Boolean(file);
  const canSend = Boolean(file && accepted && !isSubmitting);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="!w-[min(52rem,calc(100vw-2rem))] !max-w-[min(52rem,calc(100vw-2rem))] overflow-hidden border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className="flex max-h-[90vh] flex-col overflow-hidden bg-white"
          style={{
            borderRadius: "var(--Border-Radius-L, 1rem)",
            background: "var(--Light-Background-Primary, #FFF)",
            boxShadow:
              "0 24px 40px -4px rgba(0, 0, 0, 0.10), 0 0 12px 0 rgba(0, 0, 0, 0.08)",
          }}
        >
          <div className="px-8 pt-8">
            <div className="flex items-center justify-between gap-4">
              <DialogHeader className="min-w-0 space-y-0 text-left">
                <DialogTitle
                  className="truncate"
                  style={{
                    overflow: "hidden",
                    color: "var(--Light-Text-Primary, #1A1A1A)",
                    textOverflow: "ellipsis",
                    fontFamily: "var(--Font-Family-Inter, Inter)",
                    fontSize: "var(--Font-Size-20, 1.25rem)",
                    fontStyle: "normal",
                    fontWeight: "var(--Font-Weight-Semi-Bold, 600)",
                    lineHeight: "var(--Line-Height-28, 1.75rem)",
                    letterSpacing: "var(--Letter-Spacing-0, 0)",
                  }}
                >
                  Upload Contract
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Upload the Brand contract and accept the contractual terms.
                </DialogDescription>
              </DialogHeader>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  style={{
                    color: "var(--Light-Text-Tertiary, #B8B8B8)",
                    textAlign: "center",
                    fontFamily: "var(--Font-Family-Inter, Inter)",
                    fontSize: "var(--Font-Size-16, 1rem)",
                    fontStyle: "normal",
                    fontWeight: "var(--Font-Weight-Medium, 500)",
                    lineHeight: "var(--Line-Height-24, 1.5rem)",
                    letterSpacing: "var(--Letter-Spacing-0, 0)",
                  }}
                >
                  {dialogDate}
                </span>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  aria-label="Close upload contract dialog"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xl leading-none text-[#1A1A1A] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mt-3 h-px w-full bg-[#E5E5E5]" />
          </div>

          {!showTerms ? (
            <div className="flex min-h-0 flex-1 flex-col px-8 pb-5 pt-6">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isSubmitting) setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isSubmitting) inputRef.current?.click();
                }}
                className={[
                  "flex min-h-[13.5rem] cursor-pointer flex-col items-center justify-center px-8 py-10 text-center transition",
                  isDragging ? "border-[#1A1A1A]" : "hover:border-[#BDBDBD]",
                  isSubmitting ? "pointer-events-none opacity-70" : "",
                ].join(" ")}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid var(--Neutrals-300, #D6D6D6)",
                  background: "var(--Neutrals-50, #F9F9F9)",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    onFileSelected(event.target.files?.[0] || null);
                    event.target.value = "";
                  }}
                />

                <div
                  className="flex h-8 w-8 items-center justify-center"
                  style={{
                    borderRadius: "3.75rem",
                    background: "var(--Light-Background-Neutral, #E6E6E6)",
                  }}
                >
                  <CloudArrowUp size={16} weight="bold" color="#969696" />
                </div>

                {file ? (
                  <>
                    <div className="mt-3 max-w-[21rem] truncate text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
                      {file.name}
                    </div>
                    <div className="mt-1 text-[0.75rem] leading-4 text-[#969696]">
                      {formatOwnContractFileSize(file.size)}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={(event) => {
                        event.stopPropagation();
                        onClearFile();
                      }}
                      className="mt-3 text-[0.75rem] font-semibold text-[#1A1A1A] underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-[0.875rem] leading-5 text-[#B8B8B8]">
                      <span className="font-semibold text-[#1A1A1A] underline underline-offset-2">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                    <div className="mt-1 text-[0.75rem] leading-4 text-[#B8B8B8]">
                      PDF under {Math.round(OWN_CONTRACT_MAX_BYTES / (1024 * 1024))}mb
                    </div>
                  </>
                )}
              </div>

              {error ? (
                <div className="mt-3 rounded-[0.5rem] border border-red-200 bg-red-50 px-3 py-2 text-[0.875rem] leading-5 text-red-700">
                  {error}
                </div>
              ) : null}

              <label className="mt-4 flex cursor-pointer items-start gap-2">
                <Checkbox
                  checked={accepted}
                  disabled={!hasReadyFile || isSubmitting}
                  onCheckedChange={(value) => {
                    onAcceptedChange(value === true);
                  }}
                  onClick={() => {
                    if (error) onAcceptedChange(accepted);
                  }}
                  aria-invalid={Boolean(error && error.toLowerCase().includes("accept"))}
                  className={[
                    "bg-background border rounded-[4px] w-[20px] h-[20px] p-[4px] mt-1 shrink-0 disabled:cursor-not-allowed disabled:opacity-40",
                    error && error.toLowerCase().includes("accept")
                      ? "border-[color:var(--Errors-500,#E35141)]"
                      : "border-[color:var(--Border-Primary,#B3B3B3)]",
                  ].join(" ")}
                />

                <span
                  style={{
                    color: "var(--Light-Text-Tertiary, #B8B8B8)",
                    fontFamily: "Inter",
                    fontSize: "0.875rem",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "1.25rem",
                  }}
                >
                  By signing, I confirm that I have read and therefore agree to all{" "}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setShowTerms(true);
                    }}
                    style={{
                      color: "var(--Light-Text-Secondary, #969696)",
                      fontFamily: "var(--Font-Family-Inter, Inter)",
                      fontSize: "var(--Font-Size-16, 1rem)",
                      fontStyle: "normal",
                      fontWeight: "var(--Font-Weight-Medium, 500)",
                      lineHeight: "var(--Line-Height-24, 1.5rem)",
                      letterSpacing: "var(--Letter-Spacing-0, 0)",
                      textDecorationLine: "underline",
                      textDecorationStyle: "solid",
                      textDecorationSkipInk: "none",
                      textUnderlineOffset: "auto",
                      textUnderlinePosition: "from-font",
                    }}
                  >
                    contractual terms
                  </button>
                  , which become legally binding
                </span>
              </label>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-8 pb-5 pt-5">
              <div className="min-h-[17.25rem] max-h-[17.25rem] overflow-y-auto pr-4 scrollbar-none scrollbar-hide">
                <p
                  style={{
                    color: "var(--Light-Text-Secondary, #969696)",
                    fontFamily: "var(--Font-Family-Inter, Inter)",
                    fontSize: "var(--Font-Size-16, 1rem)",
                    fontStyle: "normal",
                    fontWeight: "var(--Font-Weight-Medium, 500)",
                    lineHeight: "var(--Line-Height-24, 1.5rem)",
                    letterSpacing: "var(--Letter-Spacing-0, 0)",
                  }}
                >
                  By accepting this Acknowledgement, the Brand and Creator confirm that:
                </p>

                <ol className="mt-5 space-y-4">
                  {COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_POINTS.map((point, index) => (
                    <li
                      key={point}
                      style={{
                        color: "var(--Light-Text-Secondary, #969696)",
                        fontFamily: "var(--Font-Family-Inter, Inter)",
                        fontSize: "var(--Font-Size-16, 1rem)",
                        fontStyle: "normal",
                        fontWeight: "var(--Font-Weight-Medium, 500)",
                        lineHeight: "var(--Line-Height-24, 1.5rem)",
                        letterSpacing: "var(--Letter-Spacing-0, 0)",
                      }}
                    >
                      {index + 1}. {point}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <div className="mt-auto border-t border-[#F1F1F1] bg-white px-8 py-5">
            <div className="flex items-center justify-between gap-5">
              {showTerms ? (
                <button
                  type="button"
                  onClick={() => setShowTerms(false)}
                  className="h-10 rounded-[0.5rem] border border-[#D6D6D6] bg-white px-4 text-[0.875rem] font-semibold text-[#1A1A1A] hover:bg-[#F9F9F9]"
                >
                  Back to upload
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center justify-end gap-5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="h-10 rounded-[0.5rem] px-3 text-[0.875rem] font-semibold text-[#1A1A1A] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canSend}
                  onClick={onSubmit}
                  className="flex h-10 min-w-[5.75rem] items-center justify-center rounded-[0.5rem] bg-[#1A1A1A] px-5 text-[0.875rem] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch
                        size={14}
                        weight="bold"
                        className="mr-2 animate-spin"
                      />
                      Uploading
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SignatureModal ───────────────────────────────────────────────────────────

function SignatureModal({
  isOpen,
  onClose,
  onSigned,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSigned: (signatureDataUrl: string) => Promise<void> | void;
}) {
  const [sigDataUrl, setSigDataUrl] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSigDataUrl("");
      setError("");
      setFileName("");
      setFileSize(null);
      setIsDragging(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  const formatSize = (size: number | null) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFile = (file?: File | null) => {
    if (isSubmitting || !file) return;
    setError("");
    setIsDragging(false);
    setFileName(file.name);
    setFileSize(file.size);

    if (!/image\/(png|jpeg)/i.test(file.type)) {
      setSigDataUrl("");
      return setError("Please upload a PNG or JPG image.");
    }
    if (file.size > 50 * 1024) {
      setSigDataUrl("");
      return setError("Signature must be 50 KB or less.");
    }

    const reader = new FileReader();
    reader.onload = () => setSigDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isOpen) return;
    const el = dropRef.current;
    if (!el) return;

    const onDragOver = (e: DragEvent) => { if (!isSubmitting) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); } };
    const onDragEnter = (e: DragEvent) => { if (!isSubmitting) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); } };
    const onDragLeave = (e: DragEvent) => { if (!isSubmitting) { e.preventDefault(); e.stopPropagation(); if (e.target === el) setIsDragging(false); } };
    const onDrop = (e: DragEvent) => { if (!isSubmitting) { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFile(e.dataTransfer?.files?.[0]); } };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleSignClick = async () => {
    if (isSubmitting) return;
    if (!sigDataUrl) { setError("Please select a signature image first."); return; }
    try {
      setIsSubmitting(true);
      await onSigned(sigDataUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] ${isSubmitting ? "pointer-events-none" : ""}`}
        onClick={() => !isSubmitting && onClose()}
      />
      <div className="relative z-[61] w-[96%] max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="relative h-24" style={{ background: "linear-gradient(135deg,#1A1A1A 0%,#2A2A2A 100%)" }}>
          <div className="relative z-10 flex h-full items-center justify-between px-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold">✍️</div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wide sm:text-base">Sign as Brand</span>
                <span className="text-xs text-white/80">Upload your official signature to finalize the document.</span>
              </div>
            </div>
            <button
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg hover:bg-white/30 ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-gray-700">
            Upload your signature image <span className="font-semibold">(PNG/JPG, ≤ 50 KB)</span>.
          </p>

          <div
            ref={dropRef}
            className={`cursor-pointer select-none rounded-xl border-2 border-dashed p-5 text-center text-sm transition-all ${isDragging ? "border-[#1A1A1A] bg-neutral-100" : "border-gray-300 bg-gray-50 hover:bg-gray-100/80"}`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><span className="text-lg">📁</span></div>
              <div className="font-medium text-gray-800">{isDragging ? "Drop your signature here" : "Drag & drop your signature here"}</div>
              <div className="text-xs text-gray-500">or use the file picker below</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600">Signature file</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={isSubmitting}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Allowed: PNG, JPG · Max size: 50 KB</span>
              {fileSize !== null && (
                <span>Selected: <span className={fileSize > 50 * 1024 ? "font-medium text-red-600" : ""}>{formatSize(fileSize)}</span></span>
              )}
            </div>
            {fileName && <div className="truncate text-[11px] text-gray-600">File: <span className="font-medium">{fileName}</span></div>}
            {error && <div className="mt-1 flex items-center gap-1 text-xs text-red-600">⚠️ {error}</div>}
          </div>

          {sigDataUrl && (
            <div className="flex items-center gap-3 rounded-xl border bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-700">Signature preview</div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => { setSigDataUrl(""); setFileName(""); setFileSize(null); setError(""); }}
                    className="text-[11px] text-gray-500 underline hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >Clear</button>
                </div>
                <div className="flex items-center justify-center rounded-lg border bg-white px-3 py-2">
                  <img src={sigDataUrl} alt="Signature preview" className="max-h-14 object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end gap-3 px-5 pb-5 pt-1 sm:flex-row">
          <Button variant="outline" onClick={() => !isSubmitting && onClose()} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSignClick} disabled={!sigDataUrl || isSubmitting}>
            {isSubmitting ? "Signing…" : "Sign & continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── InfluencerList ───────────────────────────────────────────────────────────

export default function InfluencerList() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCounts } = useInfluencerCounts();
  const tab = useMemo(() => getTabFromPath(pathname), [pathname]);

  const [filters, setFilters] = useState<FilterState>({
    "Influencer Type": "",
    "Engagement Rate": "",
    Follower: "",
    Category: [],
    Platform: [],
    Date: "",
  });

  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("Priority");

  const [applicantRows, setApplicantRows] = useState<InfluencerRow[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [errApplicants, setErrApplicants] = useState("");

  const [visibleCount, setVisibleCount] = useState(PAGE_LIMIT);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingDecisionId, setUpdatingDecisionId] = useState<string | null>(null);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [isAdminCreatedCampaign, setIsAdminCreatedCampaign] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignBudget, setCampaignBudget] = useState<number | null>(null);
  const [campaignTimeline, setCampaignTimeline] = useState<{ startDate?: string | Date; endDate?: string | Date } | null>(null);

  const [contractOpen, setContractOpen] = useState(false);
  const [contractTarget, setContractTarget] = useState<any | null>(null);
  const [contractTargetMeta, setContractTargetMeta] = useState<ContractMeta | null>(null);
  const [contractPrefill, setContractPrefill] = useState<any | null>(null);
  const [contractForcedPaymentType, setContractForcedPaymentType] = useState<PaymentType | undefined>(undefined);
  const [openingContractForId, setOpeningContractForId] = useState<string | null>(null);

  const [contractMetaMap, setContractMetaMap] = useState<Record<string, ContractMeta | null>>({});
  const [loadingContractMeta, setLoadingContractMeta] = useState(false);

  const [signOpen, setSignOpen] = useState(false);
  const [signTargetMeta, setSignTargetMeta] = useState<ContractMeta | null>(null);
  const [viewingPdfForId, setViewingPdfForId] = useState<string | null>(null);
  const [ownContractDialogOpen, setOwnContractDialogOpen] = useState(false);
  const [ownContractTargetRow, setOwnContractTargetRow] = useState<InfluencerRow | null>(null);
  const [ownContractFile, setOwnContractFile] = useState<File | null>(null);
  const [ownContractAcknowledged, setOwnContractAcknowledged] = useState(false);
  const [ownContractError, setOwnContractError] = useState("");
  const [uploadingContractForId, setUploadingContractForId] = useState<string | null>(null);

  const [milestoneCreatedMap, setMilestoneCreatedMap] = useState<Record<string, boolean>>({});
  const [milestoneTargetRow, setMilestoneTargetRow] = useState<InfluencerRow | null>(null);
  const [campaignFeedbackTarget, setCampaignFeedbackTarget] = useState<InfluencerRow | null>(null);
  const [campaignFeedbackPromptMap, setCampaignFeedbackPromptMap] = useState<Record<string, boolean>>({});
  const [campaignFeedbackRefreshKey, setCampaignFeedbackRefreshKey] = useState(0);

  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkInfluencerNames, setBulkInfluencerNames] = useState<string[]>([]);

  const [isPayoutTypeDialogOpen, setIsPayoutTypeDialogOpen] = useState(false);
  const [payoutDialogMode, setPayoutDialogMode] = useState<"bulk" | "single" | null>(null);
  const [pendingInfluencerForContract, setPendingInfluencerForContract] = useState<any | null>(null);
  const [, setCampaignPayoutType] = useState<string>("");
  const campaignPayoutTypeRef = useRef<string>("");

  const [bulkSidebarOpen, setBulkSidebarOpen] = useState(false);
  const [bulkTargets, setBulkTargets] = useState<any[]>([]);
  const [bulkForcedPaymentType, setBulkForcedPaymentType] = useState<PaymentType | undefined>(undefined);
  const [bulkContractPrefill, setBulkContractPrefill] = useState<any | null>(null);

  const signerName =
    (typeof window !== "undefined" &&
      (localStorage.getItem("brandContactName") || localStorage.getItem("brandName") || "")) || "";

  const signerEmail =
    (typeof window !== "undefined" && localStorage.getItem("brandEmail")) || "";

  const campaignId = useMemo(() => {
    const q1 = searchParams.get("campaignId");
    const q2 = searchParams.get("id");
    return String(q1 ?? q2 ?? "").trim();
  }, [searchParams]);

  const isFullyManagedMode = useMemo(() => {
    return searchParams.get("fm") === "1";
  }, [searchParams]);

  useEffect(() => {
    if (!isFullyManagedMode) return;

    setFilters((prev) => ({
      ...prev,
      "Influencer Type": "",
      "Engagement Rate": "",
      Follower: "",
      Category: [],
      Platform: [],
      Date: "",
    }));
  }, [isFullyManagedMode]);

  const tableVariant = useMemo(() => {
    if (tab === "shortlisted") return "shortlisted";
    if (tab === "active") return "active";
    return "default";
  }, [tab]);

  useEffect(() => {
    const id =
      localStorage.getItem("brandId") ||
      localStorage.getItem("brandID") ||
      localStorage.getItem("brand_id") ||
      "";
    setBrandId(id || null);

    const savedType = localStorage.getItem("campaignPayoutType") || "";
    if (savedType) {
      const normalized = normalizePaymentType(savedType);
      campaignPayoutTypeRef.current = normalized;
      setCampaignPayoutType(normalized);
    }
  }, []);

  useEffect(() => {
    if (!brandId || !campaignId) {
      setIsAdminCreatedCampaign(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const res: any = await apiCampaignViewByBrand({ brandId, campaignId });
        if (cancelled) return;

        const campaign = ((res as any)?.data?.doc ?? (res as any)?.doc ?? res) as any;
        const createdByRole = String(campaign?.createdBy?.role ?? "")
          .trim()
          .toLowerCase();

        setIsAdminCreatedCampaign(createdByRole === "admin");
      } catch {
        if (!cancelled) setIsAdminCreatedCampaign(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [brandId, campaignId]);

  useEffect(() => {
    setVisibleCount(PAGE_LIMIT);
  }, [tab, search]);

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      try {
        const res: any = await api.get("/campaign/campaignSummary", { params: { id: campaignId } });
        const data = res?.data || res || {};
        const campaignName = data.campaignName || data.productOrServiceName || "";
        const budgetNum = typeof data.budget === "number" ? data.budget : Number(data.budget ?? NaN);

        setCampaignTitle(campaignName);
        if (!Number.isNaN(budgetNum)) setCampaignBudget(budgetNum);
        if (data.timeline) setCampaignTimeline(data.timeline);
      } catch {
        // ignore
      }
    })();
  }, [campaignId]);

  function getFilterStatusFromTab(tab: Tab): "all" | "applied" | "active" | "shortlisted" | "undecided" | "rejected" {
    if (tab === "applied") return "applied";
    if (tab === "active") return "active";
    if (tab === "shortlisted") return "shortlisted";
    if (tab === "undecided") return "undecided";
    if (tab === "rejected") return "rejected";
    return "all";
  }

  function getFilterStatusFromInfluencerType(value: string): "all" | "applied" | "active" | "shortlisted" | "undecided" | "rejected" | "invited" | "completed" | undefined {
    const v = String(value || "").trim().toLowerCase();
    if (!v || v === "all") return "all";
    if (["applied", "active", "shortlisted", "undecided", "rejected", "invited", "completed"].includes(v)) return v as any;
    return undefined;
  }

  function getApiDate(value: string): "today" | "last7days" | "last30days" | undefined {
    const v = String(value || "").trim().toLowerCase();
    if (!v || v === "all") return undefined;
    if (v === "today") return "today";
    if (v === "last 7 days") return "last7days";
    if (v === "last 30 days") return "last30days";
    return undefined;
  }

  function getApiEngagementRate(value: string): "0-2%" | "2-5%" | "5-8%" | "8-12%" | "12%+" | undefined {
    const v = String(value || "").trim();
    if (!v || v === "All") return undefined;
    if (["0-2%", "2-5%", "5-8%", "8-12%", "12%+"].includes(v)) return v as any;
    return undefined;
  }

  function getApiInfluencerTier(value: string): "Nano" | "Micro" | "Mid-tier" | "Macro" | "Mega" | undefined {
    const v = String(value || "").trim();
    if (!v || v === "All") return undefined;
    const parts = v.split("•").map((s) => s.trim());
    const last = parts[parts.length - 1];
    if (["Nano", "Micro", "Mid-tier", "Macro", "Mega"].includes(last)) return last as any;
    return undefined;
  }

  function getApiPlatform(values: string[]): "Instagram" | "Youtube" | "TikTok" | Array<"Instagram" | "Youtube" | "TikTok"> | undefined {
    const selected = (values || []).filter((v) => v && v !== "All") as any[];
    if (selected.length === 0) return undefined;
    if (selected.length === 1) return selected[0];
    return selected;
  }

  function getApiSortBy(value: string): "priority" | "recentlyAdded" | "highestEngagement" | "highestFollower" | "priceLowToHigh" | "priceHighToLow" | undefined {
    const v = String(value || "").trim().toLowerCase();
    if (!v || v === "priority") return "priority";
    if (v === "recently added") return "recentlyAdded";
    if (v === "highest engagement") return "highestEngagement";
    if (v === "highest follower") return "highestFollower";
    if (v === "price: low to high") return "priceLowToHigh";
    if (v === "price: high to low") return "priceHighToLow";
    return "priority";
  }

  function getApiSortField(value: string): "name" | "audienceSize" | "engagementRate" | "createdAt" | "feeAmount" | "category" | "primaryPlatform" | undefined {
    const v = String(value || "").trim().toLowerCase();
    if (!v || v === "priority") return undefined;
    if (v === "recently added") return "createdAt";
    if (v === "highest engagement") return "engagementRate";
    if (v === "highest follower") return "audienceSize";
    if (v === "price: low to high" || v === "price: high to low") return "feeAmount";
    return undefined;
  }

  function getApiSortOrder(value: string): 0 | 1 {
    const v = String(value || "").trim().toLowerCase();
    if (v === "price: high to low") return 1;
    return 0;
  }

  const fetchApplicants = useCallback(async () => {
    if (!campaignId) {
      setApplicantRows([]);
      setErrApplicants("campaignId missing in URL (use ?campaignId=...)");
      return;
    }

    if (tab === "active" && !brandId) {
      setApplicantRows([]);
      setErrApplicants("");
      return;
    }

    setLoadingApplicants(true);
    setErrApplicants("");

    try {
      const trimmedSearch = search.trim();
      if (tab === "active") {
        const selectedCategoryIds = (filters.Category || []).filter((v) => v && v !== "All");

        const selectedInvitationPlatforms = (filters.Platform || [])
          .filter((v) => v && v !== "All")
          .map((v) => normalizePlatformType(v))
          .filter(Boolean) as PlatformType[];

        const singleInvitationPlatform = selectedInvitationPlatforms.length === 1 ? selectedInvitationPlatforms[0] : undefined;

        const applyPayload: any = {
          campaignId,
          page: 1,
          limit: 100,
          search: trimmedSearch || undefined,
          filterStatus: "active",
          engagementRate: getApiEngagementRate(filters["Engagement Rate"]),
          influencerTier: getApiInfluencerTier(filters.Follower),
          platform: getApiPlatform(filters.Platform),
          date: getApiDate(filters.Date),
          sortBy: getApiSortBy(sortValue),
          sortField: getApiSortField(sortValue),
          sortOrder: getApiSortOrder(sortValue),
        };

        if (isAdminCreatedCampaign) applyPayload.createdPage = "fullyManaged";

        if (selectedCategoryIds.length === 1) applyPayload.categoryId = selectedCategoryIds[0];
        else if (selectedCategoryIds.length > 1) applyPayload.categoryIds = selectedCategoryIds;

        const invitationPayload: any = {
          brandId,
          campaignId,
          page: 1,
          limit: 100,
          status: "accepted",
          includeCampaign: 1,
          includeNames: 1,
          platform: singleInvitationPlatform,
        };

        const [applyRes, invitationRes]: any[] = await Promise.all([
          apiGetListByCampaign(applyPayload),
          apiGetCampaignInvitationsByCampaign(invitationPayload),
        ]);

        const influencers = Array.isArray(applyRes?.influencers)
          ? applyRes.influencers
          : Array.isArray(applyRes?.data?.influencers)
            ? applyRes.data.influencers
            : [];

        const applyMapped = influencers
          .map((inf: any) => {
            if (inf?.name || inf?.modashProfile || inf?.modashProfiles) {
              return mapApplicantToRow({
                ...inf,
                isAccepted: 1,
                lifecycleStatusRaw: inf?.lifecycleStatusRaw || "INFLUENCER_ACCEPTED",
              });
            }
            return mapAcceptedAdminCreatedInfluencerToRow(inf);
          })
          .filter((r: InfluencerRow) => String((r as any)?.id ?? "").trim());

        const invitations = Array.isArray(invitationRes?.invitations)
          ? invitationRes.invitations
          : Array.isArray(invitationRes?.data?.invitations)
            ? invitationRes.data.invitations
            : [];

        const invitationMapped = invitations
          .map(mapCampaignInvitationToActiveRow)
          .filter((r: InfluencerRow) => String((r as any)?.id ?? "").trim())
          .filter((row: InfluencerRow) => {
            const raw = (row as any)?.__raw ?? {};
            const name = String(row?.profile?.name || "").toLowerCase();
            const handle = String(row?.profile?.handle || "").toLowerCase();
            const email = String(raw?.influencerEmail || "").toLowerCase();
            const q = trimmedSearch.toLowerCase();

            if (q && !name.includes(q) && !handle.includes(q) && !email.includes(q)) return false;

            if (selectedInvitationPlatforms.length > 0) {
              const rowPlatforms = (row.platforms || [])
                .map((p: any) => normalizePlatformType(p?.platform))
                .filter(Boolean);
              return rowPlatforms.some((p) => selectedInvitationPlatforms.includes(p as PlatformType));
            }

            return true;
          });

        const mergedMap = new Map<string, InfluencerRow>();
        applyMapped.forEach((row: InfluencerRow) => mergedMap.set(String(row.id), row));
        invitationMapped.forEach((row: InfluencerRow) => {
          const id = String(row.id);
          if (!mergedMap.has(id)) mergedMap.set(id, row);
        });

        const merged = Array.from(mergedMap.values());
        const statusCounts = applyRes?.statusCounts ?? applyRes?.data?.statusCounts ?? {};
        const applyTotal = applyRes?.applicantCount ?? applyRes?.total ?? applyRes?.data?.applicantCount ?? applyRes?.data?.total ?? applyMapped.length;
        const invitationOnlyCount = invitationMapped.filter((row: InfluencerRow) => !applyMapped.some((a: InfluencerRow) => a.id === row.id)).length;

        setCounts({
          all: Number(applyTotal || 0) + invitationOnlyCount,
          applied: statusCounts?.applied ?? 0,
          active: merged.length,
          shortlisted: statusCounts?.shortlisted ?? 0,
          undecided: statusCounts?.undecided ?? 0,
          rejected: statusCounts?.rejected ?? 0,
        });

        setApplicantRows(merged);
        return;
      }

      const tabStatus = getFilterStatusFromTab(tab);
      const influencerTypeStatus = getFilterStatusFromInfluencerType(filters["Influencer Type"]);
      const effectiveFilterStatus = tab === "all" ? (influencerTypeStatus ?? "all") : tabStatus;
      const selectedCategoryIds = (filters.Category || []).filter((v) => v && v !== "All");

      const payload: any = {
        campaignId,
        page: 1,
        limit: 100,
        search: trimmedSearch || undefined,
        filterStatus: effectiveFilterStatus,
        engagementRate: getApiEngagementRate(filters["Engagement Rate"]),
        influencerTier: getApiInfluencerTier(filters.Follower),
        platform: getApiPlatform(filters.Platform),
        date: getApiDate(filters.Date),
        sortBy: getApiSortBy(sortValue),
        sortField: getApiSortField(sortValue),
        sortOrder: getApiSortOrder(sortValue),
      };

      if (selectedCategoryIds.length === 1) payload.categoryId = selectedCategoryIds[0];
      else if (selectedCategoryIds.length > 1) payload.categoryIds = selectedCategoryIds;

      const res: any = await apiGetListByCampaign(payload);
      const influencers = Array.isArray(res?.influencers) ? res.influencers : [];

      const totalCount = res?.applicantCount ?? 0;
      const appliedCount =
        res?.statusCounts?.applied ??
        influencers.filter((inf: any) => {
          const isAccepted = Number(inf?.isAccepted) === 1;
          const isShortlisted = Number(inf?.isShortlisted) === 1;
          const isUndicided = Number(inf?.isUndicided) === 1;
          const isRejected = Number(inf?.isRejected) === 1;
          return !isAccepted && !isShortlisted && !isUndicided && !isRejected;
        }).length;

      const activeCount = res?.statusCounts?.active ?? influencers.filter((inf: any) => Number(inf?.isAccepted) === 1).length;

      setCounts({
        all: totalCount,
        applied: appliedCount,
        active: activeCount,
        shortlisted: res?.statusCounts?.shortlisted ?? 0,
        undecided: res?.statusCounts?.undecided ?? 0,
        rejected: res?.statusCounts?.rejected ?? 0,
      });

      let mapped = influencers
        .map(mapApplicantToRow)
        .filter((r: InfluencerRow) => String((r as any)?.id ?? "").trim());

      mapped = mapped.filter((row: InfluencerRow) => doesApplicantBelongToTab((row as any)?.__raw ?? {}, tab));

      const map = new Map<string, InfluencerRow>();
      mapped.forEach((r: InfluencerRow) => map.set(String((r as any).id), r));
      setApplicantRows(Array.from(map.values()));
    } catch (e) {
      setErrApplicants(getApiErrorMessage(e, "Failed to load applicants"));
    } finally {
      setLoadingApplicants(false);
    }
  }, [campaignId, search, tab, filters, sortValue, setCounts, brandId, isAdminCreatedCampaign]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const getLatestContractForApplicant = useCallback(
    async (rawApplicant: any): Promise<ContractMeta | null> => {
      if (!brandId || !campaignId || !rawApplicant?.influencerId) return null;
      try {
        const res: any = await api.post("/contract/getContract", {
          brandId,
          influencerId: rawApplicant.influencerId,
          campaignId,
        });
        const list = res?.data?.contracts || res?.contracts || [];
        const filtered = (list as ContractMeta[]).filter((c) => String(c.campaignId) === String(campaignId));
        return filtered.length ? filtered[0] : list.length ? list[0] : null;
      } catch {
        return null;
      }
    },
    [brandId, campaignId]
  );

  const loadContractMeta = useCallback(
    async (rows: InfluencerRow[]) => {
      if (!brandId || !campaignId || !rows.length) { setContractMetaMap({}); return; }

      setLoadingContractMeta(true);
      try {
        const results = await Promise.all(
          rows.map(async (row) => {
            const raw = (row as any)?.__raw ?? null;
            const meta = await getLatestContractForApplicant(raw);
            return { influencerId: String((row as any)?.id ?? ""), meta };
          })
        );
        const nextMap: Record<string, ContractMeta | null> = {};
        results.forEach((item) => { nextMap[item.influencerId] = item.meta; });
        setContractMetaMap(nextMap);
      } finally {
        setLoadingContractMeta(false);
      }
    },
    [brandId, campaignId, getLatestContractForApplicant]
  );

  useEffect(() => {
    loadContractMeta(applicantRows);
  }, [applicantRows, loadContractMeta]);

  const visibleRows = useMemo(() => applicantRows.slice(0, visibleCount), [applicantRows, visibleCount]);
  const hasMore = visibleCount < applicantRows.length;

  const isBulkSelectable = useCallback(
    (row: InfluencerRow): boolean => {
      const raw = (row as any)?.__raw ?? {};
      const meta = contractMetaMap[row.id] ?? null;
      return isBulkSelectableRow(raw, meta);
    },
    [contractMetaMap]
  );

  const toggleBulkRow = useCallback((influencerId: string) => {
    setSelectedBulkIds((prev) =>
      prev.includes(influencerId) ? prev.filter((id) => id !== influencerId) : [...prev, influencerId]
    );
  }, []);

  const toggleBulkAllVisible = useCallback(() => {
    const eligibleIds = visibleRows.filter(isBulkSelectable).map((row) => row.id);
    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedBulkIds.includes(id));

    setSelectedBulkIds((prev) => {
      if (allSelected) return prev.filter((id) => !eligibleIds.includes(id));
      return Array.from(new Set([...prev, ...eligibleIds]));
    });
  }, [visibleRows, isBulkSelectable, selectedBulkIds]);

  const clearBulkSelection = useCallback(() => {
    setSelectedBulkIds([]);
  }, []);

  const getRawInfluencerId = useCallback((raw: any, fallbackId = "") => {
    return String(raw?.influencerId || raw?._id || raw?.id || fallbackId || "").trim();
  }, []);

  const fetchSendContractRequirements = useCallback(
    async ({
      influencerId,
      influencerIds,
      paymentType,
      mode = "single",
    }: {
      influencerId?: string;
      influencerIds?: string[];
      paymentType?: PaymentType;
      mode?: "single" | "bulk";
    }) => {
      if (!brandId || !campaignId) {
        throw new Error("Brand and campaign are required before sending a contract.");
      }

      const payload: Record<string, any> = { brandId, campaignId, mode };
      if (paymentType) payload.paymentType = paymentType;
      if (mode === "bulk") payload.influencerIds = influencerIds || [];
      else payload.influencerId = influencerId;

      const res: any = await post("/contract/send-requirements", payload);
      return res?.data || res;
    },
    [brandId, campaignId]
  );

  const openBulkPayoutTypeDialog = useCallback(() => {
    setPayoutDialogMode("bulk");
    setPendingInfluencerForContract(null);
    setIsPayoutTypeDialogOpen(true);
  }, []);

  const openSinglePayoutTypeDialog = useCallback((raw: any) => {
    setPayoutDialogMode("single");
    setPendingInfluencerForContract(raw);
    setIsPayoutTypeDialogOpen(true);
  }, []);

  const handleSelectPayoutType = useCallback(
    async (type: PaymentType) => {
      if (typeof window !== "undefined") localStorage.setItem("campaignPayoutType", type);
      campaignPayoutTypeRef.current = type;
      setCampaignPayoutType(type);
      setIsPayoutTypeDialogOpen(false);

      if (payoutDialogMode === "bulk") {
        const targets = applicantRows
          .filter(isBulkSelectable)
          .filter((row) => selectedBulkIds.includes(row.id))
          .map((row) => (row as any)?.__raw);

        if (!targets.length) {
          toast({ icon: "info", title: "No influencers selected", text: "Select at least one eligible influencer." });
          return;
        }

        setOpeningContractForId("bulk");
        try {
          const prefill = await fetchSendContractRequirements({ mode: "bulk", influencerIds: selectedBulkIds, paymentType: type });
          setBulkTargets(prefill?.influencers?.length ? prefill.influencers : targets);
          setBulkForcedPaymentType(normalizePaymentType(prefill?.paymentType || type));
          setBulkContractPrefill(prefill);
          setContractTarget(prefill?.influencer || targets[0]);
          setContractTargetMeta(null);
          setBulkSidebarOpen(true);
        } catch (e: any) {
          toast({
            icon: "error",
            title: "Could not prepare contract",
            text: e?.response?.data?.message || e?.message || "Required contract fields could not be loaded.",
          });
          return;
        } finally {
          setOpeningContractForId(null);
        }

        try {
          const res: any = await apiGetfetchBulkInfleuncerId(selectedBulkIds);
          const list = res?.influencers || res?.data?.influencers || res?.data || [];
          setBulkInfluencerNames(list.map((inf: any) => inf.name).filter(Boolean));
        } catch {
          setBulkInfluencerNames(targets.map((t) => t.name).filter(Boolean));
        }
      } else if (payoutDialogMode === "single" && pendingInfluencerForContract) {
        const influencerId = getRawInfluencerId(pendingInfluencerForContract);
        setOpeningContractForId(influencerId || "single");
        try {
          const prefill = await fetchSendContractRequirements({ influencerId, paymentType: type, mode: "single" });
          setContractPrefill(prefill);
          setContractForcedPaymentType(normalizePaymentType(prefill?.paymentType || type));
          setContractTarget(prefill?.influencer || pendingInfluencerForContract);
          setContractTargetMeta(prefill?.contract || contractMetaMap[influencerId] || null);
          setContractOpen(true);
        } catch (e: any) {
          toast({
            icon: "error",
            title: "Could not prepare contract",
            text: e?.response?.data?.message || e?.message || "Required contract fields could not be loaded.",
          });
          return;
        } finally {
          setOpeningContractForId(null);
        }
      }

      setPendingInfluencerForContract(null);
      setPayoutDialogMode(null);
    },
    [payoutDialogMode, pendingInfluencerForContract, applicantRows, isBulkSelectable, selectedBulkIds, contractMetaMap, fetchSendContractRequirements, getRawInfluencerId]
  );

  const handleApplicantDecision = async (row: InfluencerRow, action: ApplicantDecisionField) => {
    const source = String((row as any)?.__source ?? "");
    if (source !== "applicant") return;
    if (!campaignId || !row.id) return;

    const actionToTab: Partial<Record<ApplicantDecisionField, string>> = {
      isRejected: "rejected",
      isUndicided: "undecided",
      isShortlisted: "shortlisted",
    };

    try {
      setUpdatingDecisionId(row.id);
      const res = await apiSetApplicantDecisionStatus({ campaignId, influencerId: row.id, field: action });
      const updatedApplicant = res?.applicant;
      if (!updatedApplicant) return;

      setApplicantRows((prev) =>
        prev.flatMap((r) => {
          if (r.id !== row.id) return [r];
          const prevRaw = (r as any)?.__raw ?? {};
          const nextRaw = {
            ...prevRaw,
            isShortlisted: Number(updatedApplicant.isShortlisted ?? 0),
            isUndicided: Number(updatedApplicant.isUndicided ?? 0),
            isRejected: Number(updatedApplicant.isRejected ?? 0),
          };
          const nextRow = { ...r, status: getApplicantDisplayStatus(nextRaw), __raw: nextRaw } as InfluencerRow;
          return doesApplicantBelongToTab(nextRaw, tab) ? [nextRow] : [];
        })
      );

      const targetTab = actionToTab[action];
      if (targetTab) router.push(`/brand/influ/${targetTab}?campaignId=${campaignId}`);
    } catch (e) {
      alert(getApiErrorMessage(e, "Failed to update applicant status"));
    } finally {
      setUpdatingDecisionId(null);
    }
  };

  const handleViewContractPdf = useCallback(
    async (row: InfluencerRow) => {
      const meta = contractMetaMap[row.id] ?? null;
      const contractLookupId = String(meta?.contractId || meta?._id || "").trim();

      if (!contractLookupId) {
        toast({ icon: "error", title: "No contract", text: "No contract document found." });
        return;
      }

      setViewingPdfForId(row.id);
      try {
        const res = await api.post("/contract/viewPdf", { contractId: contractLookupId }, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e: any) {
        toast({
          icon: "error",
          title: "Could not open PDF",
          text: e?.response?.data?.message || e?.message || "Failed to load contract PDF.",
        });
      } finally {
        setViewingPdfForId(null);
      }
    },
    [contractMetaMap]
  );

  const handleBrandAccept = useCallback(
    async (row: InfluencerRow) => {
      const meta = contractMetaMap[row.id] ?? null;
      if (!meta?.contractId) {
        toast({ icon: "error", title: "No contract", text: "Send contract first." });
        return;
      }
      const ok = await askConfirm("Confirm as Brand?", "Once confirmed, the contract moves to signing when the influencer has also accepted.");
      if (!ok) return;

      try {
        await post("/contract/brand/confirm", { contractId: meta.contractId });
        toast({ icon: "success", title: "Brand accepted" });
        await fetchApplicants();
      } catch (e: any) {
        toast({ icon: "error", title: "Confirm failed", text: e?.response?.data?.message || e?.message || "Could not confirm." });
      }
    },
    [contractMetaMap, fetchApplicants]
  );

  const openSignModal = useCallback((meta: ContractMeta | null) => {
    if (!meta?.contractId) {
      toast({ icon: "error", title: "No contract", text: "No contract found." });
      return;
    }
    setSignTargetMeta(meta);
    setSignOpen(true);
  }, []);

  const openContractSidebar = useCallback(
    async (row: InfluencerRow) => {
      const raw = (row as any)?.__raw ?? null;
      if (!raw) return;

      const influencerId = getRawInfluencerId(raw, row.id);
      if (!influencerId) {
        toast({ icon: "error", title: "Influencer not found", text: "Could not identify this influencer." });
        return;
      }

      setOpeningContractForId(row.id);
      try {
        const existingMeta = contractMetaMap[row.id] ?? null;
        const prefill = await fetchSendContractRequirements({
          influencerId,
          paymentType: existingMeta?.content?.campaign?.paymentType
            ? normalizePaymentType(existingMeta.content.campaign.paymentType)
            : undefined,
          mode: "single",
        });

        setContractPrefill(prefill);
        setContractForcedPaymentType(prefill?.paymentType ? normalizePaymentType(prefill.paymentType) : undefined);
        setContractTarget(prefill?.influencer || raw);
        setContractTargetMeta(prefill?.contract || existingMeta);
        setContractOpen(true);
      } catch (e: any) {
        toast({
          icon: "error",
          title: "Could not prepare contract",
          text: e?.response?.data?.message || e?.message || "Required contract fields could not be loaded.",
        });
      } finally {
        setOpeningContractForId(null);
      }
    },
    [contractMetaMap, fetchSendContractRequirements, getRawInfluencerId]
  );

  const handleUseTemplateContract = useCallback(
    (row: InfluencerRow) => {
      const raw = (row as any)?.__raw ?? null;
      if (!raw) return;

      const meta = contractMetaMap[row.id] ?? null;
      const isNewContract = !hasExistingContract(raw, meta);

      if (isNewContract) {
        openSinglePayoutTypeDialog(raw);
        return;
      }

      openContractSidebar(row);
    },
    [contractMetaMap, openSinglePayoutTypeDialog, openContractSidebar]
  );

  const resetOwnContractDialog = useCallback(() => {
    setOwnContractDialogOpen(false);
    setOwnContractTargetRow(null);
    setOwnContractFile(null);
    setOwnContractAcknowledged(false);
    setOwnContractError("");
  }, []);

  const openOwnContractPicker = useCallback(
    (row: InfluencerRow) => {
      if (!brandId || !campaignId) {
        toast({ icon: "error", title: "Missing details", text: "Brand or campaign id is missing." });
        return;
      }

      setOwnContractTargetRow(row);
      setOwnContractFile(null);
      setOwnContractAcknowledged(false);
      setOwnContractError("");
      setOwnContractDialogOpen(true);
    },
    [brandId, campaignId]
  );

  const handleOwnContractDialogFile = useCallback((file: File | null) => {
    setOwnContractError("");

    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setOwnContractFile(null);
      setOwnContractAcknowledged(false);
      setOwnContractError("Please upload a PDF contract.");
      return;
    }

    if (file.size > OWN_CONTRACT_MAX_BYTES) {
      setOwnContractFile(null);
      setOwnContractAcknowledged(false);
      setOwnContractError(`Contract PDF must be ${Math.round(OWN_CONTRACT_MAX_BYTES / (1024 * 1024))} MB or less.`);
      return;
    }

    setOwnContractFile(file);
    setOwnContractAcknowledged(false);
  }, []);

  const handleSendUploadedOwnContract = useCallback(async () => {
    const row = ownContractTargetRow;
    const file = ownContractFile;

    if (!row || !file) {
      setOwnContractError("Please upload a PDF contract first.");
      return;
    }

    if (!ownContractAcknowledged) {
      setOwnContractError("Please accept the CollabGlam Campaign Acknowledgement before sending.");
      return;
    }

    const raw = (row as any)?.__raw ?? {};
    const influencerId = getRawInfluencerId(raw, row.id);

    if (!brandId || !campaignId || !influencerId) {
      setOwnContractError("Brand, campaign, or influencer id is missing.");
      return;
    }

    const meta = contractMetaMap[row.id] ?? null;
    const isResend = Boolean(meta?.contractId && isRejectedMeta(meta));

    try {
      setOwnContractError("");
      setUploadingContractForId(row.id);

      const uploadUrlRes: any = await api.post("/contract/own/upload-url", {
        brandId,
        campaignId,
        influencerId,
        fileName: file.name,
        contentType: "application/pdf",
        sizeBytes: file.size,
      });

      const upload = uploadUrlRes?.data?.upload || uploadUrlRes?.upload;

      if (!upload?.uploadUrl || !upload?.key) {
        throw new Error("Upload URL was not returned.");
      }

      const s3Res = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error("S3 upload failed.");
      }

      const sendRes: any = await api.post("/contract/own/send-uploaded", {
        brandId,
        campaignId,
        influencerId,
        isResend,
        resendOf: isResend ? meta?.contractId : "",
        brandAcknowledgementAccepted: true,
        acknowledgementText: COLLABGLAM_CAMPAIGN_ACKNOWLEDGEMENT_TEXT,
        uploadedContract: {
          key: upload.key,
          bucket: upload.bucket,
          folder: upload.folder,
          originalName: upload.originalName || file.name,
          mimeType: "application/pdf",
          sizeBytes: file.size,
        },
      });

      const payload = sendRes?.data || sendRes || {};
      const uploadedContract = payload.contract || null;

      if (uploadedContract?.contractId) {
        setContractMetaMap((prev) => ({ ...prev, [row.id]: uploadedContract }));
      }

      toast({
        icon: "success",
        title: isResend ? "Contract resent" : "Contract uploaded",
        text: "Own contract and CollabGlam acknowledgement have been sent to the influencer.",
      });

      resetOwnContractDialog();
      await fetchApplicants();
    } catch (err: any) {
      setOwnContractError(
        err?.response?.data?.message ||
        err?.message ||
        "Could not upload own contract."
      );

      toast({
        icon: "error",
        title: "Upload failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Could not upload own contract.",
      });
    } finally {
      setUploadingContractForId(null);
    }
  }, [
    ownContractTargetRow,
    ownContractFile,
    ownContractAcknowledged,
    brandId,
    campaignId,
    contractMetaMap,
    fetchApplicants,
    getRawInfluencerId,
    resetOwnContractDialog,
  ]);


  const handleManage = useCallback(
    async (row: InfluencerRow) => {
      const raw = (row as any)?.__raw ?? {};
      const influencerId = String(raw?.influencerId || row.id || "").trim();
      if (!influencerId) {
        toast({ icon: "error", title: "Influencer not found", text: "Could not identify this influencer." });
        return;
      }

      let contractId = String(
        contractMetaMap[row.id]?.contractId ||
        contractMetaMap[row.id]?._id ||
        raw?.contractId ||
        raw?.contract?._id ||
        raw?.contract?.contractId ||
        ""
      ).trim();

      if (!contractId && raw?.influencerId && brandId && campaignId) {
        try {
          const meta = await getLatestContractForApplicant(raw);
          if (meta) {
            contractId = String(meta?.contractId || meta?._id || "").trim();
            setContractMetaMap((prev) => ({ ...prev, [row.id]: meta }));
          }
        } catch (e) {
          console.error("Failed to fetch contract before manage redirect", e);
        }
      }

      const params = new URLSearchParams();
      params.set("influencerId", influencerId);
      if (campaignId) params.set("campaignId", campaignId);
      if (contractId) params.set("contractId", contractId);

      const targetUrl = `/brand/influencers?${params.toString()}`;
      if (typeof window !== "undefined") {
        window.location.href = targetUrl;
        return;
      }
      router.push(targetUrl);
    },
    [router, campaignId, brandId, contractMetaMap, getLatestContractForApplicant]
  );

  const handleMail = useCallback(
    async (row: InfluencerRow) => {
      const raw = (row as any)?.__raw ?? null;
      const influencerId = raw?.influencerId || row.id;
      const influencerName = raw?.name || row.profile?.name || "Influencer";

      if (!brandId) {
        toast({ icon: "error", title: "Brand not found", text: "Please sign in again." });
        return;
      }
      if (!influencerId) {
        toast({ icon: "error", title: "Influencer not found", text: "Could not identify the influencer for this thread." });
        return;
      }

      try {
        const threadRes = await post<CreateThreadResponse>(`${EMAIL_API_BASE}/threads`, {
          brandId,
          influencerId,
          campaignId: campaignId || undefined,
          subject: campaignTitle || `Conversation with ${influencerName}`,
        });

        const threadId = threadRes?.threadId || null;
        if (!threadId) throw new Error("Thread ID not returned from server.");
        router.push(`/brand/inbox/${threadId}${campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ""}`);
      } catch (e: any) {
        toast({
          icon: "error",
          title: "Inbox open failed",
          text: e?.response?.data?.error || e?.response?.data?.message || e?.message || "Could not create/open the inbox thread.",
        });
      }
    },
    [brandId, router, campaignId, campaignTitle]
  );

  const handleOpenMilestoneModal = useCallback((row: InfluencerRow) => {
    setMilestoneTargetRow(row);
  }, []);

  const handleCloseMilestoneModal = useCallback(() => {
    setMilestoneTargetRow(null);
  }, []);

  const handleMilestoneSubmit = useCallback(async () => {
    if (!milestoneTargetRow) return;
    setMilestoneCreatedMap((prev) => ({ ...prev, [milestoneTargetRow.id]: true }));
    setMilestoneTargetRow(null);
    await fetchApplicants();
  }, [milestoneTargetRow, fetchApplicants]);

  const handleViewMilestone = useCallback(
    (row: InfluencerRow) => {
      if (!campaignId) {
        toast({ icon: "error", title: "Campaign missing", text: "Campaign id not found in URL." });
        return;
      }

      const raw = (row as any)?.__raw ?? {};
      const influencerId = raw?.influencerId || row.id || "";

      if (isAdminCreatedCampaign) {
        router.push(
          `/brand/milestone-history?campaignId=${encodeURIComponent(campaignId)}&influencerId=${encodeURIComponent(influencerId)}&brandId=${encodeURIComponent(brandId || "")}`
        );
        return;
      }

      const meta = contractMetaMap[row.id] ?? null;
      if (!meta?.contractId) {
        toast({ icon: "error", title: "Contract missing", text: "No contract found for this influencer." });
        return;
      }

      router.push(
        `/brand/influ/view-milestone?contractId=${encodeURIComponent(meta.contractId)}&campaignId=${encodeURIComponent(campaignId)}&influencerId=${encodeURIComponent(influencerId)}&brandId=${encodeURIComponent(brandId || "")}`
      );
    },
    [campaignId, brandId, contractMetaMap, router, isAdminCreatedCampaign]
  );

  const getRowInfluencerId = useCallback((row: InfluencerRow) => {
    const raw = (row as any)?.__raw ?? {};
    return String(raw?.influencerId || raw?.influencer?._id || raw?.influencer?.id || row.id || "").trim();
  }, []);

  const buildCampaignFeedbackPayload = useCallback(
    (row: InfluencerRow): CampaignFeedbackPayload | null => {
      const influencerId = getRowInfluencerId(row);
      if (!campaignId || !brandId || !influencerId) return null;
      return { campaignId, brandId, influencerId };
    },
    [campaignId, brandId, getRowInfluencerId]
  );

  const isCampaignFeedbackActiveRow = useCallback((row: InfluencerRow) => {
    const raw = (row as any)?.__raw ?? {};
    return doesApplicantBelongToTab(raw, "active");
  }, []);

  const checkCampaignFeedbackState = useCallback(
    async (row: InfluencerRow) => {
      const payload = buildCampaignFeedbackPayload(row);
      if (!payload) return false;
      try {
        const res = await post<any>("/campaign-reviews/brand/prompt-state", payload);
        const result = res?.data ?? res;
        const state = (result?.data ?? result ?? {}) as CampaignFeedbackPromptState;
        return shouldShowCampaignFeedbackButton(state);
      } catch {
        return false;
      }
    },
    [buildCampaignFeedbackPayload]
  );

  const openCampaignFeedbackModal = useCallback(
    async (row: InfluencerRow) => {
      const shouldPrompt = campaignFeedbackPromptMap[row.id] ?? (await checkCampaignFeedbackState(row));
      if (!shouldPrompt) {
        toast({ icon: "info", title: "Feedback not available yet", text: "Send Feedback will appear after the first feedback prompt is closed or skipped." });
        setCampaignFeedbackPromptMap((prev) => ({ ...prev, [row.id]: false }));
        return;
      }
      setCampaignFeedbackTarget(row);
    },
    [campaignFeedbackPromptMap, checkCampaignFeedbackState]
  );

  useEffect(() => {
    if (!campaignId || !brandId || visibleRows.length === 0) return;
    let cancelled = false;
    const rowsToCheck = visibleRows.filter(isCampaignFeedbackActiveRow);
    if (rowsToCheck.length === 0) return;

    async function run() {
      const results = await Promise.all(
        rowsToCheck.map(async (row) => {
          const shouldPrompt = await checkCampaignFeedbackState(row);
          return [row.id, shouldPrompt] as const;
        })
      );
      if (cancelled) return;
      setCampaignFeedbackPromptMap((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    }

    void run();
    return () => { cancelled = true; };
  }, [campaignId, brandId, visibleRows, isCampaignFeedbackActiveRow, checkCampaignFeedbackState, campaignFeedbackRefreshKey]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      setVisibleCount((c) => Math.min(applicantRows.length, c + PAGE_LIMIT));
    } finally {
      setLoadingMore(false);
    }
  };

  const loading = loadingApplicants;
  const err = errApplicants;
  const showLoadMore = !loading && !err && visibleRows.length > 0 && hasMore;

  const renderAllTabActions = useCallback(
    (row: InfluencerRow) => {
      const raw = (row as any)?.__raw ?? {};
      const meta = contractMetaMap[row.id] ?? null;

      const isShortlisted = Number(raw?.isShortlisted) === 1;
      const isUndicided = Number(raw?.isUndicided) === 1;
      const isRejected = Number(raw?.isRejected) === 1;
      const isActive = Number(raw?.isAccepted) === 1;
      const hasDecision = isShortlisted || isUndicided || isRejected || isActive;

      if (!hasExistingContract(raw, meta) && !hasDecision) return null;

      if (!hasExistingContract(raw, meta) && isUndicided) {
        return (
          <ActionGroup
            onReject={() => handleApplicantDecision(row, "isRejected")}
            onUndecided={undefined}
            onSelect={() => handleApplicantDecision(row, "isShortlisted")}
            disabledButtons={{ undecided: true }}
          />
        );
      }

      if (!hasExistingContract(raw, meta) && isRejected) {
        return (
          <ActionGroup
            onReject={undefined}
            onUndecided={() => handleApplicantDecision(row, "isUndicided")}
            onSelect={() => handleApplicantDecision(row, "isShortlisted")}
            disabledButtons={{ reject: true }}
          />
        );
      }

      const statusStr = String(meta?.status || "");
      const showAccept = needsBrandAcceptance(statusStr);
      const showSign = canSignNow(meta);
      const showViewMilestone = milestoneCreatedMap[row.id] || hasMilestonesCreated(meta);
      const isLoading = viewingPdfForId === row.id || openingContractForId === row.id;
      const { label: primaryLabel, viewOnly } = getPrimaryAction(raw, meta);

      if (isActive) {
        return (
          <ActiveMilestoneActions
            onAddMilestone={() => handleOpenMilestoneModal(row)}
            showViewMilestone={showViewMilestone}
            onViewMilestone={() => handleViewMilestone(row)}
            showSendFeedback={campaignFeedbackPromptMap[row.id] === true}
            onSendFeedback={() => openCampaignFeedbackModal(row)}
            onManage={() => handleManage(row)}
            onMail={() => handleMail(row)}
            moreMenu={
              <InfluencerContextMenu
                type="active"
                onViewProfile={() => handleManage(row)}
                onCopyProfileLink={() => console.log("copy profile link", row.id)}
                onAddMilestone={() => handleOpenMilestoneModal(row)}
                onAssignDeliverables={() => console.log("assign deliverables", row.id)}
                onSaveToHub={(hubId) => console.log("save to hub", row.id, hubId)}
                onMoveToWorkspace={(workspaceId) => console.log("move to workspace", row.id, workspaceId)}
                onRaiseDispute={() => console.log("raise dispute", row.id)}
                onDelete={() => console.log("remove", row.id)}
              />
            }
            showAccept={showAccept}
            onAccept={() => openContractSidebar(row)}
            showSign={showSign}
            onSign={() => openSignModal(meta)}
            showViewContract={hasExistingContract(raw, meta)}
            onViewContract={() => handleViewContractPdf(row)}
          />
        );
      }

      return (
        <ActionButtons
          primaryLabel={
            uploadingContractForId === row.id
              ? "Uploading…"
              : isLoading && viewOnly
                ? "Opening…"
                : primaryLabel
          }
          contractChoiceMode={!viewOnly && (primaryLabel === "Send Contract" || primaryLabel === "Resend Contract")}
          onUseTemplate={() => handleUseTemplateContract(row)}
          onUploadOwnContract={() => openOwnContractPicker(row)}
          onPrimary={() => (viewOnly ? handleViewContractPdf(row) : openContractSidebar(row))}
          onManage={() => handleManage(row)}
          onMail={() => handleMail(row)}
          moreMenu={
            <InfluencerContextMenu
              type="shortlisted"
              onViewProfile={() => handleManage(row)}
              onCopyProfileLink={() => console.log("copy profile link", row.id)}
              onSaveToHub={(hubId) => console.log("save to hub", row.id, hubId)}
              onMoveToWorkspace={(workspaceId) => console.log("move to workspace", row.id, workspaceId)}
              onCompare={() => console.log("compare", row.id)}
              onDelete={() => console.log("remove", row.id)}
            />
          }
          showAccept={showAccept}
          onAccept={() => handleBrandAccept(row)}
          showSign={showSign}
          onSign={() => openSignModal(meta)}
          showViewContract={!viewOnly && hasExistingContract(raw, meta)}
          onViewContract={() => handleViewContractPdf(row)}
          isViewContractLoading={viewingPdfForId === row.id}
        />
      );
    },
    [
      contractMetaMap,
      milestoneCreatedMap,
      viewingPdfForId,
      uploadingContractForId,
      openingContractForId,
      handleOpenMilestoneModal,
      handleApplicantDecision,
      handleViewMilestone,
      handleManage,
      handleMail,
      handleViewContractPdf,
      openContractSidebar,
      handleUseTemplateContract,
      openOwnContractPicker,
      handleBrandAccept,
      openSignModal,
      campaignFeedbackPromptMap,
      openCampaignFeedbackModal,
    ]
  );

  return (
    <>
      <OwnContractUploadDialog
        open={ownContractDialogOpen}
        targetName={ownContractTargetRow?.profile?.name || "this creator"}
        file={ownContractFile}
        accepted={ownContractAcknowledged}
        error={ownContractError}
        isSubmitting={Boolean(uploadingContractForId)}
        onClose={resetOwnContractDialog}
        onFileSelected={handleOwnContractDialogFile}
        onClearFile={() => {
          setOwnContractFile(null);
          setOwnContractAcknowledged(false);
          setOwnContractError("");
        }}
        onAcceptedChange={(value) => {
          setOwnContractAcknowledged(value);
          if (value) setOwnContractError("");
        }}
        onSubmit={handleSendUploadedOwnContract}
      />

      <InfluencerFilter
        filters={filters}
        setFilters={setFilters}
        search={search}
        setSearch={setSearch}
        sortValue={sortValue}
        setSortValue={setSortValue}
        hideAdvancedFilters={isFullyManagedMode}
      />

      <div className="mt-[3.5rem] px-3 pb-[2.5rem] md:px-[2rem]">
        <div className="overflow-visible rounded-[0.75rem] bg-white">
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Loading influencers...</div>
          ) : err ? (
            <div className="p-6 text-sm text-red-600">{err}</div>
          ) : (
            <div className="w-full overflow-visible">
              <InfluencerTable
                rows={visibleRows}
                variant={tableVariant}
                onActionClick={handleApplicantDecision}
                selectable
                selectedIds={selectedBulkIds}
                onToggleRow={toggleBulkRow}
                onToggleAll={toggleBulkAllVisible}
                onClearSelection={clearBulkSelection}
                isRowSelectable={(row) => isBulkSelectable(row as InfluencerRow)}
                renderBulkHeader={({ selectedIds, clearSelection }) => (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-[#F2F2F2] px-8 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {selectedIds.length} influencer{selectedIds.length > 1 ? "s" : ""} selected
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={clearSelection}>Clear</Button>
                      <Button onClick={openBulkPayoutTypeDialog}>
                        <PaperPlaneTilt className="mr-2 h-4 w-4" />
                        Bulk Send Contract
                      </Button>
                    </div>
                  </div>
                )}
                renderDefaultActions={renderAllTabActions}
                renderShortlistedActions={(row) => {
                  const meta = contractMetaMap[row.id] ?? null;
                  const raw = (row as any)?.__raw ?? {};
                  const statusStr = String(meta?.status || "");
                  const showAccept = needsBrandAcceptance(statusStr);
                  const showSign = canSignNow(meta);
                  const isLoading = viewingPdfForId === row.id || openingContractForId === row.id;
                  const { label: primaryLabel, viewOnly } = getPrimaryAction(raw, meta);

                  return (
                    <ActionButtons
                      primaryLabel={
                        uploadingContractForId === row.id
                          ? "Uploading…"
                          : isLoading && viewOnly
                            ? "Opening…"
                            : primaryLabel
                      }
                      contractChoiceMode={!viewOnly && (primaryLabel === "Send Contract" || primaryLabel === "Resend Contract")}
                      onUseTemplate={() => handleUseTemplateContract(row)}
                      onUploadOwnContract={() => openOwnContractPicker(row)}
                      onPrimary={() => (viewOnly ? handleViewContractPdf(row) : openContractSidebar(row))}
                      onManage={() => handleManage(row)}
                      onMail={() => handleMail(row)}
                      moreMenu={
                        <InfluencerContextMenu
                          type="shortlisted"
                          onViewProfile={() => handleManage(row)}
                          onCopyProfileLink={() => console.log("copy profile link", row.id)}
                          onSaveToHub={(hubId) => console.log("save to hub", row.id, hubId)}
                          onMoveToWorkspace={(workspaceId) => console.log("move to workspace", row.id, workspaceId)}
                          onCompare={() => console.log("compare", row.id)}
                          onDelete={() => console.log("remove", row.id)}
                        />
                      }
                      showAccept={showAccept}
                      onAccept={() => handleBrandAccept(row)}
                      showSign={showSign}
                      onSign={() => openSignModal(meta)}
                      showViewContract={!viewOnly && hasExistingContract(raw, meta)}
                      onViewContract={() => handleViewContractPdf(row)}
                      isViewContractLoading={viewingPdfForId === row.id}
                    />
                  );
                }}
                renderActiveActions={(row) => {
                  const meta = contractMetaMap[row.id] ?? null;
                  const statusStr = String(meta?.status || "");
                  const showAccept = needsBrandAcceptance(statusStr);
                  const showSign = canSignNow(meta);
                  const showViewMilestone = isAdminCreatedCampaign || milestoneCreatedMap[row.id] || hasMilestonesCreated(meta);

                  return (
                    <ActiveMilestoneActions
                      onAddMilestone={() => handleOpenMilestoneModal(row)}
                      showViewMilestone={showViewMilestone}
                      onViewMilestone={() => handleViewMilestone(row)}
                      showSendFeedback={campaignFeedbackPromptMap[row.id] === true}
                      onSendFeedback={() => openCampaignFeedbackModal(row)}
                      onManage={() => handleManage(row)}
                      onMail={() => handleMail(row)}
                      isAdminCreatedCampaign={isAdminCreatedCampaign}
                      moreMenu={
                        <InfluencerContextMenu
                          type="active"
                          onViewProfile={() => handleManage(row)}
                          onCopyProfileLink={() => console.log("copy profile link", row.id)}
                          onAddMilestone={() => handleOpenMilestoneModal(row)}
                          onAssignDeliverables={() => console.log("assign deliverables", row.id)}
                          onSaveToHub={(hubId) => console.log("save to hub", row.id, hubId)}
                          onMoveToWorkspace={(workspaceId) => console.log("move to workspace", row.id, workspaceId)}
                          onRaiseDispute={() => console.log("raise dispute", row.id)}
                          onDelete={() => console.log("remove", row.id)}
                        />
                      }
                      showAccept={isAdminCreatedCampaign ? false : showAccept}
                      onAccept={() => openContractSidebar(row)}
                      showSign={isAdminCreatedCampaign ? false : showSign}
                      onSign={() => openSignModal(meta)}
                      showViewContract={hasExistingContract((row as any)?.__raw ?? {}, meta)}
                      onViewContract={() => handleViewContractPdf(row)}
                    />
                  );
                }}
                renderStatus={(row) => {
                  const raw = (row as any)?.__raw ?? {};
                  const meta = contractMetaMap[row.id] ?? null;
                  return (
                    <div className="flex min-h-[1.75rem] items-center justify-center rounded-[1.25rem] px-3 bg-[#F9F9F9]">
                      <span className="whitespace-nowrap text-[0.875rem] font-semibold text-[#1A1A1A]">
                        {getProfessionalContractStatusMessage(raw, meta)}
                      </span>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {updatingDecisionId && <div className="px-6 pb-2 text-xs text-gray-500">Updating applicant status...</div>}

          {!loading && !err && loadingContractMeta && visibleRows.length > 0 ? (
            <div className="px-6 pb-2 text-xs text-gray-500">Checking contract status...</div>
          ) : null}

          {showLoadMore && (
            <div className="flex justify-center pb-[2rem] pt-[1.25rem]">
              <Button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex h-[2.0625rem] items-center justify-center gap-[0.5rem] rounded-[0.75rem] bg-[#1A1A1A] px-[0.75rem] text-[#F9F9F9] text-[0.75rem] font-semibold leading-[1.25rem] hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CircleNotch weight="bold" className={`h-[0.875rem] w-[0.875rem] text-white ${loadingMore ? "animate-spin" : ""}`} />
                <span className="flex items-center justify-center px-[0.25rem]">{loadingMore ? "Loading..." : "Load More"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <ContractSidebarExtracted
        open={contractOpen}
        onClose={() => {
          setContractOpen(false);
          setContractTarget(null);
          setContractTargetMeta(null);
          setContractPrefill(null);
          setContractForcedPaymentType(undefined);
        }}
        campaignId={campaignId}
        brandId={brandId}
        influencer={contractTarget}
        initialContract={contractTargetMeta}
        contractPrefill={contractPrefill}
        campaignTitle={contractPrefill?.campaignTitle || campaignTitle}
        campaignBudget={contractPrefill?.campaignBudget ?? campaignBudget}
        campaignTimeline={contractPrefill?.campaignTimeline || campaignTimeline}
        forcedPaymentType={contractForcedPaymentType}
        onSuccess={async () => {
          await fetchApplicants();
        }}
      />

      <ContractSidebarExtracted
        open={bulkSidebarOpen}
        onClose={() => {
          setBulkSidebarOpen(false);
          setBulkTargets([]);
          setBulkInfluencerNames([]);
          setBulkForcedPaymentType(undefined);
          setBulkContractPrefill(null);
          setContractTarget(null);
          setContractTargetMeta(null);
          setSelectedBulkIds([]);
        }}
        campaignId={campaignId}
        brandId={brandId}
        influencer={contractTarget}
        initialContract={null}
        contractPrefill={bulkContractPrefill}
        campaignTitle={bulkContractPrefill?.campaignTitle || campaignTitle}
        campaignBudget={bulkContractPrefill?.campaignBudget ?? campaignBudget}
        campaignTimeline={bulkContractPrefill?.campaignTimeline || campaignTimeline}
        forcedPaymentType={bulkForcedPaymentType}
        mode="bulk"
        bulkInfluencers={bulkTargets}
        onSuccess={async () => {
          await fetchApplicants();
          setSelectedBulkIds([]);
          setBulkTargets([]);
          setBulkInfluencerNames([]);
        }}
      />

      <AddMilestoneCard
        open={Boolean(milestoneTargetRow)}
        onClose={handleCloseMilestoneModal}
        brandId={brandId || ""}
        contractId={contractMetaMap[milestoneTargetRow?.id || ""]?.contractId}
        campaignId={campaignId}
        influencerId={milestoneTargetRow?.id}
        influencerName={milestoneTargetRow?.profile?.name}
        onSubmit={handleMilestoneSubmit}
      />

      <CampaignFeedbackModal
        open={Boolean(campaignFeedbackTarget)}
        onClose={() => setCampaignFeedbackTarget(null)}
        campaignId={campaignId}
        brandId={brandId || ""}
        influencerId={campaignFeedbackTarget ? getRowInfluencerId(campaignFeedbackTarget) : ""}
        influencerName={campaignFeedbackTarget?.profile?.name || "the creator"}
        campaignName={campaignTitle || "the campaign"}
        onSubmitted={() => {
          if (campaignFeedbackTarget?.id) {
            setCampaignFeedbackPromptMap((prev) => ({ ...prev, [campaignFeedbackTarget.id]: false }));
          }
          setCampaignFeedbackTarget(null);
          setCampaignFeedbackRefreshKey((value) => value + 1);
          toast({ icon: "success", title: "Feedback submitted", text: "Campaign feedback has been submitted successfully." });
        }}
      />

      <SignatureModal
        isOpen={signOpen}
        onClose={() => { setSignOpen(false); setSignTargetMeta(null); }}
        onSigned={async (sigDataUrl) => {
          if (!signTargetMeta?.contractId) return;
          try {
            await post("/contract/sign", {
              contractId: signTargetMeta.contractId,
              role: "brand",
              name: signerName,
              email: signerEmail,
              signatureImageDataUrl: sigDataUrl,
            });
            toast({ icon: "success", title: "Signed", text: "Signature recorded." });
            setSignOpen(false);
            setSignTargetMeta(null);
            await fetchApplicants();
          } catch (e: any) {
            toast({ icon: "error", title: "Sign failed", text: e?.response?.data?.message || e?.message || "Could not sign contract." });
          }
        }}
      />

      <Dialog open={isPayoutTypeDialogOpen} onOpenChange={setIsPayoutTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select campaign payout type</DialogTitle>
            <DialogDescription>
              Choose how this campaign will be structured for the selected influencer{payoutDialogMode === "bulk" ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSelectPayoutType(PAYMENT_TYPE.FIXED)}
              className="rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50"
            >
              <div className="text-sm font-semibold text-gray-900">Fixed</div>
              <div className="mt-1 text-sm text-gray-500">One fixed payout amount for the entire campaign.</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPayoutType(PAYMENT_TYPE.MILESTONE)}
              className="rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50"
            >
              <div className="text-sm font-semibold text-gray-900">Milestone</div>
              <div className="mt-1 text-sm text-gray-500">Payment is released in stages based on deliverables.</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
