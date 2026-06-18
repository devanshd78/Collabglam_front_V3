"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileMinus,
  Users as UsersIcon,
  PaperPlaneTilt,
  DotsThree,
} from "@phosphor-icons/react";

const cx = (...c: Array<string | undefined | null | false>) =>
  c.filter(Boolean).join(" ");

export type StatusVariant =
  | "active"
  | "paused"
  | "draft"
  | "expired"
  | "scheduled"
  | "completed";

export type ListCardMetric = {
  id: string;
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
};

export type ListCardProps = {
  logoSrc?: string;
  logoAlt?: string;
  logoImages?: string[];

  name: string;
  categoryTag?: string;
  badges?: string[];

  metrics?: ListCardMetric[];

  statusLabel?: string;
  statusVariant?: StatusVariant;
  showStatusChevron?: boolean;
  onStatusClick?: () => void;

  actionSlot?: React.ReactNode;
  menuSlot?: React.ReactNode | false | null;

  showMoreButton?: boolean;
  onMoreClick?: () => void;

  secondaryText?: string;
  className?: string;

  onClick?: () => void;

  disabled?: boolean;
  disabledTitle?: string;
  overlayLabel?: string;
};

export type ListCardViewItem = ListCardProps & { key: React.Key };

export type ListCardViewProps = {
  items?: ListCardViewItem[];
  emptyState?: React.ReactNode;
  className?: string;
};

function YoutubePlatformIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex box-border h-[22px] w-[22px] aspect-square shrink-0 items-center justify-center gap-7 rounded-[40px] border border-[#E6E6E6] bg-white px-[7px] py-[8px]"
    >
      <img
        src="/logos_youtube-icon.svg"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}
export const MetricIcons = {
  Platform: <YoutubePlatformIcon />,
  Contract: <FileMinus size={16} weight="regular" />,
  Influencer: <UsersIcon size={16} weight="regular" />,
  Email: <PaperPlaneTilt size={16} weight="regular" />,
};

function getMetricIconById(id: string) {
  const key = id.trim().toLowerCase();
  if (key === "platform") return MetricIcons.Platform;
  if (key === "contract") return MetricIcons.Contract;
  if (key === "influencer") return MetricIcons.Influencer;
  if (key === "email") return MetricIcons.Email;
  return null;
}

function normalizeStatusVariant(variant: string): StatusVariant {
  const v = String(variant || "").trim().toLowerCase();

  if (v === "active") return "active";
  if (v === "paused") return "paused";
  if (v === "draft") return "draft";
  if (v === "scheduled") return "scheduled";
  if (v === "completed" || v === "complete") return "completed";
  if (v === "expired") return "expired";

  return "draft";
}

function statusPillBg(variant: StatusVariant | string) {
  switch (normalizeStatusVariant(variant)) {
    case "active":
      return "bg-[#BCE4C5]";
    case "paused":
      return "bg-[#F5C6CB]";
    case "draft":
      return "bg-[#E0E0E0]";
    case "scheduled":
      return "bg-[#BDD7F5]";
    case "completed":
      return "bg-[#FAD6C0]";
    case "expired":
    default:
      return "bg-[#E0E0E0]";
  }
}

function statusDotBg(variant: StatusVariant | string) {
  switch (normalizeStatusVariant(variant)) {
    case "active":
      return "bg-[#28A745]";
    case "paused":
      return "bg-[#DC3545]";
    case "draft":
      return "bg-[#9E9E9E]";
    case "scheduled":
      return "bg-[#4A90D9]";
    case "completed":
      return "bg-[#F07B3F]";
    case "expired":
    default:
      return "bg-[#9E9E9E]";
  }
}

function MoreDotsButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[0.5rem]",
        "inline-flex items-center justify-center",
        "border border-border bg-background text-muted-foreground shadow-none",
        "hover:text-tx-secondary",
        // ✅ responsive sizing
        "h-[2.85rem] w-[2.78rem]",
        "max-[520px]:h-9 max-[520px]:w-9"
      )}
      aria-label="More options"
    >
      <DotsThree size={18} weight="bold" />
    </button>
  );
}

