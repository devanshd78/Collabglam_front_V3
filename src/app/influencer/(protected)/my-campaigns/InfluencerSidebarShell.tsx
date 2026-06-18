"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";
import { useSidebarOffset } from "../../sidebarContext";

type InfluencerSidebarShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  previewUrl?: string;
  previewBlob?: Blob | null;
  sidebarOffset?: number;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  pdfOnly?: boolean;
};

const PDF_MIN_ZOOM = 45;
const PDF_MAX_ZOOM = 160;
const PDF_ZOOM_STEP = 10;
const PDF_DEFAULT_ZOOM = 85;

function safeOffset(value: number | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return 0;

  return Math.max(0, Math.round(numberValue));
}

function getSidebarElement() {
  if (typeof document === "undefined") return null;

  return (
    document.querySelector<HTMLElement>("#cg-sidebar") ||
    document.querySelector<HTMLElement>("[data-cg-sidebar]")
  );
}

function getMeasuredSidebarOffset() {
  if (typeof window === "undefined") return 0;

  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (!isDesktop) return 0;

  const sidebar = getSidebarElement();
  if (!sidebar) return 0;

  const rect = sidebar.getBoundingClientRect();

  if (!Number.isFinite(rect.right) || rect.right <= 0) return 0;

  return safeOffset(rect.right);
}

function buildPdfSrc(src: string, zoom: number, fitWidth: boolean) {
  if (!src) return "";

  const cleanSrc = src.split("#")[0];

  const pdfOptions = new URLSearchParams({
    toolbar: "0",
    navpanes: "0",
    scrollbar: "1",
    view: fitWidth ? "FitH" : "Fit",
    zoom: String(zoom),
  });

  return `${cleanSrc}#${pdfOptions.toString()}`;
}

function PdfOnlyToolbar({
  zoom,
  fitWidth,
  onZoomOut,
  onZoomIn,
  onReset,
  onFitToggle,
}: {
  zoom: number;
  fitWidth: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFitToggle: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#FAFAFA] px-4 py-2 sm:px-6">
      <div className="text-xs font-medium text-gray-500">
        PDF Size: <span className="text-gray-900">{zoom}%</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= PDF_MIN_ZOOM}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Reduce PDF size"
        >
          −
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoom >= PDF_MAX_ZOOM}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Increase PDF size"
        >
          +
        </button>

        <button
          type="button"
          onClick={onFitToggle}
          className="flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-100"
        >
          {fitWidth ? "Fit Page" : "Fit Width"}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-100"
        >
          100%
        </button>
      </div>
    </div>
  );
}

