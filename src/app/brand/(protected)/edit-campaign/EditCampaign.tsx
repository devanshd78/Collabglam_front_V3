"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, Eye, EyeClosed, Info, PaperPlaneTilt } from "@phosphor-icons/react";

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
    getApiErrorMessage,
    EnrichedCampaignDoc,
    apiCampaignViewByBrand,
    apiCampaignUpdateManual,
    UpdateCampaignManualPayload,
} from "../../services/brandApi";

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
    Option,
    pickCampaignId,
    safeDateInput,
    SEARCHABLE_UI,
    useSearchProps,
    validateFiles,
    mergeOptions,
    prettyTierValue,
} from "./edit-campaign.utils";

import {
    useCampaignLists,
    useCategoryPicker,
    useResponsivePreviewWidth,
    useSidebarOffsetPx,
} from "./edit-campaign.hooks";

/* ============================================================================
   Toast helpers
============================================================================ */
function toastSuccess(title: string, description?: string) {
    return toast({ icon: "success", title, text: description });
}
function toastError(title: string, description?: string) {
    return toast({ icon: "error", title, text: description });
}

/* ============================================================================
   Shared UI bits
============================================================================ */
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
                <div
                    className={cn("h-full transition-[width] duration-200 ease-out rounded-pill", barClassName)}
                    style={{ width: `${safe}%` }}
                />
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
                style={{ width: `min(${widthPx}px, 92vw)` }}
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

/* ============================================================================
   Forms
============================================================================ */
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
    const normalized = String(paren).trim().replace(/[–—]/g, "-").replace(/\bto\b/gi, "-");

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

const isBeforeISO = (a?: string, b?: string) => {
    const da = toLocalDate(a);
    const db = toLocalDate(b);
    if (!da || !db) return false;
    return da.getTime() < db.getTime();
};

const isSameOrBeforeISO = (a?: string, b?: string) => {
    const da = toLocalDate(a);
    const db = toLocalDate(b);
    if (!da || !db) return false;
    return da.getTime() <= db.getTime();
};

const TODAY = todayISO();

/* ============================================================================
   Payload builders
============================================================================ */
async function buildUpdateManualPayload(args: {
    brandId: string;
    campaignId: string;
    status: string;
    form: ManualForm;
    existingProductImages: ExistingProductImage[];
}) {
    const { brandId, campaignId, status, form, existingProductImages } = args;
    const newProductImages = await filesToDataUrls(form.productFiles ?? []);

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
        productImages: [...(existingProductImages ?? []), ...newProductImages],

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

        startAt: form.startDate || undefined,
        endAt: form.endDate || undefined,
    }) as UpdateCampaignManualPayload;
}

/* ============================================================================
   Validation
============================================================================ */
function validateManualForm(args: {
    form: ManualForm;
    dateOk: boolean;
    blockingFileErrors: string[];
    existingProductImagesCount?: number;
}) {
    const { form, dateOk, blockingFileErrors, existingProductImagesCount = 0 } = args;
    const e: Record<string, string> = {};

    if (!form.title.trim()) e.title = "Campaign title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.categoryId.trim()) e.categoryId = "Campaign category is required.";

    if (!form.subcategories?.length) e.subcategories = "Select at least 1 subcategory.";
    if (!form.goals?.length) e.goals = "Select at least 1 campaign goal.";
    if (!form.targetCountry?.length) e.targetCountry = "Select at least 1 country.";
    if (!form.targetAgeGroups?.length) e.targetAgeGroups = "Select at least 1 age group.";

    const hasNewFiles = (form.productFiles?.length ?? 0) > 0;
    const hasExistingFiles = existingProductImagesCount > 0;

    if (!hasNewFiles && !hasExistingFiles) e.productFiles = "Upload at least 1 product image/file.";
    if (blockingFileErrors?.length) e.productFiles = blockingFileErrors[0];

    if (!form.paymentType.trim()) e.paymentType = "Payment type is required.";
    if (!Number(form.campaignBudget) || Number(form.campaignBudget) <= 0) {
        e.campaignBudget = "Campaign budget is required.";
    }

    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";
    if (form.startDate && form.endDate && !dateOk) e.endDate = "End Date must be after Start Date.";

    if (Number(form.minFollowers) < 0) e.minFollowers = "Min followers can't be negative.";
    if (Number(form.maxFollowers) < 0) e.maxFollowers = "Max followers can't be negative.";
    if (
        Number(form.minFollowers) > 0 &&
        Number(form.maxFollowers) > 0 &&
        Number(form.minFollowers) > Number(form.maxFollowers)
    ) {
        e.maxFollowers = "Max followers must be ≥ Min followers.";
    }

    if (!Number(form.numberOfInfluencers) || Number(form.numberOfInfluencers) <= 0) {
        e.numberOfInfluencers = "Number of influencers is required.";
    }

    if (!form.influencerTier?.length) e.influencerTier = "Select at least 1 influencer tier.";
    if (!form.contentFormats?.length) e.contentFormats = "Select at least 1 content format.";

    return e;
}

