"use client";

import React, { useMemo, useState } from "react";
import {
  DotsThree,
  EnvelopeOpen,
  Files,
  Wallet,
} from "@phosphor-icons/react";

export type CampaignStatusVariant =
  | "on_time"
  | "active"
  | "in_progress"
  | "at_risk"
  | "delayed"
  | "pending"
  | "paused"
  | "completed"
  | "rejected"
  | "draft";

export type PlatformName = "youtube" | "instagram" | "tiktok" | string;

export interface InfluencerCampaignManageCardProps {
  className?: string;

  /** Use campaign/product image here */
  logoUrl?: string;
  logoAriaLabel?: string;
  brandName?: string;

  name: string;

  statusLabel?: string;
  statusVariant?: CampaignStatusVariant | string;

  category?: string;
  campaignGoal?: string;

  platforms?: PlatformName[];

  milestoneCurrent?: number;
  milestoneTotal?: number;

  budget?: number | string;

  timelineStartDate?: string;
  timelineEndDate?: string;
  progressValue?: number;

  footerNote?: string;

  onCardClick?: () => void;
  onManageCampaign?: () => void;
  onMessageClick?: () => void | Promise<void>;
  onMoreClick?: () => void;
}

const cx = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(" ");

function getInitials(name?: string) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "CG";

  const first = words[0]?.[0] || "";
  const second = words[1]?.[0] || "";

  return `${first}${second}`.toUpperCase();
}

function formatBudget(value?: number | string) {
  if (value === undefined || value === null || value === "") return "$0";

  const numeric = Number(value);

  if (Number.isFinite(numeric)) return `$${Math.round(numeric)}`;

  const text = String(value).trim();
  return text.startsWith("$") ? text : `$${text}`;
}

function formatMilestones(current?: number, total?: number) {
  const safeCurrent = Math.max(0, Number(current || 0));
  const safeTotal = Math.max(0, Number(total || 0));

  return `${String(safeCurrent).padStart(2, "0")}/${String(
    safeTotal
  ).padStart(2, "0")}`;
}

function normalizeStatus(status?: string) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getStatusVisual(statusVariant?: CampaignStatusVariant | string) {
  const status = normalizeStatus(statusVariant);

  if (status === "on_time" || status === "active" || status === "in_progress") {
    return {
      inner: "bg-[var(--Light-Icon-Positive,#28A745)]",
      outer: "bg-[var(--Light-Background-PositiveSubtle,#EAF6EC)]",
      text: "text-[#969696]",
      label: "On time",
    };
  }

  if (status === "at_risk" || status === "pending") {
    return {
      inner: "bg-[#FFB800]",
      outer: "bg-[#FFF7E0]",
      text: "text-[#969696]",
      label: "Pending",
    };
  }

  if (status === "delayed" || status === "paused" || status === "rejected") {
    return {
      inner: "bg-[#F04D3F]",
      outer: "bg-[#FDECEB]",
      text: "text-[#969696]",
      label: status === "rejected" ? "Rejected" : "Delayed",
    };
  }

  if (status === "completed") {
    return {
      inner: "bg-[#2F80ED]",
      outer: "bg-[#EAF2FF]",
      text: "text-[#969696]",
      label: "Completed",
    };
  }

  return {
    inner: "bg-[#B8B8B8]",
    outer: "bg-[#F2F2F2]",
    text: "text-[#969696]",
    label: "Draft",
  };
}

function calculateTimelineProgress(
  startDate?: string,
  endDate?: string,
  fallback?: number
) {
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return Math.max(0, Math.min(100, fallback));
  }

  if (!startDate || !endDate) return 0;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  const progress = ((now - start) / (end - start)) * 100;

  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getPlatformIconSrc(platform: PlatformName) {
  const value = String(platform || "").toLowerCase();

  if (value.includes("youtube")) return "/logos_youtube-icon.svg";
  if (value.includes("instagram")) return "/skill-icons_instagram.svg";
  if (value.includes("tiktok")) return "/ic_baseline-tiktok.svg";

  return "";
}

