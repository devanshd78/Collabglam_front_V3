"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronDown,
  Minus,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/buttonComp";
import { FloatingInput } from "@/components/ui/floatingInput";
import { FloatingDateInput } from "@/components/ui/date";
import { LabeledTextarea } from "@/components/ui/textAreaComp";
import { ProductImagesUpload } from "@/components/ui/upload-card";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { toast, ToastStyles } from "@/components/ui/toast";

import {
  apiBrandWalletTopup,
  apiConfirmBrandWalletTopup,
  apiCreateMilestone,
  apiEditMilestone,
  getApiErrorMessage,
} from "@/app/brand/services/brandApi";

type AddMilestoneCardProps = {
  open: boolean;
  onClose: () => void;
  brandId: string;
  contractId?: string;
  campaignId?: string;
  campaignName?: string;
  influencerId?: string;
  influencerName?: string;
  onSubmit?: () => void | Promise<void>;

  influencerBudget?: number;
  usedMilestoneBudget?: number;

  mode?: "create" | "edit";
  milestoneId?: string;
  milestoneHistoryId?: string;
  milestoneData?: any;

  source?: "brand" | "admin";
  adminId?: string;
};

type Option = {
  label: string;
  value: string;
  icon?: string;
};

type DeliverableRow = {
  id: string;
  name: string;
  deliveries: string[];
  aspectRatio: string;
  platforms: string[];
  quantity: number;
};

const DELIVERY_OPTIONS: Option[] = [
  { label: "Static post", value: "static_post" },
  { label: "Reel / short video", value: "reel_short_video" },
  { label: "Carousel", value: "carousel" },
  { label: "Blog / Article", value: "blog_article" },
  { label: "TikTok video", value: "tiktok_video" },
  { label: "YouTube video", value: "youtube_video" },
];

const ASPECT_RATIO_OPTIONS: Option[] = [
  { label: "1080 × 1080", value: "1080x1080" },
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "4:5", value: "4:5" },
  { label: "1:1", value: "1:1" },
];

const PLATFORM_OPTIONS: Option[] = [
  {
    label: "YouTube",
    value: "youtube",
    icon: "/logos_youtube-icon.svg",
  },
  {
    label: "Instagram",
    value: "instagram",
    icon: "/skill-icons_instagram.svg",
  },
  {
    label: "TikTok",
    value: "tiktok",
    icon: "/ic_baseline-tiktok.svg",
  },
];

const GRACE_DAY_OPTIONS: Option[] = [
  { label: "Add grace days", value: "" },
  { label: "1 day", value: "1" },
  { label: "2 days", value: "2" },
  { label: "3 days", value: "3" },
  { label: "5 days", value: "5" },
  { label: "7 days", value: "7" },
];

const labelClass =
  "font-['Inter'] text-xs font-normal leading-4 text-[#969696]";

const PENDING_MILESTONE_STORAGE_PREFIX = "collabglam.pendingMilestone.";

const getSerializableMilestonePayload = (payload: Record<string, any>) => {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
};

const getWalletShortfallFromError = (err: any) => {
  const data =
    err?.response?.data?.data ||
    err?.response?.data ||
    err?.data?.data ||
    err?.data ||
    err ||
    {};

  const needToAdd = Number(data?.needToAdd || 0);

  if (!Number.isFinite(needToAdd) || needToAdd <= 0) {
    return null;
  }

  return {
    needToAdd,
    message:
      data?.message ||
      err?.response?.data?.message ||
      err?.message ||
      "Brand wallet needs additional funds.",
    walletBalance: Number(data?.walletBalance || 0),
    escrowBalance: Number(data?.escrowBalance || data?.frozenBalance || 0),
    frozenBalance: Number(data?.frozenBalance || data?.escrowBalance || 0),
    usableBalance: Number(data?.usableBalance || data?.walletBalance || 0),
  };
};

const buildMilestoneTopupRedirectUrls = ({
  campaignId,
  campaignName,
  pendingKey,
}: {
  campaignId: string;
  campaignName?: string;
  pendingKey: string;
}) => {
  if (typeof window === "undefined") {
    return {
      successUrl: "",
      cancelUrl: "",
    };
  }

  const baseUrl = new URL(window.location.href);

  baseUrl.searchParams.delete("stripe_success");
  baseUrl.searchParams.delete("stripe_cancel");
  baseUrl.searchParams.delete("session_id");
  baseUrl.searchParams.delete("topup");
  baseUrl.searchParams.delete("auto_milestone");
  baseUrl.searchParams.delete("pending_milestone_key");

  if (campaignId && !baseUrl.searchParams.get("id")) {
    baseUrl.searchParams.set("id", campaignId);
  }

  if (campaignName && !baseUrl.searchParams.get("name")) {
    baseUrl.searchParams.set("name", campaignName);
  }

  const successUrl = new URL(baseUrl.toString());
  successUrl.searchParams.set("topup", "success");
  successUrl.searchParams.set("stripe_success", "1");
  successUrl.searchParams.set("auto_milestone", "1");
  successUrl.searchParams.set("pending_milestone_key", pendingKey);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL(baseUrl.toString());
  cancelUrl.searchParams.set("topup", "cancelled");
  cancelUrl.searchParams.set("stripe_cancel", "1");
  cancelUrl.searchParams.set("auto_milestone", "1");
  cancelUrl.searchParams.set("pending_milestone_key", pendingKey);

  const successUrlString = successUrl
    .toString()
    .replace(
      "session_id=%7BCHECKOUT_SESSION_ID%7D",
      "session_id={CHECKOUT_SESSION_ID}"
    );

  return {
    successUrl: successUrlString,
    cancelUrl: cancelUrl.toString(),
  };
};

