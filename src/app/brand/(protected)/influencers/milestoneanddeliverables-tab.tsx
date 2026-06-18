"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, CopySimple, Check } from "@phosphor-icons/react";
import { toast, ToastStyles } from "@/components/ui/toast";
import { post } from "@/lib/api";
import CampaignFeedbackModal from "@/components/common/CampaignFeedbackModal";
import AddRevision from "@/components/ui/brand/AddRevision";
import AddMilestoneCard from "@/components/ui/brand/AddMilestoneCard";
import { InfluencerViewModel } from "./utils";
import {
    apiGetAllDeliverablesByMilestone,
    apiGetMilestonesByCampaign,
    apiReleaseMilestone,
    apiApproveDeliverable,
    apiGetContractDetails
} from "../../services/brandApi";

const NA = "N/A";

const DELIVERABLE_GRID_COLUMNS =
    "3.5rem minmax(7rem,1fr) minmax(6.5rem,1fr) minmax(6rem,0.8fr) 5rem minmax(8rem,1fr) 4rem minmax(18rem,18rem)";

const textOrNA = (value: any) => {
    if (value === undefined || value === null) return NA;
    if (typeof value === "string" && value.trim() === "") return NA;
    if (value === "-") return NA;
    return value;
};

const getErrorMessage = (err: any, fallback = "Something went wrong.") => {
    const responseData = err?.response?.data;

    if (typeof responseData?.message === "string") return responseData.message;
    if (typeof responseData?.error === "string") return responseData.error;
    if (typeof responseData?.errors?.[0]?.message === "string") {
        return responseData.errors[0].message;
    }

    if (typeof err?.data?.message === "string") return err.data.message;
    if (typeof err?.message === "string") return err.message;

    return fallback;
};

const getLocalBrandId = () => {
    if (typeof window === "undefined") return "";

    return (
        localStorage.getItem("brandId") ||
        localStorage.getItem("brand_id") ||
        localStorage.getItem("userId") ||
        ""
    );
};

const getPlatformIconSrc = (platform: string) => {
    const normalized = String(platform || "").toLowerCase();

    if (normalized.includes("youtube")) return "/logos_youtube-icon.svg";
    if (normalized.includes("instagram")) return "/skill-icons_instagram.svg";
    if (normalized.includes("tiktok") || normalized.includes("tik tok")) {
        return "/ic_baseline-tiktok.svg";
    }

    return "";
};

const formatDate = (value: any) => {
    if (!value) return NA;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return textOrNA(value);

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(date);
};

const formatMoneyOrQty = (item: any) => {
    if (
        item?.deliverablesCount !== undefined &&
        item?.deliverablesCount !== null
    ) {
        return String(item.deliverablesCount);
    }

    if (Array.isArray(item?.deliverables)) {
        return String(item.deliverables.length);
    }

    return (
        item?.qty ||
        item?.quantity ||
        item?.deliverableQty ||
        item?.count ||
        NA
    );
};

