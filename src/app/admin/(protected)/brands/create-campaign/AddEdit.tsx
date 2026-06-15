"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastStyles } from "@/components/ui/toast";
import { Button } from "@/components/ui/buttonComp";
import { FloatingInput } from "@/components/ui/floatingInput";
import {
  FloatingMultiSelect,
  FloatingSelect,
  SelectItem,
} from "@/components/ui/selectComp";
import { LabeledTextarea } from "@/components/ui/textAreaComp";
import { ProductCardUpload } from "@/components/ui/productCard-Image";
import { FloatingDateInput } from "@/components/ui/date";
import { FloatingTagInput } from "@/components/ui/tagInput";

import {
  apiCampaignCreate,
  apiCampaignEditDraft,
  getApiErrorMessage,
  CampaignStatus,
  CreateCampaignManualPayload,
  EditDraftPayload,
  EnrichedCampaignDoc,
  apiUploadImages,
  apiAdminEditCampaign,
  apiCampaignGetById2,
} from "../../../../brand/services/brandApi";

import {
  CAMPAIGN_TYPES,
  cn,
  compact,
  countryKey,
  filesToDataUrls,
  getBrandId,
  idsOf,
  isValidDateRange,
  LAYOUT,
  MANUAL_PLATFORM_OPTIONS,
  mapPlatforms,
  Option,
  pickCampaignId,
  platformToUi,
  safeDateInput,
  SEARCHABLE_UI,
  useSearchProps,
  validateFiles,
  mergeOptions,
  prettyTierValue,
} from "./create-campaign.utils";

import {
  useCampaignLists,
  useCategoryPicker,
  useSidebarOffsetPx,
} from "./create-campaign.hooks";

import { CaretDown, CaretUp, PaperPlaneTilt } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";

/* ============================================================================
   Toast helpers
============================================================================ */

type ApiErrorLike = {
  message?: unknown;
  error?: unknown;
  errors?: unknown;
  detail?: unknown;
  data?: unknown;
  statusText?: unknown;
  response?: {
    data?: unknown;
    statusText?: unknown;
  };
};

function normalizeErrorValue(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeErrorValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    const directMessage =
      normalizeErrorValue(objectValue.message) ||
      normalizeErrorValue(objectValue.error) ||
      normalizeErrorValue(objectValue.detail) ||
      normalizeErrorValue(objectValue.msg);

    if (directMessage) return directMessage;

    return Object.entries(objectValue)
      .map(([key, item]) => {
        const itemMessage = normalizeErrorValue(item);
        return itemMessage ? `${key}: ${itemMessage}` : "";
      })
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function getBackendErrorMessage(
  error: unknown,
  fallback = "Something went wrong."
) {
  const apiMessage = getApiErrorMessage(error as any);

  if (
    apiMessage &&
    apiMessage.trim() &&
    apiMessage !== "Something went wrong"
  ) {
    return apiMessage;
  }

  const err = error as ApiErrorLike | undefined;

  const candidates = [
    err?.response?.data,
    err?.data,
    err?.errors,
    err?.error,
    err?.detail,
    err?.message,
    err?.response?.statusText,
    err?.statusText,
    error,
  ];

  for (const candidate of candidates) {
    const message = normalizeErrorValue(candidate);
    if (message) return message;
  }

  return fallback;
}

function toastSuccess(title: string, description?: string) {
  return toast({
    icon: "success",
    title,
    text: description,
    timer: 2500,
  });
}

function toastError(title: string, description?: string) {
  return toast({
    icon: "error",
    title,
    text: description,
    timer: 4000,
  });
}

function toastWarning(title: string, description?: string) {
  return toast({
    icon: "warning",
    title,
    text: description,
    timer: 4000,
  });
}

/* ============================================================================
   Shared UI bits
============================================================================ */

function CenterWrap({
  children,
  withBottomBar = false,
}: {
  children: React.ReactNode;
  withBottomBar?: boolean;
}) {
  return (
    <div className={cn("cg-center-wrap", withBottomBar && "cg-center-wrap--with-bottom")}>
      {children}
    </div>
  );
}

function ProgressBar({
  value,
  barClassName = "bg-neutral-900",
  heightClassName = "h-[2px]",
}: {
  value: number;
  barClassName?: string;
  heightClassName?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[12px] text-neutral-600">
        <span>{safe}%</span>
        <span>100%</span>
      </div>
      <div
        className={cn(
          "mt-2 w-full overflow-hidden rounded-pill bg-neutral-150",
          heightClassName
        )}
      >
        <div
          className={cn(
            "h-full rounded-pill transition-[width] duration-200 ease-out",
            barClassName
          )}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function useViewportWidth() {
  const [w, setW] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;

    const update = () => {
      const next = Math.round(vv?.width ?? window.innerWidth);
      setW((prev) => (prev === next ? prev : next));
    };

    update();

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    vv?.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      vv?.removeEventListener("resize", update);
    };
  }, []);

  return w;
}

function FixedBottomBar({
  sidebarOffsetPx,
  left,
  right,
  containerMaxWidth = 1200,
}: {
  sidebarOffsetPx: number;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerMaxWidth?: number;
}) {
  const viewportW = useViewportWidth();
  const barRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    if (!barRef.current || typeof window === "undefined") return;

    const el = barRef.current;
    let last = -1;

    const setH = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h !== last) {
        last = h;
        document.documentElement.style.setProperty("--cg-bottombar-h", `${h}px`);
      }
    };

    setH();

    const ro = new ResizeObserver(() => setH());
    ro.observe(el);

    window.addEventListener("resize", setH, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setH);
    };
  }, []);

  const clampedMaxW = React.useMemo(() => {
    const contentW = Math.max(0, viewportW - (sidebarOffsetPx || 0));
    return Math.max(0, Math.min(containerMaxWidth, contentW || containerMaxWidth));
  }, [viewportW, sidebarOffsetPx, containerMaxWidth]);

  return (
    <div
      ref={barRef}
      className="cg-bottom-bar"
      style={{
        left: sidebarOffsetPx,
        right: 0,
        ["--cg-bottombar-maxw" as any]: `${clampedMaxW}px`,
      }}
    >
      <div
        className={cn(
          "cg-bottom-bar-inner",
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">{left}</div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{right}</div>
      </div>
    </div>
  );
}

/* ============================================================================
   Forms
============================================================================ */

type ExistingProductImage = {
  dataUrl?: string;
  url?: string;
  name?: string;
  type?: string;
  contentType?: string;
  originalSize?: number;
  size?: number;
  key?: string;
};

type ManualForm = {
  title: string;
  description: string;
  campaignType: string;

  categoryId: string;
  categoryName: string;
  subcategories: string[];

  productFiles: File[];
  productLink: string;

  goals: string[];
  numberOfInfluencers: number;
  influencerTier: string[];
  minFollowers: number;
  maxFollowers: number;

  contentFormats: string[];
  contentLanguage: string[];

  paymentType: string;
  campaignBudget: number;
  startDate: string;
  endDate: string;

  platforms: string[];
  targetCountry: string[];
  targetAgeGroups: string[];

  additionalNotes: string;
  attachment: File | null;

  hashtags: string[];
};

const EMPTY_MANUAL: ManualForm = {
  title: "",
  description: "",
  campaignType: "",
  categoryId: "",
  categoryName: "",
  subcategories: [],
  productFiles: [],
  productLink: "",

  goals: [],
  numberOfInfluencers: 0,
  influencerTier: [],
  minFollowers: 0,
  maxFollowers: 0,

  contentFormats: [],
  contentLanguage: [],

  paymentType: "",
  campaignBudget: 0,
  startDate: "",
  endDate: "",

  platforms: [],
  targetCountry: [],
  targetAgeGroups: [],

  additionalNotes: "",
  attachment: null,

  hashtags: [],
};

const clampNonNegative = (v: string | number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
};

type TierRange = { min?: number; max?: number };

const parseAbbrevNumber = (raw: string): number | null => {
  if (!raw) return null;

  let s = String(raw).trim().toUpperCase();
  s = s.replace(/[, ]+/g, "").replace(/\+$/, "");

  const m = s.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;

  const unit = m[2];
  const mul = unit === "K" ? 1e3 : unit === "M" ? 1e6 : unit === "B" ? 1e9 : 1;

  return Math.round(n * mul);
};

const parseRangeFromText = (text?: string): TierRange | null => {
  if (!text) return null;

  const paren = text.match(/\(([^)]+)\)/)?.[1] ?? text;

  const normalized = String(paren)
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\bto\b/gi, "-");

  const parts = normalized
    .split("-")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const min = parseAbbrevNumber(parts[0]);
    const max = parseAbbrevNumber(parts[1]);

    if (min == null && max == null) return null;

    return {
      min: min ?? undefined,
      max: max ?? undefined,
    };
  }

  if (parts.length === 1) {
    const n = parseAbbrevNumber(parts[0]);
    if (n == null) return null;

    return {
      min: n,
      max: n,
    };
  }

  return null;
};

