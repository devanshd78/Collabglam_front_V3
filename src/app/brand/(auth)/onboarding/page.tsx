"use client";

import * as React from "react";
import Link from "next/link";
import { CaretLeft, User, Camera } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";

import { FloatingInput } from "@/components/ui/floatingInput";
import { Button, buttonVariants } from "@/components/ui/buttonComp";
import { cn } from "@/lib/utils";
import { FloatingMultiSelect, FloatingSelect, SelectItem } from "@/components/ui/selectComp";
import { CropImageModal } from "@/components/ui/crop-image-modal";
import { VggCardStack } from "@/components/ui/brand/VggAnimatedCard";

import { apiSaveBrandOnboarding, getApiErrorMessage } from "../../services/brandApi";

// ✅ Toast
import { toast, ToastStyles } from "@/components/ui/toast";

/** =========================
 *  SVG LIBRARY
 *  ========================= */
type SvgProps = { className?: string };

function SvgTriangle({ className }: SvgProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 459 459" fill="none" className={className}>
      <g opacity="0.5">
        <path d="M459 -6.49999L459 452.5L0 -6.5L459 -6.49999Z" fill="#FFF9E6" />
        <path d="M229.5 223L229.5 452.5L0 223L229.5 223Z" fill="#FFF9E6" />
      </g>
    </svg>
  );
}

function SvgArcs({ className }: SvgProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 458" fill="none" className={className}>
      <g opacity="0.5">
        <path
          d="M74.87 525.996C26.1622 449.281 -0.999989 349.144 -1 244.998C-1 140.852 26.1622 40.7148 74.87 -36V525.996Z"
          fill="#FFF9E6"
        />
        <path
          d="M561 526C486.474 526 415.001 496.395 362.303 443.697C309.605 390.999 280 319.526 280 245C280 170.474 309.605 99.0008 362.303 46.303C415.001 -6.39469 486.474 -36 561 -36L561 526Z"
          fill="#FFF9E6"
        />
        <path
          d="M168.413 457.112C197.133 487.772 231.431 511.109 268.76 525.999V-36C231.431 -21.1104 197.133 2.22704 168.413 32.8867C115.715 89.1425 86.11 165.442 86.11 244.999C86.11 324.557 115.715 400.856 168.413 457.112Z"
          fill="#FFF9E6"
        />
      </g>
    </svg>
  );
}