const getPlatformIcon = (platform: string) => {
  const normalized = String(platform || "").toLowerCase();

  if (normalized.includes("youtube")) return "/logos_youtube-icon.svg";
  if (normalized.includes("instagram")) return "/skill-icons_instagram.svg";
  if (normalized.includes("tiktok") || normalized.includes("tik tok")) {
    return "/ic_baseline-tiktok.svg";
  }

  return "";
};

const getOptionLabel = (options: Option[], value: string) => {
  return options.find((item) => item.value === value)?.label || value;
};

const normalizeAttachmentForPayload = (item: any) => {
  if (!item) return null;

  if (typeof File !== "undefined" && item instanceof File) {
    return {
      name: item.name,
      type: item.type,
      size: item.size,
      url: "",
      key: "",
    };
  }

  if (typeof item === "string") {
    return {
      name: "",
      url: item,
      type: "",
      size: 0,
      key: "",
    };
  }

  return {
    name: item?.name || item?.fileName || item?.label || "",
    url: item?.url || item?.link || item?.path || "",
    type: item?.type || item?.mimeType || "",
    size: Number(item?.size || 0),
    key: item?.key || "",
  };
};

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
};

const getAdminIdFromBrowser = () => {
  if (typeof window === "undefined") return "";

  const readJsonValue = (key: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");

      return String(
        stored?._id ||
          stored?.adminId ||
          stored?.id ||
          stored?.userId ||
          stored?.user?._id ||
          stored?.user?.id ||
          stored?.user?.userId ||
          stored?.admin?._id ||
          stored?.admin?.adminId ||
          stored?.admin?.id ||
          stored?.admin?.userId ||
          stored?.data?._id ||
          stored?.data?.adminId ||
          stored?.data?.id ||
          stored?.data?.userId ||
          ""
      ).trim();
    } catch {
      return "";
    }
  };

  const adminFromStorage =
    readJsonValue("admin") ||
    readJsonValue("user") ||
    readJsonValue("authUser") ||
    readJsonValue("currentUser");

  if (adminFromStorage) return adminFromStorage;

  const directStorageId = String(
    localStorage.getItem("adminId") ||
      localStorage.getItem("admin_id") ||
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      ""
  ).trim();

  if (directStorageId) return directStorageId;

  return decodeURIComponent(
    getCookieValue("adminId") ||
      getCookieValue("admin_id") ||
      getCookieValue("userId") ||
      getCookieValue("user_id") ||
      ""
  ).trim();
};

function PlatformIcon({ platform }: { platform: string }) {
  const icon = getPlatformIcon(platform);

  return (
    <span className="flex h-[1.6875rem] w-[1.6875rem] shrink-0 items-center justify-center gap-2.5 rounded-[2.5rem] border border-[#E6E6E6] bg-white px-2 py-3">
      {icon ? (
        <img
          src={icon}
          alt={`${platform} icon`}
          className="h-4 w-4 object-contain"
          draggable={false}
        />
      ) : (
        <span className="font-['Inter'] text-[0.625rem] font-semibold text-[#1A1A1A]">
          {platform ? platform.slice(0, 1).toUpperCase() : "?"}
        </span>
      )}
    </span>
  );
}

