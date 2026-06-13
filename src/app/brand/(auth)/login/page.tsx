"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

import { FloatingInput } from "@/components/ui/floatingInput";
import { PasswordInput } from "@/components/ui/password";
import { Button, buttonVariants } from "@/components/ui/buttonComp";
import { VggCardStack } from "@/components/ui/brand/VggAnimatedCard";

import {
  apiGoogleSignInBrand,
  apiSignInBrand,
  getApiErrorMessage,
} from "../../services/brandApi";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import { toast, ToastStyles } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { clearClientAuthStorage } from "@/lib/clearClientAuth";

type ErrorKind =
  | "EMAIL_NOT_REGISTERED"
  | "WRONG_PASSWORD"
  | "RATE_LIMIT"
  | "SERVER"
  | "UNKNOWN";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type ApiErrDetails = {
  message: string;
  code?: string;
  status?: number;
};

type OnboardingRoute =
  | "brandAlias"
  | "page1"
  | "page2"
  | "page3"
  | "campaign"
  | "homepage";

type BrandSignInResponse = {
  token: string;
  brandId: string;
  email?: string;
  brandName?: string;
  name?: string;
  profilePic?: string;
  isNewBrand?: boolean;
  route?: OnboardingRoute;
  onboarding?: {
    aliasDone?: boolean;
    page1Done?: boolean;
    page2Done?: boolean;
    page3Done?: boolean;

    // Optional skip flags, supported if backend sends them.
    ispage1Skip?: boolean;
    ispage2Skip?: boolean;
    ispage3Skip?: boolean;
    page1Skipped?: boolean;
    page2Skipped?: boolean;
    page3Skipped?: boolean;
  };
};

const BRAND_ONBOARDING_RESUME_KEY = "cg_brand_onboarding_resume_step";

function getStoredBrandResumeRoute(): OnboardingRoute | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const step = sessionStorage.getItem(BRAND_ONBOARDING_RESUME_KEY);

    if (
      step === "brandAlias" ||
      step === "page1" ||
      step === "page2" ||
      step === "page3"
    ) {
      return step;
    }
  } catch {
    // ignore
  }

  return undefined;
}

function getApiErrorDetails(
  err: any,
  fallbackMsg = "Login failed",
): ApiErrDetails {
  const data =
    err?.response?.data ?? err?.data ?? err?.cause?.data ?? undefined;

  const status =
    err?.response?.status ??
    err?.status ??
    data?.status ??
    data?.error?.status ??
    undefined;

  const code = data?.code ?? data?.error?.code ?? err?.code ?? undefined;

  const message =
    data?.message ?? data?.error?.message ?? err?.message ?? fallbackMsg;

  return {
    message: String(message || fallbackMsg),
    code: code ? String(code) : undefined,
    status: typeof status === "number" ? status : undefined,
  };
}

function prettifyRateLimitMessage(msg: string) {
  const m = (msg || "").trim();
  if (!m) return "Too many attempts. Please try again later.";

  if (/after\s*24\s*hour/i.test(m) || /24\s*hours/i.test(m)) {
    return "Too many failed login attempts. Please try again after 24 hours.";
  }

  const match = m.match(
    /try again in\s+(\d+)\s+(seconds|second|minutes|minute|hours|hour)/i,
  );

  if (match) {
    const n = match[1];
    const unitRaw = match[2].toLowerCase();
    const unit =
      unitRaw === "second"
        ? "seconds"
        : unitRaw === "minute"
          ? "minutes"
          : unitRaw === "hour"
            ? "hours"
            : unitRaw;

    return `Too many failed login attempts. Please try again in ${n} ${unit}.`;
  }

  return m;
}

function mapLoginError(d: ApiErrDetails): {
  kind: ErrorKind;
  title: string;
  text: string;
} {
  const msg = (d.message || "").toLowerCase();
  const code = (d.code || "").toUpperCase();
  const status = d.status;

  const isSigninRateLimit =
    status === 429 ||
    code === "SIGNIN_RATE_LIMIT" ||
    code === "SIGNIN_DAILY_LIMIT" ||
    msg.includes("too many failed login") ||
    msg.includes("too many") ||
    msg.includes("try again");

  if (isSigninRateLimit) {
    return {
      kind: "RATE_LIMIT",
      title: "Too many attempts",
      text: prettifyRateLimitMessage(d.message),
    };
  }

  const notRegistered =
    status === 404 ||
    msg.includes("email does not exist") ||
    msg.includes("account not found") ||
    msg.includes("please sign up") ||
    msg.includes("sign up");

  if (notRegistered) {
    return {
      kind: "EMAIL_NOT_REGISTERED",
      title: "Account not found",
      text: "This email isn’t registered yet. Please sign up to continue.",
    };
  }

  const wrongPassword =
    msg.includes("incorrect password") ||
    msg.includes("wrong password") ||
    msg.includes("invalid password");

  if (wrongPassword) {
    return {
      kind: "WRONG_PASSWORD",
      title: "Incorrect password",
      text: "The password you entered is incorrect. Please try again.",
    };
  }

  if (
    status === 401 ||
    msg.includes("unauthorized") ||
    msg.includes("invalid token") ||
    msg.includes("auth")
  ) {
    return {
      kind: "SERVER",
      title: "Login issue",
      text: "Something went wrong. Please try again.",
    };
  }

  return {
    kind: "UNKNOWN",
    title: "Login failed",
    text: d.message || "Please check your details and try again.",
  };
}

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

