"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Eye } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  CaretDown,
  CaretUp,
  DownloadSimpleIcon,
  InfoIcon,
  Signature,
  UploadSimple,
} from "@phosphor-icons/react";
import api, { post } from "@/lib/api";
import InfluencerSidebarShell from "./InfluencerSidebarShell";
import InfluencerSignatureModal from "./InfluencerSignatureModal";
import {
  apiGetPrimaryInfluencerSignature,
  apiListInfluencerSignatures,
  apiSetPrimaryInfluencerSignature,
  type InfluencerSignatureAsset,
} from "../../services/influencerSignatureApi";
import { FloatingInput } from "@/components/ui/floatingInput";
import { LabeledTextarea } from "@/components/ui/textAreaComp";

/* ─────────────────────────── Toast / Confirm ─────────────────────────── */

const toast = (opts: {
  icon: "success" | "error" | "info";
  title: string;
  text?: string;
}) =>
  Swal.fire({
    ...opts,
    showConfirmButton: false,
    timer: 1600,
    timerProgressBar: true,
    background: "white",
    customClass: { popup: "rounded-lg border border-gray-200" },
  });


function apiMessage(e: any, fallback = "Something went wrong") {
  const status = e?.response?.status;
  const msg = e?.response?.data?.message || e?.message;

  const known = [
    "Contract is locked and cannot be edited",
    "Contract is locked for signing; edits are disabled",
    "Influencer must accept the current version first",
    "Brand must accept the current version first",
    "Both parties must accept the current version before signing",
    "Contract is not ready to sign yet",
    "Contract not found",
    "Signature file must be 5 MB or less.",
    "Cannot resend a signed/locked contract",
  ];

  if (msg && known.some((k) => String(msg).includes(k))) return msg;
  if (status === 400) return msg || "Bad request.";
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 409) return msg || "Conflict. Please refresh.";
  if (status === 422) return msg || "Validation error.";
  if (status >= 500) return "Server error. Please try again.";
  return msg || fallback;
}

/* ─────────────────────────────── Types ─────────────────────────────── */

type CampaignImage = {
  name?: string;
  type?: string;
  size?: number;
  dataUrl?: string;
  url?: string;
};

interface CampaignData {
  id: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  daysLeft: number;
  match: number;
  category: string;
  platform: string;
  location: string;
  status: string;
  campaignStatus: string;
  brandId: string;
  brandName: string;
  productOrServiceName: string;
  timeline: { startDate: string; endDate: string };
  isActive: number;
  budget: number;
  influencerBudget?: number;
  isApproved: number;
  isContracted: number;
  contractId: string;
  contractMongoId?: string;
  isAccepted: number;
  hasApplied: number;
  hasMilestone: number;
  productImages: CampaignImage[];
  campaignType?: string;
  paymentType?: string;
  laneType?: string;
  targetCountry?: string;
  targetCountryValues?: string[];
  targetCountries?: any[];
  campaignGoalValues?: string[];
  targetAgeGroupValues?: string[];
  applicationStatus?: string;
  feeAmount?: number;
  contractStatus?: string | null;
}

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

type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

type PartyConfirm = {
  confirmed?: boolean;
  byUserId?: string;
  at?: string;
};

type PartyAcceptance = {
  accepted?: boolean;
  acceptedVersion?: number;
  at?: string;
  byUserId?: string;
};

type PartySign = {
  signed?: boolean;
  byUserId?: string;
  name?: string;
  email?: string;
  at?: string;
};

type ContractInfluencerContent = {
  legalName?: string;
  contactName?: string;
  postingHandleUrl?: string;
  email?: string;
  contactEmail?: string;
  proxyEmail?: string;
  phone?: string;
  contactPhone?: string;
  whatsApp?: string;
  taxFormType?: string;
  taxId?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipPostalCode?: string;
  country?: string;
  ftcAcknowledgement?: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToPhone?: string;
  deliveryNotes?: string;
  notes?: string;
};

type ContractMeta = {
  _id?: string;
  status?: ContractStatus | string;
  confirmations?: { brand?: PartyConfirm; influencer?: PartyConfirm };
  acceptances?: { brand?: PartyAcceptance; influencer?: PartyAcceptance };
  signatures?: {
    brand?: PartySign;
    influencer?: PartySign;
    collabglam?: PartySign;
  };
  lockedAt?: string | null;
  editsLockedAt?: string | null;
  awaitingRole?: "brand" | "influencer" | "collabglam" | null | string;
  version?: number;
  campaignId?: string;
  influencerId?: string;
  contractId?: string;
  supersededBy?: string | null;
  resendOf?: string | null;
  resendIteration?: number;
  content?: {
    influencer?: ContractInfluencerContent;
    campaign?: {
      campaignTitleOrId?: string;
      productsServicesCovered?: string;
      paymentType?: string;
    };
  };
};

type LocalInfluencer = {
  legalName: string;
  contactName: string;
  postingHandleUrl: string;
  contactEmail: string;
  proxyEmail: string;
  contactPhone: string;
  whatsApp: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  ftcAcknowledgement: string;
  shipToName: string;
  shipToAddress: string;
  shipToPhone: string;
  deliveryNotes: string;
  payoutMethod: string;
  payoutAccount: string;
  taxFormType: string;
  taxId: string;
  notes: string;
};

const emptyLocal: LocalInfluencer = {
  legalName: "",
  contactName: "",
  postingHandleUrl: "",
  contactEmail: "",
  proxyEmail: "",
  contactPhone: "",
  taxFormType: "",
  taxId: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  whatsApp: "",
  ftcAcknowledgement:
    "Both Parties must comply with applicable endorsement, advertising, and platform requirements. Influencer may not publish false, misleading, unsafe, or unsubstantiated claims",
  shipToName: "",
  shipToAddress: "",
  shipToPhone: "",
  deliveryNotes: "",
  payoutMethod: "",
  payoutAccount: "",
  notes: "",
};

type CreatorContractTerms = {
  effectiveDate: string;
  targetCountry: string;
  timezone: string;
  includedRevisionRounds: string;
  additionalRevisionFee: string;
  reshootNoBriefFailure: boolean;
  reshootOneIncluded: boolean;
  paidReshoot: boolean;
  draftDate: string;
  reshootFee: string;
  reshootObligationRequired: "" | "yes" | "no";
  preShootScriptRequired: "" | "yes" | "no";
  preShootScriptDue: string;
  preShootScriptReviewBusinessDays: string;
  totalFees: string;
  currency: string;
  wantAdvancePayment: boolean;
  advancePaymentAmount: string;
  advancePaymentType: string;
  laneAMarketplaceFeeNote: string;
  shipToName: string;
  shipToPhone: string;
  shipToAddress: string;
  productReceiptConfirmationDeadline: string;
  sameAsAbove: boolean;
  productReturnable: string;
  productShipmentRequired: boolean;
};

const emptyCreatorTerms: CreatorContractTerms = {
  effectiveDate: "",
  targetCountry: "USA",
  timezone: "UTC+05:30 India",
  includedRevisionRounds: "0",
  additionalRevisionFee: "",
  reshootNoBriefFailure: true,
  reshootOneIncluded: false,
  paidReshoot: false,
  draftDate: "",
  reshootFee: "",
  reshootObligationRequired: "yes",
  preShootScriptRequired: "yes",
  preShootScriptDue: "",
  preShootScriptReviewBusinessDays: "0",
  totalFees: "0",
  currency: "USD",
  wantAdvancePayment: false,
  advancePaymentAmount: "",
  advancePaymentType: "",
  laneAMarketplaceFeeNote:
    "Unless expressly stated otherwise, 10% of the applicable Influencer compensation funded through the Platform is deducted from the Influencer payout and retained by CollabGlam; the Brand-funded campaign amount remains fixed.",
  shipToName: "",
  shipToPhone: "",
  shipToAddress: "",
  productReceiptConfirmationDeadline: "",
  sameAsAbove: false,
  productReturnable: "",
  productShipmentRequired: false,
};




