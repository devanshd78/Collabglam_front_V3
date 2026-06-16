"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Signature, UploadSimple } from "@phosphor-icons/react";
import { apipostSignatureUpload } from "../../services/brandApi";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type SignatureModalProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
    signerName?: string;
    brandId: string;
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function buildCursivePath(name: string): string {
    return name?.trim() || "Signature";
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildDefaultSignatureSvg(name?: string) {
    const safeName = escapeXml(buildCursivePath(name || "Signature"));

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160">
      <rect width="100%" height="100%" fill="transparent" />
      <text
        x="50%"
        y="52%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Brush Script MT, Segoe Script, Snell Roundhand, cursive"
        font-size="48"
        fill="#1a1a1a"
      >
        ${safeName}
      </text>
    </svg>
  `;
}

function dataUrlToFile(dataUrl: string, filename: string) {
    const [meta, content] = dataUrl.split(",");
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || "image/png";

    const byteString = atob(content);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    return new File([uint8Array], filename, { type: mime });
}

async function svgToPngFile(svgString: string, filename: string): Promise<File> {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load SVG"));
            img.src = svgUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 160;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
        );

        if (!blob) throw new Error("Failed to convert SVG to PNG");

        return new File([blob], filename, { type: "image/png" });
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

/* ─────────────────────────────────────────────
   SignatureCanvas – draw-your-own pad
───────────────────────────────────────────── */
function SignatureCanvas({
    onSave,
}: {
    onSave: (dataUrl: string) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();

        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        drawing.current = true;
        lastPos.current = getPos(e);
    };

    const move = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing.current || !lastPos.current) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const pos = getPos(e);

        ctx.beginPath();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        lastPos.current = pos;
    };

    const end = () => {
        drawing.current = false;
        lastPos.current = null;
        onSave(canvasRef.current!.toDataURL("image/png"));
    };

    const clear = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onSave("");
    };

    return (
        <div className="relative w-full">
            <canvas
                ref={canvasRef}
                width={480}
                height={160}
                className="w-full rounded-xl border border-dashed border-gray-300 bg-[#fafafa] cursor-crosshair touch-none"
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
            />
            <button
                type="button"
                onClick={clear}
                className="absolute top-2 right-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
                Clear
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Default stylised SVG signature
───────────────────────────────────────────── */
function DefaultSignature({ name }: { name?: string }) {
    const displayName = buildCursivePath(name || "Signature");

    return (
        <svg viewBox="0 0 480 160" className="h-28 w-full">
            <text
                x="50%"
                y="52%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="Brush Script MT, Segoe Script, Snell Roundhand, cursive"
                fontSize="48"
                fill="#1a1a1a"
            >
                {displayName}
            </text>
        </svg>
    );
}

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${checked ? "bg-black" : "bg-gray-200"
                }`}
        >
            <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"
                    }`}
            />
        </button>
    );
}

export default function SignatureModal({
    open,
    onClose,
    onConfirm,
    isLoading = false,
    signerName,
    brandId,
}: SignatureModalProps) {
    const [tab, setTab] = useState<"default" | "draw" | "upload">("default");
    const [drawnSig, setDrawnSig] = useState("");
    const [uploadedSigFile, setUploadedSigFile] = useState<File | null>(null);
    const [uploadedSigPreview, setUploadedSigPreview] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [showError, setShowError] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [confirming, setConfirming] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setAgreed(false);
            setShowError(false);
            setTab("default");
            setDrawnSig("");
            setUploadedSigFile(null);
            setUploadedSigPreview("");
            setUploadError("");
            setConfirming(false);
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (uploadedSigPreview.startsWith("blob:")) {
                URL.revokeObjectURL(uploadedSigPreview);
            }
        };
    }, [uploadedSigPreview]);

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleUploadedSignature = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setUploadError("Please upload a valid image file.");
            return;
        }

        if (uploadedSigPreview.startsWith("blob:")) {
            URL.revokeObjectURL(uploadedSigPreview);
        }

        const previewUrl = URL.createObjectURL(file);
        setUploadedSigFile(file);
        setUploadedSigPreview(previewUrl);
        setTab("upload");
        setUploadError("");
    };

    const handleConfirm = useCallback(async () => {
        if (!agreed) {
            setShowError(true);
            return;
        }

        setShowError(false);
        setUploadError("");
        setConfirming(true);

        try {
            let signatureFile: File;

            if (tab === "upload") {
                if (!uploadedSigFile) {
                    setUploadError("Please upload a signature first.");
                    return;
                }
                signatureFile = uploadedSigFile;
            } else if (tab === "draw") {
                if (!drawnSig) {
                    setUploadError("Please draw your signature first.");
                    return;
                }
                signatureFile = dataUrlToFile(
                    drawnSig,
                    `signature-${brandId}-${Date.now()}.png`
                );
            } else {
                const svg = buildDefaultSignatureSvg(signerName);
                signatureFile = await svgToPngFile(
                    svg,
                    `signature-${brandId}-${Date.now()}.png`
                );
            }

            await apipostSignatureUpload({
                brandId,
                signature: signatureFile,
            });

            await onConfirm();
        } catch (error) {
            console.error("Signature upload failed:", error);
            setUploadError("Failed to upload signature. Please try again.");
        } finally {
            setConfirming(false);
        }
    }, [agreed, tab, uploadedSigFile, drawnSig, brandId, signerName, onConfirm]);

    const handleAgreeChange = (v: boolean) => {
        setAgreed(v);
        if (v) setShowError(false);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sig-modal-title"
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
                style={{
                    animation:
                        "sigModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
                }}
            >
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                    <h2
                        id="sig-modal-title"
                        className="flex items-center gap-2 text-base font-semibold text-gray-900 tracking-tight"
                    >
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="inline-flex items-center justify-center rounded-md hover:bg-gray-100 p-1 transition-colors"
                            title="Upload signature"
                        >
                            <Signature size={18} weight="regular" />
                        </button>
                        Sign Contract
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 pt-4 pb-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadedSignature}
                    />

                    <div className="relative rounded-2xl bg-[#f7f7f7] border border-gray-200 px-6 py-6 min-h-[130px] flex items-center justify-center">
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-black hover:border-gray-300 transition-colors"
                        >
                            <UploadSimple size={14} />
                            Upload
                        </button>

                        {tab === "default" && (
                            <div
                                onClick={openFilePicker}
                                className="w-full cursor-pointer"
                                title="Click signature to upload your own"
                            >
                                <DefaultSignature name={signerName} />
                            </div>
                        )}

                        {tab === "draw" && <SignatureCanvas onSave={setDrawnSig} />}

                        {tab === "upload" && uploadedSigPreview && (
                            <img
                                src={uploadedSigPreview}
                                alt="Uploaded signature"
                                className="max-h-[120px] w-auto object-contain"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5 px-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Signature size={14} weight="regular" />
                            {tab === "upload"
                                ? "Uploaded signature is selected as primary"
                                : tab === "draw"
                                    ? "Drawn signature is selected as primary"
                                    : "Default signature is selected as primary"}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setTab((prev) => (prev === "draw" ? "default" : "draw"))
                                }
                                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                {tab === "draw" ? "Use default" : "Draw signature"}
                            </button>

                            <button
                                type="button"
                                onClick={openFilePicker}
                                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                Upload signature
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-4">
                    <div
                        className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${showError
                                ? "border-red-200 bg-red-50/60"
                                : "border-gray-200 bg-white"
                            }`}
                    >
                        <Toggle checked={agreed} onChange={handleAgreeChange} />
                        <p className="text-sm text-gray-700 leading-relaxed">
                            By signing, I confirm that I have read and therefore agree to all
                            contractual terms, which I acknowledge are legally binding.
                        </p>
                    </div>

                    {showError && (
                        <div
                            className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                            role="alert"
                        >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                                !
                            </span>
                            <p className="text-sm font-medium text-red-600">
                                Please confirm that you agree to all terms before signing the
                                contract.
                            </p>
                        </div>
                    )}

                    {uploadError && (
                        <div
                            className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                            role="alert"
                        >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                                !
                            </span>
                            <p className="text-sm font-medium text-red-600">{uploadError}</p>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 flex items-center gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirming || isLoading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                        {confirming || isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                                Processing…
                            </span>
                        ) : (
                            <>
                                <Signature size={16} weight="regular" />
                                Sign & Send
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes sigModalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </div>
    );
}