function DropdownShell({
  label,
  required,
  valueText,
  children,
  open,
  onToggle,
  onClose,
  variant = "default",
}: {
  label: string;
  required?: boolean;
  valueText: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  variant?: "default" | "grace";
}) {
  const isGrace = variant === "grace";
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuWidth = isGrace ? 288 : Math.max(rect.width, 288);

      const left = isGrace
        ? Math.max(12, rect.right - menuWidth)
        : Math.min(rect.left, window.innerWidth - menuWidth - 12);

      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left,
        width: menuWidth,
        zIndex: 9999,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isGrace]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;

      onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [open, onClose]);

  return (
    <div
      className={[
        "relative flex flex-col items-start gap-1",
        isGrace ? "h-[4.2rem] w-full shrink-0" : "h-[3.875rem] flex-1",
      ].join(" ")}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={[
          "flex h-full w-full bg-white text-left",
          isGrace
            ? "items-center justify-between rounded-[0.75rem] border border-[#1A1A1A] px-[1.125rem] py-5"
            : "flex-col items-start justify-between rounded-[0.75rem] border border-[#D6D6D6] bg-white px-2.5 py-2.5",
        ].join(" ")}
      >
        {isGrace ? (
          <>
            <span className="flex items-center gap-2 font-['Inter'] text-base font-medium leading-6 tracking-[0] text-[#1A1A1A]">
              {valueText || label}
              <AlertCircle className="h-4 w-4 text-[#969696]" />
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#1A1A1A]" />
          </>
        ) : (
          <>
            <span className={labelClass}>
              {label}
              {required ? <span className="text-[#E35141]"> *</span> : null}
            </span>

            <span className="flex w-full items-center gap-0.5">
              <span className="line-clamp-1 flex-1 font-['Inter'] text-sm font-normal leading-5 text-[#1A1A1A]">
                {valueText || label}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#969696]" />
            </span>
          </>
        )}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="overflow-hidden rounded-[0.75rem] border border-[#E6E6E6] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MultiSelectDropdown({
  label,
  required,
  options,
  value,
  onChange,
  searchable = true,
  withIcons = false,
  placeholder = "Search...",
}: {
  label: string;
  required?: boolean;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  withIcons?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedText = value.length
    ? value.map((item) => getOptionLabel(options, item)).join(", ")
    : label;

  const filteredOptions = options.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const toggleValue = (nextValue: string) => {
    onChange(
      value.includes(nextValue)
        ? value.filter((item) => item !== nextValue)
        : [...value, nextValue]
    );
  };

  return (
    <DropdownShell
      label={label}
      required={required}
      valueText={selectedText}
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      {searchable ? (
        <div className="flex h-14 items-center gap-2 self-stretch border-b border-[#F0F0F0] px-2 py-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent font-['Inter'] text-sm font-normal leading-5 text-[#1A1A1A] outline-none placeholder:text-[#B8B8B8]"
          />
        </div>
      ) : null}

      <div className="max-h-[16rem] overflow-y-auto p-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((item) => {
            const checked = value.includes(item.value);

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleValue(item.value)}
                className="flex h-[3.125rem] w-full items-center gap-3 self-stretch rounded-lg bg-white px-4 py-5 text-left transition hover:bg-[#EDEDED]"
              >
                <span className="flex aspect-square w-4 shrink-0 items-center gap-2.5 self-stretch p-1">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleValue(item.value)}
                    className="h-4 w-4"
                  />
                </span>

                {withIcons ? <PlatformIcon platform={item.value} /> : null}

                <span className="font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A]">
                  {item.label}
                </span>
              </button>
            );
          })
        ) : (
          <div className="px-4 py-4 font-['Inter'] text-sm text-[#969696]">
            No results found.
          </div>
        )}
      </div>
    </DropdownShell>
  );
}

