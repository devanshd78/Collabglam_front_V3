"use client";

import * as React from "react";
import { CheckCircle, Trash } from "@phosphor-icons/react";
import { createPortal } from "react-dom";

export type InfluencerDiscoverCardProps = {
  title: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  brandName?: string;
  brandLogoUrl?: string;
  campaignGoal?: string;
  category?: string;
  ageLabel?: string;
  gender?: string;
  countries?: string[];
  budget?: number;
  viewedCount?: number;
  applicantAvatars?: Array<
    | string
    | {
      profilePic?: string;
      profilepic?: string;
      profileImage?: string;
      profileimage?: string;
      profilePicture?: string;
      avatar?: string;
      image?: string;
      name?: string;
      fullName?: string;
      username?: string;
      influencerName?: string;
      displayName?: string;
    }
  >;

  onCardClick?: () => void;
  onApply?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  onDeleteApplied?: () => void | Promise<void>;
  onMore?: () => void;

  isApplying?: boolean;
  hasApplied?: boolean;

  /** Use true only for Applied campaign listing */
  isAppliedCard?: boolean;
  appliedDate?: string;

  /** Use true only for Direct Invitation listing */
  isInvitationCard?: boolean;
  receivedDate?: string;
  brandActiveText?: string;
  invitationStatus?: string;

  className?: string;
};

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatBudget(value?: number) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `$${Math.round(amount)}`;
}

function formatAppliedDate(value?: string) {
  if (!value) return "Applied";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Applied";

  return `Applied on ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date)}`;
}

function formatReceivedDate(value?: string) {
  if (!value) return "Received";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Received";

  return `Received on ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date)}`;
}

function getBrandInitials(name?: string) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "AD";

  const first = words[0]?.[0] || "";
  const second = words[1]?.[0] || "";

  return `${first}${second}`.toUpperCase();
}

