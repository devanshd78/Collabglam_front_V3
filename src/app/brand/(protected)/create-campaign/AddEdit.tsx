"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/buttonComp";
import { FloatingInput } from "@/components/ui/floatingInput";
import { FloatingMultiSelect, FloatingSelect, SelectItem } from "@/components/ui/selectComp";
import { LabeledTextarea } from "@/components/ui/textAreaComp";
import { ProductCardUpload } from "@/components/ui/productCard-Image";
import { ManualPreviewCardStack, toMap } from "@/components/ui/cardPreview";
import { FloatingDateInput } from "@/components/ui/date";
import { FloatingTagInput } from "@/components/ui/tagInput";

import { TopbarAction, useBrandTopbar } from "@/components/ui/brand/brandTopbarProvider";

import {
  apiCampaignCreate,
  apiCampaignEditDraft,
  apiCampaignGetById2,
  apiCampaignPrefillAI,
  apiCampaignGetByBrand,
  apiGetTimezonesByCountries,
  getApiErrorMessage,
  CampaignStatus,
  CreateCampaignManualPayload,
  EditDraftPayload,
  EnrichedCampaignDoc,
  PrefillCampaignAIPayload,
  GetTimezonesByCountriesResponse,
  apiUploadImages,
} from "../../services/brandApi";

import { BrandWelcomeModal } from "@/components/ui/brand/BrandWelcomeModal";

import {
  CAMPAIGN_TYPES,
  cn,
  compact,
  countryKey,
  filesToDataUrls,
  getBrandId,
  getDefaultScheduleTime,
  idsOf,
  isObjectId,
  isValidDateRange,
  LAYOUT,
  MAX_FILE_MB,
  Option,
  pickCampaignId,
  safeDateInput,
  SEARCHABLE_UI,
  SEEN_KEY,
  splitCountrySelection,
  useSearchProps,
  validateFiles,
  mergeOptions,
  prettyTierValue,
  getLocalCampaignTimezone,
  toCampaignDateTimeInput,
} from "./create-campaign.utils";

import { ScheduleCampaignOverlay, normalizeTimeZone } from "./ScheduleCampaignOverlay";
import { useCampaignLists, useCategoryPicker, useResponsivePreviewWidth, useSidebarOffsetPx } from "./create-campaign.hooks";

import {
  CaretDown,
  CaretUp,
  Clock,
  Eye,
  EyeClosed,
  Info,
  PaperPlaneRightIcon,
  SparkleIcon,
  ImageSquare,
  LinkSimple,
  X,
} from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import SparkleAnimation from "@/components/ui/StarTwinkle";

/* ============================================================================
   ✅ Toast helpers
============================================================================ */
function toastSuccess(title: string, description?: string) {
  return toast({ icon: "success", title, text: description });
}
function toastError(title: string, description?: string) {
  return toast({ icon: "error", title, text: description });
}

/* ============================================================================
   ✅ Shared UI bits
============================================================================ */
function CenterWrap({ children, withBottomBar = false }: { children: React.ReactNode; withBottomBar?: boolean }) {
  return <div className={cn("cg-center-wrap", withBottomBar && "cg-center-wrap--with-bottom")}>{children}</div>;
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
      <div className={cn("mt-2 w-full rounded-pill overflow-hidden bg-neutral-150", heightClassName)}>
        <div className={cn("h-full transition-[width] duration-200 ease-out rounded-pill", barClassName)} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function useViewportWidth() {
  const [w, setW] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth : 0));

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
      <div className={cn("cg-bottom-bar-inner", "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="flex items-center gap-2 flex-wrap">{left}</div>
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">{right}</div>
      </div>
    </div>
  );
}

function getCampaignTotal(res: any) {
  const items =
    res?.items ??
    res?.data?.items ??
    res?.data ??
    [];

  const total = Number(
    res?.meta?.total ??
    res?.data?.meta?.total ??
    res?.pagination?.total ??
    res?.data?.pagination?.total ??
    res?.total ??
    items.length,
  );

  return Number.isFinite(total) ? total : 0;
}

/* ============================================================================
   ✅ Forms
============================================================================ */
type CampaignForm = {
  title: string;
  description: string;
  campaignType: string;
  productLink: string;

  categoryId: string;
  categoryName: string;

  subcategory: string[];
  ageGroup: string[];
  country: string[];

  files: File[];
};

const EMPTY_FORM: CampaignForm = {
  title: "",
  description: "",
  campaignType: "",
  productLink: "",
  categoryId: "",
  categoryName: "",
  subcategory: [],
  ageGroup: [],
  country: [],
  files: [],
};

type SavedProductImage = {
  dataUrl: string;
  key?: string;
  contentType?: string;
  size?: number;
  name?: string;
};


function useCampaignForm(initial?: Partial<CampaignForm>) {
  const [form, setForm] = useState<CampaignForm>({ ...EMPTY_FORM, ...(initial ?? {}) });

  const setField = useCallback(<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  return { form, setForm, setField };
}

function calcProgress(form: CampaignForm) {
  const keys: (keyof CampaignForm)[] = ["title", "description", "categoryId", "subcategory", "ageGroup", "country", "files"];
  const filled = keys.filter((k) => {
    const v = (form as any)[k];
    if (Array.isArray(v)) return v.length > 0;
    return String(v ?? "").trim().length > 0;
  }).length;
  return Math.round((filled / keys.length) * 100);
}

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
    return { min: min ?? undefined, max: max ?? undefined };
  }

  if (parts.length === 1) {
    const n = parseAbbrevNumber(parts[0]);
    if (n == null) return null;
    return { min: n, max: n };
  }

  return null;
};

const aggregateRanges = (ranges: Array<TierRange | null | undefined>): TierRange | null => {
  let min: number | undefined;
  let max: number | undefined;

  for (const r of ranges) {
    if (!r) continue;
    if (typeof r.min === "number") min = min === undefined ? r.min : Math.min(min, r.min);
    if (typeof r.max === "number") max = max === undefined ? r.max : Math.max(max, r.max);
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
   ✅ Payload builders
============================================================================ */
type UploadedAIImage = {
  dataUrl: string;
  name: string;
  type: string;
  contentType: string;
  originalSize: number;
  size: number;
  key: string;
};

async function buildCreateAIPayload(
  form: CampaignForm,
  uploadedImages: UploadedAIImage[],
  opts?: { saveDraft?: boolean }
): Promise<PrefillCampaignAIPayload> {
  const brandId = getBrandId();
  const prompt = form.description.trim();

  return {
    brandId,
    description: prompt,
    campaignPrompt: prompt,
    productImages: uploadedImages,
    productLink: form.productLink.trim() || undefined,
    saveDraft: opts?.saveDraft ?? false,
  } as PrefillCampaignAIPayload;
}
/* ============================================================================
   ✅ Helpers
============================================================================ */
async function mergeProductImages(
  newFiles: File[] = [],
  savedImages: SavedProductImage[] = []
) {
  const newImages = await filesToDataUrls(newFiles);
  return [...savedImages, ...newImages];
}

function buildCreateManualPayload(
  form: ManualForm,
  includeFiles: boolean,
  savedProductImages: SavedProductImage[] = []
) {
  const brandId = getBrandId();
  const campaignTimezone = getLocalCampaignTimezone();
  const base: CreateCampaignManualPayload = {
    brandId,
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
    ...(Number(form.maxFollowers) > 0 ? { maxFollowers: Number(form.maxFollowers) } : {}),
    ...(Number(form.minFollowers) > 0 ? { minFollowers: Number(form.minFollowers) } : {}),

    campaignBudget: Number(form.campaignBudget || 0),
    paymentType: form.paymentType,

    additionalNotes: form.additionalNotes || undefined,

    campaignTimezone,
    startAt: toCampaignDateTimeInput(form.startDate, "start") || undefined,
    endAt: toCampaignDateTimeInput(form.endDate, "end") || undefined,
  };

  if (!includeFiles) return base;

  return (async () => {
    const productImages = await mergeProductImages(form.productFiles ?? [], savedProductImages);
    return { ...base, productImages };
  })();
}

async function buildEditDraftPayload(
  brandId: string,
  campaignId: string,
  form: ManualForm,
  status: CampaignStatus,
  savedProductImages: SavedProductImage[] = []
): Promise<EditDraftPayload> {
  const newImages = await filesToDataUrls(form.productFiles ?? []);
  const campaignTimezone = getLocalCampaignTimezone();

  return compact({
    brandId,
    campaignId,
    status,
    campaignTitle: form.title.trim(),
    description: form.description.trim(),
    campaignType: form.campaignType,
    categoryId: form.categoryId,
    subcategoryIds: form.subcategories,
    productLink: form.productLink.trim(),

    productImages: newImages.length || savedProductImages.length ? [...savedProductImages, ...newImages] : undefined,

    campaignGoals: form.goals,
    influencerTierIds: form.influencerTier,
    contentFormats: form.contentFormats,
    contentLanguageIds: form.contentLanguage,
    targetCountryIds: form.targetCountry,
    targetAgeRanges: form.targetAgeGroups,
    preferredHashtags: form.hashtags,
    numberOfInfluencers: Number(form.numberOfInfluencers || 0),
    ...(Number(form.minFollowers) > 0 ? { minFollowers: Number(form.minFollowers) } : {}),
    ...(Number(form.maxFollowers) > 0 ? { maxFollowers: Number(form.maxFollowers) } : {}),
    campaignBudget: Number(form.campaignBudget || 0),
    paymentType: form.paymentType,
    additionalNotes: form.additionalNotes || undefined,
    campaignTimezone,
    startAt: toCampaignDateTimeInput(form.startDate, "start") || undefined,
    endAt: toCampaignDateTimeInput(form.endDate, "end") || undefined,
  }) as EditDraftPayload;
}

/* ============================================================================
   ✅ Validation
============================================================================ */
function validateManualForm(args: {
  form: ManualForm;
  dateOk: boolean;
  blockingFileErrors: string[];
  savedProductImageCount?: number;
}) {
  const { form, dateOk, blockingFileErrors, savedProductImageCount = 0 } = args;
  const e: Record<string, string> = {};

  if (!form.title.trim()) e.title = "Campaign title is required.";
  if (!form.description.trim()) e.description = "Description is required.";
  if (!form.categoryId.trim()) e.categoryId = "Campaign category is required.";

  if (!form.subcategories?.length) e.subcategories = "Select at least 1 subcategory.";
  if (!form.goals?.length) e.goals = "Select at least 1 campaign goal.";
  if (!form.targetCountry?.length) e.targetCountry = "Select at least 1 country.";
  if (!form.targetAgeGroups?.length) e.targetAgeGroups = "Select at least 1 age group.";

  const totalProductImages = (form.productFiles?.length ?? 0) + savedProductImageCount;
  if (!totalProductImages) e.productFiles = "Upload at least 1 product image/file.";
  if (blockingFileErrors?.length) e.productFiles = blockingFileErrors[0];

  if (!form.paymentType.trim()) e.paymentType = "Payment type is required.";
  if (!Number(form.campaignBudget) || Number(form.campaignBudget) <= 0) e.campaignBudget = "Campaign budget is required.";

  if (!form.startDate) e.startDate = "Start date is required.";
  if (!form.endDate) e.endDate = "End date is required.";
  if (form.startDate && form.endDate && !dateOk) e.endDate = "End Date must be after Start Date.";

  if (Number(form.minFollowers) < 0) e.minFollowers = "Min followers can't be negative.";
  if (Number(form.maxFollowers) < 0) e.maxFollowers = "Max followers can't be negative.";
  if (Number(form.minFollowers) > 0 && Number(form.maxFollowers) > 0 && Number(form.minFollowers) > Number(form.maxFollowers)) {
    e.maxFollowers = "Max followers must be ≥ Min followers.";
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
   ✅ Accordion + Chips
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
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="cg-accordion-btn">
        <div className="min-w-0 flex-1">
          <div className="cg-accordion-title">{title}</div>
          {subtitle ? <div className="cg-accordion-subtitle">{subtitle}</div> : null}
        </div>

        <span className="shrink-0 mt-[6px] text-neutral-900">{open ? <CaretUp size={20} /> : <CaretDown size={20} />}</span>
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
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)} className={cn("cg-chip", active && "cg-chip--active")}>
              <span className={cn("cg-chip-text", active && "cg-chip-text--active")}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);

    const update = () => setMatches(!!mq.matches);
    update();

    // @ts-ignore
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update);

    return () => {
      // @ts-ignore
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update);
    };
  }, [query]);

  return matches;
}