const aggregateRanges = (
  ranges: Array<TierRange | null | undefined>
): TierRange | null => {
  let min: number | undefined;
  let max: number | undefined;

  for (const r of ranges) {
    if (!r) continue;

    if (typeof r.min === "number") {
      min = min === undefined ? r.min : Math.min(min, r.min);
    }

    if (typeof r.max === "number") {
      max = max === undefined ? r.max : Math.max(max, r.max);
    }
  }

  if (min === undefined && max === undefined) return null;

  return { min, max };
};

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const toLocalDate = (iso?: string) => {
  if (!iso) return null;

  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);

  return Number.isFinite(dt.getTime()) ? dt : null;
};

const addDaysISO = (iso: string, days: number) => {
  const d = toLocalDate(iso);
  if (!d) return "";

  d.setDate(d.getDate() + days);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const isSameOrBeforeISO = (a?: string, b?: string) => {
  const da = toLocalDate(a);
  const db = toLocalDate(b);

  if (!da || !db) return false;

  return da.getTime() <= db.getTime();
};

const TODAY = todayISO();

/* ============================================================================
   Actor-aware payload helpers
============================================================================ */

type ActorAwareCreatePayload = CreateCampaignManualPayload & {
  adminId?: string;
  adminEmail?: string;
};

type ActorAwareEditPayload = EditDraftPayload & {
  adminId?: string;
  adminEmail?: string;
};

function getOptionalAdminPayload(): { adminId?: string; adminEmail?: string } {
  if (typeof window === "undefined") return {};

  const adminId =
    localStorage.getItem("adminId") ||
    sessionStorage.getItem("adminId") ||
    "";

  const adminEmail =
    localStorage.getItem("adminEmail") ||
    sessionStorage.getItem("adminEmail") ||
    "";

  return compact({
    ...(adminId ? { adminId } : {}),
    ...(adminEmail ? { adminEmail } : {}),
  }) as { adminId?: string; adminEmail?: string };
}

function getStoredBrandId() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("selectedBrandId") ||
    localStorage.getItem("currentBrandId") ||
    localStorage.getItem("brandId") ||
    sessionStorage.getItem("selectedBrandId") ||
    sessionStorage.getItem("currentBrandId") ||
    sessionStorage.getItem("brandId") ||
    getBrandId() ||
    ""
  ).trim();
}

function resolveTargetBrandId(
  explicitBrandId?: string | null,
  fallbackCampaign?: Partial<EnrichedCampaignDoc> | null
) {
  const direct = String(explicitBrandId || "").trim();
  if (direct) return direct;

  const fromCampaign = String((fallbackCampaign as any)?.brandId || "").trim();
  if (fromCampaign) return fromCampaign;

  return getStoredBrandId();
}

/* ============================================================================
   Payload builders
============================================================================ */

function buildCreateManualPayload(
  brandId: string,
  form: ManualForm,
  includeFiles: boolean
) {
  const actorPayload = getOptionalAdminPayload();

  const base: ActorAwareCreatePayload = {
    brandId,
    ...actorPayload,

    campaignTitle: form.title.trim(),
    description: form.description.trim(),
    campaignType: form.campaignType,

    categoryId: form.categoryId,
    subcategoryIds: form.subcategories,

    productLink: form.productLink.trim(),
    productImages: [],

    campaignGoals: form.goals,
    influencerTierIds: form.influencerTier,
    contentFormats: form.contentFormats,
    contentLanguageIds: form.contentLanguage,

    targetCountryIds: form.targetCountry,
    targetAgeRanges: form.targetAgeGroups,
    preferredHashtags: form.hashtags,

    numberOfInfluencers: Number(form.numberOfInfluencers || 0),
    ...(Number(form.maxFollowers) > 0
      ? { maxFollowers: Number(form.maxFollowers) }
      : {}),
    ...(Number(form.minFollowers) > 0
      ? { minFollowers: Number(form.minFollowers) }
      : {}),

    campaignBudget: Number(form.campaignBudget || 0),
    paymentType: form.paymentType,

    additionalNotes: form.additionalNotes || undefined,

    startAt: form.startDate || undefined,
    endAt: form.endDate || undefined,
  };

  if (!includeFiles) return base;

  return (async () => {
    const productImages = await filesToDataUrls(form.productFiles ?? []);
    return { ...base, productImages } as ActorAwareCreatePayload;
  })();
}

function buildEditDraftPayload(
  brandId: string,
  campaignId: string,
  form: ManualForm,
  status: CampaignStatus
): ActorAwareEditPayload {
  const actorPayload = getOptionalAdminPayload();

  return compact({
    brandId,
    campaignId,
    status,
    ...actorPayload,

    campaignTitle: form.title.trim(),
    description: form.description.trim(),
    campaignType: form.campaignType,

    categoryId: form.categoryId,
    subcategoryIds: form.subcategories,

    productLink: form.productLink.trim(),

    campaignGoals: form.goals,
    influencerTierIds: form.influencerTier,
    contentFormats: form.contentFormats,
    contentLanguageIds: form.contentLanguage,

    platformSelection: mapPlatforms(form.platforms),

    targetCountryIds: form.targetCountry,
    targetAgeRanges: form.targetAgeGroups,
    preferredHashtags: form.hashtags,

    numberOfInfluencers: Number(form.numberOfInfluencers || 0),
    ...(Number(form.minFollowers) > 0
      ? { minFollowers: Number(form.minFollowers) }
      : {}),
    ...(Number(form.maxFollowers) > 0
      ? { maxFollowers: Number(form.maxFollowers) }
      : {}),

    campaignBudget: Number(form.campaignBudget || 0),
    paymentType: form.paymentType,

    additionalNotes: form.additionalNotes || undefined,

    startAt: form.startDate || undefined,
    endAt: form.endDate || undefined,
  }) as ActorAwareEditPayload;
}

/* ============================================================================
   Validation
============================================================================ */

