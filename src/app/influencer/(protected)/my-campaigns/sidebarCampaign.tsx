"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  apiGetfetchCampaignbyId,
  getApiErrorMessage,
} from "@/app/influencer/services/influencerApi";
import { ArrowUpRight } from "lucide-react";
import {
  CalendarDots,
  CalendarX,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  CheckCircle,
  DownloadSimple,
  FilePdf,
  MoneyWavy,
  PaperPlaneTilt,
  Wallet,
  EnvelopeOpen,
  CloudArrowUp,
  CircleNotch,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/buttonComp";
import Image from "next/image";
import { createPortal } from "react-dom";
import SkeletonLoader, {
  SkeletonCircle,
  SkeletonProvider,
} from "@/components/common/SkeletonLoader";
import api from "@/lib/api";
import InfluencerContractModal from "./InfluencerContractModal";
import useInfluencerSidebarWidth from "./useSidebarWidth";

function asArray<T = any>(v: any): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeMongoId(id: any): string {
  if (id == null) return "";
  if (typeof id === "string" || typeof id === "number") return String(id);

  if (typeof id === "object") {
    if (typeof (id as any).toHexString === "function") {
      return (id as any).toHexString();
    }

    if (typeof (id as any).$oid === "string") return (id as any).$oid;
    if (typeof (id as any).oid === "string") return (id as any).oid;

    if (
      typeof (id as any).id === "string" ||
      typeof (id as any).id === "number"
    ) {
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

function isMongoIdString(value: string) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function removeMongoIdValues(values: string[]) {
  return values.filter((value) => value && !isMongoIdString(value));
}

function pad2(n: number) {
  const x = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return String(x).padStart(2, "0");
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
    if (value == null) continue;

    const text = String(value).trim();
    if (text) return value;
  }

  return "";
}

function pickString(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function getThreadIdFromResponse(response: any) {
  return pickString(
    response?.data?.data?.threadId,
    response?.data?.data?._id,
    response?.data?.data?.id,
    response?.data?.threadId,
    response?.data?._id,
    response?.data?.id,
    response?.threadId,
    response?._id,
    response?.id
  );
}

function toNumber(value: any) {
  if (typeof value === "number") return value;

  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function formatNumber(value: any, fallback = "—") {
  if (value == null || value === "") return fallback;

  const n = toNumber(value);

  if (Number.isFinite(n)) return n.toLocaleString("en-IN");

  const text = String(value).trim();
  return text || fallback;
}

function getValidDate(value: any) {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return date;
}

function firstValidDate(...values: any[]) {
  for (const value of values) {
    const date = getValidDate(value);
    if (date) return date;
  }

  return null;
}

function formatDate(value: any) {
  const date = getValidDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function formatTimelineDateTime(value: any) {
  const date = getValidDate(value);
  if (!date) return "Pending";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimelineShortDate(value: any) {
  const date = getValidDate(value);
  if (!date) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function toTagValues(input: any): string[] {
  const values = asArray(input)
    .flatMap((item: any) => {
      if (item == null) return [];

      if (typeof item === "string" || typeof item === "number") {
        return String(item)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }

      if (typeof item === "object") {
        const value =
          item?.label ??
          item?.name ??
          item?.title ??
          item?.value ??
          item?.tag ??
          item?.format ??
          item?.range ??
          item?.categoryName ??
          item?.subcategoryName ??
          item?.subCategoryName ??
          item?.goal ??
          item?.goalName ??
          item?.type ??
          item?.campaignType;

        return typeof value === "string" && value.trim()
          ? [value.trim()]
          : [];
      }

      return [];
    })
    .filter(Boolean);

  return Array.from(new Set(values));
}

function getYoutubeId(url: string) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || "";
    }

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

function getInitials(name?: string) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "CG";

  const first = words[0]?.[0] || "";
  const second = words[1]?.[0] || "";

  return `${first}${second}`.toUpperCase();
}

const statuses = [
  { label: "Active", dot: "bg-[#28A745]", ring: "bg-[#BCE4C5]" },
  { label: "Paused", dot: "bg-[#DC3545]", ring: "bg-[#F5C6CB]" },
  { label: "Draft", dot: "bg-[#9E9E9E]", ring: "bg-[#E0E0E0]" },
  { label: "Completed", dot: "bg-[#F07B3F]", ring: "bg-[#FAD6C0]" },
];

function StatusDot({ dot, ring }: { dot: string; ring: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full p-[0.125rem] ${ring}`}
    >
      <span className={`h-[0.5rem] w-[0.5rem] rounded-full ${dot}`} />
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const current =
    statuses.find(
      (s) => s.label.toLowerCase() === String(status).toLowerCase()
    ) ?? null;

  return (
    <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E6E6E6] bg-white px-2">
      {current ? <StatusDot dot={current.dot} ring={current.ring} /> : null}

      <span className="capitalize text-sm font-medium text-[#1A1A1A]">
        {status || "draft"}
      </span>
    </div>
  );
}

function SidebarShell({
  children,
  footer,
  embedded = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-t-[1rem] rounded-b-none border border-[#E6E6E6] bg-white">
        <div
          className="min-h-0 flex-1 overflow-y-auto px-[1.25rem] pb-[5rem] pt-[1.25rem] [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-[0.375rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[4.8125rem] [&::-webkit-scrollbar-thumb]:rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6]"
          style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
        >
          <div className="flex w-full flex-col items-start gap-[1.75rem]">
            {children}
          </div>
        </div>

        {footer ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#E6E6E6] bg-white px-[1.25rem] py-[0.75rem]">
            {footer}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full justify-end bg-black/20">
      <aside
        className="relative flex h-screen w-full max-w-[45.75rem] flex-col overflow-hidden rounded-t-[1rem] rounded-b-none border-x border-t border-[#E6E6E6] bg-white"
        style={{ fontFamily: "var(--Font-Family-Inter, Inter)" }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-[1.25rem] pb-[7rem] pt-[1.25rem] [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-[0.375rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[4.8125rem] [&::-webkit-scrollbar-thumb]:rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6]">
          <div className="flex w-full flex-col items-start gap-[1.75rem]">
            {children}
          </div>
        </div>

        {footer ? (
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#E6E6E6] bg-white px-[1.25rem] py-[0.75rem]">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function TagCard({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="flex min-h-[7.5rem] min-w-0 flex-col items-start gap-[1rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
      <div className="self-stretch text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
        {title}
      </div>

      <div className="flex min-w-0 flex-wrap items-start gap-2 self-stretch">
        {values.length ? (
          values.map((value, idx) => (
            <span
              key={`${title}-${value}-${idx}`}
              className="flex min-h-7 max-w-full items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3 py-1"
            >
              <span className="break-words text-[0.75rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
                {value}
              </span>
            </span>
          ))
        ) : (
          <span className="text-[0.875rem] leading-[1.25rem] text-[#969696]">
            —
          </span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-1">
      <h2 className="text-[1.25rem] font-semibold leading-[1.75rem] text-[#1A1A1A]">
        {title}
      </h2>

      {subtitle ? (
        <p className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function InfoMetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[9rem] min-w-0 flex-col items-start rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[0.5rem] bg-[#F2F2F2] p-3">
        {icon}
      </div>

      <div className="mt-auto flex flex-col items-start gap-2 self-stretch">
        <div className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
          {label}
        </div>

        <div className="max-w-full break-words text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A]">
          {value}
        </div>
      </div>
    </div>
  );
}

function RequirementItem({
  label,
  value,
  values,
  helper,
}: {
  label: string;
  value?: string;
  values?: string[];
  helper?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-3 px-2 py-1">
      <div className="text-[1rem] font-medium leading-[1.5rem] text-[#B8B8B8]">
        {label}
      </div>

      {values?.length ? (
        <div className="flex flex-wrap items-center gap-3">
          {values.map((item, index) => (
            <span
              key={`${label}-${item}-${index}`}
              className="text-[1rem] font-semibold leading-[1.5rem] text-[#1A1A1A]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[1rem] font-semibold leading-[1.5rem] text-[#1A1A1A]">
          {value || "—"}

          {helper ? (
            <span className="ml-2 text-[0.875rem] font-normal leading-[1.25rem] text-[#B8B8B8]">
              {helper}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CreatorRequirementCard({
  numberOfInfluencers,
  influencerTier,
  contentLanguages,
  contentFormats,
  minFollowers,
  maxFollowers,
}: {
  numberOfInfluencers: string;
  influencerTier: string;
  contentLanguages: string;
  contentFormats: string[];
  minFollowers: string;
  maxFollowers: string;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[1.5rem] self-stretch">
      <SectionTitle title="Creator Requirement" />

      <div className="flex w-full flex-col items-center justify-center gap-[1.25rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-4">
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          <RequirementItem
            label="Number of influencers"
            value={numberOfInfluencers}
          />
          <RequirementItem label="Influencer Tier" value={influencerTier} />
          <RequirementItem
            label="Content Language"
            value={contentLanguages}
          />
        </div>

        <div className="h-px w-full bg-[#E6E6E6]" />

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          <RequirementItem label="Content Format" values={contentFormats} />
          <RequirementItem
            label="Min Followers"
            value={minFollowers}
            helper="(min)"
          />
          <RequirementItem
            label="Max Followers"
            value={maxFollowers}
            helper="(max)"
          />
        </div>
      </div>
    </div>
  );
}

function ApplicationTimeline({
  items,
}: {
  items: { title: string; subtitle: string; done: boolean }[];
}) {
  return (
    <section className="flex w-full flex-col items-start gap-[1rem] self-stretch border-b border-[#E6E6E6] pb-[1.25rem]">
      <h2 className="text-[1.25rem] font-semibold leading-[1.75rem] text-[#1A1A1A]">
        Application Timeline
      </h2>

      <div className="flex w-full flex-col items-start">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div
              key={`${item.title}-${index}`}
              className="flex w-full items-start gap-[0.75rem]"
            >
              <div className="flex shrink-0 flex-col items-center">
                <div className="flex h-[1.5rem] w-[1.5rem] items-center justify-center">
                  {item.done ? (
                    <CheckCircle
                      weight="fill"
                      className="h-[1.5rem] w-[1.5rem] text-[#28A745]"
                    />
                  ) : (
                    <CheckCircle
                      weight="regular"
                      className="h-[1.5rem] w-[1.5rem] text-[#969696]"
                    />
                  )}
                </div>

                {!isLast ? (
                  <div className="my-[0.25rem] h-[1.75rem] w-px bg-[var(--Light-Border-Subtle,#E6E6E6)]" />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col items-start pb-[1rem]">
                <div className="text-left text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                  {item.title}
                </div>

                <div className="text-left text-[0.75rem] font-normal leading-[1rem] text-[#B8B8B8]">
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StartConversationCard({
  onMailToBrand,
  isOpeningThread = false,
}: {
  onMailToBrand: () => void | Promise<void>;
  isOpeningThread?: boolean;
}) {
  return (
    <section
      className="flex min-h-[5.5rem] w-full flex-shrink-0 items-center gap-[0.75rem] overflow-hidden rounded-[0.75rem] p-[1rem]"
      style={{
        background:
          "linear-gradient(100deg, #D96FD2 0%, #F4584F 32%, #FFC726 65%, #FFF4CA 85%, #FFFFFF 100%)",
      }}
    >
      <div className="flex h-[3rem] w-[3rem] flex-shrink-0 items-center justify-center rounded-[0.5rem] border border-[#E6E6E6] bg-white p-[0.75rem]">
        <ChalkboardTeacher weight="bold" className="h-6 w-6 text-[#1A1A1A]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.125rem]">
        <div className="text-[1.25rem] font-semibold leading-[1.75rem] text-white">
          Start the conversation 👋
        </div>

        <div className="text-[0.875rem] font-normal leading-[1.25rem] text-white">
          Introduce yourself, ask campaign-related questions, or share why you'd be a great fit for this collaboration.
        </div>
      </div>

      <Button
        type="button"
        variant="raised"
        size="sm"
        onClick={onMailToBrand}
        disabled={isOpeningThread}
        className="my-0 h-[2.75rem] flex-shrink-0 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-[1rem] shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        leftIcon={
          <PaperPlaneTilt weight="bold" className="h-5 w-5 text-[#1A1A1A]" />
        }
      >
        <span className="text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A]">
          {isOpeningThread ? "Opening..." : "Mail to Brand"}
        </span>
      </Button>
    </section>
  );
}

function CampaignHeader({
  logoUrl,
  title,
  productUrl,
  ratingText,
  statusText,
  onConnectBrand,
  isOpeningThread = false,
}: {
  logoUrl: string;
  title: string;
  productUrl: string;
  ratingText: string;
  statusText: string;
  onConnectBrand: () => void | Promise<void>;
  isOpeningThread?: boolean;
}) {
  const headerInitials = getInitials(title);

  return (
    <section className="flex w-full flex-col items-start gap-5 self-stretch border-[#E6E6E6] pb-5">
      <div className="flex w-full items-center gap-4">
        <div className="flex h-[6.25rem] w-[6.25rem] flex-shrink-0 items-center justify-center overflow-hidden rounded-[4rem] border border-white/30 bg-[#F9F9F9] text-[1.5rem] font-semibold text-[#1A1A1A]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={title || "Brand logo"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            headerInitials
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div
            className="line-clamp-2 w-full text-[1.5rem] font-bold leading-8 tracking-normal text-[#1A1A1A]"
            title={title}
          >
            {title}
          </div>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            {ratingText ? (
              <span className="text-[0.75rem] font-normal leading-4 text-[#1A1A1A]">
                ⭐ {ratingText}
              </span>
            ) : null}

            {productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-1 text-[0.75rem] font-normal leading-4 text-[#B8B8B8]"
                title={productUrl}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="max-w-[16rem] truncate">{productUrl}</span>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-[0.75rem] font-normal leading-4 text-[#B8B8B8]">
                —
              </span>
            )}
          </div>
        </div>

        <div className="hidden flex-shrink-0 flex-col items-end gap-2 sm:flex">
          <Button
            type="button"
            variant="raised"
            size="sm"
            onClick={onConnectBrand}
            disabled={isOpeningThread}
            className="my-0 h-10 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            leftIcon={
              <EnvelopeOpen
                weight="bold"
                className="h-4 w-4 text-[#1A1A1A]"
              />
            }
          >
            <span className="text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
              {isOpeningThread ? "Opening..." : "Connect With Brand"}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2 sm:hidden">
        <Button
          type="button"
          variant="raised"
          size="sm"
          onClick={onConnectBrand}
          disabled={isOpeningThread}
          className="my-0 h-10 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          leftIcon={
            <ChalkboardTeacher
              weight="bold"
              className="h-4 w-4 text-[#1A1A1A]"
            />
          }
        >
          <span className="text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
            {isOpeningThread ? "Opening..." : "Connect With Brand"}
          </span>
        </Button>

        {statusText ? <CampaignStatusBadge status={statusText} /> : null}
      </div>
    </section>
  );
}

const OWN_CONTRACT_MAX_BYTES = 10 * 1024 * 1024;

function formatContractFileSize(size?: number | string) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function CreatorOwnContractReuploadDialog({
  open,
  originalFileName,
  originalFileSize,
  file,
  accepted,
  error,
  isSubmitting,
  isDownloading,
  onClose,
  onDownloadOriginal,
  onFileSelected,
  onClearFile,
  onAcceptedChange,
  onSubmit,
}: {
  open: boolean;
  originalFileName: string;
  originalFileSize?: string;
  file: File | null;
  accepted: boolean;
  error?: string;
  isSubmitting?: boolean;
  isDownloading?: boolean;
  onClose: () => void;
  onDownloadOriginal: () => void;
  onFileSelected: (file: File | null) => void;
  onClearFile: () => void;
  onAcceptedChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setIsDragging(false);
      setShowTerms(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const dialogDate = useMemo(() => {
    if (!open) return "";

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

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) {
      onFileSelected(null);
      return;
    }

    onFileSelected(nextFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (isSubmitting) return;
    handleFile(event.dataTransfer.files?.[0] || null);
  };

  const hasReadyFile = Boolean(file);
  const canSend = Boolean(file && accepted && !isSubmitting);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Upload signed contract"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[52rem] flex-col overflow-hidden bg-white"
        style={{
          borderRadius: "1rem",
          boxShadow:
            "0 24px 40px -4px rgba(0,0,0,0.10), 0 0 12px rgba(0,0,0,0.08)",
          fontFamily: "var(--Font-Family-Inter, Inter)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-8 pt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[1.25rem] font-semibold leading-[1.75rem] text-[#1A1A1A]">
                Upload Contract
              </h2>
              <p className="mt-1 text-[0.875rem] leading-[1.25rem] text-[#969696]">
                Download the brand contract, fill/sign it, then upload the updated PDF.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[1rem] font-medium leading-[1.5rem] text-[#B8B8B8]">
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
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-5 pt-6">
            <div className="mb-5 flex w-full items-center justify-between gap-4 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <FilePdf weight="fill" className="h-9 w-9 shrink-0 text-[#E35141]" />

                <div className="min-w-0">
                  <div className="truncate text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A]">
                    {originalFileName || "Contract.pdf"}
                  </div>
                  <div className="text-[0.875rem] leading-[1.25rem] text-[#969696]">
                    {originalFileSize || "Brand uploaded contract"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isDownloading || isSubmitting}
                onClick={onDownloadOriginal}
                className="flex h-10 items-center justify-center gap-2 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-4 text-[0.875rem] font-semibold text-[#1A1A1A] shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadSimple weight="bold" className="h-4 w-4" />
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </div>

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
                  handleFile(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6E6E6]">
                <CloudArrowUp size={16} weight="bold" color="#969696" />
              </div>

              {file ? (
                <>
                  <div className="mt-3 max-w-[21rem] truncate text-[0.875rem] font-semibold leading-5 text-[#1A1A1A]">
                    {file.name}
                  </div>
                  <div className="mt-1 text-[0.75rem] leading-4 text-[#969696]">
                    {formatContractFileSize(file.size)}
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
                    Signed/filled PDF under {Math.round(OWN_CONTRACT_MAX_BYTES / (1024 * 1024))}mb
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
              <input
                type="checkbox"
                checked={accepted}
                disabled={!hasReadyFile || isSubmitting}
                onChange={(event) => onAcceptedChange(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-[#B3B3B3] disabled:cursor-not-allowed disabled:opacity-40"
              />

              <span className="text-[0.875rem] font-normal leading-[1.25rem] text-[#B8B8B8]">
                By signing, I confirm that I have read and therefore agree to all{" "}
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowTerms(true);
                  }}
                  className="text-[1rem] font-medium leading-[1.5rem] text-[#969696] underline"
                >
                  contractual terms
                </button>
                , which become legally binding.
              </span>
            </label>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-8 pb-5 pt-5">
            <div className="min-h-[17.25rem] max-h-[17.25rem] overflow-y-auto pr-4">
              <p className="text-[1rem] font-medium leading-[1.5rem] text-[#969696]">
                By accepting this acknowledgement, the Brand and Creator confirm that the uploaded contract is the controlling contract document for this collaboration.
              </p>

              <ol className="mt-5 list-decimal space-y-4 pl-5 text-[1rem] font-medium leading-[1.5rem] text-[#969696]">
                <li>The Creator has downloaded and reviewed the Brand uploaded contract.</li>
                <li>The Creator is uploading the filled/signed updated PDF as the final contract document.</li>
                <li>The uploaded signed PDF will become legally binding once submitted.</li>
                <li>CollabGlam may keep an acknowledgement record and contract activity history.</li>
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
                    <CircleNotch size={14} weight="bold" className="mr-2 animate-spin" />
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
    </div>,
    document.body
  );
}

function CreatorContractFloatingBar({
  fileName,
  fileSize,
  showDownload,
  disabled,
  isDownloading,
  onReject,
  onAccept,
  onDownload,
}: {
  fileName: string;
  fileSize?: string;
  showDownload?: boolean;
  disabled?: boolean;
  isDownloading?: boolean;
  onReject: () => void;
  onAccept: () => void;
  onDownload?: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.10)]">
      <div className="flex min-w-0 items-center gap-3">
        <FilePdf weight="fill" className="h-9 w-9 shrink-0 text-[#E35141]" />

        <div className="min-w-0">
          <div className="truncate text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A]">
            {fileName}
          </div>

          {fileSize ? (
            <div className="text-[0.875rem] leading-[1.25rem] text-[#969696]">
              {fileSize}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <button
          type="button"
          disabled={disabled}
          onClick={onReject}
          className="text-[0.875rem] font-medium text-[#1A1A1A] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="h-10 rounded-[0.75rem] bg-[#1A1A1A] px-7 text-[0.875rem] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Accept
        </button>

        {showDownload ? (
          <button
            type="button"
            disabled={disabled || isDownloading}
            onClick={onDownload}
            className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] text-[#1A1A1A] hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Download contract"
          >
            <DownloadSimple weight="bold" className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function OverviewCompanyTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: "overview" | "company";
  setActiveTab: React.Dispatch<React.SetStateAction<"overview" | "company">>;
}) {
  const tabs: Array<{ key: "overview" | "company"; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "company", label: "About Company" },
  ];

  return (
    <div className="flex w-full items-center gap-[2rem] border-b border-[#E6E6E6]">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "relative flex h-[3rem] items-center justify-center",
              "text-center font-[var(--Font-family-Body,Inter)]",
              "text-[var(--Font-size-Small,1rem)] font-semibold",
              "leading-[var(--Line-height-Small,1.5rem)]",
              active
                ? "text-[var(--Light-Text-Primary,#1A1A1A)]"
                : "text-[#B8B8B8]",
            ].join(" ")}
            style={{
              fontFeatureSettings: "'liga' off, 'clig' off",
            }}
          >
            {tab.label}

            {active ? (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[0.125rem] rounded-full bg-[#FFCC00]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function CompanyDescriptionPanel({
  brandName,
  brandLogoUrl,
}: {
  brandName: string;
  brandLogoUrl?: string;
}) {
  const initials = getInitials(brandName);

  return (
    <section className="flex w-full flex-col items-start gap-[1rem] self-stretch">
      <SectionTitle title="Company Description" />

      <div className="flex w-full items-center gap-[1rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-[1rem]">
        <div className="flex h-[4rem] w-[4rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F9F9F9] text-[1rem] font-semibold text-[#1A1A1A]">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={brandName || "Brand logo"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            initials
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-[0.25rem]">
          <div className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
            Brand Name
          </div>

          <div className="truncate text-[1rem] font-semibold leading-[1.5rem] text-[#1A1A1A]">
            {brandName || "—"}
          </div>
        </div>
      </div>
    </section>
  );
}

function CampaignSidebarLoadingSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <SkeletonProvider>
      <SidebarShell embedded={embedded}>
        <div className="flex w-full flex-col gap-[1.75rem]">
          <div className="flex items-center gap-4">
            <SkeletonCircle className="h-[6.25rem] w-[6.25rem]" />

            <div className="min-w-0 flex-1">
              <SkeletonLoader className="h-7 w-1/2 rounded-md" />
              <SkeletonLoader className="mt-3 h-4 w-1/3 rounded-md" />
            </div>

            <SkeletonLoader className="hidden h-10 w-40 rounded-[0.75rem] sm:block" />
          </div>

          <div className="flex gap-6 border-b border-[#E6E6E6] pb-3">
            <SkeletonLoader className="h-5 w-20 rounded-md" />
            <SkeletonLoader className="h-5 w-28 rounded-md" />
          </div>

          <div>
            <SkeletonLoader className="h-6 w-44 rounded-md" />

            <div className="mt-5 flex flex-col gap-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <SkeletonCircle className="h-6 w-6" />
                  <div className="min-w-0 flex-1">
                    <SkeletonLoader className="h-4 w-40 rounded-md" />
                    <SkeletonLoader className="mt-2 h-3 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SkeletonLoader className="h-[5.5rem] w-full rounded-[0.75rem]" />

          <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-5">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonLoader key={item} className="h-[7.5rem] rounded-[0.75rem]" />
            ))}
          </div>

          <div>
            <SkeletonLoader className="h-6 w-32 rounded-md" />
            <SkeletonLoader className="mt-5 h-[14.8125rem] w-full rounded-[0.75rem]" />
          </div>
        </div>
      </SidebarShell>
    </SkeletonProvider>
  );
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
  const [mounted, setMounted] = useState(false);
  const activeImage = images[activeIndex] || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!activeImage) return;

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
  }, [activeImage, onClose, onPrev, onNext]);

  if (!mounted || !activeImage) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center bg-[#B3B3B3]/95 px-6 py-20"
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
        className="absolute right-8 top-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#D9D9D9] text-[2rem] font-light leading-none text-[#1A1A1A] transition hover:bg-white"
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
          className="absolute left-8 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
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
          className="absolute right-8 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2F2F2] text-[#1A1A1A] transition hover:bg-white"
          aria-label="Next image"
        >
          <CaretRight weight="bold" className="h-5 w-5" />
        </button>
      ) : null}
    </div>,
    document.body
  );
}

export default function SidebarCampaign({
  campaignId: campaignIdProp,
  contractId: contractIdProp,
  invitationId,
  invitationStatus,
  invitationBrandLogo,
  invitationAppliedAt,
  onInvitationAccepted,
  embedded = false,
}: {
  campaignId?: string;
  contractId?: string;
  invitationId?: string;
  invitationStatus?: string;
  invitationBrandLogo?: string;
  invitationAppliedAt?: string;
  onInvitationAccepted?: (invitationId?: string) => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const influencerSidebarOffset = useInfluencerSidebarWidth();

  const params = useParams();
  const searchParams = useSearchParams();

  const idFromQuery = searchParams.get("id");

  const campaignId = useMemo(
    () =>
      normalizeMongoId(
        campaignIdProp ?? idFromQuery ?? (params as any)?.campaignId
      ),
    [campaignIdProp, idFromQuery, params]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [doc, setDoc] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "company">(
    "overview"
  );

  const [localInvitationStatus, setLocalInvitationStatus] = useState(
    invitationStatus || ""
  );
  const [localAcceptedAt, setLocalAcceptedAt] = useState("");

  const [influencerId, setInfluencerId] = useState("");
  const [token, setToken] = useState("");
  const [isOpeningThread, setIsOpeningThread] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const [creatorOwnContractDialogOpen, setCreatorOwnContractDialogOpen] = useState(false);
  const [creatorOwnContractAccepted, setCreatorOwnContractAccepted] = useState(false);
  const [creatorOwnContractFile, setCreatorOwnContractFile] = useState<File | null>(null);
  const [templateContractSidebarOpen, setTemplateContractSidebarOpen] = useState(false);
  const [creatorContractError, setCreatorContractError] = useState("");
  const [creatorContractStatusLocal, setCreatorContractStatusLocal] = useState("");
  const [creatorContractMeta, setCreatorContractMeta] = useState<any | null>(null);
  const [isCreatorContractDownloading, setIsCreatorContractDownloading] = useState(false);
  const [isCreatorContractSubmitting, setIsCreatorContractSubmitting] = useState(false);

  useEffect(() => {
    setLocalInvitationStatus(invitationStatus || "");
  }, [invitationStatus]);

  useEffect(() => {
    const id =
      localStorage.getItem("influencerId") ||
      localStorage.getItem("influencerID") ||
      localStorage.getItem("influencer_id") ||
      "";

    const savedToken =
      localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

    setInfluencerId(id);
    setToken(savedToken);

    if (!id) {
      setErr("influencerId not found in localStorage. Please login again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!influencerId || !campaignId) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr("");

      try {
        const res: any = await apiGetfetchCampaignbyId(
          influencerId,
          campaignId,
          token || undefined
        );

        const payload =
          res?.data?.doc ??
          res?.data?.data?.doc ??
          res?.data?.campaign ??
          res?.data?.data ??
          res?.doc ??
          res ??
          null;

        if (!cancelled) {
          setDoc(payload);
          setActiveTab("overview");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(getApiErrorMessage(e, "Failed to load campaign"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [influencerId, campaignId, token]);

  useEffect(() => {
    const rootDoc = doc as any;
    const campaignDoc =
      rootDoc?.campaign ?? rootDoc?.campaignData ?? rootDoc?.data?.campaign ?? rootDoc;
    const influencerDoc =
      rootDoc?.influencer ??
      rootDoc?.creator ??
      rootDoc?.application?.influencer ??
      rootDoc?.data?.influencer ??
      {};

    const currentContractId = pickString(
      contractIdProp,
      influencerDoc?.contractId,
      influencerDoc?.contractMongoId,
      influencerDoc?.contract?._id,
      influencerDoc?.contract?.contractId,
      campaignDoc?.contractId,
      campaignDoc?.contractMongoId,
      campaignDoc?.contract?._id,
      campaignDoc?.contract?.contractId,
      rootDoc?.contractId,
      rootDoc?.contractMongoId,
      rootDoc?.contract?._id,
      rootDoc?.contract?.contractId
    );

    if (!currentContractId) {
      setCreatorContractMeta(null);
      return;
    }

    let cancelled = false;

    api
      .get(`/contract/get-contract-details/${currentContractId}`)
      .then((response: any) => {
        if (cancelled) return;

        setCreatorContractMeta(
          response?.data?.contract ??
            response?.data?.data?.contract ??
            response?.data?.data ??
            response?.data ??
            null
        );
      })
      .catch(() => {
        if (!cancelled) setCreatorContractMeta(null);
      });

    return () => {
      cancelled = true;
    };
  }, [contractIdProp, doc]);

  if (loading) {
    return <CampaignSidebarLoadingSkeleton embedded={embedded} />;
  }

  if (err) {
    return (
      <SidebarShell embedded={embedded}>
        <div className="w-full rounded-2xl border border-[#E6E6E6] bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-[#1A1A1A]">
            Couldn’t load campaign
          </div>

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
      </SidebarShell>
    );
  }

  if (!doc) {
    return (
      <SidebarShell embedded={embedded}>
        <div className="w-full rounded-2xl border border-[#E6E6E6] bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-[#1A1A1A]">
            No campaign found
          </div>
        </div>
      </SidebarShell>
    );
  }

  const root = doc as any;
  const campaign = root?.campaign ?? root?.campaignData ?? root?.data?.campaign ?? root;
  const brand = root?.brand ?? campaign?.brand ?? campaign?.brandData ?? root?.data?.brand ?? {};
  const influencer =
    root?.influencer ??
    root?.creator ??
    root?.application?.influencer ??
    root?.data?.influencer ??
    {};
  const details = campaign?.details ?? root?.details ?? {};

  const getAssetUrl = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();

    return String(
      value?.dataUrl ??
      value?.url ??
      value?.src ??
      value?.path ??
      value?.imageUrl ??
      value?.secureUrl ??
      value?.profilePic ??
      value?.profileImage ??
      ""
    ).trim();
  };

  const formatAgeRangeLabel = (value: any) => {
    const raw = String(
      value?.range ??
      value?.label ??
      value?.name ??
      value?.title ??
      value?.value ??
      value ??
      ""
    ).trim();

    if (!raw || isMongoIdString(raw)) return "";

    const nums = raw.match(/\d+/g) ?? [];

    if (nums.length >= 2) return `${nums[0]}-${nums[1]}`;
    if (nums.length === 1 && raw.includes("+")) return `${nums[0]}+`;

    return raw.replace(/\s*[–—-]\s*/g, "-");
  };

  const makeTextList = (...values: any[]) => {
    return removeMongoIdValues(
      Array.from(
        new Set(
          values
            .flatMap((value) => toTagValues(value))
            .map((value) => String(value).trim())
            .filter(Boolean)
        )
      )
    );
  };

  const campaignIdValue = normalizeMongoId(
    campaign?.campaignId ?? campaign?._id ?? campaign?.id ?? campaignId
  );
  const brandIdValue = normalizeMongoId(
    brand?.brandId ?? brand?._id ?? brand?.id ?? campaign?.brandId
  );
  const influencerIdValue = normalizeMongoId(
    influencer?.influencerId ?? influencer?._id ?? influencer?.id ?? influencerId
  );

  const contractMeta = creatorContractMeta || {};
  const contractDocument =
    contractMeta?.document ||
    contractMeta?.contractDocument ||
    contractMeta?.documents ||
    contractMeta?.contract?.document ||
    campaign?.contract?.document ||
    root?.contract?.document ||
    {};

  const uploadedContractDocument =
    contractDocument?.uploadedContract ||
    contractDocument?.signedUploadedContract ||
    contractMeta?.uploadedContract ||
    contractMeta?.signedUploadedContract ||
    campaign?.contract?.uploadedContract ||
    root?.contract?.uploadedContract ||
    {};

  const creatorContractId = pickString(
    contractIdProp,
    contractMeta?.contractId,
    contractMeta?._id,
    influencer?.contractId,
    influencer?.contractMongoId,
    influencer?.contract?._id,
    influencer?.contract?.contractId,
    campaign?.contractId,
    campaign?.contractMongoId,
    campaign?.contract?._id,
    campaign?.contract?.contractId,
    campaign?.contracts?._id,
    campaign?.contracts?.contractId,
    root?.contractId,
    root?.contractMongoId,
    root?.contract?._id,
    root?.contract?.contractId,
    root?.contracts?._id,
    root?.contracts?.contractId
  );

  const creatorContractStatus = String(
    creatorContractStatusLocal ||
    contractMeta?.status ||
    influencer?.contractStatus ||
    influencer?.contract?.status ||
    campaign?.contractStatus ||
    campaign?.contract?.status ||
    campaign?.contracts?.status ||
    root?.contractStatus ||
    root?.contract?.status ||
    root?.contracts?.status ||
    ""
  )
    .trim()
    .toLowerCase();

  const creatorContractSource = String(
    pickString(
      contractMeta?.contractSource,
      contractDocument?.documentSource,
      contractMeta?.documentSource,
      campaign?.contractSource,
      campaign?.contract?.contractSource,
      campaign?.contract?.documentSource,
      root?.contractSource,
      root?.contract?.contractSource,
      root?.contract?.documentSource
    )
  ).toLowerCase();

  const isUploadedOwnContract = Boolean(
    creatorContractSource === "uploaded" ||
    uploadedContractDocument?.key ||
    uploadedContractDocument?.originalName
  );

  const creatorHasAcceptedContract =
    Number(
      contractMeta?.isAccepted ??
      influencer?.contract?.isAccepted ??
      campaign?.contract?.isAccepted ??
      root?.contract?.isAccepted ??
      0
    ) === 1 ||
    ["influencer_accepted", "brand_accepted", "ready_to_sign", "contract_signed", "milestones_created", "locked"].includes(
      creatorContractStatus
    );

  const creatorHasRejectedContract =
    Number(
      contractMeta?.isRejected ??
      influencer?.isRejected ??
      influencer?.contract?.isRejected ??
      campaign?.isRejected ??
      campaign?.contract?.isRejected ??
      root?.isRejected ??
      root?.contract?.isRejected ??
      0
    ) === 1 ||
    creatorContractStatus === "rejected";

  const showCreatorContractBar = Boolean(
    creatorContractId && !creatorHasAcceptedContract && !creatorHasRejectedContract
  );

  const creatorContractSentAt = firstValidDate(
    contractMeta?.lastSentAt,
    contractMeta?.createdAt,
    uploadedContractDocument?.uploadedAt,
    influencer?.contractSentAt,
    influencer?.contractCreatedAt,
    influencer?.contract?.lastSentAt,
    influencer?.contract?.createdAt,
    campaign?.contractSentAt,
    campaign?.contractCreatedAt,
    campaign?.contract?.lastSentAt,
    campaign?.contract?.createdAt,
    root?.contractSentAt,
    root?.contractCreatedAt,
    root?.contract?.lastSentAt,
    root?.contract?.createdAt,
    campaign?.updatedAt
  );

  const creatorContractFileName = pickString(
    uploadedContractDocument?.originalName,
    contractDocument?.fileName,
    contractMeta?.contractFileName,
    campaign?.contractFileName,
    campaign?.contract?.fileName,
    campaign?.contract?.document?.uploadedContract?.originalName,
    campaign?.contract?.uploadedContract?.originalName,
    root?.contractFileName,
    root?.contract?.fileName,
    root?.contract?.document?.uploadedContract?.originalName,
    root?.contract?.uploadedContract?.originalName,
    isUploadedOwnContract ? "BrandContract.pdf" : "Contract Sent By Brand"
  );

  const creatorContractFileSize = pickString(
    contractDocument?.fileSizeText,
    uploadedContractDocument?.sizeText,
    uploadedContractDocument?.sizeBytes
      ? formatContractFileSize(uploadedContractDocument.sizeBytes)
      : "",
    campaign?.contractFileSizeText,
    campaign?.contract?.fileSizeText,
    campaign?.contract?.document?.uploadedContract?.sizeText,
    root?.contractFileSizeText,
    root?.contract?.fileSizeText,
    root?.contract?.document?.uploadedContract?.sizeText,
    isUploadedOwnContract ? "Brand uploaded contract" : "Review contract details"
  );

  const downloadCreatorContract = async () => {
    if (!creatorContractId || isCreatorContractDownloading) return;

    setCreatorContractError("");
    setIsCreatorContractDownloading(true);

    try {
      const response = await api.post(
        "/contract/viewPdf",
        { contractId: creatorContractId },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = creatorContractFileName || `Contract-${creatorContractId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setCreatorContractError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to download contract."
      );
    } finally {
      setIsCreatorContractDownloading(false);
    }
  };

  const uploadOwnContractFileToStorage = async (file: File) => {
    const uploadUrlResponse = await api.post("/contract/own/influencer/upload-url", {
      contractId: creatorContractId,
      brandId: brandIdValue,
      influencerId: influencerIdValue || influencerId,
      campaignId: campaignIdValue,
      fileName: file.name,
      contentType: file.type || "application/pdf",
      sizeBytes: file.size,
    });

    const upload =
      uploadUrlResponse?.data?.upload ??
      uploadUrlResponse?.data?.data?.upload ??
      uploadUrlResponse?.data ??
      {};

    const uploadUrl = pickString(
      upload?.url,
      upload?.uploadUrl,
      upload?.signedUrl,
      upload?.presignedUrl
    );

    if (!uploadUrl) {
      throw new Error("Upload URL was not returned.");
    }

    if (upload?.fields && typeof upload.fields === "object") {
      const formData = new FormData();

      Object.entries(upload.fields).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      formData.append("file", file);

      await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
    } else {
      await fetch(uploadUrl, {
        method: upload?.method || "PUT",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
      });
    }

    return {
      key: pickString(upload?.key, upload?.objectKey, upload?.s3Key),
      bucket: pickString(upload?.bucket, upload?.Bucket),
      folder: pickString(upload?.folder),
      originalName: file.name,
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size,
    };
  };

  const submitUploadedOwnContract = async () => {
    if (!creatorContractId || isCreatorContractSubmitting) return;

    if (!creatorOwnContractFile) {
      setCreatorContractError("Please upload the filled/signed contract PDF.");
      return;
    }

    if (creatorOwnContractFile.type && creatorOwnContractFile.type !== "application/pdf") {
      setCreatorContractError("Only PDF files are allowed.");
      return;
    }

    if (creatorOwnContractFile.size > OWN_CONTRACT_MAX_BYTES) {
      setCreatorContractError(
        `PDF must be under ${Math.round(OWN_CONTRACT_MAX_BYTES / (1024 * 1024))}mb.`
      );
      return;
    }

    if (!creatorOwnContractAccepted) {
      setCreatorContractError("Please accept the contractual terms before submitting.");
      return;
    }

    setCreatorContractError("");
    setIsCreatorContractSubmitting(true);

    try {
      const uploadedContract = await uploadOwnContractFileToStorage(creatorOwnContractFile);

      const response = await api.post("/contract/own/influencer/send-signed", {
        contractId: creatorContractId,
        brandId: brandIdValue,
        influencerId: influencerIdValue || influencerId,
        campaignId: campaignIdValue,
        uploadedContract,
      });

      const nextStatus =
        response?.data?.contract?.status ||
        response?.data?.data?.contract?.status ||
        "contract_signed";

      setCreatorContractStatusLocal(nextStatus);
      setCreatorOwnContractDialogOpen(false);
      setCreatorOwnContractAccepted(false);
      setCreatorOwnContractFile(null);

      setDoc((previous: any) => {
        if (!previous) return previous;

        const patch = { isAccepted: 1, isRejected: 0, contractStatus: nextStatus };

        return {
          ...previous,
          ...patch,
          influencer: previous.influencer
            ? { ...previous.influencer, ...patch }
            : previous.influencer,
          creator: previous.creator
            ? { ...previous.creator, ...patch }
            : previous.creator,
          campaign: previous.campaign
            ? { ...previous.campaign, ...patch }
            : previous.campaign,
          campaignData: previous.campaignData
            ? { ...previous.campaignData, ...patch }
            : previous.campaignData,
        };
      });
    } catch (error: any) {
      setCreatorContractError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to upload signed contract."
      );
    } finally {
      setIsCreatorContractSubmitting(false);
    }
  };

  const rejectCreatorContract = async () => {
    if (!creatorContractId || isCreatorContractSubmitting) return;

    const confirmed = window.confirm("Are you sure you want to reject this contract?");
    if (!confirmed) return;

    setCreatorContractError("");
    setIsCreatorContractSubmitting(true);

    try {
      await api.post("/contract/reject", {
        contractId: creatorContractId,
        influencerId: influencerIdValue || influencerId,
        reason: "Rejected by creator",
      });

      setCreatorContractStatusLocal("rejected");

      setDoc((previous: any) => {
        if (!previous) return previous;

        const patch = { isAccepted: 0, isRejected: 1, contractStatus: "rejected" };

        return {
          ...previous,
          ...patch,
          influencer: previous.influencer
            ? { ...previous.influencer, ...patch }
            : previous.influencer,
          creator: previous.creator
            ? { ...previous.creator, ...patch }
            : previous.creator,
          campaign: previous.campaign
            ? { ...previous.campaign, ...patch }
            : previous.campaign,
          campaignData: previous.campaignData
            ? { ...previous.campaignData, ...patch }
            : previous.campaignData,
          data: previous.data
            ? {
              ...previous.data,
              influencer: previous.data.influencer
                ? { ...previous.data.influencer, ...patch }
                : previous.data.influencer,
              campaign: previous.data.campaign
                ? { ...previous.data.campaign, ...patch }
                : previous.data.campaign,
            }
            : previous.data,
        };
      });
    } catch (error: any) {
      setCreatorContractError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reject contract."
      );
    } finally {
      setIsCreatorContractSubmitting(false);
    }
  };

  const countries = makeTextList(
    campaign?.targetCountries,
    campaign?.targetCountryValues,
    campaign?.targetCountry,
    campaign?.targetCountryIds,
    details?.targetCountries,
    details?.targetCountryValues,
    details?.targetCountry,
    details?.targetCountryIds
  ).map((countryName) => ({ countryName }));

  const ages = makeTextList(
    campaign?.targetAgeGroups,
    campaign?.targetAgeGroupValues,
    campaign?.targetAgeRanges,
    campaign?.ageRanges,
    details?.targetAgeGroups,
    details?.targetAgeGroupValues,
    details?.targetAgeRanges,
    details?.ageRanges
  )
    .map(formatAgeRangeLabel)
    .filter(Boolean)
    .map((range) => ({ range }));

  const platforms = makeTextList(
    campaign?.targetPlatforms,
    campaign?.platformSelection,
    campaign?.platforms,
    campaign?.selectedPlatforms,
    details?.targetPlatforms,
    details?.platformSelection,
    details?.platforms,
    details?.selectedPlatforms
  );

  const descriptionText = String(
    firstNonEmpty(
      campaign?.description,
      campaign?.campaignDescription,
      campaign?.details?.description,
      details?.description,
      details?.campaignDescription,
      root?.description,
      root?.campaignDescription
    ) || ""
  ).trim();

  const additionalNotesText = String(
    firstNonEmpty(
      campaign?.additionalNotes,
      campaign?.notes,
      campaign?.additionalInformation,
      details?.additionalNotes,
      details?.notes,
      details?.additionalInformation,
      root?.additionalNotes,
      root?.notes
    ) || ""
  ).trim();

  const hashtags = makeTextList(
    campaign?.hashtags,
    campaign?.preferredHashtags,
    details?.hashtags,
    details?.preferredHashtags
  ).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

  const productImages = asArray<any>(
    firstNonEmpty(
      campaign?.productImages,
      campaign?.images,
      campaign?.imageUrls,
      campaign?.campaignImages,
      details?.productImages,
      details?.images,
      root?.productImages
    ) || []
  );

  const videoReferenceUrl = String(
    firstNonEmpty(
      campaign?.videoReferenceUrl,
      campaign?.videoReference,
      campaign?.referenceVideoUrl,
      campaign?.videoUrl,
      details?.videoReferenceUrl,
      details?.videoReference,
      details?.referenceVideoUrl,
      details?.videoUrl
    ) || ""
  ).trim();

  const videoThumbUrl = videoReferenceUrl ? getVideoThumb(videoReferenceUrl) : "";

  const pdfRaw =
    campaign?.brandGuideline ??
    campaign?.brandGuidelines ??
    campaign?.pdf ??
    campaign?.pdfAttachment ??
    campaign?.attachment ??
    campaign?.attachments ??
    details?.brandGuideline ??
    details?.pdf ??
    details?.pdfAttachment ??
    details?.attachment ??
    details?.attachments ??
    null;

  const pdfItem = Array.isArray(pdfRaw) ? pdfRaw[0] : pdfRaw;
  const pdfUrl = getAssetUrl(pdfItem);
  const pdfName =
    typeof pdfItem === "object" && pdfItem?.name
      ? String(pdfItem.name)
      : pdfUrl
        ? "Brandguideline.pdf"
        : "";
  const pdfSizeText =
    typeof pdfItem === "object" && pdfItem?.size != null
      ? `${(Number(pdfItem.size) / (1024 * 1024)).toFixed(1)} MB`
      : "";

  const targetCountryText = countries.length
    ? countries.map((country) => country.countryName).filter(Boolean).join(", ")
    : "—";

  const productUrl = String(
    firstNonEmpty(
      campaign?.productUrl,
      campaign?.productLink,
      details?.productUrl,
      details?.productLink,
      brand?.website
    ) || ""
  ).trim();

  const logoUrl = getAssetUrl(
    invitationBrandLogo ||
    brand?.profilePic ||
    brand?.brandProfilePic ||
    brand?.brandprofilepic ||
    brand?.profileImage ||
    brand?.logoUrl ||
    brand?.logo ||
    campaign?.brandLogoUrl ||
    campaign?.brandLogo ||
    details?.brandLogoUrl ||
    details?.brandLogo
  );

  const campaignTitle = String(
    firstNonEmpty(
      campaign?.title,
      campaign?.campaignTitle,
      campaign?.campaignName,
      campaign?.name,
      root?.title,
      root?.campaignTitle
    ) || "Campaign"
  );

  const brandName = String(
    firstNonEmpty(
      brand?.brandName,
      brand?.name,
      campaign?.brandName,
      campaign?.brand?.brandName,
      campaign?.brand?.name,
      root?.brandName,
      details?.brandName
    ) || "—"
  );

  const statusText = String(
    firstNonEmpty(campaign?.status, campaign?.campaignStatus, root?.status, "active") || ""
  ).trim();

  const ratingValue = firstNonEmpty(
    campaign?.rating,
    campaign?.brandRating,
    brand?.rating,
    details?.rating,
    details?.brandRating
  );
  const ratingText = ratingValue ? String(ratingValue) : "";

  const totalInfluencers =
    Number(
      firstNonEmpty(
        campaign?.numberOfInfluencers,
        details?.numberOfInfluencers,
        campaign?.creatorRequirement?.numberOfInfluencers
      ) || 0
    ) || 0;

  const selectedList = firstNonEmpty(
    campaign?.selectedInfluencers,
    campaign?.selectedInfluencerIds,
    campaign?.selectedCreators,
    campaign?.selectedInfluencer,
    details?.selectedInfluencers,
    details?.selectedInfluencerIds
  ) || [];
  const selectedCount = asArray(selectedList).length;
  const creatorCount = totalInfluencers || selectedCount;

  const startAt = firstNonEmpty(campaign?.startAt, campaign?.startDate, details?.startAt, details?.startDate) || null;
  const endAt = firstNonEmpty(campaign?.endAt, campaign?.endDate, details?.endAt, details?.endDate) || null;

  let campaignDurationText = "—";
  try {
    if (startAt && endAt) {
      const a = new Date(startAt).getTime();
      const b = new Date(endAt).getTime();

      if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
        const days = Math.ceil((b - a) / 86400000);
        const months = Math.max(1, Math.round(days / 30));
        campaignDurationText = plural(months, "month");
      }
    } else if (campaign?.timeline) {
      campaignDurationText = String(campaign.timeline);
    }
  } catch { }

  const currency = String(
    firstNonEmpty(
      campaign?.payout?.currency,
      campaign?.currency,
      details?.currency,
      campaign?.budgetCurrency,
      brand?.currencyFormat,
      "USD"
    ) || "USD"
  )
    .replace(/\s.*/, "")
    .toUpperCase();

  const payoutMin = toNumber(
    firstNonEmpty(campaign?.payout?.min, campaign?.budgetMin, campaign?.minBudget)
  );
  const payoutMax = toNumber(
    firstNonEmpty(campaign?.payout?.max, campaign?.campaignBudget, campaign?.budget, campaign?.maxBudget)
  );
  const budgetRaw = firstNonEmpty(
    campaign?.campaignBudget,
    campaign?.budget,
    campaign?.totalBudget,
    details?.campaignBudget,
    payoutMax,
    payoutMin
  );
  const budgetNum = toNumber(budgetRaw);

  const budgetText =
    Number.isFinite(payoutMin) && payoutMin > 0 && Number.isFinite(payoutMax) && payoutMax > 0 && payoutMin !== payoutMax
      ? `${currency} ${payoutMin.toLocaleString("en-US")} - ${currency} ${payoutMax.toLocaleString("en-US")}`
      : Number.isFinite(payoutMax) && payoutMax > 0
        ? `${currency} ${payoutMax.toLocaleString("en-US")}`
        : Number.isFinite(budgetNum) && budgetNum > 0
          ? `${currency} ${budgetNum.toLocaleString("en-US")}`
          : "—";

  const startDateText = formatDate(startAt);
  const endDateText = formatDate(endAt);
  const paymentTypeText = String(
    firstNonEmpty(campaign?.paymentType, details?.paymentType, "—") || "—"
  );

  const isAcceptedInvitation =
    String(localInvitationStatus || "").trim().toLowerCase() === "accepted" ||
    String(invitationStatus || "").trim().toLowerCase() === "accepted" ||
    Number(influencer?.isAccepted ?? campaign?.isAccepted ?? root?.isAccepted ?? 0) === 1 ||
    String(campaign?.invitationStatus || root?.invitationStatus || "")
      .trim()
      .toLowerCase() === "accepted" ||
    String(campaign?.applicationStatus || root?.applicationStatus || "")
      .trim()
      .toLowerCase() === "accepted";

  const hasAppliedValue = isAcceptedInvitation
    ? 1
    : Number(influencer?.hasApplied ?? campaign?.hasApplied ?? root?.hasApplied ?? 0);

  const showApplyButton = hasAppliedValue === 0 && !isAcceptedInvitation;

  const appliedAt = firstValidDate(
    localAcceptedAt,
    invitationAppliedAt,
    influencer?.appliedAt,
    campaign?.acceptedAt,
    campaign?.appliedAt,
    campaign?.applicationAppliedAt,
    campaign?.application?.appliedAt,
    campaign?.appliedDate,
    isAcceptedInvitation ? campaign?.updatedAt : null,
    hasAppliedValue === 1 ? campaign?.createdAt : null
  );

  const brandViewedAt = firstValidDate(
    campaign?.brandViewedAt,
    campaign?.viewedByBrandAt,
    campaign?.application?.brandViewedAt,
    campaign?.application?.viewedByBrandAt
  );


  const isBrandViewed =
    Boolean(brandViewedAt) ||
    Boolean(campaign?.isViewedByBrand) ||
    Boolean(campaign?.viewedByBrand);


  const applicationTimelineItems = [
    {
      title: appliedAt
        ? `Applied on ${formatTimelineShortDate(appliedAt)}`
        : hasAppliedValue === 1
          ? "Applied"
          : "Not applied yet",
      subtitle: appliedAt
        ? formatTimelineDateTime(appliedAt)
        : hasAppliedValue === 1
          ? "Application submitted"
          : "Pending",
      done: hasAppliedValue === 1 || Boolean(appliedAt),
    },
    {
      title: isBrandViewed ? "Viewed by Brand" : "Waiting for Brand View",
      subtitle: brandViewedAt
        ? formatTimelineDateTime(brandViewedAt)
        : isBrandViewed
          ? "Viewed by brand"
          : "Pending",
      done: isBrandViewed,
    },
    {
      title: creatorContractId ? "Contract Sent By Brand" : "Contract Pending",
      subtitle: creatorContractSentAt
        ? formatTimelineDateTime(creatorContractSentAt)
        : creatorContractId
          ? "Contract received"
          : "Pending",
      done: Boolean(creatorContractId),
    },
  ];

  const categoryTags = makeTextList(
    campaign?.category,
    campaign?.categories,
    campaign?.campaignCategory,
    details?.category,
    details?.categories
  );

  const subcategoryTags = makeTextList(
    campaign?.subcategory,
    campaign?.subCategory,
    campaign?.subcategories,
    campaign?.subCategories,
    campaign?.campaignSubcategory,
    details?.subcategories,
    details?.subCategories
  );

  const campaignTypeTags = makeTextList(
    campaign?.campaignTypes,
    campaign?.campaignType,
    details?.campaignTypes,
    details?.campaignType
  );

  const campaignGoalTags = makeTextList(
    campaign?.campaignGoals,
    campaign?.campaignGoalRows,
    campaign?.campaignGoalDetails,
    campaign?.campaignGoal,
    details?.campaignGoals,
    details?.campaignGoal
  );

  const lorem10 = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do.";

  const backendImageUrls = productImages.map(getAssetUrl).filter(Boolean);
  const carouselImages = backendImageUrls.length ? backendImageUrls : [];

  const influencerTierValues = makeTextList(
    campaign?.influencerTier,
    campaign?.creatorRequirement?.influencerTier,
    details?.influencerTier,
    details?.creatorRequirement?.influencerTier,
    details?.influencerTiers
  );
  const influencerTier = influencerTierValues.length ? influencerTierValues.join(" , ") : "—";

  const contentLanguages = makeTextList(
    campaign?.contentLanguage,
    campaign?.contentLanguages,
    details?.contentLanguage,
    details?.contentLanguages,
    details?.languages
  );

  const contentFormats = makeTextList(
    campaign?.contentFormat,
    campaign?.contentFormats,
    details?.contentFormat,
    details?.contentFormats,
    details?.creatorRequirement?.contentFormats
  );

  const minFollowers = formatNumber(
    firstNonEmpty(
      campaign?.minFollowers,
      campaign?.minimumFollowers,
      details?.minFollowers,
      details?.minimumFollowers,
      details?.creatorRequirement?.minFollowers
    )
  );

  const maxFollowers = formatNumber(
    firstNonEmpty(
      campaign?.maxFollowers,
      campaign?.maximumFollowers,
      details?.maxFollowers,
      details?.maximumFollowers,
      details?.creatorRequirement?.maxFollowers
    )
  );

  const brandEmail = String(
    firstNonEmpty(
      brand?.proxyEmail,
      brand?.email,
      campaign?.brandEmail,
      campaign?.brand?.proxyEmail,
      campaign?.brand?.email,
      details?.brandEmail,
      details?.brand?.email
    ) || ""
  ).trim();
  const scrollToSlide = (idx: number) => {
    const el = carouselRef.current;
    if (!el || !carouselImages.length) return;

    const clamped = Math.max(0, Math.min(idx, carouselImages.length - 1));
    const child = el.children.item(clamped) as HTMLElement | null;

    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }

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

  const openImagePreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closeImagePreview = () => {
    setPreviewIndex(null);
  };

  const showPreviousPreviewImage = () => {
    setPreviewIndex((current) => {
      if (current === null || carouselImages.length === 0) return current;
      return current <= 0 ? carouselImages.length - 1 : current - 1;
    });
  };

  const showNextPreviewImage = () => {
    setPreviewIndex((current) => {
      if (current === null || carouselImages.length === 0) return current;
      return current >= carouselImages.length - 1 ? 0 : current + 1;
    });
  };

  const onDownloadPdf = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const notifyAction = (message: string) => {
    setErr(message);
  };

  const onMailToBrand = async () => {
    if (isOpeningThread) return;

    const brandId = pickString(
      brand?.brandId,
      brand?._id,
      brand?.id,
      campaign?.brandId,
      campaign?.brand?._id,
      campaign?.brand?.brandId,
      root?.brandId,
      root?.brand?._id,
      brandIdValue
    );

    const currentInfluencerId = pickString(
      influencer?.influencerId,
      influencer?._id,
      influencer?.id,
      root?.influencerId,
      root?.influencer?._id,
      influencerIdValue,
      influencerId
    );

    const currentCampaignId = pickString(
      campaign?.campaignId,
      campaign?._id,
      campaign?.id,
      root?.campaignId,
      root?._id,
      campaignIdValue,
      campaignId
    );

    if (!brandId || !currentInfluencerId || !currentCampaignId) {
      notifyAction(
        "Unable to open inbox. Missing brand, influencer, or campaign details."
      );
      return;
    }

    setIsOpeningThread(true);

    try {
      const response = await api.post("/emails/threads", {
        brandId,
        influencerId: currentInfluencerId,
        campaignId: currentCampaignId,
        subject: pickString(campaign?.title, campaignTitle, "Campaign"),
        type: "campaign",
        source: "influencer_sidebar_campaign",
      });

      const threadId = getThreadIdFromResponse(response);

      if (!threadId) {
        throw new Error("Thread created, but threadId was not returned.");
      }

      router.push(`/influencer/inbox/${threadId}`);
    } catch (error: any) {
      notifyAction(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to open brand conversation."
      );
    } finally {
      setIsOpeningThread(false);
    }
  };

  const handleApplyNow = () => {
    const now = new Date().toISOString();

    setLocalInvitationStatus("accepted");
    setLocalAcceptedAt(now);
    onInvitationAccepted?.(invitationId);
  };

  const templateContractCampaign = {
    id: campaignIdValue,
    title: campaignTitle,
    productOrServiceName: campaignTitle,
    brandId: brandIdValue,
    brandName,
    description: descriptionText,
    budgetMin: 0,
    budgetMax: Number.isFinite(budgetNum) ? budgetNum : 0,
    daysLeft: 0,
    match: 0,
    category: categoryTags[0] || "",
    platform: platforms[0] || "",
    location: targetCountryText,
    status: statusText,
    campaignStatus: statusText,
    timeline: { startDate: String(startAt || ""), endDate: String(endAt || "") },
    isActive: Number(campaign?.isActive ?? 1),
    budget: Number.isFinite(budgetNum) ? budgetNum : 0,
    influencerBudget: Number(campaign?.influencerBudget || 0),
    isApproved: 1,
    isContracted: 1,
    contractId: creatorContractId,
    contractMongoId: creatorContractId,
    isAccepted: Number(contractMeta?.isAccepted ?? campaign?.isAccepted ?? 0),
    hasApplied: hasAppliedValue,
    hasMilestone: Number(campaign?.hasMilestone || 0),
    productImages: productImages as any[],
    campaignType: paymentTypeText,
    paymentType: paymentTypeText,
    laneType: campaign?.laneType,
    targetCountry: targetCountryText,
    targetCountryValues: targetCountryText !== "—" ? [targetCountryText] : [],
    targetCountries: countries,
    campaignGoalValues: campaignGoalTags,
    targetAgeGroupValues: ages.map((item: any) => String(item?.range || "")).filter(Boolean),
    applicationStatus: campaign?.applicationStatus,
    feeAmount: Number(contractMeta?.feeAmount || 0),
    contractStatus: creatorContractStatus,
  };

  const sidebarContent = (
    <SidebarShell
      embedded={embedded}
      footer={
        showCreatorContractBar ? (
          <CreatorContractFloatingBar
            fileName={creatorContractFileName}
            fileSize={creatorContractFileSize}
            showDownload={isUploadedOwnContract}
            disabled={isCreatorContractSubmitting}
            isDownloading={isCreatorContractDownloading}
            onReject={rejectCreatorContract}
            onAccept={() => {
              setCreatorContractError("");

              if (isUploadedOwnContract) {
                setCreatorOwnContractDialogOpen(true);
              } else {
                setTemplateContractSidebarOpen(true);
              }
            }}
            onDownload={downloadCreatorContract}
          />
        ) : undefined
      }
    >
      <CampaignHeader
        logoUrl={logoUrl}
        title={campaignTitle}
        productUrl={productUrl}
        ratingText={ratingText}
        statusText={statusText}
        onConnectBrand={onMailToBrand}
        isOpeningThread={isOpeningThread}
      />

      <OverviewCompanyTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "company" ? (
        <CompanyDescriptionPanel brandName={brandName} brandLogoUrl={logoUrl} />
      ) : (
        <>
          <ApplicationTimeline items={applicationTimelineItems} />

          <StartConversationCard
            onMailToBrand={onMailToBrand}
            isOpeningThread={isOpeningThread}
          />

          <section className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-5">
            <TagCard title="Category" values={categoryTags} />
            <TagCard title="Subcategory" values={subcategoryTags} />
            <TagCard title="Campaign type" values={campaignTypeTags} />
            <TagCard title="Campaign Goals" values={campaignGoalTags} />
          </section>

          <section className="flex w-full flex-col items-start gap-6 rounded-[1.25rem] bg-white">
            <SectionTitle title="Description" />

            <div className="flex h-[14.8125rem] w-full flex-col items-start overflow-auto rounded-[0.75rem] border border-[#E6E6E6] [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-[0.375rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[4.8125rem] [&::-webkit-scrollbar-thumb]:rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6] bg-white p-3">
              <div className="whitespace-pre-wrap text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
                {descriptionText || "—"}
              </div>
            </div>
          </section>

          <section className="flex w-full flex-col items-start gap-6 rounded-[1.25rem] bg-white">
            <SectionTitle title="Image / Reference" />

            <div className="relative w-full">
              {carouselImages.length ? (
                <>
                  <div
                    ref={carouselRef}
                    onScroll={onCarouselScroll}
                    className="flex w-full items-center gap-5 overflow-x-auto scroll-smooth py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {carouselImages.map((src, idx) => (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => openImagePreview(idx)}
                        className="h-[11.5rem] w-[13.8125rem] flex-none cursor-zoom-in rounded-[1.1875rem] bg-cover bg-center transition hover:opacity-90"
                        style={{ backgroundImage: `url(${src})` }}
                        aria-label={`Preview campaign image ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="raised"
                    size="sm"
                    onClick={onPrevSlide}
                    disabled={activeSlide <= 0}
                    className="my-0 absolute left-4 top-[5.625rem] h-[2.75rem] w-[2.75rem] rounded-[2.5rem] border border-transparent bg-[#F2F2F2] px-0 shadow-none"
                    leftIcon={<CaretLeft weight="bold" className="h-5 w-5" />}
                  />

                  <Button
                    variant="raised"
                    size="sm"
                    onClick={onNextSlide}
                    disabled={activeSlide >= carouselImages.length - 1}
                    className="my-0 absolute right-4 top-[5.625rem] h-[2.75rem] w-[2.75rem] rounded-[2.5rem] border border-transparent bg-[#F2F2F2] px-0 shadow-none"
                    leftIcon={
                      <CaretRight weight="bold" className="h-5 w-5" />
                    }
                  />

                  <div className="mt-2 flex w-full items-center justify-center gap-2">
                    {carouselImages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => scrollToSlide(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className="h-2 w-2 rounded-[0.5rem]"
                        style={{
                          backgroundColor:
                            i === activeSlide ? "#000000" : "#E8E8E8",
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[11.5rem] w-full items-center justify-center rounded-[0.75rem] border border-[#E6E6E6] bg-white text-[0.875rem] text-[#969696]">
                  —
                </div>
              )}
            </div>
            {previewIndex !== null ? (
              <ImagePreviewModal
                images={carouselImages}
                activeIndex={previewIndex}
                onClose={closeImagePreview}
                onPrev={showPreviousPreviewImage}
                onNext={showNextPreviewImage}
              />
            ) : null}
          </section>

          <CreatorRequirementCard
            numberOfInfluencers={creatorCount ? pad2(creatorCount) : "—"}
            influencerTier={influencerTier}
            contentLanguages={
              contentLanguages.length ? contentLanguages.join(" , ") : "—"
            }
            contentFormats={contentFormats.length ? contentFormats : ["—"]}
            minFollowers={minFollowers}
            maxFollowers={maxFollowers}
          />

          <section className="flex w-full flex-col items-start gap-6 rounded-[1.25rem] bg-white">
            <SectionTitle title="Audience Performance" subtitle={lorem10} />

            <div className="flex w-full flex-col gap-6 sm:flex-row">
              <div className="flex w-full flex-col gap-3 sm:w-1/2">
                <div className="flex h-[4.5rem] flex-col items-start justify-between rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
                  <div className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
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
                              className="h-5 w-5"
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
                              className="h-5 w-5"
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
                              className="h-5 w-5"
                            />
                          );
                        }

                        return (
                          <span
                            key={key}
                            className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                          >
                            <span className="text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                              {String(p)}
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[0.875rem] text-[#969696]">—</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
                  <div className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
                    Target Country
                  </div>

                  <div className="mt-2 text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                    {targetCountryText}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
                  <div className="text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]">
                    Target age group
                  </div>

                  <div className="flex flex-wrap gap-2 self-stretch">
                    {ages.length ? (
                      [...ages]
                        .sort((a: any, b: any) => {
                          const getStartAge = (value: string) => {
                            const match = String(value || "").match(/\d+/);
                            return match ? Number(match[0]) : Infinity;
                          };

                          return getStartAge(a?.range) - getStartAge(b?.range);
                        })
                        .map((a: any, idx: number) => (
                          <span
                            key={`${String(
                              a?.id ?? a?._id ?? a?.range ?? idx
                            )}-${idx}`}
                            className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                          >
                            <span className="text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                              {String(a?.range ?? "—")}
                            </span>
                          </span>
                        ))
                    ) : (
                      <span className="text-[0.875rem] text-[#969696]">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex h-auto w-full flex-col items-start gap-[1.3125rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3 sm:w-1/2">
                <div className="self-stretch text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                  Video Reference
                </div>

                {videoReferenceUrl ? (
                  <div className="flex min-w-0 flex-col gap-2">
                    <a
                      href={videoReferenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-[0.875rem] font-medium leading-[1.25rem] text-[#B8B8B8]"
                    >
                      {videoReferenceUrl}
                    </a>

                    <a
                      href={videoReferenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-[10.125rem] w-[12.875rem] rounded-[0.25rem] bg-cover bg-center"
                      style={{
                        backgroundImage: videoThumbUrl
                          ? `url(${videoThumbUrl})`
                          : undefined,
                        backgroundColor: videoThumbUrl ? undefined : "#eee",
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-[0.875rem] font-normal leading-[1.25rem] text-[#969696]">
                    —
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="flex w-full flex-col items-start gap-6 rounded-[1.25rem] bg-white">
            <SectionTitle title="Timeline & Payments" />

            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,8.75rem),1fr))] gap-3">
              <InfoMetricCard
                icon={
                  <CalendarDots
                    weight="bold"
                    className="h-6 w-6 text-[#1A1A1A]"
                  />
                }
                label="Start date"
                value={startDateText}
              />
              <InfoMetricCard
                icon={
                  <CalendarX
                    weight="bold"
                    className="h-6 w-6 text-[#1A1A1A]"
                  />
                }
                label="End date"
                value={endDateText}
              />
              <InfoMetricCard
                icon={
                  <CalendarDots
                    weight="bold"
                    className="h-6 w-6 text-[#1A1A1A]"
                  />
                }
                label="Timeline"
                value={campaignDurationText}
              />
              <InfoMetricCard
                icon={
                  <Wallet weight="bold" className="h-6 w-6 text-[#1A1A1A]" />
                }
                label="Payment type"
                value={paymentTypeText}
              />
              <InfoMetricCard
                icon={
                  <MoneyWavy
                    weight="bold"
                    className="h-6 w-6 text-[#1A1A1A]"
                  />
                }
                label="Budget"
                value={budgetText}
              />
            </div>
          </section>

          <section className=" flex w-full flex-col items-start gap-4 rounded-[1.25rem] bg-white">
            <SectionTitle title="Additional Information" subtitle={lorem10} />

            <div className="w-full">
              <div className="flex h-[14.8125rem] flex-col items-start overflow-hidden rounded-[0.75rem] border border-[#E6E6E6] bg-white">
                <div className="flex w-full items-center self-stretch rounded-t-[0.6875rem] border-b border-[#E6E6E6] px-3 py-2">
                  <div className="text-[1rem] font-medium leading-[1.5rem] text-[#969696]">
                    Additional Notes
                  </div>
                </div>

                <div className="flex w-full flex-1 items-start justify-between self-stretch overflow-auto p-3 [scrollbar-width:thin] [scrollbar-color:#E6E6E6_transparent] [&::-webkit-scrollbar]:w-[0.375rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:min-h-[4.8125rem] [&::-webkit-scrollbar-thumb]:rounded-[var(--Sizes-Border-Radius-Pill,6.25rem)] [&::-webkit-scrollbar-thumb]:bg-[#E6E6E6]">
                  <div className="whitespace-pre-wrap text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
                    {additionalNotesText || "—"}
                  </div>
                </div>
              </div>

              {pdfUrl ? (
                <div className="mt-5 flex w-full items-center justify-between rounded-[0.75rem] border border-[#E6E6E6] bg-white px-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FilePdf
                      weight="bold"
                      className="h-8 w-8 flex-shrink-0 text-[#1A1A1A]"
                    />

                    <div className="flex min-w-0 flex-col">
                      <div className="truncate text-[1rem] font-medium leading-[1.5rem] text-[#1A1A1A]">
                        {pdfName}
                      </div>

                      {pdfSizeText ? (
                        <div className="text-[0.875rem] font-normal leading-[1.25rem] text-[#969696]">
                          {pdfSizeText}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    variant="raised"
                    size="sm"
                    onClick={onDownloadPdf}
                    className="my-0 h-[2.0625rem] w-[7rem] rounded-[0.75rem] border border-transparent bg-white px-2 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)]"
                    leftIcon={
                      <DownloadSimple
                        weight="bold"
                        className="h-[0.875rem] w-[0.875rem]"
                      />
                    }
                  >
                    <span className="text-center text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                      Download
                    </span>
                  </Button>
                </div>
              ) : null}

              <div className="mt-5 flex min-h-[7rem] flex-col items-start gap-[1.3125rem] rounded-[0.75rem] border border-[#E6E6E6] bg-white p-3">
                <div className="text-[0.75rem] font-semibold leading-[1.25rem] text-[#1A1A1A]">
                  Hashtags
                </div>

                <div className="flex flex-wrap gap-2 self-stretch">
                  {hashtags.length ? (
                    hashtags.map((tag: string, idx: number) => (
                      <span
                        key={`${tag}-${idx}`}
                        className="flex h-7 items-center justify-center rounded-[1.25rem] bg-[#F9F9F9] px-3"
                      >
                        <span className="text-[0.75rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
                          {tag}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[0.875rem] leading-[1.25rem] text-[#969696]">
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <CreatorOwnContractReuploadDialog
        open={creatorOwnContractDialogOpen}
        originalFileName={creatorContractFileName}
        originalFileSize={creatorContractFileSize}
        file={creatorOwnContractFile}
        error={creatorContractError}
        isSubmitting={isCreatorContractSubmitting}
        isDownloading={isCreatorContractDownloading}
        accepted={creatorOwnContractAccepted}
        onAcceptedChange={setCreatorOwnContractAccepted}
        onClose={() => {
          setCreatorOwnContractDialogOpen(false);
          setCreatorContractError("");
          setCreatorOwnContractAccepted(false);
          setCreatorOwnContractFile(null);
        }}
        onDownloadOriginal={downloadCreatorContract}
        onFileSelected={(file) => {
          setCreatorContractError("");
          setCreatorOwnContractFile(file);
        }}
        onClearFile={() => {
          setCreatorContractError("");
          setCreatorOwnContractFile(null);
        }}
        onSubmit={submitUploadedOwnContract}
      />

      <InfluencerContractModal
        open={templateContractSidebarOpen}
        onClose={() => setTemplateContractSidebarOpen(false)}
        contractId={creatorContractId}
        campaign={templateContractCampaign as any}
        sidebarOffset={influencerSidebarOffset}
        onAfterAction={() => {
          setCreatorContractStatusLocal("influencer_accepted");
        }}
      />
    </SidebarShell>
  );

  if (embedded) {
    return sidebarContent;
  }

  return sidebarContent;
}