function SvgChain({ className }: SvgProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -250 918 950" fill="none" className={className}>
      <g opacity="0.5">
        <path
          d="M432.501 -83.886C432.501 -171.964 432.501 -216.002 403.351 -232.517C374.2 -249.031 335.333 -227.012 257.598 -182.973L201.403 -151.137C123.669 -107.098 84.8017 -85.0791 84.8017 -52.05C84.8017 -19.021 123.669 2.99843 201.403 47.0372L257.598 78.8733C335.333 122.912 374.2 144.931 403.351 128.417C432.501 111.902 432.501 67.8636 432.501 -20.2139V-83.886Z"
          fill="#FFF9E6"
        />
        <path
          d="M174.903 92.0766C97.1681 48.0378 58.3008 26.0184 29.1504 42.5329C0 59.0475 0 103.086 0 191.164V254.836C0 342.914 0 386.952 29.1504 403.467C58.3008 419.981 97.168 397.962 174.902 353.923L231.098 322.087C308.832 278.048 347.699 256.029 347.699 223C347.699 189.971 308.832 167.951 231.098 123.913L174.903 92.0766Z"
          fill="#FFF9E6"
        />
        <path
          d="M201.403 398.963C123.669 443.001 84.8016 465.021 84.8016 498.05C84.8016 531.079 123.669 553.098 201.403 597.137L257.598 628.973C335.333 673.012 374.2 695.031 403.351 678.517C432.501 662.002 432.501 617.964 432.501 529.886V466.214C432.501 378.136 432.501 334.097 403.351 317.583C374.2 301.068 335.333 323.088 257.598 367.126L201.403 398.963Z"
          fill="#FFF9E6"
        />
        <path
          d="M485.502 529.885C485.502 617.962 485.502 662.001 514.652 678.515C543.803 695.03 582.67 673.01 660.404 628.972L716.598 597.137C794.332 553.098 833.199 531.078 833.199 498.049C833.199 465.02 794.332 443.001 716.598 398.962L660.404 367.127C582.67 323.088 543.803 301.069 514.652 317.583C485.502 334.098 485.502 378.137 485.502 466.214V529.885Z"
          fill="#FFF9E6"
        />
        <path
          d="M743.098 353.922C820.832 397.961 859.699 419.98 888.85 403.466C918 386.951 918 342.913 918 254.835V191.165C918 103.087 918 59.0485 888.85 42.534C859.699 26.0195 820.832 48.0388 743.098 92.0775L686.904 123.913C609.17 167.952 570.302 189.971 570.302 223C570.302 256.029 609.17 278.048 686.904 322.087L743.098 353.922Z"
          fill="#FFF9E6"
        />
        <path
          d="M716.598 47.0377C794.332 2.99898 833.199 -19.0204 833.199 -52.0494C833.199 -85.0785 794.332 -107.098 716.598 -151.137L660.404 -182.972C582.67 -227.011 543.803 -249.03 514.652 -232.515C485.502 -216.001 485.502 -171.962 485.502 -83.8845V-20.2143C485.502 67.8632 485.502 111.902 514.652 128.416C543.803 144.931 582.67 122.912 660.404 78.8729L716.598 47.0377Z"
          fill="#FFF9E6"
        />
      </g>
    </svg>
  );
}

function SvgClover({ className }: SvgProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -44 535 535" fill="none" className={className}>
      <g opacity="0.5">
        <path
          d="M133.75 223.5C207.618 223.5 267.5 163.618 267.5 89.75C267.5 163.601 327.354 223.472 401.198 223.5C327.354 223.528 267.5 283.399 267.5 357.25C267.5 283.382 207.618 223.5 133.75 223.5C59.8819 223.5 0 283.382 0 357.25L0 491L133.75 491C207.618 491 267.5 431.118 267.5 357.25C267.5 431.118 327.382 491 401.25 491L535 491L535 357.25C535 283.399 475.146 223.528 401.302 223.5C475.146 223.472 535 163.601 535 89.7501L535 -43.9999L401.25 -43.9999C327.382 -44 267.5 15.8819 267.5 89.75C267.5 15.8819 207.618 -43.9999 133.75 -43.9999L0 -44L0 89.75C0 163.618 59.8819 223.5 133.75 223.5Z"
          fill="#FFF9E6"
        />
      </g>
    </svg>
  );
}

const SVG_LIBRARY = [SvgTriangle, SvgArcs, SvgChain, SvgClover];

function pickDifferent(current: number, max: number) {
  if (max <= 1) return current;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * max);
  return next;
}

function useRandomSvgSwap(intervalMs: number, optionsCount: number) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex((prev) => pickDifferent(prev, optionsCount));
  }, [optionsCount]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => pickDifferent(prev, optionsCount));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, optionsCount]);

  return index;
}

