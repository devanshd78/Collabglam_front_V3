"use client";

import * as React from "react";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Check, QuestionMark, X } from "@phosphor-icons/react";

export type PlatformType = "instagram" | "youtube" | "tiktok";

export type ApplicantDecisionField =
  | "isShortlisted"
  | "isUndicided"
  | "isRejected";

export type InfluencerRow = {
  id: string;
  profile: {
    name: string;
    handle?: string;
    avatarUrl?: string;
    url?: string;
  };
  category: string;
  platforms?: Array<{
    platform: PlatformType;
    followers: number;
  }>;
  followers?: number;
  engagement?: number;
  appliedDate: string;
  status?: string;
  budget?: string;
  contractId?: string;
  __source?: string;
  __raw?: any;
};

type BulkHeaderRenderer = (args: {
  selectedIds: string[];
  selectedRows: InfluencerRow[];
  clearSelection: () => void;
}) => React.ReactNode;

type RowRenderer = (row: InfluencerRow) => React.ReactNode;

type InfluencerTableProps = {
  rows: InfluencerRow[];
  onActionClick?: (row: InfluencerRow, action: ApplicantDecisionField) => void;
  variant?: "default" | "shortlisted" | "recommended" | "active";
  renderRecommendedActions?: RowRenderer;
  renderShortlistedActions?: RowRenderer;
  renderActiveActions?: RowRenderer;
  renderStatus?: RowRenderer;
  renderDefaultActions?: (row: InfluencerRow) => React.ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  isRowSelectable?: (row: InfluencerRow) => boolean;
  renderBulkHeader?: BulkHeaderRenderer;
  onClearSelection?: () => void;
  hideAppliedDate?: boolean;
};

const headerTextStyle: React.CSSProperties = {
  color: "var(--Text-Primary, #1A1A1A)",
  fontFamily: "var(--Font-Family-Inter, Inter)",
  fontSize: "var(--Font-Size-14, 0.875rem)",
  fontStyle: "normal",
  fontWeight: "var(--Font-Weight-Semi-Bold, 600)" as any,
  lineHeight: "var(--Line-Height-20, 1.25rem)",
  letterSpacing: "var(--Letter-Spacing-0, 0)",
};

function HeaderCarets() {
  const iconClass = "h-3 w-3 text-[var(--stone,#343330)]";

  return (
    <span className="flex flex-col items-center leading-none">
      <ChevronUp className={iconClass} strokeWidth={3} />
      <ChevronDown className={iconClass} strokeWidth={3} />
    </span>
  );
}

function formatCompact(n: number) {
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (abs >= 1_000) {
    return `${Math.round(n / 1_000)}K`;
  }

  return `${n}`;
}

function getPlatformRows(r: InfluencerRow) {
  if (r.platforms?.length) return r.platforms;

  const baseFollowers = r.followers ?? 0;

  const ig = Math.round(baseFollowers * 0.55);
  const yt = Math.round(baseFollowers * 0.25);
  const tt = Math.max(0, baseFollowers - ig - yt);

  return [
    { platform: "instagram" as const, followers: ig },
    { platform: "youtube" as const, followers: yt },
    { platform: "tiktok" as const, followers: tt },
  ];
}

function formatDDMMYY(input: string) {
  const cleanInput = String(input || "")
    .replace(/^applied\s+/i, "")
    .trim();

  if (!cleanInput || cleanInput === "—") return "—";

  const d = new Date(cleanInput);

  if (Number.isNaN(d.getTime())) return cleanInput;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);

  return `${dd}/${mm}/${yy}`;
}

function normalizeExternalUrl(url?: string) {
  const text = String(url || "").trim();
  if (!text) return "";
  if (text.toLowerCase().startsWith("http://")) return text;
  if (text.toLowerCase().startsWith("https://")) return text;
  return `https://${text}`;
}

function cleanHandle(handle?: string) {
  return String(handle || "").trim().replace(/^@+/, "");
}