const humanizeStatus = (value: any) => {
    const text = textOrNA(value);

    if (text === NA) return NA;

    return String(text)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const humanizeText = (value: any) => {
    const text = textOrNA(value);

    if (text === NA) return NA;

    return String(text)
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDeliveries = (value: any) => {
    const list = Array.isArray(value) ? value : value ? [value] : [];

    if (list.length === 0) return NA;

    return list.map((item) => humanizeText(item)).join(", ");
};

const normalizePlatforms = (item: any, defaultPlatform = "") => {
    const platforms = item?.platforms;

    if (Array.isArray(platforms) && platforms.length > 0) {
        return platforms.map((platform) => String(platform)).filter(Boolean);
    }

    const singlePlatform =
        item?.platform ||
        item?.platformName ||
        item?.socialPlatform ||
        item?.deliverablePlatform ||
        item?.contentPlatform ||
        defaultPlatform ||
        "";

    return singlePlatform ? [String(singlePlatform)] : [];
};

const normalizeMilestonePlatforms = (item: any, defaultPlatform = "") => {
    const deliverablePlatforms = Array.isArray(item?.deliverables)
        ? item.deliverables.flatMap((deliverable: any) => {
            if (
                Array.isArray(deliverable?.platforms) &&
                deliverable.platforms.length > 0
            ) {
                return deliverable.platforms;
            }

            return [
                deliverable?.platform,
                deliverable?.platformName,
                deliverable?.socialPlatform,
                deliverable?.deliverablePlatform,
                deliverable?.contentPlatform,
            ].filter(Boolean);
        })
        : [];

    const directPlatforms = normalizePlatforms(item, defaultPlatform);

    const finalPlatforms =
        deliverablePlatforms.length > 0 ? deliverablePlatforms : directPlatforms;

    return Array.from(
        new Set(finalPlatforms.map((platform: any) => String(platform)).filter(Boolean))
    );
};

const isLockedDeliverableStatus = (status: any) => {
    return (
        isApprovedDeliverableStatus(status) ||
        isRevisionDeliverableStatus(status)
    );
};

const getNormalizedStatus = (status: any) =>
    String(status || "").trim().toLowerCase();

const isSubmittedDeliverableStatus = (status: any) => {
    return getNormalizedStatus(status) === "submitted";
};

const isApprovedDeliverableStatus = (status: any) => {
    return getNormalizedStatus(status) === "approved";
};

const isRevisionDeliverableStatus = (status: any) => {
    return getNormalizedStatus(status) === "revision";
};

const getDeliverableStatus = (item: any) => {
    return (
        item?.status ||
        item?.raw?.status ||
        item?.deliverableStatus ||
        item?.raw?.deliverableStatus ||
        ""
    );
};

const isDeliverableActionLocked = (item: any) => {
    const status = getDeliverableStatus(item);

    return (
        isApprovedDeliverableStatus(status) ||
        isRevisionDeliverableStatus(status)
    );
};

const getMilestoneDeliverablesForRelease = (
    milestone: any,
    rowId: string,
    deliverablesByRow: Record<string, any[]>
) => {
    const cachedDeliverables = deliverablesByRow[rowId];

    if (Array.isArray(cachedDeliverables) && cachedDeliverables.length > 0) {
        return cachedDeliverables;
    }

    const raw = milestone?.raw || milestone;

    if (Array.isArray(raw?.deliverables)) {
        return raw.deliverables;
    }

    if (Array.isArray(milestone?.deliverables)) {
        return milestone.deliverables;
    }

    return [];
};

const areDeliverableRevisionsApproved = (deliverable: any) => {
    const revisions =
        deliverable?.revisions ||
        deliverable?.raw?.revisions ||
        deliverable?.revision ||
        [];

    if (!Array.isArray(revisions) || revisions.length === 0) {
        return true;
    }

    return revisions.every((revision: any) =>
        isApprovedDeliverableStatus(revision?.status)
    );
};

const areAllMilestoneDeliverablesApproved = (
    milestone: any,
    rowId: string,
    deliverablesByRow: Record<string, any[]>
) => {
    const deliverables = getMilestoneDeliverablesForRelease(
        milestone,
        rowId,
        deliverablesByRow
    );

    if (!Array.isArray(deliverables) || deliverables.length === 0) {
        return false;
    }

    return deliverables.every((deliverable: any) =>
        isApprovedDeliverableStatus(getDeliverableStatus(deliverable))
    );
};

const isReleasedMilestone = (milestone: any) => {
    const status = String(
        milestone?.status ||
        milestone?.payoutStatus ||
        milestone?.raw?.payoutStatus ||
        milestone?.raw?.status ||
        ""
    ).toLowerCase();

    return (
        milestone?.released === true ||
        milestone?.raw?.released === true ||
        status.includes("released") ||
        status.includes("paid") ||
        status.includes("approved")
    );
};

const isMilestoneSubmittedByInfluencer = (milestone: any) => {
    const raw = milestone?.raw || milestone || {};
    const status = String(
        raw?.submissionStatus ||
        raw?.milestoneSubmissionStatus ||
        raw?.status ||
        milestone?.submissionStatus ||
        milestone?.milestoneSubmissionStatus ||
        milestone?.status ||
        ""
    )
        .trim()
        .toLowerCase();

    return Boolean(
        raw?.isMilestoneSubmitted === true ||
        milestone?.isMilestoneSubmitted === true ||
        raw?.submitted === true ||
        milestone?.submitted === true ||
        raw?.submittedAt ||
        milestone?.submittedAt ||
        raw?.milestoneSubmittedAt ||
        milestone?.milestoneSubmittedAt ||
        raw?.submittedByInfluencerId ||
        milestone?.submittedByInfluencerId ||
        status === "submitted" ||
        status === "milestone_submitted" ||
        status === "ready_for_brand_review"
    );
};

const getContractDoc = (data: any) => {
    return data?.contract || data?.data?.contract || data?.data || data || null;
};

const firstPositiveNumber = (...values: any[]) => {
    for (const value of values) {
        const num = Number(value);

        if (Number.isFinite(num) && num > 0) {
            return num;
        }
    }

    return 0;
};

const getInfluencerBudgetFromContract = (contract: any) => {
    const commercial =
        contract?.content?.scheduleA?.commercial ||
        contract?.scheduleA?.commercial ||
        {};

    return firstPositiveNumber(
        commercial?.influencerBudget,
        commercial?.feeAmount,
        contract?.influencerBudget,
        contract?.feeAmount
    );
};

const getStatusStyles = (status: string) => {
    const normalized = String(status || "").toLowerCase();

    if (
        normalized.includes("approved") ||
        normalized.includes("paid") ||
        normalized.includes("released") ||
        normalized.includes("completed")
    ) {
        return {
            bg: "#EAF6EC",
            dot: "#28A745",
            text: "#28A745",
        };
    }

    if (
        normalized.includes("revision") ||
        normalized.includes("change") ||
        normalized.includes("rework")
    ) {
        return {
            bg: "#FFF8E6",
            dot: "#FFBF00",
            text: "#A97800",
        };
    }

    if (normalized.includes("pending")) {
        return {
            bg: "#FFF8E6",
            dot: "#FFBF00",
            text: "#A97800",
        };
    }

    if (
        normalized.includes("initiated") ||
        normalized.includes("progress") ||
        normalized.includes("in progress")
    ) {
        return {
            bg: "#EAF6EC",
            dot: "#28A745",
            text: "#969696",
        };
    }

    if (normalized.includes("failed") || normalized.includes("rejected")) {
        return {
            bg: "#FDECEC",
            dot: "#EF5350",
            text: "#EF5350",
        };
    }

    return {
        bg: "#F5F5F5",
        dot: "#969696",
        text: "#969696",
    };
};

const getDefaultPlatformFromView = (view: InfluencerViewModel) => {
    return (
        (view as any)?.providerKey ||
        (view as any)?.header?.providerKey ||
        (view as any)?.raw?.page1Primary?.platform ||
        (view as any)?.raw?.page1Data?.provider ||
        ""
    );
};

const getResolvedMilestoneId = (item: any) => {
    return String(
        item?.milestoneId ||
        item?.raw?.milestoneId ||
        item?._id ||
        item?.id ||
        item?.milestoneHistoryId ||
        ""
    );
};

const getResolvedMilestoneHistoryId = (item: any) => {
    return String(
        item?.milestoneHistoryId ||
        item?.raw?.milestoneHistoryId ||
        item?._id ||
        item?.raw?._id ||
        ""
    );
};

const getDeliverableId = (item: any) => {
    return String(
        item?.deliverableId ||
        item?._id ||
        item?.id ||
        item?.raw?.deliverableId ||
        item?.raw?._id ||
        item?.raw?.id ||
        ""
    );
};

const getFirstUrl = (item: any) => {
    if (Array.isArray(item?.url) && item.url.length > 0) {
        return item.url[0]?.url || item.url[0]?.link || "";
    }

    if (Array.isArray(item?.deliverableLinks) && item.deliverableLinks.length > 0) {
        return item.deliverableLinks[0]?.url || "";
    }

    if (typeof item?.url === "string") return item.url;

    return item?.link || "";
};

const getDeliverableLinks = (item: any) => {
    const raw = item?.raw || item;

    const fromDeliverableLinks = Array.isArray(raw?.deliverableLinks)
        ? raw.deliverableLinks
            .map((link: any, index: number) => ({
                label:
                    link?.label ||
                    link?.name ||
                    `Deliverable Link ${index + 1}`,
                url: link?.url || link?.link || "",
            }))
            .filter((link: any) => link.url)
        : [];

    if (fromDeliverableLinks.length > 0) return fromDeliverableLinks;

    const fromUrlArray = Array.isArray(raw?.url)
        ? raw.url
            .map((link: any, index: number) => ({
                label:
                    link?.label ||
                    link?.name ||
                    `Deliverable Link ${index + 1}`,
                url: link?.url || link?.link || "",
            }))
            .filter((link: any) => link.url)
        : [];

    if (fromUrlArray.length > 0) return fromUrlArray;

    const singleUrl =
        typeof raw?.url === "string"
            ? raw.url
            : raw?.link || raw?.fileUrl || "";

    return singleUrl
        ? [
            {
                label: "Deliverable Link 1",
                url: singleUrl,
            },
        ]
        : [];
};

const formatLongDate = (value: any) => {
    if (!value) return NA;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return textOrNA(value);

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(date);
};

const formatMoney = (value: any, currency = "") => {
    const num = Number(value || 0);

    if (!Number.isFinite(num) || num <= 0) return NA;

    const prefix = currency ? `${currency} ` : "";

    return `${prefix}$${num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
};

const getLatestRevision = (deliverable: any) => {
    const revisions = deliverable?.revisions || deliverable?.raw?.revisions || [];

    if (!Array.isArray(revisions) || revisions.length === 0) return null;

    return revisions[revisions.length - 1];
};

const getRevisionRowsFromDeliverables = (deliverables: any[] = []) => {
    return deliverables.flatMap((deliverable: any) => {
        const rawDeliverable = deliverable?.raw || deliverable || {};

        const revisions = Array.isArray(rawDeliverable?.revisions)
            ? rawDeliverable.revisions
            : [];

        const deliverableName =
            rawDeliverable?.deliverableName ||
            rawDeliverable?.title ||
            rawDeliverable?.name ||
            "Deliverable";

        return revisions.map((revision: any, index: number) => ({
            revisionId: String(
                revision?.revisionId ||
                revision?._id ||
                `${getDeliverableId(rawDeliverable)}-${index}`
            ),
            deliverableId: String(
                revision?.deliverableId ||
                rawDeliverable?.deliverableId ||
                rawDeliverable?._id ||
                ""
            ),
            deliverableName,
            issueName: revision?.issueName || revision?.name || "",
            submittedOn:
                revision?.submittedAt ||
                revision?.submissionDate ||
                revision?.createdAt ||
                "",
            link:
                revision?.issueDeliverableLink ||
                revision?.deliverableLink ||
                revision?.link ||
                "",
            status: revision?.status || "pending",
            notes: revision?.notes || revision?.comments || "",
            raw: revision,
        }));
    });
};

const normalizeMilestoneRow = (
    item: any,
    index: number,
    defaultPlatform = ""
) => {
    const platforms = normalizeMilestonePlatforms(item, defaultPlatform);

    const description =
        item?.milestoneDescription ||
        item?.description ||
        item?.format ||
        item?.contentFormat ||
        item?.deliverableFormat ||
        item?.content ||
        "";

    const status =
        item?.payoutStatus ||
        item?.status ||
        item?.milestoneStatus ||
        item?.state ||
        "";

    const deadline =
        item?.deadline ||
        item?.dueDate ||
        item?.liveDate ||
        item?.draftDue ||
        item?.paidAt ||
        item?.releasedAt ||
        item?.createdAt ||
        "";

    return {
        id: String(
            item?._id ||
            item?.id ||
            item?.milestoneHistoryId ||
            `${item?.milestoneId || "milestone"}-${index}`
        ),
        milestoneId: String(item?.milestoneId || item?._id || item?.id || ""),
        milestoneHistoryId: String(
            item?.milestoneHistoryId || item?._id || item?.id || ""
        ),
        name: textOrNA(
            item?.milestoneTitle ||
            item?.name ||
            item?.milestoneName ||
            item?.title ||
            item?.deliverable
        ),
        format: textOrNA(description),
        platform: textOrNA(platforms[0] || ""),
        platforms,
        status: textOrNA(status),
        qty: textOrNA(formatMoneyOrQty(item)),
        deadline: formatDate(deadline),
        raw: item,
    };
};

const normalizeDeliverableRow = (
    item: any,
    index: number,
    defaultPlatform = ""
) => {
    const platforms = normalizePlatforms(item, defaultPlatform);

    const status =
        item?.status ||
        item?.deliverableStatus ||
        item?.approvalStatus ||
        item?.state ||
        "pending";

    const resolution =
        item?.resolution ||
        item?.dimensions ||
        item?.dimension ||
        item?.size ||
        item?.assetSize ||
        item?.ratio ||
        item?.aspectRatio ||
        "";

    const description =
        item?.description ||
        item?.deliverableDescription ||
        item?.caption ||
        item?.comments ||
        item?.format ||
        item?.contentFormat ||
        item?.deliverableFormat ||
        item?.type ||
        item?.mediaType ||
        "";

    return {
        id: getDeliverableId(item) || String(index),
        deliverableId: getDeliverableId(item),
        serial: index + 1,
        name: textOrNA(
            item?.title ||
            item?.deliverableTitle ||
            item?.deliverableName ||
            item?.name ||
            item?.contentTitle ||
            "Deliverable"
        ),
        deliveriesText: formatDeliveries(item?.deliveries),
        format: textOrNA(description),
        resolution: textOrNA(resolution),
        platforms,
        status: textOrNA(status),
        qty: textOrNA(
            item?.qty ||
            item?.quantity ||
            item?.deliverableQty ||
            item?.count ||
            1
        ),
        url: getFirstUrl(item),
        raw: item,
    };
};

const isDeliverableLikeArray = (value: any[]) => {
    if (!Array.isArray(value)) return false;
    if (value.length === 0) return true;

    return value.some((item) => {
        if (!item || typeof item !== "object") return false;

        return Boolean(
            item.deliverableId ||
            item.title ||
            item.description ||
            item.status ||
            item.milestoneHistoryId ||
            item.campaignId ||
            item.influencerId
        );
    });
};

const extractDeliverablesFromResponse = (res: any): any[] => {
    const candidates = [
        res?.data,
        res?.data?.data,
        res?.response?.data,
        res?.response?.data?.data,
        res?.deliverables,
        res?.data?.deliverables,
        res?.data?.data?.deliverables,
        res?.items,
        res?.data?.items,
        res?.data?.data?.items,
        res?.result,
        res?.result?.data,
        res?.payload,
        res?.payload?.data,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && isDeliverableLikeArray(candidate)) {
            return candidate;
        }
    }

    const searchNested = (value: any, depth = 0): any[] => {
        if (!value || depth > 4) return [];

        if (Array.isArray(value)) {
            return isDeliverableLikeArray(value) ? value : [];
        }

        if (typeof value !== "object") return [];

        const priorityKeys = [
            "data",
            "deliverables",
            "items",
            "rows",
            "result",
            "payload",
            "response",
        ];

        for (const key of priorityKeys) {
            const found = searchNested(value?.[key], depth + 1);
            if (found.length > 0) return found;
        }

        for (const key of Object.keys(value)) {
            if (key === "url") continue;

            const found = searchNested(value[key], depth + 1);
            if (found.length > 0) return found;
        }

        return [];
    };

    return searchNested(res);
};

const extractUpdatedDeliverable = (
    res: any,
    fallback: any,
    status: string,
    comments = ""
) => {
    const updated =
        res?.data?.deliverable ||
        res?.data?.data ||
        res?.data ||
        res?.deliverable ||
        res ||
        {};

    return {
        ...fallback,
        ...updated,
        status: updated?.status || status,
        comments: updated?.comments ?? comments,
    };
};

function PlatformBadgeIcon({ platform }: { platform: string }) {
    const safePlatform = textOrNA(platform);
    const iconSrc = getPlatformIconSrc(platform);

    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center gap-2.5 rounded-[2.5rem] border border-[#E6E6E6] bg-white p-2">
            {iconSrc ? (
                <img
                    src={iconSrc}
                    alt={`${safePlatform} icon`}
                    className="h-4 w-4 object-contain"
                    draggable={false}
                />
            ) : (
                <span className="font-['Inter'] text-[0.625rem] font-semibold text-[#1A1A1A]">
                    {safePlatform !== NA
                        ? String(safePlatform).slice(0, 1).toUpperCase()
                        : "?"}
                </span>
            )}
        </span>
    );
}

function PlatformBadgeIcons({
    platforms,
    align = "center",
}: {
    platforms: string[];
    align?: "left" | "center";
}) {
    const list = Array.isArray(platforms) ? platforms.filter(Boolean) : [];

    if (list.length === 0) {
        return (
            <div
                className={[
                    "flex items-center -space-x-1",
                    align === "left" ? "justify-start" : "justify-center",
                ].join(" ")}
            >
                <PlatformBadgeIcon platform={NA} />
            </div>
        );
    }

    return (
        <div
            className={[
                "flex items-center -space-x-1",
                align === "left" ? "justify-start" : "justify-center",
            ].join(" ")}
        >
            {list.map((platform) => (
                <PlatformBadgeIcon key={platform} platform={platform} />
            ))}
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const safeStatus = humanizeStatus(status);
    const styles = getStatusStyles(status);

    return (
        <span className="inline-flex items-center gap-1 rounded-[0.75rem] bg-[#F9F9F9] px-2 py-1 font-['Inter'] text-[0.875rem] font-medium leading-[1.25rem] tracking-[0] text-[#969696]">
            <span
                className="flex items-center gap-2.5 rounded-2xl p-[0.125rem]"
                style={{
                    backgroundColor:
                        String(status || "").toLowerCase().includes("approved") ||
                            String(status || "").toLowerCase().includes("paid") ||
                            String(status || "").toLowerCase().includes("released") ||
                            String(status || "").toLowerCase().includes("completed") ||
                            String(status || "").toLowerCase().includes("progress")
                            ? "#EAF6EC"
                            : String(status || "").toLowerCase().includes("revision") ||
                                String(status || "").toLowerCase().includes("pending")
                                ? "#FFF8E6"
                                : String(status || "").toLowerCase().includes("rejected") ||
                                    String(status || "").toLowerCase().includes("failed")
                                    ? "#FDECEC"
                                    : "#F5F5F5",
                }}
            >
                <span
                    className="h-2 w-2 rounded-full"
                    style={{
                        backgroundColor: styles.dot,
                    }}
                />
            </span>

            {safeStatus}
        </span>
    );
}

function HeaderCell({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-14 items-center justify-between px-4 py-2.5">
            <span className="line-clamp-1 flex-1 overflow-hidden text-ellipsis font-['Inter'] text-sm font-semibold leading-5 tracking-[0] text-[#1A1A1A]">
                {children}
            </span>
        </div>
    );
}

function RowCell({
    children,
    align = "left",
}: {
    children: ReactNode;
    align?: "left" | "center";
}) {
    return (
        <div
            className={[
                "flex h-[5.5rem] items-center gap-2 px-4 py-2.5",
                align === "center" ? "justify-center" : "justify-start",
            ].join(" ")}
        >
            {children}
        </div>
    );
}

function DeliverableActionButtons({
    item,
    isUpdating,
    onReleasePayment,
    onAddRevision,
}: {
    item: any;
    isUpdating: boolean;
    onReleasePayment: (item: any) => void;
    onAddRevision: (item: any) => void;
}) {
    const status = getDeliverableStatus(item);
    const isSubmitted = isSubmittedDeliverableStatus(status);
    const isApproved = isApprovedDeliverableStatus(status);
    const isRevision = isRevisionDeliverableStatus(status);
    const locked = isApproved || isRevision;

    const canAct = isSubmitted && !locked && !isUpdating;
    const showRevisionButton = isSubmitted || locked;

    const buttonClass =
        "flex h-[2.375rem] w-[8.25rem] shrink-0 items-center justify-center gap-1 rounded-lg border border-[#E6E6E6] bg-white px-3 text-center font-['Inter'] text-xs font-medium leading-4 text-[#3A3A3A] transition hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:bg-[#F9F9F9] disabled:text-[#969696] disabled:opacity-60";

    return (
        <div className="flex h-[5.5rem] min-w-0 items-center justify-center gap-2 px-1 py-2.5">
            <button
                type="button"
                disabled={!canAct}
                onClick={() => onReleasePayment(item)}
                className={buttonClass}
            >
                <span className="whitespace-nowrap">
                    {isApproved ? "Approved" : "Approve"}
                </span>
            </button>

            {showRevisionButton ? (
                <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => onAddRevision(item)}
                    className={buttonClass}
                >
                    <span className="whitespace-nowrap">
                        {isRevision ? "Revision Added" : "Add Revision"}
                    </span>
                </button>
            ) : null}
        </div>
    );
}

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[9rem_1fr] items-start gap-5">
            <p className="font-['Inter'] text-sm font-medium leading-5 text-[#969696]">
                {label}
            </p>

            <div className="min-w-0 font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A]">
                {children}
            </div>
        </div>
    );
}
function RevisionEmptySkeleton() {
    const SkeletonCard = ({ offset = false }: { offset?: boolean }) => (
        <div
            className={[
                "flex h-[1.67763rem] w-[15.97356rem] items-center gap-[0.39113rem] rounded-[0.27244rem] border-[0.272px] border-[#D6D6D6] bg-white px-[0.39113rem] py-[0.27331rem] shadow-[0_3.755px_2.503px_-2.503px_rgba(0,0,0,0.08),0_0_1.252px_0_rgba(0,0,0,0.08)]",
                offset ? "-ml-[4.25rem]" : "ml-[3.75rem]",
            ].join(" ")}
        >
            <span className="h-[0.80031rem] w-[0.80031rem] shrink-0 rounded-[0.15644rem] bg-[#E6E6E6]" />

            <span className="flex w-[2.2rem] shrink-0 flex-col gap-[0.156rem]">
                <span className="h-[0.23838rem] w-[1.92rem] rounded-[0.06813rem] bg-[#E6E6E6]" />
                <span className="h-[0.23838rem] w-[1.192rem] rounded-[0.06813rem] bg-[#E6E6E6]" />
            </span>

            <span className="h-[0.31288rem] w-[0.93869rem] shrink-0 rounded-[0.40869rem] bg-[#E6E6E6]" />
            <span className="h-[0.31288rem] w-[1.1rem] shrink-0 rounded-[0.40869rem] bg-[#E6E6E6]" />
            <span className="h-[0.31288rem] w-[1.26rem] shrink-0 rounded-[0.40869rem] bg-[#E6E6E6]" />
            <span className="h-[0.31288rem] w-[1.1rem] shrink-0 rounded-[0.40869rem] bg-[#E6E6E6]" />
            <span className="h-[0.31288rem] w-[1.36rem] shrink-0 rounded-[0.40869rem] bg-[#E6E6E6]" />

            <span className="h-[0.45975rem] flex-1 rounded-[0.68113rem] bg-[#E6E6E6]" />
        </div>
    );

    return (
        <div className="mb-7 flex flex-col items-center gap-3">
            <SkeletonCard />
            <SkeletonCard offset />
        </div>
    );
}

function MainRevisionHistoryTable({
    revisions,
}: {
    revisions: any[];
}) {
    const columns =
        "minmax(7rem,1fr) minmax(8rem,1.1fr) minmax(8rem,1fr) minmax(5rem,0.7fr) minmax(7rem,1fr) minmax(10rem,1.4fr) minmax(6rem,0.8fr)";

    return (
        <div className="border-t border-[#E6E6E6] px-4 pb-4 pt-5">
            <h3 className="font-['Inter'] text-xl font-semibold leading-7 text-[#1A1A1A]">
                Revision History
            </h3>

            <p className="mt-1 font-['Inter'] text-sm font-normal leading-5 text-[#B8B8B8]">
                Explore the list of Revision History across all the Deliveries
            </p>

            <div className="mt-4 overflow-x-auto rounded-[0.75rem] border border-[#D6D6D6] bg-white">
                <div
                    className="grid min-w-[64rem] border-b border-[#D6D6D6]"
                    style={{ gridTemplateColumns: columns }}
                >
                    {[
                        "Name",
                        "Under Delivery",
                        "Submitted on",
                        "Link",
                        "Status",
                        "Notes",
                        "Actions",
                    ].map((heading, index, arr) => (
                        <div
                            key={heading}
                            className={[
                                "flex h-12 items-center bg-white px-4 py-2.5 font-['Inter'] text-xs font-semibold leading-4 text-[#1A1A1A]",
                                index !== arr.length - 1
                                    ? "border-r border-[#D6D6D6]"
                                    : "",
                            ].join(" ")}
                        >
                            <span className="line-clamp-1">{heading}</span>
                        </div>
                    ))}
                </div>

                {revisions.length > 0 ? (
                    revisions.map((revision: any) => (
                        <div
                            key={revision.revisionId}
                            className="grid min-w-[64rem] border-b border-[#E6E6E6] last:border-b-0"
                            style={{ gridTemplateColumns: columns }}
                        >
                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                                    {textOrNA(revision.issueName)}
                                </span>
                            </div>

                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                                    {textOrNA(revision.deliverableName)}
                                </span>
                            </div>

                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                <span className="line-clamp-1">
                                    {formatLongDate(revision.submittedOn)}
                                </span>
                            </div>

                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                {revision.link ? (
                                    <a
                                        href={revision.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer underline"
                                    >
                                        Open
                                    </a>
                                ) : (
                                    NA
                                )}
                            </div>

                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5">
                                <StatusPill status={revision.status || "pending"} />
                            </div>

                            <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                                    {textOrNA(revision.notes)}
                                </span>
                            </div>

                            <div className="flex min-h-12 items-center px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#969696]">
                                —
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex h-[18.75rem] min-w-[64rem] flex-col items-center justify-center">
                        <RevisionEmptySkeleton />

                        <p className="font-['Inter'] text-sm font-semibold leading-5 text-[#1A1A1A]">
                            No Revision History found
                        </p>

                        <p className="mt-2 font-['Inter'] text-xs font-normal leading-4 text-[#B8B8B8]">
                            Revisions History will be shown after raising a revision
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
const isMilestoneEditLocked = (milestone: any) => {
    const raw = milestone?.raw || milestone || {};

    const payoutStatus = String(
        raw?.payoutStatus ||
        milestone?.payoutStatus ||
        ""
    )
        .trim()
        .toLowerCase();

    const isAccepted = Number(
        raw?.isAccepted ??
        milestone?.isAccepted ??
        0
    ) === 1;

    return payoutStatus === "initiated" || isAccepted;
};

function ViewDeliverableSidebar({
    open,
    milestone,
    deliverable,
    isUpdating,
    onClose,
    onApprove,
    onRaiseRevision,
    onEditMilestone,
}: {
    open: boolean;
    milestone: any;
    deliverable: any;
    isUpdating: boolean;
    onClose: () => void;
    onApprove: (deliverable: any) => void;
    onRaiseRevision: (milestone: any, deliverable: any) => void;
    onEditMilestone: (milestone: any) => void;
}) {
    const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEscape);
        };
    }, [open, onClose]);

    if (!open) return null;

    const rawMilestone = milestone?.raw || milestone || {};
    const editLocked = isMilestoneEditLocked(rawMilestone);
    const rawDeliverable = deliverable?.raw || deliverable || {};

    const deliverableName =
        rawDeliverable?.deliverableName ||
        rawDeliverable?.title ||
        deliverable?.name ||
        "Deliverable";

    const milestoneTitle =
        rawMilestone?.milestoneTitle ||
        milestone?.name ||
        rawDeliverable?.milestoneTitle ||
        NA;

    const links = getDeliverableLinks(rawDeliverable);
    const latestRevision = getLatestRevision(rawDeliverable);
    const status = getDeliverableStatus(rawDeliverable);

    const isSubmitted = isSubmittedDeliverableStatus(status);
    const isApproved = isApprovedDeliverableStatus(status);
    const isRevision = isRevisionDeliverableStatus(status);
    const locked = isApproved || isRevision;
    const canAct = isSubmitted && !locked && !isUpdating;

    const revisions = Array.isArray(rawDeliverable?.revisions)
        ? rawDeliverable.revisions
        : [];

    const handleCopySingleLink = async (url: string, index: number) => {
        if (!url) {
            toast({
                icon: "warning",
                title: "No link found",
                text: "There is no submission link to copy.",
            });
            return;
        }

        await navigator.clipboard.writeText(url);

        setCopiedLinkIndex(index);

        setTimeout(() => {
            setCopiedLinkIndex((current) => (current === index ? null : current));
        }, 1200);

        toast({
            icon: "success",
            title: "Link copied",
            text: "Submission link copied to clipboard.",
        });
    };



    return (
        <div
            className="fixed inset-0 z-50 flex h-screen items-center justify-end overflow-hidden bg-[rgba(1,1,1,0.30)] px-3 py-3"
            onClick={onClose}
        >
            <aside
                className="flex h-[calc(100vh-1.5rem)] w-[55.75rem] max-w-[calc(100vw-1.5rem)] animate-[slideInRight_220ms_ease-out] flex-col overflow-hidden rounded-[1rem] bg-white shadow-[0_24px_40px_-4px_rgba(0,0,0,0.16),0_0_12px_0_rgba(0,0,0,0.08)]"
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

                <div className="flex shrink-0 rounder-[1rem] items-center justify-between border-b border-[#E6E6E6] px-6 py-5">
                    <h2 className="line-clamp-1 font-['Inter'] text-xl font-semibold leading-7 text-[#1A1A1A]">
                        {deliverableName}
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={editLocked}
                            title={
                                editLocked
                                    ? "This milestone cannot be edited because payout is initiated or influencer has accepted it."
                                    : "Edit milestone"
                            }
                            onClick={() => {
                                if (editLocked) {
                                    toast({
                                        icon: "info",
                                        title: "Edit locked",
                                        text: "This milestone cannot be edited because payout is initiated or influencer has accepted it.",
                                    });
                                    return;
                                }

                                onClose();
                                onEditMilestone(milestone);
                            }}
                            className="flex h-8 items-center justify-center gap-2 rounded-[0.75rem] border border-[#E6E6E6] px-3 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A] hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#969696]"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1A1A1A] hover:bg-[#F9F9F9]"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <div className="mb-6 flex items-center">
                        <h3 className="font-['Inter'] text-base font-semibold leading-6 text-[#1A1A1A]">
                            Submissions
                        </h3>
                    </div>

                    <div className="flex flex-col gap-5">
                        <DetailRow label="Deliverable Name">
                            {textOrNA(deliverableName)}
                        </DetailRow>

                        <DetailRow label="Submission Date">
                            {formatLongDate(rawDeliverable?.submittedAt)}
                        </DetailRow>

                        <DetailRow label="Platform">
                            <PlatformBadgeIcons
                                platforms={normalizePlatforms(rawDeliverable)}
                                align="left"
                            />
                        </DetailRow>

                        <DetailRow label="Quantity">
                            {String(rawDeliverable?.quantity || 1).padStart(2, "0")}
                        </DetailRow>

                        <DetailRow label="Content Format">
                            {formatDeliveries(rawDeliverable?.deliveries)}
                        </DetailRow>

                        <DetailRow label="Revision Type">
                            {latestRevision
                                ? humanizeText(latestRevision?.revisionType)
                                : NA}
                        </DetailRow>

                        <DetailRow label="Revision Payout">
                            {latestRevision?.revisionType === "paid"
                                ? formatMoney(latestRevision?.revisionBudget)
                                : NA}
                        </DetailRow>

                        <DetailRow label="Aspect Ratio">
                            {textOrNA(rawDeliverable?.aspectRatio)}
                        </DetailRow>

                        <DetailRow label="Status">
                            <StatusPill status={status || "pending"} />
                        </DetailRow>

                        <DetailRow label="Under Milestone">
                            {textOrNA(milestoneTitle)}
                        </DetailRow>

                        <DetailRow label="Milestone Description">
                            <p className="max-w-[36rem] whitespace-pre-wrap break-words leading-5 [overflow-wrap:anywhere]">
                                {textOrNA(rawMilestone?.milestoneDescription)}
                            </p>
                        </DetailRow>

                        <DetailRow label="Milestone Payout">
                            {formatMoney(
                                rawMilestone?.milestoneBudget || rawMilestone?.amount,
                                rawMilestone?.currency || ""
                            )}
                        </DetailRow>

                        <DetailRow label="Grace Period">
                            {Number(rawMilestone?.graceDays || 0) > 0 ? "YES" : "NO"}
                        </DetailRow>

                        <DetailRow label="Grace Period Days">
                            {Number(rawMilestone?.graceDays || 0) || NA}
                        </DetailRow>

                        <DetailRow label="Deadline">
                            {formatLongDate(rawMilestone?.endDate)}
                        </DetailRow>

                        <DetailRow label="Submission Link">
                            {links.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {links.map((link: any, index: number) => {
                                        const label = link.label || `Deliverable Link ${index + 1}`;
                                        const isCopied = copiedLinkIndex === index;

                                        return (
                                            <div
                                                key={`${link.url}-${index}`}
                                                className="flex min-w-0 items-center gap-3"
                                            >
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="line-clamp-1 w-fit max-w-[24rem] cursor-pointer font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A] underline"
                                                    title={link.url}
                                                >
                                                    {label}
                                                </a>

                                                <button
                                                    type="button"
                                                    aria-label={isCopied ? "Copied" : "Copy link"}
                                                    title={isCopied ? "Copied" : "Copy link"}
                                                    onClick={() => handleCopySingleLink(link.url, index)}
                                                    className={[
                                                        "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition",
                                                        isCopied
                                                            ? "bg-[#EAF6EC] text-[#28A745] animate-[copyTick_220ms_ease-out]"
                                                            : "text-[#1A1A1A] hover:bg-[#F5F5F5]",
                                                    ].join(" ")}
                                                >
                                                    {isCopied ? (
                                                        <Check size={14} weight="bold" />
                                                    ) : (
                                                        <CopySimple size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                NA
                            )}
                        </DetailRow>
                    </div>

                    <div className="mt-8">
                        <h3 className="mb-3 font-['Inter'] text-base font-semibold leading-6 text-[#1A1A1A]">
                            Revision History
                        </h3>

                        <div className="overflow-hidden rounded-[0.75rem] border border-[#D6D6D6] bg-white">
                            <div className="grid grid-cols-[1.05fr_1.15fr_0.75fr_1.15fr_1.9fr] border-b border-[#D6D6D6]">
                                {["Name", "Due Date", "Link", "Status", "Notes"].map(
                                    (heading, index, arr) => (
                                        <div
                                            key={heading}
                                            className={[
                                                "flex h-12 items-center gap-2 bg-white px-4 py-2.5 font-['Inter'] text-xs font-semibold leading-4 text-[#1A1A1A]",
                                                index !== arr.length - 1
                                                    ? "border-r border-[#D6D6D6]"
                                                    : "",
                                            ].join(" ")}
                                        >
                                            <span className="line-clamp-1">{heading}</span>
                                        </div>
                                    )
                                )}
                            </div>

                            {revisions.length > 0 ? (
                                revisions.map((revision: any) => (
                                    <div
                                        key={revision?.revisionId || revision?._id}
                                        className="grid grid-cols-[1.05fr_1.15fr_0.75fr_1.15fr_1.9fr] border-b border-[#E6E6E6] last:border-b-0"
                                    >
                                        <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                            <span className="line-clamp-1">
                                                {textOrNA(revision?.issueName)}
                                            </span>
                                        </div>

                                        <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                            <span className="line-clamp-1">
                                                {formatLongDate(revision?.submissionDate)}
                                            </span>
                                        </div>

                                        <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                            {revision?.issueDeliverableLink ? (
                                                <a
                                                    href={revision.issueDeliverableLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="underline"
                                                >
                                                    Open
                                                </a>
                                            ) : (
                                                NA
                                            )}
                                        </div>

                                        <div className="flex min-h-12 items-center border-r border-[#E6E6E6] px-4 py-2.5">
                                            <StatusPill status={revision?.status || "pending"} />
                                        </div>

                                        <div className="flex min-h-12 items-center px-4 py-2.5 font-['Inter'] text-xs font-medium leading-4 text-[#1A1A1A]">
                                            <span className="line-clamp-2">
                                                {textOrNA(revision?.notes)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex h-[18.75rem] flex-col items-center justify-center">
                                    <RevisionEmptySkeleton />

                                    <p className="font-['Inter'] text-sm font-semibold leading-5 text-[#1A1A1A]">
                                        No Revision History found
                                    </p>

                                    <p className="mt-2 font-['Inter'] text-xs font-normal leading-4 text-[#B8B8B8]">
                                        Revisions History will be shown after raising a revision
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-[#E6E6E6] px-6 py-4">
                    <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => {
                            onClose();
                            onRaiseRevision(milestone, rawDeliverable);
                        }}
                        className="flex h-10 min-w-[7.5rem] items-center justify-center rounded-lg border border-[#E6E6E6] bg-white px-5 font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A] hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:bg-[#F9F9F9] disabled:text-[#969696]"
                    >
                        Raise Revision
                    </button>

                    <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => onApprove(rawDeliverable)}
                        className="flex h-10 min-w-[7.5rem] items-center justify-center rounded-lg bg-[#1A1A1A] px-5 font-['Inter'] text-sm font-medium leading-5 text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#969696]"
                    >
                        {isUpdating ? "Approving..." : isApproved ? "Approved" : "Approve"}
                    </button>
                </div>
            </aside>
        </div>
    );
}

function DeliverablesPanel({
    deliverables,
    loading,
    error,
    defaultPlatform,
    updatingDeliverableIds,
    milestone,
    onReleasePayment,
    onAddRevision,
    onViewDeliverable,
}: {
    deliverables: any[];
    loading: boolean;
    error: string;
    defaultPlatform: string;
    updatingDeliverableIds: Record<string, boolean>;
    milestone: any;
    onReleasePayment: (item: any) => void;
    onAddRevision: (milestone: any, item: any) => void;
    onViewDeliverable: (milestone: any, item: any) => void;
}) {
    const rows = deliverables.map((item, index) =>
        normalizeDeliverableRow(item, index, defaultPlatform)
    );

    return (
        <div className="border-t border-[#E6E6E6] px-4 pb-4 pt-5">
            <h3 className="font-['Inter'] text-xl font-semibold leading-7 text-[#1A1A1A]">
                Deliverables
            </h3>

            <div className="mt-1 overflow-x-auto rounded-[0.75rem] border border-[#E6E6E6] bg-white">
                {loading ? (
                    <div className="flex min-h-[5.5rem] items-center justify-center font-['Inter'] text-sm text-[#969696]">
                        Loading deliverables...
                    </div>
                ) : error ? (
                    <div className="flex min-h-[5.5rem] items-center justify-center font-['Inter'] text-sm text-[#E53935]">
                        {error}
                    </div>
                ) : rows.length > 0 ? (
                    rows.map((item, index) => (
                        <div key={item.id}>
                            <div
                                className="grid min-w-[64rem] w-full items-center"
                                style={{
                                    gridTemplateColumns: DELIVERABLE_GRID_COLUMNS,
                                }}
                            >
                                <div className="flex h-[5.5rem] items-center justify-center px-4 py-2.5 font-['Inter'] text-base font-medium text-[#1A1A1A]">
                                    {item.serial}.
                                </div>

                                <div className="flex h-[5.5rem] items-center px-4 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => onViewDeliverable(milestone, item.raw)}
                                        className="line-clamp-1 text-left font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A] hover:underline"
                                        title={item.name}
                                    >
                                        {item.name}
                                    </button>
                                </div>

                                <div className="flex h-[5.5rem] items-center px-4 py-2.5">
                                    <p className="mt-1 line-clamp-1 font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A]">
                                        {item.deliveriesText}
                                    </p>
                                </div>

                                <div className="flex h-[5.5rem] items-center justify-center px-4 py-2.5 font-['Inter'] text-base font-medium text-[#1A1A1A]">
                                    {item.resolution}
                                </div>

                                <div className="flex h-[5.5rem] items-center justify-center px-4 py-2.5">
                                    <PlatformBadgeIcons platforms={item.platforms} />
                                </div>

                                <div className="flex h-[5.5rem] items-center justify-center px-4 py-2.5">
                                    <StatusPill status={item.status} />
                                </div>

                                <div className="flex h-[5.5rem] items-center justify-center px-4 py-2.5 font-['Inter'] text-base font-medium text-[#1A1A1A]">
                                    {item.qty}
                                </div>

                                <DeliverableActionButtons
                                    item={item.raw}
                                    isUpdating={Boolean(
                                        updatingDeliverableIds[item.deliverableId]
                                    )}
                                    onReleasePayment={onReleasePayment}
                                    onAddRevision={(deliverable) =>
                                        onAddRevision(milestone, deliverable)
                                    }
                                />
                            </div>

                            {index < rows.length - 1 ? (
                                <div className="mx-auto h-px w-[56.625rem] max-w-[calc(100%-2rem)] bg-[#E6E6E6]" />
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className="flex min-h-[5.5rem] items-center justify-center font-['Inter'] text-sm text-[#969696]">
                        No deliverables found for this milestone.
                    </div>
                )}
            </div>
        </div>
    );
}

type MilestoneAndDeliverablesTabProps = {
    view: InfluencerViewModel;
};

export default function MilestoneAndDeliverablesTab({
    view,
}: MilestoneAndDeliverablesTabProps) {
    const searchParams = useSearchParams();

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [apiMilestones, setApiMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
    const [milestoneTargetRow, setMilestoneTargetRow] = useState<any | null>(null);
    const [revisionTarget, setRevisionTarget] = useState<{
        milestone: any;
        deliverable: any;
    } | null>(null);
    const [contractDetailsData, setContractDetailsData] = useState<any | null>(null);
    const [contractDetailsLoading, setContractDetailsLoading] = useState(false);

    const [viewDeliverableTarget, setViewDeliverableTarget] = useState<{
        milestone: any;
        deliverable: any;
    } | null>(null);

    const [milestoneRefreshKey, setMilestoneRefreshKey] = useState(0);

    const [deliverablesByRow, setDeliverablesByRow] = useState<
        Record<string, any[]>
    >({});
    const [deliverablesLoadingByRow, setDeliverablesLoadingByRow] = useState<
        Record<string, boolean>
    >({});
    const [deliverablesErrorByRow, setDeliverablesErrorByRow] = useState<
        Record<string, string>
    >({});
    const [updatingDeliverableIds, setUpdatingDeliverableIds] = useState<
        Record<string, boolean>
    >({});
    const [releasingMilestoneIds, setReleasingMilestoneIds] = useState<
        Record<string, boolean>
    >({});

    const [campaignFeedbackOpen, setCampaignFeedbackOpen] = useState(false);
    const campaignFeedbackSubmittedRef = useRef(false);

    const resolvedCampaignId =
        searchParams.get("campaignId") ||
        (view as any)?.raw?.contract?.campaignId ||
        (view as any)?.contract?.campaignId ||
        (view as any)?.raw?.contract?.content?.campaign?._id ||
        (view as any)?.contract?.content?.campaign?._id ||
        "";

    const resolvedInfluencerId =
        searchParams.get("influencerId") ||
        (view as any)?.raw?.influencer?.influencerId ||
        (view as any)?.raw?.influencer?._id ||
        (view as any)?.influencer?.influencerId ||
        (view as any)?.influencer?._id ||
        "";

    const resolvedBrandId =
        searchParams.get("brandId") ||
        (view as any)?.raw?.contract?.brandId ||
        (view as any)?.contract?.brandId ||
        (view as any)?.raw?.contract?.content?.brand?._id ||
        (view as any)?.contract?.content?.brand?._id ||
        getLocalBrandId();
    const resolvedContractId =
        searchParams.get("contractId") ||
        (view as any)?.raw?.contract?.contractId ||
        (view as any)?.contract?.contractId ||
        (view as any)?.raw?.contractId ||
        (view as any)?.contractId ||
        "";

    const getCampaignFeedbackPayload = () => {
        if (!resolvedCampaignId || !resolvedBrandId || !resolvedInfluencerId) {
            return null;
        }

        return {
            campaignId: resolvedCampaignId,
            brandId: resolvedBrandId,
            influencerId: resolvedInfluencerId,
        };
    };

    useEffect(() => {
        if (!resolvedContractId) {
            setContractDetailsData(null);
            return;
        }

        let isMounted = true;

        const fetchContractDetails = async () => {
            try {
                setContractDetailsLoading(true);

                const data = await apiGetContractDetails(resolvedContractId);

                if (isMounted) {
                    setContractDetailsData(data);
                }
            } catch (err) {
                console.error("Failed to fetch contract details for influencer budget", err);

                if (isMounted) {
                    setContractDetailsData(null);
                }
            } finally {
                if (isMounted) {
                    setContractDetailsLoading(false);
                }
            }
        };

        fetchContractDetails();

        return () => {
            isMounted = false;
        };
    }, [resolvedContractId]);

    const resolvedInfluencerName =
        (view as any)?.profileName ||
        (view as any)?.header?.profileName ||
        (view as any)?.raw?.influencer?.name ||
        (view as any)?.influencer?.name ||
        "";

    const resolvedCampaignName =
        (view as any)?.raw?.campaign?.campaignTitle ||
        (view as any)?.raw?.campaign?.productOrServiceName ||
        (view as any)?.contract?.content?.campaign?.campaignTitle ||
        (view as any)?.contract?.content?.campaign?.productOrServiceName ||
        "the campaign";

    const defaultPlatform = getDefaultPlatformFromView(view);

    useEffect(() => {
        if (!resolvedCampaignId) {
            setApiMilestones([]);
            setError("Missing campaign id.");
            return;
        }

        let isMounted = true;

        const fetchMilestones = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await apiGetMilestonesByCampaign({
                    campaignId: resolvedCampaignId,
                    brandId: resolvedBrandId || "",
                });

                if (!isMounted) return;

                const nextMilestones =
                    Array.isArray((res as any)?.milestones)
                        ? (res as any).milestones
                        : Array.isArray((res as any)?.data?.milestones)
                            ? (res as any).data.milestones
                            : Array.isArray((res as any)?.data?.data?.milestones)
                                ? (res as any).data.data.milestones
                                : [];

                const filteredMilestones = resolvedInfluencerId
                    ? nextMilestones.filter(
                        (item: any) =>
                            String(item?.influencerId || "") ===
                            String(resolvedInfluencerId)
                    )
                    : nextMilestones;

                setApiMilestones(filteredMilestones);
            } catch (err) {
                const message = getErrorMessage(
                    err,
                    "Failed to load milestones."
                );

                console.error("Failed to fetch campaign milestones", err);

                if (!isMounted) return;

                setError(message);
                setApiMilestones([]);

                toast({
                    icon: "error",
                    title: "Milestones not loaded",
                    text: message,
                });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchMilestones();

        return () => {
            isMounted = false;
        };
    }, [resolvedCampaignId, resolvedBrandId, resolvedInfluencerId, milestoneRefreshKey]);

    const fallbackMilestones =
        Array.isArray((view as any)?.milestones) &&
            (view as any).milestones.length > 0
            ? (view as any).milestones
            : Array.isArray((view as any)?.milestonesTab?.milestones)
                ? (view as any).milestonesTab.milestones
                : [];

    const milestones = useMemo(() => {
        const source =
            apiMilestones.length > 0 ? apiMilestones : fallbackMilestones;

        return source.map((item: any, index: number) => {
            if (item?.raw) {
                const { raw, ...itemWithoutRaw } = item;
                return normalizeMilestoneRow(
                    {
                        ...raw,
                        ...itemWithoutRaw,
                    },
                    index,
                    defaultPlatform
                );
            }

            return normalizeMilestoneRow(item, index, defaultPlatform);
        });
    }, [apiMilestones, fallbackMilestones, defaultPlatform]);

    const detailedContract = useMemo(() => {
        return getContractDoc(contractDetailsData);
    }, [contractDetailsData]);

    const selectedContractMeta = useMemo(() => {
        return (
            detailedContract ||
            (view as any)?.raw?.contract ||
            (view as any)?.contract ||
            (view as any)?.raw?.contractData ||
            null
        );
    }, [detailedContract, view]);

    const firstMilestoneForCurrentInfluencer = useMemo(() => {
        return milestones.find(
            (item: any) =>
                String(item?.raw?.influencerId || item?.influencerId || "") ===
                String(resolvedInfluencerId || "")
        );
    }, [milestones, resolvedInfluencerId]);

    const selectedInfluencerBudget = useMemo(() => {
        const contractBudget = getInfluencerBudgetFromContract(selectedContractMeta);

        if (contractBudget > 0) {
            return contractBudget;
        }

        // If this is contract flow, do not fallback to milestone/byCampaign values,
        // because those can contain campaign budget / wrong influencerBudget.
        if (resolvedContractId) {
            return 0;
        }

        // Only fallback for admin/no-contract flow.
        const rawMilestone = firstMilestoneForCurrentInfluencer?.raw || {};

        return firstPositiveNumber(
            rawMilestone?.influencerBudget,
            firstMilestoneForCurrentInfluencer?.influencerBudget,
            rawMilestone?.feeAmount,
            firstMilestoneForCurrentInfluencer?.feeAmount
        );
    }, [
        selectedContractMeta,
        resolvedContractId,
        firstMilestoneForCurrentInfluencer,
    ]);

    const selectedInfluencerUsedMilestoneBudget = useMemo(() => {
        return milestones
            .filter(
                (item: any) =>
                    String(item?.raw?.influencerId || item?.influencerId || "") ===
                    String(resolvedInfluencerId || "")
            )
            .reduce(
                (sum: number, item: any) =>
                    sum +
                    Number(
                        item?.raw?.milestoneBudget ||
                        item?.milestoneBudget ||
                        item?.raw?.amount ||
                        item?.amount ||
                        0
                    ),
                0
            );
    }, [milestones, resolvedInfluencerId]);

    const fetchDeliverablesForMilestone = async (
        milestone: any,
        rowId: string
    ) => {
        const milestoneId = getResolvedMilestoneId(milestone);
        const milestoneHistoryId = getResolvedMilestoneHistoryId(milestone);

        if (!milestoneHistoryId) {
            const message = "Missing milestone history id.";

            setDeliverablesErrorByRow((prev) => ({
                ...prev,
                [rowId]: message,
            }));

            toast({
                icon: "warning",
                title: "Cannot load deliverables",
                text: message,
            });

            return;
        }

        try {
            setDeliverablesLoadingByRow((prev) => ({
                ...prev,
                [rowId]: true,
            }));

            setDeliverablesErrorByRow((prev) => ({
                ...prev,
                [rowId]: "",
            }));

            const res = await apiGetAllDeliverablesByMilestone({
                milestoneId,
                milestoneHistoryId,
            });

            const nextDeliverables = extractDeliverablesFromResponse(res);

            setDeliverablesByRow((prev) => ({
                ...prev,
                [rowId]: nextDeliverables,
            }));
        } catch (err) {
            const message = getErrorMessage(
                err,
                "Failed to load deliverables."
            );

            console.error("Failed to fetch deliverables for this Milestone", err);

            setDeliverablesErrorByRow((prev) => ({
                ...prev,
                [rowId]: message,
            }));

            setDeliverablesByRow((prev) => ({
                ...prev,
                [rowId]: [],
            }));

            toast({
                icon: "error",
                title: "Deliverables not loaded",
                text: message,
            });
        } finally {
            setDeliverablesLoadingByRow((prev) => ({
                ...prev,
                [rowId]: false,
            }));
        }
    };

    const updateDeliverableStatusInCache = (
        deliverable: any,
        status: "approved" | "revision",
        comments = ""
    ) => {
        const deliverableId = getDeliverableId(deliverable);

        setDeliverablesByRow((prev) => {
            const next = { ...prev };

            Object.keys(next).forEach((rowId) => {
                next[rowId] = next[rowId].map((item) => {
                    const itemId = getDeliverableId(item);

                    if (itemId !== deliverableId) return item;

                    return {
                        ...item,
                        status,
                        comments,
                        updatedAt: new Date().toISOString(),
                    };
                });
            });

            return next;
        });
    };

    const handleUpdateDeliverableStatus = async (
        deliverable: any,
        status: "approved" | "revision"
    ) => {
        const deliverableId = getDeliverableId(deliverable);

        if (!deliverableId) {
            toast({
                icon: "warning",
                title: "Action unavailable",
                text: "Missing deliverable id.",
            });
            return;
        }

        if (isLockedDeliverableStatus(deliverable?.status)) {
            toast({
                icon: "info",
                title: "Action locked",
                text: "This deliverable has already been approved or moved to revision.",
            });
            return;
        }

        if (!isSubmittedDeliverableStatus(deliverable?.status)) {
            toast({
                icon: "warning",
                title: "Action unavailable",
                text: "Only submitted deliverables can be approved.",
            });
            return;
        }

        const promptValue =
            status === "revision"
                ? window.prompt("Add revision comment", deliverable?.comments || "")
                : deliverable?.comments || "";

        if (status === "revision" && promptValue === null) return;

        const milestoneId =
            deliverable?.milestoneId ||
            deliverable?.raw?.milestoneId ||
            "";

        const milestoneHistoryId =
            deliverable?.milestoneHistoryId ||
            deliverable?.raw?.milestoneHistoryId ||
            "";

        const comments =
            status === "revision" ? promptValue || "" : promptValue || "";

        if (!milestoneId || !milestoneHistoryId) {
            toast({
                icon: "warning",
                title: "Action unavailable",
                text: "Missing milestone id or milestone history id.",
            });
            return;
        }

        try {
            setUpdatingDeliverableIds((prev) => ({
                ...prev,
                [deliverableId]: true,
            }));

            const res = await apiApproveDeliverable({
                milestoneId,
                milestoneHistoryId,
                deliverableId,
                comments,
                approvedRole: "Brand",
                approvalId: deliverable?.approvalId || "",
            });

            const updatedDeliverable = extractUpdatedDeliverable(
                res,
                deliverable,
                status,
                comments
            );

            const finalUpdatedDeliverable = {
                ...deliverable,
                ...updatedDeliverable,
                status: "approved",
                comments,
                approvedAt:
                    updatedDeliverable?.approvedAt ||
                    updatedDeliverable?.data?.approvedAt ||
                    new Date().toISOString(),
            };

            setDeliverablesByRow((prev) => {
                const next = { ...prev };

                Object.keys(next).forEach((rowId) => {
                    next[rowId] = next[rowId].map((item) => {
                        const itemId = getDeliverableId(item);

                        if (itemId !== deliverableId) return item;

                        return {
                            ...item,
                            ...finalUpdatedDeliverable,
                        };
                    });
                });

                return next;
            });

            setApiMilestones((prev) =>
                prev.map((milestoneItem) => {
                    const raw = milestoneItem?.raw || milestoneItem;
                    const milestoneDeliverables = Array.isArray(raw?.deliverables)
                        ? raw.deliverables
                        : [];

                    const hasTargetDeliverable = milestoneDeliverables.some(
                        (item: any) => getDeliverableId(item) === deliverableId
                    );

                    if (!hasTargetDeliverable) return milestoneItem;

                    const updatedDeliverables = milestoneDeliverables.map((item: any) => {
                        if (getDeliverableId(item) !== deliverableId) return item;

                        return {
                            ...item,
                            ...finalUpdatedDeliverable,
                        };
                    });

                    return {
                        ...milestoneItem,
                        deliverables: updatedDeliverables,
                        raw: {
                            ...raw,
                            deliverables: updatedDeliverables,
                        },
                    };
                })
            );

            setViewDeliverableTarget((prev) => {
                if (!prev) return prev;

                const currentDeliverableId = getDeliverableId(prev.deliverable);

                if (currentDeliverableId !== deliverableId) return prev;

                return {
                    ...prev,
                    deliverable: {
                        ...prev.deliverable,
                        ...finalUpdatedDeliverable,
                    },
                };
            });

            toast({
                icon: "success",
                title:
                    status === "approved"
                        ? "Deliverable approved"
                        : "Revision requested",
                text:
                    status === "approved"
                        ? "The deliverable status has been updated successfully."
                        : "The deliverable has been moved to revision.",
            });
        } catch (err) {
            const message = getErrorMessage(
                err,
                "Failed to update deliverable status."
            );

            console.error("Failed to update deliverable approval status", err);

            toast({
                icon: "error",
                title: "Status update failed",
                text: message,
            });
        } finally {
            setUpdatingDeliverableIds((prev) => ({
                ...prev,
                [deliverableId]: false,
            }));
        }
    };

    const shouldOpenCampaignFeedbackAfterRelease = async () => {
        const payload = getCampaignFeedbackPayload();

        if (!payload) {
            return false;
        }

        try {
            const res = await post<any>("/campaign-reviews/brand/prompt-state", payload);
            const result = res?.data ?? res;

            return Boolean(result?.data?.shouldPrompt ?? result?.shouldPrompt);
        } catch {
            return false;
        }
    };

    const handleCloseCampaignFeedback = async () => {
        setCampaignFeedbackOpen(false);

        if (campaignFeedbackSubmittedRef.current) {
            campaignFeedbackSubmittedRef.current = false;
            return;
        }

        const payload = getCampaignFeedbackPayload();

        if (!payload) {
            return;
        }

        try {
            await post<any>("/campaign-reviews/brand/skip", {
                ...payload,
                skipReason: "closed_without_submit",
            });
        } catch (err) {
            console.error("Failed to mark campaign feedback skipped", err);
        }
    };

    const handleReleaseMilestone = async (milestone: any) => {
        const milestoneId = getResolvedMilestoneId(milestone);
        const milestoneHistoryId = getResolvedMilestoneHistoryId(milestone);

        if (!milestoneId || !milestoneHistoryId) {
            toast({
                icon: "warning",
                title: "Cannot approve milestone",
                text: "Missing milestone id or milestone history id.",
            });
            return;
        }

        if (isReleasedMilestone(milestone)) {
            toast({
                icon: "info",
                title: "Milestone already approved",
                text: "This milestone has already been released.",
            });
            return;
        }

        if (!isMilestoneSubmittedByInfluencer(milestone)) {
            toast({
                icon: "warning",
                title: "Milestone not submitted",
                text: "Influencer must click Submit Milestone before payment can be released.",
            });
            return;
        }

        const loadingKey = milestoneHistoryId;
        const isFirstMilestoneRelease = !apiMilestones.some((item) =>
            isReleasedMilestone(item)
        );

        try {
            setReleasingMilestoneIds((prev) => ({
                ...prev,
                [loadingKey]: true,
            }));

            const res = await apiReleaseMilestone({
                milestoneId,
                milestoneHistoryId,
            });

            const updatedMilestone =
                (res as any)?.milestone ||
                (res as any)?.data?.milestone ||
                (res as any)?.data ||
                res ||
                {};

            setApiMilestones((prev) =>
                prev.map((item) => {
                    const itemHistoryId = String(
                        item?.milestoneHistoryId || item?._id || ""
                    );

                    const itemMilestoneId = String(item?.milestoneId || "");

                    const isSameMilestone =
                        itemHistoryId === milestoneHistoryId ||
                        itemMilestoneId === milestoneId;

                    if (!isSameMilestone) return item;

                    return {
                        ...item,
                        ...updatedMilestone,
                        released: true,
                        releasedAt:
                            updatedMilestone?.releasedAt ||
                            item?.releasedAt ||
                            new Date().toISOString(),
                        payoutStatus:
                            updatedMilestone?.payoutStatus ||
                            updatedMilestone?.status ||
                            "released",
                    };
                })
            );

            toast({
                icon: "success",
                title: "Milestone approved",
                text: "The milestone has been released successfully.",
            });

            if (isFirstMilestoneRelease) {
                const shouldOpenFeedback = await shouldOpenCampaignFeedbackAfterRelease();

                if (shouldOpenFeedback) {
                    campaignFeedbackSubmittedRef.current = false;
                    setCampaignFeedbackOpen(true);
                }
            }
        } catch (err) {
            const message = getErrorMessage(
                err,
                "Failed to approve milestone."
            );

            console.error("Failed to release milestone", err);

            toast({
                icon: "error",
                title: "Milestone approval failed",
                text: message,
            });
        } finally {
            setReleasingMilestoneIds((prev) => ({
                ...prev,
                [loadingKey]: false,
            }));
        }
    };

    const handleOpenAddMilestone = () => {
        if (!resolvedCampaignId) {
            toast({
                icon: "warning",
                title: "Cannot add milestone",
                text: "Missing campaign id.",
            });
            return;
        }

        if (!resolvedBrandId) {
            toast({
                icon: "warning",
                title: "Cannot add milestone",
                text: "Missing brand id.",
            });
            return;
        }

        if (!resolvedInfluencerId) {
            toast({
                icon: "warning",
                title: "Cannot add milestone",
                text: "Missing influencer id.",
            });
            return;
        }

        if (!resolvedContractId) {
            toast({
                icon: "warning",
                title: "Cannot add milestone",
                text: "Missing contract id.",
            });
            return;
        }
        if (resolvedContractId && contractDetailsLoading) {
            toast({
                icon: "info",
                title: "Loading contract budget",
                text: "Please wait while we fetch the influencer budget from the contract.",
            });
            return;
        }

        setMilestoneTargetRow(null);
        setIsAddMilestoneOpen(true);
    };



    const handleCloseAddMilestone = () => {
        setIsAddMilestoneOpen(false);
        setMilestoneTargetRow(null);
    };

    const handleAddMilestoneSubmit = async () => {
        setIsAddMilestoneOpen(false);
        setMilestoneRefreshKey((prev) => prev + 1);

        toast({
            icon: "success",
            title: "Milestone added",
            text: "The milestone list has been refreshed.",
        });
    };

    const handleToggleMilestone = async (milestone: any, rowId: string) => {
        const isCurrentlyExpanded = expandedRowId === rowId;

        if (isCurrentlyExpanded) {
            setExpandedRowId(null);
            return;
        }

        setExpandedRowId(rowId);
        await fetchDeliverablesForMilestone(milestone, rowId);
    };

    const handleOpenAddRevision = (milestone: any, deliverable: any) => {
        const status = getDeliverableStatus(deliverable);

        if (isLockedDeliverableStatus(status)) {
            toast({
                icon: "info",
                title: "Action locked",
                text: "This deliverable has already been approved or moved to revision.",
            });
            return;
        }

        if (!isSubmittedDeliverableStatus(status)) {
            toast({
                icon: "warning",
                title: "Revision unavailable",
                text: "Revision can be raised only after the deliverable is submitted.",
            });
            return;
        }

        setRevisionTarget({
            milestone,
            deliverable,
        });
    };

    const handleOpenViewDeliverable = (milestone: any, deliverable: any) => {
        setViewDeliverableTarget({
            milestone,
            deliverable,
        });
    };

    const handleCloseViewDeliverable = () => {
        setViewDeliverableTarget(null);
    };

    const handleRaiseRevisionFromView = (milestone: any, deliverable: any) => {
        setViewDeliverableTarget(null);
        handleOpenAddRevision(milestone, deliverable);
    };

    const handleEditMilestoneFromDeliverableView = (milestone: any) => {
        const rawMilestone = milestone?.raw || milestone || {};

        if (isMilestoneEditLocked(rawMilestone)) {
            toast({
                icon: "info",
                title: "Edit locked",
                text: "This milestone cannot be edited because payout is initiated or influencer has accepted it.",
            });
            return;
        }

        setViewDeliverableTarget(null);

        setMilestoneTargetRow({
            id: String(
                rawMilestone?.influencerId ||
                milestone?.influencerId ||
                resolvedInfluencerId ||
                ""
            ),
            name:
                rawMilestone?.influencerName ||
                milestone?.influencerName ||
                resolvedInfluencerName ||
                "Influencer",
            raw: rawMilestone,
        });

        setIsAddMilestoneOpen(true);
    };

    const handleCloseAddRevision = () => {
        setRevisionTarget(null);
    };

    const handleRaiseRevisionSubmit = async ({
        requestPayload,
        response,
    }: any) => {
        const updatedDeliverable =
            response?.deliverable ||
            response?.data?.deliverable ||
            response?.data?.data?.deliverable ||
            null;

        const targetDeliverableId =
            updatedDeliverable?.deliverableId || requestPayload?.deliverableId;

        setDeliverablesByRow((prev) => {
            const next = { ...prev };

            Object.keys(next).forEach((rowId) => {
                next[rowId] = next[rowId].map((item) => {
                    const itemId = getDeliverableId(item);

                    if (String(itemId) !== String(targetDeliverableId)) {
                        return item;
                    }

                    return {
                        ...item,
                        status: updatedDeliverable?.status || "revision",
                        comments:
                            updatedDeliverable?.comments ||
                            requestPayload?.notes ||
                            item?.comments ||
                            "",
                        revisionRequestedAt:
                            updatedDeliverable?.revisionRequestedAt ||
                            new Date().toISOString(),
                    };
                });
            });

            return next;
        });

        setRevisionTarget(null);
        setMilestoneRefreshKey((prev) => prev + 1);
    };

    const allRevisionRows = useMemo(() => {
        return milestones.flatMap((item: any, index: number) => {
            const rowId = String(item?.id || item?._id || index);

            const milestoneDeliverables = getMilestoneDeliverablesForRelease(
                item,
                rowId,
                deliverablesByRow
            );

            return getRevisionRowsFromDeliverables(milestoneDeliverables);
        });
    }, [milestones, deliverablesByRow]);

    return (
        <section className="flex w-full flex-col px-4 py-5">
            <ToastStyles />
            <AddMilestoneCard
                open={isAddMilestoneOpen}
                onClose={handleCloseAddMilestone}
                brandId={resolvedBrandId || ""}
                contractId={resolvedContractId || ""}
                campaignId={resolvedCampaignId || ""}
                influencerId={resolvedInfluencerId || ""}
                influencerName={resolvedInfluencerName || "Influencer"}
                influencerBudget={selectedInfluencerBudget}
                usedMilestoneBudget={selectedInfluencerUsedMilestoneBudget}
                mode={milestoneTargetRow?.raw ? "edit" : "create"}
                milestoneId={
                    milestoneTargetRow?.raw
                        ? getResolvedMilestoneId(milestoneTargetRow.raw)
                        : ""
                }
                milestoneHistoryId={
                    milestoneTargetRow?.raw
                        ? getResolvedMilestoneHistoryId(milestoneTargetRow.raw)
                        : ""
                }
                milestoneData={milestoneTargetRow?.raw || null}
                onSubmit={handleAddMilestoneSubmit}
            />
            <AddRevision
                open={Boolean(revisionTarget)}
                onClose={handleCloseAddRevision}
                milestone={revisionTarget?.milestone}
                deliverable={revisionTarget?.deliverable}
                onSubmit={handleRaiseRevisionSubmit}
            />
            <ViewDeliverableSidebar
                open={Boolean(viewDeliverableTarget)}
                onClose={handleCloseViewDeliverable}
                milestone={viewDeliverableTarget?.milestone}
                deliverable={viewDeliverableTarget?.deliverable}
                isUpdating={Boolean(
                    updatingDeliverableIds[
                    getDeliverableId(viewDeliverableTarget?.deliverable || {})
                    ]
                )}
                onApprove={(deliverable) =>
                    handleUpdateDeliverableStatus(deliverable, "approved")
                }
                onRaiseRevision={handleRaiseRevisionFromView}
                onEditMilestone={handleEditMilestoneFromDeliverableView}
            />

            <CampaignFeedbackModal
                open={campaignFeedbackOpen}
                onClose={handleCloseCampaignFeedback}
                campaignId={resolvedCampaignId || ""}
                brandId={resolvedBrandId || ""}
                influencerId={resolvedInfluencerId || ""}
                influencerName={resolvedInfluencerName || "the creator"}
                campaignName={resolvedCampaignName || "the campaign"}
                onSubmitted={() => {
                    campaignFeedbackSubmittedRef.current = true;
                    setCampaignFeedbackOpen(false);

                    toast({
                        icon: "success",
                        title: "Feedback submitted",
                        text: "Campaign feedback has been submitted successfully.",
                    });
                }}
            />

            <div className="flex w-full items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                    <h2 className="self-stretch font-['Inter'] text-xl font-semibold leading-7 tracking-[0] text-[#1A1A1A]">
                        Milestone &amp; Deliverables
                    </h2>

                    <p className="mt-2 font-['Inter'] text-sm font-normal leading-5 tracking-[0] text-[#B8B8B8]">
                        Handpicked influencers matched to your campaign objectives and target audience.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpenAddMilestone}
                        className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#E6E6E6] bg-white px-3 font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A] transition hover:bg-[#F9F9F9]"
                    >
                        Add Milestone
                    </button>

                    <div className="relative">
                        <select
                            className="h-8 appearance-none rounded-lg border border-[#E6E6E6] bg-white pl-3 pr-8 font-['Inter'] text-sm font-medium leading-5 text-[#1A1A1A] outline-none transition hover:bg-[#F9F9F9]"
                            defaultValue="last-7-days"
                        >
                            <option value="last-7-days">Last 7 days</option>
                            <option value="last-30-days">Last 30 days</option>
                            <option value="last-90-days">Last 90 days</option>
                        </select>

                        <CaretDown
                            size={14}
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-10 w-full overflow-x-auto">
                <div className="min-w-[65rem]">
                    <div
                        className="grid w-full items-center self-stretch rounded-[0.75rem] bg-[#F9F9F9]"
                        style={{
                            gridTemplateColumns:
                                "139px minmax(228px,1fr) 139px 139px 111px 130px 139px",
                        }}
                    >
                        <HeaderCell>Deliverable</HeaderCell>
                        <HeaderCell>Content format</HeaderCell>
                        <HeaderCell>Platform</HeaderCell>
                        <HeaderCell>Status</HeaderCell>
                        <HeaderCell>Quantity</HeaderCell>
                        <HeaderCell>Deadline</HeaderCell>
                        <HeaderCell>Action</HeaderCell>
                    </div>

                    <div className="mt-7 flex flex-col gap-7">
                        {loading ? (
                            <div className="flex min-h-[5.5rem] w-full items-center justify-center rounded-[0.75rem] border border-[#E6E6E6] bg-white font-['Inter'] text-sm text-[#969696]">
                                Loading milestones...
                            </div>
                        ) : error && milestones.length === 0 ? (
                            <div className="flex min-h-[5.5rem] w-full items-center justify-center rounded-[0.75rem] border border-[#E6E6E6] bg-white font-['Inter'] text-sm text-[#E53935]">
                                {error}
                            </div>
                        ) : milestones.length > 0 ? (
                            milestones.map((item: any, index: number) => {
                                const rowId = String(
                                    item?.id || item?._id || index
                                );
                                const isExpanded = expandedRowId === rowId;
                                const milestoneHistoryId =
                                    getResolvedMilestoneHistoryId(item);


                                const allDeliverablesApproved =
                                    areAllMilestoneDeliverablesApproved(
                                        item,
                                        rowId,
                                        deliverablesByRow
                                    );

                                const milestoneReleased = isReleasedMilestone(item);
                                const milestoneSubmittedByInfluencer =
                                    isMilestoneSubmittedByInfluencer(item);

                                const releaseDisabled =
                                    Boolean(releasingMilestoneIds[milestoneHistoryId]) ||
                                    milestoneReleased ||
                                    !milestoneSubmittedByInfluencer ||
                                    !allDeliverablesApproved;

                                return (
                                    <div
                                        key={rowId}
                                        className="overflow-hidden rounded-[0.75rem] border border-[#E6E6E6] bg-white"
                                    >
                                        <div
                                            className="grid w-full items-center bg-white"
                                            style={{
                                                gridTemplateColumns:
                                                    "139px minmax(228px,1fr) 139px 139px 111px 130px 139px",
                                            }}
                                        >
                                            <RowCell>
                                                <p className="line-clamp-2 font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A]">
                                                    {textOrNA(item?.name)}
                                                </p>
                                            </RowCell>

                                            <RowCell>
                                                <p className="line-clamp-2 max-w-[14.25rem] font-['Inter'] text-sm font-normal leading-5 text-[#1A1A1A]">
                                                    {textOrNA(item?.format)}
                                                </p>
                                            </RowCell>

                                            <RowCell align="center">
                                                <PlatformBadgeIcons
                                                    platforms={
                                                        Array.isArray(item?.platforms)
                                                            ? item.platforms
                                                            : normalizeMilestonePlatforms(item?.raw || item, defaultPlatform)
                                                    }
                                                />
                                            </RowCell>

                                            <RowCell align="center">
                                                <StatusPill
                                                    status={textOrNA(
                                                        item?.status
                                                    )}
                                                />
                                            </RowCell>

                                            <RowCell align="center">
                                                <p className="font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A]">
                                                    {textOrNA(item?.qty)}
                                                </p>
                                            </RowCell>

                                            <RowCell align="center">
                                                <p className="font-['Inter'] text-base font-medium leading-6 text-[#1A1A1A]">
                                                    {textOrNA(item?.deadline)}
                                                </p>
                                            </RowCell>

                                            <RowCell align="center">
                                                <div className="flex h-[5.5rem] items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={releaseDisabled}
                                                        title={
                                                            !milestoneSubmittedByInfluencer && !milestoneReleased
                                                                ? "Influencer must click Submit Milestone before payment can be released."
                                                                : !allDeliverablesApproved && !milestoneReleased
                                                                    ? "All deliverables and revisions must be approved before release."
                                                                    : undefined
                                                        }
                                                        onClick={() => handleReleaseMilestone(item)}
                                                        className="flex h-10 min-w-[4.625rem] items-center justify-center rounded-lg bg-[#1A1A1A] px-5 font-['Inter'] text-sm font-medium leading-5 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#969696]"
                                                    >
                                                        {releasingMilestoneIds[milestoneHistoryId]
                                                            ? "Releasing..."
                                                            : milestoneReleased
                                                                ? "Released"
                                                                : "Release"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label={
                                                            isExpanded
                                                                ? "Collapse milestone"
                                                                : "Expand milestone"
                                                        }
                                                        onClick={() =>
                                                            handleToggleMilestone(
                                                                item,
                                                                rowId
                                                            )
                                                        }
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1A1A1A] transition hover:bg-[#F5F5F5]"
                                                    >
                                                        {isExpanded ? (
                                                            <CaretUp
                                                                size={16}
                                                                weight="bold"
                                                            />
                                                        ) : (
                                                            <CaretDown
                                                                size={16}
                                                                weight="bold"
                                                            />
                                                        )}
                                                    </button>
                                                </div>
                                            </RowCell>
                                        </div>

                                        {isExpanded ? (
                                            <DeliverablesPanel
                                                deliverables={deliverablesByRow[rowId] || []}
                                                loading={Boolean(deliverablesLoadingByRow[rowId])}
                                                error={deliverablesErrorByRow[rowId] || ""}
                                                defaultPlatform={defaultPlatform}
                                                updatingDeliverableIds={updatingDeliverableIds}
                                                milestone={item}
                                                onReleasePayment={(deliverable) =>
                                                    handleUpdateDeliverableStatus(deliverable, "approved")
                                                }
                                                onAddRevision={handleOpenAddRevision}
                                                onViewDeliverable={handleOpenViewDeliverable}
                                            />
                                        ) : null}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[5.5rem] w-full items-center justify-center rounded-[0.75rem] border border-[#E6E6E6] bg-white font-['Inter'] text-sm text-[#969696]">
                                No deliverables found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 w-full">
                <MainRevisionHistoryTable revisions={allRevisionRows} />
            </div>
        </section>
    );
}

