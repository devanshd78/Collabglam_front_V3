"use client";

import { CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react";
import React, { useEffect, useMemo, useState } from "react";

import {
    Combobox,
    ComboboxContent,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
} from "@/components/ui/combobox";

import {
    apiGetAllCategories,
    apiListInfluencerTiers,
} from "../../services/brandApi";

type FilterKey =
    | "Influencer Type"
    | "Engagement Rate"
    | "Follower"
    | "Category"
    | "Platform"
    | "Date";

export type FilterState = {
    "Influencer Type": string;
    "Engagement Rate": string;
    Follower: string;
    Category: string[];
    Platform: string[];
    Date: string;
};

const EMPTY_FILTERS: FilterState = {
    "Influencer Type": "",
    "Engagement Rate": "",
    Follower: "",
    Category: [],
    Platform: [],
    Date: "",
};

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "Influencer Type", label: "Influencer Type" },
    { key: "Engagement Rate", label: "Engagement Rate" },
    { key: "Follower", label: "Influencer Tier" },
    { key: "Category", label: "Category" },
    { key: "Platform", label: "Platform" },
    { key: "Date", label: "Date" },
];

const INFLUENCER_TYPE_OPTIONS = [
    "All",
    "Applied",
    "Shortlisted",
    "Invited",
    "Active",
    "Rejected",
    "Completed",
] as const;

const ENGAGEMENT_OPTIONS = [
    "All",
    "0-2%",
    "2-5%",
    "5-8%",
    "8-12%",
    "12%+",
] as const;

const DATE_OPTIONS = ["All", "Today", "Last 7 Days", "Last 30 Days"] as const;

const SORT_OPTIONS = [
    "Priority",
    "Recently added",
    "Highest engagement",
    "Highest follower",
    "Price: Low to High",
    "Price: High to Low",
] as const;

const PLATFORM_OPTIONS = [
    { value: "All", label: "All", icon: undefined },
    {
        value: "Instagram",
        label: "Instagram",
        icon: "/skill-icons_instagram.svg",
    },
    {
        value: "Youtube",
        label: "Youtube",
        icon: "/logos_youtube-icon.svg",
    },
    {
        value: "TikTok",
        label: "TikTok",
        icon: "/ic_baseline-tiktok.svg",
    },
] as const;

type Option = {
    value: string;
    label: string;
};

type Props = {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    sortValue: string;
    setSortValue?: React.Dispatch<React.SetStateAction<string>>;
    hideAdvancedFilters?: boolean;
};

function unwrapArray(res: any) {
    if (Array.isArray(res)) return res;
    return res?.categories ?? res?.data ?? res?.result ?? res?.items ?? [];
}

function normalizeMulti(next: unknown) {
    const arr = Array.isArray(next) ? next.map(String) : [];

    if (arr.includes("All")) {
        return arr.length > 1 ? arr.filter((v) => v !== "All") : ["All"];
    }

    return arr;
}

