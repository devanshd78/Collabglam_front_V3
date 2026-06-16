"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import api, { post } from "@/lib/api";
import { Button } from "@/components/ui/buttonComp";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Eye,
  FileText,
  Info,
  ClipboardText,
  PenNib,
  SealCheck,
  Signature,
  DownloadSimpleIcon,
  ArrowSquareInIcon,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import { FloatingInput } from "@/components/ui/floatingInput";
import {
  FloatingMultiSelect,
  FloatingSelect,
  SelectItem,
} from "@/components/ui/selectComp";
import { LabeledTextarea } from "@/components/ui/textAreaComp";
import { FloatingDateInput } from "@/components/ui/date";
import { FloatingTagInput } from "@/components/ui/tagInput";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
// import MinimalPdfPreview from "./MinimalPdfPreview";
import BrandSignatureModal from "./BrandSignatureModal";
import {
  apiGetPrimaryBrandSignature,
  apiListBrandSignatures,
  apiSetPrimaryBrandSignature,
} from "../../services/brandSignatureApi";
import { apiListCountries } from "../../services/brandApi";
import { Switch } from "@/components/ui/switch";

type PaymentType = "fixed_payment" | "milestone_based" | "product_gifting";
type ContractMeta = {
  _id: string;
  contractId: string;
  campaignId: string;
  status?: string;
  requestedEffectiveDate?: string | null;
  requestedEffectiveDateTimezone?: string | null;
  content?: any;
  flags?: Record<string, any>;
  statusFlags?: Record<string, any>;
  resendIteration?: number;
  audit?: Array<{ type?: string; details?: { reason?: string } }>;
};

type ContractMilestone = {
  id: string;
  milestoneId: string;
  milestoneName: string;
  milestoneDescription: string;
  paymentAmount: string;
  triggerEvent: string;
  dueDate: string;
  splitPercent?: string;
  locked?: boolean;
  allowDeliverables?: boolean;
  isSystemGenerated?: boolean;
};

type ScheduleADeliverable = {
  id: string;
  srNo: number;
  milestoneId: string;
  milestoneName: string;
  platform: string;
  handle: string;
  deliverableFormat: string;
  deliverableName: string;
  contentSpecification: string;
  aspectRatio: string;
  qty: string;
  draftRequired: boolean;
  draftDue: string;
  liveDate: string;
  preShootScriptRequired: boolean;
  preShootScriptDue: string;
  preShootScriptReviewBusinessDays: string;
};

type UsageRightsRow = {
  id: string;
  usageRight: string;
  selected: boolean;
  duration: string;
  territoryNotes: string;
};

type ContractFormState = {
  brand: {
    legalName: string;
    contactPersonName: string;
    noticeEmail: string;
    noticePhone: string;
    billingAddress: string;
    brandPoc: string;
    brandPocDesignation: string;
  };
  influencer: {
    legalName: string;
    contactName: string;
    postingHandleUrl: string;
    contactEmail: string;
    contactPhone: string;
    whatsApp: string;
    address: string;
  };
  campaign: {
    productsServicesCovered: string;
    territoryTargetCountry: string;
    territoryTargetCountryIds: string[];
    effectiveDate: string;
    campaignTitleOrId: string;
    paymentType: PaymentType;
  };
  scheduleA: {
    minimumVideoSpecs: string;
    preShootScriptRequired: "" | "yes" | "no";
    preShootScriptDue: string;
    preShootScriptReviewBusinessDays: string;
    mandatoryTagsMentionsLinksCodes: string;
    review: {
      needRevisionRounds: "" | "yes" | "no" | "__select_revision_rounds__";
      includedRevisionRounds: string;
      additionalRevisionFee: string;
      reshootObligation: string;
      reshootFee: string;
      minimumLivePeriod: string;
      customLivePeriod: string;
    };
    commercial: {
      totalCampaignFee: string;
      currency: string;
      paymentStructure: string;
      customSplit: string;
      advancePaymentTrigger: string;
      remainingPaymentTrigger: string;
      paymentProcessorFeesBorneBy: string;
      paymentProcessorFeesNotes: string;
      laneAMarketplaceFeeNote: string;
      milestones: ContractMilestone[];
      influencerBudget: string;
      fixedCustomAdvancePercent: string;
      fixedCustomDeliverablesPercent: string;
    };
    rawFiles: {
      rawSourceFileDelivery: string;
      deliveryDue: string;
      format: string;
      analyticsRequired: string;
      analyticsReportingDeadline: string;
      analyticsReportingItems: string;
    };
    shipping: {
      productShippingApplicable: string;
      productName: string;
      sku: string;
      quantity: string;
      estimatedProductValue: string;
      shipToName: string;
      shipToAddress: string;
      shipToPhone: string;
      productReceiptConfirmationDeadline: string;
      productReturnable: string;
      returnWindowMethod: string;
      returnInstructions: string;
      riskOfLossNotes: string;
    };
    usageRights: {
      rows: UsageRightsRow[];
      attributionRequirement: string;
      attributionText: string;
      editingRights: string;
      musicStockAssetResponsibility: string;
      musicStockAssetLicensingNotes: string;
    };
    compliance: {
      creativeBriefMandatoryTalkingPoints: string;
      restrictedStatements: string;
    };
    exclusivity: {
      competitorBlackout: string;
      categoryCompetitorList: string;
      blackoutPeriod: string;
      optionalMoralsClause: string;
    };
    cancellation: {
      killFeeOrProrata: string;
      killFeeAmount: string;
      proRataTerms: string;
      refundOfUnearnedAdvance: string;
      customRefundTerms: string;
      productRecoveryTerms: string;
    };
    dispute: {
      governingLaw: string;
      disputeResolutionMethod: string;
      disputeVenue: string;
      arbitrationSeat: string;
      disputeResolutionDetails: string;
      attorneysFees: string;
      attorneysFeesTerms: string;
    };
  };
};

type CurrencyOption = { value: string; label: string; meta?: any };
type TzOption = { value: string; label: string; meta?: any };
type ContractCountryOption = {
  id: string;
  name: string;
  label: string;
  code: string;
  raw?: any;
};

const USD_CURRENCY_OPTION: CurrencyOption = {
  value: "USD",
  label: "$ — US Dollar",
  meta: {
    symbol: "$",
    name: "US Dollar",
    symbol_native: "$",
    decimal_digits: 2,
    rounding: 0,
    code: "USD",
    name_plural: "US dollars",
  },
};

type ContractSidebarExtractedProps = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  brandId?: string | null;
  influencer?: any | null;
  campaignTitle?: string;
  campaignBudget?: number | null;
  campaignTimeline?: { startDate?: string | Date; endDate?: string | Date } | null;
  onSuccess?: () => void | Promise<void>;
  initialContract?: ContractMeta | null;
  forcedPaymentType?: PaymentType;
  /** Backend response from /contract/send-requirements.
   * Used to prefill the sidebar with exactly the fields/content required by the docs.
   */
  contractPrefill?: any | null;
  // optional bulk support
  mode?: "single" | "bulk";
  bulkInfluencers?: any[];
};

const DEFAULT_TIMEZONE = "";

const CONTRACT_STATUS = {
  REJECTED: "REJECTED",
} as const;

const PAYMENT_TYPE = {
  FIXED: "fixed_payment",
  MILESTONE: "milestone_based",
  GIFTING: "product_gifting",
} as const;

const PAYMENT_STRUCTURE_DUMMY_VALUE = "__select_payment_structure__";
const REVISION_ROUNDS_DUMMY_VALUE = "__select_revision_rounds__";
const RESHOOT_OBLIGATION_DUMMY_VALUE = "__select_reshoot_obligation__";
const MINIMUM_LIVE_PERIOD_DUMMY_VALUE = "__select_duration__";
const RAW_SOURCE_FILE_DELIVERY_DUMMY_VALUE = "__select_raw_source_file_delivery__";
const ANALYTICS_REQUIRED_DUMMY_VALUE = "__select_analytics_required__";
const PRODUCT_SHIPPING_DUMMY_VALUE = "__select_product_shipping__";
const PRODUCT_RETURNABLE_DUMMY_VALUE = "__select_product_returnable__";
const ATTRIBUTION_REQUIREMENT_DUMMY_VALUE = "__select_attribution_requirement__";
const EDITING_RIGHTS_DUMMY_VALUE = "__select_editing_rights__";
const MUSIC_RESPONSIBILITY_DUMMY_VALUE = "__select_music_responsibility__";
const EXCLUSIVITY_DUMMY_VALUE = "__select_exclusivity__";
const MORALS_CLAUSE_DUMMY_VALUE = "__select_morals_clause__";
const KILL_FEE_DUMMY_VALUE = "__select_kill_fee__";
const REFUND_ADVANCE_DUMMY_VALUE = "__select_refund_advance__";
const PRODUCT_RECOVERY_DUMMY_VALUE = "__select_product_recovery__";
const DISPUTE_METHOD_DUMMY_VALUE = "__select_dispute_method__";
const ATTORNEYS_FEES_DUMMY_VALUE = "__select_attorneys_fees__";

const MORALS_OPTIONS = [
  { value: MORALS_CLAUSE_DUMMY_VALUE, label: "Select Morals Clause" },
  { value: "Not Included", label: "Not Included" },
  { value: "Included", label: "Included" },
];

const EXCLUSIVITY_OPTIONS = [
  { value: EXCLUSIVITY_DUMMY_VALUE, label: "Select Competitor Blackout" },
  { value: "None", label: "None" },
  { value: "Applies", label: "Applies" },
];

const DISPUTE_OPTIONS = [
  { value: DISPUTE_METHOD_DUMMY_VALUE, label: "Select Dispute Resolution Method" },
  { value: "State / Federal Courts", label: "State / Federal Courts" },
  { value: "Arbitration", label: "Arbitration" },
  { value: "Other", label: "Other" },
];

const ATTORNEYS_FEES_OPTIONS = [
  { value: ATTORNEYS_FEES_DUMMY_VALUE, label: "Select Attorneys’ Fees" },
  {
    value: "Prevailing Party Recovers Reasonable Fees & Costs",
    label: "Prevailing Party Recovers Reasonable Fees & Costs",
  },
  { value: "Each Party Bears Own Fees", label: "Each Party Bears Own Fees" },
  { value: "Other", label: "Other" },
];

const KILL_FEE_OPTIONS = [
  { value: KILL_FEE_DUMMY_VALUE, label: "Select Kill Fee / Pro-Rata" },
  { value: "None", label: "None" },
  { value: "Fixed Amount", label: "Fixed Amount" },
  { value: "Pro-Rata Compensation", label: "Pro-Rata Compensation" },
];

