"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Eye,
    FolderOpen,
    Wallet,
    CalendarDays,
    UserRound,
    CircleDollarSign,
    CheckCircle2,
    Clock3,
    X,
} from "lucide-react";
import Swal from "sweetalert2";

import { Button } from "@/components/ui/buttonComp";
import { Skeleton } from "@/components/ui/skeleton";
import {
    apiCampaignViewByBrand,
    apiGetMilestonesByCampaign,
    apiReleaseMilestone,
    getApiErrorMessage,
    type CampaignMilestoneRow,
} from "@/app/brand/services/brandApi";

type MilestoneGroup = {
    influencerId: string;
    influencerName: string;
    items: CampaignMilestoneRow[];
};

function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));
}
function getInfluencerDisplayName(row: Partial<CampaignMilestoneRow>) {
    return (
        row.influencerName ||
        (row as any).name ||
        (row as any).influencer?.name ||
        "Unknown Influencer"
    );
}
function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

function statusBadge(row: CampaignMilestoneRow) {
    if (row.payoutStatus === "paid") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Paid
            </span>
        );
    }

    if (row.payoutStatus === "initiated") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                <Clock3 className="h-3.5 w-3.5" />
                Initiated
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />
            Pending
        </span>
    );
}

function ViewMilestoneModal({
    open,
    onClose,
    row,
}: {
    open: boolean;
    onClose: () => void;
    row: CampaignMilestoneRow | null;
}) {
    if (!open || !row) return null;

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[34rem] overflow-hidden rounded-2xl bg-white shadow-[0_24px_48px_rgba(0,0,0,0.18)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-[#EFEFEF] px-5 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-[#1A1A1A]">
                            {row.milestoneTitle || "Milestone"}
                        </h3>
                        <p className="mt-1 text-sm text-[#6F6F6F]">
                            {getInfluencerDisplayName(row)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-[#777777] transition hover:bg-[#F2F2F2]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-4 py-3">
                            <div className="text-xs text-[#777777]">Amount</div>
                            <div className="mt-1 text-sm font-semibold text-[#1A1A1A]">
                                {formatMoney(row.amount)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-4 py-3">
                            <div className="text-xs text-[#777777]">Status</div>
                            <div className="mt-1">{statusBadge(row)}</div>
                        </div>

                        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-4 py-3">
                            <div className="text-xs text-[#777777]">Created</div>
                            <div className="mt-1 text-sm font-medium text-[#1A1A1A]">
                                {formatDate(row.createdAt)}
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-4 py-3">
                            <div className="text-xs text-[#777777]">Released</div>
                            <div className="mt-1 text-sm font-medium text-[#1A1A1A]">
                                {formatDate(row.releasedAt)}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#ECECEC] bg-white px-4 py-4">
                        <div className="mb-2 text-sm font-semibold text-[#1A1A1A]">
                            Description
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[#4F4F4F]">
                            {row.milestoneDescription || "No description added."}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end border-t border-[#EFEFEF] px-5 py-4">
                    <Button type="button" onClick={onClose} className="h-10 rounded-lg px-5">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function BrandMilestonesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const campaignId = searchParams.get("campaignId") || searchParams.get("id") || "";
    const queryBrandId = searchParams.get("brandId") || "";
    const influencerIdFilter = searchParams.get("influencerId") || "";

    const [brandId, setBrandId] = useState("");
    const [campaignTitle, setCampaignTitle] = useState("Campaign Milestones");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [milestones, setMilestones] = useState<CampaignMilestoneRow[]>([]);
    const [selectedMilestone, setSelectedMilestone] =
        useState<CampaignMilestoneRow | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [releasingId, setReleasingId] = useState("");

    useEffect(() => {
        const fallbackBrandId =
            typeof window !== "undefined" ? localStorage.getItem("brandId") || "" : "";
        setBrandId(queryBrandId || fallbackBrandId);
    }, [queryBrandId]);

    const fetchPageData = useCallback(async () => {
        if (!campaignId || !brandId) return;

        try {
            setLoading(true);
            setError("");

            const [campaignRes, milestoneRes] = await Promise.all([
                apiCampaignViewByBrand({
                    brandId,
                    campaignId,
                }).catch(() => null),
                apiGetMilestonesByCampaign({
                    campaignId,
                    brandId,
                }),
            ]);

            const title =
                campaignRes?.campaignTitle ||
                campaignRes?.productOrServiceName ||
                campaignRes?.title ||
                "Campaign Milestones";

            setCampaignTitle(title);
            setMilestones(milestoneRes?.milestones || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load milestones"));
        } finally {
            setLoading(false);
        }
    }, [brandId, campaignId]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const groupedMilestones = useMemo<MilestoneGroup[]>(() => {
        const filtered = (milestones || []).filter((row) =>
            influencerIdFilter ? String(row.influencerId) === String(influencerIdFilter) : true
        );

        const map = new Map<string, MilestoneGroup>();

        filtered.forEach((row) => {
            const key = String(row.influencerId || "unknown");

            if (!map.has(key)) {
                map.set(key, {
                    influencerId: key,
                    influencerName: getInfluencerDisplayName(row),
                    items: [],
                });
            }

            map.get(key)!.items.push(row);
        });

        return Array.from(map.values())
            .map((group) => ({
                ...group,
                items: [...group.items].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ),
            }))
            .sort((a, b) => a.influencerName.localeCompare(b.influencerName));
    }, [milestones, influencerIdFilter]);

    const handleSeeDeliverable = (row: CampaignMilestoneRow) => {
        router.push(
            `/brand/deleverables?campaignId=${row.campaignId}&brandId=${brandId}&influencerId=${row.influencerId}&milestoneId=${row.milestoneId}&milestoneHistoryId=${row.milestoneHistoryId}`
        );
    };
    const handleRelease = async (row: CampaignMilestoneRow) => {
        if (row.released || row.payoutStatus === "initiated" || row.payoutStatus === "paid") {
            return;
        }

        const result = await Swal.fire({
            title: "Release milestone?",
            text: `Release milestone "${row.milestoneTitle}" for ${formatMoney(row.amount)}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, release it",
            cancelButtonText: "Cancel",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        try {
            setReleasingId(row.milestoneHistoryId);

            await apiReleaseMilestone({
                milestoneId: row.milestoneId,
                milestoneHistoryId: row.milestoneHistoryId,
            });

            await fetchPageData();

            await Swal.fire({
                title: "Released",
                text: "Milestone released successfully.",
                icon: "success",
                confirmButtonText: "OK",
            });
        } catch (err) {
            await Swal.fire({
                title: "Failed",
                text: getApiErrorMessage(err, "Failed to release milestone"),
                icon: "error",
                confirmButtonText: "OK",
            });
        } finally {
            setReleasingId("");
        }
    };

    if (!campaignId) {
        return (
            <div className="p-6 text-sm text-red-600">Campaign ID is missing in URL.</div>
        );
    }

    if (!brandId) {
        return (
            <div className="p-6 text-sm text-red-600">Brand ID is missing.</div>
        );
    }

    return (
        <>
            <div className="mx-auto min-h-screen max-w-7xl space-y-6 p-4 md:p-8">
                <div className="sticky top-0 z-20 rounded-xl border border-gray-200 bg-white/90 p-4 backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <div className="text-xs font-medium uppercase tracking-wide text-[#7A7A7A]">
                                Brand Milestones
                            </div>
                            <h1 className="truncate text-2xl font-bold text-[#1A1A1A] md:text-3xl">
                                {campaignTitle}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                            >
                                <Skeleton className="h-5 w-48 rounded bg-gray-200" />
                                <div className="mt-4 space-y-3">
                                    <Skeleton className="h-16 w-full rounded bg-gray-200" />
                                    <Skeleton className="h-16 w-full rounded bg-gray-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                ) : groupedMilestones.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F5]">
                            <Wallet className="h-6 w-6 text-[#6F6F6F]" />
                        </div>
                        <div className="mt-4 text-lg font-semibold text-[#1A1A1A]">
                            No milestones found
                        </div>
                        <div className="mt-1 text-sm text-[#6F6F6F]">
                            This campaign does not have any milestones yet.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groupedMilestones.map((group) => (
                            <div
                                key={group.influencerId}
                                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                            >
                                <div className="border-b border-[#EFEFEF] bg-[#FAFAFA] px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white">
                                            <UserRound className="h-5 w-5" />
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold text-[#1A1A1A]">
                                                {group.influencerName}
                                            </div>
                                            <div className="text-xs text-[#777777]">
                                                {group.items.length} milestone{group.items.length > 1 ? "s" : ""}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-[#F1F1F1]">
                                    {group.items.map((row) => (
                                        <div
                                            key={row.milestoneHistoryId}
                                            className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-semibold text-[#1A1A1A]">
                                                        {row.milestoneTitle}
                                                    </h3>
                                                    {statusBadge(row)}
                                                </div>

                                                <div className="mt-1 text-sm font-medium text-[#4F4F4F]">
                                                    {getInfluencerDisplayName(row)}
                                                </div>

                                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#5F5F5F]">
                                                    <span className="inline-flex items-center gap-1">
                                                        {formatMoney(row.amount)}
                                                    </span>

                                                    <span className="inline-flex items-center gap-1">
                                                        <CalendarDays className="h-4 w-4" />
                                                        Created: {formatDate(row.createdAt)}
                                                    </span>
                                                </div>

                                                {row.milestoneDescription ? (
                                                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6A6A6A]">
                                                        {row.milestoneDescription}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">


                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleSeeDeliverable(row)}
                                                    className="h-10 rounded-lg px-4"
                                                >
                                                    <FolderOpen className="mr-2 h-4 w-4" />
                                                    See Deliverable
                                                </Button>

                                                <Button
                                                    type="button"
                                                    onClick={() => handleRelease(row)}
                                                    disabled={
                                                        releasingId === row.milestoneHistoryId ||
                                                        row.released ||
                                                        row.payoutStatus === "initiated" ||
                                                        row.payoutStatus === "paid"
                                                    }
                                                    className="h-10 rounded-lg bg-[#111111] px-4 text-white hover:bg-black disabled:opacity-60"
                                                >
                                                    {releasingId === row.milestoneHistoryId
                                                        ? "Releasing..."
                                                        : row.released || row.payoutStatus !== "pending"
                                                            ? "Released"
                                                            : "Release"}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ViewMilestoneModal
                open={viewOpen}
                onClose={() => {
                    setViewOpen(false);
                    setSelectedMilestone(null);
                }}
                row={selectedMilestone}
            />
        </>
    );
}