export default function InfluencerFilter({
    filters,
    setFilters,
    search,
    setSearch,
    sortValue,
    setSortValue,
    hideAdvancedFilters = false,
}: Props) {
    const [categoryOptions, setCategoryOptions] = useState<Option[]>([
        { value: "All", label: "All" },
    ]);

    const [tierOptions, setTierOptions] = useState<Option[]>([
        { value: "All", label: "All" },
    ]);

    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");

    useEffect(() => {
        if (!hideAdvancedFilters) return;

        setFilters(EMPTY_FILTERS);
    }, [hideAdvancedFilters, setFilters]);

    const hasAnyApplied = useMemo(() => {
        const isDefaultString = (v: string) => v === "" || v === "All";
        const isDefaultMulti = (v: string[]) =>
            v.length === 0 || v.includes("All");

        return (
            !isDefaultString(filters["Influencer Type"]) ||
            !isDefaultString(filters["Engagement Rate"]) ||
            !isDefaultString(filters.Follower) ||
            !isDefaultString(filters.Date) ||
            !isDefaultMulti(filters.Category) ||
            !isDefaultMulti(filters.Platform)
        );
    }, [filters]);

    const filteredCategoryOptions = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();

        const optionsWithoutAll = categoryOptions.filter(
            (option) => option.value !== "All"
        );

        if (!q) return optionsWithoutAll;

        return optionsWithoutAll.filter((option) =>
            option.label.toLowerCase().includes(q)
        );
    }, [categoryOptions, categorySearch]);

    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                const catRes = await apiGetAllCategories();
                const catsSource = Array.isArray(catRes)
                    ? catRes
                    : (catRes as any)?.categories ?? [];

                const cats = catsSource
                    .map((category: any) => {
                        const label = String(
                            category?.name ?? category?.categoryName ?? category?.title ?? ""
                        ).trim();

                        if (!label) return null;

                        return {
                            value: String(category?._id ?? category?.id ?? label),
                            label,
                        };
                    })
                    .filter(Boolean) as Option[];

                const tierRes = await apiListInfluencerTiers({});
                const tiers = unwrapArray(tierRes)
                    .map((tier: any) => {
                        const category = String(tier?.category ?? "").trim();
                        const value = String(tier?.value ?? "").trim();
                        const label = category && value ? `${category} • ${value}` : "";

                        if (!label) return null;

                        return {
                            value: String(tier?._id ?? tier?.id ?? label),
                            label,
                        };
                    })
                    .filter(Boolean) as Option[];

                if (!alive) return;

                setCategoryOptions([{ value: "All", label: "All" }, ...cats]);
                setTierOptions([{ value: "All", label: "All" }, ...tiers]);
            } catch {
                // Keep defaults.
            }
        }

        load();

        return () => {
            alive = false;
        };
    }, []);

    const clearAll = () => {
        setFilters(EMPTY_FILTERS);
    };

    const labelTextCls = [
        "text-[var(--Light-Text-Primary,#1A1A1A)]",
        "text-center",
        "font-[var(--Font-Family-Inter,Inter)]",
        "text-[var(--Font-Size-14,0.875rem)]",
        "font-[var(--Font-Weight-regular,400)]",
        "leading-[var(--Line-Height-20,1.25rem)]",
        "tracking-[var(--Letter-Spacing-0,0)]",
    ].join(" ");

    const itemNoTickNeutralSelectedCls = [
        "[&_[data-slot=combobox-item-indicator]]:hidden",
        "data-[highlighted]:bg-[var(--Light-Background-Neutral,#F2F2F2)]",
        "data-[highlighted]:text-[#1A1A1A]",
    ].join(" ");

    const itemSelectedBgUnlessAll = (optValue: string) =>
        optValue === "All"
            ? "data-[selected]:bg-transparent data-[selected]:text-[#1A1A1A]"
            : "data-[selected]:bg-[var(--Light-Background-Neutral,#F2F2F2)] data-[selected]:text-[#1A1A1A]";

    const triggerBgString = (val: string) =>
        val !== "" && val !== "All"
            ? "bg-[var(--Light-Background-Neutral,#F2F2F2)]"
            : "bg-transparent";

    const triggerBgMulti = (arr: string[]) =>
        arr.length > 0 && !arr.includes("All")
            ? "bg-[var(--Light-Background-Neutral,#F2F2F2)]"
            : "bg-transparent";

    const pillTriggerBase = [
        "inline-flex items-center",
        "gap-[0.25rem]",
        "px-2 py-1",
        "rounded-[var(--Border-Radius-S,0.5rem)]",
        "hover:bg-[var(--Light-Background-Neutral,#F2F2F2)]",
        "cursor-pointer",
        "[&_[data-slot=combobox-trigger-icon]]:hidden",
        "text-[var(--Light-Text-Primary,#1A1A1A)]",
        "text-center",
        "font-[var(--Font-Family-Inter,Inter)]",
        "text-[var(--Font-Size-14,0.875rem)]",
        "font-[var(--Font-Weight-Medium,500)]",
        "leading-[var(--Line-Height-20,1.25rem)]",
        "tracking-[var(--Letter-Spacing-0,0)]",
    ];

    const categoryLabelById = useMemo(() => {
        return new Map(categoryOptions.map((option) => [option.value, option.label]));
    }, [categoryOptions]);

    const categoryTriggerText = useMemo(() => {
        const selected = filters.Category;

        if (selected.length === 0) return "";
        if (selected.includes("All")) return "All";

        const labels = selected.map((id) => categoryLabelById.get(id) ?? id);

        if (labels.length === 0) return "";
        if (labels.length === 1) return labels[0];

        return `${labels[0]} +${labels.length - 1}`;
    }, [filters.Category, categoryLabelById]);

    const allCategoryIds = useMemo(() => {
        return categoryOptions
            .filter((option) => option.value !== "All")
            .map((option) => option.value);
    }, [categoryOptions]);

    useEffect(() => {
        if (!filters.Category.includes("All")) return;
        if (allCategoryIds.length === 0) return;

        const current = new Set(filters.Category);
        const missing = allCategoryIds.some((id) => !current.has(id));

        if (!missing) return;

        setFilters((prev) => {
            if (!prev.Category.includes("All")) return prev;

            return {
                ...prev,
                Category: Array.from(new Set(["All", ...allCategoryIds, ...prev.Category])),
            };
        });
    }, [allCategoryIds, filters.Category, setFilters]);

    const keepCategoryOpen = () => {
        setCategoryOpen(true);
        window.setTimeout(() => setCategoryOpen(true), 0);
    };

    const handleCategoryChange = (next: unknown) => {
        const nextArr = Array.isArray(next) ? next.map(String) : [];
        const prevArr = filters.Category;

        const prevHasAll = prevArr.includes("All");
        const nextHasAll = nextArr.includes("All");

        if (nextHasAll && !prevHasAll) {
            setFilters((prev) => ({
                ...prev,
                Category: ["All", ...allCategoryIds],
            }));
            keepCategoryOpen();
            return;
        }

        if (!nextHasAll && prevHasAll) {
            setFilters((prev) => ({
                ...prev,
                Category: [],
            }));
            keepCategoryOpen();
            return;
        }

        const selectedIds = nextArr.filter((value) => value !== "All");

        const isFullySelected =
            allCategoryIds.length > 0 &&
            allCategoryIds.every((id) => selectedIds.includes(id));

        setFilters((prev) => ({
            ...prev,
            Category: isFullySelected ? ["All", ...selectedIds] : selectedIds,
        }));

        keepCategoryOpen();
    };

    const platformIconByValue = useMemo(() => {
        const record: Record<string, string | undefined> = {};

        PLATFORM_OPTIONS.forEach((option) => {
            record[option.value] = option.icon;
        });

        return record;
    }, []);

    const platformCircleCls = [
        "flex",
        "w-[1.75rem]",
        "h-[1.75rem]",
        "p-2",
        "justify-center",
        "items-center",
        "aspect-square",
        "rounded-[2.5rem]",
        "border",
        "border-[var(--Light-Border-Subtle,#E6E6E6)]",
        "bg-[var(--Light-Background-Primary,#FFF)]",
    ].join(" ");

    const platformTriggerNode = useMemo(() => {
        const selected = filters.Platform;

        if (selected.length === 0) return null;
        if (selected.length === 1 && selected[0] === "All") return <span>All</span>;

        const selectedPlatforms = selected.filter((value) => value !== "All");

        if (selectedPlatforms.length === 0) return null;

        const maxIcons = 3;
        const shown = selectedPlatforms.slice(0, maxIcons);
        const extra = selectedPlatforms.length - shown.length;

        return (
            <span className="inline-flex items-center overflow-visible">
                {shown.map((platform, index) => {
                    const icon = platformIconByValue[platform];

                    return (
                        <span
                            key={platform}
                            className={[platformCircleCls, index > 0 ? "-ml-2" : ""].join(
                                " "
                            )}
                            style={{ zIndex: 10 + index }}
                        >
                            {icon ? (
                                <img src={icon} alt="" className="h-4 w-4" />
                            ) : (
                                <span className="text-[0.75rem]">{platform}</span>
                            )}
                        </span>
                    );
                })}

                {extra > 0 ? (
                    <span
                        className={[
                            platformCircleCls,
                            shown.length > 0 ? "-ml-2" : "",
                        ].join(" ")}
                        style={{ zIndex: 10 + shown.length }}
                    >
                        <span className="text-[0.75rem] font-medium">+{extra}</span>
                    </span>
                ) : null}
            </span>
        );
    }, [filters.Platform, platformIconByValue, platformCircleCls]);

    return (
        <section className="mt-[2rem] px-[2rem]">
            <div className="flex items-start justify-between gap-x-[2.5rem] gap-y-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center content-center gap-[0.75rem]">
                    {!hideAdvancedFilters ? (
                        <>
                            {FILTERS.map((filter) => {
                                if (filter.key === "Influencer Type") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                value={filters["Influencer Type"]}
                                                onValueChange={(next) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        "Influencer Type": String(next),
                                                    }))
                                                }
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        triggerBgString(filters["Influencer Type"]),
                                                    ].join(" ")}
                                                >
                                                    {filters["Influencer Type"] ? (
                                                        <span className="max-w-[10rem] truncate">
                                                            {filters["Influencer Type"]}
                                                        </span>
                                                    ) : null}

                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent className="min-w-[14rem]">
                                                    <ComboboxList>
                                                        {INFLUENCER_TYPE_OPTIONS.map((option) => (
                                                            <ComboboxItem
                                                                key={option}
                                                                value={option}
                                                                className={[
                                                                    itemNoTickNeutralSelectedCls,
                                                                    itemSelectedBgUnlessAll(option),
                                                                ].join(" ")}
                                                            >
                                                                {option}
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                if (filter.key === "Engagement Rate") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                value={filters["Engagement Rate"]}
                                                onValueChange={(next) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        "Engagement Rate": String(next),
                                                    }))
                                                }
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        triggerBgString(filters["Engagement Rate"]),
                                                    ].join(" ")}
                                                >
                                                    {filters["Engagement Rate"] ? (
                                                        <span className="max-w-[10rem] truncate">
                                                            {filters["Engagement Rate"]}
                                                        </span>
                                                    ) : null}

                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent className="min-w-[14rem]">
                                                    <ComboboxList>
                                                        {ENGAGEMENT_OPTIONS.map((option) => (
                                                            <ComboboxItem
                                                                key={option}
                                                                value={option}
                                                                className={[
                                                                    itemNoTickNeutralSelectedCls,
                                                                    itemSelectedBgUnlessAll(option),
                                                                ].join(" ")}
                                                            >
                                                                {option}
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                if (filter.key === "Follower") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                value={filters.Follower}
                                                onValueChange={(next) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        Follower: String(next),
                                                    }))
                                                }
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        triggerBgString(filters.Follower),
                                                    ].join(" ")}
                                                >
                                                    {filters.Follower ? (
                                                        <span className="max-w-[10rem] truncate">
                                                            {filters.Follower}
                                                        </span>
                                                    ) : null}

                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent className="min-w-[16rem]">
                                                    <ComboboxList>
                                                        <ComboboxItem
                                                            value="All"
                                                            className={[
                                                                itemNoTickNeutralSelectedCls,
                                                                itemSelectedBgUnlessAll("All"),
                                                            ].join(" ")}
                                                        >
                                                            All
                                                        </ComboboxItem>

                                                        {tierOptions
                                                            .filter((option) => option.value !== "All")
                                                            .map((option) => (
                                                                <ComboboxItem
                                                                    key={option.value}
                                                                    value={option.label}
                                                                    className={[
                                                                        itemNoTickNeutralSelectedCls,
                                                                        itemSelectedBgUnlessAll(option.label),
                                                                    ].join(" ")}
                                                                >
                                                                    {option.label}
                                                                </ComboboxItem>
                                                            ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                if (filter.key === "Category") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                multiple
                                                open={categoryOpen}
                                                onOpenChange={(open) => {
                                                    setCategoryOpen(open);
                                                    if (!open) setCategorySearch("");
                                                }}
                                                value={filters.Category}
                                                onValueChange={handleCategoryChange}
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        triggerBgMulti(filters.Category),
                                                    ].join(" ")}
                                                >
                                                    {categoryTriggerText ? (
                                                        <span className="max-w-[10rem] truncate">
                                                            {categoryTriggerText}
                                                        </span>
                                                    ) : null}

                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent
                                                    className="min-w-[16rem]"
                                                    showSearch
                                                    searchPlaceholder="Search category..."
                                                    searchInputProps={{
                                                        value: categorySearch,
                                                        onChange: (event) =>
                                                            setCategorySearch(
                                                                (event.target as HTMLInputElement).value
                                                            ),
                                                    }}
                                                >
                                                    <ComboboxList>
                                                        <ComboboxItem
                                                            value="All"
                                                            showCheckbox
                                                            className={[
                                                                itemNoTickNeutralSelectedCls,
                                                                itemSelectedBgUnlessAll("All"),
                                                            ].join(" ")}
                                                        >
                                                            All
                                                        </ComboboxItem>

                                                        {filteredCategoryOptions.map((option) => (
                                                            <ComboboxItem
                                                                key={option.value}
                                                                value={option.value}
                                                                showCheckbox
                                                                className={[
                                                                    itemNoTickNeutralSelectedCls,
                                                                    itemSelectedBgUnlessAll(option.value),
                                                                ].join(" ")}
                                                            >
                                                                {option.label}
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                if (filter.key === "Platform") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                multiple
                                                value={filters.Platform}
                                                onValueChange={(next) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        Platform: normalizeMulti(next),
                                                    }))
                                                }
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        "overflow-visible",
                                                        "bg-transparent",
                                                    ].join(" ")}
                                                >
                                                    {platformTriggerNode}
                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent className="min-w-[14rem]">
                                                    <ComboboxList>
                                                        {PLATFORM_OPTIONS.map((option) => (
                                                            <ComboboxItem
                                                                key={option.value}
                                                                value={option.value}
                                                                className={[
                                                                    itemNoTickNeutralSelectedCls,
                                                                    itemSelectedBgUnlessAll(option.value),
                                                                ].join(" ")}
                                                            >
                                                                <span className="inline-flex items-center">
                                                                    {option.icon ? (
                                                                        <img
                                                                            src={option.icon}
                                                                            alt=""
                                                                            style={{
                                                                                width: "1rem",
                                                                                height: "1rem",
                                                                            }}
                                                                        />
                                                                    ) : null}

                                                                    <span className={option.icon ? "ml-[0.5rem]" : ""}>
                                                                        {option.label}
                                                                    </span>
                                                                </span>
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                if (filter.key === "Date") {
                                    return (
                                        <div
                                            key={filter.key}
                                            className={[
                                                "inline-flex max-w-full items-center justify-center gap-[0.25rem] whitespace-nowrap",
                                                labelTextCls,
                                            ].join(" ")}
                                        >
                                            <span>{filter.label}</span>

                                            <Combobox
                                                value={filters.Date}
                                                onValueChange={(next) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        Date: String(next),
                                                    }))
                                                }
                                            >
                                                <ComboboxTrigger
                                                    className={[
                                                        ...pillTriggerBase,
                                                        triggerBgString(filters.Date),
                                                    ].join(" ")}
                                                >
                                                    {filters.Date ? (
                                                        <span className="max-w-[10rem] truncate">
                                                            {filters.Date}
                                                        </span>
                                                    ) : null}

                                                    <CaretDown className="h-3 w-3" weight="bold" />
                                                </ComboboxTrigger>

                                                <ComboboxContent className="min-w-[14rem]">
                                                    <ComboboxList>
                                                        {DATE_OPTIONS.map((option) => (
                                                            <ComboboxItem
                                                                key={option}
                                                                value={option}
                                                                className={[
                                                                    itemNoTickNeutralSelectedCls,
                                                                    itemSelectedBgUnlessAll(option),
                                                                ].join(" ")}
                                                            >
                                                                {option}
                                                            </ComboboxItem>
                                                        ))}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                    );
                                }

                                return null;
                            })}

                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={!hasAnyApplied}
                                className={[
                                    "inline-flex items-center",
                                    "gap-[0.25rem]",
                                    "px-2 py-1",
                                    "rounded-[var(--Border-Radius-S,0.5rem)]",
                                    "bg-transparent",
                                    "hover:bg-[var(--Light-Background-Neutral,#F2F2F2)]",
                                    "whitespace-nowrap",
                                    labelTextCls,
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "cursor-pointer",
                                ].join(" ")}
                            >
                                <span>Clear</span>
                                <X className="h-3 w-3" />
                            </button>
                        </>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-start gap-[0.5rem]">
                    <div
                        className={[
                            "flex h-10 items-center justify-between",
                            "px-2",
                            "rounded-[0.75rem]",
                            "border border-[var(--Light-Border-Subtle,#E6E6E6)]",
                            "bg-white",
                            "w-[18rem] max-w-[40vw]",
                        ].join(" ")}
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <MagnifyingGlass className="h-4 w-4 shrink-0" />

                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search"
                                className={[
                                    "w-full min-w-0 bg-transparent outline-none",
                                    "text-[var(--Light-Border-Selected,#1A1A1A)]",
                                    "text-left",
                                    "font-[var(--Font-Family-Inter,Inter)]",
                                    "text-[var(--Font-Size-14,0.875rem)]",
                                    "font-[var(--Font-Weight-Semi-Bold,600)]",
                                    "leading-[var(--Line-Height-20,1.25rem)]",
                                    "tracking-[var(--Letter-Spacing-0,0)]",
                                    "placeholder:text-[var(--Light-Border-Selected,#1A1A1A)] placeholder:opacity-60",
                                ].join(" ")}
                            />
                        </div>
                    </div>

                    <div
                        className={[
                            "flex h-10 items-center",
                            "px-2",
                            "gap-[0.25rem]",
                            "rounded-[var(--Border-Radius-S,0.5rem)]",
                            "border border-[var(--Light-Border-Subtle,#E6E6E6)]",
                            "bg-white",
                            "w-[10.625rem]",
                        ].join(" ")}
                    >
                        <span className="whitespace-nowrap text-[0.75rem] leading-4 text-[var(--Light-Text-Primary,#1A1A1A)]">
                            Sort :
                        </span>

                        <Combobox
                            value={sortValue}
                            onValueChange={(next) => setSortValue?.(String(next))}
                        >
                            <ComboboxTrigger
                                className={[
                                    "relative group",
                                    "flex min-w-0 flex-1 items-center justify-between",
                                    "bg-transparent",
                                    "cursor-pointer",
                                    "overflow-visible",
                                    "[&_[data-slot=combobox-trigger-icon]]:hidden",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "truncate",
                                        "text-[var(--Light-Text-Primary,#1A1A1A)]",
                                        "text-center",
                                        "font-[var(--Font-Family-Inter,Inter)]",
                                        "text-[0.875rem]",
                                        "font-medium",
                                        "leading-[1.25rem]",
                                    ].join(" ")}
                                    title={sortValue}
                                >
                                    {sortValue}
                                </span>

                                <span
                                    className={[
                                        "pointer-events-none",
                                        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                                        "z-50",
                                        "max-w-[18rem]",
                                        "rounded-md border border-[var(--Light-Border-Subtle,#E6E6E6)]",
                                        "bg-white px-2 py-1",
                                        "text-[0.75rem] leading-4 text-[var(--Light-Text-Primary,#1A1A1A)]",
                                        "shadow-sm",
                                        "whitespace-nowrap",
                                        "truncate",
                                        "opacity-0 translate-y-1",
                                        "transition",
                                        "group-hover:opacity-100 group-hover:translate-y-0",
                                        "group-focus-within:opacity-100 group-focus-within:translate-y-0",
                                    ].join(" ")}
                                    title={sortValue}
                                >
                                    {sortValue}
                                </span>

                                <CaretDown
                                    className="h-3 w-3 shrink-0 ml-[2.5rem]"
                                    weight="bold"
                                />
                            </ComboboxTrigger>

                            <ComboboxContent className="min-w-[16rem]">
                                <ComboboxList>
                                    {SORT_OPTIONS.map((option) => (
                                        <ComboboxItem
                                            key={option}
                                            value={option}
                                            className={[
                                                itemNoTickNeutralSelectedCls,
                                                itemSelectedBgUnlessAll(option),
                                            ].join(" ")}
                                        >
                                            {option}
                                        </ComboboxItem>
                                    ))}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </div>
            </div>
        </section>
    );
}