function validateManualForm(args: {
  form: ManualForm;
  dateOk: boolean;
  blockingFileErrors: string[];
  isEditMode?: boolean;
}) {
  const { form, dateOk, blockingFileErrors, isEditMode = false } = args;
  const e: Record<string, string> = {};

  if (!form.title.trim()) e.title = "Campaign title is required.";

  if (!form.description.trim()) {
    e.description = "Description is required.";
  } else if (form.description.trim().length < 50) {
    e.description = "Description must be at least 50 characters.";
  }

  if (!form.campaignType.trim()) {
    e.campaignType = "Campaign type is required.";
  }

  if (!form.categoryId.trim()) e.categoryId = "Campaign category is required.";

  if (!form.subcategories?.length) e.subcategories = "Select at least 1 subcategory.";
  if (!form.goals?.length) e.goals = "Select at least 1 campaign goal.";
  if (!form.platforms?.length) e.platforms = "Select at least 1 platform.";
  if (!form.targetCountry?.length) e.targetCountry = "Select at least 1 country.";
  if (!form.targetAgeGroups?.length) e.targetAgeGroups = "Select at least 1 age group.";

  if (!isEditMode && !form.productFiles?.length) {
    e.productFiles = "Upload at least 1 product image/file.";
  }

  if (blockingFileErrors?.length) e.productFiles = blockingFileErrors[0];

  if (!form.paymentType.trim()) e.paymentType = "Payment type is required.";

  if (!Number(form.campaignBudget) || Number(form.campaignBudget) <= 0) {
    e.campaignBudget = "Campaign budget is required.";
  }

  if (!form.startDate) e.startDate = "Start date is required.";
  if (!form.endDate) e.endDate = "End date is required.";

  if (form.startDate && form.endDate && !dateOk) {
    e.endDate = "End Date must be after Start Date.";
  }

  if (Number(form.minFollowers) < 0) {
    e.minFollowers = "Min followers can't be negative.";
  }

  if (Number(form.maxFollowers) < 0) {
    e.maxFollowers = "Max followers can't be negative.";
  }

  if (
    Number(form.minFollowers) > 0 &&
    Number(form.maxFollowers) > 0 &&
    Number(form.minFollowers) > Number(form.maxFollowers)
  ) {
    e.maxFollowers = "Max followers must be greater than or equal to Min followers.";
  }

  if (!Number(form.numberOfInfluencers) || Number(form.numberOfInfluencers) <= 0) {
    e.numberOfInfluencers = "Number of influencers is required.";
  }

  if (!form.influencerTier?.length) {
    e.influencerTier = "Select at least 1 influencer tier.";
  }

  if (!form.contentFormats?.length) {
    e.contentFormats = "Select at least 1 content format.";
  }

  return e;
}

/* ============================================================================
   Accordion + Chips
============================================================================ */

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
    <div className={cn("cg-accordion", open ? "cg-accordion--open" : "cg-accordion--closed")}>
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

        <span className="mt-[6px] shrink-0 text-neutral-900">
          {open ? <CaretUp size={20} /> : <CaretDown size={20} />}
        </span>
      </button>

      {open ? <div className="p-3 pt-0">{children}</div> : null}
    </div>
  );
}

