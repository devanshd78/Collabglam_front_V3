"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

import { FloatingInput } from "@/components/ui/floatingInput";
import { Button, buttonVariants } from "@/components/ui/buttonComp";
import { cn } from "@/lib/utils";

import { FloatingSelect, SelectItem } from "@/components/ui/selectComp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { VggCardStack } from "@/components/ui/brand/VggAnimatedCard";

import {
  apiSendSignupOtp,
  apiVerifyOtpSignup,
  getApiErrorMessage,
} from "../../services/brandApi";

import { CountdownTicker } from "@/components/ui/countdown-ticker";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { PasswordInput } from "@/components/ui/password";
import { CaretLeft } from "@phosphor-icons/react";

import { toast, ToastStyles } from "@/components/ui/toast";

type SvgProps = { className?: string };

function SvgTriangle({ className }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 459 459"
      fill="none"
      className={className}
    >
      <g opacity="0.5">
        <path d="M459 -6.49999L459 452.5L0 -6.5L459 -6.49999Z" fill="#FFF9E6" />
        <path d="M229.5 223L229.5 452.5L0 223L229.5 223Z" fill="#FFF9E6" />
      </g>
    </svg>
  );
}

function SvgArcs({ className }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 458"
      fill="none"
      className={className}
    >
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -250 918 950"
      fill="none"
      className={className}
    >
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -44 535 535"
      fill="none"
      className={className}
    >
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

const SUBTITLE_CLASS =
  "text-[14px] leading-[20px] text-[color:var(--Light-Text-Secondary,#969696)]";

const COMPANY_SIZE_OPTIONS = [
  "Solo / Self-employed",
  "2–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "500+ employees",
];

const INDUSTRY_OPTIONS = [
  "Beauty & Personal Care",
  "Fashion & Apparel",
  "Lifestyle & Home",
  "Health & Fitness",
  "Technology & SaaS",
  "Food & Beverage",
  "Travel & Hospitality",
  "Education",
  "Finance & Fintech",
  "Gaming & Entertainment",
  "Media & Publishing",
  "Real Estate",
  "Sustainability & Eco Brands",
  "Other",
];

async function runRecaptchaCheck(
  executeRecaptcha: ((action: string) => Promise<string>) | undefined,
  action: string,
) {
  if (!executeRecaptcha) {
    throw new Error("Security check is still loading. Please try again.");
  }

  const token = await executeRecaptcha(action);

  if (!token) {
    throw new Error("Security verification failed. Please try again.");
  }

  return token;
}

function RecaptchaDisclosure() {
  return (
    <p className="mt-3 text-center text-xs leading-5 text-[#969696] [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-[10px] [@media(max-height:820px)]:leading-[14px]">
      This site is protected by reCAPTCHA and the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-black hover:underline"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-black hover:underline"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}

function BrandSignupInner() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();

  type Step = "form" | "otp";

  const [brandName, setBrandName] = React.useState("");
  const [pocName, setPocName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [companySize, setCompanySize] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);

  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  const [clearedOnFocus, setClearedOnFocus] = React.useState({
    brandName: false,
    email: false,
    industry: false,
    password: false,
    agreed: false,
  });

  const clearFieldOnFocus = (key: keyof typeof clearedOnFocus) => {
    setClearedOnFocus((prev) => ({ ...prev, [key]: true }));
  };

  const resetClearedOnSubmit = () => {
    setClearedOnFocus({
      brandName: false,
      email: false,
      industry: false,
      password: false,
      agreed: false,
    });
  };

  const [step, setStep] = React.useState<Step>("form");
  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | undefined>(undefined);
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [passwordValid, setPasswordValid] = React.useState(false);

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const pwOk = (p: string) => {
    const value = (p ?? "").trim();

    return (
      value.length >= 8 &&
      value.length <= 16 &&
      /\d/.test(value) &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  };

  const brandNameError =
    attemptedSubmit && !clearedOnFocus.brandName && !brandName.trim()
      ? "Brand name is required."
      : "";

  const emailError =
    attemptedSubmit && !clearedOnFocus.email
      ? !email.trim()
        ? "Work email is required."
        : !emailOk(email)
          ? "Please enter a valid email address."
          : ""
      : "";

  const industryError =
    attemptedSubmit && !clearedOnFocus.industry && !industry
      ? "Industry is required."
      : "";

  const passwordError =
    attemptedSubmit && !clearedOnFocus.password
      ? !password.trim()
        ? "Password is required."
        : !pwOk(password)
          ? "Password must be 8–16 characters and include uppercase, lowercase, number, and special character."
          : ""
      : "";

  const agreedError =
    attemptedSubmit && !clearedOnFocus.agreed && !agreed
      ? "Please accept Terms of Service and Privacy Policy."
      : "";

  const brandNameInvalid = !!brandNameError;
  const emailInvalid = !!emailError;
  const industryInvalid = !!industryError;
  const passwordInvalid = !!passwordError;
  const agreedInvalid = !!agreedError;

  const svgIndex = useRandomSvgSwap(8000, SVG_LIBRARY.length);
  const CardSvg = SVG_LIBRARY[svgIndex];

  React.useEffect(() => {
    if (step !== "otp") return;
    if (secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [secondsLeft, step]);

  const sendOtp = async () => {
    await apiSendSignupOtp({
      brandName: brandName.trim(),
      name: pocName.trim(),
      email: email.trim(),
      companySize,
      industry,
      password,
    });

    setSecondsLeft(60);
  };

  const verifyOtp = async (code: string) => {
    const res = await apiVerifyOtpSignup({
      email: email.trim(),
      otp: code,
    });

    localStorage.setItem("token", res.token);
    localStorage.setItem("brandId", res.brandId);

    localStorage.setItem(
      "brandSignupDraft",
      JSON.stringify({
        brandName: brandName.trim(),
        pocName: pocName.trim(),
        email: email.trim(),
        companySize,
        industry,
      }),
    );

    await fetch("/api-1/brand-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: res.token }),
    });

    return res;
  };

  const handleContinueFromForm = async (e: React.FormEvent) => {
    e.preventDefault();

    resetClearedOnSubmit();
    setAttemptedSubmit(true);

    const hasAnyErrorNow =
      !brandName.trim() ||
      !email.trim() ||
      !emailOk(email) ||
      !industry ||
      password.trim().length < 8 ||
      password.trim().length > 16 ||
      !passwordValid ||
      !agreed;

    if (hasAnyErrorNow) return;

    setIsSendingOtp(true);
    try {
      await runRecaptchaCheck(executeRecaptcha, "brand_signup_send_otp");
      await sendOtp();
      setStep("otp");
      setOtp("");
      setOtpError(undefined);

      toast({
        icon: "success",
        title: "OTP sent",
        text: `We sent a 6-digit code to ${email.trim()}`,
      });
    } catch (err) {
      toast({
        icon: "error",
        title: "Failed to send OTP",
        text: getApiErrorMessage(err, "Failed to send OTP"),
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await runRecaptchaCheck(executeRecaptcha, "brand_signup_verify_otp");
      await verifyOtp(otp);

      toast({
        icon: "success",
        title: "OTP verified",
        text: "Redirecting to onboarding…",
      });

      router.replace("/brand/onboarding");
    } catch (err) {
      const msg = getApiErrorMessage(err, "OTP verification failed");
      toast({ icon: "error", title: "OTP verification failed", text: msg });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (secondsLeft > 0 || isSendingOtp) return;

    setOtp("");
    setOtpError(undefined);

    setIsSendingOtp(true);
    try {
      await runRecaptchaCheck(executeRecaptcha, "brand_signup_resend_otp");
      await sendOtp();
      toast({
        icon: "success",
        title: "OTP resent",
        text: `A new OTP was sent to ${email.trim()}`,
      });
    } catch (err) {
      toast({
        icon: "error",
        title: "Failed to resend OTP",
        text: getApiErrorMessage(err, "Failed to resend OTP"),
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const goBackToForm = () => {
    setOtp("");
    setOtpError(undefined);
    setSecondsLeft(0);
    setStep("form");
  };

  return (
    <div className="min-h-[100svh] lg:h-[100svh] bg-background text-foreground flex flex-col overflow-x-hidden lg:overflow-hidden relative">
      <ToastStyles />

      <header className="w-full bg-white border-b border-bd-primary">
        <div
          className={cn(
            "mx-auto flex flex-wrap items-center justify-between content-center",
            "gap-m py-[16px] [@media(max-height:820px)]:py-[10px]",
            "px-[20px] md:px-[48px] xl:px-[120px] 2xl:px-[160px]",
            "max-w-full",
          )}
        >
          <Link href="/" className="flex items-center gap-s">
            <img
              src="/logo.png"
              alt="CollabGlam Logo"
              width={40}
              height={40}
              className="object-contain size-[40px] [@media(max-height:820px)]:size-[34px]"
              loading="eager"
            />

            <span className="leading-tight">
              <span className="block text-[20px] font-bold text-tx-primary">
                CollabGlam
              </span>
              <span className="block text-[10px] leading-[12px] text-tx-tertiary -mt-[2px]">
                For Brands
              </span>
            </span>
          </Link>

          <Link
            href="/influencer/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "!my-0 rounded-m px-l border border-bd-primary text-tx-primary !shadow-none",
            )}
          >
            Join as a Creator
          </Link>
        </div>
      </header>

      <main
        className={cn("max-w-full flex-1 min-h-0 overflow-y-auto lg:overflow-hidden", "pt-[10px] [@media(max-height:820px)]:pt-0")}
      >
        <div
          className={cn("grid min-h-0", "h-full items-stretch lg:grid-cols-2")}
        >
          <section className="order-1 lg:h-full lg:min-h-0">
            <div className="flex w-full lg:h-full lg:min-h-0 lg:items-stretch pr-[20px]">
              <div
                className="
                  relative w-full overflow-hidden
                  rounded-tr-[32px] rounded-br-[32px]
                  h-[360px] sm:h-[460px] md:h-[560px]
                  lg:h-full
                "
                style={{
                  background:
                    "var(--Gradient-Brand-Primary-Radial, radial-gradient(100% 100% at 50% 0%, #FF8C01 0%, #FFBF00 37.94%, #FFF 90.87%))",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-[18px] sm:p-[28px] lg:p-[50px]">
                  <div className="relative w-full overflow-hidden h-full">
                    <div className="absolute inset-0 flex items-center justify-center p-[18px] sm:p-[28px] lg:p-[50px]">
                      <VggCardStack />
                    </div>
                  </div>
                </div>

                <CardSvg className="absolute -bottom-10 -left-10 w-[220px] opacity-50" />
              </div>
            </div>
          </section>

          <section
            className={cn(
              "order-2 flex px-[20px] justify-center w-full items-start",
              step === "form" || step === "otp" ? "py-[32px] lg:py-[18px] [@media(max-height:820px)]:py-[10px]" : "",
              "lg:h-full lg:min-h-0 lg:items-center",
            )}
          >
            <div className={cn("w-full max-w-[520px] [@media(max-height:820px)]:max-w-[500px]")}>
              {step === "form" && (
                <>
                  <h1 className="cg-heading [@media(max-height:820px)]:text-[32px] [@media(max-height:820px)]:leading-[38px]">Create an Account</h1>
                  <p className="mt-m cg-description [@media(max-height:820px)]:mt-s [@media(max-height:820px)]:text-[14px] [@media(max-height:820px)]:leading-[20px]">
                    Share a few basic details so we can set up your workspace.
                  </p>

                  <form
                    onSubmit={handleContinueFromForm}
                    className="mt-2xl space-y-m [@media(max-height:820px)]:mt-l [@media(max-height:820px)]:space-y-s"
                  >
                    <FloatingInput
                      label="Brand Name"
                      required
                      type="text"
                      value={brandName}
                      onValueChange={(v) => {
                        setBrandName(v);
                        if (brandNameInvalid) clearFieldOnFocus("brandName");
                      }}
                      onFocus={() => clearFieldOnFocus("brandName")}
                      icon={false}
                      size="small"
                      state={brandNameInvalid ? "error" : "default"}
                      errorText={brandNameError || undefined}
                    />

                    <FloatingInput
                      label="Name"
                      type="text"
                      value={pocName}
                      onValueChange={(v) => setPocName(v)}
                      icon={false}
                      size="small"
                    />

                    <FloatingInput
                      label="Work Email"
                      required
                      value={email}
                      onValueChange={(v) => {
                        setEmail(v);
                        if (emailInvalid) clearFieldOnFocus("email");
                      }}
                      onFocus={() => clearFieldOnFocus("email")}
                      icon={false}
                      size="small"
                      state={emailInvalid ? "error" : "default"}
                      errorText={emailError || undefined}
                    />

                    <div className="grid grid-cols-1 gap-m md:grid-cols-2 [@media(max-height:820px)]:gap-s">
                      <FloatingSelect
                        label="Company Size"
                        size="small"
                        value={companySize}
                        onValueChange={(v) => setCompanySize(v)}
                        icon
                      >
                        {COMPANY_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </FloatingSelect>

                      <FloatingSelect
                        label="Industry"
                        size="small"
                        required
                        value={industry}
                        onValueChange={(v) => {
                          setIndustry(v);
                          if (industryInvalid) clearFieldOnFocus("industry");
                        }}
                        onFieldFocus={() => {
                          if (industryInvalid) clearFieldOnFocus("industry");
                        }}
                        icon
                        state={industryInvalid ? "error" : "default"}
                        errorText={industryError || undefined}
                      >
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </FloatingSelect>
                    </div>

                    <PasswordInput
                      label="Password"
                      required
                      value={password}
                      onValueChange={(v) => {
                        setPassword(v);
                        if (passwordInvalid) clearFieldOnFocus("password");
                      }}
                      onFocus={() => clearFieldOnFocus("password")}
                      onValidityChange={(valid) => setPasswordValid(valid)}
                      icon
                      size="small"
                      state={passwordInvalid ? "error" : "default"}
                      errorText={passwordError || undefined}
                      showRules
                    />

                    <div className="mt-xl [@media(max-height:820px)]:mt-m">
                      <label
                        className={cn(
                          "flex items-center gap-[10px] text-center text-[12px] leading-[16px]",
                          agreedInvalid
                            ? "text-[color:var(--Errors-500,#E35141)]"
                            : "text-[#7A7A7A]",
                        )}
                      >
                        <Checkbox
                          checked={agreed}
                          onCheckedChange={(v) => {
                            setAgreed(v === true);
                            if (agreedInvalid) clearFieldOnFocus("agreed");
                          }}
                          onClick={() => {
                            if (agreedInvalid) clearFieldOnFocus("agreed");
                          }}
                          aria-invalid={agreedInvalid}
                          className={cn(
                            "bg-background border rounded-[4px] w-[20px] h-[20px] p-[4px]",
                            agreedInvalid
                              ? "border-[color:var(--Errors-500,#E35141)]"
                              : "border-[color:var(--Border-Primary,#B3B3B3)]",
                          )}
                        />

                        <span>
                          By continuing, you agree to our{" "}
                          <Link
                            href="/terms"
                            className="font-semibold hover:underline text-current"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy-policy"
                            className="font-semibold hover:underline text-current"
                          >
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      variant="solid"
                      size="lg"
                      className={cn(
                        "w-full rounded-m mt-2xl [@media(max-height:820px)]:mt-l [@media(max-height:820px)]:h-[48px]",
                        isSendingOtp && "opacity-60",
                      )}
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? "Sending OTP..." : "Continue"}
                    </Button>

                    <p className="cg-auth-helper [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-[13px]">
                      Already Have an Account?{" "}
                      <Link
                        href="/brand/login"
                        className="cg-auth-link hover:underline"
                      >
                        Login
                      </Link>
                    </p>

                    <RecaptchaDisclosure />
                  </form>
                </>
              )}

              {step === "otp" && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBackToForm}
                      className="inline-flex items-center justify-center rounded-full p-2 hover:bg-neutral-100 active:bg-neutral-200"
                      aria-label="Back"
                    >
                      <CaretLeft
                        size={18}
                        weight="bold"
                        style={{ color: "var(--Light-Icon-Primary, #1A1A1A)" }}
                      />
                    </button>

                    <h1 className="cg-heading m-0 [@media(max-height:820px)]:text-[32px] [@media(max-height:820px)]:leading-[38px]">Enter OTP</h1>
                  </div>
                  <p className="mt-s cg-description [@media(max-height:820px)]:text-[14px] [@media(max-height:820px)]:leading-[20px]">
                    Enter the 6-digit code sent to your email to activate your
                    account.
                  </p>

                  <div className="space-y-[14px] mt-[12px] [@media(max-height:820px)]:space-y-[10px]">
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onFocus={() => setOtpError(undefined)}
                        onChange={(v) => {
                          setOtp(v);
                          if (otpError) setOtpError(undefined);
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className={cn(
                                otpError
                                  ? "border-error-500"
                                  : "border-neutral-300",
                              )}
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="space-y-[20px] [@media(max-height:820px)]:space-y-[12px]">
                      <Button
                        variant="solid"
                        className={cn(
                          "w-full h-[72px] rounded-[12px] [@media(max-height:820px)]:h-[52px]",
                          (isVerifyingOtp || isSendingOtp) && "opacity-60",
                        )}
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || isSendingOtp}
                      >
                        {isVerifyingOtp ? "Verifying..." : "Continue"}
                      </Button>

                      <div
                        className={cn(
                          SUBTITLE_CLASS,
                          " mt-[12px] flex items-center justify-center gap-1 [@media(max-height:820px)]:mt-[8px]",
                        )}
                      >
                        <span className="leading-[20px]">
                          Didn&apos;t Received an OTP?
                        </span>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={secondsLeft > 0 || isSendingOtp}
                          className={cn(
                            "font-semibold text-[color:var(--Text-Primary,#1A1A1A)]",
                            "inline-flex items-center justify-center",
                            "leading-[20px]",
                            "cursor-pointer",
                            (secondsLeft > 0 || isSendingOtp) &&
                              "cursor-not-allowed opacity-60",
                          )}
                        >
                          {isSendingOtp ? (
                            "Sending..."
                          ) : secondsLeft > 0 ? (
                            <CountdownTicker
                              seconds={secondsLeft}
                              className="leading-none -translate-y-[-2px]"
                            />
                          ) : (
                            "Resend"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <RecaptchaDisclosure />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function BrandSignupContent() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      <BrandSignupInner />
    </GoogleReCaptchaProvider>
  );
}

export default function BrandSignupPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BrandSignupContent />
    </React.Suspense>
  );
}