function PlatformStack({ platforms = [] }: { platforms?: PlatformName[] }) {
  const cleaned = platforms.filter(Boolean).slice(0, 3);

  if (cleaned.length === 0) return null;

  return (
    <div className="flex items-center">
      {cleaned.map((item, index) => {
        const src = getPlatformIconSrc(item);
        if (!src) return null;

        return (
          <span
            key={`${item}-${index}`}
            className={cx(
              "flex h-[1.375rem] w-[1.375rem] items-center justify-center",
              "rounded-[2.5rem] border border-[var(--Light-Border-Subtle,#E6E6E6)]",
              "bg-[var(--Light-Background-Primary,#FFF)]",
              index > 0 && "-ml-1"
            )}
          >
            <img
              src={src}
              alt={String(item)}
              className="h-[0.75rem] w-[0.75rem] object-contain"
              loading="lazy"
              draggable={false}
            />
          </span>
        );
      })}
    </div>
  );
}

function DotSeparator() {
  return (
    <span
      className="inline-block h-[0.125rem] w-[0.125rem] rounded-full bg-[#B8B8B8]"
      aria-hidden="true"
    />
  );
}

export function InfluencerCampaignManageCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cx(
        "h-[28.5rem] w-full animate-pulse rounded-[1.5rem] border border-[#E6E6E6] bg-[#F7F7F7]",
        className
      )}
    />
  );
}