function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  withIcons = false,
  variant = "default",
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  withIcons?: boolean;
  variant?: "default" | "grace";
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((item) => item.value === value);

  return (
    <DropdownShell
      label={label}
      valueText={selected?.label || label}
      open={open}
      variant={variant}
      onToggle={() => setOpen((prev) => !prev)}
      onClose={() => setOpen(false)}
    >
      <div
        className={[
          "p-1",
          options.length > 6
            ? "max-h-[16rem] overflow-y-auto"
            : "overflow-visible",
        ].join(" ")}
      >
        {options.map((item) => (
          <button
            key={item.value || item.label}
            type="button"
            onClick={() => {
              onChange(item.value);
              setOpen(false);
            }}
            className="flex h-[3.125rem] w-full items-center gap-3 rounded-lg bg-white px-4 py-5 text-left transition hover:bg-[#EDEDED]"
          >
            {withIcons ? <PlatformIcon platform={item.value} /> : null}

            <span className="font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </DropdownShell>
  );
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex h-[3.875rem] w-20 shrink-0 items-center justify-center rounded-[0.75rem] border border-[#D6D6D6] bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-full w-6 items-center justify-center text-[#1A1A1A]"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="flex-1 text-center font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A]">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-full w-6 items-center justify-center text-[#1A1A1A]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AddMilestoneCard({
  open,
  onClose,
  brandId,
  campaignId,
  campaignName = "",
  influencerId,
  influencerName,
  contractId,
  onSubmit,
  influencerBudget = 0,
  usedMilestoneBudget = 0,
  mode = "create",
  milestoneId = "",
  milestoneHistoryId = "",
  milestoneData = null,
  source = "brand",
  adminId = "",
}: AddMilestoneCardProps) {
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneBudget, setMilestoneBudget] = useState("");
  const [milestoneBudgetError, setMilestoneBudgetError] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const explicitAdminMode = source === "admin";

  const [deliverableName, setDeliverableName] = useState("");
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [graceDays, setGraceDays] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [needDraftFirst, setNeedDraftFirst] = useState(false);
  const [draftDate, setDraftDate] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const autoMilestoneRestoreRunningRef = useRef(false);


  const isEditMode = mode === "edit";

  const rawMilestoneData = milestoneData?.raw || milestoneData || {};

  const isAccepted = Number(rawMilestoneData?.isAccepted ?? 0) === 1;

  const payoutStatus = String(rawMilestoneData?.payoutStatus || "")
    .trim()
    .toLowerCase();

  const isPayoutInitiated = payoutStatus === "initiated";

  const isFormLocked = isEditMode && (isAccepted || isPayoutInitiated);

  const resolvedAdminId = useMemo(() => {
    const propAdminId = String(adminId || "").trim();

    if (propAdminId) return propAdminId;

    if (!open) return "";

    return getAdminIdFromBrowser();
  }, [adminId, open]);

  const isAdminMode =
    explicitAdminMode || (!contractId && Boolean(resolvedAdminId) && !isEditMode);

  const startMilestoneShortfallTopup = async ({
    needToAdd,
    milestonePayload,
  }: {
    needToAdd: number;
    milestonePayload: Record<string, any>;
  }) => {
    if (typeof window === "undefined") return;

    const pendingKey = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    sessionStorage.setItem(
      `${PENDING_MILESTONE_STORAGE_PREFIX}${pendingKey}`,
      JSON.stringify({
        payload: getSerializableMilestonePayload(milestonePayload),
        createdAt: new Date().toISOString(),
      })
    );

    const { successUrl, cancelUrl } = buildMilestoneTopupRedirectUrls({
      campaignId: String(milestonePayload.campaignId || campaignId || ""),
      campaignName,
      pendingKey,
    });

    const res: any = await apiBrandWalletTopup({
      brandId: milestonePayload.brandId,
      amount: needToAdd,
      currency: "usd",
      successUrl,
      cancelUrl,
    } as any);

    const checkoutUrl =
      res?.data?.checkoutUrl ??
      res?.checkoutUrl ??
      res?.data?.data?.checkoutUrl ??
      res?.url ??
      res?.data?.url;

    if (!checkoutUrl) {
      sessionStorage.removeItem(`${PENDING_MILESTONE_STORAGE_PREFIX}${pendingKey}`);
      throw new Error("Stripe checkout URL not received");
    }

    toast({
      icon: "warning",
      title: "Brand wallet needs funds",
      text: `Please add $${Number(needToAdd).toFixed(
        2
      )}. The milestone amount will move to escrow automatically after payment.`,
    });

    window.location.href = checkoutUrl;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoMilestoneRestoreRunningRef.current) return;

    const url = new URL(window.location.href);
    const shouldAutoCreate = url.searchParams.get("auto_milestone") === "1";
    const topupStatus = url.searchParams.get("topup");
    const sessionId = url.searchParams.get("session_id") || "";
    const pendingKey = url.searchParams.get("pending_milestone_key") || "";

    if (!shouldAutoCreate || topupStatus !== "success" || !sessionId || !pendingKey) {
      return;
    }

    if (sessionId === "{CHECKOUT_SESSION_ID}") {
      toast({
        icon: "error",
        title: "Stripe session missing",
        text: "Stripe returned the placeholder session id. Please keep {CHECKOUT_SESSION_ID} unencoded in the successUrl and try again.",
      });

      url.searchParams.delete("topup");
      url.searchParams.delete("stripe_success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    const storageKey = `${PENDING_MILESTONE_STORAGE_PREFIX}${pendingKey}`;
    const stored = sessionStorage.getItem(storageKey);

    if (!stored) {
      toast({
        icon: "error",
        title: "Milestone not created",
        text: "Top-up completed, but saved milestone details were not found. Please create the milestone again.",
      });
      return;
    }

    autoMilestoneRestoreRunningRef.current = true;

    const run = async () => {
      try {
        const parsed = JSON.parse(stored);
        const pendingPayload = parsed?.payload;

        if (!pendingPayload?.brandId) {
          throw new Error("Saved milestone payload is invalid");
        }

        await apiConfirmBrandWalletTopup({
          brandId: pendingPayload.brandId,
          sessionId,
        });

        await apiCreateMilestone(pendingPayload as any);

        sessionStorage.removeItem(storageKey);

        url.searchParams.delete("topup");
        url.searchParams.delete("stripe_success");
        url.searchParams.delete("stripe_cancel");
        url.searchParams.delete("session_id");
        url.searchParams.delete("auto_milestone");
        url.searchParams.delete("pending_milestone_key");
        window.history.replaceState({}, "", url.toString());

        toast({
          icon: "success",
          title: "Milestone created",
          text: "Funds were added, the milestone was created, and the amount was moved to escrow.",
        });

        await onSubmit?.();
        onClose();
      } catch (err: any) {
        toast({
          icon: "error",
          title: "Milestone not created",
          text: getApiErrorMessage(
            err,
            "Funds were added, but automatic milestone creation failed. Please try creating the milestone again."
          ),
        });
      } finally {
        autoMilestoneRestoreRunningRef.current = false;
      }
    };

    run();
  }, [onClose, onSubmit]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setMilestoneName("");
      setMilestoneDescription("");
      setMilestoneBudget("");
      setAttachments([]);
      setExistingAttachments([]);
      setDeliverableName("");
      setMilestoneBudgetError("");
      setSelectedDeliveries([]);
      setSelectedAspectRatio("");
      setSelectedPlatforms([]);
      setQuantity(1);
      setDeliverables([]);
      setStartDate("");
      setEndDate("");
      setGraceDays("");
      setSubmissionLink("");
      setNeedDraftFirst(false);
      setDraftDate("");
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEditMode || !milestoneData) return;

    const raw = milestoneData?.raw || milestoneData;

    setMilestoneName(raw?.milestoneTitle || milestoneData?.name || "");
    setMilestoneDescription(
      raw?.milestoneDescription || milestoneData?.format || ""
    );

    setMilestoneBudget(
      String(raw?.milestoneBudget || raw?.amount || milestoneData?.qty || "")
    );

    setAttachments([]);
    setExistingAttachments(Array.isArray(raw?.attachments) ? raw.attachments : []);

    const mappedDeliverables = Array.isArray(raw?.deliverables)
      ? raw.deliverables.map((item: any) => ({
          id: String(item?._id || item?.deliverableId || Date.now()),
          name: item?.deliverableName || item?.name || "",
          deliveries: Array.isArray(item?.deliveries) ? item.deliveries : [],
          aspectRatio: item?.aspectRatio || "",
          platforms: Array.isArray(item?.platforms) ? item.platforms : [],
          quantity: Number(item?.quantity || 1),
        }))
      : [];

    setDeliverables(mappedDeliverables);

    setStartDate(raw?.startDate ? String(raw.startDate).slice(0, 10) : "");
    setEndDate(raw?.endDate ? String(raw.endDate).slice(0, 10) : "");
    setGraceDays(raw?.graceDays ? String(raw.graceDays) : "");
    setSubmissionLink(raw?.submissionLink || "");
    setNeedDraftFirst(Boolean(raw?.needDraftFirst));
    setDraftDate(raw?.draftDate ? String(raw.draftDate).slice(0, 10) : "");
  }, [open, isEditMode, milestoneData]);

  const modalSubtitle = useMemo(() => {
    const parts = [];

    if (campaignName) parts.push(campaignName);
    if (influencerName) parts.push(`for ${influencerName}`);

    return parts.join(" • ");
  }, [campaignName, influencerName]);

  const safeInfluencerBudget = Number(influencerBudget || 0);
  const safeUsedMilestoneBudget = Number(usedMilestoneBudget || 0);

  const remainingInfluencerBudget =
    safeInfluencerBudget > 0
      ? Math.max(0, safeInfluencerBudget - safeUsedMilestoneBudget)
      : 0;

  const milestoneBudgetNum = Number(milestoneBudget || 0);

  const isMilestoneBudgetOverLimit =
    safeInfluencerBudget > 0 &&
    milestoneBudgetNum > remainingInfluencerBudget;

  const isMilestoneBudgetInvalid =
    Boolean(milestoneBudgetError) || isMilestoneBudgetOverLimit;

  const formatBudget = (value: number) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const showMilestoneBudgetLimitToast = () => {
    toast({
      icon: "warning",
      title: "Milestone budget cannot be greater than influencer budget",
      text: `Influencer budget: $${formatBudget(
        safeInfluencerBudget
      )}. Already used: $${formatBudget(
        safeUsedMilestoneBudget
      )}. Remaining budget: $${formatBudget(remainingInfluencerBudget)}.`,
    });
  };

  const handleMilestoneBudgetChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = e.target.value;

    setMilestoneBudget(nextValue);
    setMilestoneBudgetError("");

    const nextNumber = Number(nextValue || 0);

    if (
      !isAdminMode &&
      safeInfluencerBudget > 0 &&
      nextValue &&
      Number.isFinite(nextNumber) &&
      nextNumber > remainingInfluencerBudget
    ) {
      setMilestoneBudgetError(
        `Remaining influencer budget is $${formatBudget(
          remainingInfluencerBudget
        )}.`
      );
    }
  };

  const handleMilestoneBudgetBlur = () => {
    const nextNumber = Number(milestoneBudget || 0);

    if (
      !isAdminMode &&
      safeInfluencerBudget > 0 &&
      milestoneBudget &&
      Number.isFinite(nextNumber) &&
      nextNumber > remainingInfluencerBudget
    ) {
      setMilestoneBudgetError(
        `Remaining influencer budget is $${formatBudget(
          remainingInfluencerBudget
        )}.`
      );

      showMilestoneBudgetLimitToast();
    }
  };

  const handleAddDeliverable = () => {
    if (!deliverableName.trim()) {
      toast({
        icon: "warning",
        title: "Deliverable name required",
        text: "Please enter a deliverable name before adding it.",
      });
      return;
    }

    if (selectedDeliveries.length === 0) {
      toast({
        icon: "warning",
        title: "Delivery type required",
        text: "Please select at least one delivery type.",
      });
      return;
    }

    if (!selectedAspectRatio) {
      toast({
        icon: "warning",
        title: "Aspect ratio required",
        text: "Please select an aspect ratio.",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        icon: "warning",
        title: "Platform required",
        text: "Please select at least one platform.",
      });
      return;
    }

    setDeliverables((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: deliverableName.trim(),
        deliveries: selectedDeliveries,
        aspectRatio: selectedAspectRatio,
        platforms: selectedPlatforms,
        quantity,
      },
    ]);

    setDeliverableName("");
    setSelectedDeliveries([]);
    setSelectedAspectRatio("");
    setSelectedPlatforms([]);
    setQuantity(1);
  };

  const handleRemoveDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((item) => item.id !== id));
  };

  const validateForm = () => {
    if (isFormLocked) {
      toast({
        icon: "warning",
        title: "Milestone locked",
        text: "This milestone cannot be edited because payout is initiated or influencer has accepted it.",
      });
      return false;
    }

    if (!brandId) {
      toast({
        icon: "warning",
        title: "Brand ID missing",
        text: "Brand ID is required to create a milestone.",
      });
      return false;
    }

    if (!campaignId) {
      toast({
        icon: "warning",
        title: "Campaign ID missing",
        text: "Campaign ID is required to create a milestone.",
      });
      return false;
    }

    if (!influencerId) {
      toast({
        icon: "warning",
        title: "Influencer ID missing",
        text: "Influencer ID is required to create a milestone.",
      });
      return false;
    }

    if (!isAdminMode && !contractId) {
      toast({
        icon: "warning",
        title: "Contract ID missing",
        text: "Contract ID is required to create a milestone.",
      });
      return false;
    }

    if (isAdminMode && !resolvedAdminId) {
      toast({
        icon: "warning",
        title: "Admin ID missing",
        text: "Admin ID is required to create a milestone.",
      });
      return false;
    }

    if (!milestoneName.trim()) {
      toast({
        icon: "warning",
        title: "Milestone name required",
        text: "Please enter a milestone name.",
      });
      return false;
    }

    const milestoneBudgetNum = Number(milestoneBudget);

    if (
      !milestoneBudget ||
      Number.isNaN(milestoneBudgetNum) ||
      milestoneBudgetNum <= 0
    ) {
      setMilestoneBudgetError("Please enter a valid milestone budget greater than 0.");

      toast({
        icon: "warning",
        title: "Milestone budget required",
        text: "Please enter a valid milestone budget greater than 0.",
      });

      return false;
    }

    if (
      !isAdminMode &&
      safeInfluencerBudget > 0 &&
      milestoneBudgetNum > remainingInfluencerBudget
    ) {
      setMilestoneBudgetError(
        `Remaining influencer budget is $${formatBudget(
          remainingInfluencerBudget
        )}.`
      );

      showMilestoneBudgetLimitToast();

      return false;
    }

    if (deliverables.length === 0) {
      toast({
        icon: "warning",
        title: "Add at least one deliverable",
        text: "Please add one deliverable before creating the milestone.",
      });
      return false;
    }

    if (!startDate) {
      toast({
        icon: "warning",
        title: "Start date required",
        text: "Please select a start date.",
      });
      return false;
    }

    if (!endDate) {
      toast({
        icon: "warning",
        title: "End date required",
        text: "Please select an end date.",
      });
      return false;
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      toast({
        icon: "warning",
        title: "Invalid date range",
        text: "End date cannot be before start date.",
      });
      return false;
    }

    if (needDraftFirst && !draftDate) {
      toast({
        icon: "warning",
        title: "Draft date required",
        text: "Please select a draft date or uncheck draft first.",
      });
      return false;
    }

    if (
      needDraftFirst &&
      draftDate &&
      startDate &&
      new Date(draftDate).getTime() < new Date(startDate).getTime()
    ) {
      toast({
        icon: "warning",
        title: "Invalid draft date",
        text: "Draft date cannot be before the start date.",
      });
      return false;
    }

    return true;
  };

  const handleCreateMilestone = async () => {
    let pendingMilestonePayload: Record<string, any> | null = null;

    try {
      if (!validateForm()) return;

      const milestoneBudgetNum = Number(milestoneBudget);

      const payloadAttachments = [
        ...existingAttachments.map(normalizeAttachmentForPayload),
        ...attachments.map(normalizeAttachmentForPayload),
      ].filter(Boolean);

      const payloadDeliverables = deliverables.map((item) => ({
        deliverableName: item.name.trim(),
        deliveries: item.deliveries,
        aspectRatio: item.aspectRatio,
        platforms: item.platforms,
        quantity: Number(item.quantity || 1),
      }));

      setSubmitting(true);

      const commonPayload = {
        milestoneTitle: milestoneName.trim(),
        milestoneBudget: milestoneBudgetNum,
        amount: milestoneBudgetNum,
        milestoneDescription: milestoneDescription.trim(),

        attachments: payloadAttachments,

        deliverables: payloadDeliverables,

        submissionLink: submissionLink.trim(),

        startDate,
        endDate,
        graceDays: graceDays ? Number(graceDays) : 0,

        needDraftFirst,
        draftDate: needDraftFirst ? draftDate : "",
      };

      const milestoneCreatePayload = {
        brandId,
        campaignId: campaignId || "",
        influencerId: influencerId || "",
        contractId: isAdminMode ? "" : contractId || "",
        adminId: isAdminMode ? resolvedAdminId : "",
        source: isAdminMode ? "admin" : "brand",
        createdByRole: isAdminMode ? "admin" : "brand",
        createdByModel: isAdminMode ? "Master" : "Brand",
        ...commonPayload,
      };

      pendingMilestonePayload = milestoneCreatePayload;

      if (isEditMode) {
        await apiEditMilestone({
          milestoneId,
          milestoneHistoryId,
          ...commonPayload,
        });

        toast({
          icon: "success",
          title: "Milestone updated",
          text: "The milestone has been updated successfully.",
        });
      } else {
        await apiCreateMilestone(milestoneCreatePayload as any);

        toast({
          icon: "success",
          title: "Milestone created",
          text: "The milestone has been created successfully.",
        });
      }

      onSubmit?.();
      onClose();
    } catch (err: any) {
      const walletShortfall = !isEditMode ? getWalletShortfallFromError(err) : null;

      if (walletShortfall && pendingMilestonePayload) {
        try {
          await startMilestoneShortfallTopup({
            needToAdd: walletShortfall.needToAdd,
            milestonePayload: pendingMilestonePayload,
          });
          return;
        } catch (topupErr: any) {
          toast({
            icon: "error",
            title: "Stripe checkout not started",
            text: getApiErrorMessage(
              topupErr,
              "Failed to start Stripe checkout for the remaining wallet amount."
            ),
          });
          return;
        }
      }

      const message = getApiErrorMessage(
        err,
        isEditMode ? "Failed to update milestone" : "Failed to create milestone"
      );

      toast({
        icon: "error",
        title: isEditMode ? "Milestone not updated" : "Milestone not created",
        text: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <ToastStyles />

      <div
        className="fixed inset-0 z-50 flex h-screen items-center justify-end overflow-hidden bg-[rgba(1,1,1,0.30)] px-5 py-3"
        onClick={() => {
          if (!submitting) onClose();
        }}
      >
        <div
          className="flex h-[calc(100vh-1.5rem)] w-[64rem] max-w-[calc(100vw-2.5rem)] animate-[slideInRight_220ms_ease-out] flex-col items-start gap-8 overflow-hidden rounded-[1rem] bg-white px-7 py-5 shadow-[0_24px_40px_-4px_rgba(0,0,0,0.16),0_0_12px_0_rgba(0,0,0,0.08)]"
          onClick={(e) => e.stopPropagation()}
        >
          <style jsx global>{`
            @keyframes slideInRight {
              from {
                opacity: 0;
                transform: translateX(32px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>

          <div className="flex w-full shrink-0 items-center justify-between self-stretch border-b border-[#E6E6E6] pb-4">
            <div className="min-w-0">
              <h2 className="font-['Inter'] text-xl font-semibold leading-7 tracking-[0] text-[#1A1A1A]">
                Milestone
              </h2>

              {modalSubtitle ? (
                <p className="mt-0.5 truncate font-['Inter'] text-xs font-normal leading-4 text-[#969696]">
                  {modalSubtitle}
                </p>
              ) : null}
            </div>

            <div className="flex h-8 shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                disabled={submitting}
                className="flex h-8 w-8 items-center justify-center gap-2 rounded-lg text-[#1A1A1A] transition hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 w-full flex-1 overflow-y-auto px-1">
            <div className="flex w-full flex-col items-start gap-4">
              <FloatingInput
                label="Milestone Name"
                required
                value={milestoneName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMilestoneName(e.target.value)
                }
                disabled={isFormLocked}
                className="min-h-[3.875rem] w-full rounded-xl border-[#D6D6D6]"
              />

              <div className="relative w-full">
                <LabeledTextarea
                  label="Description"
                  placeholder="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's"
                  rows={6}
                  maxLength={500}
                  showCharCount
                  value={milestoneDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMilestoneDescription(e.target.value)
                  }
                  className="min-h-[9.5rem] rounded-xl border-[#D6D6D6]"
                />

                <button
                  type="button"
                  className="absolute right-3 top-3 flex items-center gap-1 font-['Inter'] text-[0.6875rem] font-medium leading-4 text-[#1A1A1A]"
                >
                  <Paperclip className="h-3 w-3" />
                  Attachment
                </button>
              </div>

              <div className="w-full">
                <FloatingInput
                  label="Milestone Budget"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={milestoneBudget}
                  onChange={handleMilestoneBudgetChange}
                  onBlur={handleMilestoneBudgetBlur}
                  disabled={isFormLocked}
                  className={[
                    "min-h-[3.875rem] w-full rounded-xl",
                    isMilestoneBudgetInvalid
                      ? "border-[#E35141] focus-within:border-[#E35141]"
                      : "border-[#D6D6D6]",
                  ].join(" ")}
                />

                {safeInfluencerBudget > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-['Inter'] text-xs leading-4">
                    <span className="text-[#969696]">
                      Influencer budget:{" "}
                      <span className="font-medium text-[#1A1A1A]">
                        ${formatBudget(safeInfluencerBudget)}
                      </span>
                    </span>

                    <span className="text-[#969696]">
                      Used:{" "}
                      <span className="font-medium text-[#1A1A1A]">
                        ${formatBudget(safeUsedMilestoneBudget)}
                      </span>
                    </span>

                    <span
                      className={
                        remainingInfluencerBudget <= 0
                          ? "font-medium text-[#E35141]"
                          : "text-[#969696]"
                      }
                    >
                      Remaining:{" "}
                      <span
                        className={
                          remainingInfluencerBudget <= 0
                            ? "font-medium text-[#E35141]"
                            : "font-medium text-[#1A1A1A]"
                        }
                      >
                        ${formatBudget(remainingInfluencerBudget)}
                      </span>
                    </span>
                  </div>
                ) : null}

                {isMilestoneBudgetInvalid ? (
                  <p className="mt-1 font-['Inter'] text-xs font-medium leading-4 text-[#E35141]">
                    Milestone budget cannot be greater than remaining influencer budget.
                    {milestoneBudgetError ? ` ${milestoneBudgetError}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="w-full">
                <div className="mt-3">
                  <ProductImagesUpload
                    files={attachments}
                    onFilesChange={(files) => setAttachments(files)}
                    title="Upload an Image"
                    helperTypes="SVG, PNG, JPG or PDF under (max 5mb)"
                  />
                </div>
              </div>

              <FloatingInput
                label="Deliverable name"
                required
                value={deliverableName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDeliverableName(e.target.value)
                }
                disabled={isFormLocked}
                className="min-h-[3.875rem] w-full rounded-xl border-[#D6D6D6]"
              />

              <div className="flex w-full items-stretch gap-2">
                <MultiSelectDropdown
                  label="Deliveries"
                  required
                  options={DELIVERY_OPTIONS}
                  value={selectedDeliveries}
                  onChange={setSelectedDeliveries}
                />

                <SingleSelectDropdown
                  label="Aspect ratio"
                  options={ASPECT_RATIO_OPTIONS}
                  value={selectedAspectRatio}
                  onChange={setSelectedAspectRatio}
                />

                <MultiSelectDropdown
                  label="Platform"
                  options={PLATFORM_OPTIONS}
                  value={selectedPlatforms}
                  onChange={setSelectedPlatforms}
                  withIcons
                  searchable={false}
                />

                <QuantityStepper value={quantity} onChange={setQuantity} />
              </div>

              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="flex w-28 shrink-0 items-center justify-center gap-1 self-stretch rounded-lg border border-[#E6E6E6] bg-white px-2 py-2 font-['Inter'] text-xs font-medium leading-4 text-[#3A3A3A] transition hover:bg-[#F9F9F9]"
                >
                  Add Deliverable
                </button>
              </div>

              {deliverables.length > 0 ? (
                <div className="flex w-full flex-col gap-2">
                  {deliverables.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex h-11 items-center justify-between self-stretch rounded-lg border border-[#E6E6E6] px-2.5 py-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="w-5 shrink-0 font-['Inter'] text-xs font-medium text-[#1A1A1A]">
                          {index + 1}.
                        </span>

                        <span className="line-clamp-1 min-w-[6rem] flex-1 font-['Inter'] text-xs font-semibold text-[#1A1A1A]">
                          {item.deliveries
                            .map((delivery) =>
                              getOptionLabel(DELIVERY_OPTIONS, delivery)
                            )
                            .join(", ")}
                        </span>

                        <span className="line-clamp-1 min-w-[5rem] flex-1 font-['Inter'] text-xs font-semibold text-[#1A1A1A]">
                          {getOptionLabel(
                            ASPECT_RATIO_OPTIONS,
                            item.aspectRatio
                          )}
                        </span>

                        <span className="flex min-w-[5rem] items-center gap-1">
                          {item.platforms.map((platform) => (
                            <PlatformIcon key={platform} platform={platform} />
                          ))}
                        </span>

                        <span className="w-8 text-center font-['Inter'] text-xs font-semibold text-[#1A1A1A]">
                          {item.quantity}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(item.id)}
                        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#1A1A1A] hover:bg-[#F5F5F5]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex w-full flex-nowrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FloatingDateInput
                    id="milestone-start-date"
                    label="Start Date"
                    required
                    type="date"
                    value={startDate}
                    onValueChange={(value) => setStartDate(value)}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <FloatingDateInput
                    id="milestone-end-date"
                    label="End Date"
                    required
                    type="date"
                    value={endDate}
                    min={startDate}
                    onValueChange={(value) => setEndDate(value)}
                  />
                </div>

                <div className="w-[12.8125rem] shrink-0 pt-2">
                  <SingleSelectDropdown
                    label="Add grace days"
                    options={GRACE_DAY_OPTIONS}
                    value={graceDays}
                    onChange={setGraceDays}
                    variant="grace"
                  />
                </div>
              </div>

              <FloatingInput
                label="Submission link"
                value={submissionLink}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSubmissionLink(e.target.value)
                }
                disabled={isFormLocked}
                className="min-h-[3.875rem] w-full rounded-xl border-[#D6D6D6]"
              />

              <label className="flex items-center gap-2 font-['Inter'] text-xs font-normal leading-4 text-[#B8B8B8]">
                <Checkbox
                  checked={needDraftFirst}
                  onCheckedChange={(checked) =>
                    setNeedDraftFirst(Boolean(checked))
                  }
                  className="h-4 w-4"
                />
                I need a draft first
              </label>

              <FloatingDateInput
                id="milestone-draft-date"
                label={needDraftFirst ? "Add draft date *" : "Add draft date"}
                type="date"
                value={draftDate}
                min={startDate}
                onValueChange={(value) => setDraftDate(value)}
                disabled={isFormLocked}
              />
            </div>
          </div>

          <div className="flex w-full shrink-0 justify-end gap-2 border-t border-[#F0F0F0] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="h-10 rounded-lg px-7 text-sm font-medium text-[#4D4D4D] hover:bg-[#F5F5F5]"
            >
              Discard
            </Button>

            <Button
              type="button"
              onClick={handleCreateMilestone}
              disabled={submitting}
              className="h-10 rounded-lg bg-[#1A1A1A] px-7 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditMode
                ? submitting
                  ? "Updating..."
                  : "Update Milestone"
                : submitting
                  ? "Creating..."
                  : "Create Milestone"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}