function MetricItem({ id, label, value, icon }: ListCardMetric) {
  const iconNode = icon ?? getMetricIconById(id);

  return (
    <div className="min-w-0 flex flex-col items-center justify-center gap-0.5 text-center">
      {/* ✅ minimal clamp for small screens (labels) */}
      <div
        className={cx(
          "w-full min-w-0 truncate text-muted-foreground",
          "leading-5",
          "text-[clamp(0.72rem,0.68rem+0.18vw,0.86rem)]",
          "max-[520px]:leading-4 max-[520px]:text-[clamp(0.66rem,0.62rem+0.16vw,0.76rem)]"
        )}
        title={typeof label === "string" ? label : undefined}
      >
        {label}
      </div>

      <div className="flex min-w-0 items-center justify-center gap-2 max-[520px]:gap-1.5">
        {iconNode ? (
          <span className="inline-flex shrink-0 items-center justify-center text-muted-foreground">
            {iconNode}
          </span>
        ) : null}

        {/* ✅ minimal clamp for small screens (values) */}
        <span
          className={cx(
            "min-w-0 truncate font-medium text-tx-primary",
            "leading-5",
            "text-[clamp(0.78rem,0.72rem+0.18vw,0.95rem)]",
            "max-[520px]:leading-4 max-[520px]:text-[clamp(0.7rem,0.66rem+0.16vw,0.84rem)]"
          )}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * ✅ Key fix for your screenshot:
 * These column sizes fit inside a 1074px card without crushing the center box.
 * (Same layout, just better proportions.)
 */
const WRAP_BASE =
  "w-full rounded-[1.5rem] border border-border bg-card " +
  "p-5 max-[520px]:p-3";

const WRAP_GRID =
  "grid grid-cols-1 gap-4 " +
  "min-[900px]:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)_minmax(0,24rem)] " +
  "min-[900px]:items-center min-[900px]:gap-4";

export function ListCard({
  logoSrc,
  logoAlt = "Logo",
  logoImages,
  name,
  categoryTag,
  badges,
  metrics = [],
  statusLabel = "Active",
  statusVariant = "active",
  showStatusChevron = true,
  onStatusClick,
  actionSlot,
  menuSlot,
  showMoreButton = true,
  onMoreClick,
  secondaryText,
  className,
  onClick,
  disabled = false,
  disabledTitle,
  overlayLabel,
}: ListCardProps) {
  const StatusTag = (onStatusClick ? "button" : "div") as "button" | "div";

  const hoverList = useMemo(() => {
    const list = (logoImages ?? []).filter(Boolean);
    const unique = Array.from(new Set(list));
    return logoSrc ? unique.filter((u) => u !== logoSrc) : unique;
  }, [logoImages, logoSrc]);

  const baseSrc = logoSrc ?? hoverList[0] ?? "";

  const [isHover, setIsHover] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const activeSrc =
    isHover && hoverList.length > 0
      ? hoverList[hoverIdx % hoverList.length]
      : baseSrc;

  const clearTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const onEnter = () => {
    if (!hoverList.length) return;
    setIsHover(true);
    setHoverIdx(0);

    if (hoverList.length > 1) {
      clearTimer();
      intervalRef.current = window.setInterval(
        () => setHoverIdx((p) => p + 1),
        1200
      );
    }
  };

  const onLeave = () => {
    clearTimer();
    setIsHover(false);
    setHoverIdx(0);
  };

  useEffect(() => () => clearTimer(), []);

  const editNode = menuSlot ? menuSlot : null;
  const dotsNode = showMoreButton ? <MoreDotsButton onClick={onMoreClick} /> : null;
  const resolvedBadges = useMemo(() => {
    if (badges?.length) return badges.filter(Boolean);
    return categoryTag ? [categoryTag] : [];
  }, [badges, categoryTag]);

  const isClickable = Boolean(onClick) && !disabled;

  const isInnerInteractive = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
      target.closest(
        "button,a,input,textarea,select,label,[role='button'],[data-no-card-click='true']"
      )
    );
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isClickable || isInnerInteractive(e.target)) return;
    onClick?.();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isInnerInteractive(e.target)) return;

    e.preventDefault();
    onClick?.();
  };

  return (
    <div
      className={cx(
        "relative",
        isClickable && "group cursor-pointer",
        disabled && "cursor-pointer"
      )}
      title={disabled ? disabledTitle : undefined}
      aria-disabled={disabled || undefined}
      role={isClickable ? "link" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div
        className={cx(
          WRAP_BASE,
          WRAP_GRID,
          "transition-all duration-200 ease-out",
          isClickable &&
          "group-hover:bg-shuttle/10 group-hover:border-shuttle/30 group-hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
          className,
          disabled && "pointer-events-none select-none blur-[3px] opacity-60"
        )}
      >
        {/* LEFT */}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3 max-[520px]:gap-2.5">
            <div
              className={cx(
                "shrink-0 overflow-hidden rounded-[0.75rem] bg-neutral-900",
                "h-[5rem] w-[5.25rem]",
                "max-[520px]:h-[4.25rem] max-[520px]:w-[4.25rem]"
              )}
              aria-label={logoAlt}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {activeSrc ? (
                <img
                  className="h-full w-full object-cover transition-opacity duration-300"
                  src={activeSrc}
                  alt={logoAlt}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[0.75rem] text-white/85">
                  Logo
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div
                  className={cx(
                    "min-w-0 line-clamp-2 break-words font-semibold text-tx-primary",
                    "leading-snug",
                    "text-[clamp(0.95rem,0.9rem+0.25vw,1.12rem)]",
                    "max-[520px]:text-[clamp(0.86rem,0.82rem+0.22vw,1rem)]"
                  )}
                  title={name}
                >
                  {name}
                </div>

                {resolvedBadges.length ? (
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 max-[520px]:gap-1.5">
                    {resolvedBadges.map((badge) => {
                      const isAdminBadge = badge.trim().toLowerCase() === "by admin";
                      const isManagedBadge =
                        badge.trim().toLowerCase() === "fully managed";

                      return (
                        <span
                          key={badge}
                          title={badge}
                          className={cx(
                            "inline-flex min-w-0 items-center justify-center truncate rounded-full px-2",
                            "h-6 text-[clamp(0.7rem,0.66rem+0.16vw,0.78rem)]",
                            "max-[520px]:h-5 max-[520px]:px-2 max-[520px]:text-[0.68rem]",
                            isManagedBadge
                              ? "border border-[#8F6B00] bg-[#B8860B] text-white"
                              : isAdminBadge
                                ? "bg-[#EEF4FF] text-[#2F5BFF]"
                                : "bg-brand-50 text-neutral-750"
                          )}
                        >
                          {badge}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="w-full min-[900px]:flex min-[900px]:justify-center">
          <div
            className={cx(
              "w-full rounded-[0.8125rem] border border-border",
              "px-4 py-3 max-[520px]:px-3 max-[520px]:py-2.5",
              "grid grid-cols-4",
              "gap-3 max-[520px]:gap-2",
              "max-[380px]:grid-cols-2",
              "max-w-[32rem]"
            )}
            role="list"
            aria-label="Campaign stats"
          >
            {metrics.map((m) => (
              <MetricItem key={m.id} {...m} />
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="min-w-0 min-[900px]:justify-self-end">
          <div className="flex min-w-0 items-center justify-between gap-4 min-[900px]:justify-end max-[980px]:flex-col max-[980px]:items-end">
            <StatusTag
              className={cx(
                "inline-flex items-center gap-2",
                onStatusClick ? "cursor-pointer border-0 bg-transparent p-0" : ""
              )}
              onClick={onStatusClick}
              type={onStatusClick ? "button" : undefined}
              aria-label="Status"
            >
              <span
                className={cx(
                  "inline-flex items-center rounded-full p-0.5",
                  statusPillBg(statusVariant)
                )}
              >
                <span className={cx("h-2 w-2 rounded-full", statusDotBg(statusVariant))} />
              </span>

              <span
                className={cx(
                  "min-w-0 truncate font-medium text-muted-foreground",
                  "leading-6",
                  "text-[clamp(0.86rem,0.82rem+0.16vw,0.96rem)]",
                  "max-[520px]:leading-5 max-[520px]:text-[0.8rem]"
                )}
                title={statusLabel}
              >
                {statusLabel}
              </span>
            </StatusTag>

            <div className="flex min-w-0 flex-col gap-2 max-[520px]:gap-1.5">
              <div className="flex min-w-0 items-center gap-2 max-[520px]:gap-1.5">
                <div className="min-w-0 flex-1">{actionSlot}</div>

                <div className="flex shrink-0 items-center gap-2 max-[520px]:gap-1.5">
                  {editNode ? <div className="shrink-0">{editNode}</div> : null}
                  {dotsNode ? <div className="shrink-0">{dotsNode}</div> : null}
                </div>
              </div>

              {secondaryText ? (
                <div
                  className={cx(
                    "text-muted-foreground truncate",
                    "leading-4",
                    "text-[clamp(0.7rem,0.66rem+0.14vw,0.82rem)]",
                    "max-[520px]:text-[0.7rem]",
                    "min-[900px]:text-right"
                  )}
                  title={secondaryText}
                >
                  {secondaryText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {disabled ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.5rem] bg-black/15 backdrop-blur-[2px]">
          <div className="rounded-full border border-white/20 bg-black/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow">
            {overlayLabel ?? "Locked"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ListCardView({
  items = [],
  emptyState,
  className,
}: ListCardViewProps) {
  return (
    <div className={cx("flex w-full flex-col gap-3.5", className)}>
      {items.length ? (
        items.map(({ key, ...it }) => <ListCard key={key} {...it} />)
      ) : (
        <div className="rounded-[0.75rem] border border-dashed border-border p-4 text-muted-foreground">
          {emptyState ?? "No items found."}
        </div>
      )}
    </div>
  );
}