/* ============================================================================
   ✅ AI Screen
============================================================================ */
function CreateByAIScreen({
  sidebarOffsetPx: _sidebarOffsetPx,
  onBack: _onBack,
  onSwitchToManual,
  onCreated,
  maxWidth: _maxWidth = LAYOUT.aiMaxWidth,
  lists: _lists,
  showSparkle,
  setShowSparkle,
}: {
  sidebarOffsetPx: number;
  onBack: () => void;
  onSwitchToManual: () => void;
  onCreated: (doc: EnrichedCampaignDoc) => void;
  maxWidth?: number;
  lists: ReturnType<typeof useCampaignLists>;
  showSparkle: boolean;
  setShowSparkle: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { form, setField } = useCampaignForm();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const suggestions = useMemo(
    () => [
      { icon: "🏆", text: "Launch a new sneaker collection for Gen Z" },
      { icon: "📱", text: "Promote a mobile app installation campaign" },
      { icon: "🎮", text: "Create a gaming influencer campaign" },
      { icon: "🍔", text: "Drive awareness for a new restaurant launch" },
      { icon: "💻", text: "Generate a B2B SaaS creator campaign" },
    ],
    []
  );

  const loadingMessages = useMemo(
    () => [
      "Fetching the details...",
      "Analyzing your campaign brief...",
      "Reading product images and references...",
      "Choosing matching categories...",
      "Finding target countries and age groups...",
      "Building creator requirements...",
      "Preparing your manual campaign draft...",
    ],
    []
  );

  useEffect(() => {
    if (!submitting && !showSparkle) {
      setLoadingMessageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [submitting, showSparkle, loadingMessages.length]);

  const imagePreviewItems = useMemo(
    () =>
      (form.files ?? []).map((file, index) => ({
        file,
        index,
        url: URL.createObjectURL(file),
      })),
    [form.files]
  );

  useEffect(() => {
    return () => {
      imagePreviewItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [imagePreviewItems]);

  const promptBoxStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: "1rem",
      border: "2px solid rgba(193, 193, 193, 0.60)",
      background:
        "radial-gradient(193.33% 58.29% at 50% 50%, rgba(255, 255, 255, 0.00) 45%, rgba(255, 255, 255, 0.12) 100%), linear-gradient(0deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.20) 100%), linear-gradient(180deg, rgba(17, 0, 0, 0.01) 0%, rgba(188, 182, 237, 0.06) 100%)",
      boxShadow:
        "0 7px 15px -12px rgba(176, 194, 250, 0.20), 0 4px 10.3px 0 rgba(0, 0, 0, 0.03), 0 17px 25.8px -12px rgba(0, 0, 0, 0.06), 0 4px 6px 0 rgba(255, 255, 255, 0.32), 0 -1px 18px 0 rgba(255, 255, 255, 0.40) inset, 0 -1px 14px 0 rgba(255, 255, 255, 0.56) inset, 0 0 16px 0 rgba(0, 0, 0, 0.02) inset, 0 -4px 8px 0 rgba(0, 0, 0, 0.03) inset, 0 -1px 2px 0 rgba(0, 0, 0, 0.02) inset, 0 -0.5px 0.5px 0 rgba(0, 0, 0, 0.04) inset, 0 10px 12px 0 rgba(0, 0, 0, 0.04) inset",
    }),
    []
  );

  const suggestionCardStyle = useMemo<React.CSSProperties>(
    () => ({
      borderRadius: "var(--Border-Radius-S, 0.5rem)",
      background: "var(--Light-Background-Primary, #FFF)",
    }),
    []
  );

  const pushAiError = useCallback((title: string, eOrMsg: unknown) => {
    const msg = typeof eOrMsg === "string" ? eOrMsg : getApiErrorMessage(eOrMsg);
    toastError(title, msg);
  }, []);

  const linkError = useMemo(() => {
    const link = form.productLink.trim();
    if (!link) return "";
    return /^https?:\/\/.+/i.test(link) ? "" : "Please enter a valid http/https link.";
  }, [form.productLink]);

  const hasImagePreviews = imagePreviewItems.length > 0;
  const hasLinkValue = Boolean(form.productLink.trim());
  const shouldShowLinkChip = linkOpen || hasLinkValue;
  const hasTopContent = hasImagePreviews || shouldShowLinkChip;

  const SearchSparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.98145 2.04395C6.80457 2.48154 6.69535 2.95431 6.6709 3.44922C5.89391 3.63256 5.17617 4.02891 4.60254 4.60254C3.78988 5.4152 3.33301 6.51772 3.33301 7.66699L3.33887 7.88184C3.39207 8.95276 3.84074 9.96965 4.60254 10.7314C5.41517 11.5439 6.51787 12 7.66699 12C8.81615 11.9999 9.91886 11.544 10.7314 10.7314C11.493 9.96988 11.9407 8.95341 11.9941 7.88281C12.472 7.77057 12.919 7.58009 13.3213 7.32422C13.3282 7.43795 13.333 7.55241 13.333 7.66699C13.3329 8.94984 12.8968 10.1867 12.1084 11.1826L13.7861 12.8623C14.0465 13.1227 14.0465 13.5443 13.7861 13.8047C13.5258 14.0648 13.104 14.0649 12.8438 13.8047L11.1631 12.124C10.1706 12.9026 8.9414 13.3329 7.66699 13.333C6.1641 13.333 4.72189 12.7365 3.65918 11.6738C2.59665 10.6112 2.00009 9.16969 2 7.66699C2 6.1641 2.59647 4.72189 3.65918 3.65918C4.55902 2.75934 5.73111 2.19623 6.98145 2.04395Z"
        fill="#969696"
      />
      <path
        d="M13.8404 0.717232C13.7875 0.684239 13.7264 0.666748 13.6641 0.666748C13.5945 0.666706 13.5267 0.688442 13.4701 0.728907C13.4135 0.769372 13.371 0.826537 13.3485 0.892387L13.2319 1.23468L12.8901 1.35133L12.8508 1.36733C12.7915 1.39635 12.7422 1.44231 12.7091 1.49938C12.676 1.55646 12.6605 1.62209 12.6647 1.68795C12.669 1.75381 12.6926 1.81694 12.7327 1.86933C12.7728 1.92172 12.8276 1.96103 12.8901 1.98226L13.2323 2.09891L13.3489 2.44087L13.3649 2.47986C13.3938 2.53914 13.4398 2.58849 13.4968 2.62164C13.5538 2.65479 13.6194 2.67026 13.6853 2.66608C13.7511 2.6619 13.8142 2.63827 13.8666 2.59818C13.919 2.55808 13.9583 2.50333 13.9796 2.44087L14.0962 2.09857L14.4381 1.98192L14.4774 1.96592C14.5366 1.93691 14.5859 1.89095 14.619 1.83387C14.6522 1.77679 14.6676 1.71116 14.6634 1.6453C14.6592 1.57944 14.6355 1.51632 14.5954 1.46392C14.5553 1.41153 14.5005 1.37223 14.4381 1.351L14.0959 1.23435L13.9793 0.892387L13.9633 0.853392C13.9358 0.7974 13.8933 0.750226 13.8404 0.717232Z"
        fill="#969696"
      />
      <path
        d="M10.1991 6.53212C10.3402 6.62011 10.5031 6.66675 10.6693 6.66675C10.8548 6.66686 11.0356 6.6089 11.1865 6.50099C11.3374 6.39308 11.4508 6.24064 11.5107 6.06504L11.8217 5.15226L12.7333 4.84119L12.8381 4.79853C12.9961 4.72115 13.1276 4.59859 13.2159 4.44638C13.3042 4.29417 13.3454 4.11917 13.3341 3.94354C13.3229 3.76792 13.2598 3.59958 13.1528 3.45986C13.0459 3.32014 12.8998 3.21534 12.7333 3.15873L11.8208 2.84766L11.5098 1.93577L11.4671 1.83178C11.3899 1.67369 11.2674 1.54211 11.1153 1.45371C10.9632 1.36531 10.7883 1.32406 10.6127 1.3352C10.4372 1.34633 10.2689 1.40935 10.1291 1.51627C9.98941 1.62318 9.88456 1.76918 9.82786 1.93577L9.51689 2.84854L8.60529 3.15962L8.50044 3.20228C8.34243 3.27966 8.21094 3.40222 8.12264 3.55442C8.03433 3.70663 7.99319 3.88164 8.00442 4.05727C8.01564 4.23289 8.07874 4.40123 8.18571 4.54095C8.29268 4.68066 8.43871 4.78547 8.60529 4.84208L9.51778 5.15315L9.82875 6.06504L9.8714 6.16903C9.94454 6.31834 10.0581 6.44414 10.1991 6.53212Z"
        fill="#969696"
      />
    </svg>
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const incoming = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));

      if (!incoming.length) return;

      const errors = validateFiles(incoming, "Image");
      setFileErrors(errors);

      if (errors.length) return;

      setField("files", [...(form.files ?? []), ...incoming]);
    },
    [form.files, setField]
  );

  const removeFile = useCallback(
    (idx: number) => {
      setField(
        "files",
        (form.files ?? []).filter((_, i) => i !== idx)
      );
      setFileErrors([]);
    },
    [form.files, setField]
  );

  const submitAI = useCallback(async () => {
    setSubmitting(true);

    try {
      let uploadedImages: UploadedAIImage[] = [];

      if (form.files?.length) {
        const uploadRes = await apiUploadImages(form.files);
        const urls: string[] = uploadRes?.urls ?? uploadRes?.data?.urls ?? [];

        if (!urls.length) {
          throw new Error("Image upload failed. No image URLs returned from backend.");
        }

        uploadedImages = urls.map((url, i) => {
          const file = form.files[i];
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
      }

      const payload = await buildCreateAIPayload(form, uploadedImages, {
        saveDraft: false,
      });

      const res: any = await apiCampaignPrefillAI(payload);

      return {
        ...(res?.prefill ?? res?.data?.prefill ?? res ?? {}),
        details: res?.prefillDetails ?? res?.data?.prefillDetails ?? res?.details ?? null,
        byAi: 1,
        status: "draft",
      } as EnrichedCampaignDoc;
    } catch (e) {
      pushAiError("Failed to create AI campaign", e);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [form, pushAiError]);

  const handleContinue = useCallback(async () => {
    setSubmitAttempted(true);

    if (!form.description.trim()) {
      toastError("Campaign description required", "Please describe your campaign first.");
      return;
    }

    if (linkError) {
      toastError("Invalid link", linkError);
      return;
    }

    if (submitting) return;

    setShowSparkle(true);

    try {
      const doc = await submitAI();
      if (!doc) return;

      onCreated(doc);
      toastSuccess("AI campaign generated", "Review the filled campaign details before publishing.");
    } finally {
      setShowSparkle(false);
    }
  }, [form.description, linkError, submitting, submitAI, onCreated, setShowSparkle]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_34%,#ffffff_64%,#fff0f4_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,224,130,0.45)_0%,rgba(255,182,193,0.24)_22%,rgba(255,255,255,0)_50%)]" />
      <div className="pointer-events-none absolute left-[-140px] top-[-140px] h-[340px] w-[340px] rounded-full bg-pink-100/50 blur-3xl" />
      <div className="pointer-events-none absolute right-[-180px] bottom-[-160px] h-[380px] w-[380px] rounded-full bg-rose-100/60 blur-3xl" />
      <div className="absolute right-5 top-5 z-20">
        <Button
          type="button"
          variant="outline"
          className="shadow-none bg-white/80 backdrop-blur"
          onClick={onSwitchToManual}
          disabled={submitting}
        >
          Create Manual
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />

      {submitting || showSparkle ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/60 backdrop-blur-[1px]">
          <div className="flex flex-col items-center justify-center">
            <SparkleAnimation key="ai-campaign-loading" className="scale-[1.8]" />

            <p
              key={loadingMessages[loadingMessageIndex]}
              className="mt-7 animate-pulse text-center font-inter text-[12px] font-[500] leading-[16px] text-white"
            >
              {loadingMessages[loadingMessageIndex]}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center px-5 pt-[112px]">
        <h1
          className="text-center font-inter"
          style={{
            color: "var(--Text-Primary, #1A1A1A)",
            fontSize: "var(--Font-Size-24, 1.5rem)",
            fontStyle: "normal",
            fontWeight: "var(--Font-Weight-bold, 700)",
            lineHeight: "var(--Line-Height-32, 2rem)",
            letterSpacing: "var(--Letter-Spacing-0, 0)",
          }}
        >
          Create your campaign with the help of AI
        </h1>

        <p
          className="mt-2 max-w-[720px] text-center font-inter"
          style={{
            color: "var(--Light-Text-Tertiary, #B8B8B8)",
            fontSize: "var(--Font-Size-16, 1rem)",
            fontStyle: "normal",
            fontWeight: "var(--Font-Weight-Medium, 500)",
            lineHeight: "var(--Line-Height-24, 1.5rem)",
            letterSpacing: "var(--Letter-Spacing-0, 0)",
          }}
        >
          Describe your product, audience, and goals. AI will generate campaign
          briefs, deliverables, milestones, budgets, and creator requirements.
        </p>

        <div className="mt-9 w-full max-w-[680px] overflow-hidden" style={promptBoxStyle}>
          <div className={cn("flex flex-col", hasTopContent ? "min-h-[190px]" : "min-h-[150px]")}>
            {hasTopContent ? (
              <div className="flex w-full flex-wrap items-start gap-2 px-[14px] pb-3 pt-[12px]">
                {imagePreviewItems.map((item) => (
                  <div
                    key={`${item.file.name}-${item.index}`}
                    className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[0.75rem] border border-white/80 bg-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
                  >
                    <img
                      src={item.url}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeFile(item.index)}
                      className="absolute right-[4px] top-[4px] flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white/90 text-[#969696] shadow-sm transition hover:text-[#1A1A1A]"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}

                {shouldShowLinkChip ? (
                  linkOpen ? (
                    <div className="flex h-[34px] max-w-full items-center rounded-[0.5rem] border border-white/80 bg-white/10 px-2 shadow-[0_6px_14px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <button
                        type="button"
                        aria-label="Close link input"
                        onClick={() => setLinkOpen(false)}
                        className="mr-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#B8B8B8] hover:text-[#1A1A1A]"
                      >
                        <X size={11} />
                      </button>

                      <input
                        autoFocus
                        value={form.productLink}
                        placeholder="Paste product or reference link"
                        onChange={(e) => setField("productLink", e.target.value)}
                        onBlur={() => {
                          if (form.productLink.trim()) setLinkOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setLinkOpen(false);
                          }

                          if (e.key === "Escape") {
                            e.preventDefault();
                            setLinkOpen(false);
                          }
                        }}
                        className="h-full w-[360px] max-w-[52vw] bg-transparent font-inter text-[0.875rem] font-[400] leading-[1.25rem] text-[#1A1A1A] outline-none placeholder:text-[#B8B8B8]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[34px] max-w-full items-center rounded-[0.5rem] border border-white/80 bg-white/10 px-2 font-inter text-[0.875rem] font-[400] leading-[1.25rem] text-[#969696] shadow-[0_6px_14px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <button
                        type="button"
                        aria-label="Remove link"
                        onClick={() => {
                          setField("productLink", "");
                          setLinkOpen(false);
                        }}
                        className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#969696] hover:text-[#1A1A1A]"
                      >
                        <X size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setLinkOpen(true)}
                        className="min-w-0 text-left"
                      >
                        <span className="block max-w-[420px] truncate">
                          {form.productLink}
                        </span>
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "relative min-h-0 flex-1",
                hasTopContent ? "px-[14px]" : "px-[14px] pt-[12px]"
              )}
            >
              {!hasTopContent ? (
                <div className="pointer-events-none absolute left-[16px] top-[15px] z-10 flex h-4 w-4 items-center justify-center">
                  <SearchSparkleIcon />
                </div>
              ) : null}

              <textarea
                value={form.description}
                placeholder="Describe your campaign......"
                onChange={(e) => setField("description", e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleContinue();
                  }
                }}
                className={cn(
                  "block w-full resize-none bg-transparent font-inter text-[0.875rem] font-[400] leading-[1.25rem] tracking-[0] text-[#1A1A1A] outline-none placeholder:text-[#B8B8B8]",
                  "scrollbar-thin scrollbar-thumb-white/70 scrollbar-track-transparent",
                  hasTopContent
                    ? "h-[102px] max-h-[102px] px-0 py-1"
                    : "h-[82px] max-h-[82px] px-[28px] py-0"
                )}
                style={{
                  overflowY: "auto",
                  overflowX: "hidden",
                  scrollbarWidth: "thin",
                  textOverflow: "clip",
                }}
              />
            </div>

            <div className="flex shrink-0 items-center justify-between px-[22px] pb-[12px] pt-[10px]">
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  aria-label="Upload campaign images"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-[#1A1A1A] transition hover:bg-white/60"
                >
                  <ImageSquare size={17} />
                </button>

                <span className="h-[18px] w-px bg-[#C1C1C1]/40" />

                <button
                  type="button"
                  aria-label="Add campaign link"
                  onClick={() => setLinkOpen(true)}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-[#1A1A1A] transition hover:bg-white/60"
                >
                  <LinkSimple size={17} />
                </button>
              </div>

              <button
                type="button"
                aria-label="Generate campaign"
                onClick={handleContinue}
                disabled={submitting}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] p-[1.5px] shadow-[0_6px_12px_rgba(0,0,0,0.12)] transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(109deg, var(--Neutrals-0, #FFF) 28.8%, #FAFAFA 36.05%, rgba(255, 191, 0, 0.83) 50%, #F6BB2A 57.65%, #F3584E 74.04%, #E078D1 84.62%), var(--Light-Background-Subtle, #F9F9F9)",
                }}
              >
                <span className="flex h-full w-full items-center justify-center rounded-[8.5px] bg-[#1A1A1A] text-white transition hover:bg-black">
                  <PaperPlaneRightIcon size={18} weight="fill" />
                </span>
              </button>
            </div>
          </div>

          {fileErrors.length ? (
            <div className="border-t border-white/60 px-3 py-2 font-inter text-[12px] text-red-500">
              {fileErrors[0]}
            </div>
          ) : null}

          {submitAttempted && linkError ? (
            <div className="border-t border-white/60 px-3 py-2 font-inter text-[12px] text-red-500">
              {linkError}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex w-full max-w-[580px] flex-col gap-2">
          {suggestions.map((item) => (
            <button
              key={item.text}
              type="button"
              onClick={() => setField("description", item.text)}
              className="flex h-[36px] w-full items-center px-3 text-left transition hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
              style={suggestionCardStyle}
            >
              <span className="mr-1.5 text-[12px] leading-[1rem]">{item.icon}</span>
              <span className="truncate font-inter text-[0.75rem] font-[500] leading-[1rem] text-[#B8B8B8]">
                {item.text}
              </span>
            </button>
          ))}
        </div>

        {submitAttempted && !form.description.trim() ? (
          <p className="mt-3 text-center font-inter text-[13px] text-red-500">
            Please describe your campaign first.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SideModalPreview({
  open,
  title = "Card Preview",
  onClose,
  children,
  widthPx = 420,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthPx?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label="Close preview" className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside
        className="absolute right-0 top-0 h-full bg-brand-50 border-l border-neutral-200 shadow-2xl flex flex-col"
        style={{
          width: `min(${widthPx}px, 92vw)`,
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="text-[18px] leading-[26px] font-semibold text-neutral-900">{title}</div>
            <Info size={18} className="text-neutral-600" />
          </div>

          <Button variant="outline" className="shadow-none" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto cg-scrollbar px-4 py-4">{children}</div>
      </aside>
    </div>
  );
}

function PublishCampaignDialog({
  open,
  loading,
  campaignTitle,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading?: boolean;
  campaignTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close publish confirmation"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        disabled={loading}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-campaign-dialog-title"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] border border-[#E6E6E6] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        <div className="px-6 pt-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7E0]">
            <PaperPlaneRightIcon size={24} weight="fill" className="text-[#F6BB2A]" />
          </div>

          <h2
            id="publish-campaign-dialog-title"
            className="mt-4 text-center font-inter text-[20px] font-[700] leading-[28px] text-[#1A1A1A]"
          >
            Publish campaign?
          </h2>

          <p className="mt-2 text-center font-inter text-[14px] font-[400] leading-[20px] text-[#777777]">
            This campaign will go live and creators will be able to view and apply for it.
          </p>

          {campaignTitle?.trim() ? (
            <div className="mt-4 rounded-[12px] border border-[#EFEFEF] bg-[#FAFAFA] px-4 py-3 text-center font-inter text-[13px] font-[500] leading-[18px] text-[#1A1A1A]">
              {campaignTitle}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#EFEFEF] bg-white px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="shadow-none"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button type="button" disabled={loading} onClick={onConfirm}>
            <PaperPlaneRightIcon size={16} className="mr-2" />
            {loading ? "Publishing…" : "Yes, Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ✅ Manual Screen
============================================================================ */
function CreateManualScreen({
  sidebarOffsetPx,
  onBack,
  onSwitchToAI,
  formMaxWidth = 760,
  previewWidth = 420,
  bottomBarMaxWidth,
  lists,
  initialFromCampaign,
  onAfterPublish,
  showSparkle,
  setShowSparkle,
}: {
  sidebarOffsetPx: number;
  onBack: () => void;
  onSwitchToAI: () => void;
  formMaxWidth?: number;
  previewWidth?: number;
  bottomBarMaxWidth?: number;
  lists: ReturnType<typeof useCampaignLists>;
  initialFromCampaign?: EnrichedCampaignDoc | null;
  onAfterPublish?: () => void;
  showSparkle: boolean;
  setShowSparkle: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { setActions, clearActions } = useBrandTopbar();
  const [form, setForm] = useState<ManualForm>(EMPTY_MANUAL);

  const [productFileErrors, setProductFileErrors] = useState<string[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const followersTouchedRef = useRef({ min: false, max: false });
  const [apiError, setApiError] = useState<string>("");

  const [campaignId, setCampaignId] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  const [draftSaving, setDraftSaving] = useState(false);
  const [draftJustSaved, setDraftJustSaved] = useState(false);
  const draftSavedTimerRef = useRef<number | null>(null);

  const categoryPicker = useCategoryPicker({ debounceMs: 250, enabled: true });
  const [loadedDetails, setLoadedDetails] = useState<any>(null);
  const loadedInitialRef = useRef<EnrichedCampaignDoc | null>(null);

  const isBelowLg = useMediaQuery("(max-width: 1023px)");
  const lastDesktopPreviewRef = useRef(true);
  const prevIsBelowLgRef = useRef<boolean | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProductImages, setPreviewProductImages] = useState<string[]>([]);
  const [savedProductImages, setSavedProductImages] = useState<any[]>([]);
  const previewForm = useMemo(
    () => ({
      ...form,
      productImages: previewProductImages,
    }),
    [form, previewProductImages]
  );

  useEffect(() => {
    const remoteUrls = savedProductImages
      .map((img) => img?.dataUrl)
      .filter(Boolean);

    const localUrls = (form.productFiles ?? []).map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewProductImages([...remoteUrls, ...localUrls]);

    return () => {
      localUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [form.productFiles, savedProductImages]);

  useEffect(() => {
    const prev = prevIsBelowLgRef.current;
    prevIsBelowLgRef.current = isBelowLg;

    if (prev === null) {
      if (!isBelowLg) setPreviewOpen(lastDesktopPreviewRef.current);
      return;
    }

    if (prev !== isBelowLg) {
      if (isBelowLg) {
        lastDesktopPreviewRef.current = previewOpen;
        setPreviewOpen(false);
      } else {
        setPreviewOpen(lastDesktopPreviewRef.current ?? true);
      }
    }
  }, [isBelowLg, previewOpen]);

  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const setField = useCallback(<K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const pushApiError = useCallback((title: string, eOrMsg: unknown) => {
    const msg = typeof eOrMsg === "string" ? eOrMsg : getApiErrorMessage(eOrMsg);
    setApiError(msg);
    toastError(title, msg);
  }, []);

  const extractBackendMessage = useCallback((e: any) => {
    const base = getApiErrorMessage(e);
    if (base && base !== "Something went wrong") return base;

    const d = e?.response?.data ?? e?.data ?? e;

    if (typeof d === "string") return d;
    if (typeof d?.message === "string") return d.message;
    if (typeof d?.error === "string") return d.error;
    if (typeof d?.detail === "string") return d.detail;

    const firstArrMsg = d?.errors?.[0]?.msg || d?.errors?.[0]?.message || d?.issues?.[0]?.message;
    if (typeof firstArrMsg === "string") return firstArrMsg;

    return "Failed to publish campaign.";
  }, []);

  const extractBackendSuccessMessage = useCallback((res: any, fallback: string) => {
    const d = res?.data ?? res;

    if (typeof d === "string") return d;
    if (typeof d?.message === "string" && d.message.trim()) return d.message;
    if (typeof d?.successMessage === "string" && d.successMessage.trim()) return d.successMessage;
    if (typeof d?.detail === "string" && d.detail.trim()) return d.detail;
    if (typeof d?.msg === "string" && d.msg.trim()) return d.msg;

    return fallback;
  }, []);

  const extractBackendFieldErrors = useCallback((e: any) => {
    const d = e?.response?.data ?? e?.data ?? e;

    const fe = d?.fieldErrors || d?.errorsByField || d?.validationErrors;
    if (fe && typeof fe === "object" && !Array.isArray(fe)) return fe as Record<string, string>;

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
        const path = Array.isArray(it?.path) ? String(it.path[0] ?? "") : String(it?.path ?? "");
        const m = String(it?.message ?? "").trim();
        const k = String(path).trim();
        if (k && m && !out[k]) out[k] = m;
      }
      return out;
    }

    return null;
  }, []);

  useEffect(() => {
    const previewAction: TopbarAction = {
      key: "preview",
      label: "Preview",
      icon: previewOpen ? <EyeClosed size={20} /> : <Eye size={20} />,
      variant: "secondary",
      onClick: () => setPreviewOpen((v) => !v),
      className: "shadow-none",
    };
    setActions([previewAction]);
  }, [setActions, previewOpen]);

  useEffect(() => () => clearActions(), [clearActions]);

  const scheduleBtnRef = useRef<HTMLButtonElement | null>(null);
  const isMobileSchedule = useMediaQuery("(max-width: 768px)");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [scheduleDate, setScheduleDate] = useState<string>(() => safeDateInput(new Date().toISOString()));
  const [scheduleTime, setScheduleTime] = useState<string>(() => getDefaultScheduleTime());

  const baseTimeZone = (typeof window !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

  const [tzRes, setTzRes] = useState<GetTimezonesByCountriesResponse | null>(null);
  const [tzLoading, setTzLoading] = useState(false);
  const [tzError, setTzError] = useState("");

  type ScheduleTZ = {
    timezone: string;
    isValid?: boolean;
    offsetMinutes?: number;
    offsetMinutesFromCurrent?: number;
    nowLocal?: string;
  };

  type ScheduleCountry = { id: string; label: string; timezones: ScheduleTZ[] };

  const scheduleCountries = useMemo((): ScheduleCountry[] => {
    const rawMap = new Map<string, any>();

    for (const c of lists.raw.countries ?? []) {
      const k1 = countryKey(c);
      const cc = String(c?.countryCode ?? "").trim();

      if (k1) {
        rawMap.set(k1, c);
        rawMap.set(k1.toUpperCase(), c);
        rawMap.set(k1.toLowerCase(), c);
      }

      if (cc) {
        rawMap.set(cc, c);
        rawMap.set(cc.toUpperCase(), c);
        rawMap.set(cc.toLowerCase(), c);
      }
    }

    const tzPayload = tzRes as any;
    const targets = (tzPayload?.data?.targets ?? tzPayload?.targets ?? []) as any[];

    const byId = new Map(targets.map((t: any) => [String(t?.id ?? "").trim(), t]));
    const byCode = new Map(targets.map((t: any) => [String(t?.countryCode ?? "").trim().toUpperCase(), t]));

    return (form.targetCountry ?? [])
      .map((sel) => {
        const key = String(sel ?? "").trim();
        if (!key) return null;

        const upperKey = key.toUpperCase();

        const t = isObjectId(key) ? byId.get(key) : byCode.get(upperKey);
        const raw = rawMap.get(key) || rawMap.get(upperKey) || rawMap.get(key.toLowerCase());

        const name = String(t?.countryName ?? t?.countryNameEn ?? raw?.countryNameEn ?? raw?.countryName ?? "").trim();
        const flag = String(t?.flag ?? raw?.flag ?? "").trim();
        const label = `${flag ? `${flag} ` : ""}${name || key}`;

        const tzs: ScheduleTZ[] = (t?.timezones ?? [])
          .map((z: any) => {
            const tzName = String(z?.timezone ?? "").trim();
            const normalized = normalizeTimeZone(tzName, baseTimeZone);

            return {
              timezone: normalized,
              isValid: Boolean(z?.isValid),
              offsetMinutes: Number.isFinite(Number(z?.offsetMinutes)) ? Number(z.offsetMinutes) : undefined,
              offsetMinutesFromCurrent: Number.isFinite(Number(z?.offsetMinutesFromCurrent))
                ? Number(z.offsetMinutesFromCurrent)
                : undefined,
              nowLocal: String(z?.nowLocal ?? "").trim() || undefined,
            };
          })
          .filter((x: any) => x.timezone);

        const timezones = tzs.length ? tzs : [{ timezone: baseTimeZone, isValid: true }];

        return {
          id: key,
          label,
          timezones,
        };
      })
      .filter(Boolean) as ScheduleCountry[];
  }, [form.targetCountry, lists.raw.countries, tzRes, baseTimeZone]);

  useEffect(() => {
    if (!scheduleOpen) return;

    const selected = form.targetCountry ?? [];
    const { ids, codes } = splitCountrySelection(selected);

    if (!ids.length && !codes.length) {
      setTzRes(null);
      setTzError("");
      setTzLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setTzLoading(true);
      setTzError("");
      try {
        const res = await apiGetTimezonesByCountries({
          targetCountryIds: ids.length ? ids : undefined,
          targetCountryCodes: codes.length ? codes : undefined,
          current: { timezone: baseTimeZone },
        });
        if (!cancelled) setTzRes(res);
      } catch (e) {
        const msg = getApiErrorMessage(e);
        if (!cancelled) setTzError(msg);
        toastError("Failed to load timezones", msg);
      } finally {
        if (!cancelled) setTzLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheduleOpen, form.targetCountry, baseTimeZone]);

  useEffect(() => {
    if (!scheduleOpen) return;
    setScheduleDate((prev) => {
      const prevSafe = safeDateInput(prev);
      if (prevSafe) return prevSafe;
      const start = safeDateInput(form.startDate);
      return start || safeDateInput(new Date().toISOString());
    });
  }, [scheduleOpen, form.startDate]);

  const loadCampaignIntoForm = useCallback(
    (doc: any) => {
      const normalizePaymentType = (v: any) => {
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "milestone") return "Milestone";
        if (s === "fixed") return "Fixed";
        if (s === "gifting") return "Gifting";
        return "Milestone";
      };

      const id = pickCampaignId(doc);
      if (id) setCampaignId(id);

      const details = doc?.details ?? null;
      setLoadedDetails(details);

      const nextCategoryId = String(doc?.categoryId ?? details?.category?.id ?? "").trim();

      const categoryFromPicker = categoryPicker.categoryOptions.find((o) => o.value === nextCategoryId);

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
        subcategories: idsOf(doc?.subcategoryIds ?? details?.subcategories ?? doc?.subcategories),
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
        targetCountry: idsOf(doc?.targetCountryIds ?? details?.targetCountries),
        targetAgeGroups: idsOf(doc?.targetAgeRanges ?? details?.targetAgeRanges),
        additionalNotes: String(doc?.additionalNotes ?? ""),
        attachment: null,
        hashtags: idsOf(doc?.preferredHashtags ?? doc?.hashtags),
      };

      const normalizedSavedImages = (Array.isArray(doc?.productImages) ? doc.productImages : [])
        .map((img: any) => {
          if (typeof img === "string") return { dataUrl: img };
          if (img?.dataUrl) return img;
          if (img?.url) return { ...img, dataUrl: img.url };
          return null;
        })
        .filter(Boolean);

      setSavedProductImages(normalizedSavedImages);

      setForm(next);

      if (nextCategoryId) {
        categoryPicker.selectCategoryId(nextCategoryId);
        categoryPicker.hydrateSelectedCategory({
          id: nextCategoryId,
          name: nextCategoryName || "Selected category",
        });
      }

      setApiError("");
      setServerFieldErrors({});
    },
    [categoryPicker]
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
        .map((h: any) => ({ label: String(h?.tag ?? "").trim(), value: String(h?.id ?? "").trim() }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const hashtagOptions = useMemo(() => mergeOptions(lists.preferredHashtags, seededHashtagOptions), [lists.preferredHashtags, seededHashtagOptions]);

  const seededGoalOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.campaignGoals ?? [])
        .map((g: any) => ({ label: String(g?.goal ?? "").trim(), value: String(g?.id ?? "").trim() }))
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
          return { label, value: String(t?.id ?? "").trim() };
        })
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededCategoryOption = useMemo<Option[]>(() => {
    const id = String(form.categoryId || loadedDetails?.category?.id || "").trim();

    const fromPicker = categoryPicker.categoryOptions.find((o) => o.value === id);

    const label = String(
      form.categoryName ||
      loadedDetails?.category?.name ||
      fromPicker?.label ||
      ""
    ).trim();

    if (!id || !label) return [];
    return [{ value: id, label }];
  }, [form.categoryId, form.categoryName, loadedDetails, categoryPicker.categoryOptions]);

  const categoryOptionsMerged = useMemo(
    () => mergeOptions(categoryPicker.categoryOptions, seededCategoryOption),
    [categoryPicker.categoryOptions, seededCategoryOption]
  );

  const seededFormatOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.contentFormats ?? [])
        .map((f: any) => ({ label: String(f?.format ?? "").trim(), value: String(f?.id ?? "").trim() }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededLangOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.contentLanguages ?? [])
        .map((l: any) => ({ label: String(l?.name ?? "").trim(), value: String(l?.id ?? "").trim() }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const seededAgeOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.targetAgeRanges ?? [])
        .map((a: any) => ({ label: String(a?.range ?? "").trim(), value: String(a?.id ?? "").trim() }))
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
          return { label: `${flag ? flag + " " : ""}${name}`, value: id };
        })
        .filter(Boolean) as Option[],
    [loadedDetails]
  );

  const seededSubcategoryOptions = useMemo<Option[]>(
    () =>
      (loadedDetails?.subcategories ?? [])
        .map((s: any) => ({ label: String(s?.name ?? "").trim(), value: String(s?.id ?? "").trim() }))
        .filter((x: any) => x.label && x.value),
    [loadedDetails]
  );

  const goalsOptions = useMemo(() => mergeOptions(lists.productServiceGoals, seededGoalOptions), [lists.productServiceGoals, seededGoalOptions]);
  const tierOptions = useMemo(() => mergeOptions(lists.influencerTiers, seededTierOptions), [lists.influencerTiers, seededTierOptions]);
  const formatOptions = useMemo(() => mergeOptions(lists.contentFormats, seededFormatOptions), [lists.contentFormats, seededFormatOptions]);
  const langOptions = useMemo(() => mergeOptions(lists.contentLanguages, seededLangOptions), [lists.contentLanguages, seededLangOptions]);
  const ageOptions = useMemo(() => mergeOptions(lists.ageRanges, seededAgeOptions), [lists.ageRanges, seededAgeOptions]);

  const countryNameOptions = useMemo(() => mergeOptions(lists.countriesByName, seededCountryOptions), [lists.countriesByName, seededCountryOptions]);
  const subcategoryOptionsMerged = useMemo(() => mergeOptions(categoryPicker.subcategoryOptions, seededSubcategoryOptions), [categoryPicker.subcategoryOptions, seededSubcategoryOptions]);

  const tierRangeById = useMemo(() => {
    const out = new Map<string, TierRange>();

    const add = (id: any, _sourceValue: any, label?: string) => {
      const key = String(id ?? "").trim();
      if (!key) return;

      const fromLabel = parseRangeFromText(label);
      if (fromLabel) out.set(key, fromLabel);
    };

    for (const t of (loadedDetails?.influencerTiers ?? []) as any[]) {
      add(t?.id, t?.value, `${String(t?.category ?? "")} (${prettyTierValue(t?.value)})`);
    }

    const rawTiers = (lists as any)?.raw?.influencerTiers ?? [];
    for (const t of rawTiers as any[]) {
      add(t?.id, t?.value, `${String(t?.category ?? "")} (${prettyTierValue(t?.value)})`);
    }

    for (const opt of tierOptions) {
      add(opt.value, null, opt.label);
    }

    return out;
  }, [loadedDetails, lists, tierOptions]);

  const selectedCountryOptions = useMemo(() => {
    const map = new Map((lists.raw.countries ?? []).map((c: any) => [countryKey(c), c]));
    return (form.targetCountry ?? [])
      .map((id) => {
        const c = map.get(id);
        if (!c) return null;
        const name = String(c?.countryNameEn ?? "").trim();
        const flag = String(c?.flag ?? "").trim();
        if (!name) return null;
        return { label: `${flag ? flag + " " : ""}${name}`, value: id };
      })
      .filter(Boolean) as Option[];
  }, [form.targetCountry, lists.raw.countries]);

  const countryOptionsForSelect = useMemo(() => mergeOptions(countryNameOptions, selectedCountryOptions), [countryNameOptions, selectedCountryOptions]);

  const dateOk = isValidDateRange(form.startDate, form.endDate);
  const datesFilled = !!form.startDate && !!form.endDate;

  const progress = useMemo(() => {
    const totalProductImages = (form.productFiles?.length ?? 0) + savedProductImages.length;

    const checks = [
      form.title.trim().length > 0,
      form.description.trim().length > 49,
      form.categoryId.trim().length > 0,
      form.subcategories.length > 0,
      form.goals.length > 0,
      form.numberOfInfluencers > 0,
      form.influencerTier.length > 0,
      form.contentFormats.length > 0,
      form.targetCountry.length > 0,
      form.targetAgeGroups.length > 0,
      form.paymentType.trim().length > 0,
      form.startDate.trim().length > 0,
      form.endDate.trim().length > 0,
      Number(form.campaignBudget || 0) > 0,
      datesFilled && dateOk,
      totalProductImages > 0 && productFileErrors.length === 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, dateOk, datesFilled, productFileErrors.length, savedProductImages.length]);

  const effectivePreviewWidth = useResponsivePreviewWidth({
    desiredPx: previewWidth,
    sidebarOffsetPx,
    enabled: previewOpen,
    maxRatio: 0.42,
    minLeftPx: 360,
  });

  const computedBottomBarMaxW = bottomBarMaxWidth ?? (previewOpen && !isBelowLg ? formMaxWidth + effectivePreviewWidth + 120 : formMaxWidth + 120);

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_MANUAL });
    setProductFileErrors([]);
    setAttachmentErrors([]);
    setApiError("");
    setCampaignId("");
    setLoadedDetails(null);
    setSavedProductImages([]);
    setPreviewProductImages([]);

    categoryPicker.hydrateSelectedCategory(null);
    categoryPicker.setSearch("");
    categoryPicker.setSubSearch("");

    setDraftJustSaved(false);
    if (draftSavedTimerRef.current) {
      window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = null;
    }

    setScheduleOpen(false);
    setScheduleDate(safeDateInput(new Date().toISOString()));
    setScheduleTime(getDefaultScheduleTime());
    setTzRes(null);
    setTzLoading(false);
    setTzError("");

    setSubmitAttempted(false);
    setServerFieldErrors({});
    setPublishConfirmOpen(false);
  }, [categoryPicker]);

  const saveDraftManually = useCallback(async () => {
    const brandId = getBrandId();
    if (!brandId) {
      pushApiError("Login required", "BrandId missing. Please login again.");
      return;
    }

    setApiError("");
    setDraftSaving(true);

    if (draftSavedTimerRef.current) {
      window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = null;
    }

    try {
      let uploadedImages: SavedProductImage[] = [];

      if (form.productFiles?.length) {
        const uploadRes = await apiUploadImages(form.productFiles);
        const urls: string[] = uploadRes?.urls ?? uploadRes?.data?.urls ?? [];

        if (!urls.length) {
          throw new Error("Image upload failed. No image URLs returned from backend.");
        }

        uploadedImages = urls.map((url, i) => {
          const file = form.productFiles[i];
          const key =
            url.split("/campaign-images/")[1] ?? url.split("/").pop() ?? "";

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
      }

      const allProductImages: SavedProductImage[] = [
        ...savedProductImages,
        ...uploadedImages,
      ];

      if (!campaignId) {
        const createBase = await buildCreateManualPayload(
          { ...form, productFiles: [] },
          true,
          allProductImages
        );

        const res = await apiCampaignCreate({
          ...(createBase as CreateCampaignManualPayload),
          status: "draft" as CampaignStatus,
        });

        const id = pickCampaignId(res);
        if (id) setCampaignId(id);

        toastSuccess(extractBackendSuccessMessage(res, "Draft saved"));
      } else {
        const payload = await buildEditDraftPayload(
          brandId,
          campaignId,
          { ...form, productFiles: [] },
          "draft",
          allProductImages
        );

        const res = await apiCampaignEditDraft(payload);

        toastSuccess(extractBackendSuccessMessage(res, "Draft updated"));
      }

      setDraftJustSaved(true);
      draftSavedTimerRef.current = window.setTimeout(() => setDraftJustSaved(false), 1200);

      resetForm();
      router.replace("/brand/campaign/draft");
      onAfterPublish?.();
    } catch (e) {
      const backendMsg = extractBackendMessage(e);
      setApiError(backendMsg);
      toastError("Failed to save draft", backendMsg);
    } finally {
      setDraftSaving(false);
    }
  }, [
    campaignId,
    form,
    savedProductImages,
    pushApiError,
    extractBackendMessage,
    extractBackendSuccessMessage,
    resetForm,
    router,
    onAfterPublish,
  ]);

  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

  const manualErrors = useMemo(
    () =>
      validateManualForm({
        form,
        dateOk,
        blockingFileErrors: productFileErrors,
        savedProductImageCount: savedProductImages.length,
      }),
    [form, dateOk, productFileErrors, savedProductImages.length]
  );

  const combinedErrors = useMemo(() => {
    return { ...manualErrors, ...(serverFieldErrors || {}) };
  }, [manualErrors, serverFieldErrors]);

  const stateFor = useCallback((key: string) => (submitAttempted && combinedErrors[key] ? ("error" as const) : undefined), [submitAttempted, combinedErrors]);
  const msgFor = useCallback((key: string) => (submitAttempted ? combinedErrors[key] : ""), [submitAttempted, combinedErrors]);

  const doPublish = useCallback(
    async (status: CampaignStatus, scheduledAtIso?: string) => {
      setSubmitAttempted(true);
      setServerFieldErrors({});
      setApiError("");

      const errs = validateManualForm({
        form,
        dateOk,
        blockingFileErrors: productFileErrors,
        savedProductImageCount: savedProductImages.length,
      });
      if (Object.values(errs).some(Boolean)) return;

      const brandId = getBrandId();
      if (!brandId) {
        toastError("Login required", "BrandId missing. Please login again.");
        return;
      }

      setPublishing(true);
      let cid: string | undefined;

      try {
        // ✅ Step 1: Upload new files → get back S3 URLs
        let uploadedImages: SavedProductImage[] = [];
        if (form.productFiles?.length) {
          const uploadRes = await apiUploadImages(form.productFiles);
          const urls: string[] = uploadRes?.urls ?? uploadRes?.data?.urls ?? [];

          // ✅ Step 2: Map each S3 URL with its corresponding file metadata by index
          uploadedImages = urls.map((url, i) => {
            const file = form.productFiles[i];
            const key =
              url.split("/campaign-images/")[1] ?? url.split("/").pop() ?? "";

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
        }

        // ✅ Step 3: Merge existing saved images with newly uploaded S3 images
        const allProductImages: SavedProductImage[] = [
          ...savedProductImages,
          ...uploadedImages,
        ];

        if (campaignId) {
          const payload: EditDraftPayload = compact({
            brandId,
            campaignId,
            status,
            ...(scheduledAtIso ? { scheduledAt: scheduledAtIso } : {}),
            campaignTitle: form.title.trim(),
            description: form.description.trim(),
            campaignType: form.campaignType,
            categoryId: form.categoryId,
            subcategoryIds: form.subcategories,
            productLink: form.productLink.trim(),
            // ✅ Full metadata objects with S3 dataUrl — no base64
            productImages: allProductImages.length ? allProductImages : undefined,
            campaignGoals: form.goals,
            influencerTierIds: form.influencerTier,
            contentFormats: form.contentFormats,
            contentLanguageIds: form.contentLanguage,
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
            campaignTimezone: getLocalCampaignTimezone(),
            startAt: toCampaignDateTimeInput(form.startDate, "start") || undefined,
            endAt: toCampaignDateTimeInput(form.endDate, "end") || undefined,
          }) as EditDraftPayload;

          const updated: any = await apiCampaignEditDraft(payload);

          cid = pickCampaignId(updated) || campaignId;
          if (cid) setCampaignId(cid);

          toastSuccess(
            extractBackendSuccessMessage(
              updated,
              status === "scheduled"
                ? "Campaign scheduled"
                : status === "active"
                  ? "Campaign published"
                  : "Campaign updated"
            )
          );
        } else {
          // ✅ Empty productFiles so filesToDataUrls([]) = [] inside builder (no base64)
          // ✅ includeFiles: true so the async merge path runs
          // ✅ allProductImages passed as savedProductImages → S3 URLs merged into payload
          const payload = await buildCreateManualPayload(
            { ...form, productFiles: [] },
            true,
            allProductImages
          );

          const created: any = await apiCampaignCreate({
            ...(payload as CreateCampaignManualPayload),
            status,
            ...(scheduledAtIso ? { scheduledAt: scheduledAtIso } : {}),
          });

          cid = pickCampaignId(created);
          if (cid) setCampaignId(cid);

          toastSuccess(
            extractBackendSuccessMessage(
              created,
              status === "scheduled"
                ? "Campaign scheduled"
                : status === "active"
                  ? "Campaign published"
                  : "Campaign created"
            )
          );
        }

        cid = cid || campaignId;

        if (status === "scheduled") {
          resetForm();
          router.replace(`/brand/influencer-invitation/?q=scheduled-campaign&campaignId=${encodeURIComponent(cid || "")}`);
          onAfterPublish?.();
          return;
        }

        if (status === "active") {
          resetForm();
          router.replace(`/brand/influencer-invitation?q=active&campaignId=${encodeURIComponent(cid || "")}`);
          onAfterPublish?.();
          return;
        }

        resetForm();
        onAfterPublish?.();
      } catch (e: any) {
        const backendMsg = extractBackendMessage(e);
        const fe = extractBackendFieldErrors(e);

        setApiError(backendMsg);
        if (fe && Object.keys(fe).length) setServerFieldErrors(fe);

        toastError(backendMsg);
      } finally {
        setPublishing(false);
      }
    },
    [
      campaignId,
      form,
      dateOk,
      productFileErrors,
      savedProductImages,
      resetForm,
      onAfterPublish,
      extractBackendMessage,
      extractBackendFieldErrors,
      extractBackendSuccessMessage,
      router,
    ]
  );

  const openPublishConfirm = useCallback(() => {
    setSubmitAttempted(true);
    setServerFieldErrors({});
    setApiError("");

    const errs = validateManualForm({
      form,
      dateOk,
      blockingFileErrors: productFileErrors,
      savedProductImageCount: savedProductImages.length,
    });

    if (Object.values(errs).some(Boolean)) return;

    const brandId = getBrandId();
    if (!brandId) {
      toastError("Login required", "BrandId missing. Please login again.");
      return;
    }

    setPublishConfirmOpen(true);
  }, [form, dateOk, productFileErrors, savedProductImages.length]);

  const confirmPublishCampaign = useCallback(() => {
    setPublishConfirmOpen(false);
    doPublish("active" as CampaignStatus);
  }, [doPublish]);

  const previewMeta = useMemo(() => {
    const strip = (s: string) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return {
      subcategoriesMap: toMap(subcategoryOptionsMerged),
      countryMap: toMap(countryOptionsForSelect, strip),
      ageMap: toMap(ageOptions),
      goalsMap: toMap(goalsOptions),
      hashtagsMap: toMap(hashtagOptions),
      paymentType: form.paymentType,
      campaignBudget: Number(form.campaignBudget || 0),
    };
  }, [subcategoryOptionsMerged, countryOptionsForSelect, ageOptions, goalsOptions, hashtagOptions, form.paymentType, form.campaignBudget]);

  const catSearchProps = useSearchProps(categoryPicker.search, categoryPicker.setSearch);
  const tierSearchProps = useSearchProps(lists.search.influencerTiers.value, lists.search.influencerTiers.onChange);
  const formatSearchProps = useSearchProps(lists.search.contentFormats.value, lists.search.contentFormats.onChange);
  const langSearchProps = useSearchProps(lists.search.contentLanguages.value, lists.search.contentLanguages.onChange);
  const countrySearchProps = useSearchProps(lists.search.countries.value, lists.search.countries.onChange);
  const ageSearchProps = useSearchProps(lists.search.ageRanges.value, lists.search.ageRanges.onChange);
  const hashtagSearchProps = useSearchProps(lists.search.preferredHashtags.value, lists.search.preferredHashtags.onChange);

  return (
    <>
      <div className="cg-page-frame flex min-h-0 w-full flex-col overflow-hidden h-[100dvh]">
        <div className={cn("grid h-full min-h-0 w-full", previewOpen ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1")}>
          <section className="min-h-0 min-w-0 flex flex-col">
            <div className="cg-panel flex flex-col min-h-0">
              <div className="shrink-0 px-4 sm:px-6 lg:px-10 pt-5">
                <div className="w-full pb-4">
                  <ProgressBar value={progress} heightClassName="h-[3px]" barClassName="bg-success-500" />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain cg-scrollbar">
                <div className="min-w-0 px-4 sm:px-6 lg:px-5 pb-10" style={{ paddingBottom: "calc(var(--cg-bottombar-h) + 32px)" }}>
                  <div className="border p-5 border-[#D6D6D6] rounded-l">
                    <div className="bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="cg-accordion-title">Product / Service Info</div>
                          <div className="cg-accordion-subtitle">Describe your product or service, the campaign goal, and what you’d like creators to highlight.</div>
                        </div>

                        <div className="cg-ai-glow">
                          <Button onClick={onSwitchToAI} className="m-0 shadow-lg">
                            <SparkleIcon size={20} className="mr-2" />
                            Create with AI
                          </Button>
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
                          onChange={(e: any) => setField("description", String(e.target.value))}
                          state={stateFor("description")}
                          errorText={msgFor("description")}
                        />

                        {showSparkle && (
                          <div className="fixed inset-0 flex items-center justify-center pointer-events-none bg-gray-950/60 z-[9999]">
                            <SparkleAnimation key={String(showSparkle)} className="scale-[1.8]" />
                          </div>
                        )}

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
                              const opt = categoryOptionsMerged.find((o) => o.value === id);
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
                          existingImages={savedProductImages.map((img) => img.dataUrl)}
                          required
                          error={Boolean(stateFor("productFiles"))}
                          errorText={msgFor("productFiles")}
                          onFilesChange={(next) => {
                            const errs = validateFiles(next, "Product file");
                            setProductFileErrors(errs);
                            if (errs.length) return;
                            setField("productFiles", next);
                          }}
                          onRemoveExistingImage={(url: string) => {
                            setSavedProductImages((prev) =>
                              prev.filter((img) => img.dataUrl !== url)
                            );
                          }}
                        />

                        <FloatingInput
                          label="Product Link / Video references"
                          value={form.productLink}
                          onValueChange={(val) => setField("productLink", val)}
                          state={stateFor("productLink")}
                          errorText={msgFor("productLink")}
                        />

                        <div>
                          <div className={cn("cg-description text-size-[14px] mb-2 flex items-center gap-1", stateFor("goals") && "!text-red-600")}>
                            <span>Campaign Goals</span>
                            <span className="!text-red-600">*</span>
                          </div>

                          <ChipMultiSelect options={goalsOptions} value={form.goals} onChange={(next) => setField("goals", next)} />

                          {stateFor("goals") ? <div className="mt-1 text-[14px] text-red-600">{msgFor("goals")}</div> : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex flex-col gap-[40px]">
                      <AccordionCard title="Creator Requirements" subtitle="Define who you’re looking to collaborate with.">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FloatingInput
                            label="Number of Influencers"
                            type="number"
                            required
                            value={String(form.numberOfInfluencers || "")}
                            onValueChange={(v) => setField("numberOfInfluencers", clampNonNegative(v))}
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

                                const ranges = selected.map((id) => tierRangeById.get(id));
                                const agg = aggregateRanges(ranges);

                                const nextMin = !followersTouchedRef.current.min && agg?.min != null ? agg.min : prev.minFollowers;
                                const nextMax = !followersTouchedRef.current.max && agg?.max != null ? agg.max : prev.maxFollowers;

                                return {
                                  ...prev,
                                  influencerTier: selected,
                                  minFollowers: nextMin ?? prev.minFollowers,
                                  maxFollowers: nextMax ?? prev.maxFollowers,
                                };
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

                      <AccordionCard title="Timeline & Payments" subtitle="Set Budget for delivery and how you want to pay creators.">
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
                            onValueChange={(v) => setField("campaignBudget", clampNonNegative(v))}
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

                      <AccordionCard title="Audience" subtitle="Choose who this YouTube campaign should reach.">
                        <div className="grid gap-4 md:grid-cols-2">
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
                              onChange={(e) => setField("additionalNotes", String((e as any).target.value))}
                              maxLength={4000}
                              showAttachment
                              attachment={form.attachment}
                              onAttachmentChange={(file) => {
                                const errs = file ? validateFiles([file], "Attachment") : [];
                                setAttachmentErrors(errs);
                                if (errs.length) return;
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

          {previewOpen ? (
            <aside className="hidden lg:flex min-h-0 flex-col border border-neutral-200 bg-brand-50" style={{ width: effectivePreviewWidth }}>
              <div className="shrink-0 flex items-center px-6 xl:px-10 pt-6 gap-2">
                <div className="text-[20px] leading-[28px] font-semibold tracking-[0]" style={{ color: "var(--Text-Primary, #1A1A1A)" }}>
                  Card Preview
                </div>
                <div className="relative group inline-flex cursor-pointer">
                  <Info size={20} className="text-black" />

                  <span
                    className="absolute left-1/2 top-full mt-4 -translate-x-1/2
    w-[280px] whitespace-normal break-words rounded-[14px] bg-[#171717]
    px-8 py-7 text-center text-sm leading-snug text-white shadow-lg
    opacity-0 invisible transition-all duration-200
    group-hover:opacity-100 group-hover:visible z-50

    after:content-[''] after:absolute after:left-1/2 after:bottom-full
    after:-translate-x-1/2 after:border-[12px]
    after:border-x-transparent after:border-t-transparent after:border-b-[#171717]"
                  >
                    Take a look at how your campaign card will appear to influencers
                  </span>
                </div>
              </div>

              <div className="flex-1 pb-60 px-6 xl:px-10 pt-4">
                <ManualPreviewCardStack
                  form={previewForm as any}
                  meta={previewMeta}
                />
              </div>
            </aside>
          ) : null}

          <SideModalPreview open={Boolean(previewOpen && isBelowLg)} onClose={() => setPreviewOpen(false)} title="Card Preview" widthPx={previewWidth}>
            <ManualPreviewCardStack
              form={previewForm as any}
              meta={previewMeta}
            />
          </SideModalPreview>
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleCampaignOverlay
          open={true}
          isMobile={isMobileSchedule}
          anchorRef={scheduleBtnRef}
          date={scheduleDate}
          time={scheduleTime}
          baseTimeZone={baseTimeZone}
          countries={scheduleCountries}
          tzLoading={tzLoading}
          tzError={tzError}
          onClose={() => setScheduleOpen(false)}
          onDateChange={setScheduleDate}
          onTimeChange={setScheduleTime}
          onConfirm={(iso) => {
            setScheduleOpen(false);
            doPublish("scheduled" as CampaignStatus, iso);
          }}
        />
      )}

      <PublishCampaignDialog
        open={publishConfirmOpen}
        loading={publishing}
        campaignTitle={form.title}
        onClose={() => {
          if (!publishing) setPublishConfirmOpen(false);
        }}
        onConfirm={confirmPublishCampaign}
      />

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

            <Button variant="raised" className="shadow-none" onClick={saveDraftManually} disabled={draftSaving || publishing}>
              {draftSaving ? "Saving…" : draftJustSaved ? "Saved" : "Save as Draft"}
            </Button>
          </>
        }
        right={
          <>
            <Button
              ref={scheduleBtnRef}
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              className="shadow-none"
              disabled={publishing}
            >
              <Clock size={16} className="mr-2" />
              {publishing ? "Saving…" : "Schedule Campaign"}
            </Button>

            <Button onClick={openPublishConfirm} disabled={publishing}>
              <PaperPlaneRightIcon size={16} className="mr-2" />
              {publishing ? "Publishing…" : "Publish Campaign"}
            </Button>
          </>
        }
      />
    </>
  );
}

/* ============================================================================
   ✅ Main Page
============================================================================ */
export default function CreateCampaignPage() {
  const { clearActions } = useBrandTopbar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCampaignId = searchParams.get("campaignId");
  const byAi = searchParams.get("byAi") === "1";
  const [view, setView] = useState<"loading" | "intro" | "manual" | "ai">("loading");
  const sidebarOffsetPx = useSidebarOffsetPx();
  const [showSparkle, setShowSparkle] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  const [manualFromCampaign, setManualFromCampaign] = useState<EnrichedCampaignDoc | null>(null);

  const listsEnabled = view === "manual" || view === "ai";
  const lists = useCampaignLists(listsEnabled);

  useEffect(() => {
    if (editCampaignId) {
      setView("loading");
      return;
    }

    if (byAi) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch { }

      setView("ai");
      return;
    }

    try {
      const seen = localStorage.getItem(SEEN_KEY) === "1";
      setView(seen ? "manual" : "intro");
    } catch {
      setView("intro");
    }
  }, [editCampaignId, byAi]);

  useEffect(() => {
    if (!editCampaignId) return;

    let cancelled = false;

    (async () => {
      try {
        const res: any = await apiCampaignGetById2(editCampaignId);
        if (cancelled) return;

        const doc = res?.data ?? res;
        setManualFromCampaign(doc as EnrichedCampaignDoc);
        setView("manual");
      } catch (e) {
        if (cancelled) return;
        toastError("Failed to load campaign", getApiErrorMessage(e));
        setView("manual");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editCampaignId]);

  useEffect(() => {
    if (view === "manual") return;
    clearActions();
    return () => clearActions();
  }, [view, clearActions]);

  useEffect(() => {
    if (!byAi || editCampaignId) {
      setWelcomeModalOpen(false);
      return;
    }

    const brandId = getBrandId();

    if (!brandId) {
      setWelcomeModalOpen(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiCampaignGetByBrand({
          brandId,
          page: 1,
          limit: 1,
        });

        if (cancelled) return;

        setWelcomeModalOpen(getCampaignTotal(res) === 0);
      } catch {
        if (cancelled) return;
        setWelcomeModalOpen(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [byAi, editCampaignId]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch { }
  }, []);

  const openManual = useCallback(() => {
    markSeen();
    setView("manual");
  }, [markSeen]);

  const openAI = useCallback(() => {
    markSeen();
    setView("ai");
  }, [markSeen]);

  if (view === "loading") {
    return (
      <CenterWrap>
        <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="h-6 w-40 rounded bg-neutral-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-100" />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="h-[190px] rounded-xl bg-neutral-100" />
              <div className="mt-4 h-9 w-32 mx-auto rounded bg-neutral-200" />
              <div className="mt-3 h-4 w-40 mx-auto rounded bg-neutral-100" />
            </div>

            <div className="rounded-2xl bg-neutral-50 p-6">
              <div className="h-[190px] rounded-xl bg-neutral-100" />
              <div className="mt-4 h-9 w-40 mx-auto rounded bg-neutral-200" />
              <div className="mt-3 h-4 w-44 mx-auto rounded bg-neutral-100" />
            </div>
          </div>
        </div>
      </CenterWrap>
    );
  }

  if (view === "intro") {
    return (
      <CenterWrap>
        <div className="w-full max-w-7xl rounded-xl border border-neutral-300 bg-white flex flex-col items-start px-4 pt-7 pb-4 gap-6">
          <div className="flex flex-col items-start gap-1">
            <div className="cg-card-title">Create</div>
            <div className="text-[16px] text-neutral-600">Provide your basic business information so we can set up your workspace and tailor recommendations accordingly.</div>
          </div>

          <div className="w-full grid gap-6 md:grid-cols-2">
            <div className="rounded-l border border-neutral-200 bg-white p-6 min-h-[360px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <Button onClick={openManual} variant="outline">
                  Continue
                </Button>
                <div className="cg-black-description font-semibold">Create Manually</div>
                <div className="text-[14px] text-neutral-600">Maximum file size is {MAX_FILE_MB}MB</div>
              </div>
            </div>

            <div className="rounded-l bg-neutral-50 p-6 min-h-[360px] flex items-center justify-center overflow-hidden">
              <div className="relative flex flex-col items-center gap-2 text-center">
                <div className="cg-ai-glow">
                  <Button onClick={openAI} className="m-0 shadow-lg">
                    <SparkleIcon size={20} className="mr-2" />
                    Create with AI
                  </Button>
                </div>

                <div className="cg-black-description font-semibold">Create With AI</div>
                <div className="text-[14px] text-neutral-600">Dive in the world of AI to make</div>
              </div>
            </div>
          </div>
        </div>
      </CenterWrap>
    );
  }
  const withWelcomeModal = (children: React.ReactNode) => (
    <>
      <BrandWelcomeModal
        open={welcomeModalOpen}
        brandId={getBrandId()}
        onClose={() => setWelcomeModalOpen(false)}
      />

      {children}
    </>
  );

  if (view === "ai") {
    return withWelcomeModal(
      <CreateByAIScreen
        sidebarOffsetPx={sidebarOffsetPx}
        onBack={() => setView("intro")}
        onSwitchToManual={() => setView("manual")}
        onCreated={(doc) => {
          setManualFromCampaign(doc);
          setView("manual");
        }}
        lists={lists}
        showSparkle={showSparkle}
        setShowSparkle={setShowSparkle}
      />,
    );
  }



  return withWelcomeModal(
    <CreateManualScreen
      sidebarOffsetPx={sidebarOffsetPx}
      onBack={() => setView("intro")}
      onSwitchToAI={() => setView("ai")}
      formMaxWidth={LAYOUT.manualFormMaxWidth}
      previewWidth={LAYOUT.manualPreviewWidth}
      lists={lists}
      initialFromCampaign={manualFromCampaign}
      onAfterPublish={() => setManualFromCampaign(null)}
      showSparkle={showSparkle}
      setShowSparkle={setShowSparkle}
    />,
  );
}