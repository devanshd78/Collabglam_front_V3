"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass, CaretDown, X } from "@phosphor-icons/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FloatingDateInput } from "@/components/ui/date";
import { apiGetCategories, getApiErrorMessage } from "@/app/brand/services/brandApi";

export type SelectOption = { value: string; label: string };
type ViewMode = "grid" | "list";

type QuickFilter =
  | "recently_edited"
  | "launching_soon"
  | "today"
  | "this_week"
  | "this_month";

export type DateFilterValue = {
  quickFilter: QuickFilter | null;
  allDatesOption: string;
  startDate: string;
  endDate: string;
};

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  quickFilter: null,
  allDatesOption: "all",
  startDate: "",
  endDate: "",
};

type BackendCategoryRow = {
  _id: string;
  name: string;
  subcategories?: Array<{ _id: string; name: string; tags?: any[] }>;
};

export type CampaignFilterProps = {
  campaignType: string;
  setCampaignType: React.Dispatch<React.SetStateAction<string>>;

  creatorStatus: string;
  setCreatorStatus: React.Dispatch<React.SetStateAction<string>>;

  categoryIds: string[];
  setCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;

  dateFilter: DateFilterValue;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilterValue>>;

  aiCreated: boolean;
  setAiCreated: React.Dispatch<React.SetStateAction<boolean>>;

  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;

  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;

  showCreatorStatus?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "recently_edited", label: "Recently Edited" },
  { value: "launching_soon", label: "Launching Soon" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const ALL_DATES_OPTIONS = [
  { value: "all", label: "All" },
  { value: "last_7", label: "Last 7 days" },
  { value: "last_15", label: "Last 15 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "last_90", label: "Last 90 days" },
  { value: "last_month", label: "Last month" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "last_365", label: "Last 365 days" },
];

// ─── Style tokens ─────────────────────────────────────────────────────────────

const labelCls =
  "text-[#1A1A1A] text-[0.875rem] font-medium leading-[1.25rem] whitespace-nowrap";

const triggerBase =
  "inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F2F2F2] cursor-pointer select-none transition-colors [&_[data-slot=combobox-trigger-icon]]:hidden";

const triggerActiveBg = "bg-[#F2F2F2]";

const triggerTextCls =
  "text-[#1A1A1A] text-[0.875rem] font-semibold leading-[1.25rem] whitespace-nowrap";

const dateFieldCls = [
  "flex flex-col items-start",
  "h-[4.125rem] min-h-[4.125rem] max-h-[4.125rem]",
  "w-[15.28rem] flex-[1_0_0]",
  "!border-0 !bg-transparent !shadow-none !p-0 !rounded-none",
  "[&_label]:text-[#969696]",
  "[&_label]:text-[0.875rem] [&_label]:font-normal [&_label]:leading-5",
  "[&_label]:whitespace-nowrap",
  "[&_input]:h-6 [&_input]:w-full",
  "[&_input]:bg-transparent [&_input]:outline-none [&_input]:ring-0",
  "[&_svg]:h-4 [&_svg]:w-4",
].join(" ");

// ─── Date label helpers ───────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYY(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function parseLooseDate(s: string): Date | undefined {
  if (!s) return undefined;
  const cleaned = String(s).trim();
  if (!cleaned) return undefined;

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const out = new Date(y, m - 1, d);
    return isNaN(out.getTime()) ? undefined : out;
  }

  const parts = cleaned.split(/[\/-]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const out = a > 31 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
    return isNaN(out.getTime()) ? undefined : out;
  }

  return undefined;
}

function prettyDateLabel(s: string) {
  const d = parseLooseDate(s);
  return d ? formatDDMMYYYY(d) : s;
}

// ─── Date filter helpers ──────────────────────────────────────────────────────