function persistBrandOnboardingRoute(route?: OnboardingRoute) {
  try {
    if (
      route === "brandAlias" ||
      route === "page1" ||
      route === "page2" ||
      route === "page3"
    ) {
      sessionStorage.setItem(BRAND_ONBOARDING_RESUME_KEY, route);
      return;
    }

    sessionStorage.removeItem(BRAND_ONBOARDING_RESUME_KEY);
  } catch {
    // ignore
  }
}

function routeToBrandPath(route?: OnboardingRoute) {
  switch (route) {
    case "brandAlias":
      return "/brand/onboarding?step=brandAlias";
    case "page1":
      return "/brand/onboarding?step=page1";
    case "page2":
      return "/brand/onboarding?step=page2";
    case "page3":
      return "/brand/onboarding?step=page3";
    case "homepage":
    case "campaign":
    default:
      return "/brand/dashboard";
  }
}

function isStepPending(done?: boolean, ...skipFlags: Array<boolean | undefined>) {
  if (done === true) return false;
  if (skipFlags.some((flag) => flag === true)) return false;

  return done === false;
}

function resolveBrandPostLoginRoute(
  res?: BrandSignInResponse,
): OnboardingRoute | undefined {
  const route = res?.route;

  if (
    route === "brandAlias" ||
    route === "page1" ||
    route === "page2" ||
    route === "page3"
  ) {
    return route;
  }

  const onboarding = res?.onboarding;

  if (onboarding?.aliasDone === false) return "brandAlias";

  if (
    isStepPending(
      onboarding?.page1Done,
      onboarding?.ispage1Skip,
      onboarding?.page1Skipped,
    )
  ) {
    return "page1";
  }

  if (
    isStepPending(
      onboarding?.page2Done,
      onboarding?.ispage2Skip,
      onboarding?.page2Skipped,
    )
  ) {
    return "page2";
  }

  // Profile pic is intentionally not checked here because it is optional.

  if (
    isStepPending(
      onboarding?.page3Done,
      onboarding?.ispage3Skip,
      onboarding?.page3Skipped,
    )
  ) {
    return "page3";
  }

  return route;
}

function normalizeReturnUrl(value?: string | null) {
  if (!value) return "";

  let current = String(value).trim();

  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  if (
    current.startsWith("/") &&
    !current.startsWith("//") &&
    !current.includes("://")
  ) {
    return current;
  }

  return "";
}