/* ============================================================================
   Accordion + chips
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

                <span className="shrink-0 mt-[6px] text-neutral-900">
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

type ExistingProductImage =
    | string
    | {
        name?: string;
        type?: string;
        size?: number;
        dataUrl?: string;
        url?: string;
        src?: string;
    };

function getImageSrc(img: ExistingProductImage): string {
    const raw =
        typeof img === "string"
            ? img
            : img?.dataUrl || img?.url || img?.src || "";

    const src = String(raw || "").trim();

    if (!src) return "";

    if (src.startsWith("data:image/")) return src;
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    if (src.startsWith("/")) return src;

    return "";
}

/* ============================================================================
   Main page
============================================================================ */
export default function EditCampaignPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setActions, clearActions } = useBrandTopbar();

    const sidebarOffsetPx = useSidebarOffsetPx();
    const lists = useCampaignLists(true);
    const categoryPicker = useCategoryPicker({ debounceMs: 250, enabled: true });

    const queryCampaignId = searchParams.get("campaignId") || "";

    const [loading, setLoading] = useState(true);
    const [loadedDetails, setLoadedDetails] = useState<any>(null);
    const [campaignId, setCampaignId] = useState<string>("");
    const [campaignStatus, setCampaignStatus] = useState<string>("active");
    const [initialCampaign, setInitialCampaign] = useState<EnrichedCampaignDoc | null>(null);

    const [form, setForm] = useState<ManualForm>(EMPTY_MANUAL);

    const [existingProductImages, setExistingProductImages] = useState<ExistingProductImage[]>([]);

    const [productFileErrors, setProductFileErrors] = useState<string[]>([]);
    const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
    const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [updating, setUpdating] = useState(false);

    const followersTouchedRef = useRef({ min: false, max: false });

    const isBelowLg = useMediaQuery("(max-width: 1023px)");
    const lastDesktopPreviewRef = useRef(true);
    const prevIsBelowLgRef = useRef<boolean | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const setField = useCallback(<K extends keyof ManualForm>(key: K, value: ManualForm[K]) => {
        setForm((p) => ({ ...p, [key]: value }));
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

        return "Failed to update campaign.";
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

    const hydrateSelectedCategoryRef = useRef(categoryPicker.hydrateSelectedCategory);

    useEffect(() => {
        hydrateSelectedCategoryRef.current = categoryPicker.hydrateSelectedCategory;
    }, [categoryPicker.hydrateSelectedCategory]);

    const loadCampaignIntoForm = useCallback(
        (doc: any) => {
            const normalizePaymentType = (v: any) => {
                const s = String(v ?? "").trim().toLowerCase();
                if (s === "milestone") return "Milestone";
                if (s === "fixed") return "Fixed";
                if (s === "gifting") return "Gifting";
                return "Milestone";
            };

            const id = pickCampaignId(doc) || queryCampaignId;
            if (id) setCampaignId(id);

            const status = String(
                doc?.status ?? (doc?.isDraft === 1 ? "draft" : doc?.isActive === 1 ? "active" : "paused")
            ).trim();
            setCampaignStatus(status || "active");

            const details = doc?.details ?? null;
            setLoadedDetails(details);

            const nextCategoryId = String(doc?.categoryId ?? details?.category?.id ?? "").trim();
            const nextCategoryName = String(doc?.categoryName ?? details?.category?.name ?? "").trim();

            const existingImgsRaw = Array.isArray(doc?.productImages)
                ? doc.productImages
                : Array.isArray(doc?.images)
                    ? doc.images
                    : [];

            const normalizedExistingImgs = existingImgsRaw.filter((item: any) => {
                if (!item) return false;
                if (typeof item === "string") return !!item.trim();
                return !!(item?.dataUrl || item?.url || item?.src);
            });

            setExistingProductImages(normalizedExistingImgs);

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

            setForm(next);

            if (nextCategoryId) {
                hydrateSelectedCategoryRef.current?.({
                    id: nextCategoryId,
                    name: nextCategoryName || "Selected category",
                });
            }

            setServerFieldErrors({});
            setProductFileErrors([]);
            setAttachmentErrors([]);
            setSubmitAttempted(false);
        },
        [queryCampaignId]
    );
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

    useEffect(() => {
        let active = true;

        const run = async () => {
            const brandId = getBrandId();

            if (!brandId) {
                toastError("Login required", "BrandId missing. Please login again.");
                setLoading(false);
                return;
            }

            if (!queryCampaignId) {
                toastError("Missing campaign id", "Please open edit page with ?id=campaignId");
                setLoading(false);
                return;
            }

            try {
                const doc = await apiCampaignViewByBrand({
                    brandId,
                    campaignId: queryCampaignId,
                });

                if (!active) return;

                setInitialCampaign(doc);
                loadCampaignIntoForm(doc);
            } catch (e) {
                if (!active) return;
                toastError("Failed to load campaign", extractBackendMessage(e));
            } finally {
                if (active) setLoading(false);
            }
        };

        run();

        return () => {
            active = false;
        };
    }, [queryCampaignId, loadCampaignIntoForm, extractBackendMessage]);

    const resetForm = useCallback(() => {
        if (initialCampaign) {
            loadCampaignIntoForm(initialCampaign);
            toastSuccess("Reset complete", "Campaign fields restored.");
            return;
        }

        setForm({ ...EMPTY_MANUAL });
        setExistingProductImages([]);
        setProductFileErrors([]);
        setAttachmentErrors([]);
        setServerFieldErrors({});
        setSubmitAttempted(false);
    }, [initialCampaign, loadCampaignIntoForm]);

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
                    return { label, value: String(t?.id ?? "").trim() };
                })
                .filter((x: any) => x.label && x.value),
        [loadedDetails]
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
                    return { label: `${flag ? flag + " " : ""}${name}`, value: id };
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
                const name = String(c?.countryNameEn ?? "").trim();
                const flag = String(c?.flag ?? "").trim();
                if (!name) return null;
                return { label: `${flag ? flag + " " : ""}${name}`, value: id };
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
            ((form.productFiles?.length || 0) > 0 || existingProductImages.length > 0) &&
            productFileErrors.length === 0,
        ];
        return Math.round((checks.filter(Boolean).length / checks.length) * 100);
    }, [form, dateOk, datesFilled, productFileErrors.length, existingProductImages.length]);

    const effectivePreviewWidth = useResponsivePreviewWidth({
        desiredPx: LAYOUT.manualPreviewWidth,
        sidebarOffsetPx,
        enabled: previewOpen,
        maxRatio: 0.42,
        minLeftPx: 360,
    });

    const computedBottomBarMaxW =
        previewOpen && !isBelowLg
            ? LAYOUT.manualFormMaxWidth + effectivePreviewWidth + 120
            : LAYOUT.manualFormMaxWidth + 120;

    const manualErrors = useMemo(
        () =>
            validateManualForm({
                form,
                dateOk,
                blockingFileErrors: productFileErrors,
                existingProductImagesCount: existingProductImages.length,
            }),
        [form, dateOk, productFileErrors, existingProductImages.length]
    );

    const combinedErrors = useMemo(() => {
        return { ...manualErrors, ...(serverFieldErrors || {}) };
    }, [manualErrors, serverFieldErrors]);

    const stateFor = useCallback(
        (key: string) => (submitAttempted && combinedErrors[key] ? ("error" as const) : undefined),
        [submitAttempted, combinedErrors]
    );

    const msgFor = useCallback(
        (key: string) => (submitAttempted ? combinedErrors[key] : ""),
        [submitAttempted, combinedErrors]
    );

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
    }, [
        subcategoryOptionsMerged,
        countryOptionsForSelect,
        ageOptions,
        goalsOptions,
        hashtagOptions,
        form.paymentType,
        form.campaignBudget,
    ]);

    const catSearchProps = useSearchProps(categoryPicker.search, categoryPicker.setSearch);
    const tierSearchProps = useSearchProps(lists.search.influencerTiers.value, lists.search.influencerTiers.onChange);
    const formatSearchProps = useSearchProps(lists.search.contentFormats.value, lists.search.contentFormats.onChange);
    const langSearchProps = useSearchProps(lists.search.contentLanguages.value, lists.search.contentLanguages.onChange);
    const countrySearchProps = useSearchProps(lists.search.countries.value, lists.search.countries.onChange);
    const ageSearchProps = useSearchProps(lists.search.ageRanges.value, lists.search.ageRanges.onChange);
    const hashtagSearchProps = useSearchProps(lists.search.preferredHashtags.value, lists.search.preferredHashtags.onChange);

    const [productFilePreviewUrls, setProductFilePreviewUrls] = useState<string[]>([]);

    useEffect(() => {
        const files = form.productFiles ?? [];

        if (!files.length) {
            setProductFilePreviewUrls([]);
            return;
        }

        const urls = files.map((file) => URL.createObjectURL(file));
        setProductFilePreviewUrls(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [form.productFiles]);

    const previewProductImages = useMemo(
        () => [
            ...(existingProductImages ?? []).map(getImageSrc).filter(Boolean),
            ...productFilePreviewUrls,
        ],
        [existingProductImages, productFilePreviewUrls]
    );

    const previewForm = useMemo(
        () => ({
            ...form,
            productImages: previewProductImages,
        }),
        [form, previewProductImages]
    );

    const doUpdate = useCallback(async () => {
        setSubmitAttempted(true);
        setServerFieldErrors({});

        const errs = validateManualForm({
            form,
            dateOk,
            blockingFileErrors: productFileErrors,
            existingProductImagesCount: existingProductImages.length,
        });

        const firstError = Object.values(errs).find(Boolean);

        if (firstError) {
            toastError("Please fix the highlighted fields", firstError);
            return;
        }

        const brandId = getBrandId();
        if (!brandId) {
            toastError("Login required", "BrandId missing. Please login again.");
            return;
        }

        if (!campaignId) {
            toastError("Missing campaign", "campaignId is required for edit mode.");
            return;
        }

        setUpdating(true);

        try {
            const payload = await buildUpdateManualPayload({
                brandId,
                campaignId,
                status: campaignStatus || "active",
                form,
                existingProductImages,
            });

            const updated: any = await apiCampaignUpdateManual(payload);
            const updatedDoc = updated?.doc ?? updated;
            const nextId = pickCampaignId(updatedDoc) || campaignId;

            setCampaignId(nextId);

            if (updatedDoc) {
                setInitialCampaign(updatedDoc);
                loadCampaignIntoForm(updatedDoc);
            }

            toastSuccess(
                extractBackendSuccessMessage(updated, "Campaign updated successfully.")
            );

            const nextStatus = String(updatedDoc?.status || campaignStatus || "")
                .trim()
                .toLowerCase();

            const nextRoute =
                nextStatus === "draft"
                    ? "/brand/campaign/draft"
                    : nextStatus === "scheduled"
                        ? "/brand/campaign/scheduled-campaign"
                        : nextStatus === "active"
                            ? "/brand/campaign/active"
                            : "/brand/campaign/all";

            router.replace(nextRoute);
        } catch (e: any) {
            const backendMsg = extractBackendMessage(e);
            const fe = extractBackendFieldErrors(e);

            if (fe && Object.keys(fe).length) setServerFieldErrors(fe);
            toastError("Failed to update campaign", backendMsg);
        } finally {
            setUpdating(false);
        }
    }, [
        form,
        dateOk,
        productFileErrors,
        existingProductImages,
        campaignId,
        campaignStatus,
        extractBackendMessage,
        extractBackendFieldErrors,
        extractBackendSuccessMessage,
        router,
        loadCampaignIntoForm,
    ]);

    if (loading) {
        return (
            <div className="w-full min-h-[100dvh] bg-white px-4 py-6">
                <div className="mx-auto max-w-7xl rounded-xl border border-neutral-200 bg-white p-6">
                    <div className="h-6 w-48 rounded bg-neutral-200" />
                    <div className="mt-3 h-4 w-72 max-w-full rounded bg-neutral-100" />

                    <div className="mt-6 space-y-4">
                        <div className="h-12 rounded bg-neutral-100" />
                        <div className="h-28 rounded bg-neutral-100" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="h-12 rounded bg-neutral-100" />
                            <div className="h-12 rounded bg-neutral-100" />
                        </div>
                        <div className="h-48 rounded bg-neutral-100" />
                    </div>
                </div>
            </div>
        );
    }

    if (!initialCampaign) {
        return (
            <div className="w-full min-h-[100dvh] bg-white px-4 py-6">
                <div className="mx-auto max-w-3xl rounded-xl border border-neutral-200 bg-white p-6 text-center">
                    <div className="text-[20px] font-semibold text-neutral-900">Campaign not found</div>
                    <div className="mt-2 text-sm text-neutral-600">
                        We couldn’t load this campaign for editing.
                    </div>

                    <Button className="mt-4" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const startMin = form.startDate && isBeforeISO(form.startDate, TODAY) ? form.startDate : TODAY;

    return (
        <>
            <div className="cg-page-frame flex min-h-0 w-full flex-col overflow-hidden h-[100dvh]">
                <div
                    className={cn(
                        "grid h-full min-h-0 w-full",
                        previewOpen ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1"
                    )}
                >
                    <section className="min-h-0 min-w-0 flex flex-col">
                        <div className="cg-panel flex flex-col min-h-0">
                            <div className="shrink-0 px-4 sm:px-6 lg:px-10 pt-5">
                                <div className="mb-4">
                                    <div className="text-[24px] font-semibold text-neutral-900">Edit Campaign</div>
                                    <div className="text-[14px] text-neutral-600">
                                        Update your campaign details and review the preview before saving changes.
                                    </div>
                                </div>

                                <div className="w-full pb-4">
                                    <ProgressBar value={progress} heightClassName="h-[3px]" barClassName="bg-success-500" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain cg-scrollbar">
                                <div
                                    className="min-w-0 px-4 sm:px-6 lg:px-5 pb-10"
                                    style={{ paddingBottom: "calc(var(--cg-bottombar-h) + 32px)" }}
                                >
                                    <div className="border p-5 border-[#D6D6D6] rounded-l">
                                        <div className="bg-white p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="cg-accordion-title">Product / Service Info</div>
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
                                                    onChange={(e: any) => setField("description", String(e.target.value))}
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
                                                            const opt = categoryPicker.categoryOptions.find((o) => o.value === id);
                                                            setField("categoryId", id);
                                                            setField("categoryName", opt?.label ?? "");
                                                            setField("subcategories", []);
                                                        }}
                                                        state={stateFor("categoryId")}
                                                        errorText={msgFor("categoryId")}
                                                        clientFilter={false}
                                                    >
                                                        {categoryPicker.categoryOptions.map((x) => (
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

                                                {existingProductImages.length > 0 ? (
                                                    <div>
                                                        <div className="mb-2 text-[14px] font-medium text-neutral-900">Existing Product Images</div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {existingProductImages.map((img, index) => {
                                                                const src = getImageSrc(img);
                                                                if (!src) return null;

                                                                return (
                                                                    <div
                                                                        key={`${src}-${index}`}
                                                                        className="relative rounded-lg border border-neutral-200 overflow-hidden bg-white"
                                                                    >
                                                                        <img
                                                                            src={src}
                                                                            alt="Existing campaign asset"
                                                                            className="h-28 w-full object-cover"
                                                                        />

                                                                        <button
                                                                            type="button"
                                                                            className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white"
                                                                            onClick={() =>
                                                                                setExistingProductImages((prev) => prev.filter((_, i) => i !== index))
                                                                            }
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <ProductCardUpload
                                                    files={form.productFiles}
                                                    required={existingProductImages.length === 0}
                                                    error={Boolean(stateFor("productFiles"))}
                                                    errorText={msgFor("productFiles")}
                                                    onFilesChange={(next) => {
                                                        const errs = validateFiles(next, "Product file");
                                                        setProductFileErrors(errs);
                                                        if (errs.length) return;
                                                        setField("productFiles", next);
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
                                                    <div
                                                        className={cn(
                                                            "cg-description text-size-[14px] mb-2 flex items-center gap-1",
                                                            stateFor("goals") && "!text-red-600"
                                                        )}
                                                    >
                                                        <span>Campaign Goals</span>
                                                        <span className="!text-red-600">*</span>
                                                    </div>

                                                    <ChipMultiSelect options={goalsOptions} value={form.goals} onChange={(next) => setField("goals", next)} />

                                                    {stateFor("goals") ? (
                                                        <div className="mt-1 text-[14px] text-red-600">{msgFor("goals")}</div>
                                                    ) : null}
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
                                                        min={startMin}
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
                                                        min={form.startDate ? addDaysISO(form.startDate, 1) : startMin}
                                                        onValueChange={(v) => setField("endDate", v)}
                                                        state={stateFor("endDate")}
                                                        errorText={msgFor("endDate")}
                                                    />
                                                </div>
                                            </AccordionCard>

                                            <AccordionCard title="Audience & Platforms" subtitle="Choose where and who this campaign should reach.">
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
                                                        {attachmentErrors[0] ? (
                                                            <div className="mt-1 text-[12px] text-red-600">{attachmentErrors[0]}</div>
                                                        ) : null}
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
                        <aside
                            className="hidden lg:flex min-h-0 flex-col border border-neutral-200 bg-brand-50"
                            style={{ width: effectivePreviewWidth }}
                        >
                            <div className="shrink-0 flex items-center px-6 xl:px-10 pt-10 pb-4 gap-2">
                                <div
                                    className="text-[20px] leading-[28px] font-semibold tracking-[0]"
                                    style={{ color: "var(--Text-Primary, #1A1A1A)" }}
                                >
                                    Card Preview
                                </div>
                                <Info size={20} className="text-black" />
                            </div>

                            <div className="flex-1 min-h-0 pb-10 px-6 xl:px-10">
                                <ManualPreviewCardStack form={previewForm} meta={previewMeta} />
                            </div>
                        </aside>
                    ) : null}

                    <SideModalPreview
                        open={Boolean(previewOpen && isBelowLg)}
                        onClose={() => setPreviewOpen(false)}
                        title="Card Preview"
                        widthPx={LAYOUT.manualPreviewWidth}
                    >
                        <ManualPreviewCardStack form={previewForm} meta={previewMeta} />
                    </SideModalPreview>
                </div>
            </div>

            <FixedBottomBar
                sidebarOffsetPx={sidebarOffsetPx}
                containerMaxWidth={computedBottomBarMaxW}
                left={
                    <>
                        <Button variant="raised" className="shadow-none" onClick={() => router.back()} disabled={updating}>
                            Go Back
                        </Button>

                        <span aria-hidden className="h-5 w-px bg-[#E6E6E6]" />

                        <Button
                            variant="raised"
                            className="shadow-none"
                            style={{ color: "var(--Light-Border-Negative, #E35141)" }}
                            onClick={resetForm}
                            disabled={updating}
                        >
                            Reset
                        </Button>
                    </>
                }
                right={
                    <Button onClick={doUpdate} disabled={updating}>
                        <PaperPlaneTilt size={16} className="mr-2" />
                        {updating ? "Updating…" : "Update Campaign"}
                    </Button>
                }
            />
        </>
    );
}