function getDateFilterLabel(v: DateFilterValue): string {
  if (v.quickFilter) {
    return QUICK_FILTERS.find((q) => q.value === v.quickFilter)?.label ?? "Date";
  }
  if (v.allDatesOption && v.allDatesOption !== "all") {
    return ALL_DATES_OPTIONS.find((o) => o.value === v.allDatesOption)?.label ?? "Date";
  }
  if (v.startDate && v.endDate) {
    return `${prettyDateLabel(v.startDate)} – ${prettyDateLabel(v.endDate)}`;
  }
  if (v.startDate || v.endDate) return prettyDateLabel(v.startDate || v.endDate);
  return "All";
}

function isDateFilterActive(v: DateFilterValue): boolean {
  return (
    v.quickFilter !== null ||
    (v.allDatesOption !== "all" && v.allDatesOption !== "") ||
    !!v.startDate ||
    !!v.endDate
  );
}

// ─── DateFilterPopover ────────────────────────────────────────────────────────

function DateFilterPopover({
  value,
  onApply,
}: {
  value: DateFilterValue;
  onApply: (v: DateFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateFilterValue>(value);
  const allDatesAnchor = useComboboxAnchor();

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value);
    setOpen(next);
  }

  function toggleQuick(qf: QuickFilter) {
    setDraft((d) => ({
      ...d,
      quickFilter: d.quickFilter === qf ? null : qf,
      allDatesOption: "all",
      startDate: "",
      endDate: "",
    }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  function handleCancel() {
    setDraft(value);
    setOpen(false);
  }

  const selectedAllDatesLabel =
    ALL_DATES_OPTIONS.find((o) => o.value === draft.allDatesOption)?.label ?? "All";

  const active = isDateFilterActive(value);
  const label = getDateFilterLabel(value);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Open date filter"
          aria-expanded={open}
          className={[triggerBase, active ? triggerActiveBg : ""].join(" ")}
        >
          <span className={triggerTextCls}>{label}</span>
          <CaretDown
            className={["h-3 w-3 transition-transform", open ? "rotate-180" : ""].join(" ")}
            weight="bold"
            aria-hidden="true"
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className={[
            "z-50 w-[50.375rem] px-[3.5rem] py-[2rem]",
            "flex flex-col justify-center items-end gap-[1.5rem]",
            "rounded-[1rem] bg-white",
            "shadow-[0_24px_40px_-4px_rgba(0,0,0,0.10),0_0_12px_0_rgba(0,0,0,0.08)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
          ].join(" ")}
        >
          <div className="flex w-full items-center justify-between">
            <span className="font-inter text-[1.25rem] font-semibold text-[#1A1A1A] leading-[1.75rem]">
              Select Date
            </span>
            <PopoverPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close date filter"
                className="rounded-md p-1 text-[#999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] transition-colors"
              >
                <X size={20} weight="bold" color="#1A1A1A" />
              </button>
            </PopoverPrimitive.Close>
          </div>

          <div className="flex w-full flex-col gap-y-[1.5rem]">
            <div className="flex flex-wrap gap-x-[0.5rem] gap-y-[0.5rem]">
              {QUICK_FILTERS.map((qf) => {
                const isActive = draft.quickFilter === qf.value;
                return (
                  <button
                    key={qf.value}
                    type="button"
                    onClick={() => toggleQuick(qf.value)}
                    className={[
                      "inline-flex items-center border-[0.0625rem] rounded-[0.75rem] px-[0.5rem] py-[0.3125rem] text-[0.8125rem] font-semibold border transition-colors",
                      isActive
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#969696] border-[#D9D9D9] hover:bg-[#F2F2F2]",
                    ].join(" ")}
                  >
                    {qf.label}
                  </button>
                );
              })}
            </div>

            <div className="flex w-[43.375rem] items-start gap-x-[1rem]">
              <div ref={allDatesAnchor as any} className="shrink-0">
                <Combobox
                  value={draft.allDatesOption}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      allDatesOption: String(v),
                      quickFilter: null,
                      startDate: "",
                      endDate: "",
                    }))
                  }
                >
                  <ComboboxTrigger
                    className={[
                      "flex justify-between items-center border",
                      "h-[4.125rem] w-[10.8125rem]",
                      "px-[1.125rem] py-[1.25rem]",
                      "rounded-[0.75rem] bg-white",
                      "text-[0.8125rem] font-medium text-[#1A1A1A]",
                      "hover:bg-[#F2F2F2] transition-colors whitespace-nowrap",
                      "[&_[data-slot=combobox-trigger-icon]]:hidden",
                    ].join(" ")}
                    icon={<CaretDown size={11} weight="bold" className="text-[#999] shrink-0" />}
                  >
                    <span className="text-base">{selectedAllDatesLabel}</span>
                  </ComboboxTrigger>

                  <ComboboxContent
                    anchor={allDatesAnchor as any}
                    align="start"
                    className="w-[14.125rem] max-h-[27.125rem] py-[0.625rem] px-[0.5rem]"
                  >
                    <ComboboxList>
                      {ALL_DATES_OPTIONS.map((o) => (
                        <ComboboxItem
                          key={o.value}
                          value={o.value}
                          showIndicator={false}
                          className="rounded-lg w-full h-[3.125rem] px-3 py-2 text-[0.8125rem] cursor-pointer"
                        >
                          {o.label}
                        </ComboboxItem>
                      ))}
                      <ComboboxEmpty>No results</ComboboxEmpty>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <FloatingDateInput
                label="Start Date"
                outputFormat="iso"
                weekStartsOn={1}
                placeholderText="dd/mm/yyyy"
                showPlaceholder={true}
                value={draft.startDate}
                onValueChange={(val) =>
                  setDraft((d) => ({
                    ...d,
                    startDate: val,
                    quickFilter: null,
                    allDatesOption: "all",
                    endDate: d.endDate && val && d.endDate < val ? "" : d.endDate,
                  }))
                }
                max={draft.endDate || undefined}
                className={dateFieldCls}
              />

              <FloatingDateInput
                label="End Date"
                outputFormat="iso"
                weekStartsOn={1}
                placeholderText="dd/mm/yyyy"
                showPlaceholder={true}
                value={draft.endDate}
                onValueChange={(val) =>
                  setDraft((d) => ({
                    ...d,
                    endDate: val,
                    quickFilter: null,
                    allDatesOption: "all",
                  }))
                }
                min={draft.startDate || undefined}
                className={dateFieldCls}
              />
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-[0.75rem]">
            <button
              type="button"
              onClick={handleCancel}
              className="h-[3rem] w-[8.75rem] cursor-pointer rounded-[0.5rem] px-4 text-[0.875rem] font-medium text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-[3rem] w-[8.75rem] cursor-pointer rounded-[0.5rem] bg-[#1A1A1A] px-5 text-[0.875rem] font-semibold text-white hover:bg-[#333] transition-colors"
            >
              Apply
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ─── SingleSelectCombobox ─────────────────────────────────────────────────────