function ChipMultiSelect({
  options,
  value,
  onChange,
}: {
  options: Array<string | Option>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const normalized: Option[] = useMemo(() => {
    const out: Option[] = (options ?? [])
      .map((o) => (typeof o === "string" ? { label: o, value: o } : o))
      .filter((o) => !!String(o?.value ?? "").trim() && !!String(o?.label ?? "").trim());

    const seen = new Set<string>();

    return out.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [options]);

  const toggle = useCallback(
    (id: string) => {
      if (value.includes(id)) onChange(value.filter((x) => x !== id));
      else onChange([...value, id]);
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {normalized.map((opt) => {
          const active = value.includes(opt.value);

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn("cg-chip", active && "cg-chip--active")}
            >
              <span className={cn("cg-chip-text", active && "cg-chip-text--active")}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   Manual Screen
============================================================================ */

function CreateManualScreen({
  sidebarOffsetPx,
  formMaxWidth = 760,
  bottomBarMaxWidth,
  lists,
  initialFromCampaign,
  targetBrandId,
  isEditMode = false,
  onAfterPublish,
}: {
  sidebarOffsetPx: number;
  formMaxWidth?: number;
  bottomBarMaxWidth?: number;
  lists: ReturnType<typeof useCampaignLists>;
  initialFromCampaign?: EnrichedCampaignDoc | null;
  targetBrandId?: string;
  isEditMode?: boolean;
  onAfterPublish?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ManualForm>(EMPTY_MANUAL);

  const [productFileErrors, setProductFileErrors] = useState<string[]>([]);
  const followersTouchedRef = useRef({ min: false, max: false });

  const [existingProductImages, setExistingProductImages] = useState<
    ExistingProductImage[]
  >([]);

  const [campaignId, setCampaignId] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  const [draftSaving, setDraftSaving] = useState(false);
  const [draftJustSaved, setDraftJustSaved] = useState(false);
  const draftSavedTimerRef = useRef<number | null>(null);

  const categoryPicker = useCategoryPicker({ debounceMs: 250, enabled: true });
  const [loadedDetails, setLoadedDetails] = useState<any>(null);
  const loadedInitialRef = useRef<EnrichedCampaignDoc | null>(null);

  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const showValidationSummaryToast = useCallback((errors: Record<string, string>) => {
    const firstError = Object.values(errors).find(Boolean);

    toastError(
      "Please fix the highlighted fields",
      firstError || "Some required campaign details are missing or invalid."
    );
  }, []);

  const resolvedBrandId = useMemo(
    () => resolveTargetBrandId(targetBrandId, initialFromCampaign || null),
    [targetBrandId, initialFromCampaign]
  );

  const setField = useCallback(<K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));

    setServerFieldErrors((prev) => {
      if (!prev[key as string]) return prev;

      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }, []);

  const extractBackendMessage = useCallback((e: any) => {
    return getBackendErrorMessage(e, "Failed to publish campaign.");
  }, []);

  const extractBackendSuccessMessage = useCallback((res: any, fallback: string) => {
    const d = res?.data ?? res;

    if (typeof d === "string") return d;
    if (typeof d?.message === "string" && d.message.trim()) return d.message;
    if (typeof d?.successMessage === "string" && d.successMessage.trim()) {
      return d.successMessage;
    }
    if (typeof d?.detail === "string" && d.detail.trim()) return d.detail;
    if (typeof d?.msg === "string" && d.msg.trim()) return d.msg;

    return fallback;
  }, []);

  const extractBackendFieldErrors = useCallback((e: any) => {
    const d = e?.response?.data ?? e?.data ?? e;

    const fe = d?.fieldErrors || d?.errorsByField || d?.validationErrors;
    if (fe && typeof fe === "object" && !Array.isArray(fe)) {
      return fe as Record<string, string>;
    }

    const arr = d?.errors;
    if (Array.isArray(arr)) {
      const out: Record<string, string> = {};

      for (const it of arr) {
        const k = String(it?.param ?? it?.field ?? it?.path ?? "").trim();
        const m = String(it?.msg ?? it?.message ?? "").trim();

        if (k && m && !out[k]) out[k] = m;
      }

      return out;
    }

    const issues = d?.issues;
    if (Array.isArray(issues)) {
      const out: Record<string, string> = {};

      for (const it of issues) {
        const path = Array.isArray(it?.path)
          ? String(it.path[0] ?? "")
          : String(it?.path ?? "");
        const m = String(it?.message ?? "").trim();
        const k = String(path).trim();

        if (k && m && !out[k]) out[k] = m;
      }

      return out;
    }

    return null;
  }, []);

  const normalizeExistingProductImages = useCallback((images: any[] = []) => {
    return images
      .map((img: any) => {
        if (typeof img === "string") {
          return {
            dataUrl: img,
            name: img.split("/").pop() || "Campaign image",
            type: "image/jpeg",
            contentType: "image/jpeg",
          };
        }

        const url = img?.dataUrl || img?.url || "";
        if (!url) return null;

        return {
          dataUrl: url,
          url,
          name: img?.name || url.split("/").pop() || "Campaign image",
          type: img?.type || img?.contentType || "image/jpeg",
          contentType: img?.contentType || img?.type || "image/jpeg",
          originalSize: img?.originalSize || img?.size || 0,
          size: img?.size || img?.originalSize || 0,
          key: img?.key || url.split("/").pop() || "",
        };
      })
      .filter(Boolean) as ExistingProductImage[];
  }, []);

  const loadCampaignIntoForm = useCallback(
    (doc: any) => {
      const normalizePaymentType = (v: any) => {
        const s = String(v ?? "").trim().toLowerCase();

        if (s === "milestone") return "Milestone";
        if (s === "fixed") return "Fixed";
        if (s === "gifting") return "Gifting";

        return "Milestone";
      };

      try {
        const id = pickCampaignId(doc);
        if (id) setCampaignId(id);

        const details = doc?.details ?? null;
        setLoadedDetails(details);

        setExistingProductImages(
          normalizeExistingProductImages(doc?.productImages || doc?.images || [])
        );

        const nextCategoryId = String(
          doc?.categoryId ?? details?.category?.id ?? ""
        ).trim();

        const categoryFromPicker = categoryPicker.categoryOptions.find(
          (o) => o.value === nextCategoryId
        );

        const nextCategoryName = String(
          doc?.categoryName ??
            doc?.category?.name ??
            details?.category?.name ??
            categoryFromPicker?.label ??
            ""
        ).trim();

        const next: ManualForm = {
          ...EMPTY_MANUAL,
          title: String(doc?.campaignTitle ?? doc?.title ?? "").trim(),
          description: String(doc?.description ?? "").trim(),
          campaignType: String(doc?.campaignType ?? "").trim(),
          categoryId: nextCategoryId,
          categoryName: nextCategoryName,
          subcategories: idsOf(
            doc?.subcategoryIds ?? details?.subcategories ?? doc?.subcategories
          ),
          productLink: String(doc?.productLink ?? "").trim(),
          productFiles: [],
          goals: idsOf(doc?.campaignGoals ?? details?.campaignGoals ?? doc?.goals),
          numberOfInfluencers: Number(doc?.numberOfInfluencers ?? 0),
          influencerTier: idsOf(doc?.influencerTierIds ?? details?.influencerTiers),
          minFollowers: Number(doc?.minFollowers ?? 0),
          maxFollowers: Number(doc?.maxFollowers ?? 0),
          contentFormats: idsOf(doc?.contentFormats ?? details?.contentFormats),
          contentLanguage: idsOf(doc?.contentLanguageIds ?? details?.contentLanguages),
          paymentType: normalizePaymentType(doc?.paymentType ?? "Milestone"),
          campaignBudget: Number(doc?.campaignBudget ?? 0),
          startDate: safeDateInput(doc?.startAt ?? doc?.startDate),
          endDate: safeDateInput(doc?.endAt ?? doc?.endDate),
          platforms: (Array.isArray(doc?.platformSelection)
            ? doc.platformSelection
            : []
          )
            .map(platformToUi)
            .filter(Boolean),
          targetCountry: idsOf(doc?.targetCountryIds ?? details?.targetCountries),
          targetAgeGroups: idsOf(doc?.targetAgeRanges ?? details?.targetAgeRanges),
          additionalNotes: String(doc?.additionalNotes ?? ""),
          attachment: null,
          hashtags: idsOf(doc?.preferredHashtags ?? doc?.hashtags),
        };

        setForm(next);

        if (nextCategoryId) {
          categoryPicker.hydrateSelectedCategory({
            id: nextCategoryId,
            name: nextCategoryName || "Selected category",
          });
        }

        setServerFieldErrors({});
      } catch (error) {
        toastError(
          "Failed to prepare campaign form",
          getBackendErrorMessage(error, "Campaign details could not be loaded into the form.")
        );
      }
    },
    [categoryPicker, normalizeExistingProductImages]
  );

  useEffect(() => {
    if (!initialFromCampaign) return;
    if (loadedInitialRef.current === initialFromCampaign) return;

    loadedInitialRef.current = initialFromCampaign;
    loadCampaignIntoForm(initialFromCampaign);
  }, [initialFromCampaign, loadCampaignIntoForm]);

  const seededHashtagOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.preferredHashtags ?? [])
        .map((h: any) => ({
          label: String(h?.tag ?? "").trim(),
          value: String(h?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const hashtagOptions = useMemo(
    () => mergeOptions(lists.preferredHashtags, seededHashtagOptions),
    [lists.preferredHashtags, seededHashtagOptions]
  );

  const seededGoalOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.campaignGoals ?? [])
        .map((g: any) => ({
          label: String(g?.goal ?? "").trim(),
          value: String(g?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededTierOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.influencerTiers ?? [])
        .map((t: any) => {
          const category = String(t?.category ?? "").trim();
          const range = prettyTierValue(t?.value);
          const label = category && range ? `${category} (${range})` : category || range;

          return {
            label,
            value: String(t?.id ?? "").trim(),
          };
        })
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededCategoryOption = useMemo<Option[]>(() => {
    const id = String(form.categoryId || loadedDetails?.category?.id || "").trim();
    const fromPicker = categoryPicker.categoryOptions.find((o) => o.value === id);

    const label = String(
      form.categoryName || loadedDetails?.category?.name || fromPicker?.label || ""
    ).trim();

    if (!id || !label) return [];

    return [{ value: id, label }];
  }, [
    form.categoryId,
    form.categoryName,
    loadedDetails,
    categoryPicker.categoryOptions,
  ]);

  const categoryOptionsMerged = useMemo(
    () => mergeOptions(categoryPicker.categoryOptions, seededCategoryOption),
    [categoryPicker.categoryOptions, seededCategoryOption]
  );

  const seededFormatOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.contentFormats ?? [])
        .map((f: any) => ({
          label: String(f?.format ?? "").trim(),
          value: String(f?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededLangOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.contentLanguages ?? [])
        .map((l: any) => ({
          label: String(l?.name ?? "").trim(),
          value: String(l?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededAgeOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.targetAgeRanges ?? [])
        .map((a: any) => ({
          label: String(a?.range ?? "").trim(),
          value: String(a?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededCountryOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.targetCountries ?? [])
        .map((c: any) => {
          const name = String(c?.countryNameEn ?? "").trim();
          const flag = String(c?.flag ?? "").trim();
          const id = String(c?.id ?? "").trim();

          if (!name || !id) return null;

          return {
            label: `${flag ? flag + " " : ""}${name}`,
            value: id,
          };
        })
        .filter(Boolean) as Option[],
    [loadedDetails]
  );

  const seededSubcategoryOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.subcategories ?? [])
        .map((s: any) => ({
          label: String(s?.name ?? "").trim(),
          value: String(s?.id ?? "").trim(),
        }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const goalsOptions = useMemo(
    () => mergeOptions(lists.productServiceGoals, seededGoalOptions),
    [lists.productServiceGoals, seededGoalOptions]
  );

  const tierOptions = useMemo(
    () => mergeOptions(lists.influencerTiers, seededTierOptions),
    [lists.influencerTiers, seededTierOptions]
  );

  const formatOptions = useMemo(
    () => mergeOptions(lists.contentFormats, seededFormatOptions),
    [lists.contentFormats, seededFormatOptions]
  );

  const langOptions = useMemo(
    () => mergeOptions(lists.contentLanguages, seededLangOptions),
    [lists.contentLanguages, seededLangOptions]
  );

  const ageOptions = useMemo(
    () => mergeOptions(lists.ageRanges, seededAgeOptions),
    [lists.ageRanges, seededAgeOptions]
  );

  const countryNameOptions = useMemo(
    () => mergeOptions(lists.countriesByName, seededCountryOptions),
    [lists.countriesByName, seededCountryOptions]
  );

  const subcategoryOptionsMerged = useMemo(
    () => mergeOptions(categoryPicker.subcategoryOptions, seededSubcategoryOptions),
    [categoryPicker.subcategoryOptions, seededSubcategoryOptions]
  );

  const tierRangeById = useMemo(() => {
    const out = new Map<string, TierRange>();

    const add = (id: any, label?: string) => {
      const key = String(id ?? "").trim();
      if (!key) return;

      const fromLabel = parseRangeFromText(label);
      if (fromLabel) out.set(key, fromLabel);
    };

    for (const t of (loadedDetails?.influencerTiers ?? []) as any[]) {
      add(t?.id, `${String(t?.category ?? "")} (${prettyTierValue(t?.value)})`);
    }

    const rawTiers = (lists as any)?.raw?.influencerTiers ?? [];
    for (const t of rawTiers as any[]) {
      add(t?.id, `${String(t?.category ?? "")} (${prettyTierValue(t?.value)})`);
    }

    for (const opt of tierOptions) {
      add(opt.value, opt.label);
    }

    return out;
  }, [loadedDetails, lists, tierOptions]);

  const selectedCountryOptions = useMemo(() => {
    const map = new Map((lists.raw.countries ?? []).map((c: any) => [countryKey(c), c]));

    return (form.targetCountry ?? [])
      .map((id) => {
        const c = map.get(id);
        if (!c) return null;

        const name = String((c as any)?.countryNameEn ?? "").trim();
        const flag = String((c as any)?.flag ?? "").trim();

        if (!name) return null;

        return {
          label: `${flag ? flag + " " : ""}${name}`,
          value: id,
        };
      })
      .filter(Boolean) as Option[];
  }, [form.targetCountry, lists.raw.countries]);

  const countryOptionsForSelect = useMemo(
    () => mergeOptions(countryNameOptions, selectedCountryOptions),
    [countryNameOptions, selectedCountryOptions]
  );

  const dateOk = isValidDateRange(form.startDate, form.endDate);
  const datesFilled = !!form.startDate && !!form.endDate;

  const progress = useMemo(() => {
    const checks = [
      form.title.trim().length > 0,
      form.description.trim().length > 49,
      form.campaignType.trim().length > 0,
      form.categoryId.trim().length > 0,
      form.subcategories.length > 0,
      form.goals.length > 0,
      form.numberOfInfluencers > 0,
      form.influencerTier.length > 0,
      form.contentFormats.length > 0,
      form.platforms.length > 0,
      form.targetCountry.length > 0,
      form.targetAgeGroups.length > 0,
      form.paymentType.trim().length > 0,
      form.startDate.trim().length > 0,
      form.endDate.trim().length > 0,
      Number(form.campaignBudget || 0) > 0,
      datesFilled && dateOk,
      isEditMode ||
        ((form.productFiles?.length || 0) > 0 && productFileErrors.length === 0),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, dateOk, datesFilled, productFileErrors.length, isEditMode]);

  const computedBottomBarMaxW = bottomBarMaxWidth ?? formMaxWidth + 120;

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_MANUAL });
    setProductFileErrors([]);
    setExistingProductImages([]);
    setCampaignId("");
    setLoadedDetails(null);

    categoryPicker.hydrateSelectedCategory(null);
    categoryPicker.setSearch("");
    categoryPicker.setSubSearch("");

    setDraftJustSaved(false);

    if (draftSavedTimerRef.current) {
      window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = null;
    }

    setSubmitAttempted(false);
    setServerFieldErrors({});

    toastSuccess("Form reset", "Campaign form has been cleared.");
  }, [categoryPicker]);

  const saveDraftManually = useCallback(async () => {
    const adminActor = getOptionalAdminPayload();
    const brandId = resolveTargetBrandId(resolvedBrandId, initialFromCampaign || null);

    if (!brandId) {
      if (adminActor.adminId || adminActor.adminEmail) {
        toastError("Brand not selected", "Please open this page with a valid brandId.");
      } else {
        toastError("Login required", "Please login again.");
      }
      return;
    }

    setDraftSaving(true);

    if (draftSavedTimerRef.current) {
      window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = null;
    }

    try {
      if (!campaignId) {
        const createBase = await buildCreateManualPayload(brandId, form, false);
        const res = await apiCampaignCreate({
          ...(createBase as ActorAwareCreatePayload),
          status: "draft" as CampaignStatus,
        });

        const id = pickCampaignId(res);
        if (id) setCampaignId(id);

        toastSuccess(extractBackendSuccessMessage(res, "Draft saved"));
      } else {
        const payload = buildEditDraftPayload(brandId, campaignId, form, "draft");
        const res = await apiCampaignEditDraft(payload);

        toastSuccess(extractBackendSuccessMessage(res, "Draft updated"));
      }

      setDraftJustSaved(true);
      draftSavedTimerRef.current = window.setTimeout(
        () => setDraftJustSaved(false),
        1200
      );
    } catch (e) {
      const backendMsg = extractBackendMessage(e);
      const fieldErrors = extractBackendFieldErrors(e);

      if (fieldErrors && Object.keys(fieldErrors).length) {
        setServerFieldErrors(fieldErrors);
        setSubmitAttempted(true);
      }

      toastError("Failed to save draft", backendMsg);
    } finally {
      setDraftSaving(false);
    }
  }, [
    campaignId,
    form,
    resolvedBrandId,
    initialFromCampaign,
    extractBackendMessage,
    extractBackendSuccessMessage,
    extractBackendFieldErrors,
  ]);

  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) {
        window.clearTimeout(draftSavedTimerRef.current);
      }
    };
  }, []);

  const manualErrors = useMemo(
    () =>
      validateManualForm({
        form,
        dateOk,
        blockingFileErrors: productFileErrors,
        isEditMode,
      }),
    [form, dateOk, productFileErrors, isEditMode]
  );

  const combinedErrors = useMemo(() => {
    return { ...manualErrors, ...(serverFieldErrors || {}) };
  }, [manualErrors, serverFieldErrors]);

  const stateFor = useCallback(
    (key: string) =>
      submitAttempted && combinedErrors[key] ? ("error" as const) : undefined,
    [submitAttempted, combinedErrors]
  );

  const msgFor = useCallback(
    (key: string) => (submitAttempted ? combinedErrors[key] : ""),
    [submitAttempted, combinedErrors]
  );

  const publishCampaign = useCallback(async () => {
    setSubmitAttempted(true);
    setServerFieldErrors({});

    const errs = validateManualForm({
      form,
      dateOk,
      blockingFileErrors: productFileErrors,
      isEditMode,
    });

    if (Object.values(errs).some(Boolean)) {
      showValidationSummaryToast(errs);
      return;
    }

    const adminActor = getOptionalAdminPayload();
    const brandId = resolveTargetBrandId(resolvedBrandId, initialFromCampaign || null);

    if (!brandId) {
      if (adminActor.adminId || adminActor.adminEmail) {
        toastError("Brand not selected", "Please open this page with a valid brandId.");
      } else {
        toastError("Login required", "Please login again.");
      }
      return;
    }

    setPublishing(true);

    try {
      let publishedCampaignId = campaignId;

      let uploadedImages: Array<{
        dataUrl: string;
        name: string;
        type: string;
        contentType: string;
        originalSize: number;
        size: number;
        key: string;
      }> = [];

      let productImagesForPayload: any[] = isEditMode ? existingProductImages : [];

      if (form.productFiles?.length) {
        const uploadRes = await apiUploadImages(form.productFiles);
        const urls: string[] = uploadRes?.urls ?? uploadRes?.data?.urls ?? [];

        if (!urls.length) {
          throw new Error("Image upload failed. No image URLs returned from backend.");
        }

        uploadedImages = urls.map((url, i) => {
          const file = form.productFiles[i];
          const key = url.split("/campaign-images/")[1] ?? url.split("/").pop() ?? "";

          return {
            dataUrl: url,
            name: file?.name ?? "",
            type: file?.type ?? "image/jpeg",
            contentType: file?.type ?? "image/jpeg",
            originalSize: file?.size ?? 0,
            size: file?.size ?? 0,
            key,
          };
        });

        productImagesForPayload = isEditMode
          ? [...existingProductImages, ...uploadedImages]
          : uploadedImages;
      }

      if (campaignId) {
        const commonPayload = compact({
          brandId,
          campaignId,
          ...getOptionalAdminPayload(),

          campaignTitle: form.title.trim(),
          description: form.description.trim(),
          campaignType: form.campaignType,
          categoryId: form.categoryId,
          subcategoryIds: form.subcategories,
          productLink: form.productLink.trim(),
          productImages: productImagesForPayload.length
            ? productImagesForPayload
            : undefined,
          campaignGoals: form.goals,
          influencerTierIds: form.influencerTier,
          contentFormats: form.contentFormats,
          contentLanguageIds: form.contentLanguage,
          platformSelection: mapPlatforms(form.platforms),
          targetCountryIds: form.targetCountry,
          targetAgeRanges: form.targetAgeGroups,
          preferredHashtags: form.hashtags,
          numberOfInfluencers: Number(form.numberOfInfluencers || 0),
          ...(Number(form.minFollowers) > 0
            ? { minFollowers: Number(form.minFollowers) }
            : {}),
          ...(Number(form.maxFollowers) > 0
            ? { maxFollowers: Number(form.maxFollowers) }
            : {}),
          campaignBudget: Number(form.campaignBudget || 0),
          paymentType: form.paymentType,
          additionalNotes: form.additionalNotes || undefined,
          startAt: form.startDate || undefined,
          endAt: form.endDate || undefined,
        });

        const updated: any = isEditMode
          ? await apiAdminEditCampaign(commonPayload)
          : await apiCampaignEditDraft({
              ...commonPayload,
              status: "active" as CampaignStatus,
            } as ActorAwareEditPayload);

        const cid = pickCampaignId(updated) || campaignId;

        publishedCampaignId = cid;

        if (cid) setCampaignId(cid);

        toastSuccess(
          extractBackendSuccessMessage(
            updated,
            isEditMode ? "Campaign changes saved" : "Campaign published"
          )
        );
      } else {
        const base = buildCreateManualPayload(
          brandId,
          form,
          false
        ) as ActorAwareCreatePayload;

        const created: any = await apiCampaignCreate({
          ...base,
          productImages: productImagesForPayload,
          status: "active" as CampaignStatus,
        });

        const cid = pickCampaignId(created);

        publishedCampaignId = cid;

        if (cid) setCampaignId(cid);

        toastSuccess(extractBackendSuccessMessage(created, "Campaign published"));
      }

      if (publishedCampaignId) {
        resetForm();
        router.replace(`/admin/campaigns/view?id=${publishedCampaignId}`);
        onAfterPublish?.();
      } else {
        toastWarning("Campaign published", "Campaign ID not found for redirect.");
      }
    } catch (e: any) {
      const backendMsg = extractBackendMessage(e);
      const fe = extractBackendFieldErrors(e);

      if (fe && Object.keys(fe).length) {
        setServerFieldErrors(fe);
        setSubmitAttempted(true);
      }

      toastError(
        isEditMode ? "Failed to save campaign" : "Failed to publish campaign",
        backendMsg
      );
    } finally {
      setPublishing(false);
    }
  }, [
    campaignId,
    isEditMode,
    form,
    dateOk,
    productFileErrors,
    resolvedBrandId,
    initialFromCampaign,
    resetForm,
    onAfterPublish,
    extractBackendMessage,
    extractBackendFieldErrors,
    extractBackendSuccessMessage,
    existingProductImages,
    router,
    showValidationSummaryToast,
  ]);

  const catSearchProps = useSearchProps(categoryPicker.search, categoryPicker.setSearch);
  const tierSearchProps = useSearchProps(
    lists.search.influencerTiers.value,
    lists.search.influencerTiers.onChange
  );
  const formatSearchProps = useSearchProps(
    lists.search.contentFormats.value,
    lists.search.contentFormats.onChange
  );
  const langSearchProps = useSearchProps(
    lists.search.contentLanguages.value,
    lists.search.contentLanguages.onChange
  );
  const countrySearchProps = useSearchProps(
    lists.search.countries.value,
    lists.search.countries.onChange
  );
  const ageSearchProps = useSearchProps(
    lists.search.ageRanges.value,
    lists.search.ageRanges.onChange
  );
  const hashtagSearchProps = useSearchProps(
    lists.search.preferredHashtags.value,
    lists.search.preferredHashtags.onChange
  );

  return (
    <>
      <div className="cg-page-frame flex min-h-0 h-[100dvh] w-full flex-col overflow-hidden">
        <div className="grid h-full min-h-0 w-full grid-cols-1">
          <section className="flex min-h-0 min-w-0 flex-col">
            <div className="flex min-h-0 flex-col border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="cg-accordion-title">
                    {isEditMode ? "Edit Campaign" : "Create Campaign"}
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-4 pt-5 sm:px-6 lg:px-10">
                <div className="w-full pb-4">
                  <ProgressBar
                    value={progress}
                    heightClassName="h-[3px]"
                    barClassName="bg-success-500"
                  />
                </div>
              </div>

              <div className="cg-scrollbar flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
                <div
                  className="min-w-0 px-4 pb-10 sm:px-6 lg:px-5"
                  style={{ paddingBottom: "calc(var(--cg-bottombar-h) + 32px)" }}
                >
                  <div className="rounded-l border border-[#D6D6D6] p-5">
                    <div className="bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="cg-accordion-title">
                            Product / Service Info
                          </div>
                          <div className="cg-accordion-subtitle">
                            Describe your product or service, the campaign goal, and what you’d like creators to highlight.
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-4">
                        <FloatingInput
                          label="Campaign title"
                          maxLength={100}
                          required
                          value={form.title}
                          onValueChange={(val) => setField("title", val)}
                          state={stateFor("title")}
                          errorText={msgFor("title")}
                        />

                        <LabeledTextarea
                          label="Description"
                          required
                          value={form.description}
                          minLength={50}
                          maxLength={4000}
                          onChange={(e: any) =>
                            setField("description", String(e.target.value))
                          }
                          state={stateFor("description")}
                          errorText={msgFor("description")}
                        />

                        <FloatingSelect
                          {...SEARCHABLE_UI}
                          label="Campaign Type"
                          value={form.campaignType}
                          searchable={false}
                          onValueChange={(v) => setField("campaignType", v)}
                          state={stateFor("campaignType")}
                          errorText={msgFor("campaignType")}
                        >
                          {CAMPAIGN_TYPES.map((x) => (
                            <SelectItem key={x.value} value={x.value}>
                              {x.label}
                            </SelectItem>
                          ))}
                        </FloatingSelect>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FloatingSelect
                            {...catSearchProps}
                            label="Campaign category"
                            required
                            value={form.categoryId}
                            onValueChange={(id) => {
                              categoryPicker.selectCategoryId(id);
                              const opt = categoryOptionsMerged.find(
                                (o) => o.value === id
                              );

                              setField("categoryId", id);
                              setField("categoryName", opt?.label ?? "");
                              setField("subcategories", []);
                            }}
                            state={stateFor("categoryId")}
                            errorText={msgFor("categoryId")}
                            clientFilter={false}
                          >
                            {categoryOptionsMerged.map((x) => (
                              <SelectItem key={x.value} value={x.value}>
                                {x.label}
                              </SelectItem>
                            ))}
                          </FloatingSelect>

                          <FloatingMultiSelect
                            {...SEARCHABLE_UI}
                            label="Sub Category"
                            required
                            value={form.subcategories}
                            options={subcategoryOptionsMerged}
                            onValueChange={(next) => setField("subcategories", next)}
                            state={stateFor("subcategories")}
                            errorText={msgFor("subcategories")}
                            includeAll={false}
                          />
                        </div>

                        <ProductCardUpload
                          files={form.productFiles}
                          required
                          error={Boolean(stateFor("productFiles"))}
                          errorText={msgFor("productFiles")}
                          onFilesChange={(next) => {
                            const errs = validateFiles(next, "Product file");
                            setProductFileErrors(errs);

                            if (errs.length) {
                              toastError("Invalid product file", errs[0]);
                              return;
                            }

                            setField("productFiles", next);
                            setServerFieldErrors((prev) => {
                              const nextErrors = { ...prev };
                              delete nextErrors.productFiles;
                              return nextErrors;
                            });
                          }}
                        />

                        {isEditMode && existingProductImages.length > 0 ? (
                          <div className="rounded-xl border border-neutral-200 bg-white p-3">
                            <div className="mb-2 text-sm font-medium text-neutral-800">
                              Existing Campaign Images
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                              {existingProductImages.map((img, index) => {
                                const src = img.dataUrl || img.url || "";

                                return (
                                  <div
                                    key={`${src}-${index}`}
                                    className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                                  >
                                    <img
                                      src={src}
                                      alt={img.name || `Campaign image ${index + 1}`}
                                      className="h-28 w-full object-cover"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExistingProductImages((prev) =>
                                          prev.filter((_, i) => i !== index)
                                        )
                                      }
                                      className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-white"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <FloatingInput
                          label="Product Link / Video references"
                          value={form.productLink}
                          onValueChange={(val) => setField("productLink", val)}
                          state={stateFor("productLink")}
                          errorText={msgFor("productLink")}
                        />

                        <div>
                          <div
                            className={cn(
                              "cg-description mb-2 flex items-center gap-1 text-size-[14px]",
                              stateFor("goals") && "!text-red-600"
                            )}
                          >
                            <span>Campaign Goals</span>
                            <span className="!text-red-600">*</span>
                          </div>

                          <ChipMultiSelect
                            options={goalsOptions}
                            value={form.goals}
                            onChange={(next) => setField("goals", next)}
                          />

                          {stateFor("goals") ? (
                            <div className="mt-1 text-[14px] text-red-600">
                              {msgFor("goals")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex flex-col gap-[40px]">
                      <AccordionCard
                        title="Creator Requirements"
                        subtitle="Define who you’re looking to collaborate with."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FloatingInput
                            label="Number of Influencers"
                            type="number"
                            required
                            value={String(form.numberOfInfluencers || "")}
                            onValueChange={(v) =>
                              setField("numberOfInfluencers", clampNonNegative(v))
                            }
                            state={stateFor("numberOfInfluencers")}
                            errorText={msgFor("numberOfInfluencers")}
                          />

                          <FloatingMultiSelect
                            {...tierSearchProps}
                            label="Influencer Tier"
                            required
                            value={form.influencerTier}
                            searchable={false}
                            options={tierOptions}
                            onValueChange={(next) => {
                              setForm((prev) => {
                                const selected = next ?? [];

                                if (selected.length === 0) {
                                  followersTouchedRef.current.min = false;
                                  followersTouchedRef.current.max = false;

                                  return {
                                    ...prev,
                                    influencerTier: [],
                                    minFollowers: 0,
                                    maxFollowers: 0,
                                  };
                                }

                                const ranges = selected.map((id) =>
                                  tierRangeById.get(id)
                                );
                                const agg = aggregateRanges(ranges);

                                const nextMin =
                                  !followersTouchedRef.current.min && agg?.min != null
                                    ? agg.min
                                    : prev.minFollowers;

                                const nextMax =
                                  !followersTouchedRef.current.max && agg?.max != null
                                    ? agg.max
                                    : prev.maxFollowers;

                                return {
                                  ...prev,
                                  influencerTier: selected,
                                  minFollowers: nextMin ?? prev.minFollowers,
                                  maxFollowers: nextMax ?? prev.maxFollowers,
                                };
                              });

                              setServerFieldErrors((prev) => {
                                if (!prev.influencerTier) return prev;

                                const out = { ...prev };
                                delete out.influencerTier;
                                return out;
                              });
                            }}
                            includeAll={false}
                            state={stateFor("influencerTier")}
                            errorText={msgFor("influencerTier")}
                          />

                          <FloatingInput
                            label="Min Followers"
                            type="number"
                            value={String(form.minFollowers || "")}
                            onValueChange={(v) => {
                              const n = clampNonNegative(v);
                              followersTouchedRef.current.min = n > 0;
                              setField("minFollowers", n);
                            }}
                            state={stateFor("minFollowers")}
                            errorText={msgFor("minFollowers")}
                          />

                          <FloatingInput
                            label="Max Followers"
                            type="number"
                            value={String(form.maxFollowers || "")}
                            onValueChange={(v) => {
                              const n = clampNonNegative(v);
                              followersTouchedRef.current.max = n > 0;
                              setField("maxFollowers", n);
                            }}
                            state={stateFor("maxFollowers")}
                            errorText={msgFor("maxFollowers")}
                          />

                          <FloatingMultiSelect
                            {...formatSearchProps}
                            label="Content Format"
                            required
                            value={form.contentFormats}
                            options={formatOptions}
                            onValueChange={(next) => setField("contentFormats", next)}
                            includeAll={false}
                            searchable={false}
                            state={stateFor("contentFormats")}
                            errorText={msgFor("contentFormats")}
                          />

                          <FloatingMultiSelect
                            {...langSearchProps}
                            label="Content Language"
                            value={form.contentLanguage}
                            options={langOptions}
                            onValueChange={(next) => setField("contentLanguage", next)}
                            includeAll={false}
                          />
                        </div>
                      </AccordionCard>

                      <AccordionCard
                        title="Timeline & Payments"
                        subtitle="Set Budget for delivery and how you want to pay creators."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <FloatingSelect
                            label="Payment Type"
                            required
                            value={form.paymentType}
                            onValueChange={(v) => setField("paymentType", v)}
                            state={stateFor("paymentType")}
                            errorText={msgFor("paymentType")}
                            searchable={false}
                            searchPlaceholder={undefined}
                          >
                            <SelectItem value="Milestone">Milestone</SelectItem>
                            <SelectItem value="Fixed">Fixed</SelectItem>
                            <SelectItem value="Gifting">Gifting</SelectItem>
                          </FloatingSelect>

                          <FloatingInput
                            label="Campaign Budget"
                            required
                            type="number"
                            prefixText="$"
                            value={String(form.campaignBudget || "")}
                            onValueChange={(v) =>
                              setField("campaignBudget", clampNonNegative(v))
                            }
                            state={stateFor("campaignBudget")}
                            errorText={msgFor("campaignBudget")}
                          />

                          <FloatingDateInput
                            label="Start Date"
                            required
                            type="date"
                            value={form.startDate}
                            min={TODAY}
                            onValueChange={(v) => {
                              setField("startDate", v);

                              if (form.endDate && isSameOrBeforeISO(form.endDate, v)) {
                                setField("endDate", addDaysISO(v, 1));
                              }
                            }}
                            state={stateFor("startDate")}
                            errorText={msgFor("startDate")}
                          />

                          <FloatingDateInput
                            label="End Date"
                            required
                            type="date"
                            value={form.endDate}
                            min={form.startDate ? addDaysISO(form.startDate, 1) : TODAY}
                            onValueChange={(v) => setField("endDate", v)}
                            state={stateFor("endDate")}
                            errorText={msgFor("endDate")}
                          />
                        </div>
                      </AccordionCard>

                      <AccordionCard
                        title="Audience & Platforms"
                        subtitle="Choose where and who this campaign should reach."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <FloatingMultiSelect
                              {...SEARCHABLE_UI}
                              label="Platform Selection"
                              required
                              value={form.platforms}
                              options={MANUAL_PLATFORM_OPTIONS}
                              onValueChange={(next) => setField("platforms", next)}
                              includeAll={false}
                              searchable={false}
                              state={stateFor("platforms")}
                              errorText={msgFor("platforms")}
                            />
                          </div>

                          <FloatingMultiSelect
                            {...countrySearchProps}
                            label="Target country"
                            required
                            value={form.targetCountry}
                            options={countryOptionsForSelect}
                            onValueChange={(next) => setField("targetCountry", next)}
                            includeAll={false}
                            state={stateFor("targetCountry")}
                            errorText={msgFor("targetCountry")}
                          />

                          <FloatingMultiSelect
                            {...ageSearchProps}
                            label="Target age group"
                            required
                            value={form.targetAgeGroups}
                            searchable={false}
                            options={ageOptions}
                            onValueChange={(next) => setField("targetAgeGroups", next)}
                            includeAll={false}
                            state={stateFor("targetAgeGroups")}
                            errorText={msgFor("targetAgeGroups")}
                          />

                          <div className="md:col-span-2">
                            <LabeledTextarea
                              label="Additional notes"
                              placeholder="Add any extra context, internal notes, or instructions you don’t want to miss."
                              value={form.additionalNotes}
                              onChange={(e) =>
                                setField(
                                  "additionalNotes",
                                  String((e as any).target.value)
                                )
                              }
                              maxLength={4000}
                              showAttachment
                              attachment={form.attachment}
                              onAttachmentChange={(file) => {
                                const errs = file ? validateFiles([file], "Attachment") : [];

                                if (errs.length) {
                                  toastError("Invalid attachment", errs[0]);
                                  return;
                                }

                                setField("attachment", file);
                              }}
                              accept="image/*,.pdf,.doc,.docx"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <FloatingTagInput
                              {...hashtagSearchProps}
                              label="Preferred Hashtags"
                              value={form.hashtags}
                              options={hashtagOptions}
                              onValueChange={(next) => setField("hashtags", next)}
                              includeAll={false}
                              dropdownDirection="up"
                            />
                          </div>
                        </div>
                      </AccordionCard>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <FixedBottomBar
        sidebarOffsetPx={sidebarOffsetPx}
        containerMaxWidth={computedBottomBarMaxW}
        left={
          <>
            <Button
              variant="raised"
              className="shadow-none"
              style={{ color: "var(--Light-Border-Negative, #E35141)" }}
              onClick={resetForm}
              disabled={draftSaving || publishing}
            >
              Reset
            </Button>

            <span aria-hidden className="h-5 w-px bg-[#E6E6E6]" />

            <Button
              variant="raised"
              className="shadow-none"
              onClick={saveDraftManually}
              disabled={draftSaving || publishing}
            >
              {draftSaving
                ? "Saving Draft..."
                : draftJustSaved
                  ? "Draft Saved"
                  : "Save Draft"}
            </Button>
          </>
        }
        right={
          <Button onClick={publishCampaign} disabled={publishing}>
            <PaperPlaneTilt size={16} className="mr-2" />
            {publishing
              ? isEditMode
                ? "Saving Changes…"
                : "Publishing…"
              : isEditMode
                ? "Save Changes"
                : "Publish Campaign"}
          </Button>
        }
      />
    </>
  );
}

/* ============================================================================
   Main Page
============================================================================ */

export default function CreateCampaignPage() {
  const searchParams = useSearchParams();

  const editCampaignId =
    searchParams.get("campaignId") ||
    searchParams.get("id") ||
    "";

  const queryBrandId = searchParams.get("brandId") || "";

  const sidebarOffsetPx = useSidebarOffsetPx();
  const [manualFromCampaign, setManualFromCampaign] =
    useState<EnrichedCampaignDoc | null>(null);

  const [loading, setLoading] = useState(Boolean(editCampaignId));

  const lists = useCampaignLists(true);

  const resolvedBrandId = useMemo(
    () => resolveTargetBrandId(queryBrandId, manualFromCampaign),
    [queryBrandId, manualFromCampaign]
  );

  useEffect(() => {
    if (!editCampaignId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const res: any = await apiCampaignGetById2(editCampaignId);

        if (cancelled) return;

        const doc =
          res?.data?.data ||
          res?.data?.campaign ||
          res?.campaign ||
          res?.data ||
          res;

        setManualFromCampaign(doc as EnrichedCampaignDoc);
      } catch (e) {
        if (cancelled) return;

        toastError(
          "Failed to load campaign",
          getBackendErrorMessage(e, "Unable to load campaign details.")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editCampaignId, resolvedBrandId, queryBrandId]);

  if (loading) {
    return (
      <>
        <ToastStyles />

        <CenterWrap>
          <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="h-6 w-40 rounded bg-neutral-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-100" />
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="h-[260px] rounded-xl bg-neutral-100" />
            </div>
          </div>
        </CenterWrap>
      </>
    );
  }

  return (
    <>
      <ToastStyles />

      <CreateManualScreen
        sidebarOffsetPx={sidebarOffsetPx}
        formMaxWidth={LAYOUT.manualFormMaxWidth}
        lists={lists}
        initialFromCampaign={manualFromCampaign}
        targetBrandId={resolvedBrandId}
        isEditMode={Boolean(editCampaignId)}
        onAfterPublish={() => setManualFromCampaign(null)}
      />
    </>
  );
}