/* ───────────────────────────── Helpers ───────────────────────────── */

const tabs = [
  { value: "all", label: "All" },
  { value: "applied", label: "Applied Campaigns" },
  { value: "active", label: "Active Campaigns" },
  { value: "Contracted", label: "Contracted" },
  { value: "Rejected", label: "Rejected" },
];

const trimStr = (s?: string) => (s || "").trim();
const normStatus = (s?: string) => String(s || "").trim().toUpperCase();

const sanitizeLocal = (p: LocalInfluencer): LocalInfluencer => ({
  legalName: trimStr(p.legalName),
  contactName: trimStr(p.contactName),
  postingHandleUrl: trimStr(p.postingHandleUrl),
  proxyEmail: trimStr(p.proxyEmail),
  contactEmail: trimStr(p.proxyEmail || p.contactEmail),
  contactPhone: trimStr(p.contactPhone),
  whatsApp: trimStr(p.whatsApp),
  address: trimStr(p.address || buildAddressText(p)),
  addressLine1: trimStr(p.addressLine1),
  addressLine2: trimStr(p.addressLine2),
  city: trimStr(p.city),
  state: trimStr(p.state),
  zip: trimStr(p.zip),
  country: trimStr(p.country),
  ftcAcknowledgement: trimStr(p.ftcAcknowledgement),
  shipToName: trimStr(p.shipToName),
  shipToAddress: trimStr(p.shipToAddress),
  shipToPhone: trimStr(p.shipToPhone),
  deliveryNotes: trimStr(p.deliveryNotes),
  payoutMethod: trimStr(p.payoutMethod),
  payoutAccount: trimStr(p.payoutAccount),
  taxFormType: trimStr(p.taxFormType),
  taxId: trimStr(p.taxId),
  notes: trimStr(p.notes),
});

const toContractInfluencerPayload = (
  p: LocalInfluencer
): ContractInfluencerContent => ({
  legalName: p.legalName,
  postingHandleUrl: p.postingHandleUrl,
  proxyEmail: p.proxyEmail,
  contactEmail: p.proxyEmail,
  email: p.proxyEmail,
  address: p.address || buildAddressText(p),
});

function hasAcceptedCurrent(
  meta: ContractMeta | null | undefined,
  role: "brand" | "influencer"
) {
  if (!meta) return false;
  const version = Number(meta.version || 0);
  const acceptance = meta.acceptances?.[role];
  return !!(
    acceptance?.accepted && Number(acceptance.acceptedVersion || 0) === version
  );
}

function isReadyToSignMeta(meta?: ContractMeta | null) {
  const st = normStatus(meta?.status);
  return st === CONTRACT_STATUS.READY_TO_SIGN || !!meta?.editsLockedAt;
}

function isLockedMeta(meta?: ContractMeta | null) {
  const st = normStatus(meta?.status);
  return (
    !!meta?.lockedAt ||
    st === CONTRACT_STATUS.CONTRACT_SIGNED ||
    st === CONTRACT_STATUS.MILESTONES_CREATED
  );
}

function isRejectedMeta(meta?: ContractMeta | null) {
  return normStatus(meta?.status) === CONTRACT_STATUS.REJECTED;
}

function isSupersededMeta(meta?: ContractMeta | null) {
  return normStatus(meta?.status) === CONTRACT_STATUS.SUPERSEDED;
}

function signingStatusLabel(meta?: ContractMeta | null) {
  if (!meta) return null;

  const st = normStatus(meta.status);
  if (st === CONTRACT_STATUS.MILESTONES_CREATED) return "Milestone Added";
  if (st === CONTRACT_STATUS.CONTRACT_SIGNED)
    return "Awaiting Milestone Creation";

  const isSigningPhase = isReadyToSignMeta(meta);
  if (!isSigningPhase) return null;

  const brandSigned = !!meta.signatures?.brand?.signed;
  const influencerSigned = !!meta.signatures?.influencer?.signed;
  const awaiting = String(meta.awaitingRole || "").toLowerCase();

  if (brandSigned && influencerSigned) return "Signed";
  if (awaiting === "brand") return "Awaiting brand signature";
  if (awaiting === "influencer") return "Awaiting influencer signature";
  if (awaiting === "collabglam") return "Awaiting CollabGlam";
  if (!brandSigned && !influencerSigned) return "Ready to sign";
  if (brandSigned && !influencerSigned) return "Awaiting influencer signature";
  if (!brandSigned && influencerSigned) return "Awaiting brand signature";
  return null;
}