function SingleSelectCombobox({
  label,
  ariaLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value]
  );
  const isActive = value !== "" && value !== "all";
  const anchor = useComboboxAnchor();

  return (
    <div className="inline-flex items-center gap-2">
      <span className={labelCls}>{label}</span>
      <div ref={anchor as any} className="inline-flex">
        <Combobox value={value} onValueChange={(v) => onChange(String(v))}>
          <ComboboxTrigger
            aria-label={ariaLabel}
            className={[triggerBase, isActive ? triggerActiveBg : ""].join(" ")}
            icon={<CaretDown className="h-3 w-3" weight="bold" aria-hidden="true" />}
          >
            {value !== "" && <span className={triggerTextCls}>{selectedLabel}</span>}
          </ComboboxTrigger>

          <ComboboxContent anchor={anchor as any} className="min-w-[14rem]">
            <ComboboxList>
              {options.map((o) => (
                <ComboboxItem key={o.value} value={o.value}>
                  {o.label}
                </ComboboxItem>
              ))}
              <ComboboxEmpty>No results</ComboboxEmpty>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  );
}

// ─── CategoryMultiCombobox ────────────────────────────────────────────────────

function CategoryMultiCombobox({
  label,
  ariaLabel,
  values,
  onChange,
  options,
  loading,
}: {
  label: string;
  ariaLabel: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: SelectOption[];
  loading: boolean;
}) {
  const MAX = 5;
  const [query, setQuery] = useState("");

  const normalizedValues = useMemo(
    () => Array.from(new Set(values.map((v) => String(v).trim()))).filter(Boolean),
    [values]
  );

  const labelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(String(o.value), String(o.label));
    return m;
  }, [options]);

  const summary = useMemo(() => {
    if (!normalizedValues.length) return "All";
    const first = labelMap.get(normalizedValues[0]) ?? normalizedValues[0];
    return normalizedValues.length === 1 ? first : `${first} +${normalizedValues.length - 1}`;
  }, [normalizedValues, labelMap]);

  const anchor = useComboboxAnchor();
  const limitReached = normalizedValues.length >= MAX;

  const safeOptions = useMemo<SelectOption[]>(
    () =>
      loading
        ? [{ value: "__loading__", label: "Loading..." }]
        : (options ?? []).filter((o) => String(o.value).trim() !== ""),
    [options, loading]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = safeOptions.filter((o) => o.value !== "__loading__");
    return q ? base.filter((o) => String(o.label).toLowerCase().includes(q)) : base;
  }, [safeOptions, query]);

  const comboboxValue = normalizedValues.length === 0 ? ["__all__"] : normalizedValues;
  const showNoCategories = !loading && filteredOptions.length === 0;

  return (
    <div className="inline-flex items-center gap-2">
      <span className={labelCls}>{label}</span>
      <div ref={anchor as any} className="inline-flex">
        <Combobox
          multiple
          value={comboboxValue}
          onValueChange={(next) => {
            const raw = (next as string[]).map((v) => String(v).trim());

            if (raw.includes("__all__")) {
              if (raw.length === 1) {
                onChange([]);
                return;
              }

              onChange(
                Array.from(new Set(raw.filter((v) => v !== "__all__")))
                  .filter((v) => v && v !== "__loading__")
                  .slice(0, MAX)
              );
              return;
            }

            onChange(
              Array.from(new Set(raw))
                .filter((v) => v && v !== "__loading__")
                .slice(0, MAX)
            );
          }}
        >
          <ComboboxTrigger
            aria-label={ariaLabel}
            className={[triggerBase, normalizedValues.length > 0 ? triggerActiveBg : ""].join(" ")}
            icon={<CaretDown className="h-3 w-3" weight="bold" aria-hidden="true" />}
          >
            <span className={triggerTextCls}>{summary}</span>
          </ComboboxTrigger>

          <ComboboxContent
            anchor={anchor as any}
            className="min-w-[16rem]"
            showSearch
            searchPlaceholder="Search category..."
            searchInputProps={{
              value: query,
              onChange: (e: any) => setQuery((e.target as HTMLInputElement).value),
              disabled: loading,
            }}
          >
            {limitReached && (
              <div className="-mt-2 w-full px-2">
                <p className="text-[0.75rem] text-red-600">Max {MAX} categories can be selected.</p>
              </div>
            )}

            <ComboboxList>
              <ComboboxItem value="__all__" showCheckbox>
                All
              </ComboboxItem>

              {loading ? (
                <ComboboxItem value="__loading__" disabled>
                  Loading...
                </ComboboxItem>
              ) : showNoCategories ? (
                <ComboboxItem value="__empty__" disabled>
                  No categories found
                </ComboboxItem>
              ) : (
                filteredOptions.map((o) => {
                  const v = String(o.value).trim();
                  return (
                    <ComboboxItem
                      key={v}
                      value={v}
                      disabled={!normalizedValues.includes(v) && limitReached}
                      showCheckbox
                    >
                      {o.label}
                    </ComboboxItem>
                  );
                })
              )}

              {!loading && <ComboboxEmpty>No results</ComboboxEmpty>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  );
}

