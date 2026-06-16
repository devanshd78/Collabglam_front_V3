"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const BRAND_WELCOME_SEEN_PREFIX = "cg_brand_welcome_seen:";

export type BrandWelcomeEligibility = {
    brandId?: string;
    isNewBrand?: boolean;
    isFirstLogin?: boolean;
};

export function shouldShowBrandWelcomeModal(brand?: BrandWelcomeEligibility) {
    if (typeof window === "undefined") return false;

    const brandId = brand?.brandId;
    if (!brandId) return false;

    const isFirstTime =
        brand?.isNewBrand === true || brand?.isFirstLogin === true;

    if (!isFirstTime) return false;

    return localStorage.getItem(`${BRAND_WELCOME_SEEN_PREFIX}${brandId}`) !== "1";
}

export function markBrandWelcomeSeen(brandId?: string) {
    if (typeof window === "undefined" || !brandId) return;
    localStorage.setItem(`${BRAND_WELCOME_SEEN_PREFIX}${brandId}`, "1");
}

type BrandWelcomeModalProps = {
    open: boolean;
    brandId?: string;
    fallbackHref?: string;
    brandName?: string;
    className?: string;
    onClose?: () => void;
};

export function BrandWelcomeModal({
    open,
    brandId,
    fallbackHref = "/brand/create-campaign?byAi=1",
    brandName = "CollabGlam",
    className,
    onClose,
}: BrandWelcomeModalProps) {
    const router = useRouter();

    const finish = React.useCallback(
        (href?: string) => {
            markBrandWelcomeSeen(brandId);
            onClose?.();

            if (!href || typeof window === "undefined") return;

            const currentHref = `${window.location.pathname}${window.location.search}`;

            if (href !== currentHref) {
                router.replace(href);
            }
        },
        [brandId, onClose, router],
    );

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                finish();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [fallbackHref, finish, open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-welcome-title"
        >
            <div
                className={cn(
                    "relative flex h-[509px] w-[422px] max-w-[calc(100vw-32px)] flex-shrink-0 flex-col overflow-hidden rounded-[24px] bg-[#FFF] px-[24px] pb-[24px] pt-[22px]",
                    "shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]",
                    className,
                )}
            >
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[190px]"
                    style={{
                        background:
                            "linear-gradient(180deg, var(--BrandPrimary-100, #FFEBB0) 0%, rgba(255, 255, 255, 0.00) 86.54%)",
                    }}
                />

                <div
                    className="pointer-events-none absolute -right-[72px] -top-[70px] h-[190px] w-[250px] rounded-full opacity-80 blur-[2px]"
                    style={{
                        background:
                            "linear-gradient(109deg, var(--Neutrals-0, #FFF) 28.8%, #FAFAFA 36.05%, rgba(255, 191, 0, 0.83) 50%, #F6BB2A 57.65%, #F3584E 74.04%, #E078D1 84.62%), var(--Light-Background-Subtle, #F9F9F9)",
                    }}
                />

                <button
                    type="button"
                    onClick={() => finish()}
                    className="absolute right-[18px] top-[18px] z-20 inline-flex size-[32px] items-center justify-center rounded-full text-[#1A1A1A] transition hover:bg-black/5"
                    aria-label="Close welcome modal"
                >
                    <X size={18} weight="bold" />
                </button>

                <div className="relative z-10 flex flex-1 flex-col items-center text-center">
                    <div
                        className="mt-[10px] flex size-[58px] items-center justify-center rounded-[18px] text-[34px]"
                        style={{
                            background:
                                "linear-gradient(109deg, var(--Neutrals-0, #FFF) 28.8%, #FAFAFA 36.05%, rgba(255, 191, 0, 0.83) 50%, #F6BB2A 57.65%, #F3584E 74.04%, #E078D1 84.62%), var(--Light-Background-Subtle, #F9F9F9)",
                        }}
                    >
                        🎉
                    </div>

                    <h2
                        id="brand-welcome-title"
                        className="mt-[14px] text-[24px] font-bold leading-[30px] text-[#1A1A1A]"
                    >
                        Welcome to{" "}
                        <span className="bg-gradient-to-r from-[#F6BB2A] via-[#F3584E] to-[#E078D1] bg-clip-text text-transparent">
                            {brandName}
                        </span>
                        !
                    </h2>

                    <p className="mt-[8px] max-w-[310px] text-[13px] leading-[20px] text-[#646464]">
                        You&apos;re in the right place to build iconic campaigns and find
                        your perfect creator match.
                    </p>

                    <div className="mt-[20px] w-full space-y-[10px] text-left">
                        {[
                            ["✨", "Create AI-powered campaigns in seconds", "SO EASY"],
                            ["👥", "Find the best-fit creators for your brand", "NO CAP"],
                            ["💗", "Real collabs. Real results. Zero fluff.", "PERIODT"],
                        ].map(([icon, text, badge]) => (
                            <div key={text} className="flex items-center gap-[10px]">
                                <span className="flex size-[32px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F2FF] text-[16px]">
                                    {icon}
                                </span>

                                <p className="min-w-0 flex-1 text-[12px] font-semibold leading-[16px] text-[#1A1A1A]">
                                    {text}
                                </p>

                                <span className="rounded-full bg-[#F1E7FF] px-[8px] py-[3px] text-[10px] font-bold leading-[12px] text-[#6B35E8]">
                                    {badge}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto w-full space-y-[10px]">
                        <button
                            type="button"
                            onClick={() => finish("/brand/create-campaign?byAi=1")}
                            className="flex h-[45px] w-full items-center justify-center gap-0 rounded-[12px] bg-[#1A1A1A] text-[13px] font-bold text-white transition hover:opacity-90 active:opacity-80"
                        >
                            Create Campaign by AI ✨
                        </button>

                        <button
                            type="button"
                            onClick={() => finish("/brand/browse-influencer")}
                            className="flex h-[45px] w-full items-center justify-center rounded-[12px] border border-[#E6E6E6] bg-white text-[13px] font-semibold text-[#1A1A1A] transition hover:bg-[#FAFAFA] active:bg-[#F5F5F5]"
                        >
                            Browse Creators
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}