function computeDaysLeft(endAt?: string) {
  if (!endAt) return 0;
  const end = new Date(endAt);
  const now = new Date();
  return Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function getFirstString(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function getCountryNameFromObject(item: any) {
  if (!item) return "";

  if (typeof item === "string") {
    return item.trim();
  }

  return getFirstString(
    item.countryNameEn,
    item.countryName,
    item.name,
    item.countryNameLocal,
    item.countryCode,
    item.label,
    item.value
  );
}

function joinCountryNames(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (!Array.isArray(value)) return "";

  return value
    .map((item) => getCountryNameFromObject(item))
    .filter(Boolean)
    .join(", ");
}

function mapApiCampaign(c: any): CampaignData {
  const campaignDoc = c?.campaign || c?.campaignData || c || {};
  const isDirectContractDoc = Boolean(
    c?.influencerId &&
    c?.campaignId &&
    (c?.contractId || c?._id) &&
    !c?.campaignTitle &&
    !c?.campaignName
  );

  const contractMongoId = getFirstString(
    c?.contractMongoId,
    c?.contract?._id,
    c?.contracts?._id,
    isDirectContractDoc ? c?._id : ""
  );

  const resolvedContractId = getFirstString(
    contractMongoId,
    c?.contractId,
    c?.contract?.contractId,
    c?.contracts?.contractId
  );

  const platforms: string[] = Array.isArray(campaignDoc.platformSelection)
    ? campaignDoc.platformSelection
    : Array.isArray(c.platformSelection)
      ? c.platformSelection
      : [];

  const normPlatform = (p: string) =>
    p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";

  const title = getFirstString(
    campaignDoc.campaignTitle,
    campaignDoc.campaignName,
    campaignDoc.name,
    campaignDoc.productOrServiceName,
    c?.content?.campaign?.campaignTitleOrId
  );

  const category = getFirstString(
    campaignDoc.campaignCategory,
    campaignDoc.categoryName,
    campaignDoc.details?.category?.name,
    Array.isArray(campaignDoc.categories) && campaignDoc.categories.length > 0
      ? campaignDoc.categories[0]?.subcategoryName ||
      campaignDoc.categories[0]?.categoryName
      : ""
  );

  const startDate = getFirstString(
    campaignDoc.startAt,
    campaignDoc.timeline?.startDate
  );

  const endDate = getFirstString(
    campaignDoc.endAt,
    campaignDoc.timeline?.endDate
  );

  const images: CampaignImage[] = Array.isArray(campaignDoc.productImages)
    ? campaignDoc.productImages
    : Array.isArray(campaignDoc.images)
      ? campaignDoc.images
      : [];

  const countryFromValues = joinCountryNames(campaignDoc.targetCountryValues);
  const countryFromTopObjects = joinCountryNames(campaignDoc.targetCountries);
  const countryFromDetails = joinCountryNames(
    campaignDoc.details?.targetCountries
  );

  const location =
    getFirstString(
      campaignDoc.targetCountry,
      countryFromValues,
      countryFromTopObjects,
      countryFromDetails
    ) || "Remote";

  const id = isDirectContractDoc
    ? getFirstString(c?.campaignId)
    : getFirstString(
      campaignDoc._id,
      campaignDoc.id,
      campaignDoc.campaignId,
      c?.campaignId
    );

  const campaignType = getFirstString(
    campaignDoc.campaignType,
    c?.content?.campaign?.paymentType
  );

  const paymentType = getFirstString(
    campaignDoc.paymentType,
    c?.content?.campaign?.paymentType
  );

  const status = getFirstString(campaignDoc.status, c?.status);
  const campaignStatus = getFirstString(
    campaignDoc.campaignStatus,
    campaignDoc.status,
    c?.status
  );

  return {
    id,
    brandId: getFirstString(campaignDoc.brandId, c?.brandId),
    brandName: getFirstString(campaignDoc.brandName, c?.brandName),
    title,
    productOrServiceName: title,
    description: campaignDoc.description || "",
    budgetMin: Number(campaignDoc.influencerBudget || 0),
    budgetMax: Number(campaignDoc.campaignBudget || campaignDoc.budget || 0),
    budget: Number(campaignDoc.budget || campaignDoc.campaignBudget || 0),
    influencerBudget: Number(campaignDoc.influencerBudget ?? 0),
    daysLeft: computeDaysLeft(endDate),
    match: Number(campaignDoc.match ?? 0),
    category,
    platform: platforms.length > 0 ? normPlatform(platforms[0]) : campaignType,
    location,
    status,
    campaignStatus,
    contractId: resolvedContractId,
    contractMongoId,
    isContracted: Number(
      campaignDoc.isContracted ?? (resolvedContractId ? 1 : 0)
    ),
    campaignGoalValues: Array.isArray(campaignDoc.campaignGoalValues)
      ? campaignDoc.campaignGoalValues.filter(Boolean)
      : Array.isArray(campaignDoc.details?.campaignGoals)
        ? campaignDoc.details.campaignGoals
          .map((x: any) => x?.goal || x?.name || x?.label || "")
          .filter(Boolean)
        : [],

    targetAgeGroupValues: Array.isArray(campaignDoc.targetAgeGroupValues)
      ? campaignDoc.targetAgeGroupValues.filter(Boolean)
      : Array.isArray(campaignDoc.details?.targetAgeRanges)
        ? campaignDoc.details.targetAgeRanges
          .map((x: any) => x?.range || x?.name || x?.label || "")
          .filter(Boolean)
        : [],

    isAccepted: Number(campaignDoc.isAccepted ?? c?.isAccepted ?? 0),
    hasApplied: Number(campaignDoc.hasApplied ?? c?.hasApplied ?? 1),
    hasMilestone: Number(campaignDoc.hasMilestone ?? c?.hasMilestone ?? 0),
    productImages: images,
    timeline: { startDate, endDate },
    isActive: Number(campaignDoc.isActive ?? 1),
    isApproved: Number(
      campaignDoc.isApproved ?? campaignDoc.hasApproved ?? c?.hasApproved ?? 1
    ),
    campaignType,
    paymentType,
    laneType: campaignDoc.laneType,
    targetCountry: location,
    targetCountryValues: Array.isArray(campaignDoc.targetCountryValues)
      ? campaignDoc.targetCountryValues
      : location !== "Remote"
        ? [location]
        : [],
    targetCountries: Array.isArray(campaignDoc.targetCountries)
      ? campaignDoc.targetCountries
      : Array.isArray(campaignDoc.details?.targetCountries)
        ? campaignDoc.details.targetCountries
        : [],
    applicationStatus: campaignDoc.applicationStatus,
    feeAmount: Number(campaignDoc.feeAmount ?? c?.feeAmount ?? 0),
    contractStatus: campaignDoc.contractStatus ?? c?.contractStatus ?? null,
  };
}

function campaignToPreview(campaign: CampaignData) {
  const targetCountries =
    Array.isArray(campaign.targetCountryValues) &&
      campaign.targetCountryValues.length > 0
      ? campaign.targetCountryValues
      : campaign.location && campaign.location !== "Remote"
        ? [campaign.location]
        : [];

  const targetAgeGroups =
    Array.isArray(campaign.targetAgeGroupValues) &&
      campaign.targetAgeGroupValues.length > 0
      ? campaign.targetAgeGroupValues
      : [];

  const goals =
    Array.isArray(campaign.campaignGoalValues) &&
      campaign.campaignGoalValues.length > 0
      ? campaign.campaignGoalValues
      : [];

  return {
    form: {
      title: campaign.title,
      description: campaign.description,
      categoryName: campaign.category,
      targetCountry: targetCountries,
      targetAgeGroups,
      goals,
      campaignBudget: campaign.budgetMax,
      productImages: campaign.productImages,
    },
    meta: {
      countryMap: targetCountries.reduce<Record<string, string>>((acc, item) => {
        acc[item] = item;
        return acc;
      }, {}),
      ageMap: targetAgeGroups.reduce<Record<string, string>>((acc, item) => {
        acc[item] = item;
        return acc;
      }, {}),
      goalsMap: goals.reduce<Record<string, string>>((acc, item) => {
        acc[item] = item;
        return acc;
      }, {}),
      campaignBudget: campaign.budgetMax,
    },
  };
}

function toContractMeta(doc: any): ContractMeta {
  return {
    _id: doc?._id,
    status: doc?.status,
    confirmations: doc?.confirmations || {},
    acceptances: doc?.acceptances || {},
    signatures: doc?.signatures || {},
    lockedAt: doc?.lockedAt,
    editsLockedAt: doc?.editsLockedAt,
    awaitingRole: doc?.awaitingRole,
    version: doc?.version,
    campaignId: doc?.campaignId,
    influencerId: doc?.influencerId,
    contractId: doc?.contractId,
    supersededBy: doc?.supersededBy,
    resendOf: doc?.resendOf || null,
    resendIteration: doc?.resendIteration,
    content: doc?.content || {},
  };
}

function pickActiveContract(arr: any[], preferredContractId?: string) {
  const list = Array.isArray(arr) ? [...arr] : [];
  if (!list.length) return null;

  list.sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  let chosen =
    (preferredContractId
      ? list.find(
        (x) =>
          String(x._id) === String(preferredContractId) ||
          String(x.contractId) === String(preferredContractId)
      )
      : null) ||
    list.find((x) => normStatus(x.status) !== CONTRACT_STATUS.SUPERSEDED) ||
    list[0] ||
    null;

  if (chosen?.supersededBy) {
    const child = list.find(
      (x) =>
        String(x._id) === String(chosen.supersededBy) ||
        String(x.contractId) === String(chosen.supersededBy)
    );
    if (child) chosen = child;
  }

  return chosen;
}

/* ───────────────────────── Signature Modal ───────────────────────── */

function SignatureModal({
  open,
  onClose,
  onSubmit,
  title = "Sign Contract",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (signatureDataUrl: string) => Promise<void> | void;
  title?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showAgreeError, setShowAgreeError] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSignatureDataUrl("");
      setFileName("");
      setAgreed(false);
      setShowAgreeError(false);
      setErrorText("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleFile = async (file?: File | null) => {
    if (!file) return;

    const allowedTypes = [
      "image/svg+xml",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorText("Only SVG, PNG, JPG, JPEG, or WEBP signatures are allowed.");
      setSignatureDataUrl("");
      setFileName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorText("Signature must be under 5 MB.");
      setSignatureDataUrl("");
      setFileName("");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setSignatureDataUrl(dataUrl);
    setFileName(file.name);
    setErrorText("");
  };

  const handleSubmit = async () => {
    if (!signatureDataUrl) {
      setErrorText("Please upload a signature before continuing.");
      return;
    }

    if (!agreed) {
      setShowAgreeError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(signatureDataUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[24px] bg-white p-5 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[24px] font-semibold text-[#1A1A1A]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 disabled:opacity-60"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="rounded-[16px] bg-[#F8F8F8] px-4 py-6"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 disabled:opacity-60"
          >
            {signatureDataUrl ? (
              <img
                src={signatureDataUrl}
                alt="Influencer signature"
                className="max-h-[140px] max-w-full object-contain"
              />
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED]">
                  <UploadSimple size={22} />
                </span>

                <div className="text-center">
                  <div className="text-base font-semibold text-[#1A1A1A] underline">
                    Upload signature{" "}
                    <span className="font-normal text-[#9C9C9C] no-underline">
                      or drag and drop
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-[#B8B8B8]">
                    SVG, PNG, JPG under max 5 MB
                  </div>
                </div>
              </>
            )}
          </button>

          {fileName ? (
            <div className="mt-3 truncate text-center text-xs text-[#9C9C9C]">
              {fileName}
            </div>
          ) : null}
        </div>

        <p className="mt-5 text-base text-[#9C9C9C]">
          This contract will be signed using your influencer signature.
        </p>

        <div
          className={`mt-5 overflow-hidden rounded-[14px] border bg-white ${showAgreeError && !agreed ? "border-[#FFE1DF]" : "border-[#E6E6E6]"
            }`}
        >
          <div className="flex items-center gap-4 px-5 py-6">
            <Switch
              checked={agreed}
              onCheckedChange={(checked) => {
                setAgreed(checked === true);
                if (checked) setShowAgreeError(false);
              }}
              className="shrink-0"
            />

            <p className="m-0 flex-1 text-sm font-medium leading-6 text-[#1A1A1A]">
              By signing, I confirm that I have read and therefore agree to all
              contractual terms, which become legally binding.
            </p>
          </div>

          {showAgreeError && !agreed ? (
            <div className="flex items-start gap-3 bg-[#FFF0EF] px-5 py-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F04D3F] text-sm font-bold text-white">
                !
              </span>

              <p className="text-sm font-medium leading-5 text-[#E53935]">
                Please confirm that you agree to all terms before signing.
              </p>
            </div>
          ) : null}
        </div>

        {errorText ? (
          <div className="mt-5 rounded-[12px] bg-[#FFF0EF] px-4 py-3 text-sm font-medium text-[#E53935]">
            {errorText}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !signatureDataUrl}
          >
            {isSubmitting ? "Signing..." : "Sign Contract"}
          </Button>
        </div>
      </div>
    </div>
  );
}


function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function AccordionCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "cg-accordion rounded-[20px] border border-[#E6E6E6] bg-white",
        open ? "cg-accordion--open" : "cg-accordion--closed"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cg-accordion-btn flex w-full items-start gap-4 px-5 py-5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="cg-accordion-title text-xl font-semibold text-[#1A1A1A]">
            {title}
          </div>

          {subtitle ? (
            <div className="cg-accordion-subtitle mt-1 text-sm leading-5 text-[#8A8A8A]">
              {subtitle}
            </div>
          ) : null}
        </div>

        <span className="mt-[6px] shrink-0 text-neutral-900">
          {open ? <CaretUp size={20} /> : <CaretDown size={20} />}
        </span>
      </button>

      {open ? <div className="px-5 pb-5 pt-0">{children}</div> : null}
    </div>
  );
}


function InfluencerSignatureSection({
  signatureSrc,
  hasSignature,
  agreed,
  onAgreeChange,
  showError,
  onManageSignatures,
}: {
  signatureSrc?: string;
  hasSignature: boolean;
  agreed: boolean;
  onAgreeChange: (checked: boolean) => void;
  showError: boolean;
  onManageSignatures: () => void;
}) {
  const shouldShowError = showError && !agreed;

  return (
    <div id="influencer-signature-section" className="space-y-5">
      <div className="rounded-[24px] bg-[#F8F8F8] px-4 pb-5 pt-6">
        <button
          type="button"
          onClick={onManageSignatures}
          className="flex min-h-[130px] w-full items-center justify-center rounded-[20px]"
        >
          {hasSignature ? (
            signatureSrc ? (
              <img
                src={signatureSrc}
                alt="Influencer signature"
                className="max-h-[105px] max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <Signature className="h-16 w-16 text-black" />
                <span className="text-sm text-[#9C9C9C]">
                  Signature on file
                </span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <UploadSimple size={32} />
              <span className="text-sm">
                Click to upload influencer signature
              </span>
            </div>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#9C9C9C]">
            <InfoIcon size={16} />
            <span>
              {hasSignature
                ? "Signature is selected as primary"
                : "No influencer signature selected"}
            </span>
          </div>

          <button
            type="button"
            onClick={onManageSignatures}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1F1F1F]"
          >
            {hasSignature ? "Change signature" : "Add signature"}
            <CaretDown size={16} weight="bold" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[14px] border bg-white",
          shouldShowError ? "border-[#FFE1DF]" : "border-[#E6E6E6]"
        )}
      >
        <div className="flex items-center gap-4 px-5 py-6">
          <Switch
            checked={agreed}
            onCheckedChange={(checked) => onAgreeChange(checked === true)}
            aria-invalid={shouldShowError}
            className="shrink-0"
          />

          <p className="m-0 flex-1 text-sm font-medium leading-6 text-[#1A1A1A]">
            By signing, I confirm that I have read and therefore agree to all
            contractual terms, which become legally binding.
          </p>
        </div>

        {shouldShowError ? (
          <div className="flex items-start gap-3 bg-[#FFF0EF] px-5 py-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F04D3F] text-sm font-bold text-white">
              !
            </span>

            <p className="text-sm font-medium leading-5 text-[#E53935]">
              Please confirm that you agree to all terms before signing.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────── Contract Modal ───────────────────────── */

const getInfluencerId = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("influencerId") || "";
};

const fileToDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getSignaturePreviewFromPayload = (res: any) => {
  return (
    res?.signature ||
    res?.signatureData ||
    res?.signatureDataUrl ||
    res?.signatureUrl ||
    res?.url ||
    res?.signature?.signature ||
    res?.signature?.signatureData ||
    res?.signature?.signatureDataUrl ||
    res?.signature?.signatureUrl ||
    res?.signature?.url ||
    ""
  );
};




function isShipmentRequiredValue(value: any) {
  const text = String(value ?? "").trim().toLowerCase();
  return (
    value === true ||
    value === 1 ||
    [
      "yes",
      "true",
      "1",
      "required",
      "needed",
      "product shipment required",
      "shipment required",
      "shipping required",
    ].includes(text)
  );
}

const buildAddressText = (data: LocalInfluencer) =>
  trimStr((data as any).address) ||
  [data.addressLine1, data.addressLine2, data.city, data.state, data.zip, data.country]
    .filter(Boolean)
    .join(", ");

function createCreatorTermsFromContract(contract: any, fallback: LocalInfluencer): CreatorContractTerms {
  const content = contract?.content || {};
  const shipping = content?.scheduleA?.shipping || {};
  const productShipmentRequired = isShipmentRequiredValue(
    shipping?.productShippingApplicable ??
      shipping?.productShipmentRequired ??
      shipping?.shippingRequired ??
      shipping?.shipmentRequired ??
      shipping?.required
  );

  return {
    ...emptyCreatorTerms,
    productShipmentRequired,
    shipToName: String(shipping?.shipToName || fallback.legalName || fallback.contactName || ""),
    shipToPhone: String(shipping?.shipToPhone || fallback.contactPhone || ""),
    shipToAddress: String(
      shipping?.shipToAddress || buildAddressText(fallback) || fallback.shipToAddress || ""
    ),
    sameAsAbove: false,
  };
}

function buildCreatorContractUpdatePayload(
  local: LocalInfluencer,
  terms: CreatorContractTerms
) {
  const scheduleA: Record<string, any> = {};

  if (terms.productShipmentRequired) {
    scheduleA.shipping = {
      shipToName: terms.shipToName || local.legalName || "",
      shipToPhone: terms.shipToPhone || local.contactPhone || "",
      shipToAddress: terms.sameAsAbove
        ? buildAddressText(local)
        : terms.shipToAddress || "",
    };
  }

  return {
    content: {
      scheduleA,
    },
  };
}

export default function InfluencerContractModal({
  open,
  onClose,
  contractId,
  campaign,
  readOnly = false,
  onAfterAction,
  sidebarOffset = 0,
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  campaign: CampaignData;
  readOnly?: boolean;
  onAfterAction?: () => void;
  sidebarOffset?: number;
}) {
  const [local, setLocal] = useState<LocalInfluencer>(emptyLocal);
  const [creatorTerms, setCreatorTerms] = useState<CreatorContractTerms>(emptyCreatorTerms);
  const [creatorErrors, setCreatorErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const initialPreviewLoadedForRef = useRef("");
  const [isWorking, setIsWorking] = useState(false);
  const [liteLoaded, setLiteLoaded] = useState(false);
  const [effectiveContractId, setEffectiveContractId] =
    useState<string>(contractId);
  const [savedSignatureId, setSavedSignatureId] = useState("");
  const [meta, setMeta] = useState<ContractMeta | null>(null);
  const [showInfluencerSignatureModal, setShowInfluencerSignatureModal] = useState(false);
  const [signatureModalInitialTab, setSignatureModalInitialTab] =
    useState<"upload" | "manage">("upload");
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [signatureAgreeError, setSignatureAgreeError] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LocalInfluencer, string>>
  >({});
  const influencerAccepted = hasAcceptedCurrent(meta, "influencer");
  const brandAccepted = hasAcceptedCurrent(meta, "brand");
  const brandSigned = !!meta?.signatures?.brand?.signed;
  const influencerSigned = !!meta?.signatures?.influencer?.signed;
  const anyoneSigned = brandSigned || influencerSigned;
  const readyToSign = isReadyToSignMeta(meta);
  const locked = isLockedMeta(meta);
  const rejected = isRejectedMeta(meta);
  const superseded = isSupersededMeta(meta);
  const campaignType: "fixed" | "milestone" | "gifting" =
    (campaign as any).campaignType ??
    (campaign as any).paymentType ??
    (campaign as any).laneType ??
    "fixed";
  const router = useRouter();
  const isGifting = campaignType === "gifting";

  const canEdit = useMemo(() => {
    if (readOnly) return false;
    if (locked || readyToSign) return false;
    if (rejected || superseded) return false;
    if (anyoneSigned) return false;
    return true;
  }, [readOnly, locked, readyToSign, rejected, superseded, anyoneSigned]);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateOptionalInfluencerForm = useCallback(
    (
      data: LocalInfluencer,
      options: { requireRequiredFields?: boolean } = {}
    ) => {
      const v = sanitizeLocal(data);
      const errors: Partial<Record<keyof LocalInfluencer, string>> = {};
      const requireRequiredFields = Boolean(options.requireRequiredFields);

      if (requireRequiredFields) {
        if (!v.legalName) {
          errors.legalName = "Influencer legal name is required.";
        }

        if (!v.postingHandleUrl) {
          errors.postingHandleUrl = "Influencer posting handle / profile URL is required.";
        }

        if (!v.proxyEmail) {
          errors.contactEmail = "Influencer proxy email is required.";
        }

        if (!buildAddressText(v)) {
          errors.address = "Influencer billing / legal address is required.";
        }
      }

      if (v.proxyEmail && !emailRegex.test(v.proxyEmail)) {
        errors.contactEmail = "Influencer proxy email is invalid.";
      }

      if (v.postingHandleUrl) {
        const looksLikeUrl =
          /^https?:\/\/.+/i.test(v.postingHandleUrl) ||
          /^www\..+/i.test(v.postingHandleUrl) ||
          /^@?[A-Za-z0-9._-]+$/.test(v.postingHandleUrl);

        if (!looksLikeUrl) {
          errors.postingHandleUrl = "Enter a valid profile URL or handle.";
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized: v,
      };
    },
    []
  );

  const validateCreatorTerms = useCallback((data: CreatorContractTerms) => {
    const errors: Record<string, string> = {};

    if (data.productShipmentRequired) {
      if (!trimStr(data.shipToName)) {
        errors.shipToName = "Ship-To Name is required.";
      }

      if (!trimStr(data.shipToPhone)) {
        errors.shipToPhone = "Ship-To Phone is required.";
      }

      if (!trimStr(data.shipToAddress)) {
        errors.shipToAddress = "Ship-To Address is required.";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, []);

  const cleanupPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setPreviewBlob(null);
  }, []);

  const resolvedInfluencerId = useMemo(
    () =>
      getFirstString(
        getInfluencerId(),
        meta?.influencerId,
        (campaign as any)?.influencerId,
        (campaign as any)?.creatorId
      ),
    [meta?.influencerId, campaign]
  );

  const refreshInfluencerSignature = useCallback(async (): Promise<{
    signatureId: string;
    signatureUrl: string;
  }> => {
    const influencerId = resolvedInfluencerId;

    if (!influencerId) {
      setSavedSignatureId("");
      setSavedSignatureUrl("");
      return { signatureId: "", signatureUrl: "" };
    }

    try {
      const primarySignature = await apiGetPrimaryInfluencerSignature(influencerId);

      if (primarySignature?.signature) {
        setSavedSignatureId(primarySignature._id || "");
        setSavedSignatureUrl(primarySignature.signature || "");

        return {
          signatureId: primarySignature._id || "",
          signatureUrl: primarySignature.signature || "",
        };
      }
    } catch {
      // Primary signature missing. Fallback to active list below.
    }

    try {
      const result = await apiListInfluencerSignatures(influencerId);
      const rows = Array.isArray(result.signatures) ? result.signatures : [];
      const fallbackSignature = rows.find((item) => item.isPrimary) || rows[0] || null;

      if (fallbackSignature?.signature) {
        setSavedSignatureId(fallbackSignature._id || "");
        setSavedSignatureUrl(fallbackSignature.signature || "");

        if (!fallbackSignature.isPrimary && fallbackSignature._id) {
          apiSetPrimaryInfluencerSignature(influencerId, fallbackSignature._id).catch(
            () => undefined
          );
        }

        return {
          signatureId: fallbackSignature._id || "",
          signatureUrl: fallbackSignature.signature || "",
        };
      }
    } catch {
      // Ignore and clear below.
    }

    setSavedSignatureId("");
    setSavedSignatureUrl("");
    return { signatureId: "", signatureUrl: "" };
  }, [resolvedInfluencerId]);

  const openInfluencerSignatureModal = useCallback(
    async (tab: "upload" | "manage" = "upload") => {
      const influencerId = resolvedInfluencerId;

      if (!influencerId) {
        toast({
          icon: "error",
          title: "Missing influencer",
          text: "Influencer ID not found.",
        });
        return;
      }

      setSignatureModalInitialTab(tab);
      setShowInfluencerSignatureModal(true);

      refreshInfluencerSignature().catch(() => undefined);
    },
    [refreshInfluencerSignature, resolvedInfluencerId]
  );

  const handleInfluencerSignatureSelected = useCallback(
    (signature: InfluencerSignatureAsset) => {
      setSavedSignatureId(signature._id || "");
      setSavedSignatureUrl(signature.signature || "");
      setSignatureAgreeError(false);
      setShowInfluencerSignatureModal(false);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    refreshInfluencerSignature().catch(() => undefined);
  }, [open, refreshInfluencerSignature]);

  const hasInfluencerSignature = Boolean(savedSignatureId || savedSignatureUrl);

  const toLocalFromLite = useCallback((lite: any): LocalInfluencer => {
    const primary = (lite?.primaryPlatform || "").toLowerCase();
    const profiles: any[] = Array.isArray(lite?.socialProfiles)
      ? lite.socialProfiles
      : [];

    const match =
      profiles.find((p) => (p?.provider || "").toLowerCase() === primary) ||
      profiles[0] ||
      {};

    const bestName =
      lite?.legalName || lite?.name || match?.fullname || match?.username || "";

    const bestHandle =
      lite?.handle ||
      lite?.profileUrl ||
      match?.profileUrl ||
      match?.username ||
      "";

    return {
      legalName: bestName,
      contactName: bestName,
      postingHandleUrl: bestHandle,
      proxyEmail: lite?.proxyEmail || "",
      contactEmail: lite?.proxyEmail || "",
      contactPhone: lite?.phone || "",
      whatsApp: lite?.whatsapp || "",
      address: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      taxFormType: "",
      taxId: "",
      ftcAcknowledgement: "",
      shipToName: "",
      shipToAddress: "",
      shipToPhone: "",
      deliveryNotes: "",
      payoutMethod: "",
      payoutAccount: "",
      notes: "",
    };
  }, []);

  const fetchInfluencerLite = useCallback(async () => {
    try {
      const influencerId =
        typeof window !== "undefined"
          ? localStorage.getItem("influencerId")
          : null;

      if (!influencerId) throw new Error("No influencer ID.");

      const res = await api.get("/influencer/lite", {
        params: { influencerId },
      });

      const liteLocal = toLocalFromLite(res.data?.influencer || {});

      setLocal((prev) =>
        sanitizeLocal({
          ...prev,
          legalName: prev.legalName || liteLocal.legalName,
          contactName: prev.contactName || liteLocal.contactName,
          postingHandleUrl: prev.postingHandleUrl || liteLocal.postingHandleUrl,
          proxyEmail: prev.proxyEmail || liteLocal.proxyEmail,
          contactEmail: prev.proxyEmail || liteLocal.proxyEmail || prev.contactEmail,
          contactPhone: prev.contactPhone || liteLocal.contactPhone,
          whatsApp: prev.whatsApp || liteLocal.whatsApp,
          taxFormType: prev.taxFormType || liteLocal.taxFormType,
          taxId: prev.taxId || liteLocal.taxId,
        })
      );
    } catch (e: any) {
      console.warn("lite fetch failed", e?.message);
    } finally {
      setLiteLoaded(true);
    }
  }, [toLocalFromLite]);

  const fetchContractMeta = useCallback(async () => {
    try {
      const influencerId =
        typeof window !== "undefined"
          ? localStorage.getItem("influencerId")
          : null;

      if (!influencerId) throw new Error("No influencer ID.");

      const res = await post<{ success?: boolean; contracts: any[] }>(
        "/contract/getContract",
        {
          brandId: campaign.brandId,
          influencerId,
          campaignId: campaign.id,
        }
      );

      const arr = Array.isArray((res as any)?.contracts)
        ? (res as any).contracts
        : [];

      const chosen = pickActiveContract(arr, contractId);

      if (chosen) {
        const nextMeta = toContractMeta(chosen);
        setMeta(nextMeta);
        setEffectiveContractId(nextMeta._id || nextMeta.contractId || contractId);

        const contentInfluencer = chosen?.content?.influencer || {};
        const profileProxyEmail =
          chosen?.other?.influencerProfile?.proxyEmail ||
          contentInfluencer.proxyEmail ||
          contentInfluencer.contactEmail ||
          "";
        setLocal((prev) => {
          const nextLocal = sanitizeLocal({
            ...prev,
            legalName: contentInfluencer.legalName ?? prev.legalName,
            contactName:
              contentInfluencer.contactName ??
              contentInfluencer.legalName ??
              prev.contactName,
            postingHandleUrl:
              contentInfluencer.postingHandleUrl ?? prev.postingHandleUrl,
            proxyEmail: profileProxyEmail || prev.proxyEmail,
            contactEmail: profileProxyEmail || prev.proxyEmail || prev.contactEmail,
            contactPhone:
              contentInfluencer.contactPhone ??
              contentInfluencer.phone ??
              prev.contactPhone,
            whatsApp: contentInfluencer.whatsApp ?? prev.whatsApp,
            address: contentInfluencer.address ?? prev.address,
            addressLine1: contentInfluencer.addressLine1 ?? prev.addressLine1,
            addressLine2: contentInfluencer.addressLine2 ?? prev.addressLine2,
            city: contentInfluencer.city ?? prev.city,
            state: contentInfluencer.state ?? prev.state,
            zip: contentInfluencer.zipPostalCode ?? prev.zip,
            country: contentInfluencer.country ?? prev.country,
            taxFormType: contentInfluencer.taxFormType ?? prev.taxFormType,
            taxId: contentInfluencer.taxId ?? prev.taxId,
            notes: contentInfluencer.notes ?? prev.notes,
            ftcAcknowledgement:
              contentInfluencer.ftcAcknowledgement ?? prev.ftcAcknowledgement,
            shipToName: contentInfluencer.shipToName ?? prev.shipToName,
            shipToAddress: contentInfluencer.shipToAddress ?? prev.shipToAddress,
            shipToPhone: contentInfluencer.shipToPhone ?? prev.shipToPhone,
            deliveryNotes: contentInfluencer.deliveryNotes ?? prev.deliveryNotes,
          });
          setCreatorTerms(createCreatorTermsFromContract(chosen, nextLocal));
          return nextLocal;
        });
      } else {
        setMeta(null);
        setEffectiveContractId(contractId);
        setCreatorTerms(emptyCreatorTerms);
      }
    } catch {
      setMeta(null);
      setEffectiveContractId(contractId);
      setCreatorTerms(emptyCreatorTerms);
    }
  }, [campaign.brandId, campaign.id, contractId]);

  const markViewed = useCallback(async (id: string) => {
    try {
      console.log("markViewed", id);
      await post("/contract/viewed", { contractId: id, role: "influencer" });
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    initialPreviewLoadedForRef.current = "";
    cleanupPreview();

    setFieldErrors({});
    setCreatorErrors({});
    setSignatureAgreeError(false);
    setSignatureChecked(false);

    setLocal(emptyLocal);
    setCreatorTerms(emptyCreatorTerms);
    setLiteLoaded(false);

    async function hydrateModal() {
      await fetchInfluencerLite();
      if (cancelled) return;

      await fetchContractMeta();
      if (cancelled) return;

      await refreshInfluencerSignature().catch(() => undefined);
    }

    hydrateModal();

    return () => {
      cancelled = true;
      cleanupPreview();
    };
  }, [
    open,
    fetchInfluencerLite,
    fetchContractMeta,
    refreshInfluencerSignature,
    cleanupPreview,
  ]);

  useEffect(() => {
    if (!open || !effectiveContractId) return;
    console.log("effectiveContractId", effectiveContractId);
    markViewed(effectiveContractId);
  }, [open, effectiveContractId, markViewed]);

  const loadSavedPreview = useCallback(
    async (silent = true, contractIdOverride?: string) => {
      const id = contractIdOverride || effectiveContractId;
      if (!id) return;

      setIsWorking(true);

      try {
        const res = await api.post(
          "/contract/viewPdf",
          { contractId: id },
          { responseType: "blob" }
        );

        cleanupPreview();

        const blob = res.data as Blob;
        const url = URL.createObjectURL(blob);

        setPreviewBlob(blob);
        setPreviewUrl(url);

        if (!silent) {
          toast({ icon: "info", title: "PDF loaded" });
        }
      } catch (e: any) {
        if (!silent) {
          toast({
            icon: "error",
            title: "Preview Error",
            text: apiMessage(e, "Failed to load PDF."),
          });
        }
      } finally {
        setIsWorking(false);
      }
    },
    [effectiveContractId, cleanupPreview]
  );

  const generatePreview = useCallback(
    async (silent = false) => {
      setIsWorking(true);

      try {
        const sanitized = sanitizeLocal(local);

        const optionalValidation = validateOptionalInfluencerForm(sanitized, {
          requireRequiredFields: true,
        });

        const creatorValidation = validateCreatorTerms(creatorTerms);

        setFieldErrors(optionalValidation.errors);
        setCreatorErrors(creatorValidation.errors);

        if (!optionalValidation.isValid || !creatorValidation.isValid) {
          toast({
            icon: "error",
            title: "Invalid form",
            text: "Please fix the highlighted fields before preview.",
          });
          return;
        }

        const payload = toContractInfluencerPayload(optionalValidation.sanitized);

        const creatorUpdates = buildCreatorContractUpdatePayload(
          optionalValidation.sanitized,
          creatorTerms
        );

        const res = await api.post(
          "/contract/influencer/confirm",
          {
            contractId: effectiveContractId,
            influencer: payload,
            creatorUpdates,
            signatureInfluencer: savedSignatureUrl || "",
            signatureInfluencerId: savedSignatureId || "",
            savedSignatureId: savedSignatureId || "",
            preview: true,
          },
          { responseType: "blob" }
        );

        cleanupPreview();

        const blob = res.data as Blob;
        const url = URL.createObjectURL(blob);

        setPreviewBlob(blob);
        setPreviewUrl(url);

        if (!silent) {
          toast({ icon: "info", title: "Preview updated" });
        }
      } catch (e: any) {
        toast({
          icon: "error",
          title: "Preview Error",
          text: apiMessage(e, "Failed to load PDF."),
        });
        throw e;
      } finally {
        setIsWorking(false);
      }
    },
    [
      effectiveContractId,
      cleanupPreview,
      local,
      creatorTerms,
      savedSignatureUrl,
      savedSignatureId,
      validateOptionalInfluencerForm,
      validateCreatorTerms,
    ]
  );

  useEffect(() => {
    if (!open || !effectiveContractId) return;

    if (initialPreviewLoadedForRef.current === effectiveContractId) return;

    initialPreviewLoadedForRef.current = effectiveContractId;

    // Initial preview should always show saved contract PDF.
    // No validation, no highlighted errors.
    loadSavedPreview(true, effectiveContractId).catch(() => undefined);
  }, [open, effectiveContractId, loadSavedPreview]);

  const handleAcceptWithSignature = async () => {
    if (!hasInfluencerSignature) {
      await openInfluencerSignatureModal();
      return;
    }

    if (!signatureChecked) {
      setSignatureAgreeError(true);

      window.setTimeout(() => {
        document
          .getElementById("influencer-signature-section")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 0);

      return;
    }

    const { isValid, errors, sanitized } = validateOptionalInfluencerForm(local, {
      requireRequiredFields: true,
    });
    const creatorValidation = validateCreatorTerms(creatorTerms);
    setFieldErrors(errors);
    setCreatorErrors(creatorValidation.errors);

    if (!isValid || !creatorValidation.isValid) {
      toast({
        icon: "error",
        title: "Invalid form",
        text: "Please fix the highlighted fields before continuing.",
      });
      return;
    }

    if (isWorking) return;
    setIsWorking(true);

    try {
      const payload = toContractInfluencerPayload(sanitized);
      const creatorUpdates = buildCreatorContractUpdatePayload(sanitized, creatorTerms);

      await post("/contract/influencer/confirm", {
        contractId: effectiveContractId,
        influencer: payload,
        creatorUpdates,
        signatureInfluencer: savedSignatureUrl || savedSignatureId,
        signatureInfluencerId: savedSignatureId,
        savedSignatureId,
      });

      toast({
        icon: "success",
        title: "Accepted & Signed",
        text: "Contract accepted successfully.",
      });

      await fetchContractMeta();
      onAfterAction?.();
      await generatePreview(true);
      onClose();
    } catch (e: any) {
      toast({
        icon: "error",
        title: "Error",
        text: apiMessage(e, "Failed to accept and sign."),
      });
    } finally {
      setIsWorking(false);
    }
  };

  const acceptOrSave = async () => {
    const sanitized = sanitizeLocal(local);
    const creatorValidation = validateCreatorTerms(creatorTerms);
    const optionalValidation = validateOptionalInfluencerForm(local, {
      requireRequiredFields: true,
    });

    setCreatorErrors(creatorValidation.errors);
    setFieldErrors(optionalValidation.errors);

    if (!creatorValidation.isValid || !optionalValidation.isValid) {
      toast({
        icon: "error",
        title: "Invalid form",
        text: "Please fix the highlighted fields before continuing.",
      });
      return;
    }

    if (!hasAcceptedCurrent(meta, "influencer")) {
      if (!hasInfluencerSignature) {
        await openInfluencerSignatureModal();
        return;
      }

      await handleAcceptWithSignature();
      return;
    }

    setIsWorking(true);
    try {
      const payload = toContractInfluencerPayload(sanitized);
      const creatorUpdates = buildCreatorContractUpdatePayload(sanitized, creatorTerms);

      await post("/contract/influencer/update", {
        contractId: effectiveContractId,
        influencerUpdates: {
          content: {
            influencer: payload,
            ...creatorUpdates.content,
          },
        },
      });

      toast({
        icon: "success",
        title: "Saved",
        text: "Your changes were saved.",
      });

      await fetchContractMeta();
      onAfterAction?.();
      await generatePreview(true);
    } catch (e: any) {
      toast({
        icon: "error",
        title: "Error",
        text: apiMessage(e, "Failed to save."),
      });
    } finally {
      setIsWorking(false);
    }
  };

  if (!open) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <InfluencerSidebarShell
        isOpen={open}
        onClose={onClose}
        sidebarOffset={sidebarOffset}
        title={influencerAccepted ? "VIEW CONTRACT" : "ACCEPT CONTRACT"}
        subtitle={`${campaign?.productOrServiceName || "Agreement"} • ${campaign?.brandName || ""}`}
        previewUrl={previewUrl}
        previewBlob={previewBlob}
        pdfOnly={influencerAccepted}
        footer={
          influencerAccepted ? (
            <Button
              variant="secondary"
              className="ml-auto shrink-0 flex items-center gap-2 !border !border-[#E6E6E6] !bg-white"
              onClick={() => {
                if (previewUrl) {
                  const a = document.createElement("a");
                  a.href = previewUrl;
                  a.download = `${campaign?.productOrServiceName || "contract"}.pdf`;
                  a.click();
                } else {
                  generatePreview();
                }
              }}
            >
              <DownloadSimpleIcon />
              <span>Download</span>
            </Button>
          ) : (
            <>
              <div className="mr-auto min-w-0 flex-1 text-xs">
                {locked ? (
                  <span className="text-emerald-600">
                    Locked — all required signatures have been captured.
                  </span>
                ) : (
                  <span className="text-amber-600">
                    Fill details to accept the contract.
                  </span>
                )}
              </div>

              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => generatePreview()}
                disabled={isWorking}
              >
                <Eye className="mr-2 h-5 w-5" />
                Preview
              </Button>

              <Button
                variant="link"
                className="shrink-0"
                onClick={async () => {
                  try {
                    setIsWorking(true);
                    const influencerId = getInfluencerId();
                    const res = await post("/emails/threads", {
                      influencerId,
                      brandId: campaign.brandId,
                      subject: campaign.title,
                    });
                    const threadId =
                      res?.data?.threadId ||
                      res?.threadId ||
                      (res as any)?._id;
                    if (!threadId) throw new Error("No thread ID returned.");
                    router.push(`/influencer/inbox/${threadId}`);
                  } catch (e: any) {
                    toast({
                      icon: "error",
                      title: "Error",
                      text: apiMessage(e, "Failed to open inbox thread."),
                    });
                  } finally {
                    setIsWorking(false);
                  }
                }}
              >
                Request Change
              </Button>

              <Button
                variant="secondary"
                className="shrink-0 flex items-center gap-2 !border !border-[#E6E6E6] !bg-white"
                onClick={() => {
                  if (previewUrl) {
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = `${campaign?.productOrServiceName || "contract"}.pdf`;
                    a.click();
                  } else {
                    generatePreview();
                  }
                }}
              >
                <DownloadSimpleIcon />
                <span>Download</span>
              </Button>

              {!locked && (
                <Button
                  onClick={acceptOrSave}
                  disabled={isWorking || !liteLoaded}
                  className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Accept & Save
                </Button>
              )}
            </>
          )
        }
      >
        {!influencerAccepted && (
          <div className="space-y-5">
            <AccordionCard
              title="Influencer Overview"
              subtitle="Complete only the required legal, notice, address, and profile details." defaultOpen
            >
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <FloatingInput
                  id="influencerLegalName"
                  label="Influencer Legal Name *"
                  value={local.legalName}
                  state={fieldErrors.legalName ? "error" : undefined}
                  errorText={fieldErrors.legalName}
                  onValueChange={(v) =>
                    setLocal((p) => ({ ...p, legalName: v, contactName: v }))
                  }
                />

                <FloatingInput
                  id="influencerPostingHandleUrl"
                  label="Influencer Posting Handle / Profile URL *"
                  value={local.postingHandleUrl}
                  state={fieldErrors.postingHandleUrl ? "error" : undefined}
                  errorText={fieldErrors.postingHandleUrl}
                  onValueChange={(v) =>
                    setLocal((p) => ({ ...p, postingHandleUrl: v }))
                  }
                />

                <FloatingInput
                  id="influencerNoticeEmail"
                  label="Influencer Notice Email / Proxy Email *"
                  type="email"
                  value={local.proxyEmail || local.contactEmail}
                  state={fieldErrors.contactEmail ? "error" : undefined}
                  errorText={fieldErrors.contactEmail}
                  disabled
                  onValueChange={() => undefined}
                />

                <div className="lg:col-span-2">
                  <LabeledTextarea
                    id="influencerBillingLegalAddress"
                    label="Influencer Billing / Legal Address *"
                    value={buildAddressText(local)}
                    onChange={(e) =>
                      setLocal((p) => ({
                        ...p,
                        address: e.target.value,
                        addressLine1: e.target.value,
                        addressLine2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "",
                      }))
                    }
                    rows={3}
                  />
                  {fieldErrors.address ? (
                    <p className="mt-1 text-xs font-medium text-[#E53935]">
                      {fieldErrors.address}
                    </p>
                  ) : null}
                </div>
              </div>
            </AccordionCard>

            {creatorTerms.productShipmentRequired ? (
              <AccordionCard
                title="Product Shipping & Returns"
                subtitle="Required only because the brand marked product shipment as required."
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <FloatingInput
                    id="shipToName"
                    label="Ship-To Name *"
                    value={creatorTerms.shipToName}
                    state={creatorErrors.shipToName ? "error" : undefined}
                    errorText={creatorErrors.shipToName}
                    onValueChange={(v) =>
                      setCreatorTerms((p) => ({ ...p, shipToName: v }))
                    }
                  />

                  <FloatingInput
                    id="shipToPhone"
                    label="Ship-To Phone *"
                    value={creatorTerms.shipToPhone}
                    state={creatorErrors.shipToPhone ? "error" : undefined}
                    errorText={creatorErrors.shipToPhone}
                    onValueChange={(v) =>
                      setCreatorTerms((p) => ({
                        ...p,
                        shipToPhone: v.replace(/[^0-9+]/g, ""),
                      }))
                    }
                  />

                  <div className="lg:col-span-2">
                    <LabeledTextarea
                      id="shipToAddress"
                      label="Ship-To Address *"
                      value={
                        creatorTerms.sameAsAbove
                          ? buildAddressText(local)
                          : creatorTerms.shipToAddress
                      }
                      onChange={(e) =>
                        setCreatorTerms((p) => ({
                          ...p,
                          shipToAddress: e.target.value,
                          sameAsAbove: false,
                        }))
                      }
                      rows={3}
                    />
                    {creatorErrors.shipToAddress ? (
                      <p className="mt-1 text-xs font-medium text-[#E53935]">
                        {creatorErrors.shipToAddress}
                      </p>
                    ) : null}
                  </div>

                  <label className="flex items-center gap-3 text-sm font-medium text-[#8A8A8A]">
                    <input
                      type="checkbox"
                      checked={creatorTerms.sameAsAbove}
                      onChange={(e) => {
                        const isChecked = e.target.checked;

                        setCreatorTerms((p) => ({
                          ...p,
                          sameAsAbove: isChecked,
                          shipToAddress: isChecked ? buildAddressText(local) : p.shipToAddress,
                        }));
                      }}
                      className="h-4 w-4 rounded border-[#E6E6E6]"
                    />
                    Same as billing / legal address
                  </label>
                </div>
              </AccordionCard>
            ) : null}

            <AccordionCard
              title="Signatures"
              subtitle="Select your influencer signature and confirm agreement before accepting this contract."
              defaultOpen
            >
              <InfluencerSignatureSection
                signatureSrc={savedSignatureUrl}
                hasSignature={hasInfluencerSignature}
                agreed={signatureChecked}
                onAgreeChange={(checked) => {
                  setSignatureChecked(checked);
                  if (checked) setSignatureAgreeError(false);
                }}
                showError={signatureAgreeError}
                onManageSignatures={() =>
                  openInfluencerSignatureModal(hasInfluencerSignature ? "manage" : "upload")
                }
              />
            </AccordionCard>
          </div>
        )}
      </InfluencerSidebarShell>

      <InfluencerSignatureModal
        open={showInfluencerSignatureModal}
        influencerId={resolvedInfluencerId}
        initialTab={signatureModalInitialTab}
        selectedSignatureId={savedSignatureId}
        isLoading={false}
        onClose={() => setShowInfluencerSignatureModal(false)}
        onSignatureSelected={handleInfluencerSignatureSelected}
        onSignatureUploaded={refreshInfluencerSignature}
      />
    </TooltipProvider>
  );
}