// ─── CampaignFilter ───────────────────────────────────────────────────────────

export default function CampaignFilter({
  campaignType,
  setCampaignType,
  creatorStatus,
  setCreatorStatus,
  categoryIds,
  setCategoryIds,
  dateFilter,
  setDateFilter,
  aiCreated,
  setAiCreated,
  searchInput,
  setSearchInput,
  viewMode,
  setViewMode,
  showCreatorStatus = true,
}: CampaignFilterProps) {
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        setCatLoading(true);

        const rows = await apiGetCategories();

        if (!isMounted) return;

        const mapped: SelectOption[] = (Array.isArray(rows) ? rows : [])
          .filter((item: BackendCategoryRow) => item?._id && item?.name)
          .map((item: BackendCategoryRow) => ({
            value: String(item._id),
            label: String(item.name),
          }));

        setCategoryOptions(mapped);
      } catch (error) {
        console.error("Failed to fetch categories:", getApiErrorMessage(error));
        if (isMounted) setCategoryOptions([]);
      } finally {
        if (isMounted) setCatLoading(false);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      campaignType !== "all" ||
      (showCreatorStatus && creatorStatus !== "all") ||
      categoryIds.length > 0 ||
      isDateFilterActive(dateFilter) ||
      aiCreated ||
      searchInput.trim() !== ""
    );
  }, [campaignType, creatorStatus, showCreatorStatus, categoryIds, dateFilter, aiCreated, searchInput]);

  function handleClearFilters() {
    setCampaignType("all");
    setCreatorStatus("all");
    setCategoryIds([]);
    setDateFilter(DEFAULT_DATE_FILTER);
    setAiCreated(false);
    setSearchInput("");
  }

  return (
    <div className="mt-8 flex w-full flex-wrap items-start justify-between gap-x-10 gap-y-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3">
        {showCreatorStatus ? (
          <SingleSelectCombobox
            label="Creator Status"
            ariaLabel="Creator Status"
            value={creatorStatus}
            onChange={setCreatorStatus}
            options={[
              { value: "all", label: "All" },
              { value: "applied", label: "Applied" },
              { value: "approved", label: "Approved" },
            ]}
          />
        ) : null}

        <CategoryMultiCombobox
          label="Category"
          ariaLabel="Category"
          values={categoryIds}
          onChange={(ids) => setCategoryIds(Array.from(new Set(ids)).slice(0, 5))}
          options={categoryOptions}
          loading={catLoading}
        />

        <div className="inline-flex items-center gap-2">
          <span className={labelCls}>Date</span>
          <DateFilterPopover value={dateFilter} onApply={(v) => setDateFilter(v)} />
        </div>

        <div className="inline-flex items-center gap-2 whitespace-nowrap">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={aiCreated}
              onChange={(e) => setAiCreated(e.target.checked)}
            />
            <div className="h-6 w-10 rounded-full bg-gray-200 peer-checked:bg-black after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
          </label>
          <span className={labelCls}>AI Created</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.875rem] font-medium text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
          >
            <X size={14} weight="bold" />
            Clear
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-9 w-[14.3125rem] max-w-[40vw] items-center gap-2 rounded-lg border border-[#E6E6E6] bg-white px-3">
          <MagnifyingGlass size={18} aria-hidden="true" className="shrink-0 text-[#666]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[0.875rem] font-semibold outline-none ring-0 placeholder:text-[#999]"
          />
        </div>

        <div
          className="flex h-9 items-center gap-1 rounded-[0.25rem] bg-[#F2F2F2] p-0.5"
          role="group"
          aria-label="Layout"
        >
          <button
            type="button"
            className={[
              "h-8 w-8 rounded grid place-items-center transition-colors",
              viewMode === "list" ? "bg-white" : "bg-transparent",
            ].join(" ")}
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <span className="flex w-7 flex-col justify-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full border border-[#1A1A1A]" />
                  <span className="h-px flex-1 bg-[#1A1A1A]" />
                </span>
              ))}
            </span>
          </button>

          <button
            type="button"
            className={[
              "h-8 w-8 rounded-[0.25rem] grid place-items-center transition-colors",
              viewMode === "grid" ? "bg-white" : "bg-transparent",
            ].join(" ")}
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <span className="grid grid-cols-2 grid-rows-2 gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-sm border border-[#1A1A1A]" />
              ))}
            </span>
          </button>


        </div>
      </div>
    </div>
  );
}