function makeAliasFromBrandName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}
function makeAliasFromEmail(email: string) {
  const localPart = String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[0];

  return localPart
    .replace(/\+.*/, "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 40);
}

type BrandOnboardingData = {
  brandType: string;
  role: string;
  platforms: string[];
  brandImageFile: File | null;
  brandImagePreview: string;
  googleProfilePicUrl: string;
};

const BRAND_TYPES = [
  "D2C / Consumer Brand",
  "Marketplace",
  "Agency (managing clients)",
  "Startup / Early-stage brand",
  "Enterprise / Established brand",
  "Creator-led / Personal brand",
];

const ROLES = [
  "Founder / Co-founder",
  "Marketing Manager",
  "Brand Manager",
  "Social Media Manager",
  "Growth / Performance Marketer",
  "Agency Account Manager",
  "Other",
];

const PLATFORM_CHIPS = ["YouTube"].map((p) => ({ label: p, value: p }));

type QA = { question: string; answers: string[] };

export default function BrandOnboardingPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const requestedStep = searchParams.get("step");
  type Step = "brandAlias" | "brandOnboarding";
  const [step, setStep] = React.useState<Step>("brandAlias");

  const [brandName, setBrandName] = React.useState("");
  const [pocName, setPocName] = React.useState("");
  const [brandEmail, setBrandEmail] = React.useState("");

  const [brandEmailAlias, setBrandEmailAlias] = React.useState("");
  const [aliasTouched, setAliasTouched] = React.useState(false);

  const [onboardStep, setOnboardStep] = React.useState(0);
  const [onboardData, setOnboardData] = React.useState<BrandOnboardingData>({
    brandType: "",
    role: "",
    platforms: [],
    brandImageFile: null,
    brandImagePreview: "",
    googleProfilePicUrl: "",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | undefined>(undefined);

  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState("");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (requestedStep === "brandAlias") {
      setStep("brandAlias");
      setOnboardStep(0);
      return;
    }

    const onboardingStepMap: Record<string, number> = {
      page1: 0,
      page2: 1,
      page3: 3,
    };

    if (!requestedStep) return;

    const nextStepIndex = onboardingStepMap[requestedStep];

    if (typeof nextStepIndex === "number") {
      setStep("brandOnboarding");
      setOnboardStep(nextStepIndex);
    }
  }, [requestedStep]);

  const brandPreviewRef = React.useRef<string>("");
  const cropSrcRef = React.useRef<string>("");

  React.useEffect(() => {
    brandPreviewRef.current = onboardData.brandImagePreview;
  }, [onboardData.brandImagePreview]);

  React.useEffect(() => {
    cropSrcRef.current = cropSrc;
  }, [cropSrc]);

  React.useEffect(() => {
    return () => {
      if (brandPreviewRef.current) URL.revokeObjectURL(brandPreviewRef.current);
      if (cropSrcRef.current) URL.revokeObjectURL(cropSrcRef.current);
    };
  }, []);

  // ✅ Guard: must have token (OTP verified)
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/brand/signup");
      return;
    }

    const draftRaw = localStorage.getItem("brandSignupDraft");
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);

        const googleProfilePic = draft.googleProfilePic || draft.profilePic || "";

        setBrandName(draft.brandName || "");
        setPocName(draft.pocName || "");
        setBrandEmail(draft.email || "");

        const draftAlias =
          draft.aliasSource ||
          makeAliasFromEmail(draft.email || "") ||
          makeAliasFromBrandName(draft.brandName || "");

        if (draftAlias) {
          setBrandEmailAlias(draftAlias);
        }

        if (googleProfilePic) {
          setOnboardData((prev) => ({
            ...prev,
            brandImagePreview: googleProfilePic,
            googleProfilePicUrl: googleProfilePic,
          }));
        }
      } catch {
        // ignore
      }
    }
  }, [router]);

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  const openCropForFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setCropSrc(url);
    setCropOpen(true);
  };

  const closeCrop = () => {
    setCropOpen(false);
    setPendingFile(null);
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const onCropSave = (blob: Blob) => {
    const name = pendingFile?.name ?? "brand-image.jpg";
    const type = pendingFile?.type || blob.type || "image/jpeg";

    const croppedFile = new File([blob], name, { type });
    const preview = URL.createObjectURL(croppedFile);

    setOnboardData((p) => {
      if (p.brandImagePreview) URL.revokeObjectURL(p.brandImagePreview);
      return { ...p, brandImageFile: croppedFile, brandImagePreview: preview };
    });

    closeCrop();
  };

  const onCropCancel = () => closeCrop();

  const onBrandImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    openCropForFile(file);
  };

  const svgIndex = useRandomSvgSwap(8000, SVG_LIBRARY.length);
  const CardSvg = SVG_LIBRARY[svgIndex];

  const defaultAlias = React.useMemo(() => {
    return makeAliasFromEmail(brandEmail) || makeAliasFromBrandName(brandName);
  }, [brandEmail, brandName]);

  React.useEffect(() => {
    if (step !== "brandAlias") return;
    setAliasTouched(false);
    setBrandEmailAlias((prev) => (prev.trim() ? prev : defaultAlias));
  }, [step, defaultAlias]);

  React.useEffect(() => {
    if (step !== "brandAlias") return;
    if (aliasTouched) return;
    setBrandEmailAlias(defaultAlias);
  }, [step, aliasTouched, defaultAlias]);

  // ✅ Email checker (basic)
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  // ✅ Email normalization (typing-safe)
  const normalizeEmailTyping = (input: string) => {
    return String(input ?? "")
      .toLowerCase()
      .replace(/\s+/g, "") // ✅ spaces never allowed
      .trim();
  };

  // ✅ Gmail canonicalization for comparisons (dots ignored)
  // Use this when you want to compare emails / prevent duplicates.
  const canonicalizeEmailForCompare = (rawEmail: string) => {
    const v = normalizeEmailTyping(rawEmail);
    const parts = v.split("@");
    if (parts.length !== 2) return v;

    let [local, domain] = parts;

    // Treat googlemail same as gmail
    if (domain === "googlemail.com") domain = "gmail.com";

    // ✅ Gmail ignores dots in local part
    if (domain === "gmail.com") {
      local = local.replace(/\./g, "");
    }

    return `${local}@${domain}`;
  };

  // ✅ Strict-ish validation based on your rules (local + domain)
  const validateEmailStrict = (rawEmail: string) => {
    const v = normalizeEmailTyping(rawEmail);
    if (!v) return "Email is required.";

    // must contain exactly one "@"
    const parts = v.split("@");
    if (parts.length !== 2) return "Please enter a valid email address.";

    const [local, domain] = parts;
    if (!local || !domain) return "Please enter a valid email address.";

    // ❌ local part: allowed chars only
    if (!/^[a-z0-9._-]+$/.test(local)) return "Email contains invalid characters.";

    // ❌ no start/end with special char
    if (/^[._-]/.test(local) || /[._-]$/.test(local)) {
      return "Email can't start or end with . _ -";
    }

    // ❌ no consecutive special chars (any combo)
    if (/[._-]{2,}/.test(local)) {
      return "Email can't contain consecutive special characters (.., __, --, ._, etc.)";
    }

    // domain validation (simple but solid)
    // - labels separated by dots
    // - no underscores
    // - labels can't start/end with hyphen
    // - must have a TLD with at least 2 letters
    if (domain.includes("_")) return "Email domain can't contain underscores.";

    const domainParts = domain.split(".");
    if (domainParts.length < 2) return "Email domain is incomplete.";

    for (const label of domainParts) {
      if (!label) return "Email domain is invalid.";
      if (!/^[a-z0-9-]+$/.test(label)) return "Email domain contains invalid characters.";
      if (/^-|-$/.test(label)) return "Email domain labels can't start or end with '-'.";
    }

    const tld = domainParts[domainParts.length - 1];
    if (!/^[a-z]{2,}$/.test(tld)) return "Email TLD is invalid.";

    return undefined; // ✅ valid
  };

  const normalizeAliasTyping = (input: string) => {
    let s = String(input ?? "").toLowerCase().replace(/\s+/g, "");

    // If user pastes full email, keep local-part only
    if (s.includes("@")) s = s.split("@")[0];

    // allow only these in alias
    s = s.replace(/[^a-z0-9._-]/g, "");

    // limit
    return s.slice(0, 40);
  };

  const validateAlias = (aliasRaw: string) => {
    const alias = String(aliasRaw ?? "").toLowerCase().replace(/\s+/g, "").trim();

    if (!alias) return "Alias is required.";
    if (alias.includes("@")) return "Don’t include '@' — we add it automatically.";
    if (alias.length < 3) return "Alias must be at least 3 characters.";
    if (alias.length > 40) return "Alias must be 40 characters or less.";

    // ✅ must start/end with alphanumeric
    if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(alias)) {
      return "Use letters/numbers and . _ - (can’t start or end with a symbol).";
    }

    // ✅ no consecutive special chars (any combo)
    if (/[._-]{2,}/.test(alias)) {
      return "Alias can’t contain consecutive special characters (.., __, --, ._, etc.).";
    }

    // ✅ also validate as a real email once domain is added
    const full = `${alias}@mail.collabglam.com`;
    const msg = validateEmailStrict(full);
    if (msg) return msg;

    return undefined;
  };

  const [aliasInlineError, setAliasInlineError] = React.useState<string | undefined>(undefined);

  const fullAliasEmail = `${brandEmailAlias}@mail.collabglam.com`;
  const aliasValidationMsg = React.useMemo(() => validateAlias(brandEmailAlias), [brandEmailAlias]);

  const aliasError = aliasTouched ? aliasInlineError || aliasValidationMsg : undefined;
  const canCreateAlias = !!brandEmailAlias.trim() && !aliasValidationMsg && !aliasInlineError;

  const createBrandAlias = async () => {
    setFormError(undefined);
    const full = `${brandEmailAlias}@mail.collabglam.com`;
    await apiSaveBrandOnboarding({ proxyEmail: full });
    return true;
  };

  const handleCreateBrandAlias = async () => {
    setAliasTouched(true);
    setFormError(undefined);

    const msg = validateAlias(brandEmailAlias);
    if (msg) {
      setFormError(msg);
      toast({ icon: "error", title: "Invalid alias", text: msg });
      return;
    }

    setIsLoading(true);
    try {
      await createBrandAlias();
      setStep("brandOnboarding");
    } catch (e) {
      const errMsg = getApiErrorMessage(e, "Failed to create alias");
      setFormError(errMsg);
      toast({ icon: "error", title: "Failed to create alias", text: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const stepConfig = React.useMemo(
    () => [
      {
        title: "What type of brand are you?",
        subtitle: "Choose the type that fits best.",
        content: (
          <FloatingSelect
            label="What type of brand you are?"
            size="small"
            value={onboardData.brandType}
            onValueChange={(v) => setOnboardData((p) => ({ ...p, brandType: v }))}
            icon
          >
            {BRAND_TYPES.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </FloatingSelect>
        ),
        isValid: !!onboardData.brandType,
      },
      {
        title: "Tell us about your role",
        subtitle: "Tell us your role at the brand.",
        content: (
          <FloatingSelect
            label="What is your role in the organization?"
            size="small"
            value={onboardData.role}
            onValueChange={(v) => setOnboardData((p) => ({ ...p, role: v }))}
            icon
          >
            {ROLES.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </FloatingSelect>
        ),
        isValid: !!onboardData.role,
      },
      {
        title: "Upload your brand image",
        subtitle: "Add your logo or display image, it will appear in your campaigns.",
        content: (
          <div className="flex flex-col items-center">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onBrandImageChange} />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "mt-[28px]",
                "relative h-[200px] w-[200px] rounded-full",
                "border border-neutral-200 bg-white",
                "flex items-center justify-center overflow-hidden"
              )}
            >
              {onboardData.brandImagePreview ? (
                <img
                  src={onboardData.brandImagePreview}
                  alt="Brand image preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="h-[190px] w-[190px] rounded-full bg-[#F9F9F9] border border-neutral-100 flex items-center justify-center">
                  <User size={256} weight="fill" className="text-neutral-300 mt-16" />
                </div>
              )}

              <span
                className={cn(
                  "absolute left-1/2 top-1/2 mt-2 -translate-x-1/2 -translate-y-1/2",
                  "h-[44px] w-[44px] rounded-full",
                  "bg-[#969696]",
                  "flex items-center justify-center"
                )}
                aria-hidden="true"
              >
                <Camera size={24} weight="bold" className="text-[#F2F2F2]" />
              </span>
            </button>
          </div>
        ),
        isValid: true,
      },
      {
        title: "What are your preferred platforms?",
        subtitle: "Select up to 3 platforms.",
        content: (
          <FloatingMultiSelect
            label="Preferred platforms"
            size="small"
            options={PLATFORM_CHIPS}
            value={onboardData.platforms}
            onValueChange={(platforms) => setOnboardData((p) => ({ ...p, platforms: platforms.slice(0, 3) }))}
            icon
            includeAll={false}
          />
        ),
        isValid: onboardData.platforms.length >= 1 && onboardData.platforms.length <= 3,
      },
    ],
    [onboardData]
  );

  const TOTAL_STEPS = stepConfig.length;
  const progressPct = ((onboardStep + 1) / TOTAL_STEPS) * 100;
  const current = stepConfig[onboardStep];

  const onboardPrev = () => {
    if (onboardStep === 0) return setStep("brandAlias");
    setOnboardStep((s) => Math.max(0, s - 1));
  };

  async function saveCurrentOnboardingStep(stepIndex: number) {
    if (stepIndex === 0) {
      const page1: QA[] = [
        { question: "What type of brand are you?", answers: [onboardData.brandType] },
        { question: "Brand name", answers: [brandName.trim()] },
        { question: "Point of contact name", answers: [pocName.trim()] },
      ];
      await apiSaveBrandOnboarding({ page1 });
      return;
    }

    if (stepIndex === 1) {
      const page2: QA[] = [{ question: "Your role at the brand", answers: [onboardData.role] }];
      await apiSaveBrandOnboarding({ page2 });
      return;
    }

    if (stepIndex === 2) {
      if (onboardData.brandImageFile) {
        const profilePic = await fileToDataUrl(onboardData.brandImageFile);
        await apiSaveBrandOnboarding({ profilePic, isProfilePicSkip: false });
        return;
      }

      if (onboardData.googleProfilePicUrl) {
        await apiSaveBrandOnboarding({
          profilePic: onboardData.googleProfilePicUrl,
          isProfilePicSkip: false,
        });
        return;
      }

      await apiSaveBrandOnboarding({ isProfilePicSkip: true });
      return;
    }

    if (stepIndex === 3) {
      const page3: QA[] = [{ question: "Preferred platforms", answers: onboardData.platforms }];
      await apiSaveBrandOnboarding({ page3 });
      return;
    }
  }

  const onboardNext = async () => {
    if (!current.isValid || isLoading) return;

    setFormError(undefined);
    setIsLoading(true);

    try {
      await saveCurrentOnboardingStep(onboardStep);

      if (onboardStep < TOTAL_STEPS - 1) {
        setOnboardStep((s) => s + 1);
        return;
      }

      localStorage.removeItem("brandSignupDraft");
      router.push("/brand/create-campaign?byAi=1");
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to save onboarding step");
      setFormError(msg);
      toast({ icon: "error", title: "Save failed", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Skip goes to NEXT step (only last skip finishes)
  const onboardSkip = async () => {
    if (isLoading) return;

    setFormError(undefined);
    setIsLoading(true);

    try {
      if (onboardStep === 0) await apiSaveBrandOnboarding({ ispage1Skip: true });
      else if (onboardStep === 1) await apiSaveBrandOnboarding({ ispage2Skip: true });
      else if (onboardStep === 2) await apiSaveBrandOnboarding({ isProfilePicSkip: true });
      else if (onboardStep === 3) await apiSaveBrandOnboarding({ ispage3Skip: true });

      if (onboardStep < TOTAL_STEPS - 1) {
        setOnboardStep((s) => s + 1);
        return;
      }

      localStorage.removeItem("brandSignupDraft");
      router.push("/brand/create-campaign?byAi=1");
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to skip step");
      setFormError(msg);
      toast({ icon: "error", title: "Skip failed", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col overflow-x-hidden">
      <ToastStyles />

      {/* Header */}
      <header className="w-full bg-white border-y border-[color:var(--Border-Primary,#B3B3B3)]">
        <div
          className={cn(
            "mx-auto flex flex-wrap items-center justify-between content-center",
            "gap-m py-[16px]",
            "px-[20px] md:px-[48px] xl:px-[120px] 2xl:px-[160px]",
            "max-w-full"
          )}
        >
          <Link href="/" className="flex items-center gap-s">
            <img src="/logo.png" alt="CollabGlam Logo" width={40} height={40} className="object-contain" loading="eager" />
            <span className="leading-tight">
              <span className="block text-[20px] font-bold text-tx-primary">CollabGlam</span>
              <span className="block text-[10px] leading-[12px] text-tx-tertiary -mt-[2px]">For Brands</span>
            </span>
          </Link>

        </div>
      </header>
      {/* Body */}
      <main
        className={cn(
          "max-w-full flex-1 min-h-0 overflow-y-auto",
          step === "brandOnboarding" ? "py-[8px] sm:py-[16px]" : "py-[20px]"
        )}
      >
        <div className={cn("grid min-h-0 gap-[40px]", step === "brandOnboarding" ? "items-start justify-items-center" : "h-full items-stretch lg:grid-cols-2")}>
          {/* LEFT */}
          {step !== "brandOnboarding" && (
            <section className="order-1 lg:h-full">
              <div className="flex w-full lg:h-full lg:items-stretch pr-[20px]">
                <div
                  className="
                    relative w-full overflow-hidden
                    rounded-tr-[32px] rounded-br-[32px]
                    h-[420px] sm:h-[520px] md:h-[640px]
                    lg:h-[calc(100svh-114px)]
                  "
                  style={{
                    background:
                      "var(--Gradient-Brand-Primary-Radial, radial-gradient(100% 100% at 50% 0%, #FF8C01 0%, #FFBF00 37.94%, #FFF 90.87%))",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-[18px] sm:p-[28px] lg:p-[50px]">
                    <div className="relative w-full overflow-hidden h-[420px] sm:h-[520px] md:h-[640px] lg:h-[calc(100svh-114px)]">
                      <div className="absolute inset-0 flex items-center justify-center p-[18px] sm:p-[28px] lg:p-[50px]">
                        <VggCardStack />
                      </div>
                    </div>
                  </div>

                  <CardSvg className="absolute -bottom-10 -left-10 w-[220px] opacity-50" />
                </div>
              </div>
            </section>
          )}

          {/* RIGHT ✅ top aligned with 84px from top */}
          <section
            className={cn(
              "order-2 flex px-[16px] sm:px-[20px] justify-center w-full items-start",
              step === "brandOnboarding" ? "pt-0" : "pt-[84px]",
              step !== "brandOnboarding" && "lg:min-h-[calc(100svh-114px)]"
            )}
          >
            <div className="w-full max-w-[520px]">
              {/* Brand Alias */}
              {step === "brandAlias" && (
                <>
                  <h1 className="cg-heading">Create a Brand Alias Email</h1>
                  <p className="mt-m cg-description">Enter a unique alias email.</p>

                  <div className="mt-2xl">
                    {(formError || aliasError) ? (
                      <p className="mb-3 text-[12px] leading-[16px] text-error-500">{aliasError || formError}</p>
                    ) : null}

                    {/* ✅ 520w + 172h + 32 gap */}
                    <div className={cn("w-full max-w-[520px] min-h-[172px] flex flex-col gap-[32px]")}>
                      <div>
                        <FloatingInput
                          type="text"
                          label="Choose your brand email"
                          value={brandEmailAlias}
                          onValueChange={(v) => {
                            const hadAt = v.includes("@");
                            const cleaned = normalizeAliasTyping(v);

                            setBrandEmailAlias(cleaned);
                            setAliasTouched(true);

                            if (formError) setFormError(undefined);

                            setAliasInlineError(hadAt ? "Don’t type '@' here — we already add the domain." : undefined);
                          }}
                          suffixText="@mail.collabglam.com"
                          icon
                        />
                      </div>

                      <Button
                        className={cn(
                          "w-full h-[52px] rounded-[12px] bg-neutral-900 text-white hover:bg-neutral-900/90",
                          (!canCreateAlias || isLoading) && "opacity-60"
                        )}
                        onClick={handleCreateBrandAlias}
                        disabled={!canCreateAlias || isLoading}
                      >
                        {isLoading ? "Creating..." : "Continue"}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Onboarding */}
              {step === "brandOnboarding" && (
                <div className="w-full flex justify-center items-start">
                  <div className="w-full max-w-[720px]">
                    <div className={["w-full mx-auto mt-0", "overflow-hidden"].join(" ")}>
                      {/* Progress bar */}
                      <div className="px-6 pt-4">
                        <div className="h-[3px] w-full rounded-full bg-neutral-100 overflow-hidden">
                          <div className="h-full bg-[#28A745] transition-all duration-300" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>

                      <div className="min-h-0 flex flex-col max-h-[calc(100svh-92px)] sm:max-h-[min(720px,calc(100svh-112px))] overflow-y-auto overscroll-contain">
                        <div className="min-h-0">
                          <div className="px-5 sm:px-6 pt-3 sm:pt-5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={onboardPrev}
                                className="inline-flex items-center justify-center rounded-full p-2 hover:bg-neutral-100 active:bg-neutral-200"
                                aria-label="Back"
                              >
                                <CaretLeft size={18} weight="bold" style={{ color: "var(--Light-Icon-Primary, #1A1A1A)" }} />
                              </button>

                              <div className="cg-black-description">
                                <span style={{ fontWeight: 500 }}>{onboardStep + 1}</span> of {TOTAL_STEPS} task
                              </div>
                            </div>

                            <div className="mt-4">
                              <h1 className="cg-heading">{current.title}</h1>
                              <p className="mt-l cg-description">{current.subtitle}</p>
                            </div>

                            <div className="px-0 sm:px-[20px] mt-[24px] sm:mt-[32px] pb-4">{current.content}</div>
                          </div>
                        </div>

                        {/* Fixed footer */}
                        <div className="shrink-0 bg-white px-5 sm:px-6 pt-2 sm:pt-4 pb-4 sm:pb-6">
                          {formError ? (
                            <p className="mb-3 text-[12px] leading-[16px] text-error-500">{formError}</p>
                          ) : null}

                          <Button
                            variant="solid"
                            size="lg"
                            className={cn(
                              "w-full h-[50px] sm:h-[56px] rounded-[14px]",
                              "disabled:opacity-100 disabled:bg-neutral-200 disabled:text-neutral-400"
                            )}
                            onClick={onboardNext}
                            disabled={!current.isValid || isLoading}
                          >
                            {isLoading ? "Saving..." : onboardStep === TOTAL_STEPS - 1 ? "Finish" : "Continue"}
                          </Button>

                          <Button
                            variant="raised"
                            size="lg"
                            className="w-full h-[48px] sm:h-[54px] rounded-[14px] shadow-none mt-2 sm:mt-m"
                            onClick={onboardSkip}
                            disabled={isLoading}
                          >
                            Skip for now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CropImageModal
                    open={cropOpen}
                    imageSrc={cropSrc}
                    mimeType={pendingFile?.type || "image/jpeg"}
                    aspect={1}
                    cropShape="round"
                    onCancel={onCropCancel}
                    onSave={onCropSave}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