function IconAge(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M11.3 7.5c1.1 0 2.1.6 2.7 1.6"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M2 9.1a3.3 3.3 0 0 1 2.7-1.6"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M8 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"
        stroke="currentColor"
      />
      <path
        d="M4.6 13.2A3.9 3.9 0 0 1 8 11.3c1.4 0 2.7.7 3.4 1.9"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconMale(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M6.2 9.8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.4 3.6 12.2 0.8M9.4 0.8h2.8v2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDots(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconCaretLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCaretRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CountryDot() {
  return (
    <span
      className="mx-[0.375rem] inline-block h-[0.125rem] w-[0.125rem] rounded-full bg-[var(--Light-Icon-Subtle,#969696)] align-middle"
      aria-hidden="true"
    />
  );
}

type ApplicantAvatar =
  | string
  | {
    profilePic?: string;
    profilepic?: string;
    profileImage?: string;
    profileimage?: string;
    profilePicture?: string;
    avatar?: string;
    image?: string;
    name?: string;
    fullName?: string;
    username?: string;
    influencerName?: string;
    displayName?: string;
  };

function getApplicantImage(item: ApplicantAvatar) {
  if (!item) return "";

  if (typeof item === "string") return item;

  return (
    item.profileimage ||
    item.profileImage ||
    item.profilePic ||
    item.profilepic ||
    item.profilePicture ||
    item.avatar ||
    item.image ||
    ""
  );
}

function getApplicantInitial(item: ApplicantAvatar, fallbackIndex: number) {
  if (!item || typeof item === "string") {
    return String.fromCharCode(65 + fallbackIndex);
  }

  const name =
    item.fullName ||
    item.name ||
    item.username ||
    item.influencerName ||
    item.displayName ||
    "";

  const firstLetter = name.trim().charAt(0);

  if (!firstLetter) {
    return String.fromCharCode(65 + fallbackIndex);
  }

  return firstLetter.toUpperCase();
}

function AvatarStack({
  count = 0,
  avatars = [],
}: {
  count?: number;
  avatars?: ApplicantAvatar[];
}) {
  const totalCount = Math.max(0, Number(count || 0));
  const visibleAvatars = avatars.filter(Boolean).slice(0, 4);
  const fallbackSlots = Math.max(
    0,
    Math.min(4, totalCount) - visibleAvatars.length
  );

  const displayItems: ApplicantAvatar[] = [
    ...visibleAvatars,
    ...Array.from({ length: fallbackSlots }, (_, index) => ({
      name: String.fromCharCode(65 + visibleAvatars.length + index),
    })),
  ];

  const remainingCount = Math.max(totalCount - 4, 0);

  if (totalCount <= 0) return null;

  return (
    <div className="flex items-center">
      {displayItems.map((item, index) => {
        const image = getApplicantImage(item);
        const initial = getApplicantInitial(item, index);

        return (
          <div
            key={`${image || initial}-${index}`}
            className={cn(
              "grid h-[1.75rem] w-[1.75rem] place-items-center overflow-hidden rounded-[2rem]",
              "border-2 border-white bg-[#EDEDED]",
              "text-[0.625rem] font-semibold text-[#1A1A1A]",
              index > 0 && "-ml-2"
            )}
            title={
              typeof item === "object"
                ? item.fullName || item.name || item.username
                : undefined
            }
          >
            {image ? (
              <img
                src={image}
                alt={
                  typeof item === "object"
                    ? item.fullName || item.name || item.username || "Influencer"
                    : "Influencer"
                }
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              initial
            )}
          </div>
        );
      })}

      {remainingCount > 0 ? (
        <div
          className={cn(
            "-ml-2 grid h-[1.75rem] min-w-[1.75rem] place-items-center rounded-[2rem]",
            "border-2 border-white bg-[#F2F2F2] px-1",
            "text-[0.75rem] font-semibold text-[#1A1A1A]"
          )}
        >
          +{remainingCount}
        </div>
      ) : null}
    </div>
  );
}

export default function CampaignCard({
  title,
  description,
  imageUrl,
  imageUrls,
  brandName,
  brandLogoUrl,
  campaignGoal,
  category,
  ageLabel,
  gender,
  countries = [],
  budget,
  viewedCount = 0,
  applicantAvatars = [],
  onCardClick,
  onApply,
  onSave,
  onDeleteApplied,
  onMore,
  isApplying = false,
  hasApplied = false,
  isAppliedCard = false,
  appliedDate,
  isInvitationCard = false,
  receivedDate,
  brandActiveText,
  invitationStatus,
  className,
}: InfluencerDiscoverCardProps) {
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  const initials = getBrandInitials(brandName);
  const isAcceptedInvitation =
    isInvitationCard &&
    String(invitationStatus || "").trim().toLowerCase() === "accepted";
  const cleanCountries = countries.filter(Boolean).slice(0, 3);
  const cleanDescription = String(description || "").trim();
  const hasDescription = Boolean(cleanDescription);

  const DESCRIPTION_LIMIT = 105;
  const hasMoreDescription = cleanDescription.length > DESCRIPTION_LIMIT;

  const visibleDescription =
    !descriptionExpanded && hasMoreDescription
      ? cleanDescription.slice(0, DESCRIPTION_LIMIT).trimEnd()
      : cleanDescription;

  const allImages = React.useMemo(() => {
    const list = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];

    if (list.length > 0) return list;
    if (imageUrl) return [imageUrl];

    return [];
  }, [imageUrls, imageUrl]);

  const activeImage = allImages[activeImageIndex] || "";
  const hasMultipleImages = allImages.length > 1;

  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [allImages.length]);

  const goToPrevImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  };

  const goToNextImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveImageIndex((prev) =>
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <article
      onClick={onCardClick}
      onKeyDown={(event) => {
        if (!onCardClick) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick();
        }
      }}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      className={cn(
"relative flex w-[22.5rem] max-w-full min-w-0 max-h-[31.5rem] flex-col overflow-hidden rounded-[1.5rem]",
        "border border-[var(--Light-Border-Subtle,#E6E6E6)] bg-white",
        onCardClick &&
        "cursor-pointer transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <div className="relative h-[11rem] max-h-[11rem] w-full shrink-0 overflow-visible bg-[#F2F2F2]">
        <div className="h-full w-full overflow-hidden rounded-t-[1.5rem]">
          {activeImage ? (
            <img
              src={activeImage}
              alt={title || "Campaign image"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={goToPrevImage}
              aria-label="Previous image"
              className={[
                "absolute left-[1rem] top-1/2 -translate-y-1/2",
                "flex h-[2rem] w-[2rem] items-center justify-center gap-[0.625rem]",
                "rounded-[2.5rem] bg-[var(--Light-Background-Primary,#FFF)] p-[0.25rem]",
                "text-[#1A1A1A]",
                "shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]",
                "transition hover:scale-105",
              ].join(" ")}
            >
              <IconCaretLeft />
            </button>

            <button
              type="button"
              onClick={goToNextImage}
              aria-label="Next image"
              className={[
                "absolute right-[1rem] top-1/2 -translate-y-1/2",
                "flex h-[2rem] w-[2rem] items-center justify-center gap-[0.625rem]",
                "rounded-[2.5rem] bg-[var(--Light-Background-Primary,#FFF)] p-[0.25rem]",
                "text-[#1A1A1A]",
                "shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]",
                "transition hover:scale-105",
              ].join(" ")}
            >
              <IconCaretRight />
            </button>
          </>
        ) : null}

        {campaignGoal ? (
          <div className="absolute right-[1rem] top-[1rem]">
            <span
              className={[
                "flex items-center justify-center self-stretch",
                "rounded-[var(--Corner-radius-16,1rem)]",
                "bg-black/45 px-[0.375rem] py-[0.25rem]",
                "text-[0.875rem] font-semibold leading-[1.25rem] text-white",
                "backdrop-blur-[8px]",
              ].join(" ")}
            >
              {campaignGoal}
            </span>
          </div>
        ) : null}

        <div
          className={[
            "absolute left-[1.5rem] bottom-[-2rem]",
            "flex h-[4rem] w-[4rem] flex-col items-center justify-center",
            "overflow-hidden rounded-[0.625rem] border-2 border-[#F2F2F2] bg-white",
            "text-[1.5rem] font-semibold leading-none text-[#1A1A1A]",
          ].join(" ")}
        >
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
      </div>

      <div
        className={[
          "flex max-h-[20.5rem] flex-1 flex-col items-start justify-start self-stretch overflow-hidden",
          "gap-[0.75rem] px-[1.25rem] pb-[1.75rem] pt-[2.5rem]",
        ].join(" ")}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-[0.5rem]">
            {category ? (
              <span
                className={[
                  "flex items-center justify-center rounded-[1rem]",
                  "bg-[#F7F7F7] px-[0.375rem] py-[0.25rem]",
                  "text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]",
                  "whitespace-nowrap",
                ].join(" ")}
                title={category}
              >
                {category}
              </span>
            ) : null}

            {ageLabel ? (
              <span
                className={[
                  "flex items-center justify-center gap-[0.25rem] rounded-[1rem]",
                  "bg-[#F7F7F7] px-[0.25rem] py-[0.25rem]",
                  "text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]",
                  "whitespace-nowrap",
                ].join(" ")}
              >
                <IconAge className="shrink-0" />
                {ageLabel}
              </span>
            ) : null}

            {gender ? (
              <span
                className={[
                  "flex h-[1.5rem] w-[4.125rem] items-center justify-center gap-[0.25rem]",
                  "rounded-[1.25rem] bg-white",
                  "text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]",
                ].join(" ")}
              >
                <IconMale className="shrink-0" />
                {gender}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMore?.();
            }}
            aria-label="More"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#1A1A1A] hover:bg-[#F2F2F2]"
          >
            <IconDots />
          </button>
        </div>

        <div className="flex w-full flex-col items-start gap-[0.5rem]">
          <h3
            className={[
              "line-clamp-1 w-full overflow-hidden text-ellipsis",
              "font-[var(--Font-Family-Inter,Inter)]",
              "text-[1rem] font-semibold leading-[1.5rem] tracking-[0]",
              "text-[var(--Text-Primary,#1A1A1A)]",
            ].join(" ")}
            title={title}
          >
            {title || "—"}
          </h3>

          {hasDescription ? (
            <div className="flex w-full flex-col items-start gap-[0.25rem]">
              <p
                className={[
                  "w-full",
                  "font-[Inter] text-[0.75rem] font-normal leading-[1rem]",
                  "text-[var(--Light-Text-Tertiary,#B8B8B8)]",
                  "break-words",
                  descriptionExpanded
                    ? "whitespace-normal"
                    : "line-clamp-2 overflow-hidden",
                ].join(" ")}
                title={cleanDescription}
              >
                {visibleDescription}

                {!descriptionExpanded && hasMoreDescription ? (
                  <>
                    <span>...</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDescriptionExpanded(true);
                      }}
                      className={[
                        "ml-1 inline text-right",
                        "overflow-hidden text-ellipsis",
                        "font-[Inter] text-[0.75rem] font-medium leading-[1rem]",
                        "text-[var(--Light-Text-Secondary,#969696)]",
                      ].join(" ")}
                    >
                      view more
                    </button>
                  </>
                ) : null}
              </p>

              {descriptionExpanded && hasMoreDescription ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setDescriptionExpanded(false);
                  }}
                  className={[
                    "self-end text-right",
                    "font-[Inter] text-[0.75rem] font-medium leading-[1rem]",
                    "text-[var(--Light-Text-Secondary,#969696)]",
                  ].join(" ")}
                >
                  view less
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {cleanCountries.length > 0 ? (
          <div
            className={[
              "flex items-center self-stretch rounded-[1rem]",
              "px-0 py-[0.5rem] pr-[0.5rem]",
              "text-[0.875rem] font-medium leading-[1.25rem] text-[#1A1A1A]",
            ].join(" ")}
            title={cleanCountries.join(" · ")}
          >
            <IconPin className="mr-[0.5rem] h-4 w-4 shrink-0 text-[#1A1A1A]" />

            <span className="min-w-0 truncate">
              {cleanCountries.map((country, index) => (
                <React.Fragment key={`${country}-${index}`}>
                  {index > 0 ? <CountryDot /> : null}
                  <span>{country}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        ) : null}

        {isAppliedCard || isInvitationCard ? (
          <div className="flex w-full items-center justify-between gap-[0.75rem]">
            <div
              className={[
                "flex w-fit items-center justify-center gap-[0.25rem]",
                "rounded-[var(--Corner-radius-16,1rem)]",
                "border border-[var(--Light-Border-Subtle,#E6E6E6)]",
                "px-[0.25rem] py-[0.25rem]",
              ].join(" ")}
            >
              <CheckCircle
                weight="fill"
                className="h-[0.875rem] w-[0.875rem] text-[#28A745]"
              />

              <span className="text-[0.75rem] font-medium leading-[1rem] text-[#1A1A1A]">
                {isInvitationCard
                  ? formatReceivedDate(receivedDate)
                  : formatAppliedDate(appliedDate)}
              </span>
            </div>

            {isInvitationCard && brandActiveText ? (
              <span className="min-w-0 truncate text-right text-[0.75rem] font-normal leading-[1rem] text-[#969696]">
                {brandActiveText}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex w-full items-center gap-[1rem]">
            <AvatarStack count={viewedCount} avatars={applicantAvatars} />

            <span
              className={[
                "flex items-center justify-center rounded-[1.25rem]",
                "px-[0.25rem] py-[0.25rem]",
                "text-center font-[Inter] text-[0.625rem] font-medium leading-normal",
                "text-[var(--Light-Text-Tertiary,#B8B8B8)]",
              ].join(" ")}
            >
              Viewed
            </span>
          </div>
        )}

        <div className="mt-auto w-full shrink-0">
          <div className="h-px w-full bg-[#E6E6E6]" />

          <div className="flex w-full items-center pt-[0.75rem]">
            <div
              className={[
                "line-clamp-1 overflow-hidden text-ellipsis",
                "font-[var(--Font-Family-Inter,Inter)]",
                "text-[1.25rem] font-semibold leading-[1.75rem] tracking-[0]",
                "text-[var(--Text-Primary,#1A1A1A)]",
              ].join(" ")}
            >
              {formatBudget(budget)}
            </div>

            <div className="ml-auto flex items-center gap-[0.5rem]">
              {isAppliedCard || isInvitationCard ? (
                <>
                  <button
                    type="button"
                    aria-label={
                      isInvitationCard
                        ? "Discard invitation"
                        : "Remove applied campaign"
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      if (isInvitationCard) {
                        onSave?.();
                        return;
                      }

                      onDeleteApplied?.();
                    }}
                    className={[
                      "flex h-[2rem] items-center justify-center",
                      "rounded-[var(--Border-Radius-S,0.5rem)] px-[0.5rem]",
                      "text-[#1A1A1A]",
                      "transition hover:bg-[#F7F7F7]",
                    ].join(" ")}
                  >
                    <Trash size={16} />
                  </button>

                  {isAppliedCard || isAcceptedInvitation ? (
                    <button
                      type="button"
                      disabled
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      className={[
                        "flex h-[2rem] w-[5rem] items-center justify-center",
                        "rounded-[var(--Border-Radius-S,0.5rem)]",
                        "bg-[var(--Light-Background-Disabled,#F5F5F5)]",
                        "px-[0.5rem]",
                        "text-[0.875rem] font-semibold leading-[1.25rem]",
                        "text-[var(--Light-Text-Tertiary,#B8B8B8)]",
                        "disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      {isAcceptedInvitation ? "Accepted" : "Applied"}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSave?.();
                    }}
                    className={[
                      "flex h-[2.5rem] min-w-[4.5rem] items-center justify-center",
                      "rounded-[0.75rem] px-[0.5rem]",
                      "text-[0.875rem] font-semibold leading-[1.25rem] text-[#1A1A1A]",
                      "hover:bg-[#F2F2F2]",
                    ].join(" ")}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    disabled={isApplying || hasApplied}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onApply?.();
                    }}
                    className={[
                      "flex h-[2.5rem] min-w-[5.25rem] items-center justify-center",
                      "rounded-[0.75rem] bg-[#1A1A1A] px-[0.5rem]",
                      "text-[0.875rem] font-semibold leading-[1.25rem] text-white",
                      "hover:bg-black",
                      "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#1A1A1A]",
                    ].join(" ")}
                  >
                    {isApplying ? "Applying..." : hasApplied ? "Applied" : "Apply"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}