function RecaptchaDisclosure() {
  return (
    <p className="mt-3 text-center text-xs leading-5 text-[#969696]">
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

function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function BrandLoginContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [authGuardReady, setAuthGuardReady] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const [emailError, setEmailError] = React.useState<string>("");
  const [passwordError, setPasswordError] = React.useState<string>("");
  const emailInvalid = !!emailError;
  const passwordInvalid = !!passwordError;
  const emailTrimmed = email.trim();

  const hasActiveBrandSession = React.useCallback(() => {
    if (typeof window === "undefined") return false;

    try {
      const token = localStorage.getItem("token");
      const brandId = localStorage.getItem("brandId");
      return Boolean(token && brandId);
    } catch {
      return false;
    }
  }, []);

  const getRequestedReturnUrl = React.useCallback(() => {
    return normalizeReturnUrl(searchParams.get("returnUrl"));
  }, [searchParams]);

  const redirectAuthenticatedBrandUser = React.useCallback(() => {
    if (!hasActiveBrandSession()) return false;

    const returnUrl = getRequestedReturnUrl();

    if (returnUrl) {
      router.replace(returnUrl);
      return true;
    }

    const resumeRoute = getStoredBrandResumeRoute();
    router.replace(routeToBrandPath(resumeRoute));
    return true;
  }, [getRequestedReturnUrl, hasActiveBrandSession, router]);

  React.useEffect(() => {
    const enforceGuestOnlyAccess = () => {
      const redirected = redirectAuthenticatedBrandUser();

      if (!redirected) {
        setAuthGuardReady(true);
      }
    };

    enforceGuestOnlyAccess();

    const handlePageShow = () => {
      enforceGuestOnlyAccess();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        enforceGuestOnlyAccess();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [redirectAuthenticatedBrandUser]);

  const getCreatorLoginHref = () => {
    const returnUrl = getRequestedReturnUrl();

    if (!returnUrl) return "/influencer/login";

    return `/influencer/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  const getPostLoginRedirect = (res?: BrandSignInResponse) => {
    const returnUrl = getRequestedReturnUrl();

    if (returnUrl) {
      return returnUrl;
    }

    return routeToBrandPath(resolveBrandPostLoginRoute(res));
  };

  const clearEmailOnFocus = () => {
    if (emailError) setEmailError("");
  };

  const clearPasswordOnFocus = () => {
    if (passwordError) setPasswordError("");
  };

  const validateAndSetFieldErrors = () => {
    const e = emailTrimmed;
    const p = password.trim();

    let nextEmailError = "";
    let nextPasswordError = "";

    if (!e) nextEmailError = "Email is required.";
    else if (!emailOk(e))
      nextEmailError = "Please enter a valid email address.";

    if (!p) nextPasswordError = "Password is required.";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    return !(nextEmailError || nextPasswordError);
  };

  const persistBrandSession = async (res: BrandSignInResponse) => {
    const nextRoute = resolveBrandPostLoginRoute(res);

    localStorage.setItem("token", res.token);
    localStorage.setItem("brandId", res.brandId);

    persistBrandOnboardingRoute(nextRoute);

    await fetch("/api-1/brand-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: res.token }),
    });
  };

  const makeAliasSourceFromEmail = (emailValue?: string) => {
    const localPart = String(emailValue || "")
      .trim()
      .toLowerCase()
      .split("@")[0];

    return localPart
      .replace(/\+.*/, "")
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/[._-]{2,}/g, ".")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 40);
  };

  const onGoogleContinue = async () => {
    if (loading || googleLoading) return;

    setGoogleLoading(true);

    try {
      clearClientAuthStorage();

      const auth = getAuth(firebaseApp);
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);

      const res = (await apiGoogleSignInBrand(idToken)) as BrandSignInResponse;

      await persistBrandSession(res);

      const googleEmail = res.email || credential.user.email || "";
      const googleName = res.name || credential.user.displayName || "";
      const googlePhoto = res.profilePic || credential.user.photoURL || "";
      const aliasSource = makeAliasSourceFromEmail(googleEmail);

      localStorage.setItem(
        "brandSignupDraft",
        JSON.stringify({
          brandName: res.brandName || googleName || aliasSource || "Brand",
          pocName: googleName,
          email: googleEmail,
          aliasSource,
          profilePic: googlePhoto,
          googleProfilePic: googlePhoto,
          authProvider: "google",
        }),
      );

      router.replace(getPostLoginRedirect(res));
    } catch (err) {
      toast({
        icon: "error",
        title: "Google sign in failed",
        text: getApiErrorMessage(
          err,
          "Google sign in failed. Please try again.",
        ),
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ok = validateAndSetFieldErrors();
    if (!ok) return;

    setLoading(true);

    try {
      await runRecaptchaCheck(executeRecaptcha, "brand_login");

      clearClientAuthStorage();

      const res = (await apiSignInBrand(
        emailTrimmed,
        password,
      )) as BrandSignInResponse;

      await persistBrandSession(res);
      const loginEmail = res.email || emailTrimmed;
      const aliasSource = makeAliasSourceFromEmail(loginEmail);

      localStorage.setItem(
        "brandSignupDraft",
        JSON.stringify({
          brandName: res.brandName || aliasSource || "Brand",
          pocName: res.name || "",
          email: loginEmail,
          aliasSource,
          profilePic: res.profilePic || "",
          authProvider: "email",
        }),
      );

      router.replace(getPostLoginRedirect(res));
    } catch (err) {
      const fallback = getApiErrorMessage(err, "Login failed");
      const details = getApiErrorDetails(err, fallback);
      const mapped = mapLoginError(details);

      toast({ icon: "error", title: mapped.title, text: mapped.text });
    } finally {
      setLoading(false);
    }
  };

  if (!authGuardReady) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <ToastStyles />

      <header className="w-full bg-white border-b border-bd-primary">
        <div
          className="
            mx-auto flex flex-wrap items-center justify-between content-center
            gap-m py-[1rem]
            px-[1.25rem] md:px-[3rem] xl:px-[7.5rem] 2xl:px-[10rem]
            max-w-full
          "
        >
          <Link href="/" className="flex items-center gap-s">
            <img
              src="/logo.png"
              alt="CollabGlam Logo"
              width={40}
              height={40}
              className="object-contain"
              loading="eager"
            />
            <span className="leading-tight">
              <span className="block text-[1.25rem] font-bold text-tx-primary">
                CollabGlam
              </span>
              <span className="block text-[0.625rem] leading-[0.75rem] text-tx-tertiary -mt-[0.125rem]">
                For Brands
              </span>
            </span>
          </Link>

          <Link
            href={getCreatorLoginHref()}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "!my-0 rounded-m px-l border border-bd-primary text-tx-primary !shadow-none",
            )}
          >
            Join as a Creator
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-full flex-1 py-[1.25rem]">
        <div className="grid h-full items-stretch lg:grid-cols-2">
          <section className="order-1 lg:h-full">
            <div className="flex w-full lg:h-full lg:items-stretch pr-[1.25rem]">
              <div
                className="
                  relative w-full overflow-hidden
                  rounded-tr-[2rem] rounded-br-[2rem]
                  h-[26.25rem] sm:h-[32.5rem] md:h-[40rem]
                  lg:h-[calc(100svh-7.125rem)]
                "
                style={{
                  background:
                    "var(--Gradient-Brand-Primary-Radial, radial-gradient(100% 100% at 50% 0%, #FF8C01 0%, #FFBF00 37.94%, #FFF 90.87%))",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-[1.125rem] sm:p-[1.75rem] lg:p-[3.125rem]">
                  <VggCardStack className="w-full max-w-[35rem]" />
                </div>
              </div>
            </div>
          </section>

          <section className="order-2 flex lg:h-full lg:items-center">
            <div className="mx-auto w-full max-w-[32.5rem] px-4 sm:px-6 lg:px-8 py-8 lg:py-0">
              <h1 className="cg-heading">Login to Continue</h1>

              <p className="mt-m cg-description">
                Enter your registered details to access your dashboard and
                ongoing work.
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-[2rem] flex flex-col items-center gap-[0.5rem] self-stretch"
              >
                <button
                  type="button"
                  onClick={onGoogleContinue}
                  disabled={loading || googleLoading}
                  className={cn(
                    "flex w-full h-[4.5rem] p-0 justify-center items-center gap-[0.25rem]",
                    "rounded-[0.75rem] border border-[#E6E6E6] bg-white",
                    "text-[1rem] font-semibold text-[#1A1A1A]",
                    "hover:bg-neutral-50 active:bg-neutral-100 transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <GoogleIcon />
                  {googleLoading ? "Connecting..." : "Continue With Google"}
                </button>

                <div className="flex w-full items-center gap-3 mt-[0.5rem]">
                  <div className="h-px flex-1 bg-[#E6E6E6]" />
                  <span className="text-xs text-[#969696]">or</span>
                  <div className="h-px flex-1 bg-[#E6E6E6]" />
                </div>

                <FloatingInput
                  label="Email"
                  value={email}
                  onValueChange={(v: string) => {
                    setEmail(v);
                    if (emailError) setEmailError("");
                  }}
                  onFocus={clearEmailOnFocus}
                  icon={true}
                  size="small"
                  state={emailInvalid ? "error" : "default"}
                  errorText={emailError || undefined}
                />

                <div className="w-full">
                  <PasswordInput
                    label="Password"
                    value={password}
                    onValueChange={(v: string) => {
                      setPassword(v);
                      if (passwordError) setPasswordError("");
                    }}
                    onFocus={clearPasswordOnFocus}
                    showRules={false}
                    state={passwordInvalid ? "error" : "default"}
                    errorText={passwordError || undefined}
                  />

                  <div className="mt-m flex justify-end">
                    <Link
                      href="/brand/forgot-password"
                      className="
                        text-right font-[Inter] text-[0.75rem] font-normal leading-[1rem]
                        text-[color:var(--Active-900,#081526)] hover:opacity-80
                      "
                    >
                      Forgot Password
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="solid"
                  size="lg"
                  className="w-full rounded-m mt-[0.5rem]"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Continue"}
                </Button>

                <p className="cg-auth-helper">
                  Don’t Have an Account?{" "}
                  <Link
                    href={
                      emailTrimmed
                        ? `/brand/signup?email=${encodeURIComponent(emailTrimmed)}`
                        : "/brand/signup"
                    }
                    className="cg-auth-link hover:underline"
                  >
                    Signup
                  </Link>
                </p>

                <RecaptchaDisclosure />
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function BrandLoginContent() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      <BrandLoginContentInner />
    </GoogleReCaptchaProvider>
  );
}

export default function BrandLoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BrandLoginContent />
    </React.Suspense>
  );
}