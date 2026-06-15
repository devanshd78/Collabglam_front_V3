"use client";

import React, { useCallback, useMemo } from "react";

/* ============================================================================
   ✅ Types
============================================================================ */
export type View = "loading" | "intro" | "manual" | "ai";
export type Option = { label: string; value: string };

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export const SEARCHABLE_UI = { searchable: true, searchPlaceholder: "Search..." } as any;

export function makeSearchProps(search: string, setSearch: (v: string) => void) {
  return {
    searchable: true,
    searchPlaceholder: "Search...",
    searchValue: search,
    search,
    onSearchChange: setSearch,
    onSearchValueChange: setSearch,
    onSearchInputChange: setSearch,
    onSearch: setSearch,
    clientFilter: false,
  } as any;
}

// ✅ Memoized wrapper to avoid creating a brand-new props object every render
export function useSearchProps(search: string, setSearch: (v: string) => void) {
  const onChange = useCallback((v: string) => setSearch(v), [setSearch]);
  return useMemo(() => makeSearchProps(search, onChange), [search, onChange]);
}

/* ============================================================================
   ✅ Constants
============================================================================ */
export const SEEN_KEY = "cg.brand.createCampaign.introSeen.v1";

export const LAYOUT = {
  manualFormMaxWidth: 760,
  manualPreviewWidth: 520,
  aiMaxWidth: 720,
};

export const CAMPAIGN_TYPES: Option[] = [
  { label: "Paid", value: "Paid" },
  { label: "Gifting", value: "Gifting" },
  { label: "Affiliate", value: "Affiliate" },
  { label: "Ambassador", value: "Ambassador" },
  { label: "Event", value: "Event" },
  { label: "UGC Only", value: "UGC Only" },
  { label: "Sponsored", value: "Sponsored" },
  { label: "Paid + Bonus", value: "Paid + Bonus" },
];

/* ============================================================================
   ✅ File rules
============================================================================ */
export const MAX_FILE_MB = 5;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export function validateFiles(files: File[], label = "File") {
  const errors: string[] = [];
  for (const f of files ?? []) {
    if (f.size > MAX_FILE_BYTES) errors.push(`${label} “${f.name}” exceeds ${MAX_FILE_MB}MB`);
  }
  return errors;
}

/* ============================================================================
   ✅ Dates + IDs + misc helpers
============================================================================ */
export function getLocalCampaignTimezone() {
  if (typeof window === "undefined") return "UTC";

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function toCampaignDateTimeInput(
  dateValue?: string,
  type: "start" | "end" = "start"
) {
  const date = safeDateInput(dateValue);
  if (!date) return "";

  if (type === "end") {
    return `${date}T23:59`;
  }

  const today = safeDateInput(new Date().toISOString());

  if (date === today) {
    const step = 15 * 60 * 1000;
    const buffer = 5 * 60 * 1000;
    const rounded = new Date(Math.ceil((Date.now() + buffer) / step) * step);

    const hh = String(rounded.getHours()).padStart(2, "0");
    const mm = String(rounded.getMinutes()).padStart(2, "0");

    return `${date}T${hh}:${mm}`;
  }

  return `${date}T09:00`;
}

export function isValidDateRange(start?: string, end?: string) {
  if (!start || !end) return true;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return true;
  return s <= e;
}

export function getBrandId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("brandId") || "";
}

export function safeDateInput(v?: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function pickCampaignId(doc: any): string {
  return (
    String(
      doc?._id ??
        doc?.id ??
        doc?.campaignId ??
        doc?.campaign?._id ??
        doc?.data?._id ??
        doc?.savedDraft?._id ??
        doc?.savedDraft?.id ??
        doc?.draft?._id ??
        ""
    ).trim() || ""
  );
}

export function isObjectId(v: string) {
  return /^[a-f\d]{24}$/i.test(String(v || "").trim());
}

export function splitCountrySelection(values: string[]) {
  const ids: string[] = [];
  const codes: string[] = [];
  for (const v of values ?? []) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    if (isObjectId(s)) ids.push(s);
    else codes.push(s.toUpperCase());
  }
  return { ids, codes };
}

export function idOf(v: any) {
  if (!v) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  const id = v?._id ?? v?.id ?? v?.value;
  return id === undefined || id === null ? "" : String(id).trim();
}

export function idsOf(arr: any) {
  return (Array.isArray(arr) ? arr : []).map(idOf).filter(Boolean);
}

export function countryKey(c: any) {
  return idOf(c) || String(c?.countryCode ?? "").trim();
}

export function uniqByValue(opts: Option[]) {
  const seen = new Set<string>();
  return (opts ?? []).filter((o) => {
    const v = String(o?.value ?? "").trim();
    if (!v) return false;
    if (seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}

export function mergeOptions(base: Option[], extra: Option[]) {
  return uniqByValue([...(extra ?? []), ...(base ?? [])]);
}

/** PATCH-like payload cleanup */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/* ============================================================================
   ✅ Files -> Data URLs (only on publish/schedule)
============================================================================ */
export async function fileToDataUrl(file: File) {
  return await new Promise<{ name: string; type: string; size: number; dataUrl: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result ?? ""),
      });
    reader.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files: File[]) {
  const out: any[] = [];
  for (const f of files ?? []) out.push(await fileToDataUrl(f));
  return out;
}

/* ============================================================================
   ✅ Tier formatting helpers
============================================================================ */
export function prettyTierValue(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/K/g, "k")
    .replace(/M/g, "m");
}

/* ============================================================================
   ✅ Schedule helpers
============================================================================ */
export function getDefaultScheduleTime() {
  const step = 15 * 60 * 1000;
  const now = Date.now();
  const rounded = new Date(Math.ceil(now / step) * step);
  const hh = String(rounded.getHours()).padStart(2, "0");
  const mm = String(rounded.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