export default function InfluencerSidebarShell({
  isOpen,
  onClose,
  title,
  subtitle,
  previewUrl,
  previewBlob,
  sidebarOffset = 0,
  footer,
  children,
  pdfOnly = false,
}: InfluencerSidebarShellProps) {
  const contextSidebarOffset = useSidebarOffset();

  const [mounted, setMounted] = useState(false);
  const [measuredSidebarOffset, setMeasuredSidebarOffset] = useState(0);
  const [internalPreviewUrl, setInternalPreviewUrl] = useState("");
  const [pdfZoom, setPdfZoom] = useState(PDF_DEFAULT_ZOOM);
  const [fitWidth, setFitWidth] = useState(false);

  const updateMeasuredOffset = useCallback(() => {
    setMeasuredSidebarOffset(getMeasuredSidebarOffset());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMeasuredOffset();

    const firstFrame = window.requestAnimationFrame(updateMeasuredOffset);
    const lateMeasure = window.setTimeout(updateMeasuredOffset, 350);

    window.addEventListener("resize", updateMeasuredOffset);

    const sidebar = getSidebarElement();
    const resizeObserver =
      sidebar && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateMeasuredOffset)
        : null;

    if (sidebar && resizeObserver) {
      resizeObserver.observe(sidebar);
    }

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(lateMeasure);
      window.removeEventListener("resize", updateMeasuredOffset);
      resizeObserver?.disconnect();
    };
  }, [isOpen, updateMeasuredOffset]);

  useEffect(() => {
    if (!isOpen) return;

    setPdfZoom(pdfOnly ? PDF_DEFAULT_ZOOM : 100);
    setFitWidth(false);
  }, [isOpen, pdfOnly]);

  useEffect(() => {
    if (previewUrl || !previewBlob) {
      setInternalPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(previewBlob);
    setInternalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewUrl, previewBlob]);

  const rawPdfSrc = previewUrl || internalPreviewUrl;

  const pdfSrc = useMemo(
    () => buildPdfSrc(rawPdfSrc, pdfZoom, fitWidth),
    [rawPdfSrc, pdfZoom, fitWidth]
  );

  const zoomOut = useCallback(() => {
    setFitWidth(false);
    setPdfZoom((prev) => Math.max(PDF_MIN_ZOOM, prev - PDF_ZOOM_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setFitWidth(false);
    setPdfZoom((prev) => Math.min(PDF_MAX_ZOOM, prev + PDF_ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setFitWidth(false);
    setPdfZoom(100);
  }, []);

  const toggleFitWidth = useCallback(() => {
    setFitWidth((prev) => !prev);
    setPdfZoom(PDF_DEFAULT_ZOOM);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (pdfOnly && (e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }

      if (
        pdfOnly &&
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "=")
      ) {
        e.preventDefault();
        zoomIn();
      }

      if (pdfOnly && (e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, pdfOnly, resetZoom, zoomIn, zoomOut]);

  const resolvedOffset = useMemo(() => {
    const propOffset = safeOffset(sidebarOffset);
    const ctxOffset = safeOffset(contextSidebarOffset);
    const measuredOffset = safeOffset(measuredSidebarOffset);

    return propOffset || ctxOffset || measuredOffset;
  }, [sidebarOffset, contextSidebarOffset, measuredSidebarOffset]);

  if (!isOpen || !mounted) return null;

  const shell = (
    <div
      className="fixed bottom-0 right-0 top-0 z-[70] flex overflow-hidden bg-white"
      style={{
        left: resolvedOffset,
        width: `calc(100vw - ${resolvedOffset}px)`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Contract"}
    >
      <div className="relative flex h-full w-full flex-col bg-white shadow-2xl">
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col">
            {title ? (
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {title}
              </span>
            ) : null}

            {subtitle ? (
              <span className="truncate text-base font-semibold text-gray-900">
                {subtitle}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <HiX size={20} />
          </button>
        </div>

        {pdfOnly ? (
          <>
            <PdfOnlyToolbar
              zoom={pdfZoom}
              fitWidth={fitWidth}
              onZoomOut={zoomOut}
              onZoomIn={zoomIn}
              onReset={resetZoom}
              onFitToggle={toggleFitWidth}
            />

            <div className="min-h-0 flex-1 overflow-hidden bg-[#F3F4F6]">
              {pdfSrc ? (
                <iframe
                  key={pdfSrc}
                  src={pdfSrc}
                  title="Contract PDF preview"
                  className="h-full w-full border-0 bg-[#F3F4F6]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white text-sm text-gray-400">
                  Loading contract preview…
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-h-0 w-full overflow-y-auto border-b border-[#E6E6E6] bg-white lg:border-b-0 lg:border-r">
              <div className="w-full p-4 sm:p-5">{children}</div>
            </div>

            <div className="min-h-0 w-full overflow-hidden bg-[#252525]">
              {pdfSrc ? (
                <iframe
                  key={pdfSrc}
                  src={pdfSrc}
                  title="Contract PDF preview"
                  className="h-full w-full border-0 bg-[#252525]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#252525] text-sm text-white/70">
                  Loading contract preview…
                </div>
              )}
            </div>
          </div>
        )}

        {footer ? (
          <div className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}