export default function InfluencerCampaignManageCard({
  className,
  logoUrl,
  logoAriaLabel = "Campaign image",
  brandName,
  name,
  statusLabel,
  statusVariant = "on_time",
  category,
  campaignGoal,
  platforms,
  milestoneCurrent = 0,
  milestoneTotal = 0,
  budget,
  timelineStartDate,
  timelineEndDate,
  progressValue,
  footerNote,
  onCardClick,
  onManageCampaign,
  onMessageClick,
  onMoreClick,
}: InfluencerCampaignManageCardProps) {
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);

  const status = getStatusVisual(statusVariant);

  const progress = useMemo(
    () =>
      calculateTimelineProgress(
        timelineStartDate,
        timelineEndDate,
        progressValue
      ),
    [timelineStartDate, timelineEndDate, progressValue]
  );

  const displayStatus = statusLabel || status.label;
  const initials = getInitials(name || brandName);

  const handleMessageClick = async () => {
    if (!onMessageClick || isOpeningMessage) return;

    setIsOpeningMessage(true);

    try {
      await onMessageClick();
    } finally {
      setIsOpeningMessage(false);
    }
  };

  return (
    <article
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={(event) => {
        if (!onCardClick) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick();
        }
      }}
      className={cx(
        "relative flex w-full flex-col overflow-hidden rounded-[1.5rem]",
        "border border-[#D9D9D9] bg-white",
        onCardClick &&
          "cursor-pointer transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <div className="flex flex-col gap-[1.25rem] px-[1rem] py-[1rem]">
        <div className="flex items-center gap-[1rem]">
          <div
            className="relative grid h-[4rem] w-[4rem] shrink-0 place-items-center overflow-hidden rounded-full bg-[#F2F2F2] text-[1rem] font-semibold text-[#1A1A1A]"
            role="img"
            aria-label={logoAriaLabel}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAriaLabel}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[1rem] font-semibold leading-[1.5rem] text-[#1A1A1A]">
              {name}
            </h3>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-[0.5rem]">
            <span
              className={cx(
                "flex rounded-[1rem] p-[0.125rem]",
                status.outer
              )}
            >
              <span
                className={cx(
                  "h-[0.5rem] w-[0.5rem] rounded-full",
                  status.inner
                )}
              />
            </span>

            <span
              className={cx(
                "max-w-[6rem] truncate text-[1rem] font-medium leading-[1.5rem]",
                status.text
              )}
              title={displayStatus}
            >
              {displayStatus}
            </span>

            <button
              type="button"
              aria-label="More options"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMoreClick?.();
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-[#1A1A1A] transition hover:bg-[#F2F2F2]"
            >
              <DotsThree size={20} weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[0.75rem]">
          {category ? (
            <span className="inline-flex max-w-[10rem] items-center justify-center truncate rounded-full bg-[#F7F7F7] px-[0.75rem] py-[0.375rem] text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]">
              {category}
            </span>
          ) : null}

          {category && campaignGoal ? <DotSeparator /> : null}

          {campaignGoal ? (
            <span className="min-w-0 truncate text-[0.875rem] font-medium leading-[1.25rem] text-[#4F4F4F]">
              {campaignGoal}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-[0.375rem] self-stretch">
          <div className="h-[0.25rem] w-[18.0625rem] max-w-full flex-1 overflow-hidden rounded-[1rem] bg-[var(--Light-Background-Subtle,#F9F9F9)]">
            <div
              className="h-full rounded-[1rem] bg-[#28A745] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <span className="shrink-0 text-[0.75rem] font-semibold leading-[1.25rem] text-black">
            {progress}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-[1rem]">
          <div className="min-w-0">
            <div className="mb-[0.5rem] truncate text-[1rem] font-normal leading-[1.5rem] text-[#969696]">
              Platform
            </div>

            <PlatformStack platforms={platforms} />
          </div>

          <div className="min-w-0">
            <div className="mb-[0.5rem] truncate text-[1rem] font-normal leading-[1.5rem] text-[#969696]">
              Milestones
            </div>

            <div className="flex min-w-0 items-center gap-[0.375rem]">
              <Files size={16} className="shrink-0 text-[#969696]" />
              <span className="truncate text-[1.25rem] font-medium leading-[1.75rem] text-[#1A1A1A]">
                {formatMilestones(milestoneCurrent, milestoneTotal)}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-[0.5rem] truncate text-[1rem] font-normal leading-[1.5rem] text-[#969696]">
              Budget
            </div>

            <div className="flex min-w-0 items-center gap-[0.375rem]">
              <Wallet size={16} className="shrink-0 text-[#969696]" />
              <span className="truncate text-[1.25rem] font-medium leading-[1.75rem] text-[#1A1A1A]">
                {formatBudget(budget)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E6E6E6] px-[1rem] py-[1.25rem]">
        <div className="flex items-center gap-[0.5rem]">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onManageCampaign?.();
            }}
            className={[
              "flex h-[2.375rem] flex-1 items-center justify-center",
              "rounded-[var(--Border-Radius-S,0.5rem)]",
              "border border-[var(--Light-Border-Subtle,#E6E6E6)] bg-white",
              "px-[1rem] text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]",
              "transition hover:bg-[#F7F7F7]",
            ].join(" ")}
          >
            Manage Campaign
          </button>

          <button
            type="button"
            aria-label="Open messages"
            disabled={!onMessageClick || isOpeningMessage}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleMessageClick();
            }}
            className={[
              "flex h-[2.375rem] w-[2.375rem] items-center justify-center",
              "rounded-[var(--Border-Radius-S,0.5rem)]",
              "border border-[var(--Light-Border-Subtle,#E6E6E6)]",
              "bg-[var(--Light-Background-Primary,#FFF)]",
              "p-[0.6875rem] text-[#1A1A1A]",
              "transition hover:bg-[#F7F7F7]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            <EnvelopeOpen
              size={18}
              className={isOpeningMessage ? "animate-pulse" : undefined}
            />
          </button>
        </div>

        {footerNote ? (
          <p className="mt-[0.75rem] text-center text-[0.875rem] font-normal leading-[1.25rem] text-[#969696]">
            {footerNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}