function getPlatformProfileUrl(row: InfluencerRow) {
  const directUrl = normalizeExternalUrl(row.profile.url);
  if (directUrl) return directUrl;

  const platform = row.platforms?.[0]?.platform;
  const handle = cleanHandle(row.profile.handle);

  if (!platform || !handle || handle === "—") return "";

  if (platform === "youtube") return `https://www.youtube.com/@${handle}`;
  if (platform === "instagram") return `https://www.instagram.com/${handle}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;

  return "";
}

function openExternalProfile(row: InfluencerRow) {
  const url = getPlatformProfileUrl(row);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openMediakit(row: InfluencerRow) {
  window.open(`/mediakit/${row.id}`, "_blank", "noopener,noreferrer");
}

const PLATFORM_ICON_SRC: Record<PlatformType, string> = {
  instagram: "/skill-icons_instagram.svg",
  youtube: "/logos_youtube-icon.svg",
  tiktok: "/ic_baseline-tiktok.svg",
};

function getInitials(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AvatarThumb({
  avatarUrl,
  name,
  sizeClass = "h-12 w-12",
}: {
  avatarUrl?: string;
  name?: string;
  sizeClass?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const initials = getInitials(name);
  const showImage = Boolean(avatarUrl) && !imgError;

  return showImage ? (
    <img
      src={avatarUrl}
      alt={name || "Avatar"}
      className={`${sizeClass} shrink-0 rounded-[0.5rem] border object-cover`}
      style={{
        borderColor:
          "var(--Light-Border-Border-stroke, rgba(255,255,255,0.30))",
      }}
      onError={() => setImgError(true)}
      draggable={false}
    />
  ) : (
    <div
      className={`${sizeClass} shrink-0 rounded-[0.5rem] border flex items-center justify-center`}
      style={{
        borderColor:
          "var(--Light-Border-Border-stroke, rgba(255,255,255,0.30))",
        background: "var(--Light-Background-Tertiary, #F3F4F6)",
        color: "var(--Light-Text-Primary, #1A1A1A)",
        fontFamily: "var(--Font-Family-Inter, Inter)",
        fontSize: "0.875rem",
        fontWeight: 600,
        lineHeight: "1rem",
      }}
      aria-label={name || "Avatar"}
    >
      {initials}
    </div>
  );
}

function PlatformBubble({ platform }: { platform: PlatformType }) {
  return (
    <span
      style={{
        display: "flex",
        width: "1.75rem",
        height: "1.75rem",
        padding: "0.5rem",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.625rem",
        aspectRatio: "1 / 1",
        borderRadius: "2.5rem",
        border: "1px solid var(--Light-Border-Subtle, #E6E6E6)",
        background: "var(--Light-Background-Primary, #FFF)",
        boxSizing: "border-box",
      }}
      aria-hidden="true"
    >
      <img
        src={PLATFORM_ICON_SRC[platform]}
        alt=""
        style={{ width: "1rem", height: "1rem" }}
        draggable={false}
      />
    </span>
  );
}

function PlatformOverlap({ platforms }: { platforms: PlatformType[] }) {
  const list = Array.from(new Set(platforms)).slice(0, 3);

  return (
    <div className="flex items-center justify-center">
      {list.map((p, idx) => (
        <div
          key={`${p}-${idx}`}
          style={{
            marginLeft: idx === 0 ? 0 : "-0.5rem",
            position: "relative",
            zIndex: 10 - idx,
          }}
        >
          <PlatformBubble platform={p} />
        </div>
      ))}
    </div>
  );
}

function PillTag({ text, title }: { text: string; title?: string }) {
  return (
    <div
      className="flex min-h-[1.75rem] items-center justify-center rounded-[1.25rem] px-3"
      style={{ background: "var(--Light-Text-PrimaryInverse,#F9F9F9)" }}
      title={title ?? text}
    >
      <span
        style={{
          color: "var(--Light-Text-Primary, #1A1A1A)",
          textAlign: "center",
          fontFamily: "var(--Font-Family-Inter, Inter)",
          fontSize: "var(--Font-Size-14, 0.875rem)",
          fontStyle: "normal",
          fontWeight: "var(--Font-Weight-Semi-Bold, 600)" as any,
          lineHeight: "var(--Line-Height-20, 1.25rem)",
          letterSpacing: "var(--Letter-Spacing-0, 0)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export function ActionGroup({
  onReject,
  onUndecided,
  onSelect,
  disabledButtons = {},
}: {
  onReject?: () => void;
  onUndecided?: () => void;
  onSelect?: () => void;
  disabledButtons?: {
    reject?: boolean;
    undecided?: boolean;
    select?: boolean;
  };
}) {
  const b = "var(--Light-Border-Primary,#D6D6D6)";

  return (
    <div className="inline-flex h-[3.375rem] w-fit items-stretch justify-center">
      <button
        type="button"
        disabled={disabledButtons.reject}
        className="flex h-full w-[3.3125rem] cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          borderTop: `1px solid ${b}`,
          borderBottom: `1px solid ${b}`,
          borderLeft: `1px solid ${b}`,
          borderRadius: "0.5rem 0 0 0.5rem",
        }}
        onMouseEnter={(e) => {
          if (!disabledButtons.reject) {
            e.currentTarget.style.background =
              "var(--Light-Background-Negative-Subtle, #F9CACA)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        aria-label="Reject"
        onClick={disabledButtons.reject ? undefined : onReject}
      >
        <X size={18} weight="bold" />
      </button>

      <button
        type="button"
        disabled={disabledButtons.select}
        className="flex h-full w-[3.3125rem] cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          borderTop: `1px solid ${b}`,
          borderBottom: `1px solid ${b}`,
          borderLeft: `1px solid ${b}`,
          borderRight: `1px solid ${b}`,
          borderRadius: "0 0.5rem 0.5rem 0",
        }}
        onMouseEnter={(e) => {
          if (!disabledButtons.select) {
            e.currentTarget.style.background = "var(--Success-50, #EAF6EC)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        aria-label="Selected"
        onClick={disabledButtons.select ? undefined : onSelect}
      >
        <Check size={18} weight="bold" />
      </button>
    </div>
  );
}

function RowXScroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        w-full overflow-x-auto overflow-y-hidden rounded-[0.75rem]
        scrollbar-none scrollbar-hide
      "
    >
      {children}
    </div>
  );
}

const DEFAULT_TABLE_GRID =
  "grid w-full grid-cols-[3rem_minmax(17rem,1.35fr)_minmax(13rem,1fr)_minmax(10rem,0.75fr)_minmax(8rem,0.65fr)_minmax(9rem,0.65fr)_minmax(26rem,1.25fr)]";

const DEFAULT_TABLE_GRID_ROW =
  "grid w-full min-w-[92rem] grid-cols-[3rem_minmax(17rem,1.35fr)_minmax(13rem,1fr)_minmax(10rem,0.75fr)_minmax(8rem,0.65fr)_minmax(9rem,0.65fr)_minmax(26rem,1.25fr)]";

const DEFAULT_TABLE_GRID_NO_APPLIED =
  "grid w-full grid-cols-[3rem_minmax(17rem,1.35fr)_minmax(13rem,1fr)_minmax(10rem,0.75fr)_minmax(8rem,0.65fr)_minmax(26rem,1.25fr)]";

const DEFAULT_TABLE_GRID_NO_APPLIED_ROW =
  "grid w-full min-w-[82rem] grid-cols-[3rem_minmax(17rem,1.35fr)_minmax(13rem,1fr)_minmax(10rem,0.75fr)_minmax(8rem,0.65fr)_minmax(26rem,1.25fr)]";

const colShort = {
  checkbox: "flex-none w-[3.5rem]",
  profile: "min-w-[16rem] flex-[3_1_0%] min-w-0",
  status: "min-w-[10rem] flex-[2.5_1_0%] min-w-0",
  platform: "min-w-[9rem] flex-[2.5_1_0%] min-w-0",
  budget: "min-w-[9rem] flex-[2.5_1_0%] min-w-0",
  date: "min-w-[10rem] flex-[2.5_1_0%] shrink-0",
  actions: "min-w-[31rem] flex-[4_1_0%] shrink-0",
};

function DefaultTable({
  rows,
  onActionClick,
  renderBulkHeader,
  renderActions,
  renderStatus,
  hideAppliedDate = false,
}: {
  rows: InfluencerRow[];
  onActionClick?: (row: InfluencerRow, action: ApplicantDecisionField) => void;
  renderBulkHeader?: BulkHeaderRenderer;
  renderActions?: RowRenderer;
  renderStatus?: RowRenderer;
  hideAppliedDate?: boolean;
}) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const headerGridClass = hideAppliedDate
    ? DEFAULT_TABLE_GRID_NO_APPLIED
    : DEFAULT_TABLE_GRID;

  const rowGridClass = hideAppliedDate
    ? DEFAULT_TABLE_GRID_NO_APPLIED_ROW
    : DEFAULT_TABLE_GRID_ROW;

  const selectedIdList = rows
    .filter((r) => Boolean(selected[r.id]))
    .map((r) => r.id);

  const selectedRows = rows.filter((r) => Boolean(selected[r.id]));
  const hasSelection = selectedIdList.length > 0;

  const clearSelection = () => {
    setSelected({});
  };

  const allChecked =
    rows.length > 0 && rows.every((r) => Boolean(selected[r.id]));

  const someChecked = rows.some((r) => Boolean(selected[r.id])) && !allChecked;

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};

    rows.forEach((r) => {
      next[r.id] = checked;
    });

    setSelected(next);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  return (
    <div className="flex w-full flex-col">
      {hasSelection && renderBulkHeader ? (
        <div className="mb-4">
          {renderBulkHeader({
            selectedIds: selectedIdList,
            selectedRows,
            clearSelection,
          })}
        </div>
      ) : (
        <div
          className={`${headerGridClass} h-14 items-center rounded-br-[0.75rem] rounded-bl-[0.75rem] rounded-tr-[0.75rem] bg-[var(--Light-Background-Neutral,#F2F2F2)]`}
        >
          <div className="flex h-14 items-center justify-center rounded-tl-[0.75rem]">
            <Checkbox
              className="cursor-pointer"
              checked={
                allChecked ? true : someChecked ? "indeterminate" : false
              }
              onCheckedChange={(v) => toggleAll(Boolean(v))}
              aria-label="Select all influencers"
            />
          </div>

          <div className="flex h-14 items-center justify-between px-4 py-[0.625rem]">
            <span style={headerTextStyle}>Profile</span>
            <HeaderCarets />
          </div>

          <div className="flex h-14 items-center justify-between px-4 py-[0.625rem]">
            <span style={headerTextStyle}>Category</span>
            <HeaderCarets />
          </div>

          <div className="flex h-14 items-center justify-between px-4 py-[0.625rem]">
            <span style={headerTextStyle}>Status</span>
            <HeaderCarets />
          </div>

          <div className="flex h-14 items-center justify-between px-4 py-[0.625rem]">
            <span style={headerTextStyle}>Followers</span>
            <HeaderCarets />
          </div>

          {!hideAppliedDate ? (
            <div className="flex h-14 items-center justify-between px-4 py-[0.625rem]">
              <span style={headerTextStyle}>Applied Date</span>
              <HeaderCarets />
            </div>
          ) : null}

          <div className="flex h-14 items-center justify-center px-4 py-[0.625rem]">
            <span style={headerTextStyle}>Action</span>
          </div>
        </div>
      )}

      <div className="mt-[2rem] w-full space-y-3">
        {rows.map((r) => {
          const plat = getPlatformRows(r);
          const appliedText = formatDDMMYY(r.appliedDate);
          const statusText = r.status ?? "Shortlisted";
          const externalProfileUrl = getPlatformProfileUrl(r);

          return (
            <RowXScroll key={r.id}>
              <div
                className={`${rowGridClass} items-center overflow-hidden rounded-[0.75rem] border border-[var(--Light-Border-Primary,#D6D6D6)] bg-white`}
              >
                <div className="flex h-[5.5rem] items-center justify-center bg-white">
                  <Checkbox
                    className="cursor-pointer"
                    checked={Boolean(selected[r.id])}
                    onCheckedChange={(v) => toggleOne(r.id, Boolean(v))}
                    aria-label={`Select ${r.profile.name}`}
                  />
                </div>

                <div className="flex h-[5.5rem] min-w-0 items-center bg-white px-4 py-[0.625rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarThumb
                      avatarUrl={r.profile.avatarUrl}
                      name={r.profile.name}
                    />

                    <div className="flex min-w-0 flex-col">
                      <span
                        className="truncate hover:cursor-pointer hover:underline"
                        style={{
                          color: "var(--Light-Text-Primary, #1A1A1A)",
                          fontFamily: "var(--Font-Family-Inter, Inter)",
                          fontSize: "var(--Font-Size-16, 1rem)",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "var(--Line-Height-24, 1.5rem)",
                          letterSpacing: "var(--Letter-Spacing-0, 0)",
                        }}
                        title={r.profile.name}
                        onClick={() => openMediakit(r)}
                      >
                        {r.profile.name}
                      </span>

                      <button
                        type="button"
                        disabled={!externalProfileUrl}
                        className="mt-1 max-w-full truncate text-left hover:underline disabled:cursor-default disabled:no-underline"
                        style={{
                          color: "var(--Light-Text-Secondary, #969696)",
                          fontFamily: "var(--Font-Family-Inter, Inter)",
                          fontSize: "var(--Font-Size-14, 0.875rem)",
                          fontStyle: "normal",
                          fontWeight: 400,
                          lineHeight: "var(--Line-Height-20, 1.25rem)",
                          letterSpacing: "var(--Letter-Spacing-0, 0)",
                        }}
                        title={externalProfileUrl || r.profile.handle || ""}
                        onClick={(event) => {
                          event.stopPropagation();
                          openExternalProfile(r);
                        }}
                      >
                        {r.profile.handle ?? ""}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex h-[5.5rem] min-w-0 items-center justify-center bg-white px-4 py-[0.625rem]">
                  <PillTag text={r.category} />
                </div>

                <div className="flex h-[5.5rem] min-w-0 items-center justify-center bg-white px-4 py-[0.625rem]">
                  {renderStatus ? renderStatus(r) : <PillTag text={statusText} />}
                </div>

                <div className="flex h-[5.5rem] items-center justify-center bg-white px-4 py-[0.625rem]">
                  <div className="flex w-fit flex-col justify-center gap-2">
                    {plat.map((p) => (
                      <button
                        type="button"
                        key={`f-${r.id}-${p.platform}`}
                        disabled={!externalProfileUrl}
                        className="flex w-fit items-center gap-2 disabled:cursor-default"
                        title={externalProfileUrl || p.platform}
                        onClick={(event) => {
                          event.stopPropagation();
                          openExternalProfile(r);
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--Light-Border-Subtle,#E6E6E6)] bg-white"
                          style={{ borderWidth: "0.5px", padding: "0.25rem" }}
                          aria-hidden="true"
                        >
                          <img
                            src={PLATFORM_ICON_SRC[p.platform]}
                            alt=""
                            className="h-5 w-5"
                            draggable={false}
                          />
                        </span>

                        <span
                          style={{
                            color: "var(--Light-Text-Primary, #1A1A1A)",
                            fontFamily: "Inter",
                            fontSize: "0.75rem",
                            fontStyle: "normal",
                            fontWeight: 400,
                            lineHeight: "1rem",
                          }}
                        >
                          {formatCompact(p.followers)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {!hideAppliedDate ? (
                  <div className="flex h-[5.5rem] items-center justify-center bg-white px-4 py-[0.625rem]">
                    <span
                      className="truncate"
                      style={{
                        width: "100%",
                        overflow: "hidden",
                        color: "var(--Light-Text-Secondary, #969696)",
                        textAlign: "center",
                        textOverflow: "ellipsis",
                        fontFamily: "var(--Font-Family-Inter, Inter)",
                        fontSize: "var(--Font-Size-14, 0.875rem)",
                        fontStyle: "normal",
                        fontWeight: 400,
                        lineHeight: "var(--Line-Height-20, 1.25rem)",
                        letterSpacing: "var(--Letter-Spacing-0, 0)",
                      }}
                      title={appliedText}
                    >
                      {appliedText}
                    </span>
                  </div>
                ) : null}

                <div className="flex h-[5.5rem] items-center justify-end bg-white px-3 py-[0.625rem]">
                  {(renderActions ? renderActions(r) : null) ?? (
                    <ActionGroup
                      onReject={() => onActionClick?.(r, "isRejected")}
                      onUndecided={() => onActionClick?.(r, "isUndicided")}
                      onSelect={() => onActionClick?.(r, "isShortlisted")}
                    />
                  )}
                </div>
              </div>
            </RowXScroll>
          );
        })}
      </div>
    </div>
  );
}

function ShortlistedTable({
  rows,
  renderActions,
  renderStatus,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  isRowSelectable,
  renderBulkHeader,
  onClearSelection,
}: {
  rows: InfluencerRow[];
  renderActions?: RowRenderer;
  renderStatus?: RowRenderer;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  isRowSelectable?: (row: InfluencerRow) => boolean;
  renderBulkHeader?: BulkHeaderRenderer;
  onClearSelection?: () => void;
}) {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const rowSelectable = (row: InfluencerRow) =>
    isRowSelectable ? isRowSelectable(row) : true;

  const selectableRows = rows.filter((row) => rowSelectable(row));

  const allChecked = selectable
    ? selectableRows.length > 0 &&
      selectableRows.every((row) => selectedIds.includes(row.id))
    : rows.length > 0 && rows.every((r) => Boolean(selected[r.id]));

  const someChecked = selectable
    ? selectableRows.some((row) => selectedIds.includes(row.id)) && !allChecked
    : rows.some((r) => Boolean(selected[r.id])) && !allChecked;

  const toggleOneLocal = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const categoryUnderHandleStyle: React.CSSProperties = {
    display: "-webkit-box",
    minWidth: "2.8125rem",
    maxWidth: "6.5rem",
    WebkitBoxOrient: "vertical" as any,
    WebkitLineClamp: 1 as any,
    overflow: "hidden",
    color: "var(--Light-Text-Tertiary, #B8B8B8)",
    textOverflow: "ellipsis",
    fontFamily: "Inter",
    fontSize: "0.75rem",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "1rem",
  };

  const handleStyle: React.CSSProperties = {
    color: "var(--Light-Text-Secondary, #969696)",
    fontFamily: "var(--Font-Family-Inter, Inter)",
    fontSize: "var(--Font-Size-14, 0.875rem)",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "var(--Line-Height-20, 1.25rem)",
    letterSpacing: "var(--Letter-Spacing-0, 0)",
    minWidth: 0,
  };

  const dotStyle: React.CSSProperties = {
    width: "0.125rem",
    height: "0.125rem",
    flexShrink: 0,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    background: "var(--Light-Text-Tertiary, #B8B8B8)",
  };

  const activeSelectedIds = selectable
    ? selectedIds.filter((id) => rows.some((row) => row.id === id))
    : rows.filter((r) => Boolean(selected[r.id])).map((r) => r.id);

  const activeSelectedRows = rows.filter((r) => activeSelectedIds.includes(r.id));

  const hasSelection = activeSelectedIds.length > 0;

  const clearSelection = () => {
    if (selectable) {
      onClearSelection?.();
      return;
    }

    setSelected({});
  };

  return (
    <div className="flex w-full flex-col">
      {hasSelection && renderBulkHeader ? (
        <div className="mb-4">
          {renderBulkHeader({
            selectedIds: activeSelectedIds,
            selectedRows: activeSelectedRows,
            clearSelection,
          })}
        </div>
      ) : (
        <div
          className="
            flex h-14 w-full items-center
            bg-[var(--Light-Background-Neutral,#F2F2F2)]
            rounded-tr-[0.75rem] rounded-bl-[0.75rem] rounded-br-[0.75rem]
          "
        >
          <div
            className={`${colShort.checkbox} flex h-14 items-center justify-center rounded-tl-[0.75rem]`}
          >
            {selectable ? (
              <Checkbox
                className="cursor-pointer"
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={() => onToggleAll?.()}
                aria-label="Select all"
              />
            ) : null}
          </div>

          <div className={`${colShort.profile} flex h-14 items-center justify-between px-4 py-[0.625rem]`}>
            <span style={headerTextStyle}>Profile</span>
            <HeaderCarets />
          </div>

          <div className={`${colShort.status} flex h-14 items-center justify-between px-4 py-[0.625rem]`}>
            <span style={headerTextStyle}>Status</span>
            <HeaderCarets />
          </div>

          <div className={`${colShort.platform} flex h-14 items-center justify-between px-4 py-[0.625rem]`}>
            <span style={headerTextStyle}>Platform</span>
            <HeaderCarets />
          </div>

          <div className={`${colShort.budget} flex h-14 items-center justify-between px-4 py-[0.625rem]`}>
            <span style={headerTextStyle}>Budget</span>
            <HeaderCarets />
          </div>

          <div className={`${colShort.date} flex h-14 shrink-0 items-center justify-between px-4 py-[0.625rem]`}>
            <span style={headerTextStyle}>Date</span>
            <HeaderCarets />
          </div>

          <div className={`${colShort.actions} flex h-14 items-center justify-end py-[0.625rem] pl-8 pr-4`}>
            <span style={headerTextStyle}>Action</span>
          </div>
        </div>
      )}

      <div className="mt-[2rem] w-full space-y-3">
        {rows.map((r) => {
          const platRows = getPlatformRows(r);
          const platforms = platRows.map((p) => p.platform);
          const statusText = r.status ?? "Contract Sent";
          const budgetText = r.budget ?? "₹0";
          const dateText = formatDDMMYY(r.appliedDate);
          const externalProfileUrl = getPlatformProfileUrl(r);

          return (
            <RowXScroll key={r.id}>
              <div
                className="
                  flex w-full min-w-[94rem] items-center
                  rounded-[0.75rem]
                  border border-[var(--Light-Border-Primary,#D6D6D6)]
                  bg-[var(--Light-Background-Primary,#FFF)]
                  overflow-hidden
                "
              >
                <div className={`${colShort.checkbox} flex h-[5.5rem] items-center justify-center`}>
                  <Checkbox
                    className="cursor-pointer"
                    checked={selectable ? selectedIds.includes(r.id) : Boolean(selected[r.id])}
                    disabled={selectable ? !rowSelectable(r) : false}
                    onCheckedChange={(v) => {
                      if (selectable) {
                        if (!rowSelectable(r)) return;
                        onToggleRow?.(r.id);
                        return;
                      }

                      toggleOneLocal(r.id, Boolean(v));
                    }}
                    aria-label={`Select ${r.profile.name}`}
                  />
                </div>

                <div className={`${colShort.profile} flex h-[5.5rem] items-center px-4`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarThumb
                      avatarUrl={r.profile.avatarUrl}
                      name={r.profile.name}
                    />

                    <div className="flex min-w-0 flex-col">
                      <span
                        className="truncate border-none outline-none hover:cursor-pointer hover:underline focus:outline-none focus:ring-0"
                        style={{
                          color: "var(--Light-Text-Primary, #1A1A1A)",
                          fontFamily: "var(--Font-Family-Inter, Inter)",
                          fontSize: "var(--Font-Size-16, 1rem)",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "var(--Line-Height-24, 1.5rem)",
                          letterSpacing: "var(--Letter-Spacing-0, 0)",
                        }}
                        title={r.profile.name}
                        onClick={() =>
                          window.open(`/mediakit/${r.id}`, "_blank")
                        }
                      >
                        {r.profile.name}
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          marginTop: "0.25rem",
                          minWidth: 0,
                        }}
                      >
                        <button
                          type="button"
                          disabled={!externalProfileUrl}
                          className="truncate text-left hover:underline disabled:cursor-default disabled:no-underline"
                          style={handleStyle}
                          title={externalProfileUrl || r.profile.handle || ""}
                          onClick={(event) => {
                            event.stopPropagation();
                            openExternalProfile(r);
                          }}
                        >
                          {r.profile.handle ?? ""}
                        </button>

                        {!!r.category && (
                          <>
                            <span aria-hidden="true" style={dotStyle} />
                            <span className="truncate" style={categoryUnderHandleStyle} title={r.category}>
                              {r.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${colShort.status} flex h-[5.5rem] items-center justify-center px-4`}>
                  {renderStatus ? renderStatus(r) : <PillTag text={statusText} />}
                </div>

                <div className={`${colShort.platform} flex h-[5.5rem] items-center justify-center px-4`}>
                  <button
                    type="button"
                    disabled={!externalProfileUrl}
                    title={externalProfileUrl || "Open profile"}
                    onClick={(event) => {
                      event.stopPropagation();
                      openExternalProfile(r);
                    }}
                    className="disabled:cursor-default"
                  >
                    <PlatformOverlap platforms={platforms} />
                  </button>
                </div>

                <div className={`${colShort.budget} flex h-[5.5rem] items-center justify-center px-4`}>
                  <PillTag text={budgetText} />
                </div>

                <div className={`${colShort.date} flex h-[5.5rem] items-center justify-center pl-4 pr-9`}>
                  <span
                    style={{
                      flex: "1 0 0",
                      color: "var(--Light-Text-Secondary, #969696)",
                      textAlign: "center",
                      fontFamily: "var(--Font-Family-Inter, Inter)",
                      fontSize: "var(--Font-Size-14, 0.875rem)",
                      fontStyle: "normal",
                      fontWeight: "var(--Font-Weight-regular, 400)" as any,
                      lineHeight: "var(--Line-Height-20, 1.25rem)",
                      letterSpacing: "var(--Letter-Spacing-0, 0)",
                    }}
                    title={dateText}
                  >
                    {dateText}
                  </span>
                </div>

                <div className={`${colShort.actions} flex h-[5.5rem] items-center justify-end pl-9 pr-4`}>
                  <div className="flex w-full justify-end">
                    {renderActions ? (
                      renderActions(r)
                    ) : (
                      <span className="text-xs text-[var(--Light-Text-Secondary,#969696)]">
                        No actions available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </RowXScroll>
          );
        })}
      </div>
    </div>
  );
}

const RECO_MID_GRID =
  "grid flex-1 grid-cols-[minmax(8rem,0.9fr)_minmax(9rem,1fr)_minmax(10rem,1fr)]";

function RecommendedTable({
  rows,
  renderActions,
}: {
  rows: InfluencerRow[];
  renderActions?: RowRenderer;
}) {
  const border = "var(--Light-Border-Primary,#D6D6D6)";

  return (
    <div className="flex w-full flex-col space-y-3">
      {rows.map((r) => {
        const plat = getPlatformRows(r);
        const appliedText = formatDDMMYY(r.appliedDate);
        const externalProfileUrl = getPlatformProfileUrl(r);

        return (
          <RowXScroll key={r.id}>
            <div className="flex w-full min-w-[64rem]">
              <div
                style={{
                  display: "flex",
                  width: "15.3125rem",
                  height: "5.5rem",
                  padding: "0.625rem 1rem",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderRadius: "0.75rem 0 0 0.75rem",
                  borderTop: `1px solid ${border}`,
                  borderBottom: `1px solid ${border}`,
                  borderLeft: `1px solid ${border}`,
                  background: "var(--Light-Background-Primary, #FFF)",
                  boxSizing: "border-box",
                }}
              >
                <div className="flex w-full min-w-0 items-center gap-3">
                  <AvatarThumb
                    avatarUrl={r.profile.avatarUrl}
                    name={r.profile.name}
                  />

                  <div className="flex min-w-0 flex-col">
                    <span
                      className="truncate hover:cursor-pointer hover:underline"
                      style={{
                        color: "var(--Light-Text-Primary, #1A1A1A)",
                        fontFamily: "var(--Font-Family-Inter, Inter)",
                        fontSize: "var(--Font-Size-16, 1rem)",
                        fontWeight: 500,
                        lineHeight: "var(--Line-Height-24, 1.5rem)",
                        letterSpacing: "var(--Letter-Spacing-0, 0)",
                      }}
                      title={r.profile.name}
                      onClick={() =>
                        window.open(`/mediakit/${r.id}`, "_blank")
                      }
                    >
                      {r.profile.name}
                    </span>

                    <button
                      type="button"
                      disabled={!externalProfileUrl}
                      className="mt-1 truncate text-left hover:underline disabled:cursor-default disabled:no-underline"
                      style={{
                        color: "var(--Light-Text-Secondary, #969696)",
                        fontFamily: "var(--Font-Family-Inter, Inter)",
                        fontSize: "var(--Font-Size-14, 0.875rem)",
                        fontWeight: 400,
                        lineHeight: "var(--Line-Height-20, 1.25rem)",
                        letterSpacing: "var(--Letter-Spacing-0, 0)",
                      }}
                      title={externalProfileUrl || r.profile.handle || ""}
                      onClick={(event) => {
                        event.stopPropagation();
                        openExternalProfile(r);
                      }}
                    >
                      {r.profile.handle ?? ""}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={`${RECO_MID_GRID} h-[5.5rem] items-center bg-white py-[0.625rem]`}
                style={{
                  borderTop: `1px solid ${border}`,
                  borderBottom: `1px solid ${border}`,
                  background: "var(--Light-Background-Primary, #FFF)",
                  boxSizing: "border-box",
                }}
              >
                <div className="flex items-center justify-center px-4">
                  <PillTag text={r.category} />
                </div>

                <div className="flex items-center justify-center px-4">
                  <div className="flex w-full flex-col justify-center gap-1">
                    {plat.map((p) => (
                      <button
                        type="button"
                        key={`pf-${r.id}-${p.platform}`}
                        disabled={!externalProfileUrl}
                        className="flex w-full items-center gap-2 disabled:cursor-default"
                        title={externalProfileUrl || p.platform}
                        onClick={(event) => {
                          event.stopPropagation();
                          openExternalProfile(r);
                        }}
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--Light-Border-Subtle,#E6E6E6)] bg-white"
                          style={{ borderWidth: "0.5px", padding: "0.125rem" }}
                          aria-hidden="true"
                        >
                          <img src={PLATFORM_ICON_SRC[p.platform]} alt="" className="h-4 w-4" draggable={false} />
                        </span>

                        <span
                          style={{
                            color: "var(--Light-Text-Primary, #1A1A1A)",
                            fontFamily: "Inter",
                            fontSize: "0.75rem",
                            fontWeight: 400,
                            lineHeight: "1rem",
                          }}
                        >
                          {formatCompact(p.followers)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center px-4">
                  <span
                    className="truncate"
                    style={{
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--Light-Text-Secondary, #969696)",
                      textAlign: "center",
                      fontFamily: "var(--Font-Family-Inter, Inter)",
                      fontSize: "var(--Font-Size-14, 0.875rem)",
                      fontWeight: 400,
                      lineHeight: "var(--Line-Height-20, 1.25rem)",
                      letterSpacing: "var(--Letter-Spacing-0, 0)",
                    }}
                    title={appliedText}
                  >
                    {appliedText}
                  </span>
                </div>
              </div>

              <div
                className="flex items-center justify-center bg-white"
                style={{
                  display: "flex",
                  height: "5.5rem",
                  padding: "0.625rem 1rem",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderRadius: "0 0.75rem 0.75rem 0",
                  borderTop: `1px solid ${border}`,
                  borderRight: `1px solid ${border}`,
                  borderBottom: `1px solid ${border}`,
                  background: "var(--Light-Background-Primary, #FFF)",
                  boxSizing: "border-box",
                  minWidth: "18rem",
                }}
              >
                {renderActions ? renderActions(r) : null}
              </div>
            </div>
          </RowXScroll>
        );
      })}
    </div>
  );
}

export function InfluencerTable({
  rows,
  onActionClick,
  variant = "default",
  renderDefaultActions,
  renderRecommendedActions,
  renderShortlistedActions,
  renderActiveActions,
  renderStatus,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  isRowSelectable,
  renderBulkHeader,
  onClearSelection,
  hideAppliedDate,
}: InfluencerTableProps) {
  if (variant === "recommended") {
    return <RecommendedTable rows={rows} renderActions={renderRecommendedActions} />;
  }

  if (variant === "shortlisted" || variant === "active") {
    return (
      <ShortlistedTable
        rows={rows}
        renderActions={variant === "active" ? renderActiveActions : renderShortlistedActions}
        renderStatus={renderStatus}
        selectable={selectable}
        selectedIds={selectedIds}
        onToggleRow={onToggleRow}
        onToggleAll={onToggleAll}
        isRowSelectable={isRowSelectable}
        renderBulkHeader={renderBulkHeader}
        onClearSelection={onClearSelection}
      />
    );
  }

  return (
    <DefaultTable
      rows={rows}
      onActionClick={onActionClick}
      renderBulkHeader={renderBulkHeader}
      renderActions={renderDefaultActions}
      renderStatus={renderStatus}
      hideAppliedDate={hideAppliedDate}
    />
  );
}