const REFUND_OPTIONS = [
  { value: REFUND_ADVANCE_DUMMY_VALUE, label: "Select Refund Option" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Custom", label: "Custom" },
];

const PRODUCT_RECOVERY_OPTIONS = [
  { value: PRODUCT_RECOVERY_DUMMY_VALUE, label: "Select Product Recovery Terms" },
  { value: "Brand Waives Recovery Rights", label: "Brand Waives Recovery Rights" },
  { value: "Product Must Be Returned", label: "Product Must Be Returned" },
  { value: "Custom", label: "Custom" },
];
const RAW_FILE_OPTIONS = [
  { value: RAW_SOURCE_FILE_DELIVERY_DUMMY_VALUE, label: "Select Raw / Source File Delivery" },
  { value: "Not Included", label: "Not Included" },
  { value: "Included", label: "Included" },
];

const ANALYTICS_REQUIRED_OPTIONS = [
  { value: ANALYTICS_REQUIRED_DUMMY_VALUE, label: "Select Analytics Required" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const SHIPPING_APPLICABLE_OPTIONS = [
  { value: PRODUCT_SHIPPING_DUMMY_VALUE, label: "Select Product Shipment" },
  { value: "No Product Shipment Required", label: "No Product Shipment Required" },
  { value: "Product Shipment Required", label: "Product Shipment Required" },
];

const RETURNABLE_OPTIONS = [
  { value: PRODUCT_RETURNABLE_DUMMY_VALUE, label: "Select Product Returnable" },
  { value: "Gift / Keep Product", label: "Gift / Keep Product" },
  { value: "Return Required", label: "Return Required" },
];

const ATTRIBUTION_OPTIONS = [
  { value: ATTRIBUTION_REQUIREMENT_DUMMY_VALUE, label: "Select Attribution Requirement" },
  { value: "Credit Required", label: "Credit Required" },
  { value: "No Attribution Required", label: "No Attribution Required" },
];

const EDITING_RIGHTS_OPTIONS = [
  { value: EDITING_RIGHTS_DUMMY_VALUE, label: "Select Editing Rights" },
  { value: "Cropping / Resizing Only", label: "Cropping / Resizing Only" },
  {
    value: "Brand May Create Cutdowns / Clips For Approved Uses",
    label: "Brand May Create Cutdowns / Clips For Approved Uses",
  },
  { value: "No Edits Without Written Approval", label: "No Edits Without Written Approval" },
];

const MUSIC_RESPONSIBILITY_OPTIONS = [
  { value: MUSIC_RESPONSIBILITY_DUMMY_VALUE, label: "Select Music / Stock Asset Responsibility" },
  {
    value: "Brand Responsible For Separate Commercial Licensing",
    label: "Brand Responsible For Separate Commercial Licensing",
  },
  { value: "Creator Responsible", label: "Creator Responsible" },
  { value: "Custom Responsibility", label: "Custom Responsibility" },
];

const FIXED_PAYMENT_STRUCTURE = {
  UPON_COMPLETION: "100% Upon Completion",
  HALF_ADVANCE_HALF_COMPLETION: "50% Advance + 50% Completion",
  CUSTOM_SPLIT: "Custom Split",
} as const;
const CAMPAIGN_DELIVERABLES_MILESTONE_ID = "campaign-deliverables";
const ADVANCE_PAYMENT_MILESTONE_ID = "advance-payment";
const FTC_ADVERTISING_PLATFORM_COMPLIANCE_NOTE =
  "Both Parties must comply with applicable endorsement, advertising, consumer protection, and platform requirements. The Creator may not publish false, misleading, unsafe, deceptive, or unsubstantiated claims and must include all required sponsorship disclosures in accordance with applicable laws and platform policies.";
const LANE_A_MARKETPLACE_FEE_NOTE =
  "Unless expressly stated otherwise, 10% of the applicable Influencer compensation funded through the Platform is deducted from the Influencer payout and retained by CollabGlam; the Brand-funded campaign amount remains fixed.";

const CONTRACT_TYPE_LABELS: Record<PaymentType, string> = {
  fixed_payment: "Fixed Contract",
  milestone_based: "Milestone Contract",
  product_gifting: "Product Gifting Contract",
};
const YES_NO_BOOL_OPTIONS = [
  { value: REVISION_ROUNDS_DUMMY_VALUE, label: "Select Revision Rounds" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const DELIVERABLE_FORMAT_OPTIONS = [
  { value: "Dedicated Video", label: "Dedicated Video" },
  { value: "Integrated Video", label: "Integrated Video" },
  { value: "Reel", label: "Reel" },
  { value: "Story Set", label: "Story Set" },
  { value: "Static Post", label: "Static Post" },
  { value: "UGC (Raw Files Only)", label: "UGC (Raw Files Only)" },
  { value: "Live Stream", label: "Live Stream" },
];

const DELIVERY_TYPE_OPTIONS = [
  { value: "Reel (video)", label: "Reel (video)" },
  { value: "Story (video)", label: "Story (video)" },
  { value: "Static Post", label: "Static Post" },
  { value: "Dedicated Video", label: "Dedicated Video" },
  { value: "Integrated Video", label: "Integrated Video" },
  { value: "UGC Raw File", label: "UGC Raw File" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "1080×1080", label: "1080×1080" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "4:5", label: "4:5" },
  { value: "1:1", label: "1:1" },
];

const PLATFORM_OPTIONS = [
  { value: "Instagram", label: "Instagram" },
  { value: "YouTube", label: "YouTube" },
  { value: "TikTok", label: "TikTok" },
];

const MINIMUM_LIVE_PERIOD_OPTIONS = [
  { value: MINIMUM_LIVE_PERIOD_DUMMY_VALUE, label: "Select a duration" },
  { value: "7 Days", label: "7 Days" },
  { value: "15 Days", label: "15 Days" },
  { value: "30 Days", label: "30 Days" },
  { value: "60 Days", label: "60 Days" },
  { value: "90 Days", label: "90 Days" },
  { value: "6 Months", label: "6 Months" },
  { value: "12 Months", label: "12 Months" },
  { value: "Custom", label: "Custom" },
];

const YES_NO_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "fixed_payment", label: "Fixed Payment" },
  { value: "milestone_based", label: "Milestone Payment" },
  { value: "product_gifting", label: "Product Gifting" },
];

const PAYMENT_STRUCTURE_OPTIONS = [
  {
    value: PAYMENT_STRUCTURE_DUMMY_VALUE,
    label: "Select Payment Distribution",
    description: "",
  },
  {
    value: "100% Upon Completion",
    label: "100% Upon Completion",
  },
  {
    value: "50% Advance + 50% Completion",
    label: "50% Advance + 50% Completion",
  },
  {
    value: "Custom Split",
    label: "Custom Split",
  },
];

const PROCESSOR_FEE_OPTIONS = [
  { value: "Brand Pays", label: "Brand Pays" },
  { value: "Creator Pays", label: "Creator Pays" },
  { value: "Split", label: "Split" },
];

const RESHOOT_OPTIONS = [
  { value: RESHOOT_OBLIGATION_DUMMY_VALUE, label: "Select Reshoot Obligation" },
  {
    value: "No reshoot required except for material failure to follow approved brief",
    label: "No reshoot required except for material failure to follow approved brief",
  },
  { value: "One Reshoot Included", label: "One Reshoot Included" },
  { value: "Custom Reshoot Terms", label: "Custom Reshoot Terms" },
];

const ANALYTICS_REPORTING_ITEM_OPTIONS = [
  "Live Link",
  "Screenshots",
  "Reach",
  "Views",
  "Watch Time",
  "Clicks",
  "Saves",
  "Shares",
  "Native Insights Access",
];


const MORALS_REPUTATION_CLAUSE =
  "Either Party may suspend or terminate the Agreement for material reputational harm resulting from serious public misconduct, as defined in this Agreement.";
const REFUND_REQUIRED_CLAUSE =
  "Refund required for material non-performance or uncured breach.";
const PRODUCT_MUST_BE_RETURNED_CLAUSE =
  "Creator must return shipped products upon material non-performance or uncured breach.";
const PRODUCT_GIFTING_MILESTONE_SEQUENCE_TEXT =
  "Milestones are completed sequentially. A milestone must be completed before the next milestone becomes active.";
const MILESTONE_RELEASE_SEQUENCE_TEXT =
  "Milestones are completed and released sequentially. A milestone must be approved and released before the next milestone becomes active.";

const SIDEBAR_TOOLTIPS = {
  brandLegalName: "Official registered legal name of the Brand.",
  brandContactPerson: "Primary point of contact for this campaign.",
  brandNoticeEmail: "Official campaign communication email used for notices and updates.",
  brandNoticePhone: "Phone number for urgent campaign or contract communication.",
  brandBillingAddress: "Registered billing and legal address of the Brand.",
  brandPoc: "Primary point of contact for this campaign.",
  brandPocDesignation: "Role or designation of the campaign contact.",
  requestedEffectiveDate: "Date on which the agreement becomes effective.",
  campaignProductsServices: "Products or services included in this collaboration.",

  campaignTitle: "Campaign title for this campaign.",
  campaignTerritory: "Countries where the campaign is intended to be promoted.",
  timezone: "Primary campaign timezone for approvals and deadlines.",
  campaignPaymentType: "Determines campaign payment and contract structure.",

  deliverableName: "Internal name for the deliverable.",
  platformHandle: "Platform where content will be published.",
  platform: "Platform where content will be published.",
  deliverableFormat: "Format of content being delivered.",
  deliverableType: "Format of content being delivered.",
  qty: "Number of deliverables of the selected type.",
  minimumVideoSpecs: "Technical requirements such as length, resolution, format, orientation, etc.",
  specifications: "Technical requirements such as length, resolution, format, orientation, etc.",
  mandatoryTags: "Specify any required social media tags, brand mentions, affiliate codes, UTM links, hashtags, or links that must be included in the content.",
  preShootScriptRequired: "Specify whether script approval is required before production.",
  preShootScriptDue: "Date by which script must be submitted.",
  preShootReviewDays: "Number of business days allowed for script review.",
  draftRequired: "Specify whether a draft review is required before publishing.",
  draftDue: "Date by which draft must be submitted.",
  liveDate: "Target publishing date of the deliverable.",

  revisionRequired: "Specify whether revisions are allowed.",
  includedRevisionRounds: "Number of revision rounds included in campaign scope.",
  additionalRevisionFee: "Fee payable for revisions beyond included revision rounds.",
  reshootObligation: "Describe custom reshoot expectations, limitations, turnaround times, or fee arrangements.",
  reshootFee: "Fee payable for any reshoot requests beyond the included reshoot.",
  reshootRequirements: "Describe custom reshoot expectations, limitations, turnaround times, or fee arrangements.",
  minimumLivePeriod: "Minimum period the creator must keep the content publicly available before removing, archiving, or materially editing it.",
  customLivePeriod: "Minimum period the creator must keep the content publicly available before removing, archiving, or materially editing it.",

  totalCampaignFee: "Total creator compensation for the campaign.",
  influencerBudget: "Total creator compensation for the campaign.",
  creatorCashCompensation: "No cash compensation is permitted in Product Gifting campaigns.",
  currency: "Currency for the creator compensation amount.",
  paymentStructure: "Defines how compensation is distributed between milestones.",
  customSplit: "Advance Payment % + Campaign Deliverables % must equal 100%, and each value must be between 1% and 99%.",
  advancePaymentPercent: "Percentage of total creator compensation paid in advance.",
  deliverablesPaymentPercent: "Percentage of total creator compensation paid after deliverables are approved.",
  advancePaymentTrigger: "Condition that triggers advance payment.",
  remainingPaymentTrigger: "Condition that triggers the remaining payment.",
  processorFeesBorneBy: "Determines responsibility for payment processing charges.",
  processorFeesNotes: "Specify how processing fees will be allocated.",
  laneAMarketplaceFeeNote: "Marketplace fee retained by CollabGlam according to platform terms.",
  milestoneDescription: "Describe the work required for milestone completion.",
  milestoneAmount: "Payment amount associated with this milestone.",
  giftingMilestoneAmount: "Product Gifting campaigns do not support monetary milestone payments.",
  milestoneDueDate: "Target completion date for this milestone.",

  rawSourceFileDelivery: "Specify whether raw/source files must be delivered.",
  rawFilesFormat: "Specify the source files and assets required from the creator.",
  rawFilesDeliveryDue: "Specify when raw/source files must be delivered.",
  analyticsRequired: "Specify whether the creator must provide campaign analytics after publication.",
  analyticsReportingDeadline: "Deadline for submitting campaign performance data.",
  analyticsReportingItems: "Select the analytics and performance data the creator must provide after publication.",

  productShippingApplicable: "Specify whether physical products will be shipped to the creator for this campaign.",
  productName: "Name of the product being shipped to the creator.",
  productSku: "Internal product SKU or identifier.",
  productQuantity: "Number of units being shipped.",
  estimatedProductValue: "Approximate retail value of the shipped product(s).",
  creatorShippingDetails: "The creator will provide their shipping details after receiving the contract.",
  productReceiptConfirmationDeadline: "Deadline for the creator to confirm receipt of the product after delivery.",
  productReturnable: "Specify whether the creator may keep the product or must return it after campaign completion.",
  returnWindowMethod: "Time period within which the product must be returned.",
  returnInstructions: "Provide return method, carrier requirements, prepaid label instructions, or other return details.",
  riskOfLossNotes: "Specify any special shipping liability, damage, loss, or ownership terms.",
  shipToName: "The creator will provide their shipping details after receiving the contract.",
  shipToPhone: "The creator will provide their shipping details after receiving the contract.",
  shipToAddress: "The creator will provide their shipping details after receiving the contract.",

  grantedUsageRights: "Select the usage rights granted to the Brand.",
  usageDuration: "Duration for the selected usage right.",
  usageTerritoryNotes: "Territory or notes for the selected usage right.",
  attributionRequirement: "Specify how the creator should be credited when content is reused.",
  attributionText: "Specify how the creator should be credited when content is reused.",
  editingRights: "Defines whether and how the Brand may modify creator content for approved usage rights.",
  musicStockAssetResponsibility: "Specify responsibility for music, stock assets, and commercial licensing.",
  musicStockAssetLicensingNotes: "Specify any custom music, stock asset, or commercial licensing responsibilities.",

  creativeBrief: "Specify campaign messaging, approved claims, mandatory talking points, key product benefits, and any information that must be included in the content.",
  restrictedStatements: "Specify prohibited claims, competitor, or regulated-claim restrictions.",
  ftcCompliance: "Standard compliance clause governing advertising disclosures, endorsements, and platform requirements.",
  competitorBlackout: "Restrict creator collaborations with competing brands during the campaign period.",
  categoryCompetitorList: "List restricted categories, brands, or competitors.",
  blackoutPeriod: "Duration of the exclusivity restriction.",
  optionalMoralsClause: "Allows suspension or termination for serious reputational harm.",

  killFeeOrProrata: "Compensation payable if the Brand cancels without cause.",
  killFeeAmount: "Amount payable upon cancellation.",
  proRataTerms: "Describe compensation based on completed work.",
  refundOfUnearnedAdvance: "Defines whether advance payments must be refunded for non-performance.",
  customRefundTerms: "Specify custom refund conditions.",
  productRecoveryTerms: "Defines product return obligations if campaign obligations are not fulfilled.",
  customRecoveryTerms: "Specify custom product return, retention, or recovery conditions.",

  governingLaw: "State or country whose laws govern this agreement.",
  disputeResolutionMethod: "Method used to resolve legal disputes.",
  disputeVenue: "Location where disputes will be resolved.",
  arbitrationSeat: "Location of the arbitration proceedings.",
  disputeResolutionDetails: "Specify alternative dispute resolution terms.",
  attorneysFees: "Determines responsibility for legal fees.",
  attorneysFeesTerms: "Specify custom legal fee arrangements.",
} as const;

function createRowId() {
  return Math.random().toString(36).slice(2);
}

function toMoney(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : fallback;
}

function normalizePaymentStructureForUi(raw?: string | null) {
  const value = String(raw || "").trim();
  const lower = value.toLowerCase().replace(/\s+/g, " ");
  if (!value) return "";
  if (["100% on completion", "100% upon completion", "upon completion", "completion"].includes(lower)) {
    return FIXED_PAYMENT_STRUCTURE.UPON_COMPLETION;
  }
  if (["50 / 50", "50/50", "50% advance / 50% balance", "50% advance + 50% balance", "50% advance + 50% completion"].includes(lower)) {
    return FIXED_PAYMENT_STRUCTURE.HALF_ADVANCE_HALF_COMPLETION;
  }
  if (["custom", "custom split"].includes(lower)) return FIXED_PAYMENT_STRUCTURE.CUSTOM_SPLIT;
  return value;
}

function parseFixedCustomSplit(advanceRaw: any, deliverablesRaw: any, customSplitRaw: any) {
  const directAdvance = Number(advanceRaw);
  const directDeliverables = Number(deliverablesRaw);
  if (Number.isFinite(directAdvance) || Number.isFinite(directDeliverables)) {
    const advance = Number.isFinite(directAdvance) ? directAdvance : 0;
    const deliverables = Number.isFinite(directDeliverables) ? directDeliverables : 100 - advance;
    return { advance, deliverables };
  }

  const match = String(customSplitRaw || "").match(/(\d+(?:\.\d+)?)\s*(?:%|)\s*(?:\/|\+|,|-)\s*(\d+(?:\.\d+)?)/);
  if (match) return { advance: Number(match[1]), deliverables: Number(match[2]) };

  return { advance: 50, deliverables: 50 };
}

function createSystemMilestone(row: Partial<ContractMilestone>): ContractMilestone {
  return {
    id: row.id || row.milestoneId || createRowId(),
    milestoneId: row.milestoneId || row.id || createRowId(),
    milestoneName: row.milestoneName || "Campaign Deliverables",
    milestoneDescription: row.milestoneDescription || "",
    paymentAmount: String(row.paymentAmount ?? ""),
    triggerEvent: row.triggerEvent || "",
    dueDate: row.dueDate || "",
    splitPercent: row.splitPercent || "",
    locked: row.locked ?? true,
    allowDeliverables: row.allowDeliverables ?? true,
    isSystemGenerated: row.isSystemGenerated ?? true,
  };
}

function buildFixedPaymentMilestonesForUi(
  totalRaw: any,
  structureRaw: any,
  advancePercentRaw?: any,
  deliverablesPercentRaw?: any,
  existingRows: ContractMilestone[] = []
) {
  const total = toMoney(totalRaw);
  const structure = normalizePaymentStructureForUi(structureRaw);

  if (!(total > 0) || !structure) {
    return [];
  }
  const existingByMilestoneId = existingRows.reduce<Record<string, ContractMilestone>>(
    (acc, row) => {
      const key = row.milestoneId || row.id;
      if (key) acc[key] = row;
      return acc;
    },
    {}
  );
  const dueFor = (id: string) => existingByMilestoneId[id]?.dueDate || "";

  if (structure === FIXED_PAYMENT_STRUCTURE.UPON_COMPLETION) {
    return [
      createSystemMilestone({
        id: CAMPAIGN_DELIVERABLES_MILESTONE_ID,
        milestoneId: CAMPAIGN_DELIVERABLES_MILESTONE_ID,
        milestoneName: "Campaign Deliverables",
        milestoneDescription: "Campaign deliverables approved for completion payment.",
        paymentAmount: String(total),
        splitPercent: "100",
        triggerEvent: "Upon completion and approval of campaign deliverables",
        dueDate: dueFor(CAMPAIGN_DELIVERABLES_MILESTONE_ID),
        allowDeliverables: true,
      }),
    ];
  }

  const split =
    structure === FIXED_PAYMENT_STRUCTURE.CUSTOM_SPLIT
      ? parseFixedCustomSplit(advancePercentRaw, deliverablesPercentRaw, structureRaw)
      : { advance: 50, deliverables: 50 };
  const advanceAmount = toMoney((total * split.advance) / 100);
  const deliverablesAmount = toMoney(total - advanceAmount);

  return [
    createSystemMilestone({
      id: ADVANCE_PAYMENT_MILESTONE_ID,
      milestoneId: ADVANCE_PAYMENT_MILESTONE_ID,
      milestoneName: "Advance Payment",
      milestoneDescription: "Advance payment before campaign deliverables are submitted.",
      paymentAmount: String(advanceAmount),
      splitPercent: String(split.advance),
      triggerEvent: "Advance payment trigger",
      dueDate: dueFor(ADVANCE_PAYMENT_MILESTONE_ID),
      allowDeliverables: false,
    }),
    createSystemMilestone({
      id: CAMPAIGN_DELIVERABLES_MILESTONE_ID,
      milestoneId: CAMPAIGN_DELIVERABLES_MILESTONE_ID,
      milestoneName: "Campaign Deliverables",
      milestoneDescription: "Campaign deliverables approved for completion payment.",
      paymentAmount: String(deliverablesAmount),
      splitPercent: String(split.deliverables),
      triggerEvent: "Upon completion and approval of campaign deliverables",
      dueDate: dueFor(CAMPAIGN_DELIVERABLES_MILESTONE_ID),
      allowDeliverables: true,
    }),
  ];
}

function getDeliverableMilestones(rows: ContractMilestone[]) {
  return (rows || []).filter((row) => row.allowDeliverables !== false);
}

function getFallbackDeliverableMilestone(rows: ContractMilestone[]) {
  return getDeliverableMilestones(rows)[0] || rows?.[0] || null;
}

function normalizeMilestoneFromSaved(row: any, index: number): ContractMilestone {
  const milestoneId = String(row?.milestoneId || row?.id || `milestone-${index + 1}`);
  return {
    id: milestoneId,
    milestoneId,
    milestoneName: String(row?.milestoneName || `Milestone ${index + 1}`),
    milestoneDescription: String(row?.milestoneDescription || ""),
    paymentAmount: String(row?.paymentAmount ?? ""),
    triggerEvent: String(row?.triggerEvent || ""),
    dueDate: String(row?.dueDate || ""),
    splitPercent: row?.splitPercent === undefined ? "" : String(row.splitPercent),
    locked: Boolean(row?.locked),
    allowDeliverables: row?.allowDeliverables === false ? false : true,
    isSystemGenerated: Boolean(row?.isSystemGenerated),
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getAtPath(obj: any, path: string, fallback: any = "") {
  const value = String(path)
    .split(".")
    .reduce((acc, key) => acc?.[key], obj);
  return value === undefined || value === null ? fallback : value;
}

function setAtPath<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const clone = deepClone(obj);
  const keys = String(path).split(".");
  let ref: any = clone;
  while (keys.length > 1) {
    const key = keys.shift()!;
    if (!ref[key] || typeof ref[key] !== "object") ref[key] = {};
    ref = ref[key];
  }
  ref[keys[0]] = value;
  return clone;
}

function mergeDeep<T>(base: T, patch: any): T {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch)) return patch as T;
  if (typeof patch !== "object") return patch as T;

  const output: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === "object" &&
      !Array.isArray(output[key])
    ) {
      output[key] = mergeDeep(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function normalizePaymentType(raw?: string | null): PaymentType {
  const v = String(raw || "").trim().toLowerCase();
  if (["fixed", "fixed_payment", "fixed-payment"].includes(v)) return PAYMENT_TYPE.FIXED;
  if (["milestone", "milestone_based", "milestone-based"].includes(v)) return PAYMENT_TYPE.MILESTONE;
  if (["gifting", "product_gifting", "product-gifting"].includes(v)) return PAYMENT_TYPE.GIFTING;
  return PAYMENT_TYPE.FIXED;
}

function normalizePreShootScriptRequired(raw: any): "" | "yes" | "no" {
  if (raw === true) return "yes";
  if (raw === false) return "no";

  const value = String(raw ?? "").trim().toLowerCase();
  if (["yes", "true", "1", "required"].includes(value)) return "yes";
  if (["no", "false", "0", "not required"].includes(value)) return "no";

  return "";
}

function normalizeNeedRevisionRounds(raw: any): "" | "yes" | "no" {
  if (raw === true) return "yes";
  if (raw === false) return "no";

  const value = String(raw ?? "").trim().toLowerCase();

  if (["yes", "true", "1", "required", "needed"].includes(value)) return "yes";
  if (["no", "false", "0", "not required", "not needed"].includes(value)) return "no";

  return "";
}

function createDefaultCommercialMilestone(index: number = 1): ContractMilestone {
  const id = createRowId();
  return {
    id,
    milestoneId: id,
    milestoneName: `Milestone ${index}`,
    milestoneDescription: "",
    paymentAmount: "",
    triggerEvent: "",
    dueDate: "",
    splitPercent: "",
    locked: false,
    allowDeliverables: true,
    isSystemGenerated: false,
  };
}

function defaultUsageRightsRows(): UsageRightsRow[] {
  return [
    {
      id: createRowId(),
      usageRight: "Organic repost on Brand-owned social channels",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
    {
      id: createRowId(),
      usageRight: "Brand website / blog / PDP / retailer listing",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
    {
      id: createRowId(),
      usageRight: "Email / CRM / deck / internal presentation use",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
    {
      id: createRowId(),
      usageRight: "Paid social / boosting / ads",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
    {
      id: createRowId(),
      usageRight: "Whitelisting / Spark Ads / dark posting / creator handle",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
    {
      id: createRowId(),
      usageRight: "Perpetual rights / buyout / work-made-for-hire",
      selected: false,
      duration: "",
      territoryNotes: "",
    },
  ];
}

function createDefaultScheduleDeliverable(index: number = 1, milestone?: ContractMilestone | null): ScheduleADeliverable {
  return {
    id: createRowId(),
    srNo: index,
    milestoneId: milestone?.milestoneId || "",
    milestoneName: milestone?.milestoneName || "",
    platform: "",
    handle: "",
    deliverableFormat: "",
    deliverableName: "",
    contentSpecification: "",
    aspectRatio: "",
    qty: "1",
    draftRequired: false,
    draftDue: "",
    liveDate: "",
    preShootScriptRequired: false,
    preShootScriptDue: "",
    preShootScriptReviewBusinessDays: "",
  };
}

function hasDeliverableInput(row?: ScheduleADeliverable | null) {
  if (!row) return false;

  return Boolean(
    String(row.deliverableName || "").trim() ||
    String(row.deliverableFormat || "").trim() ||
    String(row.contentSpecification || "").trim() ||
    String(row.aspectRatio || "").trim() ||
    String(row.platform || "").trim() ||
    String(row.handle || "").trim() ||
    Number(row.qty || "1") > 1 ||
    row.draftRequired ||
    String(row.draftDue || "").trim() ||
    String(row.liveDate || "").trim() ||
    row.preShootScriptRequired ||
    String(row.preShootScriptDue || "").trim()
  );
}

function cleanDeliverableDisplayValue(value: any) {
  const text = cleanString(value);
  const compact = text.toLowerCase().replace(/[\s_/-]+/g, " ").trim();

  if (!text) return "";
  if (["-", "—", "n/a", "na", "none", "null", "undefined", "select", "select option"].includes(compact)) {
    return "";
  }

  return text;
}

function hasMeaningfulDeliverable(row?: Partial<ScheduleADeliverable> | any | null) {
  if (!row) return false;

  const defaultWords = [
    "deliverable",
    "delivery",
    "campaign deliverable",
    "campaign deliverables",
  ];

  const isDefaultWord = (value: string) =>
    defaultWords.includes(value.toLowerCase().replace(/[\s_/-]+/g, " ").trim());

  const textFields = [
    "platform",
    "handle",
    "deliverableFormat",
    "deliverableName",
    "contentSpecification",
    "aspectRatio",
    "draftDue",
    "liveDate",
    "preShootScriptDue",
  ];

  const hasRealText = textFields.some((field) => {
    const value = cleanDeliverableDisplayValue(row?.[field]);
    if (!value || isDefaultWord(value)) return false;
    return true;
  });

  if (hasRealText) return true;

  const qty = Number(row?.qty ?? row?.quantity ?? 1);
  if (Number.isFinite(qty) && qty > 1) return true;

  if (row?.draftRequired) return true;

  const preShootDue = cleanDeliverableDisplayValue(row?.preShootScriptDue);
  if (row?.preShootScriptRequired && preShootDue) return true;

  return false;
}

function getDeliverableMissingFields(row: ScheduleADeliverable) {
  const missing: string[] = [];
  const qtyNum = Number(row.qty || "");

  if (!String(row.deliverableFormat || row.deliverableName || "").trim()) {
    missing.push("delivery type");
  }

  if (!String(row.aspectRatio || "").trim()) {
    missing.push("aspect ratio");
  }

  if (!String(row.platform || "").trim()) {
    missing.push("platform");
  }

  if (!String(row.qty || "").trim() || Number.isNaN(qtyNum) || qtyNum < 1) {
    missing.push("quantity");
  }

  return missing;
}

function isDeliverableComplete(row: ScheduleADeliverable) {
  return getDeliverableMissingFields(row).length === 0;
}

function createBlankActiveDeliverable(index: number = 1, milestone?: ContractMilestone | null): ScheduleADeliverable {
  return createDefaultScheduleDeliverable(index, milestone);
}

function createDefaultContractForm(): ContractFormState {
  return {
    brand: {
      legalName: "",
      contactPersonName: "",
      noticeEmail: "",
      noticePhone: "",
      billingAddress: "",
      brandPoc: "",
      brandPocDesignation: "",
    },
    influencer: {
      legalName: "",
      contactName: "",
      postingHandleUrl: "",
      contactEmail: "",
      contactPhone: "",
      whatsApp: "",
      address: "",
    },
    campaign: {
      productsServicesCovered: "",
      territoryTargetCountry: "Worldwide",
      territoryTargetCountryIds: [],
      effectiveDate: "",
      campaignTitleOrId: "",
      paymentType: PAYMENT_TYPE.FIXED,
    },
    scheduleA: {
      minimumVideoSpecs: "",
      preShootScriptRequired: "",
      preShootScriptDue: "",
      preShootScriptReviewBusinessDays: "",
      mandatoryTagsMentionsLinksCodes: "",
      review: {
        needRevisionRounds: "",
        includedRevisionRounds: "",
        additionalRevisionFee: "",
        reshootObligation: "",
        reshootFee: "",
        minimumLivePeriod: "",
        customLivePeriod: "",
      },
      commercial: {
        totalCampaignFee: "",
        currency: "USD",
        paymentStructure: "",
        customSplit: "",
        advancePaymentTrigger: "",
        remainingPaymentTrigger: "",
        paymentProcessorFeesBorneBy: "",
        paymentProcessorFeesNotes: "",
        laneAMarketplaceFeeNote: LANE_A_MARKETPLACE_FEE_NOTE,
        milestones: [],
        influencerBudget: "",
        fixedCustomAdvancePercent: "",
        fixedCustomDeliverablesPercent: "",
      },
      rawFiles: {
        rawSourceFileDelivery: "",
        deliveryDue: "",
        format: "",
        analyticsRequired: "",
        analyticsReportingDeadline: "",
        analyticsReportingItems: "",
      },
      shipping: {
        productShippingApplicable: "",
        productName: "",
        sku: "",
        quantity: "",
        estimatedProductValue: "",
        shipToName: "",
        shipToAddress: "",
        shipToPhone: "",
        productReceiptConfirmationDeadline: "",
        productReturnable: "",
        returnWindowMethod: "",
        returnInstructions: "",
        riskOfLossNotes: "",
      },
      usageRights: {
        rows: defaultUsageRightsRows(),
        attributionRequirement: "",
        attributionText: "",
        editingRights: "",
        musicStockAssetResponsibility: "",
        musicStockAssetLicensingNotes: "",
      },
      compliance: {
        creativeBriefMandatoryTalkingPoints: "",
        restrictedStatements: "",
      },
      exclusivity: {
        competitorBlackout: "",
        categoryCompetitorList: "",
        blackoutPeriod: "",
        optionalMoralsClause: "",
      },
      cancellation: {
        killFeeOrProrata: "",
        killFeeAmount: "",
        proRataTerms: "",
        refundOfUnearnedAdvance: "",
        customRefundTerms: "",
        productRecoveryTerms: "",
      },
      dispute: {
        governingLaw: "",
        disputeResolutionMethod: "",
        disputeVenue: "",
        arbitrationSeat: "",
        disputeResolutionDetails: "",
        attorneysFees: "",
        attorneysFeesTerms: "",
      },
    },
  };
}

function toInputDate(v?: string | Date | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildHandleUrl(platform?: string | null, handle?: string | null) {
  if (!handle) return null;
  const raw = handle.startsWith("@") ? handle.slice(1) : handle;
  switch ((platform || "").toLowerCase()) {
    case "instagram":
      return `https://instagram.com/${raw}`;
    case "tiktok":
      return `https://www.tiktok.com/@${raw}`;
    case "youtube":
    default:
      return `https://www.youtube.com/@${raw}`;
  }
}

function sanitizeHandle(h: string) {
  const t = (h || "").trim();
  if (!t) return t;
  return t.startsWith("@") ? t : `@${t}`;
}

function csvToTags(raw: string) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function tagsToCsv(tags: string[]) {
  return tags.join(", ");
}

function cleanString(value: any) {
  return String(value ?? "").trim();
}

function clearDummyValue(value: any, dummyValue: string) {
  return value === dummyValue ? "" : String(value || "");
}

function stripCampaignIdFromTitle(value: any) {
  const text = cleanString(value);
  return text.replace(/\s*\/\s*[a-f0-9]{24}\s*$/i, "").trim();
}

function cleanCampaignTimezone(value: any) {
  const text = cleanString(value);
  // Do not show the backend's internal fallback timezone as a UI default.
  return text === "America/Los_Angeles" ? "" : text;
}

function countryIdOf(row: any) {
  return cleanString(row?._id || row?.id || row?.countryId || row?.value);
}

function countryNameOf(row: any) {
  return cleanString(
    row?.countryNameEn ||
    row?.countryName ||
    row?.name ||
    row?.label ||
    row?.country
  );
}

function countryCodeOf(row: any) {
  return cleanString(row?.countryCode || row?.iso2 || row?.code || row?.iso3).toUpperCase();
}

function normalizeCountryOptions(rows: any[] = []): ContractCountryOption[] {
  const seen = new Set<string>();
  const out: ContractCountryOption[] = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const name = countryNameOf(row);
    const id = countryIdOf(row) || countryCodeOf(row) || name;
    if (!name || !id) continue;

    const key = String(id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const code = countryCodeOf(row);
    out.push({
      id,
      name,
      code,
      label: name,
      raw: row,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function uniqStrings(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = cleanString(value);
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

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

function toast(opts: {
  icon: "success" | "error" | "info";
  title: string;
  text?: string;
}) {
  return Swal.fire({
    ...opts,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    background: "white",
    customClass: { popup: "rounded-lg border border-gray-200" },
  });
}
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ContractCheckbox({
  checked,
  onCheckedChange,
  invalid = false,
  className,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      aria-invalid={invalid}
      aria-label={ariaLabel}
      className={cn(
        "bg-background border rounded-[4px] w-[20px] h-[20px] p-[4px] shrink-0",
        invalid
          ? "border-[color:var(--Errors-500,#E35141)]"
          : "border-[color:var(--Border-Primary,#B3B3B3)]",
        className,
      )}
    />
  );
}

function AccordionCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "cg-accordion",
        open ? "cg-accordion--open" : "cg-accordion--closed"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cg-accordion-btn"
      >
        <div className="min-w-0 flex-1">
          <div className="cg-accordion-title">{title}</div>
          {subtitle ? <div className="cg-accordion-subtitle">{subtitle}</div> : null}
        </div>

        <span className="shrink-0 mt-[6px] text-neutral-900">
          {open ? <CaretUp size={20} /> : <CaretDown size={20} />}
        </span>
      </button>

      {open ? <div className="p-3 pt-0">{children}</div> : null}
    </div>
  );
}

export default function ContractSidebarExtracted({
  open,
  onClose,
  campaignId,
  brandId: brandIdProp = null,
  influencer = null,
  campaignTitle = "",
  campaignBudget = null,
  campaignTimeline = null,
  onSuccess,
  initialContract = null,
  forcedPaymentType,
  contractPrefill = null,
  mode = "single",
  bulkInfluencers = [],
}: ContractSidebarExtractedProps) {
  const isBulkMode = mode === "bulk";
  const primaryInfluencer = isBulkMode ? bulkInfluencers?.[0] ?? null : influencer;
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureModalInitialTab, setSignatureModalInitialTab] =
    useState<"upload" | "manage">("upload");
  const [resolvedBrandId, setResolvedBrandId] = useState<string | null>(brandIdProp);
  const [currentContract, setCurrentContract] = useState<ContractMeta | null>(
    initialContract
  );
  const [requestedEffDate, setRequestedEffDate] = useState("");
  const [requestedEffTz, setRequestedEffTz] = useState(DEFAULT_TIMEZONE);
  const [inlineSignatureTab, setInlineSignatureTab] = useState<"default" | "draw">("default");
  const [inlineDrawnSig, setInlineDrawnSig] = useState("");
  const [inlineAgreed, setInlineAgreed] = useState(false);
  const [inlineShowError, setInlineShowError] = useState(false);
  const [contractForm, setContractForm] = useState<ContractFormState>(
    createDefaultContractForm()
  );
  const [activeBrandSignatureId, setActiveBrandSignatureId] = useState("");
  const [deliverables, setDeliverables] = useState<ScheduleADeliverable[]>([]);
  const [addedDeliverableCount, setAddedDeliverableCount] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([
    USD_CURRENCY_OPTION,
  ]);
  const [tzOptions, setTzOptions] = useState<TzOption[]>([]);
  const [apiCountryOptions, setApiCountryOptions] = useState<ContractCountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [lastCashInfluencerBudget, setLastCashInfluencerBudget] = useState("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<
    "idle" | "checking" | "exists" | "missing"
  >("idle");
  console.log("resolvebrandId", resolvedBrandId)
  const [activeBrandSignatureSrc, setActiveBrandSignatureSrc] = useState("");

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const rows = await apiListCountries({ limit: 500 });
        if (!mounted) return;
        setApiCountryOptions(normalizeCountryOptions(Array.isArray(rows) ? rows : []));
      } catch (error) {
        if (!mounted) return;
        setApiCountryOptions([]);
      } finally {
        if (mounted) setCountriesLoading(false);
      }
    };

    loadCountries();

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleDownloadContract = useCallback(
    async (filename = "BrandxInfluencer_contract.pdf") => {
      try {
        setContractLoading(true);

        // 1. If preview already exists, download that directly
        if (previewBlob) {
          const url = URL.createObjectURL(previewBlob);

          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(url);
          return;
        }

        // 2. Otherwise fetch saved/generated contract from backend
        const contractId = currentContract?.contractId;
        if (!contractId) {
          Swal.fire(
            "Info",
            "Generate a preview first or create the contract before downloading.",
            "info"
          );
          return;
        }

        const res = await api.post(
          "/contract/viewPdf",
          { contractId },
          { responseType: "blob" }
        );

        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
      } catch (e: any) {
        Swal.fire(
          "Error",
          e?.response?.data?.message || e?.message || "Failed to download contract PDF.",
          "error"
        );
      } finally {
        setContractLoading(false);
      }
    },
    [previewBlob, currentContract?.contractId]
  );

  const resolveBrandSignature = useCallback(async (): Promise<{
    signatureData: string;
    signatureId: string;
  }> => {
    if (!resolvedBrandId) {
      setSignatureStatus("missing");
      setActiveBrandSignatureSrc("");
      setActiveBrandSignatureId("");
      return { signatureData: "", signatureId: "" };
    }

    try {
      const primarySignature = await apiGetPrimaryBrandSignature(resolvedBrandId);

      if (primarySignature?.signature) {
        setSignatureStatus("exists");
        setActiveBrandSignatureSrc(primarySignature.signature);
        setActiveBrandSignatureId(primarySignature._id || "");

        return {
          signatureData: primarySignature.signature,
          signatureId: primarySignature._id || "",
        };
      }
    } catch {
      // Primary signature not found, fallback to active signatures list.
    }

    try {
      const result = await apiListBrandSignatures(resolvedBrandId);
      const rows = Array.isArray(result.signatures) ? result.signatures : [];

      const fallbackSignature =
        rows.find((item) => item.isPrimary) || rows[0] || null;

      if (fallbackSignature?.signature) {
        setSignatureStatus("exists");
        setActiveBrandSignatureSrc(fallbackSignature.signature);
        setActiveBrandSignatureId(fallbackSignature._id || "");

        // Auto-fix old data where signature exists but isPrimary is false.
        if (!fallbackSignature.isPrimary && fallbackSignature._id) {
          apiSetPrimaryBrandSignature(resolvedBrandId, fallbackSignature._id).catch(
            () => undefined
          );
        }

        return {
          signatureData: fallbackSignature.signature,
          signatureId: fallbackSignature._id || "",
        };
      }

      setSignatureStatus("missing");
      setActiveBrandSignatureSrc("");
      setActiveBrandSignatureId("");

      return { signatureData: "", signatureId: "" };
    } catch {
      setSignatureStatus("missing");
      setActiveBrandSignatureSrc("");
      setActiveBrandSignatureId("");

      return { signatureData: "", signatureId: "" };
    }
  }, [resolvedBrandId]);

  useEffect(() => {
    if (!open || !resolvedBrandId) {
      setSignatureStatus("idle");
      setActiveBrandSignatureSrc("");
      setActiveBrandSignatureId("");
      return;
    }

    let mounted = true;

    (async () => {
      setSignatureStatus("checking");

      const result = await resolveBrandSignature();

      if (!mounted) return;

      if (result.signatureData) {
        setSignatureStatus("exists");
      } else {
        setSignatureStatus("missing");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, resolvedBrandId, resolveBrandSignature]);

  useEffect(() => {
    if (!open) return;

    setInlineSignatureTab("default");
    setInlineDrawnSig("");
    setInlineAgreed(false);
    setInlineShowError(false);
  }, [open]);


  useEffect(() => {
    if (brandIdProp) {
      setResolvedBrandId(brandIdProp);
      return;
    }

    if (typeof window !== "undefined") {
      const storedBrandId = localStorage.getItem("brandId");
      setResolvedBrandId(storedBrandId || null);
    }
  }, [brandIdProp, open]);

  const isPreShootScriptRequired =
    getAtPath(contractForm, "scheduleA.preShootScriptRequired", "") === "yes";
  const activePaymentType = useMemo(
    () => normalizePaymentType(contractForm.campaign.paymentType),
    [contractForm.campaign.paymentType]
  );

  const clearPreview = useCallback(() => {
    setPreviewBlob(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const setContractField = useCallback((path: string, value: any) => {
    setContractForm((prev) => setAtPath(prev, path, value));
  }, []);
  const preShootScriptRequiredValue = getAtPath(
    contractForm,
    "scheduleA.preShootScriptRequired",
    ""
  );
  const prefillFormFor = useCallback(
    (inf: any, meta?: ContractMeta | null) => {
      const base = createDefaultContractForm();
      const prefillContent = contractPrefill?.content || meta?.content || {};
      const prefillContract = contractPrefill?.contract || meta || null;
      const prefillRequestedEffectiveDate =
        contractPrefill?.requestedEffectiveDate || prefillContract?.requestedEffectiveDate || "";
      const prefillRequestedEffectiveDateTimezone = cleanCampaignTimezone(
        contractPrefill?.content?.campaign?.timezone ||
        contractPrefill?.campaignTimezone ||
        contractPrefill?.requestedEffectiveDateTimezone ||
        prefillContract?.requestedEffectiveDateTimezone ||
        ""
      );

      if (typeof window !== "undefined") {
        base.brand.legalName = localStorage.getItem("brandName") || "";
        const storedBrandPoc =
          localStorage.getItem("brandPOC") ||
          localStorage.getItem("brandContactName") ||
          localStorage.getItem("brandName") ||
          "";
        base.brand.contactPersonName = storedBrandPoc;
        base.brand.noticeEmail = localStorage.getItem("brandEmail") || "";
        base.brand.noticePhone = localStorage.getItem("brandPhone") || "";
        base.brand.billingAddress = localStorage.getItem("brandAddress") || "";
        base.brand.brandPoc = storedBrandPoc;
        base.brand.brandPocDesignation = localStorage.getItem("brandPOCDesignation") || "";
      }

      const apiBrand = contractPrefill?.brand || {};
      base.brand.legalName = apiBrand.brandName || contractPrefill?.brandName || base.brand.legalName;
      base.brand.contactPersonName = apiBrand.name || contractPrefill?.name || base.brand.contactPersonName;
      base.brand.brandPoc = apiBrand.name || contractPrefill?.name || base.brand.brandPoc || base.brand.contactPersonName;
      base.brand.noticeEmail = apiBrand.noticeEmail || apiBrand.proxyEmail || contractPrefill?.brandNoticeEmail || contractPrefill?.brandProxyEmail || base.brand.noticeEmail;
      base.brand.billingAddress = apiBrand.billingAddress || base.brand.billingAddress;
      base.brand.brandPocDesignation = apiBrand.pocDesignation || contractPrefill?.brandPocDesignation || base.brand.brandPocDesignation;

      base.influencer.legalName = inf?.name || "";
      base.influencer.contactName = inf?.name || "";
      base.influencer.postingHandleUrl =
        buildHandleUrl(inf?.primaryPlatform, inf?.handle) || "";
      base.influencer.contactEmail = inf?.email || "";
      base.influencer.contactPhone = inf?.phone || "";
      base.influencer.whatsApp = inf?.whatsapp || "";
      base.influencer.address = inf?.address || "";

      base.campaign.campaignTitleOrId = stripCampaignIdFromTitle(
        contractPrefill?.campaignName ||
        contractPrefill?.campaignTitle ||
        contractPrefill?.content?.campaign?.name ||
        contractPrefill?.content?.campaign?.campaignTitleOrId ||
        campaignTitle ||
        ""
      );
      base.campaign.productsServicesCovered =
        contractPrefill?.campaignProductsServicesCovered || inf?.productOrServiceName || "";
      base.campaign.territoryTargetCountry =
        contractPrefill?.campaignCountry || contractPrefill?.targetCountry || contractPrefill?.territoryTargetCountry || "Worldwide";
      base.campaign.territoryTargetCountryIds = Array.isArray(contractPrefill?.campaignCountryIds)
        ? contractPrefill.campaignCountryIds
        : Array.isArray(contractPrefill?.content?.campaign?.territoryTargetCountryIds)
          ? contractPrefill.content.campaign.territoryTargetCountryIds
          : [];
      base.campaign.effectiveDate = toInputDate(new Date());

      // Do not prefill Influencer fees from campaignBudget or influencer API data.
      // Keep it empty until the brand enters it manually in the form.

      if (campaignTimeline?.startDate) {
        const start = toInputDate(campaignTimeline.startDate);
        if (start) {
          base.campaign.effectiveDate = start;
          setRequestedEffDate(start);
        }
      } else {
        setRequestedEffDate(base.campaign.effectiveDate);
      }

      if (prefillRequestedEffectiveDate) {
        setRequestedEffDate(toInputDate(prefillRequestedEffectiveDate));
      }
      setRequestedEffTz(prefillRequestedEffectiveDateTimezone || "");

      const initialPaymentType = normalizePaymentType(
        forcedPaymentType ||
        contractPrefill?.paymentType ||
        prefillContent?.campaign?.paymentType ||
        base.campaign.paymentType
      );
      base.campaign.paymentType = initialPaymentType;

      const merged = mergeDeep(base, prefillContent || {});
      merged.brand.legalName = apiBrand.brandName || contractPrefill?.brandName || merged.brand.legalName || "";
      merged.brand.noticeEmail = apiBrand.noticeEmail || apiBrand.proxyEmail || contractPrefill?.brandNoticeEmail || contractPrefill?.brandProxyEmail || merged.brand.noticeEmail || "";
      merged.brand.brandPoc = apiBrand.name || contractPrefill?.name || merged.brand.brandPoc || merged.brand.contactPersonName || "";
      merged.brand.contactPersonName = apiBrand.name || contractPrefill?.name || merged.brand.contactPersonName || merged.brand.brandPoc || "";
      merged.brand.billingAddress = apiBrand.billingAddress || merged.brand.billingAddress || "";
      merged.brand.brandPocDesignation = apiBrand.pocDesignation || contractPrefill?.brandPocDesignation || merged.brand.brandPocDesignation || "";
      merged.campaign.paymentType = initialPaymentType;
      merged.scheduleA.preShootScriptRequired = normalizePreShootScriptRequired(
        merged.scheduleA.preShootScriptRequired
      );
      const contractCommercial = prefillContent?.scheduleA?.commercial;
      const hasExistingContractContent = Boolean(
        prefillContract?.contractId ||
        prefillContract?._id ||
        meta?.contractId ||
        meta?._id
      );
      const savedInfluencerFee = hasExistingContractContent
        ? (contractCommercial?.influencerBudget !== undefined &&
          contractCommercial?.influencerBudget !== null &&
          String(contractCommercial.influencerBudget).trim() !== "" &&
          Number(contractCommercial.influencerBudget) > 0
          ? String(contractCommercial.influencerBudget)
          : contractCommercial?.totalCampaignFee !== undefined &&
            contractCommercial?.totalCampaignFee !== null &&
            String(contractCommercial.totalCampaignFee).trim() !== "" &&
            Number(contractCommercial.totalCampaignFee) > 0
            ? String(contractCommercial.totalCampaignFee)
            : "")
        : "";

      // New send-contract forms must start empty for Total Influencer Compensation.
      // Only an existing saved contract may prefill this value.
      merged.scheduleA.commercial.influencerBudget = savedInfluencerFee;
      merged.scheduleA.commercial.totalCampaignFee = savedInfluencerFee;
      merged.scheduleA.commercial.currency = "USD";
      merged.campaign.campaignTitleOrId = stripCampaignIdFromTitle(
        contractPrefill?.campaignName ||
        contractPrefill?.campaignTitle ||
        (merged.campaign as any).name ||
        merged.campaign.campaignTitleOrId ||
        campaignTitle ||
        ""
      );
      (merged.campaign as any).timezone = prefillRequestedEffectiveDateTimezone || "";
      setLastCashInfluencerBudget(
        initialPaymentType === PAYMENT_TYPE.GIFTING ? "" : savedInfluencerFee
      );

      const revisionFromMeta = meta?.content?.scheduleA?.review || {};
      const normalizedNeedRevisionRounds = normalizeNeedRevisionRounds(
        revisionFromMeta.needRevisionRounds
      );

      const derivedNeedRevisionRounds =
        Number(revisionFromMeta.includedRevisionRounds || 0) > 0 ||
        Boolean(String(revisionFromMeta.additionalRevisionFee || "").trim());

      merged.scheduleA.review.needRevisionRounds =
        normalizedNeedRevisionRounds || (derivedNeedRevisionRounds ? "yes" : "");

      if (merged.scheduleA.review.needRevisionRounds === "yes") {
        merged.scheduleA.review.includedRevisionRounds =
          String(merged.scheduleA.review.includedRevisionRounds || "1");
        merged.scheduleA.review.additionalRevisionFee =
          String(merged.scheduleA.review.additionalRevisionFee || "");
      } else {
        merged.scheduleA.review.includedRevisionRounds = "";
        merged.scheduleA.review.additionalRevisionFee = "";
      }

      const rawMilestones =
        prefillContent?.scheduleA?.commercial?.milestones ||
        merged?.scheduleA?.commercial?.milestones ||
        [];

      const normalizedSavedMilestones =
        Array.isArray(rawMilestones) && rawMilestones.length
          ? rawMilestones.map((row: any, index: number) => normalizeMilestoneFromSaved(row, index))
          : [];

      merged.scheduleA.commercial.paymentStructure =
        initialPaymentType === PAYMENT_TYPE.FIXED && hasExistingContractContent
          ? normalizePaymentStructureForUi(merged.scheduleA.commercial.paymentStructure)
          : "";

      merged.scheduleA.commercial.fixedCustomAdvancePercent =
        merged.scheduleA.commercial.fixedCustomAdvancePercent || "";
      merged.scheduleA.commercial.fixedCustomDeliverablesPercent =
        merged.scheduleA.commercial.fixedCustomDeliverablesPercent || "";

      merged.scheduleA.commercial.milestones =
        initialPaymentType === PAYMENT_TYPE.FIXED
          ? buildFixedPaymentMilestonesForUi(
            savedInfluencerFee,
            merged.scheduleA.commercial.paymentStructure,
            merged.scheduleA.commercial.fixedCustomAdvancePercent,
            merged.scheduleA.commercial.fixedCustomDeliverablesPercent,
            normalizedSavedMilestones
          )
          : initialPaymentType === PAYMENT_TYPE.MILESTONE
            ? normalizedSavedMilestones.length
              ? normalizedSavedMilestones
              : [createDefaultCommercialMilestone()]
            : initialPaymentType === PAYMENT_TYPE.GIFTING
              ? (normalizedSavedMilestones.length
                ? normalizedSavedMilestones.map((row) => ({
                  ...row,
                  paymentAmount: "0",
                  allowDeliverables: true,
                  locked: false,
                }))
                : [{
                  ...createDefaultCommercialMilestone(),
                  milestoneName: "Product Gifting Deliverables",
                  paymentAmount: "0",
                  allowDeliverables: true,
                }])
              : [];

      const usageRows = prefillContent?.scheduleA?.usageRights?.rows;
      const deliverablesFromMeta = prefillContent?.scheduleA?.deliverables;

      if (Array.isArray(usageRows) && usageRows.length) {
        merged.scheduleA.usageRights.rows = usageRows.map((row: any) => ({
          id: createRowId(),
          usageRight: String(row?.usageRight || ""),
          selected: Boolean(row?.selected),
          duration: String(row?.duration || ""),
          territoryNotes: String(row?.territoryNotes || ""),
        }));
      }

      const defaultDeliverableMilestone = getFallbackDeliverableMilestone(
        merged.scheduleA.commercial.milestones
      );

      const savedDeliverablesForPrefill = Array.isArray(deliverablesFromMeta)
        ? deliverablesFromMeta.filter((row: any) => hasMeaningfulDeliverable(row))
        : [];

      const mappedDeliverables =
        savedDeliverablesForPrefill.length
          ? savedDeliverablesForPrefill.map((row: any, index: number) => {
            const matchedMilestone =
              merged.scheduleA.commercial.milestones.find(
                (milestone: ContractMilestone) =>
                  milestone.milestoneId === row?.milestoneId && milestone.allowDeliverables !== false
              ) || defaultDeliverableMilestone;

            return {
              id: createRowId(),
              srNo: Number(row?.srNo ?? index + 1),
              milestoneId: matchedMilestone?.milestoneId || "",
              milestoneName: matchedMilestone?.milestoneName || "",
              platform: String(row?.platform || ""),
              handle: String(row?.handle || row?.platformHandle || ""),
              deliverableFormat: String(row?.deliverableFormat || row?.deliverableName || ""),
              deliverableName: String(row?.deliverableName || row?.deliverableFormat || ""),
              contentSpecification: String(
                row?.contentSpecification ||
                (savedDeliverablesForPrefill.length === 1 ? prefillContent?.scheduleA?.minimumVideoSpecs || "" : "")
              ),
              aspectRatio: String(row?.aspectRatio || ""),
              qty: String(row?.qty ?? "1"),
              draftRequired: Boolean(row?.draftRequired ?? false),
              draftDue: String(row?.draftDue || ""),
              liveDate: String(row?.liveDate || ""),
              preShootScriptRequired: Boolean(
                row?.preShootScriptRequired ??
                (savedDeliverablesForPrefill.length === 1 ? prefillContent?.scheduleA?.preShootScriptRequired : false)
              ),
              preShootScriptDue: String(
                row?.preShootScriptDue ||
                (savedDeliverablesForPrefill.length === 1 ? prefillContent?.scheduleA?.preShootScriptDue || "" : "")
              ),
              preShootScriptReviewBusinessDays: String(
                row?.preShootScriptReviewBusinessDays ||
                prefillContent?.scheduleA?.preShootScriptReviewBusinessDays ||
                ""
              ),
            };
          })
          : [];

      setAddedDeliverableCount(mappedDeliverables.length);

      if (initialPaymentType === PAYMENT_TYPE.FIXED) {
        setDeliverables(mappedDeliverables);
      } else {
        setDeliverables([
          ...mappedDeliverables,
          createBlankActiveDeliverable(
            mappedDeliverables.length + 1,
            defaultDeliverableMilestone
          ),
        ]);
      }

      setContractForm(merged);
      setFormErrors({});
      clearPreview();
    },
    [campaignBudget, campaignTitle, campaignTimeline, clearPreview, forcedPaymentType, contractPrefill]
  );

  useEffect(() => {
    if (!open || !resolvedBrandId || !campaignId) return;

    if (contractPrefill) {
      const prefilledContract = contractPrefill.contract || initialContract || null;
      setCurrentContract(prefilledContract);
      prefillFormFor(contractPrefill.influencer || primaryInfluencer, prefilledContract);
      setContractLoading(false);
      return;
    }

    if (isBulkMode) {
      if (!primaryInfluencer) return;
      setCurrentContract(null);
      prefillFormFor(primaryInfluencer, null);
      setContractLoading(false);
      return;
    }

    if (!primaryInfluencer?.influencerId) return;

    let mounted = true;

    (async () => {
      if (initialContract !== undefined) {
        setCurrentContract(initialContract || null);
        prefillFormFor(primaryInfluencer, initialContract || null);
        setContractLoading(false);
        return;
      }

      setContractLoading(true);
      try {
        const res: any = await post("/contract/getContract", {
          brandId: resolvedBrandId,
          influencerId: primaryInfluencer.influencerId,
          campaignId,
        });

        const list = res?.contracts || res?.data?.contracts || [];
        const filtered = (list as ContractMeta[]).filter(
          (c) => String(c.campaignId) === String(campaignId)
        );
        const meta = filtered.length ? filtered[0] : list.length ? list[0] : null;

        if (!mounted) return;
        setCurrentContract(meta || null);
        prefillFormFor(primaryInfluencer, meta || null);
      } catch {
        if (!mounted) return;
        setCurrentContract(null);
        prefillFormFor(primaryInfluencer, null);
      } finally {
        if (mounted) setContractLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    open,
    resolvedBrandId,
    campaignId,
    primaryInfluencer,
    prefillFormFor,
    initialContract,
    isBulkMode,
    contractPrefill,
  ]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    setCurrencyOptions([USD_CURRENCY_OPTION]);
    setContractField("scheduleA.commercial.currency", "USD");

    (async () => {
      try {
        const tzRes: any = await api.get("/contract/timezones");
        const tzArr: any[] =
          tzRes?.data?.timezones || tzRes?.timezones || tzRes || [];

        const zones = Array.from(
          new Map(
            tzArr.map((t: any, index: number) => {
              const canonical =
                typeof t?.value === "string" && t.value.trim()
                  ? t.value.trim()
                  : Array.isArray(t?.utc) && t.utc.length
                    ? String(t.utc[0]).trim()
                    : `timezone-${index}`;

              return [
                canonical,
                {
                  value: canonical,
                  label: t?.text || canonical,
                  meta: t,
                },
              ];
            })
          ).values()
        ) as TzOption[];

        if (!mounted) return;
        setTzOptions(zones);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, setContractField]);
  useEffect(() => {
    if (!open) return;
    clearPreview();
  }, [contractForm, deliverables, requestedEffDate, requestedEffTz, open, clearPreview]);

  const buildContentPayload = useCallback((signatureId: string = "") => {
    const content = deepClone(contractForm);
    const paymentType = activePaymentType;
    const influencerFee =
      paymentType === PAYMENT_TYPE.GIFTING
        ? 0
        : Number(
          content.scheduleA.commercial.influencerBudget ||
          content.scheduleA.commercial.totalCampaignFee ||
          "0"
        ) || 0;

    const paymentStructure =
      content.scheduleA.commercial.paymentStructure === PAYMENT_STRUCTURE_DUMMY_VALUE
        ? ""
        : normalizePaymentStructureForUi(content.scheduleA.commercial.paymentStructure);

    const fixedMilestones = buildFixedPaymentMilestonesForUi(
      influencerFee,
      paymentStructure,
      content.scheduleA.commercial.fixedCustomAdvancePercent,
      content.scheduleA.commercial.fixedCustomDeliverablesPercent,
      content.scheduleA.commercial.milestones
    );

    const milestoneRows: ContractMilestone[] =
      paymentType === PAYMENT_TYPE.FIXED
        ? fixedMilestones
        : paymentType === PAYMENT_TYPE.MILESTONE || paymentType === PAYMENT_TYPE.GIFTING
          ? content.scheduleA.commercial.milestones.map((row: ContractMilestone, index: number) => ({
            ...row,
            milestoneId: row.milestoneId || row.id || `milestone-${index + 1}`,
            id: row.id || row.milestoneId || `milestone-${index + 1}`,
            paymentAmount: paymentType === PAYMENT_TYPE.GIFTING ? "0" : row.paymentAmount,
            allowDeliverables: row.allowDeliverables === false ? false : true,
          }))
          : [];

    const deliverableMilestones = getDeliverableMilestones(milestoneRows);
    const fallbackDeliverableMilestone = getFallbackDeliverableMilestone(milestoneRows);

    const needRevisionRounds =
      content.scheduleA.review.needRevisionRounds === REVISION_ROUNDS_DUMMY_VALUE
        ? ""
        : content.scheduleA.review.needRevisionRounds;

    const minimumLivePeriod =
      content.scheduleA.review.minimumLivePeriod === MINIMUM_LIVE_PERIOD_DUMMY_VALUE
        ? ""
        : content.scheduleA.review.minimumLivePeriod;
    const customLivePeriod =
      minimumLivePeriod === "Custom"
        ? String(content.scheduleA.review.customLivePeriod || "").trim()
        : "";

    content.campaign.paymentType = paymentType;

    const deliverablesForPayload = deliverables.filter(
      (row, index) => index < addedDeliverableCount || hasDeliverableInput(row)
    );

    const deliverablePayload = deliverablesForPayload.map((row, index) => {
      const matchedMilestone =
        deliverableMilestones.find((milestone) => milestone.milestoneId === row.milestoneId) ||
        fallbackDeliverableMilestone;

      return {
        srNo: index + 1,
        milestoneId: matchedMilestone?.milestoneId || "",
        milestoneName: matchedMilestone?.milestoneName || "",
        platform: row.platform,
        handle: row.handle,
        handles: row.handle ? [row.handle] : [],
        platformHandle: [row.platform, row.handle].filter(Boolean).join(" / "),
        deliverableFormat: row.deliverableFormat,
        deliverableName: row.deliverableName || row.deliverableFormat,
        contentSpecification: row.contentSpecification,
        aspectRatio: row.aspectRatio,
        qty: Number(row.qty || "1") || 1,
        draftRequired: row.draftRequired,
        draftDue: row.draftRequired ? row.draftDue : "",
        liveDate: row.liveDate,
        preShootScriptRequired: Boolean(row.preShootScriptRequired),
        preShootScriptDue: row.preShootScriptRequired ? row.preShootScriptDue : "",
        preShootScriptReviewBusinessDays: row.preShootScriptRequired
          ? Number(row.preShootScriptReviewBusinessDays || "0") || 0
          : 0,
      };
    });

    const firstPreShootDeliverable = deliverablePayload.find(
      (row) => row.preShootScriptRequired
    );

    const contentSpecificationText = deliverablePayload
      .map((row, index) =>
        row.contentSpecification
          ? `Deliverable ${index + 1}: ${row.contentSpecification}`
          : ""
      )
      .filter(Boolean)
      .join("\n\n");

    const cleanExclusivityCompetitorBlackout = clearDummyValue(
      content.scheduleA.exclusivity.competitorBlackout,
      EXCLUSIVITY_DUMMY_VALUE
    );

    const cleanOptionalMoralsClause = clearDummyValue(
      content.scheduleA.exclusivity.optionalMoralsClause,
      MORALS_CLAUSE_DUMMY_VALUE
    );

    const cleanKillFeeOrProrata = clearDummyValue(
      content.scheduleA.cancellation.killFeeOrProrata,
      KILL_FEE_DUMMY_VALUE
    );

    const cleanRefundOfUnearnedAdvance = clearDummyValue(
      content.scheduleA.cancellation.refundOfUnearnedAdvance,
      REFUND_ADVANCE_DUMMY_VALUE
    );

    const cleanProductRecoveryTerms = clearDummyValue(
      content.scheduleA.cancellation.productRecoveryTerms,
      PRODUCT_RECOVERY_DUMMY_VALUE
    );

    const cleanDisputeResolutionMethod = clearDummyValue(
      content.scheduleA.dispute.disputeResolutionMethod,
      DISPUTE_METHOD_DUMMY_VALUE
    );

    const cleanAttorneysFees = clearDummyValue(
      content.scheduleA.dispute.attorneysFees,
      ATTORNEYS_FEES_DUMMY_VALUE
    );

    return {
      ...content,
      brand: {
        ...content.brand,
        contactPersonName: content.brand.contactPersonName || content.brand.brandPoc || "",
        brandPoc: content.brand.brandPoc || content.brand.contactPersonName || "",
        brandSignature: signatureId || activeBrandSignatureId || "",
      },
      campaign: {
        ...content.campaign,
        campaignTitleOrId: stripCampaignIdFromTitle(content.campaign.campaignTitleOrId),
        name: stripCampaignIdFromTitle(content.campaign.campaignTitleOrId || (content.campaign as any).name),
        timezone: requestedEffTz || (content.campaign as any).timezone || "",
        paymentType,
        effectiveDate: requestedEffDate || content.campaign.effectiveDate || "",
      },
      scheduleA: {
        ...content.scheduleA,
        minimumVideoSpecs: contentSpecificationText,
        preShootScriptRequired: Boolean(firstPreShootDeliverable),
        preShootScriptDue: firstPreShootDeliverable?.preShootScriptDue || "",
        preShootScriptReviewBusinessDays:
          Number(firstPreShootDeliverable?.preShootScriptReviewBusinessDays || "") || 0,
        deliverables: deliverablePayload,
        review: {
          ...content.scheduleA.review,
          needRevisionRounds,
          minimumLivePeriod,
          customLivePeriod,
          includedRevisionRounds:
            needRevisionRounds === "yes"
              ? Number(content.scheduleA.review.includedRevisionRounds || "1") || 1
              : 0,
          additionalRevisionFee:
            needRevisionRounds === "yes"
              ? String(content.scheduleA.review.additionalRevisionFee || "")
              : "",
        },
        commercial: {
          ...content.scheduleA.commercial,
          paymentStructure,
          platformMilestonePaymentStructure: paymentStructure,
          totalCampaignFee: paymentType === PAYMENT_TYPE.GIFTING ? 0 : influencerFee,
          influencerBudget: paymentType === PAYMENT_TYPE.GIFTING ? 0 : influencerFee,
          currency: "USD",
          laneAMarketplaceFeeNote: LANE_A_MARKETPLACE_FEE_NOTE,
          milestones: milestoneRows.map((row) => ({
            milestoneId: row.milestoneId || row.id,
            milestoneName: row.milestoneName,
            milestoneDescription: row.milestoneDescription,
            paymentAmount: paymentType === PAYMENT_TYPE.GIFTING ? 0 : (Number(row.paymentAmount || "0") || 0),
            splitPercent: row.splitPercent || "",
            triggerEvent: row.triggerEvent,
            dueDate: row.dueDate,
            allowDeliverables: row.allowDeliverables === false ? false : true,
            locked: Boolean(row.locked),
            isSystemGenerated: Boolean(row.isSystemGenerated),
          })),
        },
        exclusivity: {
          ...content.scheduleA.exclusivity,
          competitorBlackout: cleanExclusivityCompetitorBlackout,
          categoryCompetitorList:
            cleanExclusivityCompetitorBlackout === "Applies"
              ? content.scheduleA.exclusivity.categoryCompetitorList
              : "",
          blackoutPeriod:
            cleanExclusivityCompetitorBlackout === "Applies"
              ? content.scheduleA.exclusivity.blackoutPeriod
              : "",
          optionalMoralsClause: cleanOptionalMoralsClause,
        },
        cancellation: {
          ...content.scheduleA.cancellation,
          killFeeOrProrata: cleanKillFeeOrProrata,
          killFeeAmount:
            cleanKillFeeOrProrata === "Fixed Amount"
              ? content.scheduleA.cancellation.killFeeAmount
              : "",
          proRataTerms:
            cleanKillFeeOrProrata === "Pro-Rata Compensation"
              ? content.scheduleA.cancellation.proRataTerms
              : "",
          refundOfUnearnedAdvance: cleanRefundOfUnearnedAdvance,
          productRecoveryTerms: cleanProductRecoveryTerms,
          customRefundTerms:
            cleanRefundOfUnearnedAdvance === "Custom" ||
            cleanProductRecoveryTerms === "Custom"
              ? content.scheduleA.cancellation.customRefundTerms
              : "",
        },
        dispute: {
          ...content.scheduleA.dispute,
          disputeResolutionMethod: cleanDisputeResolutionMethod,
          disputeVenue:
            cleanDisputeResolutionMethod === "State / Federal Courts"
              ? content.scheduleA.dispute.disputeVenue
              : "",
          arbitrationSeat:
            cleanDisputeResolutionMethod === "Arbitration"
              ? content.scheduleA.dispute.arbitrationSeat
              : "",
          disputeResolutionDetails:
            cleanDisputeResolutionMethod === "Other"
              ? content.scheduleA.dispute.disputeResolutionDetails
              : "",
          attorneysFees: cleanAttorneysFees,
          attorneysFeesTerms:
            cleanAttorneysFees === "Other"
              ? content.scheduleA.dispute.attorneysFeesTerms
              : "",
        },
        usageRights: {
          ...content.scheduleA.usageRights,
          rows: content.scheduleA.usageRights.rows.map((row) => ({
            usageRight: row.usageRight,
            selected: row.selected,
            duration: row.duration,
            territoryNotes: row.territoryNotes,
          })),
        },
      },
    };
  }, [
    contractForm,
    deliverables,
    addedDeliverableCount,
    requestedEffDate,
    activePaymentType,
    activeBrandSignatureId,
  ]);

  const buildBrandUpdatesPayload = useCallback((signatureId: string = "") => {
    return {
      content: buildContentPayload(signatureId),
    };
  }, [buildContentPayload]);

  const buildBulkContentPayload = useCallback((signatureId: string = "") => {
    const content = buildContentPayload(signatureId);

    return {
      ...content,
      influencer: {},
      scheduleA: {
        ...content.scheduleA,
        deliverables: content.scheduleA.deliverables.map((row: any) => ({
          ...row,
          platformHandle: "",
        })),
      },
    };
  }, [buildContentPayload]);

  const validateForPreview = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    const add = (key: string, message: string) => {
      nextErrors[key] = message;
    };

    const influencerFeeRaw = String(
      contractForm.scheduleA.commercial.influencerBudget ?? ""
    );
    const influencerFeeValue = Number(influencerFeeRaw);
    const campaignBudgetValue = Number(campaignBudget || 0);
    const revisionRaw = String(
      contractForm.scheduleA.review.includedRevisionRounds ?? ""
    );
    const revisionValue = Number(revisionRaw);
    const needRevisionRounds =
      contractForm.scheduleA.review.needRevisionRounds === "yes";
    const revisionFeeRaw = String(
      contractForm.scheduleA.review.additionalRevisionFee ?? ""
    );
    const revisionFeeValue = Number(revisionFeeRaw);

    if (!String(contractForm.brand.legalName ?? "").trim()) {
      add("brand.legalName", "Brand legal name is required.");
    }
    if (!String(contractForm.brand.brandPoc || contractForm.brand.contactPersonName || "").trim()) {
      add("brand.brandPoc", "Brand POC is required.");
    }
    if (!String(contractForm.campaign.productsServicesCovered ?? "").trim()) {
      add("campaign.productsServicesCovered", "Product / Services Covered is required.");
    }
    if (!String(contractForm.influencer.legalName ?? "").trim()) {
      add("influencer.legalName", "Influencer legal name is required.");
    }
    if (!String(contractForm.campaign.campaignTitleOrId ?? "").trim()) {
      add("campaign.campaignTitleOrId", "Campaign Title is required.");
    }
    if (!contractForm.scheduleA.commercial.currency) {
      add("scheduleA.commercial.currency", "Currency is required.");
    }
    if (!contractForm.campaign.paymentType) {
      add("campaign.paymentType", "Payment type is required.");
    }

    if (!String(contractForm.scheduleA.dispute.disputeResolutionMethod ?? "").trim()) {
      add(
        "scheduleA.dispute.disputeResolutionMethod",
        "Dispute resolution method is required."
      );
    }

    if (activePaymentType !== PAYMENT_TYPE.GIFTING) {
      if (
        !influencerFeeRaw.trim() ||
        Number.isNaN(influencerFeeValue) ||
        influencerFeeValue <= 0
      ) {
        add(
          "scheduleA.commercial.influencerBudget",
          "Total Influencer Compensation must be greater than 0."
        );
      } else if (campaignBudgetValue > 0 && influencerFeeValue > campaignBudgetValue) {
        add(
          "scheduleA.commercial.influencerBudget",
          "Total Influencer Compensation must be less than or equal to the campaign budget."
        );
      }
    }

    if (activePaymentType === PAYMENT_TYPE.FIXED) {
      const paymentStructure = normalizePaymentStructureForUi(
        contractForm.scheduleA.commercial.paymentStructure
      );
      if (!paymentStructure) {
        add("scheduleA.commercial.paymentStructure", "Payment Distribution is required.");
      }

      if (paymentStructure === FIXED_PAYMENT_STRUCTURE.CUSTOM_SPLIT) {
        const advance = Number(contractForm.scheduleA.commercial.fixedCustomAdvancePercent);
        const deliverablesPercent = Number(
          contractForm.scheduleA.commercial.fixedCustomDeliverablesPercent
        );
        if (
          Number.isNaN(advance) ||
          Number.isNaN(deliverablesPercent) ||
          advance <= 0 ||
          deliverablesPercent <= 0 ||
          advance >= 100 ||
          deliverablesPercent >= 100 ||
          Math.round((advance + deliverablesPercent) * 100) / 100 !== 100
        ) {
          add(
            "scheduleA.commercial.customSplit",
            "Advance Payment % + Campaign Deliverables % must equal 100%, and each value must be between 1% and 99%."
          );
        }
      }
    }

    if (activePaymentType === PAYMENT_TYPE.MILESTONE || activePaymentType === PAYMENT_TYPE.GIFTING) {
      const milestones = contractForm.scheduleA.commercial.milestones || [];
      if (!milestones.length) {
        add("scheduleA.commercial.milestones", "Add at least one milestone.");
      } else {
        const messages: string[] = [];
        const milestoneSum = milestones.reduce(
          (sum, row) => sum + (Number(row.paymentAmount || "0") || 0),
          0
        );
        milestones.forEach((row, index) => {
          const label = `Milestone #${index + 1}`;
          if (!row.milestoneName.trim()) messages.push(`${label}: name is required.`);
          if (activePaymentType === PAYMENT_TYPE.GIFTING) {
            if (Number(row.paymentAmount || "0") !== 0) {
              messages.push(`${label}: amount must remain $0 for Product Gifting.`);
            }
          } else if (!String(row.paymentAmount || "").trim() || Number(row.paymentAmount) <= 0) {
            messages.push(`${label}: amount must be greater than 0.`);
          }
          if (!row.dueDate.trim()) messages.push(`${label}: due date is required.`);
        });
        if (activePaymentType === PAYMENT_TYPE.MILESTONE && Math.abs(milestoneSum - influencerFeeValue) > 0.01) {
          messages.push("Sum of all milestones must equal Total Influencer Compensation.");
        }
        if (messages.length) {
          add("scheduleA.commercial.milestones", messages.join(" "));
        }
      }
    }

    if (needRevisionRounds) {
      if (
        !String(contractForm.scheduleA.review.includedRevisionRounds ?? "").trim() ||
        Number.isNaN(revisionValue) ||
        revisionValue < 1
      ) {
        add(
          "scheduleA.review.includedRevisionRounds",
          "Revision count must be at least 1."
        );
      }

      if (
        !revisionFeeRaw.trim() ||
        Number.isNaN(revisionFeeValue) ||
        revisionFeeValue < 0
      ) {
        add(
          "scheduleA.review.additionalRevisionFee",
          "Revision fees must be 0 or greater."
        );
      }
    }

    if (contractForm.scheduleA.review.minimumLivePeriod === "Custom" &&
      !String(contractForm.scheduleA.review.customLivePeriod || "").trim()) {
      add("scheduleA.review.customLivePeriod", "Custom Live Period is required.");
    }

    if (!requestedEffDate) {
      add("requestedEffDate", "Requested effective date is required.");
    }

    const deliverablesForValidation = deliverables.filter(
      (row, index) => index < addedDeliverableCount || hasDeliverableInput(row)
    );

    if (!deliverablesForValidation.length) {
      add("scheduleA.deliverables", "Add at least one deliverable.");
    } else {
      const messages: string[] = [];

      deliverablesForValidation.forEach((row, index) => {
        const missing = getDeliverableMissingFields(row);
        if (missing.length) {
          messages.push(`Deliverable #${index + 1}: ${missing.join(", ")} required.`);
        }
        if (!row.milestoneId) {
          messages.push(`Deliverable #${index + 1}: milestone assignment required.`);
        }
        if (row.preShootScriptRequired && !row.preShootScriptDue) {
          messages.push(`Deliverable #${index + 1}: pre-shoot script due date required.`);
        }
        if (row.draftRequired && !row.draftDue) {
          messages.push(`Deliverable #${index + 1}: draft due date required.`);
        }
      });

      if (messages.length) {
        add("scheduleA.deliverables", messages.join(" "));
      }
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast({ icon: "error", title: "Please fix the highlighted fields" });
      return false;
    }

    return true;
  }, [activePaymentType, addedDeliverableCount, campaignBudget, contractForm, deliverables, requestedEffDate]);


  const handleOpenPreviewInNewTab = useCallback(() => {
    if (!previewUrl) {
      toast({
        icon: "info",
        title: "Preview required",
        text: "Generate preview first to open the PDF in a new tab.",
      });
      return;
    }

    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const handleGeneratePreview = useCallback(async () => {
    if (!resolvedBrandId || !campaignId) return;
    if (!validateForPreview()) return;

    setIsPreviewLoading(true);

    try {
      let res: any;

      if (isBulkMode) {
        const sampleInfluencer = bulkInfluencers?.[0];
        if (!sampleInfluencer?.influencerId) {
          toast({
            icon: "error",
            title: "No influencer selected",
            text: "Please select at least one influencer.",
          });
          return;
        }

        res = await api.post(
          "/contract/initiate",
          {
            brandId: resolvedBrandId,
            campaignId,
            influencerId: sampleInfluencer.influencerId,
            content: buildBulkContentPayload(),
            requestedEffectiveDate: requestedEffDate,
            requestedEffectiveDateTimezone: requestedEffTz,
            preview: true,
          },
          { responseType: "blob" }
        );
      } else if (!currentContract?.contractId) {
        res = await api.post(
          "/contract/initiate",
          {
            brandId: resolvedBrandId,
            campaignId,
            influencerId: primaryInfluencer.influencerId,
            content: buildContentPayload(),
            requestedEffectiveDate: requestedEffDate,
            requestedEffectiveDateTimezone: requestedEffTz,
            preview: true,
          },
          { responseType: "blob" }
        );
      } else if (isRejectedMeta(currentContract)) {
        res = await api.post(
          "/contract/resend",
          {
            contractId: currentContract.contractId,
            content: buildContentPayload(),
            requestedEffectiveDate: requestedEffDate,
            requestedEffectiveDateTimezone: requestedEffTz,
            preview: true,
          },
          { responseType: "blob" }
        );
      } else {
        res = await api.post(
          "/contract/brand/update",
          {
            contractId: currentContract._id || "",
            brandId: resolvedBrandId,
            preview: true,
            brandUpdates: buildBrandUpdatesPayload(),
            requestedEffectiveDate: requestedEffDate,
            requestedEffectiveDateTimezone: requestedEffTz,
          },
          { responseType: "blob" }
        );
      }

      const blob =
        res?.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: "application/pdf" });

      const contentType =
        res?.headers?.["content-type"] || res?.headers?.["Content-Type"] || blob.type;

      console.log("Preview response content-type:", contentType);
      console.log("Preview blob type:", blob.type);
      console.log("Preview blob size:", blob.size);

      if (!contentType?.includes("pdf") && blob.type && !blob.type.includes("pdf")) {
        let serverMessage = "Server did not return a PDF preview.";

        try {
          const text = await blob.text();
          console.error("Non-PDF preview response:", text);
          serverMessage = text || serverMessage;
        } catch (readErr) {
          console.error("Could not read non-PDF blob:", readErr);
        }

        throw new Error(serverMessage);
      }

      setPreviewBlob(blob);

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });

      toast({
        icon: "success",
        title: "Preview ready",
        text: isBulkMode ? "Sample preview generated for bulk contract." : undefined,
      });
    } catch (e: any) {
      console.error("Preview generation failed:", e);

      let errorText =
        e?.response?.data?.message ||
        e?.message ||
        "Could not generate preview.";

      if (e?.response?.data instanceof Blob) {
        try {
          const blobText = await e.response.data.text();
          errorText = blobText || errorText;
          console.error("Preview error blob text:", blobText);
        } catch (blobErr) {
          console.error("Could not parse error blob:", blobErr);
        }
      }

      toast({
        icon: "error",
        title: "Preview failed",
        text: errorText,
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    resolvedBrandId,
    campaignId,
    validateForPreview,
    isBulkMode,
    bulkInfluencers,
    buildBulkContentPayload,
    currentContract,
    primaryInfluencer,
    buildContentPayload,
    requestedEffDate,
    requestedEffTz,
    buildBrandUpdatesPayload,
  ]);

  const handleActualSubmit = useCallback(async (signatureBrand?: string, signatureId?: string) => {
    if (!resolvedBrandId || !campaignId) return;

    const cleanSignatureBrand = String(signatureBrand || "").trim();
    if (!cleanSignatureBrand) {
      toast({
        icon: "error",
        title: "Signature required",
        text: "Please upload or select a valid brand signature before sending.",
      });
      return;
    }

    setIsSubmitLoading(true);
    try {
      const contentWithSig = buildContentPayload(signatureId || "");

      if (isBulkMode) {
        const influencerIds = (bulkInfluencers || [])
          .map((item) => item?.influencerId)
          .filter(Boolean);

        if (!influencerIds.length) {
          toast({
            icon: "error",
            title: "No influencer selected",
            text: "Please select at least one influencer.",
          });
          return;
        }

        const res: any = await post("/contract/initiate-bulk", {
          brandId: resolvedBrandId,
          campaignId,
          influencerIds,
          content: buildBulkContentPayload(signatureId || ""),
          requestedEffectiveDate: requestedEffDate,
          requestedEffectiveDateTimezone: requestedEffTz,
          signatureBrand: cleanSignatureBrand,
          signatureId: signatureId || "",
        });

        const sentCount = res?.sentCount || res?.data?.sentCount || influencerIds.length;
        const failed = res?.failed || res?.data?.failed || [];
        toast({
          icon: failed.length ? "info" : "success",
          title: `${sentCount} contract${sentCount > 1 ? "s" : ""} sent`,
          text: failed.length ? `${failed.length} failed.` : "Bulk contract send completed.",
        });
      } else if (!currentContract?.contractId) {
        await post("/contract/initiate", {
          brandId: resolvedBrandId,
          campaignId,
          influencerId: primaryInfluencer.influencerId,
          content: contentWithSig,
          requestedEffectiveDate: requestedEffDate,
          requestedEffectiveDateTimezone: requestedEffTz,
          signatureBrand: cleanSignatureBrand,
          signatureId: signatureId || "",
        });

        toast({
          icon: "success",
          title: "Sent",
          text: "Contract created and shared.",
        });
      } else if (isRejectedMeta(currentContract)) {
        await post("/contract/resend", {
          contractId: currentContract.contractId,
          content: buildContentPayload(signatureId || ""),
          requestedEffectiveDate: requestedEffDate,
          requestedEffectiveDateTimezone: requestedEffTz,
          signatureBrand: cleanSignatureBrand,
          signatureId: signatureId || "",
        });

        toast({
          icon: "success",
          title: "Resent",
          text: "Contract resent successfully.",
        });
      } else {
        await post("/contract/brand/update", {
          contractId: currentContract._id || "",
          brandId: resolvedBrandId,
          type: 0,
          brandUpdates: buildBrandUpdatesPayload(signatureId || ""),
          signatureBrand: cleanSignatureBrand,
          signatureId: signatureId || "",
        });

        toast({
          icon: "success",
          title: "Updated",
          text: "Contract updated and shared.",
        });
      }

      await onSuccess?.();
      onClose();
    } catch (e: any) {
      toast({
        icon: "error",
        title: "Action failed",
        text: e?.response?.data?.message || e?.message || "Failed to process contract.",
      });
    } finally {
      setIsSubmitLoading(false);
    }
  }, [
    resolvedBrandId,
    campaignId,
    isBulkMode,
    bulkInfluencers,
    buildBulkContentPayload,
    requestedEffDate,
    requestedEffTz,
    currentContract,
    primaryInfluencer,
    buildContentPayload,
    buildBrandUpdatesPayload,
    onSuccess,
    onClose,
  ]);

  const getLatestBrandSignature = useCallback(async (): Promise<{
    signatureData: string;
    signatureId: string;
  }> => {
    return resolveBrandSignature();
  }, [resolveBrandSignature]);

  const openBrandSignatureModal = useCallback((tab: "upload" | "manage" = "upload") => {
    setSignatureModalInitialTab(tab);
    setShowSignatureModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!resolvedBrandId || !campaignId) return;

    if (!previewUrl) {
      toast({ icon: "info", title: "Preview required", text: "Generate preview before proceeding." });
      return;
    }

    if (!validateForPreview()) return;

    const { signatureData, signatureId } = await getLatestBrandSignature();

    if (signatureData) {
      // Signature exists — require inline agreement
      if (!inlineAgreed) {
        setInlineShowError(true);
        // Scroll to signature section
        document.getElementById("signature-section")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      await handleActualSubmit(signatureData, signatureId);
      return;
    }

    // No signature — open upload tab
    openBrandSignatureModal("upload");
  }, [
    resolvedBrandId,
    campaignId,
    previewUrl,
    validateForPreview,
    getLatestBrandSignature,
    inlineAgreed,
    handleActualSubmit,
    openBrandSignatureModal,
  ]);
  const addedDeliverables = deliverables
    .slice(0, addedDeliverableCount)
    .filter((row) => hasMeaningfulDeliverable(row));
  const activeDeliverables = deliverables.slice(addedDeliverableCount);
  const firstDeliverable = deliverables[0] || createDefaultScheduleDeliverable();
  const isDraftRequiredForAnyDeliverable = deliverables.some((row) => row.draftRequired);

  const submitLabel = isBulkMode
    ? "Send Bulk Contracts"
    : !currentContract?.contractId
      ? "Send Contract"
      : isRejectedMeta(currentContract)
        ? "Resend Contract"
        : "Update Contract";

  const todayStr = toInputDate(new Date());
  const influencerFeeValue = Number(contractForm.scheduleA.commercial.influencerBudget || "0");
  const campaignBudgetValue = Number(campaignBudget || 0);
  const isCompensationReady =
    activePaymentType === PAYMENT_TYPE.GIFTING ||
    (influencerFeeValue > 0 && (!campaignBudgetValue || influencerFeeValue <= campaignBudgetValue));
  const disablePaymentDependentSections = activePaymentType !== PAYMENT_TYPE.GIFTING && !isCompensationReady;
  const prefilledCampaignCountries = useMemo(
    () => normalizeCountryOptions(Array.isArray(contractPrefill?.campaignCountries) ? contractPrefill.campaignCountries : []),
    [contractPrefill]
  );

  const countryLookupOptions = useMemo(
    () => normalizeCountryOptions([...apiCountryOptions, ...prefilledCampaignCountries]),
    [apiCountryOptions, prefilledCampaignCountries]
  );

  const campaignCountryOptions = useMemo(
    () =>
      uniqStrings([
        ...countryLookupOptions.map((row) => row.name),
        ...csvToTags(getAtPath(contractForm, "campaign.territoryTargetCountry")),
      ]).map((name) => ({
        value: name,
        label: name,
      })),
    [countryLookupOptions, contractForm.campaign.territoryTargetCountry]
  );

  const selectedCampaignCountryTags = useMemo(() => {
    const selectedIds = Array.isArray(contractForm.campaign.territoryTargetCountryIds)
      ? contractForm.campaign.territoryTargetCountryIds.map(String).filter(Boolean)
      : [];

    if (selectedIds.length && countryLookupOptions.length) {
      const byId = countryLookupOptions.reduce<Record<string, ContractCountryOption>>((acc, row) => {
        acc[String(row.id)] = row;
        return acc;
      }, {});
      const names = selectedIds.map((id) => byId[id]?.name).filter(Boolean) as string[];
      if (names.length) return uniqStrings(names);
    }

    return csvToTags(getAtPath(contractForm, "campaign.territoryTargetCountry"));
  }, [contractForm.campaign.territoryTargetCountryIds, contractForm.campaign.territoryTargetCountry, countryLookupOptions]);

  const handleCampaignCountryChange = useCallback((next: string[]) => {
    const byName = countryLookupOptions.reduce<Record<string, ContractCountryOption>>((acc, row) => {
      acc[row.name.toLowerCase()] = row;
      acc[row.label.toLowerCase()] = row;
      if (row.code) acc[row.code.toLowerCase()] = row;
      return acc;
    }, {});

    const cleanNames = uniqStrings(next);
    const selectedRows = cleanNames
      .map((name) => byName[name.toLowerCase()])
      .filter(Boolean) as ContractCountryOption[];

    const selectedIds = uniqStrings(selectedRows.map((row) => row.id));

    setContractForm((prev) => {
      const updated = deepClone(prev);
      updated.campaign.territoryTargetCountry = tagsToCsv(cleanNames);
      updated.campaign.territoryTargetCountryIds = selectedIds;
      return updated;
    });
  }, [countryLookupOptions]);

  const showBrandPocDesignationField = useMemo(() => {
    const fromRequiredSections = Array.isArray(contractPrefill?.requiredSections)
      ? contractPrefill.requiredSections.some((section: any) =>
        section?.key === "brandOverview" &&
        Array.isArray(section?.fields) &&
        section.fields.some((field: any) => field?.key === "brand.brandPocDesignation")
      )
      : false;

    return fromRequiredSections || Boolean(String(getAtPath(contractForm, "brand.brandPocDesignation") || "").trim());
  }, [contractPrefill, contractForm.brand.brandPocDesignation]);
  const fixedMilestonesPreview = useMemo(
    () =>
      buildFixedPaymentMilestonesForUi(
        influencerFeeValue,
        contractForm.scheduleA.commercial.paymentStructure,
        contractForm.scheduleA.commercial.fixedCustomAdvancePercent,
        contractForm.scheduleA.commercial.fixedCustomDeliverablesPercent,
        contractForm.scheduleA.commercial.milestones
      ),
    [
      influencerFeeValue,
      contractForm.scheduleA.commercial.paymentStructure,
      contractForm.scheduleA.commercial.fixedCustomAdvancePercent,
      contractForm.scheduleA.commercial.fixedCustomDeliverablesPercent,
      contractForm.scheduleA.commercial.milestones,
    ]
  );
  const deliverableMilestoneOptions = useMemo(() => {
    const rows = activePaymentType === PAYMENT_TYPE.FIXED
      ? fixedMilestonesPreview
      : contractForm.scheduleA.commercial.milestones;
    return getDeliverableMilestones(rows);
  }, [activePaymentType, fixedMilestonesPreview, contractForm.scheduleA.commercial.milestones]);
  const defaultDeliverableMilestone = getFallbackDeliverableMilestone(deliverableMilestoneOptions);

  const milestoneSequenceText =
    activePaymentType === PAYMENT_TYPE.GIFTING
      ? PRODUCT_GIFTING_MILESTONE_SEQUENCE_TEXT
      : MILESTONE_RELEASE_SEQUENCE_TEXT;

  const usageRightOptions = useMemo(
    () =>
      contractForm.scheduleA.usageRights.rows.map((row) => ({
        value: row.usageRight,
        label: row.usageRight,
      })),
    [contractForm.scheduleA.usageRights.rows]
  );

  const selectedUsageRights = useMemo(
    () =>
      contractForm.scheduleA.usageRights.rows
        .filter((row) => row.selected)
        .map((row) => row.usageRight),
    [contractForm.scheduleA.usageRights.rows]
  );

  const setSelectedUsageRights = useCallback(
    (next: string[]) => {
      setContractField(
        "scheduleA.usageRights.rows",
        contractForm.scheduleA.usageRights.rows.map((row) => ({
          ...row,
          selected: next.includes(row.usageRight),
        }))
      );
    },
    [contractForm.scheduleA.usageRights.rows, setContractField]
  );
  const handlePaymentTypeChange = useCallback((value: string) => {
    const nextType = normalizePaymentType(value);
    const currentType = normalizePaymentType(contractForm.campaign.paymentType);
    const currentCashBudget = String(
      contractForm.scheduleA.commercial.influencerBudget ||
      contractForm.scheduleA.commercial.totalCampaignFee ||
      ""
    ).trim();

    if (
      currentType !== PAYMENT_TYPE.GIFTING &&
      currentCashBudget &&
      Number(currentCashBudget) > 0
    ) {
      setLastCashInfluencerBudget(currentCashBudget);
    }

    const budgetToRestore =
      nextType !== PAYMENT_TYPE.GIFTING && currentType === PAYMENT_TYPE.GIFTING
        ? lastCashInfluencerBudget
        : "";

    setContractForm((prev) => {
      const previousType = normalizePaymentType(prev.campaign.paymentType);
      const next = deepClone(prev);
      const existingBudget = String(
        next.scheduleA.commercial.influencerBudget ||
        next.scheduleA.commercial.totalCampaignFee ||
        ""
      ).trim();

      next.campaign.paymentType = nextType;

      if (
        nextType !== PAYMENT_TYPE.GIFTING &&
        previousType === PAYMENT_TYPE.GIFTING &&
        budgetToRestore &&
        (!existingBudget || Number(existingBudget) === 0)
      ) {
        next.scheduleA.commercial.influencerBudget = budgetToRestore;
        next.scheduleA.commercial.totalCampaignFee = budgetToRestore;
      }

      if (nextType === PAYMENT_TYPE.FIXED) {
        next.scheduleA.commercial.paymentStructure = normalizePaymentStructureForUi(
          next.scheduleA.commercial.paymentStructure
        );
        next.scheduleA.commercial.fixedCustomAdvancePercent =
          next.scheduleA.commercial.fixedCustomAdvancePercent || "";
        next.scheduleA.commercial.fixedCustomDeliverablesPercent =
          next.scheduleA.commercial.fixedCustomDeliverablesPercent || "";
        next.scheduleA.commercial.milestones = buildFixedPaymentMilestonesForUi(
          next.scheduleA.commercial.influencerBudget,
          next.scheduleA.commercial.paymentStructure,
          next.scheduleA.commercial.fixedCustomAdvancePercent,
          next.scheduleA.commercial.fixedCustomDeliverablesPercent,
          next.scheduleA.commercial.milestones
        );
      }

      if (nextType === PAYMENT_TYPE.MILESTONE) {
        next.scheduleA.commercial.paymentStructure = "";
        next.scheduleA.commercial.milestones =
          next.scheduleA.commercial.milestones.filter((row) => !row.isSystemGenerated).length
            ? next.scheduleA.commercial.milestones.filter((row) => !row.isSystemGenerated)
            : [createDefaultCommercialMilestone()];
      }

      if (nextType === PAYMENT_TYPE.GIFTING) {
        next.scheduleA.commercial.milestones = [
          {
            ...createDefaultCommercialMilestone(1),
            milestoneName: "Product Gifting Deliverables",
            paymentAmount: "0",
            allowDeliverables: true,
          },
        ];
        next.scheduleA.commercial.paymentStructure = "";
        next.scheduleA.commercial.totalCampaignFee = "0";
        next.scheduleA.commercial.influencerBudget = "0";
      }

      return next;
    });
  }, [
    contractForm.campaign.paymentType,
    contractForm.scheduleA.commercial.influencerBudget,
    contractForm.scheduleA.commercial.totalCampaignFee,
    lastCashInfluencerBudget,
  ]);

  const handleOpenDeliverableForMilestone = useCallback(
    (milestone: ContractMilestone) => {
      if (!milestone || milestone.allowDeliverables === false) return;

      const activeIndex = addedDeliverableCount;
      const existingActiveRow = deliverables[activeIndex];

      if (existingActiveRow) {
        setDeliverables((prev) =>
          prev.map((item, index) =>
            index === activeIndex
              ? {
                ...item,
                milestoneId: milestone.milestoneId,
                milestoneName: milestone.milestoneName,
              }
              : item
          )
        );

        window.setTimeout(() => {
          document
            .getElementById(`deliverable-card-${existingActiveRow.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 0);

        return;
      }

      const nextRow = createBlankActiveDeliverable(
        deliverables.length + 1,
        milestone
      );

      setDeliverables((prev) => [...prev, nextRow]);

      window.setTimeout(() => {
        document
          .getElementById(`deliverable-card-${nextRow.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 0);
    },
    [addedDeliverableCount, deliverables]
  );

  const handleAddDeliverable = useCallback(() => {
    const currentIndex = addedDeliverableCount;
    const currentRow = deliverables[currentIndex];

    if (!currentRow) {
      if (activePaymentType === PAYMENT_TYPE.FIXED) {
        toast({
          icon: "info",
          title: "Select milestone",
          text: "Click + Deliverable from the enabled system milestone first.",
        });
        return;
      }

      setDeliverables([
        createBlankActiveDeliverable(1, defaultDeliverableMilestone),
      ]);
      setAddedDeliverableCount(0);
      return;
    }

    const missing = getDeliverableMissingFields(currentRow);
    if (missing.length) {
      toast({
        icon: "error",
        title: "Complete deliverable details",
        text: `Please add ${missing.join(", ")} before adding this deliverable.`,
      });
      return;
    }

    setAddedDeliverableCount((prev) => prev + 1);

    // Fixed Payment: after saving this deliverable, do not auto-open another form.
    // Brand must click + Deliverable again from the enabled milestone row.
    if (activePaymentType === PAYMENT_TYPE.FIXED) {
      return;
    }

    const nextRow = createBlankActiveDeliverable(
      deliverables.length + 1,
      defaultDeliverableMilestone
    );

    setDeliverables((prev) => [...prev, nextRow]);

    window.setTimeout(() => {
      document
        .getElementById(`deliverable-card-${nextRow.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }, [
    activePaymentType,
    addedDeliverableCount,
    deliverables,
    defaultDeliverableMilestone,
  ]);

  if (!open) return null;
  if (!isBulkMode && !primaryInfluencer) return null;
  if (isBulkMode && !bulkInfluencers?.length) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <ContractSidebarShell
        isOpen={open}
        onClose={onClose}
        title={submitLabel}
        subtitle={
          isBulkMode
            ? `${campaignTitle || contractForm.campaign.campaignTitleOrId || "Agreement"} • ${bulkInfluencers.length} influencers selected`
            : `${campaignTitle || contractForm.campaign.campaignTitleOrId || "Agreement"} • ${primaryInfluencer?.name || ""}`
        }
        campaignPaymentType={activePaymentType}
        onCampaignPaymentTypeChange={handlePaymentTypeChange}
        previewUrl={previewUrl}
        previewBlob={previewBlob}
        onClosePreview={clearPreview}
        onDownload={() =>
          handleDownloadContract(
            `${(campaignTitle || contractForm.campaign.campaignTitleOrId || "contract")
              .replace(/\s+/g, "_")}.pdf`
          )
        }
        isDownloading={contractLoading}
        onOpenInNewTab={handleOpenPreviewInNewTab}
        footer={
          <>
            <Button
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={isPreviewLoading || isSubmitLoading || !resolvedBrandId}
            >
              {isPreviewLoading ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span> Generating…
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-5 w-5" /> Preview
                </>
              )}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!previewUrl || isSubmitLoading || isPreviewLoading || !resolvedBrandId}
            >
              {isSubmitLoading ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span> Processing…
                </>
              ) : isBulkMode ? (
                `${submitLabel}${bulkInfluencers.length ? ` (${bulkInfluencers.length})` : ""}`
              ) : (
                submitLabel
              )}
            </Button>
          </>
        }
      >
        {contractLoading ? (
          <div className="p-6 text-sm text-gray-600">Loading contract…</div>
        ) : (
          <>
            <SidebarSection title="Brand Overview" icon={<FileText className="h-4 w-4" />}>
              <div className="space-y-5">
                <FloatingInput
                  id="brand-legal-name"
                  label="Brand Legal Name"
                  info={SIDEBAR_TOOLTIPS.brandLegalName}
                  value={getAtPath(contractForm, "brand.legalName")}
                  onValueChange={(value: string) =>
                    setContractField("brand.legalName", value)
                  }
                  state={formErrors["brand.legalName"] ? "error" : undefined}
                  errorText={formErrors["brand.legalName"] || ""}
                  disabled
                  required
                />

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <FloatingInput
                    id="brand-poc"
                    label="Brand Contact Person Name (POC)"
                    info={SIDEBAR_TOOLTIPS.brandPoc || SIDEBAR_TOOLTIPS.brandContactPerson}
                    value={getAtPath(contractForm, "brand.brandPoc") || getAtPath(contractForm, "brand.contactPersonName")}
                    onValueChange={(value: string) =>
                      setContractForm((prev) => ({
                        ...prev,
                        brand: {
                          ...prev.brand,
                          brandPoc: value,
                          contactPersonName: value,
                        },
                      }))
                    }
                    state={formErrors["brand.brandPoc"] ? "error" : undefined}
                    errorText={formErrors["brand.brandPoc"] || ""}
                    required
                  />

                  <FloatingInput
                    id="brand-poc-designation"
                    label="Brand Contact Person Designation"
                    info={SIDEBAR_TOOLTIPS.brandPocDesignation}
                    value={getAtPath(contractForm, "brand.brandPocDesignation")}
                    onValueChange={(value: string) =>
                      setContractField("brand.brandPocDesignation", value)
                    }
                  />
                </div>

                <FloatingInput
                  id="brand-notice-email"
                  label="Brand Notice Email"
                  info={SIDEBAR_TOOLTIPS.brandNoticeEmail}
                  value={getAtPath(contractForm, "brand.noticeEmail")}
                  onValueChange={(value: string) =>
                    setContractField("brand.noticeEmail", value)
                  }
                  disabled
                  required
                />

                <LabeledTextarea
                  id="brand-legal-address"
                  label="Brand Billing / Legal Address"
                  info={SIDEBAR_TOOLTIPS.brandBillingAddress}
                  value={getAtPath(contractForm, "brand.billingAddress")}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContractField("brand.billingAddress", e.target.value)
                  }
                  required
                />

                <FloatingDateInput
                  id="requested-effective-date"
                  label="Effective Date"
                  info={SIDEBAR_TOOLTIPS.requestedEffectiveDate}
                  type="date"
                  value={requestedEffDate}
                  min={todayStr}
                  onValueChange={(value) => {
                    setRequestedEffDate(value);
                    setContractField("campaign.effectiveDate", value);
                  }}
                  state={formErrors["requestedEffDate"] ? "error" : undefined}
                  errorText={formErrors["requestedEffDate"] || ""}
                  required
                />

                <LabeledTextarea
                  id="campaign-products-services"
                  label="Products / Services Covered"
                  info={SIDEBAR_TOOLTIPS.campaignProductsServices}
                  value={getAtPath(contractForm, "campaign.productsServicesCovered")}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContractField("campaign.productsServicesCovered", e.target.value)
                  }
                  state={formErrors["campaign.productsServicesCovered"] ? "error" : undefined}
                  errorText={formErrors["campaign.productsServicesCovered"] || ""}
                  required
                />
              </div>
            </SidebarSection>

            <SidebarSection title="Campaign Overview" icon={<Info className="h-4 w-4" />}>
              <div className="space-y-5">
                <FloatingInput
                  id="campaign-name"
                  label="Campaign Title"
                  info={SIDEBAR_TOOLTIPS.campaignTitle}
                  value={getAtPath(contractForm, "campaign.campaignTitleOrId")}
                  onValueChange={(value: string) =>
                    setContractField("campaign.campaignTitleOrId", value)
                  }
                  state={formErrors["campaign.campaignTitleOrId"] ? "error" : undefined}
                  errorText={formErrors["campaign.campaignTitleOrId"] || ""}
                  disabled
                  required
                />

                <FloatingMultiSelect
                  label="Target Country"
                  info={SIDEBAR_TOOLTIPS.campaignTerritory}
                  value={selectedCampaignCountryTags}
                  options={campaignCountryOptions}
                  onValueChange={handleCampaignCountryChange}
                  dropdownDirection="up"
                  includeAll={false}
                  searchable
                  searchPlaceholder="Search country..."
                />

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <FloatingSelect
                    label="Time Zone"
                    info={SIDEBAR_TOOLTIPS.timezone}
                    value={requestedEffTz}
                    onValueChange={(value) => {
                      setRequestedEffTz(value);
                      setContractField("campaign.timezone", value);
                    }}
                    searchable
                  >
                    {tzOptions.map((option, index) => (
                      <SelectItem key={`${option.value}-${index}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>

                  <FloatingSelect
                    label="Campaign Payment Type"
                    info={SIDEBAR_TOOLTIPS.campaignPaymentType}
                    value={activePaymentType}
                    onValueChange={handlePaymentTypeChange}
                  >
                    {PAYMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>
                </div>
              </div>
            </SidebarSection>

            <SidebarSection title={activePaymentType === PAYMENT_TYPE.GIFTING ? "Product Compensation Terms" : "Commercial and Payment Terms"} icon={<FileText className="h-4 w-4" />}>
              <div className="space-y-4">
                {activePaymentType === PAYMENT_TYPE.GIFTING ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">
                    <div className="font-semibold text-neutral-900">Product Compensation Type</div>
                    <div title="Creator compensation is provided through products instead of monetary payment.">Product Gifting</div>
                    <div className="mt-2 font-semibold text-neutral-900">Validation</div>
                    <div>No cash compensation is permitted in Product Gifting campaigns. All milestone amounts must remain $0.</div>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FloatingInput
                    id="total-campaign-fee"
                    label={activePaymentType === PAYMENT_TYPE.GIFTING ? "Creator Cash Compensation" : "Total Influencer Compensation"}
                    info={activePaymentType === PAYMENT_TYPE.GIFTING ? SIDEBAR_TOOLTIPS.creatorCashCompensation : SIDEBAR_TOOLTIPS.influencerBudget}
                    type="number"
                    value={activePaymentType === PAYMENT_TYPE.GIFTING ? "0" : getAtPath(contractForm, "scheduleA.commercial.influencerBudget")}
                    onValueChange={(value: string) => {
                      if (activePaymentType !== PAYMENT_TYPE.GIFTING && Number(value) > 0) {
                        setLastCashInfluencerBudget(value);
                      }
                      setContractForm((prev) => ({
                        ...prev,
                        scheduleA: {
                          ...prev.scheduleA,
                          commercial: {
                            ...prev.scheduleA.commercial,
                            influencerBudget: value,
                            totalCampaignFee: value,
                          },
                        },
                      }));
                    }}
                    state={
                      formErrors["scheduleA.commercial.influencerBudget"]
                        ? "error"
                        : undefined
                    }
                    errorText={formErrors["scheduleA.commercial.influencerBudget"] || ""}
                    disabled={activePaymentType === PAYMENT_TYPE.GIFTING}
                    required
                  />

                  {activePaymentType !== PAYMENT_TYPE.GIFTING ? (
                    <FloatingSelect
                      label="Currency"
                      info={SIDEBAR_TOOLTIPS.currency}
                      value="USD"
                      onValueChange={() => setContractField("scheduleA.commercial.currency", "USD")}
                      searchable={false}
                      disabled
                      state={
                        formErrors["scheduleA.commercial.currency"] ? "error" : undefined
                      }
                      errorText={formErrors["scheduleA.commercial.currency"] || ""}
                      required
                    >
                      <SelectItem value="USD">$ USD</SelectItem>
                    </FloatingSelect>
                  ) : null}
                </div>

                {activePaymentType === PAYMENT_TYPE.FIXED ? (
                  <>
                    <FloatingSelect
                      label="Payment Distribution"
                      info={SIDEBAR_TOOLTIPS.paymentStructure}
                      value={
                        getAtPath(contractForm, "scheduleA.commercial.paymentStructure") ||
                        PAYMENT_STRUCTURE_DUMMY_VALUE
                      }
                      onValueChange={(value) => {
                        const nextValue = value === PAYMENT_STRUCTURE_DUMMY_VALUE ? "" : value;

                        setContractForm((prev) => {
                          const next = deepClone(prev);

                          next.scheduleA.commercial.paymentStructure = nextValue;

                          if (nextValue === FIXED_PAYMENT_STRUCTURE.CUSTOM_SPLIT) {
                            next.scheduleA.commercial.fixedCustomAdvancePercent = "";
                            next.scheduleA.commercial.fixedCustomDeliverablesPercent = "";
                          }

                          next.scheduleA.commercial.milestones = buildFixedPaymentMilestonesForUi(
                            next.scheduleA.commercial.influencerBudget,
                            nextValue,
                            next.scheduleA.commercial.fixedCustomAdvancePercent,
                            next.scheduleA.commercial.fixedCustomDeliverablesPercent,
                            next.scheduleA.commercial.milestones
                          );

                          return next;
                        });
                      }}
                      searchable={false}
                    >
                      {PAYMENT_STRUCTURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-baseline gap-2">
                            <span className="text-[15px] font-semibold text-[#1F1F1F]">
                              {option.label}
                            </span>
                            {option.description ? (
                              <span className="text-xs font-normal text-[#B3B3B3]">
                                ({option.description})
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </FloatingSelect>

                    {normalizePaymentStructureForUi(
                      contractForm.scheduleA.commercial.paymentStructure
                    ) === FIXED_PAYMENT_STRUCTURE.CUSTOM_SPLIT ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FloatingInput
                          id="fixed-custom-advance-percent"
                          label="Advance Payment (%)"
                          type="number"
                          info={SIDEBAR_TOOLTIPS.advancePaymentPercent}
                          value={contractForm.scheduleA.commercial.fixedCustomAdvancePercent}
                          onValueChange={(value: string) =>
                            setContractForm((prev) => ({
                              ...prev,
                              scheduleA: {
                                ...prev.scheduleA,
                                commercial: {
                                  ...prev.scheduleA.commercial,
                                  fixedCustomAdvancePercent: value,
                                  fixedCustomDeliverablesPercent:
                                    value && !Number.isNaN(Number(value))
                                      ? String(Math.max(0, 100 - Number(value)))
                                      : prev.scheduleA.commercial.fixedCustomDeliverablesPercent,
                                },
                              },
                            }))
                          }
                          state={formErrors["scheduleA.commercial.customSplit"] ? "error" : undefined}
                          errorText={formErrors["scheduleA.commercial.customSplit"] || ""}
                        />

                        <FloatingInput
                          id="fixed-custom-deliverables-percent"
                          label="Campaign Deliverables (%)"
                          type="number"
                          info={SIDEBAR_TOOLTIPS.deliverablesPaymentPercent}
                          value={contractForm.scheduleA.commercial.fixedCustomDeliverablesPercent}
                          onValueChange={(value: string) =>
                            setContractForm((prev) => ({
                              ...prev,
                              scheduleA: {
                                ...prev.scheduleA,
                                commercial: {
                                  ...prev.scheduleA.commercial,
                                  fixedCustomDeliverablesPercent: value,
                                  fixedCustomAdvancePercent:
                                    value && !Number.isNaN(Number(value))
                                      ? String(Math.max(0, 100 - Number(value)))
                                      : prev.scheduleA.commercial.fixedCustomAdvancePercent,
                                },
                              },
                            }))
                          }
                          state={formErrors["scheduleA.commercial.customSplit"] ? "error" : undefined}
                          errorText={formErrors["scheduleA.commercial.customSplit"] || ""}
                        />
                      </div>
                    ) : null}

                    {/* 
                    <FloatingInput
                      id="commercial-custom-split"
                      label="Custom"
                      info={SIDEBAR_TOOLTIPS.customSplit}
                      value={getAtPath(contractForm, "scheduleA.commercial.customSplit")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.commercial.customSplit", value)
                      }
                    /> */}

                    <LabeledTextarea
                      id="advance-payment-trigger"
                      label="Advance Payment Trigger"
                      info={SIDEBAR_TOOLTIPS.advancePaymentTrigger}
                      value={getAtPath(contractForm, "scheduleA.commercial.advancePaymentTrigger")}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setContractField("scheduleA.commercial.advancePaymentTrigger", e.target.value)
                      }
                    />

                    <LabeledTextarea
                      id="remaining-payment-trigger"
                      label="Remaining Payment Trigger"
                      info={SIDEBAR_TOOLTIPS.remainingPaymentTrigger}
                      value={getAtPath(contractForm, "scheduleA.commercial.remainingPaymentTrigger")}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setContractField(
                          "scheduleA.commercial.remainingPaymentTrigger",
                          e.target.value
                        )
                      }
                    />
                  </>
                ) : null}

                {activePaymentType !== PAYMENT_TYPE.GIFTING ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FloatingSelect
                      label="Payment Processor Fees Borne By"
                      info={SIDEBAR_TOOLTIPS.processorFeesBorneBy}
                      value={getAtPath(
                        contractForm,
                        "scheduleA.commercial.paymentProcessorFeesBorneBy"
                      )}
                      onValueChange={(value) =>
                        setContractField(
                          "scheduleA.commercial.paymentProcessorFeesBorneBy",
                          value
                        )
                      }
                      searchable={false}
                    >
                      {PROCESSOR_FEE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </FloatingSelect>

                    {getAtPath(contractForm, "scheduleA.commercial.paymentProcessorFeesBorneBy") === "Split" ? (
                      <FloatingInput
                        id="processor-fees-notes"
                        label="Processing Fees Notes"
                        info={SIDEBAR_TOOLTIPS.processorFeesNotes}
                        value={getAtPath(
                          contractForm,
                          "scheduleA.commercial.paymentProcessorFeesNotes"
                        )}
                        onValueChange={(value: string) =>
                          setContractField(
                            "scheduleA.commercial.paymentProcessorFeesNotes",
                            value
                          )
                        }
                      />
                    ) : null}
                  </div>
                ) : null}

                {activePaymentType !== PAYMENT_TYPE.GIFTING ? (
                  <div className="w-full">
                    <div
                      className={cn(
                        "rounded-[12px] overflow-hidden",
                        "bg-[color:var(--Fill-Inverse-strong,#FFF)]",
                        "border border-[color:var(--Light-Border-Primary,#D6D6D6)]",
                        "shadow-none"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between gap-3 px-4 py-3 border-b",
                          "border-[color:var(--Light-Border-Primary,#D6D6D6)]"
                        )}
                      >
                        <div
                          title={SIDEBAR_TOOLTIPS.laneAMarketplaceFeeNote}
                          className={cn(
                            "min-w-0 truncate",
                            "text-[color:var(--Light-Text-Secondary,#969696)]",
                            "text-[16px] leading-[24px] font-normal",
                            "font-[var(--Font-Family-Inter,Inter)]"
                          )}
                        >
                          Lane A Marketplace Fee
                        </div>
                      </div>

                      <div
                        title={SIDEBAR_TOOLTIPS.laneAMarketplaceFeeNote}
                        className={cn(
                          "min-h-[120px] px-4 py-3",
                          "text-[#1a1a1a]",
                          "text-[14px] leading-[20px]",
                          "whitespace-pre-wrap"
                        )}
                      >
                        {getAtPath(
                          contractForm,
                          "scheduleA.commercial.laneAMarketplaceFeeNote"
                        ) || LANE_A_MARKETPLACE_FEE_NOTE}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* <LabeledTextarea
                  id="lane-a-marketplace-fee-note"
                  label="Lane A Marketplace Fee Note"
                  info={SIDEBAR_TOOLTIPS.laneAMarketplaceFeeNote}
                  value={getAtPath(
                    contractForm,
                    "scheduleA.commercial.laneAMarketplaceFeeNote"
                  )}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContractField(
                      "scheduleA.commercial.laneAMarketplaceFeeNote",
                      e.target.value
                    )
                  }
                  disabled
                /> */}
              </div>
            </SidebarSection>

            <SidebarSection
              title="Deliverables and Publication Timeline"
              icon={<ClipboardText className="h-4 w-4" />}
            >
              <>
                {disablePaymentDependentSections ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Complete Total Influencer Compensation before adding milestones or deliverables.
                  </div>
                ) : null}
                <fieldset disabled={disablePaymentDependentSections} className="space-y-5 disabled:opacity-60">

                  {activePaymentType === PAYMENT_TYPE.FIXED && isCompensationReady ? (
                    <FixedPaymentMilestonesPreview
                      rows={fixedMilestonesPreview}
                      onAddDeliverable={handleOpenDeliverableForMilestone}
                    />
                  ) : null}

                  {(activePaymentType === PAYMENT_TYPE.MILESTONE || activePaymentType === PAYMENT_TYPE.GIFTING) ? (
                    <>
                      <CommercialMilestonesEditor
                        rows={contractForm.scheduleA.commercial.milestones}
                        error={formErrors["scheduleA.commercial.milestones"]}
                        disabled={!isCompensationReady}
                        isGifting={activePaymentType === PAYMENT_TYPE.GIFTING}
                        onChange={(rows) =>
                          setContractField("scheduleA.commercial.milestones", rows)
                        }
                      />
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-700">
                        {milestoneSequenceText}
                      </div>
                    </>
                  ) : null}

                  {formErrors["scheduleA.deliverables"] ? (
                    <div className="text-xs font-medium text-red-600">
                      {formErrors["scheduleA.deliverables"]}
                    </div>
                  ) : null}

                  {activeDeliverables.map((row, index) => (
                    <div
                      key={row.id}
                      id={`deliverable-card-${row.id}`}
                      className="space-y-4 bg-white p-4"
                      style={{
                        borderRadius: "var(--Border-Radius-S, 0.5rem)",
                        border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-neutral-900">
                          Deliverable #{addedDeliverableCount + index + 1}
                        </div>

                        {activeDeliverables.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDeliverables((prev) =>
                                prev.filter((item) => item.id !== row.id)
                              )
                            }
                            className="text-xs font-medium text-neutral-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      {(activePaymentType === PAYMENT_TYPE.MILESTONE || activePaymentType === PAYMENT_TYPE.GIFTING) ? (
                        <FloatingSelect
                          label="Assigned Milestone"
                          value={row.milestoneId || defaultDeliverableMilestone?.milestoneId || ""}
                          onValueChange={(value) =>
                            setDeliverables((prev) =>
                              prev.map((item) => {
                                if (item.id !== row.id) return item;
                                const milestone = deliverableMilestoneOptions.find(
                                  (option) => option.milestoneId === value
                                );
                                return {
                                  ...item,
                                  milestoneId: milestone?.milestoneId || "",
                                  milestoneName: milestone?.milestoneName || "",
                                };
                              })
                            )
                          }
                          searchable={false}
                        >
                          {deliverableMilestoneOptions.map((option) => (
                            <SelectItem key={option.milestoneId} value={option.milestoneId}>
                              {option.milestoneName}
                            </SelectItem>

                          ))}
                        </FloatingSelect>
                      ) : null}

                      <FloatingInput
                        id={`deliverable-name-${row.id}`}
                        label="Deliverable Name"
                        info={SIDEBAR_TOOLTIPS.deliverableName}
                        value={row.deliverableName}
                        onValueChange={(value: string) =>
                          setDeliverables((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, deliverableName: value } : item
                            )
                          )
                        }
                      />

                      <FloatingSelect
                        label="Deliverable Type"
                        info={SIDEBAR_TOOLTIPS.deliverableType}
                        value={row.deliverableFormat}
                        onValueChange={(value) =>
                          setDeliverables((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? {
                                  ...item,
                                  deliverableFormat: value,
                                  deliverableName: item.deliverableName || value,
                                }
                                : item
                            )
                          )
                        }
                        searchable={false}
                        required
                      >
                        {DELIVERY_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </FloatingSelect>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr_140px]">
                        <FloatingSelect
                          label="Aspect Ratio"
                          value={row.aspectRatio}
                          onValueChange={(value) =>
                            setDeliverables((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, aspectRatio: value } : item
                              )
                            )
                          }
                          searchable={false}
                        >
                          {ASPECT_RATIO_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </FloatingSelect>

                        <FloatingMultiSelect
                          label="Platform"
                          info={SIDEBAR_TOOLTIPS.platform}
                          value={csvToTags(row.platform)}
                          options={PLATFORM_OPTIONS}
                          onValueChange={(next) =>
                            setDeliverables((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, platform: tagsToCsv(next) }
                                  : item
                              )
                            )
                          }
                          includeAll={false}
                          searchable={false}
                        />

                        <div className="flex my-2 items-center justify-between rounded-m border border-neutral-300 bg-white px-3">
                          <button
                            type="button"
                            onClick={() =>
                              setDeliverables((prev) =>
                                prev.map((item) => {
                                  if (item.id !== row.id) return item;
                                  const nextQty = Math.max(1, Number(item.qty || "1") - 1);
                                  return { ...item, qty: String(nextQty) };
                                })
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <div className="text-center">
                            <div className="text-base font-semibold text-neutral-900">
                              {row.qty || "1"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setDeliverables((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, qty: String(Number(item.qty || "1") + 1) }
                                    : item
                                )
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <LabeledTextarea
                        id={`content-specification-${row.id}`}
                        label="Specifications"
                        info={SIDEBAR_TOOLTIPS.minimumVideoSpecs}
                        value={row.contentSpecification}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setDeliverables((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, contentSpecification: e.target.value }
                                : item
                            )
                          )
                        }
                      />

                      <div className="space-y-3 rounded-m border border-neutral-200 bg-white p-4">
                        <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                          <ContractCheckbox
                            checked={row.preShootScriptRequired}
                            onCheckedChange={(checked) => {
                              setDeliverables((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? {
                                      ...item,
                                      preShootScriptRequired: checked,
                                      preShootScriptDue: checked ? item.preShootScriptDue : "",
                                      preShootScriptReviewBusinessDays: checked
                                        ? item.preShootScriptReviewBusinessDays || "2"
                                        : "2",
                                    }
                                    : item
                                )
                              );
                            }}
                            ariaLabel="Pre-Shoot Script Required"
                          />
                          <span className="text-[#B8B8B8]" title={SIDEBAR_TOOLTIPS.preShootScriptRequired}>Pre-Shoot Script Required</span>
                        </label>

                        {row.preShootScriptRequired ? (
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <FloatingDateInput
                              id={`pre-shoot-script-due-${row.id}`}
                              label="Pre-Shoot Script Due Date"
                              info={SIDEBAR_TOOLTIPS.preShootScriptDue}
                              type="date"
                              value={row.preShootScriptDue}
                              min={todayStr}
                              onValueChange={(value) =>
                                setDeliverables((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, preShootScriptDue: value } : item
                                  )
                                )
                              }
                            />

                            <FloatingInput
                              id={`pre-shoot-review-days-${row.id}`}
                              label="Script Review Business Days"
                              info={SIDEBAR_TOOLTIPS.preShootReviewDays}
                              type="number"
                              value={row.preShootScriptReviewBusinessDays}
                              onValueChange={(value: string) =>
                                setDeliverables((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id
                                      ? { ...item, preShootScriptReviewBusinessDays: value }
                                      : item
                                  )
                                )
                              }
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-m border border-neutral-200 bg-white p-4">
                        <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                          <ContractCheckbox
                            checked={row.draftRequired}
                            onCheckedChange={(checked) =>
                              setDeliverables((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, draftRequired: checked, draftDue: checked ? item.draftDue : "" }
                                    : item
                                )
                              )
                            }
                            ariaLabel="Draft Required"
                          />
                          <span className="text-[#B8B8B8]" title={SIDEBAR_TOOLTIPS.draftRequired}>Draft Required</span>
                        </label>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          <FloatingDateInput
                            id={`draft-due-${row.id}`}
                            label="Draft Due Date"
                            info={SIDEBAR_TOOLTIPS.draftDue}
                            type="date"
                            value={row.draftDue}
                            min={todayStr}
                            disabled={!row.draftRequired}
                            onValueChange={(value) =>
                              setDeliverables((prev) =>
                                prev.map((item) =>
                                  item.id === row.id ? { ...item, draftDue: value } : item
                                )
                              )
                            }
                          />

                          <FloatingDateInput
                            id={`live-date-${row.id}`}
                            label="Live Date"
                            info={SIDEBAR_TOOLTIPS.liveDate}
                            type="date"
                            value={row.liveDate}
                            min={todayStr}
                            onValueChange={(value) =>
                              setDeliverables((prev) =>
                                prev.map((item) =>
                                  item.id === row.id ? { ...item, liveDate: value } : item
                                )
                              )
                            }
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                  <FloatingTagInput
                    label="Mandatory Tags / Mentions / Links / Codes"
                    info={SIDEBAR_TOOLTIPS.mandatoryTags}
                    value={csvToTags(
                      getAtPath(contractForm, "scheduleA.mandatoryTagsMentionsLinksCodes")
                    )}
                    options={[]}
                    onValueChange={(next) =>
                      setContractField(
                        "scheduleA.mandatoryTagsMentionsLinksCodes",
                        tagsToCsv(next)
                      )
                    }
                    dropdownDirection="up"
                  />
                  <div className="mt-1 text-xs text-neutral-400">
                    add links, brand guidelines etc
                  </div>

                  {activePaymentType !== PAYMENT_TYPE.FIXED || activeDeliverables.length ? (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={handleAddDeliverable}
                      >
                        Add Deliverable
                      </Button>
                    </div>
                  ) : null}

                  {addedDeliverables.length ? (
                    <div className="space-y-3">
                      {addedDeliverables.map((row, index) => (
                        <div
                          key={`summary-${row.id}`}
                          className="grid items-center gap-3 bg-white px-4 py-4 text-sm text-neutral-900 shadow-sm"
                          style={{
                            gridTemplateColumns: "40px minmax(120px, 1.2fr) minmax(90px, 1fr) minmax(110px, 1fr) 70px 32px",
                            borderRadius: "var(--Border-Radius-S, 0.5rem)",
                            border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
                          }}
                        >
                          <div className="font-semibold">{index + 1}.</div>

                          <div className="min-w-0 truncate font-semibold">
                            {row.deliverableName || row.deliverableFormat || "Deliverable"}
                          </div>

                          <div className="min-w-0 truncate font-semibold">
                            {row.aspectRatio || "-"}
                          </div>

                          <div className="flex min-w-0 flex-wrap gap-1">
                            {csvToTags(row.platform).length ? (
                              csvToTags(row.platform).map((platform) => (
                                <span
                                  key={`${row.id}-${platform}`}
                                  className="inline-flex h-7 items-center rounded-full border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700"
                                >
                                  {platform}
                                </span>
                              ))
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </div>

                          <div className="text-center font-semibold">{row.qty || "1"}</div>

                          <button
                            type="button"
                            aria-label="Remove deliverable"
                            onClick={() => {
                              setDeliverables((prev) => prev.filter((item) => item.id !== row.id));
                              setAddedDeliverableCount((prev) => Math.max(0, prev - 1));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-2xl font-light text-neutral-900 hover:bg-neutral-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                </fieldset>
              </>
            </SidebarSection>

            <SidebarSection
              title="Reviews, Revisions, Reshoots & Posting Controls"
              icon={<PenNib className="h-4 w-4" />}
            >
              <fieldset className="space-y-5">
                <FloatingSelect
                  label="Revision Required"
                  info={SIDEBAR_TOOLTIPS.revisionRequired}
                  value={
                    contractForm.scheduleA.review.needRevisionRounds ||
                    REVISION_ROUNDS_DUMMY_VALUE
                  }
                  onValueChange={(value) => {
                    const nextValue =
                      value === REVISION_ROUNDS_DUMMY_VALUE ? "" : (value as "yes" | "no");

                    setContractForm((prev) =>
                      setAtPath(
                        setAtPath(
                          setAtPath(
                            prev,
                            "scheduleA.review.needRevisionRounds",
                            nextValue
                          ),
                          "scheduleA.review.includedRevisionRounds",
                          nextValue === "yes"
                            ? prev.scheduleA.review.includedRevisionRounds || "1"
                            : ""
                        ),
                        "scheduleA.review.additionalRevisionFee",
                        nextValue === "yes"
                          ? prev.scheduleA.review.additionalRevisionFee || ""
                          : ""
                      )
                    );

                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next["scheduleA.review.includedRevisionRounds"];
                      delete next["scheduleA.review.additionalRevisionFee"];
                      return next;
                    });
                  }}
                  searchable={false}
                >
                  {YES_NO_BOOL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {contractForm.scheduleA.review.needRevisionRounds === "yes" ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FloatingInput
                      id="revision-count"
                      label="Included Revision Rounds"
                      info={SIDEBAR_TOOLTIPS.includedRevisionRounds}
                      type="number"
                      value={getAtPath(contractForm, "scheduleA.review.includedRevisionRounds")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.review.includedRevisionRounds", value)
                      }
                      state={
                        formErrors["scheduleA.review.includedRevisionRounds"]
                          ? "error"
                          : undefined
                      }
                      errorText={formErrors["scheduleA.review.includedRevisionRounds"] || ""}
                      required
                    />

                    <FloatingInput
                      id="revision-fees"
                      label="Additional Revision Fee"
                      info={SIDEBAR_TOOLTIPS.additionalRevisionFee}
                      type="number"
                      value={getAtPath(contractForm, "scheduleA.review.additionalRevisionFee")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.review.additionalRevisionFee", value)
                      }
                      state={
                        formErrors["scheduleA.review.additionalRevisionFee"]
                          ? "error"
                          : undefined
                      }
                      errorText={formErrors["scheduleA.review.additionalRevisionFee"] || ""}
                      required
                    />
                  </div>
                ) : null}

                <FloatingSelect
                  label="Reshoot Obligation"
                  info={SIDEBAR_TOOLTIPS.reshootObligation}
                  value={
                    getAtPath(contractForm, "scheduleA.review.reshootObligation") ||
                    RESHOOT_OBLIGATION_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.review.reshootObligation",
                      value === RESHOOT_OBLIGATION_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                >
                  {RESHOOT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {contractForm.scheduleA.review.reshootObligation === "One Reshoot Included" ? (
                  <FloatingInput
                    id="reshoot-fee"
                    label="Additional Reshoot Fee"
                    info={SIDEBAR_TOOLTIPS.reshootFee}
                    placeholderText="$100"
                    value={getAtPath(contractForm, "scheduleA.review.reshootFee")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.review.reshootFee", value)
                    }
                  />
                ) : null}

                {contractForm.scheduleA.review.reshootObligation === "Custom Reshoot Terms" ? (
                  <LabeledTextarea
                    id="reshoot-requirements"
                    label="Reshoot Requirements"
                    info={SIDEBAR_TOOLTIPS.reshootRequirements}
                    value={getAtPath(contractForm, "scheduleA.review.reshootFee")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setContractField("scheduleA.review.reshootFee", e.target.value)
                    }
                  />
                ) : null}

                <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
                  <ContractCheckbox
                    checked={Boolean(contractForm.scheduleA.review.minimumLivePeriod)}
                    onCheckedChange={(checked) =>
                      setContractField(
                        "scheduleA.review.minimumLivePeriod",
                        checked ? MINIMUM_LIVE_PERIOD_DUMMY_VALUE : ""
                      )
                    }
                    className="shrink-0"
                    ariaLabel="Minimum Live Period"
                  />

                  <span className="flex-1 text-[#B8B8B8]">Minimum Live Period</span>
                </label>

                <p className="ml-8 text-xs leading-5 text-neutral-500">
                  The Creator may not delete, archive, materially edit, or materially alter a live Deliverable before the agreed Minimum Live Period without prior written approval, except where required by law or platform policy.
                </p>

                <FloatingSelect
                  label="Minimum Live Period"
                  info={SIDEBAR_TOOLTIPS.minimumLivePeriod}
                  value={
                    getAtPath(contractForm, "scheduleA.review.minimumLivePeriod") ||
                    MINIMUM_LIVE_PERIOD_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField("scheduleA.review.minimumLivePeriod", value)
                  }
                  searchable={false}
                  disabled={!contractForm.scheduleA.review.minimumLivePeriod}
                >
                  {MINIMUM_LIVE_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.review.minimumLivePeriod") === "Custom" ? (
                  <FloatingInput
                    id="custom-live-period"
                    label="Custom Live Period"
                    info={SIDEBAR_TOOLTIPS.customLivePeriod}
                    placeholderText="3 Years"
                    value={getAtPath(contractForm, "scheduleA.review.customLivePeriod")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.review.customLivePeriod", value)
                    }
                    state={formErrors["scheduleA.review.customLivePeriod"] ? "error" : undefined}
                    errorText={formErrors["scheduleA.review.customLivePeriod"] || ""}
                  />
                ) : null}

              </fieldset>
            </SidebarSection>

            <SidebarSection
              title="Raw Files, Source Files & Reporting"
              icon={<ClipboardText className="h-4 w-4" />}
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FloatingSelect
                    label="Raw / Source File Delivery"
                    info={SIDEBAR_TOOLTIPS.rawSourceFileDelivery}
                    value={
                      getAtPath(contractForm, "scheduleA.rawFiles.rawSourceFileDelivery") ||
                      RAW_SOURCE_FILE_DELIVERY_DUMMY_VALUE
                    }
                    onValueChange={(value) => {
                      const nextValue = value === RAW_SOURCE_FILE_DELIVERY_DUMMY_VALUE ? "" : value;
                      setContractForm((prev) => ({
                        ...prev,
                        scheduleA: {
                          ...prev.scheduleA,
                          rawFiles: {
                            ...prev.scheduleA.rawFiles,
                            rawSourceFileDelivery: nextValue,
                            deliveryDue: nextValue === "Included" ? prev.scheduleA.rawFiles.deliveryDue : "",
                            format: nextValue === "Included" ? prev.scheduleA.rawFiles.format : "",
                          },
                        },
                      }));
                    }}
                    searchable={false}
                  >
                    {RAW_FILE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>

                  <FloatingSelect
                    label="Analytics Required"
                    info={SIDEBAR_TOOLTIPS.analyticsRequired}
                    value={
                      getAtPath(contractForm, "scheduleA.rawFiles.analyticsRequired") ||
                      ANALYTICS_REQUIRED_DUMMY_VALUE
                    }
                    onValueChange={(value) => {
                      const nextValue = value === ANALYTICS_REQUIRED_DUMMY_VALUE ? "" : value;
                      setContractForm((prev) => ({
                        ...prev,
                        scheduleA: {
                          ...prev.scheduleA,
                          rawFiles: {
                            ...prev.scheduleA.rawFiles,
                            analyticsRequired: nextValue,
                            analyticsReportingDeadline: nextValue === "Yes" ? prev.scheduleA.rawFiles.analyticsReportingDeadline : "",
                            analyticsReportingItems: nextValue === "Yes" ? prev.scheduleA.rawFiles.analyticsReportingItems : "",
                          },
                        },
                      }));
                    }}
                    searchable={false}
                  >
                    {ANALYTICS_REQUIRED_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>
                </div>

                {getAtPath(contractForm, "scheduleA.rawFiles.rawSourceFileDelivery") === "Included" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FloatingInput
                      id="raw-files-delivery-due"
                      label="Files Due By"
                      info={SIDEBAR_TOOLTIPS.rawFilesDeliveryDue}
                      placeholderText="Within 7 days of content approval"
                      value={getAtPath(contractForm, "scheduleA.rawFiles.deliveryDue")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.rawFiles.deliveryDue", value)
                      }
                    />

                    <div className="md:col-span-2">
                      <LabeledTextarea
                        id="raw-files-format"
                        label="Files To Be Included"
                        info={SIDEBAR_TOOLTIPS.rawFilesFormat}
                        placeholder={`4K MP4
Project Files
Raw Footage
RAW Images
Source Audio Files
Editable Design Files
Other`}
                        value={getAtPath(contractForm, "scheduleA.rawFiles.format")}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setContractField("scheduleA.rawFiles.format", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {getAtPath(contractForm, "scheduleA.rawFiles.analyticsRequired") === "Yes" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <FloatingInput
                      id="analytics-reporting-deadline"
                      label="Analytics / Reporting Deadline"
                      info={SIDEBAR_TOOLTIPS.analyticsReportingDeadline}
                      placeholderText="7 Days After Publication"
                      value={getAtPath(contractForm, "scheduleA.rawFiles.analyticsReportingDeadline")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.rawFiles.analyticsReportingDeadline", value)
                      }
                    />

                    <FloatingTagInput
                      label="Analytics Reporting Items"
                      info={SIDEBAR_TOOLTIPS.analyticsReportingItems}
                      value={csvToTags(
                        getAtPath(contractForm, "scheduleA.rawFiles.analyticsReportingItems")
                      )}
                      options={ANALYTICS_REPORTING_ITEM_OPTIONS}
                      onValueChange={(next) =>
                        setContractField(
                          "scheduleA.rawFiles.analyticsReportingItems",
                          tagsToCsv(next)
                        )
                      }
                      dropdownDirection="up"
                    />
                  </div>
                ) : null}
              </div>
            </SidebarSection>

            <SidebarSection title="Product Shipping & Returns" icon={<Info className="h-4 w-4" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FloatingSelect
                  label="Product Shipment Required"
                  info={SIDEBAR_TOOLTIPS.productShippingApplicable}
                  value={
                    getAtPath(contractForm, "scheduleA.shipping.productShippingApplicable") ||
                    PRODUCT_SHIPPING_DUMMY_VALUE
                  }
                  onValueChange={(value) => {
                    const nextValue = value === PRODUCT_SHIPPING_DUMMY_VALUE ? "" : value;
                    setContractForm((prev) => ({
                      ...prev,
                      scheduleA: {
                        ...prev.scheduleA,
                        shipping: {
                          ...prev.scheduleA.shipping,
                          productShippingApplicable: nextValue,
                          productName: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.productName : "",
                          sku: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.sku : "",
                          quantity: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.quantity : "",
                          estimatedProductValue: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.estimatedProductValue : "",
                          productReceiptConfirmationDeadline: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.productReceiptConfirmationDeadline : "",
                          productReturnable: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.productReturnable : "",
                          returnWindowMethod: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.returnWindowMethod : "",
                          returnInstructions: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.returnInstructions : "",
                          riskOfLossNotes: nextValue === "Product Shipment Required" ? prev.scheduleA.shipping.riskOfLossNotes : "",
                        },
                      },
                    }));
                  }}
                  searchable={false}
                >
                  {SHIPPING_APPLICABLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.shipping.productShippingApplicable") === "Product Shipment Required" ? (
                  <>
                    <FloatingInput
                      id="product-name"
                      label="Product Name"
                      info={SIDEBAR_TOOLTIPS.productName}
                      value={getAtPath(contractForm, "scheduleA.shipping.productName")}
                      onValueChange={(value: string) => setContractField("scheduleA.shipping.productName", value)}
                    />

                    <FloatingInput
                      id="product-sku"
                      label="SKU (Optional)"
                      info={SIDEBAR_TOOLTIPS.productSku}
                      value={getAtPath(contractForm, "scheduleA.shipping.sku")}
                      onValueChange={(value: string) => setContractField("scheduleA.shipping.sku", value)}
                    />

                    <FloatingInput
                      id="product-quantity"
                      label="Quantity"
                      info={SIDEBAR_TOOLTIPS.productQuantity}
                      type="number"
                      value={getAtPath(contractForm, "scheduleA.shipping.quantity")}
                      onValueChange={(value: string) => setContractField("scheduleA.shipping.quantity", value)}
                    />

                    <FloatingInput
                      id="estimated-product-value"
                      label="Estimated Product Value"
                      info={SIDEBAR_TOOLTIPS.estimatedProductValue}
                      type="number"
                      value={getAtPath(contractForm, "scheduleA.shipping.estimatedProductValue")}
                      onValueChange={(value: string) => setContractField("scheduleA.shipping.estimatedProductValue", value)}
                    />

                    <div className="md:col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-700" title={SIDEBAR_TOOLTIPS.creatorShippingDetails}>
                      <div className="mb-1 font-semibold text-neutral-900">Creator Shipping Details</div>
                      The creator will provide their shipping details after receiving the contract.
                    </div>

                    <FloatingInput
                      id="product-receipt-confirmation-deadline"
                      label="Product Receipt Confirmation Deadline"
                      info={SIDEBAR_TOOLTIPS.productReceiptConfirmationDeadline}
                      placeholderText="Within 3 business days of delivery"
                      value={getAtPath(contractForm, "scheduleA.shipping.productReceiptConfirmationDeadline")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.shipping.productReceiptConfirmationDeadline", value)
                      }
                    />

                    <FloatingSelect
                      label="Product Returnable"
                      info={SIDEBAR_TOOLTIPS.productReturnable}
                      value={
                        getAtPath(contractForm, "scheduleA.shipping.productReturnable") ||
                        PRODUCT_RETURNABLE_DUMMY_VALUE
                      }
                      onValueChange={(value) => {
                        const nextValue = value === PRODUCT_RETURNABLE_DUMMY_VALUE ? "" : value;
                        setContractForm((prev) => ({
                          ...prev,
                          scheduleA: {
                            ...prev.scheduleA,
                            shipping: {
                              ...prev.scheduleA.shipping,
                              productReturnable: nextValue,
                              returnWindowMethod: nextValue === "Return Required" ? prev.scheduleA.shipping.returnWindowMethod : "",
                              returnInstructions: nextValue === "Return Required" ? prev.scheduleA.shipping.returnInstructions : "",
                            },
                          },
                        }));
                      }}
                      searchable={false}
                    >
                      {RETURNABLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </FloatingSelect>

                    {getAtPath(contractForm, "scheduleA.shipping.productReturnable") === "Return Required" ? (
                      <>
                        <FloatingInput
                          id="return-window-method"
                          label="Return Window"
                          info={SIDEBAR_TOOLTIPS.returnWindowMethod}
                          placeholderText="Within 15 days of campaign completion"
                          value={getAtPath(contractForm, "scheduleA.shipping.returnWindowMethod")}
                          onValueChange={(value: string) =>
                            setContractField("scheduleA.shipping.returnWindowMethod", value)
                          }
                        />

                        <LabeledTextarea
                          id="return-instructions"
                          label="Return Instructions"
                          info={SIDEBAR_TOOLTIPS.returnInstructions}
                          placeholder="INSERT RETURN WINDOW, PREPAID LABEL / CARRIER / INSTRUCTIONS IF APPLICABLE"
                          value={getAtPath(contractForm, "scheduleA.shipping.returnInstructions")}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setContractField("scheduleA.shipping.returnInstructions", e.target.value)
                          }
                        />
                      </>
                    ) : null}

                    <LabeledTextarea
                      id="risk-of-loss-notes"
                      label="Risk of Loss Notes"
                      info={SIDEBAR_TOOLTIPS.riskOfLossNotes}
                      placeholder="INSERT IF DIFFERENT FROM MAIN AGREEMENT"
                      value={getAtPath(contractForm, "scheduleA.shipping.riskOfLossNotes")}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setContractField("scheduleA.shipping.riskOfLossNotes", e.target.value)
                      }
                    />
                  </>
                ) : null}
              </div>
            </SidebarSection>

            <SidebarSection
              title="Usage Rights & Content Ownership"
              icon={<SealCheck className="h-4 w-4" />}
            >
              <div className="space-y-4">
                <FloatingMultiSelect
                  label="Granted Usage Rights"
                  info={SIDEBAR_TOOLTIPS.grantedUsageRights}
                  value={selectedUsageRights}
                  options={usageRightOptions}
                  onValueChange={(next) => setSelectedUsageRights(next)}
                  includeAll={false}
                  searchable={false}
                />

                <div className="space-y-3">
                  {contractForm.scheduleA.usageRights.rows
                    .filter((row) => row.selected)
                    .map((row) => (
                      <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="mb-3 text-sm font-semibold text-gray-800">
                          {row.usageRight}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <FloatingInput
                            id={`usage-duration-${row.id}`}
                            label="Duration"
                            info={SIDEBAR_TOOLTIPS.usageDuration}
                            value={row.duration}
                            onValueChange={(value: string) =>
                              setContractField(
                                "scheduleA.usageRights.rows",
                                contractForm.scheduleA.usageRights.rows.map((item) =>
                                  item.id === row.id ? { ...item, duration: value } : item
                                )
                              )
                            }
                          />

                          <FloatingInput
                            id={`usage-territory-${row.id}`}
                            label="Territory / Notes"
                            info={SIDEBAR_TOOLTIPS.usageTerritoryNotes}
                            value={row.territoryNotes}
                            onValueChange={(value: string) =>
                              setContractField(
                                "scheduleA.usageRights.rows",
                                contractForm.scheduleA.usageRights.rows.map((item) =>
                                  item.id === row.id ? { ...item, territoryNotes: value } : item
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FloatingSelect
                    label="Attribution Requirement"
                    info={SIDEBAR_TOOLTIPS.attributionRequirement}
                    value={
                      getAtPath(contractForm, "scheduleA.usageRights.attributionRequirement") ||
                      ATTRIBUTION_REQUIREMENT_DUMMY_VALUE
                    }
                    onValueChange={(value) => {
                      const nextValue = value === ATTRIBUTION_REQUIREMENT_DUMMY_VALUE ? "" : value;
                      setContractForm((prev) => ({
                        ...prev,
                        scheduleA: {
                          ...prev.scheduleA,
                          usageRights: {
                            ...prev.scheduleA.usageRights,
                            attributionRequirement: nextValue,
                            attributionText:
                              nextValue === "Credit Required"
                                ? prev.scheduleA.usageRights.attributionText
                                : "",
                          },
                        },
                      }));
                    }}
                    searchable={false}
                  >
                    {ATTRIBUTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>

                  <FloatingSelect
                    label="Editing Rights"
                    info={SIDEBAR_TOOLTIPS.editingRights}
                    value={
                      getAtPath(contractForm, "scheduleA.usageRights.editingRights") ||
                      EDITING_RIGHTS_DUMMY_VALUE
                    }
                    onValueChange={(value) =>
                      setContractField(
                        "scheduleA.usageRights.editingRights",
                        value === EDITING_RIGHTS_DUMMY_VALUE ? "" : value
                      )
                    }
                    searchable={false}
                  >
                    {EDITING_RIGHTS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </FloatingSelect>
                </div>

                {getAtPath(contractForm, "scheduleA.usageRights.attributionRequirement") === "Credit Required" ? (
                  <FloatingInput
                    id="attribution-text"
                    label="Attribution Requirements"
                    info={SIDEBAR_TOOLTIPS.attributionText}
                    value={getAtPath(contractForm, "scheduleA.usageRights.attributionText")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.usageRights.attributionText", value)
                    }
                  />
                ) : null}

                <FloatingSelect
                  label="Music / Stock Asset Responsibility"
                  info={SIDEBAR_TOOLTIPS.musicStockAssetResponsibility}
                  value={
                    getAtPath(contractForm, "scheduleA.usageRights.musicStockAssetResponsibility") ||
                    MUSIC_RESPONSIBILITY_DUMMY_VALUE
                  }
                  onValueChange={(value) => {
                    const nextValue = value === MUSIC_RESPONSIBILITY_DUMMY_VALUE ? "" : value;
                    setContractForm((prev) => ({
                      ...prev,
                      scheduleA: {
                        ...prev.scheduleA,
                        usageRights: {
                          ...prev.scheduleA.usageRights,
                          musicStockAssetResponsibility: nextValue,
                          musicStockAssetLicensingNotes:
                            nextValue === "Custom Responsibility"
                              ? prev.scheduleA.usageRights.musicStockAssetLicensingNotes
                              : "",
                        },
                      },
                    }));
                  }}
                  searchable={false}
                >
                  {MUSIC_RESPONSIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {contractForm.scheduleA.usageRights.musicStockAssetResponsibility === "Custom Responsibility" ? (
                  <LabeledTextarea
                    id="music-stock-asset-licensing-notes"
                    label="Licensing Notes"
                    info={SIDEBAR_TOOLTIPS.musicStockAssetLicensingNotes}
                    value={getAtPath(contractForm, "scheduleA.usageRights.musicStockAssetLicensingNotes")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setContractField("scheduleA.usageRights.musicStockAssetLicensingNotes", e.target.value)
                    }
                  />
                ) : null}
              </div>
            </SidebarSection>

            <SidebarSection
              title="Compliance, Claims, Tags & Brand Safety"
              icon={<Info className="h-4 w-4" />}
            >
              <div className="space-y-5">
                <LabeledTextarea
                  id="creative-brief"
                  label="Creative Brief / Mandatory Talking Points"
                  info={SIDEBAR_TOOLTIPS.creativeBrief}
                  value={getAtPath(
                    contractForm,
                    "scheduleA.compliance.creativeBriefMandatoryTalkingPoints"
                  )}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContractField(
                      "scheduleA.compliance.creativeBriefMandatoryTalkingPoints",
                      e.target.value
                    )
                  }
                />

                <LabeledTextarea
                  id="restricted-statements"
                  label="Restricted Statements"
                  info={SIDEBAR_TOOLTIPS.restrictedStatements}
                  value={getAtPath(contractForm, "scheduleA.compliance.restrictedStatements")}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContractField(
                      "scheduleA.compliance.restrictedStatements",
                      e.target.value
                    )
                  }
                />

                <div className="w-full">
                  <div
                    className={cn(
                      "rounded-[12px] overflow-hidden",
                      "bg-[color:var(--Fill-Inverse-strong,#FFF)]",
                      "border border-[color:var(--Light-Border-Primary,#D6D6D6)]",
                      "shadow-none"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 border-b",
                        "border-[color:var(--Light-Border-Primary,#D6D6D6)]"
                      )}
                    >
                      <div
                        title={SIDEBAR_TOOLTIPS.ftcCompliance}
                        className={cn(
                          "min-w-0 truncate",
                          "text-[color:var(--Light-Text-Secondary,#969696)]",
                          "text-[16px] leading-[24px] font-normal",
                          "font-[var(--Font-Family-Inter,Inter)]"
                        )}
                      >
                        FTC / Advertising / Platform Compliance
                      </div>
                    </div>

                    <div
                      title={SIDEBAR_TOOLTIPS.ftcCompliance}
                      className={cn(
                        "min-h-[120px] px-4 py-3",
                        "text-[#1a1a1a]",
                        "text-[14px] leading-[20px]",
                        "whitespace-pre-wrap"
                      )}
                    >
                      {FTC_ADVERTISING_PLATFORM_COMPLIANCE_NOTE}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarSection>

            <SidebarSection
              title="Exclusivity, Competitor Blackout & Morals Clause"
              icon={<SealCheck className="h-4 w-4" />}
            >
              <div className="space-y-5">
                <FloatingSelect
                  label="Exclusivity / Competitor Blackout"
                  info={SIDEBAR_TOOLTIPS.competitorBlackout}
                  value={
                    getAtPath(contractForm, "scheduleA.exclusivity.competitorBlackout") ||
                    EXCLUSIVITY_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.exclusivity.competitorBlackout",
                      value === EXCLUSIVITY_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                >
                  {EXCLUSIVITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.exclusivity.competitorBlackout") === "Applies" ? (
                  <div className="space-y-5">
                    <FloatingTagInput
                      label="Category / Competitor List"
                      info={SIDEBAR_TOOLTIPS.categoryCompetitorList}
                      value={csvToTags(
                        getAtPath(contractForm, "scheduleA.exclusivity.categoryCompetitorList")
                      )}
                      options={[]}
                      onValueChange={(next) =>
                        setContractField(
                          "scheduleA.exclusivity.categoryCompetitorList",
                          tagsToCsv(next)
                        )
                      }
                      dropdownDirection="up"
                    />

                    <FloatingInput
                      id="blackout-period"
                      label="Exclusivity / Blackout Period"
                      info={SIDEBAR_TOOLTIPS.blackoutPeriod}
                      placeholderText="48 Hours / 2 Weeks / 30 Days / 90 Days / Custom"
                      value={getAtPath(contractForm, "scheduleA.exclusivity.blackoutPeriod")}
                      onValueChange={(value: string) =>
                        setContractField("scheduleA.exclusivity.blackoutPeriod", value)
                      }
                    />
                  </div>
                ) : null}

                <FloatingSelect
                  label="Optional Morals / Reputation Clause"
                  info={SIDEBAR_TOOLTIPS.optionalMoralsClause}
                  value={
                    getAtPath(contractForm, "scheduleA.exclusivity.optionalMoralsClause") ||
                    MORALS_CLAUSE_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.exclusivity.optionalMoralsClause",
                      value === MORALS_CLAUSE_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                >
                  {MORALS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.exclusivity.optionalMoralsClause") === "Included" ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">
                    {MORALS_REPUTATION_CLAUSE}
                  </div>
                ) : null}
              </div>
            </SidebarSection>

            <SidebarSection
              title="Cancellation, Refund & Non-Performance Terms"
              icon={<Info className="h-4 w-4" />}
            >
              <div className="space-y-5">
                <FloatingSelect
                  label="Kill Fee / Pro-Rata Compensation"
                  info={SIDEBAR_TOOLTIPS.killFeeOrProrata}
                  value={
                    getAtPath(contractForm, "scheduleA.cancellation.killFeeOrProrata") ||
                    KILL_FEE_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.cancellation.killFeeOrProrata",
                      value === KILL_FEE_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                >
                  {KILL_FEE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.cancellation.killFeeOrProrata") === "Fixed Amount" ? (
                  <FloatingInput
                    id="kill-fee-amount"
                    label="Kill Fee Amount"
                    info={SIDEBAR_TOOLTIPS.killFeeAmount}
                    value={getAtPath(contractForm, "scheduleA.cancellation.killFeeAmount")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.cancellation.killFeeAmount", value)
                    }
                  />
                ) : null}

                {getAtPath(contractForm, "scheduleA.cancellation.killFeeOrProrata") ===
                  "Pro-Rata Compensation" ? (
                  <LabeledTextarea
                    id="pro-rata-terms"
                    label="Pro-Rata Terms"
                    info={SIDEBAR_TOOLTIPS.proRataTerms}
                    placeholder="Creator will be paid for all approved work completed before cancellation."
                    value={getAtPath(contractForm, "scheduleA.cancellation.proRataTerms")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setContractField("scheduleA.cancellation.proRataTerms", e.target.value)
                    }
                  />
                ) : null}

                {activePaymentType === PAYMENT_TYPE.GIFTING ? (
                  <>
                    <FloatingSelect
                      label="Product Recovery / Non-Performance Terms"
                      info={SIDEBAR_TOOLTIPS.productRecoveryTerms}
                      value={
                        getAtPath(contractForm, "scheduleA.cancellation.productRecoveryTerms") ||
                        PRODUCT_RECOVERY_DUMMY_VALUE
                      }
                      onValueChange={(value) =>
                        setContractField(
                          "scheduleA.cancellation.productRecoveryTerms",
                          value === PRODUCT_RECOVERY_DUMMY_VALUE ? "" : value
                        )
                      }
                      searchable={false}
                    >
                      {PRODUCT_RECOVERY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </FloatingSelect>

                    {getAtPath(contractForm, "scheduleA.cancellation.productRecoveryTerms") ===
                      "Product Must Be Returned" ? (
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">
                        {PRODUCT_MUST_BE_RETURNED_CLAUSE}
                      </div>
                    ) : null}

                    {getAtPath(contractForm, "scheduleA.cancellation.productRecoveryTerms") === "Custom" ? (
                      <LabeledTextarea
                        id="custom-recovery-terms"
                        label="Custom Recovery Terms"
                        info={SIDEBAR_TOOLTIPS.customRecoveryTerms}
                        value={getAtPath(contractForm, "scheduleA.cancellation.customRefundTerms")}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setContractField("scheduleA.cancellation.customRefundTerms", e.target.value)
                        }
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <FloatingSelect
                      label="Refund of Unearned Advance"
                      info={SIDEBAR_TOOLTIPS.refundOfUnearnedAdvance}
                      value={
                        getAtPath(contractForm, "scheduleA.cancellation.refundOfUnearnedAdvance") ||
                        REFUND_ADVANCE_DUMMY_VALUE
                      }
                      onValueChange={(value) =>
                        setContractField(
                          "scheduleA.cancellation.refundOfUnearnedAdvance",
                          value === REFUND_ADVANCE_DUMMY_VALUE ? "" : value
                        )
                      }
                      searchable={false}
                    >
                      {REFUND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </FloatingSelect>

                    {getAtPath(contractForm, "scheduleA.cancellation.refundOfUnearnedAdvance") ===
                      "Yes" ? (
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">
                        {REFUND_REQUIRED_CLAUSE}
                      </div>
                    ) : null}

                    {getAtPath(contractForm, "scheduleA.cancellation.refundOfUnearnedAdvance") ===
                      "Custom" ? (
                      <LabeledTextarea
                        id="custom-refund-terms"
                        label="Custom Refund Terms"
                        info={SIDEBAR_TOOLTIPS.customRefundTerms}
                        value={getAtPath(contractForm, "scheduleA.cancellation.customRefundTerms")}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setContractField("scheduleA.cancellation.customRefundTerms", e.target.value)
                        }
                      />
                    ) : null}
                  </>
                )}
              </div>
            </SidebarSection>

            <SidebarSection
              title="Governing Law, Dispute Resolution & Notices"
              icon={<FileText className="h-4 w-4" />}
            >
              <div className="space-y-5">
                <FloatingInput
                  id="governing-law"
                  label="Governing Law"
                  info={SIDEBAR_TOOLTIPS.governingLaw}
                  value={getAtPath(contractForm, "scheduleA.dispute.governingLaw")}
                  onValueChange={(value: string) =>
                    setContractField("scheduleA.dispute.governingLaw", value)
                  }
                />

                <FloatingSelect
                  label="Dispute Resolution Method"
                  info={SIDEBAR_TOOLTIPS.disputeResolutionMethod}
                  value={
                    getAtPath(contractForm, "scheduleA.dispute.disputeResolutionMethod") ||
                    DISPUTE_METHOD_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.dispute.disputeResolutionMethod",
                      value === DISPUTE_METHOD_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                  required
                  state={
                    formErrors["scheduleA.dispute.disputeResolutionMethod"] ? "error" : undefined
                  }
                  errorText={formErrors["scheduleA.dispute.disputeResolutionMethod"] || ""}
                >
                  {DISPUTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.dispute.disputeResolutionMethod") ===
                  "State / Federal Courts" ? (
                  <FloatingInput
                    id="dispute-venue"
                    label="Venue"
                    info={SIDEBAR_TOOLTIPS.disputeVenue}
                    value={getAtPath(contractForm, "scheduleA.dispute.disputeVenue")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.dispute.disputeVenue", value)
                    }
                  />
                ) : null}

                {getAtPath(contractForm, "scheduleA.dispute.disputeResolutionMethod") ===
                  "Arbitration" ? (
                  <FloatingInput
                    id="arbitration-seat"
                    label="Arbitration Seat"
                    info={SIDEBAR_TOOLTIPS.arbitrationSeat}
                    value={getAtPath(contractForm, "scheduleA.dispute.arbitrationSeat")}
                    onValueChange={(value: string) =>
                      setContractField("scheduleA.dispute.arbitrationSeat", value)
                    }
                  />
                ) : null}

                {getAtPath(contractForm, "scheduleA.dispute.disputeResolutionMethod") === "Other" ? (
                  <LabeledTextarea
                    id="dispute-resolution-details"
                    label="Dispute Resolution Details"
                    info={SIDEBAR_TOOLTIPS.disputeResolutionDetails}
                    value={getAtPath(contractForm, "scheduleA.dispute.disputeResolutionDetails")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setContractField("scheduleA.dispute.disputeResolutionDetails", e.target.value)
                    }
                  />
                ) : null}

                <FloatingSelect
                  label="Attorneys’ Fees"
                  info={SIDEBAR_TOOLTIPS.attorneysFees}
                  value={
                    getAtPath(contractForm, "scheduleA.dispute.attorneysFees") ||
                    ATTORNEYS_FEES_DUMMY_VALUE
                  }
                  onValueChange={(value) =>
                    setContractField(
                      "scheduleA.dispute.attorneysFees",
                      value === ATTORNEYS_FEES_DUMMY_VALUE ? "" : value
                    )
                  }
                  searchable={false}
                >
                  {ATTORNEYS_FEES_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </FloatingSelect>

                {getAtPath(contractForm, "scheduleA.dispute.attorneysFees") === "Other" ? (
                  <LabeledTextarea
                    id="attorneys-fees-terms"
                    label="Attorneys’ Fees Terms"
                    info={SIDEBAR_TOOLTIPS.attorneysFeesTerms}
                    value={getAtPath(contractForm, "scheduleA.dispute.attorneysFeesTerms")}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setContractField("scheduleA.dispute.attorneysFeesTerms", e.target.value)
                    }
                  />
                ) : null}
              </div>
            </SidebarSection>
            {signatureStatus === "checking" ? (
              <div
                id="signature-section"
                className="rounded-m border border-neutral-200 bg-white p-5"
              >
                <div className="text-sm text-gray-500">Checking active signature…</div>
              </div>
            ) : signatureStatus === "exists" ? (
              <div id="signature-section">
                <SignatureAgreementBlock
                  signerName={
                    contractForm.brand.brandPoc ||
                    contractForm.brand.contactPersonName ||
                    contractForm.brand.legalName
                  }
                  signatureId={activeBrandSignatureId}
                  signatureSrc={activeBrandSignatureSrc}
                  tab={inlineSignatureTab}
                  onTabChange={setInlineSignatureTab}
                  drawnSig={inlineDrawnSig}
                  onDrawnSigChange={setInlineDrawnSig}
                  agreed={inlineAgreed}
                  onAgreeChange={(value) => {
                    setInlineAgreed(value);
                    if (value) setInlineShowError(false);
                  }}
                  showError={inlineShowError}
                  brandId={resolvedBrandId || undefined}
                  onSignatureChange={(newSrc) => setActiveBrandSignatureSrc(newSrc)}
                  onSignatureUploaded={getLatestBrandSignature}
                  onManageSignatures={() => openBrandSignatureModal("manage")}
                />
              </div>
            ) : (
              <div
                id="signature-section"
                className="space-y-4 rounded-[20px] border border-[#E6E6E6] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-[#1A1A1A]">
                      Brand Signature
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[#9C9C9C]">
                      No primary brand signature is selected. Add or select a brand
                      signature before sending this contract.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => openBrandSignatureModal("upload")}
                  >
                    Add Signature
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ContractSidebarShell>

      {resolvedBrandId ? (
        <BrandSignatureModal
          open={showSignatureModal}
          brandId={resolvedBrandId}
          initialTab={signatureModalInitialTab}
          isLoading={isSubmitLoading}
          onClose={() => setShowSignatureModal(false)}
          onSignatureUploaded={getLatestBrandSignature}
          onConfirm={async (signatureData, signatureId) => {
            setShowSignatureModal(false);
            await handleActualSubmit(signatureData, signatureId);
          }}
        />
      ) : null}
    </TooltipProvider>
  );
}

export function ContractSidebarShell({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  campaignPaymentType,
  onCampaignPaymentTypeChange,
  previewUrl,
  previewBlob,
  onClosePreview,
  onDownload,
  isDownloading,
  onOpenInNewTab,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title: string;
  subtitle: string;
  campaignPaymentType?: PaymentType;
  onCampaignPaymentTypeChange: (value: string) => void;
  previewUrl: string;
  previewBlob: Blob | null;
  onClosePreview: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  onOpenInNewTab: () => void;
  footer: React.ReactNode;
}) {

  const contractTypeLabel = campaignPaymentType
    ? CONTRACT_TYPE_LABELS[campaignPaymentType]
    : "";

  return (
    <div
      className={`absolute inset-0 z-[120] isolate ${isOpen ? "" : "pointer-events-none"
        }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"
          }`}
        onClick={onClose}
      />

      <div
        className={`absolute inset-0 overflow-hidden bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="relative z-10 h-20 border-b border-[#e5e5e5] bg-white">
          <div className="flex h-full items-center justify-between px-6">
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9d9d9d]">
                {title}
              </div>
              {/* <div className="truncate text-lg font-bold text-[#1a1a1a]">
                {subtitle}
              </div> */}
              <div className="mt-1">
                <select
                  value={campaignPaymentType}
                  onChange={(e) => onCampaignPaymentTypeChange(e.target.value)}
                  className="border-0 bg-transparent p-0 pr-5 text-xs font-medium text-[#1a1a1a] outline-none focus:outline-none"
                  aria-label="Campaign payment type"
                >
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {CONTRACT_TYPE_LABELS[option.value as PaymentType]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={onOpenInNewTab}
                variant="raised"
                className="!bg-white !text-black !shadow-none cursor-pointer hover:!bg-white hover:!text-black hover:!shadow-none active:!bg-white"
              >
                <ArrowSquareInIcon size={16} />
              </Button>
              <Button
                variant="solid"
                onClick={onDownload}
                disabled={isDownloading}
                className="inline-flex items-center rounded-lg border cursor-pointer border-[#e8e8e8] px-4 py-2 !bg-white !text-black !shadow-none"
              >
                <span className="mr-2 inline-flex">
                  <DownloadSimpleIcon />
                </span>
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              </Button>
              <Button
                type="button"
                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e8e8e8] bg-white !text-black hover:!bg-white "
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-[calc(100%-160px)] bg-white">
          <div className="h-full w-full overflow-auto px-6 py-5 space-y-5 xl:w-1/2">
            {children}
          </div>

          {previewUrl ? (
            <div className="hidden xl:flex xl:w-1/2 flex-col border-l border-gray-100 bg-white">
              <div className="flex-1 min-h-0">
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Contract PDF preview"
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="hidden xl:flex xl:w-1/2 items-center justify-center border-l border-gray-100 bg-white p-6 text-gray-400">
              <div className="text-center">
                <Eye className="mx-auto mb-2 h-8 w-8" />
                <div className="text-sm">Generate a preview to see the PDF here and send contract</div>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 h-[80px] border-t border-gray-200 bg-white px-6 flex items-center justify-between">
          <div className="truncate text-lg font-bold text-[#1a1a1a]">
            {subtitle}
          </div>
          <div className="flex h-full items-center justify-end gap-3">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTION_COPY: Record<
  string,
  {
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
  }
> = {
  "Brand Overview": {
    title: "Brand Overview",
    subtitle: "Brand legal identity, point of contact, notice email, effective date, and covered products/services.",
    defaultOpen: true,
  },
  Brand: {
    title: "Brand Overview",
    subtitle: "Brand legal identity, point of contact, notice email, effective date, and covered products/services.",
    defaultOpen: true,
  },
  "Campaign Overview": {
    title: "Campaign Overview",
    subtitle: "Campaign title, target countries, timezone, and campaign payment type.",
    defaultOpen: true,
  },
  "Commercial and Payment Terms": {
    title: "Commercial and Payment Terms",
    subtitle: "Total influencer compensation, payment distribution, processor fees, and marketplace fee terms.",
    defaultOpen: true,
  },
  "Product Compensation Terms": {
    title: "Product Compensation Terms",
    subtitle: "Product gifting compensation terms with $0 creator cash compensation.",
  },
  "Deliverables and Publication Timeline": {
    title: "Deliverables and Publication Timeline",
    subtitle: "Milestones, deliverables, content specifications, approvals, draft deadlines, and live dates.",
    defaultOpen: true,
  },
  "Reviews, Revisions, Reshoots & Posting Controls": {
    title: "Reviews, Revisions, Reshoots & Posting Controls",
    subtitle: "Revision rounds, reshoot terms, and minimum live period controls.",
  },
  "Raw Files, Source Files & Reporting": {
    title: "Raw Files, Source Files & Reporting",
    subtitle: "Raw/source file delivery and analytics reporting requirements.",
  },
  "Product Shipping & Returns": {
    title: "Product Shipping & Returns",
    subtitle: "Product shipment, receipt confirmation, returnability, and risk-of-loss terms.",
  },
  "Usage Rights & Content Ownership": {
    title: "Usage Rights & Content Ownership",
    subtitle: "Granted usage rights, duration, territory, attribution, editing, and asset licensing responsibilities.",
  },
  "Compliance, Claims, Tags & Brand Safety": {
    title: "Compliance, Claims, Tags & Brand Safety",
    subtitle: "Campaign claims, restricted statements, disclosures, and platform compliance.",
  },
  "Exclusivity, Competitor Blackout & Morals Clause": {
    title: "Exclusivity, Competitor Blackout & Morals Clause",
    subtitle: "Competitor blackout, restricted categories, exclusivity period, and morals clause settings.",
  },
  "Cancellation, Refund & Non-Performance Terms": {
    title: "Cancellation, Refund & Non-Performance Terms",
    subtitle: "Kill fee, pro-rata compensation, refunds, and product recovery obligations.",
  },
  "Governing Law, Dispute Resolution & Notices": {
    title: "Governing Law, Dispute Resolution & Notices",
    subtitle: "Governing law, dispute method, venue, arbitration seat, and attorney fee handling.",
  },
  Signature: {
    title: "Signature",
    subtitle: "Review and confirm the saved brand signature before sending the contract.",
    defaultOpen: true,
  },
};

function SidebarSection(props: {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  defaultOpen?: boolean;
}) {
  const mapped = SECTION_COPY[props.title];

  return (
    <AccordionCard
      title={mapped?.title || props.title}
      subtitle={props.subtitle ?? mapped?.subtitle}
      defaultOpen={props.defaultOpen ?? mapped?.defaultOpen ?? false}
    >
      {props.children}
    </AccordionCard>
  );
}

function FixedPaymentMilestonesPreview({
  rows,
  onAddDeliverable,
}: {
  rows: ContractMilestone[];
  onAddDeliverable?: (row: ContractMilestone) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-800">
        System-generated fixed payment milestones
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => {
          const deliverablesEnabled = row.allowDeliverables !== false;

          return (
            <div
              key={row.milestoneId || row.id}
              className="grid gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-700 md:grid-cols-[32px_1fr_110px_100px_130px]"
            >
              <div className="font-semibold">{index + 1}.</div>

              <div>
                <div className="font-semibold text-neutral-900">
                  {row.milestoneName}
                </div>
                <div>
                  {deliverablesEnabled
                    ? "Deliverables enabled"
                    : "Deliverables disabled"}
                </div>
              </div>

              <div>{row.splitPercent || "-"}%</div>

              <div>$ {row.paymentAmount || "0"}</div>

              <div className="flex justify-end">
                {deliverablesEnabled ? (
                  <button
                    type="button"
                    onClick={() => onAddDeliverable?.(row)}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
                  >
                    + Deliverable
                  </button>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommercialMilestonesEditor({
  rows,
  onChange,
  error,
  disabled = false,
  isGifting = false,
}: {
  rows: ContractMilestone[];
  onChange: (rows: ContractMilestone[]) => void;
  error?: string;
  disabled?: boolean;
  isGifting?: boolean;
}) {
  const updateRow = (
    id: string,
    key: keyof Omit<ContractMilestone, "id">,
    value: string
  ) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    const next = createDefaultCommercialMilestone(rows.length + 1);
    onChange([...rows, isGifting ? { ...next, paymentAmount: "0", allowDeliverables: true } : next]);
  };

  const removeRow = (id: string) => {
    onChange(rows.length > 1 ? rows.filter((row) => row.id !== id) : rows);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">Milestones</div>
        <Button type="button" variant="outline" onClick={addRow} disabled={disabled} title="Create payment stages and assign deliverables to each milestone.">
          + Add Milestone
        </Button>
      </div>

      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {rows.map((row, index) => (
        <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Milestone #{index + 1}</div>
            {rows.length > 1 ? (
              <button
                type="button"
                className="text-xs text-red-600"
                disabled={disabled}
                onClick={() => removeRow(row.id)}
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FloatingInput
              label="Milestone Name"
              value={row.milestoneName}
              disabled={disabled}
              onValueChange={(value: string) =>
                updateRow(row.id, "milestoneName", value)
              }
            />

            <LabeledTextarea
              label="Milestone Description"
              info={SIDEBAR_TOOLTIPS.milestoneDescription}
              value={row.milestoneDescription}
              disabled={disabled}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateRow(row.id, "milestoneDescription", e.target.value)
              }
            />

            <FloatingInput
              label="Milestone Amount"
              info={isGifting ? SIDEBAR_TOOLTIPS.giftingMilestoneAmount : SIDEBAR_TOOLTIPS.milestoneAmount}
              type="number"
              value={isGifting ? "0" : row.paymentAmount}
              disabled={disabled || isGifting}
              onValueChange={(value: string) =>
                updateRow(row.id, "paymentAmount", isGifting ? "0" : value)
              }
            />

            <FloatingDateInput
              label="Milestone Due Date"
              info={SIDEBAR_TOOLTIPS.milestoneDueDate}
              type="date"
              value={row.dueDate}
              disabled={disabled}
              min={toInputDate(new Date())}
              onValueChange={(value) => updateRow(row.id, "dueDate", value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignatureAgreementBlock({
  signatureSrc,
  agreed,
  onAgreeChange,
  showError,
  onManageSignatures,
}: {
  signerName?: string;
  signatureSrc?: string;
  signatureId?: string;
  tab: "default" | "draw";
  onTabChange: (tab: "default" | "draw") => void;
  drawnSig: string;
  onDrawnSigChange: (dataUrl: string) => void;
  agreed: boolean;
  onAgreeChange: (v: boolean) => void;
  showError: boolean;
  brandId?: string;
  onSignatureChange?: (newSrc: string) => void;
  onSignatureUploaded?: () => Promise<{ signatureData: string; signatureId: string }> | void;
  onManageSignatures?: () => void;
}) {
  const [previewSrc, setPreviewSrc] = React.useState(signatureSrc || "");
  const shouldShowError = showError && !agreed;

  React.useEffect(() => {
    setPreviewSrc(signatureSrc || "");
  }, [signatureSrc]);

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-[#F8F8F8] px-4 pb-5 pt-6">
        <div className="flex min-h-[130px] w-full items-center justify-center rounded-[20px]">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Brand signature"
              className="max-h-[105px] max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Signature className="h-10 w-10" />
              <span className="text-xs">No brand signature selected</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#9C9C9C]">
            <Info size={16} />
            <span>Signature is selected as primary</span>
          </div>

          <button
            type="button"
            onClick={onManageSignatures}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1F1F1F]"
          >
            Change signature
            <CaretDown size={16} weight="bold" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[20px] border bg-white",
          shouldShowError ? "border-[#FFE1DF]" : "border-[#E6E6E6]"
        )}
      >
        <div className="flex items-center gap-4 px-6 py-6">
          <Switch
            checked={agreed}
            onCheckedChange={(checked) => onAgreeChange(checked === true)}
            aria-invalid={shouldShowError}
            className="shrink-0"
          />

          <p
            className="m-0 flex-1"
            style={{
              color: "var(--Light-Text-Primary, #1A1A1A)",
              fontFamily: "var(--Font-Family-Inter, Inter)",
              fontSize: "var(--Font-Size-14, 0.875rem)",
              fontStyle: "normal",
              fontWeight: "var(--Font-Weight-Medium, 500)",
              lineHeight: "var(--Line-Height-24, 1.5rem)",
              letterSpacing: "var(--Letter-Spacing-0, 0)",
            }}
          >
            By signing, I confirm that I have read and therefore agree to all
            contractual terms, which become legally binding.
          </p>
        </div>

        {shouldShowError ? (
          <div
            className="flex items-start gap-4 bg-[#FFF0EF] px-6 py-4"
            role="alert"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F04D3F] text-sm font-bold text-white">
              !
            </span>

            <p
              style={{
                color: "var(--Light-Text-Negative, #E53935)",
                fontFamily: "var(--Font-Family-Inter, Inter)",
                fontSize: "var(--Font-Size-14, 0.875rem)",
                fontStyle: "normal",
                fontWeight: "var(--Font-Weight-Medium, 500)",
                lineHeight: "var(--Line-Height-20, 1.25rem)",
                letterSpacing: "var(--Letter-Spacing-0, 0)",
              }}
            >
              Please confirm that you agree to all terms before signing the
              contract.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
