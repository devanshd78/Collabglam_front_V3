"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Info, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/buttonComp";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
    apiDeleteBrandSignature,
    apiListBrandSignatures,
    apiSetPrimaryBrandSignature,
    apiUploadBrandSignature,
    BrandSignatureAsset,
} from "../../services/brandSignatureApi";

type BrandSignatureModalProps = {
    open: boolean;
    brandId: string;
    initialTab?: "upload" | "manage";
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (
        signatureData: string,
        signatureId: string
    ) => Promise<void> | void;
    onSignatureUploaded?: () => Promise<any> | void;
};

function formatDate(value?: string) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fileToPreview(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read signature file."));
        reader.readAsDataURL(file);
    });
}

export default function BrandSignatureModal({
    open,
    brandId,
    initialTab = "upload",
    isLoading = false,
    onClose,
    onConfirm,
    onSignatureUploaded,
}: BrandSignatureModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [tab, setTab] = useState<"upload" | "manage">(initialTab);
    const [signatures, setSignatures] = useState<BrandSignatureAsset[]>([]);
    const [maxSignatures, setMaxSignatures] = useState(3);

    const [name, setName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [selectAsPrimary, setSelectAsPrimary] = useState(true);
    const [agreed, setAgreed] = useState(false);
    const [showAgreeError, setShowAgreeError] = useState(false);

    const [selectedPrimaryId, setSelectedPrimaryId] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorText, setErrorText] = useState("");

    const primarySignature = useMemo(
        () => signatures.find((item) => item.isPrimary) || signatures[0] || null,
        [signatures]
    );

    const isMaxReached = signatures.length >= maxSignatures;

    const resetUploadForm = useCallback(() => {
        setName("");
        setRemarks("");
        setFile(null);
        setPreviewSrc("");
        setSelectAsPrimary(true);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const loadSignatures = useCallback(async () => {
        if (!brandId) return;

        const result = await apiListBrandSignatures(brandId);
        const rows = Array.isArray(result.signatures) ? result.signatures : [];
        const primary = rows.find((item) => item.isPrimary);

        setMaxSignatures(Number(result.max || 3));
        setSignatures(rows);
        setSelectedPrimaryId(primary?._id || rows[0]?._id || "");

        if (!rows.length) {
            setTab("upload");
        }
    }, [brandId]);

    useEffect(() => {
        if (!open) return;

        setTab(initialTab);
        resetUploadForm();
        setAgreed(false);
        setShowAgreeError(false);
        setErrorText("");

        loadSignatures().catch(() => {
            setErrorText("Could not load brand signatures.");
            setTab("upload");
        });
    }, [open, initialTab, loadSignatures, resetUploadForm]);

    const handleFileSelect = async (nextFile?: File | null) => {
        if (!nextFile) return;

        const allowedTypes = [
            "image/svg+xml",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
        ];

        if (!allowedTypes.includes(nextFile.type)) {
            setErrorText("Only SVG, PNG, JPG, JPEG, or WEBP signatures are allowed.");
            return;
        }

        if (nextFile.size > 5 * 1024 * 1024) {
            setErrorText("Signature must be under 5 MB.");
            return;
        }

        setFile(nextFile);
        setPreviewSrc(await fileToPreview(nextFile));
        setErrorText("");
    };

    const saveSignature = async () => {
        if (isMaxReached) {
            setErrorText("Max 3 brand signatures can be added.");
            return null;
        }

        if (!name.trim()) {
            setErrorText("Signature name is required.");
            return null;
        }

        if (!remarks.trim()) {
            setErrorText("Remarks are required.");
            return null;
        }

        if (!file) {
            setErrorText("Please upload a signature.");
            return null;
        }

        setSaving(true);

        try {
            const saved = await apiUploadBrandSignature({
                brandId,
                name: name.trim(),
                remarks: remarks.trim(),
                file,
                isPrimary: selectAsPrimary,
            });

            await loadSignatures();
            await onSignatureUploaded?.();

            return saved;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSignatureOnly = async () => {
        try {
            const saved = await saveSignature();
            if (!saved) return;

            setTab("manage");
            resetUploadForm();
        } catch (error: any) {
            setErrorText(
                error?.response?.data?.message ||
                error?.message ||
                "Could not save signature."
            );
        }
    };

    const handleSignContract = async () => {
        if (!agreed) {
            setShowAgreeError(true);
            return;
        }

        try {
            let signatureToUse: BrandSignatureAsset | null = primarySignature;

            if (file) {
                const savedSignature = await saveSignature();

                if (!savedSignature) {
                    return;
                }

                signatureToUse = savedSignature;
            }

            if (!signatureToUse?.signature) {
                setErrorText("Please upload or select a brand signature.");
                setTab("upload");
                return;
            }

            await onConfirm(signatureToUse.signature, signatureToUse._id);
        } catch (error: any) {
            setErrorText(
                error?.response?.data?.message ||
                error?.message ||
                "Could not sign contract."
            );
        }
    };

    const handleSaveManageChanges = async () => {
        if (!selectedPrimaryId) {
            setErrorText("Please select a primary brand signature.");
            return;
        }

        setSaving(true);

        try {
            await apiSetPrimaryBrandSignature(brandId, selectedPrimaryId);
            await loadSignatures();
            await onSignatureUploaded?.();
            onClose();
        } catch (error: any) {
            setErrorText(
                error?.response?.data?.message ||
                error?.message ||
                "Could not save changes."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSignature = async (signatureId: string) => {
        setSaving(true);

        try {
            await apiDeleteBrandSignature(brandId, signatureId);
            await loadSignatures();
            await onSignatureUploaded?.();
        } catch (error: any) {
            setErrorText(
                error?.response?.data?.message ||
                error?.message ||
                "Could not delete signature."
            );
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-[700px] rounded-[20px] bg-white p-5 shadow-2xl">
                <div className="mb-7 flex items-center justify-between">
                    <h2 className="text-[24px] font-semibold text-[#1A1A1A]">
                        Brand Signature
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="mb-7 grid grid-cols-2 border-b border-[#D9D9D9]">
                    <button
                        type="button"
                        onClick={() => setTab("upload")}
                        className={cn(
                            "relative pb-4 text-center text-base font-medium",
                            tab === "upload" ? "text-[#1A1A1A]" : "text-[#B8B8B8]"
                        )}
                    >
                        Upload signature
                        {tab === "upload" ? (
                            <span className="absolute bottom-[-1px] left-1/2 h-[2px] w-[90px] -translate-x-1/2 bg-[#F2C94C]" />
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab("manage")}
                        className={cn(
                            "relative pb-4 text-center text-base font-medium",
                            tab === "manage" ? "text-[#1A1A1A]" : "text-[#B8B8B8]"
                        )}
                    >
                        Manage signature
                        {tab === "manage" ? (
                            <span className="absolute bottom-[-1px] left-1/2 h-[2px] w-[90px] -translate-x-1/2 bg-[#F2C94C]" />
                        ) : null}
                    </button>
                </div>

                {tab === "upload" ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name *"
                                className="h-[72px] rounded-[12px] border border-[#D9D9D9] px-4 text-base outline-none focus:border-[#1A1A1A]"
                            />

                            <input
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Remarks *"
                                className="h-[72px] rounded-[12px] border border-[#D9D9D9] px-4 text-base outline-none focus:border-[#1A1A1A]"
                            />
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".svg,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />

                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleFileSelect(e.dataTransfer.files?.[0]);
                            }}
                            className="rounded-[16px] bg-[#F8F8F8] px-4 py-6"
                        >
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3"
                            >
                                {previewSrc ? (
                                    <img
                                        src={previewSrc}
                                        alt="Brand signature"
                                        className="max-h-[140px] max-w-full object-contain"
                                    />
                                ) : (
                                    <>
                                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED]">
                                            <UploadSimple size={22} />
                                        </span>

                                        <div className="text-center">
                                            <div className="text-base font-semibold text-[#1A1A1A] underline">
                                                Upload signature{" "}
                                                <span className="font-normal text-[#9C9C9C] no-underline">
                                                    or drag and drop
                                                </span>
                                            </div>

                                            <div className="mt-1 text-sm text-[#B8B8B8]">
                                                SVG, PNG, JPG under max 5 MB
                                            </div>
                                        </div>
                                    </>
                                )}
                            </button>

                            <label className="mt-4 flex items-center gap-3 text-sm text-[#B8B8B8]">
                                <Checkbox
                                    checked={selectAsPrimary}
                                    onCheckedChange={(v) => setSelectAsPrimary(v === true)}
                                    className="h-5 w-5 rounded-[4px] border border-[#B3B3B3]"
                                />
                                Select as primary
                            </label>
                        </div>

                        <p className="text-base text-[#9C9C9C]">
                            This contract will be signed by and sent to the subsequent signee.
                        </p>

                        <div
                            className={cn(
                                "overflow-hidden rounded-[14px] border bg-white",
                                showAgreeError && !agreed
                                    ? "border-[#FFE1DF]"
                                    : "border-[#E6E6E6]"
                            )}
                        >
                            <div className="flex items-center gap-4 px-5 py-6">
                                <Switch
                                    checked={agreed}
                                    onCheckedChange={(checked) => {
                                        setAgreed(checked === true);
                                        if (checked) setShowAgreeError(false);
                                    }}
                                    className="shrink-0"
                                />

                                <p className="m-0 flex-1 text-sm font-medium leading-6 text-[#1A1A1A]">
                                    By signing, I confirm that I have read and therefore agree to
                                    all contractual terms, which become legally binding.
                                </p>
                            </div>

                            {showAgreeError && !agreed ? (
                                <div className="flex items-start gap-3 bg-[#FFF0EF] px-5 py-4">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F04D3F] text-sm font-bold text-white">
                                        !
                                    </span>

                                    <p className="text-sm font-medium leading-5 text-[#E53935]">
                                        Please confirm that you agree to all terms before signing.
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        {errorText ? (
                            <div className="rounded-[12px] bg-[#FFF0EF] px-4 py-3 text-sm font-medium text-[#E53935]">
                                {errorText}
                            </div>
                        ) : null}

                        {isMaxReached ? (
                            <div className="flex items-center justify-between rounded-[12px] border border-[#E6E6E6] bg-[#FAFAFA] px-4 py-4">
                                <div className="flex items-center gap-3 text-sm font-medium text-[#1A1A1A]">
                                    <Info size={18} weight="fill" />
                                    Max 3 Signatures can be added
                                </div>
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-4 pt-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>

                            <Button
                                variant="outline"
                                disabled={saving || isMaxReached}
                                onClick={handleSaveSignatureOnly}
                            >
                                {saving ? "Saving..." : "Save signature"}
                            </Button>

                            <Button
                                disabled={saving || isLoading}
                                onClick={handleSignContract}
                            >
                                {saving || isLoading ? "Signing..." : "Sign this contract"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="space-y-3">
                            {signatures.map((item) => {
                                const selected = selectedPrimaryId === item._id;

                                return (
                                    <div
                                        key={item._id}
                                        className="grid items-center gap-4 overflow-hidden rounded-[12px] border border-[#E6E6E6] bg-white"
                                        style={{
                                            gridTemplateColumns: "96px 1fr auto auto",
                                        }}
                                    >
                                        <div className="flex h-[112px] items-center justify-center bg-[#F8F8F8]">
                                            <img
                                                src={item.signature}
                                                alt={item.name || "Brand signature"}
                                                className="max-h-[54px] max-w-[70px] object-contain"
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="text-base font-semibold text-[#1A1A1A]">
                                                {item.name || "Brand Signature"}
                                            </div>

                                            <div className="mt-2 text-sm text-[#9C9C9C]">
                                                {item.remarks || "Brand"}{" "}
                                                <span className="mx-2">|</span>{" "}
                                                {formatDate(item.createdAt)}
                                            </div>

                                            {item.isPrimary ? (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-[#9C9C9C]">
                                                    <Info size={14} />
                                                    Signature is selected as primary
                                                </div>
                                            ) : null}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedPrimaryId(item._id)}
                                            className={cn(
                                                "h-12 rounded-[10px] px-7 text-sm font-semibold",
                                                selected
                                                    ? "bg-[#1A1A1A] text-white"
                                                    : "border border-[#E6E6E6] bg-white text-[#1A1A1A]"
                                            )}
                                        >
                                            {selected ? "Selected" : "Select"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSignature(item._id)}
                                            className="mr-4 flex h-9 w-9 items-center justify-center rounded-full text-[#E53935] hover:bg-[#FFF0EF]"
                                            aria-label="Delete signature"
                                        >
                                            <Trash size={22} />
                                        </button>
                                    </div>
                                );
                            })}

                            {!signatures.length ? (
                                <div className="rounded-[12px] border border-[#E6E6E6] p-6 text-center">
                                    <div className="text-sm font-medium text-[#1A1A1A]">
                                        No brand signatures added yet.
                                    </div>

                                    <p className="mt-1 text-sm text-[#9C9C9C]">
                                        Upload a signature to continue sending this contract.
                                    </p>

                                    <Button
                                        type="button"
                                        className="mt-4"
                                        onClick={() => setTab("upload")}
                                        disabled={saving}
                                    >
                                        Upload Signature
                                    </Button>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between rounded-[12px] border border-[#E6E6E6] bg-[#FAFAFA] px-4 py-4">
                            <div className="flex items-center gap-3 text-sm font-medium text-[#1A1A1A]">
                                <Info size={18} weight="fill" />
                                Max 3 Signatures can be added
                            </div>
                        </div>

                        {errorText ? (
                            <div className="rounded-[12px] bg-[#FFF0EF] px-4 py-3 text-sm font-medium text-[#E53935]">
                                {errorText}
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-4 pt-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>

                            <Button
                                disabled={saving || !signatures.length}
                                onClick={handleSaveManageChanges}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}