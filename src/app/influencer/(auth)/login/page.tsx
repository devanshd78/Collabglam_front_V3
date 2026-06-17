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
import { cn } from "@/lib/utils";

import {
  apiSignInInfluencer,
  getApiErrorMessage,
} from "../../services/influencerApi";
import { toast, ToastStyles } from "@/components/ui/toast";
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

type OnboardingRoute = "page1" | "page2" | "page3" | "campaign" | "homepage";

type SignInResponse = {
  token?: unknown;
  influencerToken?: unknown;
  accessToken?: unknown;
  jwt?: unknown;

  influencerId?: unknown;
  influencer_id?: unknown;
  id?: unknown;
  _id?: unknown;

  route?: unknown;

  influencer?: {
    _id?: unknown;
    id?: unknown;
    influencerId?: unknown;
    influencer_id?: unknown;
  };

  user?: {
    _id?: unknown;
    id?: unknown;
    influencerId?: unknown;
    influencer_id?: unknown;
  };

  data?: SignInResponse;

  onboarding?: {
    page1Done?: boolean;
    page2Done?: boolean;
    page3Done?: boolean;
  };
};

type CookieOptions = {
  days?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

const ONBOARDING_RESUME_KEY = "cg_influencer_onboarding_resume_step";
const LOGIN_S3_IMAGES = [
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image1.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image2.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image3.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image5.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image6.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image7.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image8.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image9.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image10.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image11.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image12.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image13.webp",
  "https://collaglam-campaign.s3.us-east-1.amazonaws.com/image14.webp",
] as const;

function getNextLoginImageIndex(currentIndex = -1) {
  if (LOGIN_S3_IMAGES.length <= 1) return 0;

  let nextIndex = currentIndex;

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * LOGIN_S3_IMAGES.length);
  }

  return nextIndex;
}
function normalizeStoredString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleanValue = value.trim();

  if (
    !cleanValue ||
    cleanValue === "undefined" ||
    cleanValue === "null" ||
    cleanValue === "[object Object]"
  ) {
    return null;
  }

  return cleanValue;
}

function isOnboardingRoute(value: unknown): value is OnboardingRoute {
  return (
    value === "page1" ||
    value === "page2" ||
    value === "page3" ||
    value === "campaign" ||
    value === "homepage"
  );
}

function extractTokenFromSignInResponse(res?: SignInResponse): string | null {
  return (
    normalizeStoredString(res?.token) ||
    normalizeStoredString(res?.influencerToken) ||
    normalizeStoredString(res?.accessToken) ||
    normalizeStoredString(res?.jwt) ||
    normalizeStoredString(res?.data?.token) ||
    normalizeStoredString(res?.data?.influencerToken) ||
    normalizeStoredString(res?.data?.accessToken) ||
    normalizeStoredString(res?.data?.jwt)
  );
}

function extractInfluencerIdFromSignInResponse(
  res?: SignInResponse,
): string | null {
  return (
    normalizeStoredString(res?.influencerId) ||
    normalizeStoredString(res?.influencer_id) ||
    normalizeStoredString(res?.influencer?._id) ||
    normalizeStoredString(res?.influencer?.id) ||
    normalizeStoredString(res?.influencer?.influencerId) ||
    normalizeStoredString(res?.influencer?.influencer_id) ||
    normalizeStoredString(res?.user?.influencerId) ||
    normalizeStoredString(res?.user?.influencer_id) ||
    normalizeStoredString(res?.user?._id) ||
    normalizeStoredString(res?.user?.id) ||
    normalizeStoredString(res?.data?.influencerId) ||
    normalizeStoredString(res?.data?.influencer_id) ||
    normalizeStoredString(res?.data?.influencer?._id) ||
    normalizeStoredString(res?.data?.influencer?.id) ||
    normalizeStoredString(res?.data?.influencer?.influencerId) ||
    normalizeStoredString(res?.data?.influencer?.influencer_id) ||
    normalizeStoredString(res?.data?.user?.influencerId) ||
    normalizeStoredString(res?.data?.user?.influencer_id) ||
    normalizeStoredString(res?.data?.user?._id) ||
    normalizeStoredString(res?.data?.user?.id) ||
    normalizeStoredString(res?.id) ||
    normalizeStoredString(res?._id) ||
    normalizeStoredString(res?.data?.id) ||
    normalizeStoredString(res?.data?._id)
  );
}

function extractRouteFromSignInResponse(
  res?: SignInResponse,
): OnboardingRoute | undefined {
  if (isOnboardingRoute(res?.route)) return res.route;
  if (isOnboardingRoute(res?.data?.route)) return res.data.route;

  return undefined;
}

function getStoredInfluencerResumeRoute(): OnboardingRoute | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const step = sessionStorage.getItem(ONBOARDING_RESUME_KEY);

    if (step === "page1" || step === "page2" || step === "page3") {
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

function setCookie(name: string, value: string, opts: CookieOptions = {}) {
  if (typeof document === "undefined") return;

  const {
    days = 30,
    path = "/",
    sameSite = "Lax",
    secure = typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : false,
  } = opts;

  const maxAge = days * 24 * 60 * 60;

  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
    `; Max-Age=${maxAge}` +
    `; Path=${path}` +
    `; SameSite=${sameSite}` +
    (secure ? "; Secure" : "");
}

function persistOnboardingRoute(route?: OnboardingRoute) {
  try {
    if (route === "page1" || route === "page2" || route === "page3") {
      sessionStorage.setItem(ONBOARDING_RESUME_KEY, route);
      return;
    }

    sessionStorage.removeItem(ONBOARDING_RESUME_KEY);
  } catch {
    // ignore
  }
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

function routeToPath(route?: OnboardingRoute) {
  switch (route) {
    case "page1":
      return "/influencer/onboarding?step=page1";
    case "page2":
      return "/influencer/onboarding?step=page2";
    case "page3":
      return "/influencer/onboarding?step=page3";
    case "homepage":
    case "campaign":
    default:
      return "/influencer/dashboards";
  }
}

function getPostLoginRedirect(route?: OnboardingRoute) {
  if (route === "page1" || route === "page2" || route === "page3") {
    return routeToPath(route);
  }

  return "/influencer/dashboards";
}

function normalizeReturnUrl(value?: string | null) {
  if (!value) return "";

  let current = String(value || "").trim();

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

function mapDisputeReturnUrlForRole(
  returnUrl: string,
  role: "brand" | "influencer",
) {
  if (!returnUrl) return "";

  if (role === "influencer") {
    if (returnUrl === "/brand/disputes") return "/influencer/disputes";

    if (returnUrl.startsWith("/brand/disputes/")) {
      return returnUrl.replace("/brand/disputes/", "/influencer/disputes/");
    }

    return returnUrl;
  }

  if (returnUrl === "/influencer/disputes") return "/brand/disputes";

  if (returnUrl.startsWith("/influencer/disputes/")) {
    return returnUrl.replace("/influencer/disputes/", "/brand/disputes/");
  }

  return returnUrl;
}

function buildHrefWithReturnUrl(basePath: string, returnUrl: string) {
  if (!returnUrl) return basePath;
  return `${basePath}?returnUrl=${encodeURIComponent(returnUrl)}`;
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

function InfluencerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [authGuardReady, setAuthGuardReady] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loginImageIndex, setLoginImageIndex] = React.useState(0);

  const [emailError, setEmailError] = React.useState<string>("");
  const [passwordError, setPasswordError] = React.useState<string>("");

  const emailTrimmed = email.trim();
  const emailInvalid = !!emailError;
  const passwordInvalid = !!passwordError;

  const getSafeReturnUrl = React.useCallback(() => {
    const normalized = normalizeReturnUrl(searchParams.get("returnUrl"));
    return mapDisputeReturnUrlForRole(normalized, "influencer");
  }, [searchParams]);

  const hasActiveInfluencerSession = React.useCallback(() => {
    if (typeof window === "undefined") return false;

    try {
      const token = normalizeStoredString(
        localStorage.getItem("token") ||
        localStorage.getItem("influencerToken"),
      );

      const influencerId = normalizeStoredString(
        localStorage.getItem("influencerId"),
      );

      return Boolean(token && influencerId);
    } catch {
      return false;
    }
  }, []);

  const redirectAuthenticatedInfluencerUser = React.useCallback(() => {
    if (!hasActiveInfluencerSession()) return false;

    const safeReturnUrl = getSafeReturnUrl();

    if (safeReturnUrl) {
      router.replace(safeReturnUrl);
      return true;
    }

    const resumeRoute = getStoredInfluencerResumeRoute();
    router.replace(routeToPath(resumeRoute));
    return true;
  }, [getSafeReturnUrl, hasActiveInfluencerSession, router]);

  React.useEffect(() => {
    const redirected = redirectAuthenticatedInfluencerUser();

    if (!redirected) {
      setAuthGuardReady(true);
    }
  }, [redirectAuthenticatedInfluencerUser]);

  React.useEffect(() => {
    setLoginImageIndex(() => getNextLoginImageIndex());
  }, []);

  React.useEffect(() => {
    if (!loading) return;

    setLoginImageIndex((currentIndex) => getNextLoginImageIndex(currentIndex));
  }, [loading]);

  React.useEffect(() => {
    const handleTabVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      setLoginImageIndex((currentIndex) => getNextLoginImageIndex(currentIndex));
    };

    document.addEventListener("visibilitychange", handleTabVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleTabVisibilityChange,
      );
    };
  }, []);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ok = validateAndSetFieldErrors();
    if (!ok) return;

    setLoading(true);

    try {
      await runRecaptchaCheck(executeRecaptcha, "influencer_login");

      clearClientAuthStorage();

      const res = (await apiSignInInfluencer(
        emailTrimmed,
        password,
      )) as SignInResponse;

      const token = extractTokenFromSignInResponse(res);
      const influencerId = extractInfluencerIdFromSignInResponse(res);
      const route = extractRouteFromSignInResponse(res);

      if (!token || !influencerId) {
        console.error("Influencer login response missing data:", res);

        throw new Error(
          "Login succeeded, but influencer session data was missing. Please check the login API response.",
        );
      }

      setCookie("token", token, { days: 30 });
      setCookie("influencerId", influencerId, { days: 30 });

      localStorage.setItem("token", token);
      localStorage.setItem("influencerToken", token);
      localStorage.setItem("influencerId", influencerId);

      persistOnboardingRoute(route);

      await fetch("/api-1/influencer-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const safeReturnUrl = getSafeReturnUrl();
      const redirectPath = safeReturnUrl || getPostLoginRedirect(route);

      router.replace(redirectPath);
    } catch (err) {
      const fallback = getApiErrorMessage(err, "Login failed");
      const details = getApiErrorDetails(err, fallback);
      const mapped = mapLoginError(details);

      toast({
        icon: "error",
        title: mapped.title,
        text: mapped.text,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authGuardReady) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  const safeReturnUrl = getSafeReturnUrl();
  const brandReturnUrl = mapDisputeReturnUrlForRole(safeReturnUrl, "brand");

  const brandLoginHref = buildHrefWithReturnUrl("/brand/login", brandReturnUrl);
  const influencerSignupHref = buildHrefWithReturnUrl(
    "/influencer/signup",
    safeReturnUrl,
  );
  const loginHeroImage =
    LOGIN_S3_IMAGES[loginImageIndex] || LOGIN_S3_IMAGES[0];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastStyles />

      <header className="w-full bg-white border-b border-bd-primary">
        <div
          className="
            mx-auto flex flex-wrap items-center justify-between content-center
            gap-m py-[16px]
            px-[20px] md:px-[48px] xl:px-[120px] 2xl:px-[160px]
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
              <span className="block text-[20px] font-bold text-tx-primary">
                CollabGlam
              </span>
              <span className="block text-[10px] leading-[12px] text-tx-tertiary -mt-[2px]">
                For Creators
              </span>
            </span>
          </Link>

          <Link
            href={brandLoginHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "!my-0 rounded-m px-l border border-bd-primary text-tx-primary !shadow-none",
            )}
          >
            Join as a Brand
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-full flex-1 py-[20px] ">
        <div className="grid h-full items-stretch gap-[40px] lg:grid-cols-2">
          <section className="order-1 lg:order-1 lg:h-full">
            <div className="flex w-full pr-[20px] lg:h-full lg:items-stretch">
              <div
                className="
                  relative w-full overflow-hidden
                  rounded-tr-2xl rounded-br-2xl
                  h-[380px] sm:h-[460px] md:h-[640px]
                  lg:h-[calc(100svh-114px)]
                "
                style={{ isolation: "isolate" }}
              >
                <div className="absolute inset-0 bg-brand-500" />

                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background: `lightgray url(${loginHeroImage}) 50% / cover no-repeat`,
                    mixBlendMode: "luminosity",
                  }}
                />

                <div className="absolute z-[2] left-0 right-0 bottom-0 flex justify-center">
                  <div className="relative w-full h-[150px] flex items-center justify-center px-[50px] overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        maskImage:
                          "linear-gradient(to top, black 0%, transparent 100%)",
                        WebkitMaskImage:
                          "linear-gradient(to top, black 0%, transparent 100%)",
                      }}
                    />
                    <p className="relative text-center text-white font-semibold text-[24px] leading-[32px] z-10">
                      "Your influence has a voice, Let&apos;s amplify it."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 xl:order-2 flex lg:h-full lg:items-center">
            <div className="mx-auto w-full max-w-[520px] px-4 sm:px-6 lg:px-8 py-8 lg:py-0">
              <h1 className="cg-heading">Welcome Back</h1>

              <p className="mt-m cg-description">
                Enter your email and password so we can take you back to your
                dashboard and ongoing work.
              </p>

              <form onSubmit={onSubmit} className="space-y-m mt-2xl">
                <FloatingInput
                  label="Email"
                  type="email"
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
                  disabled={loading}
                />

                <div>
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
                    disabled={loading}
                  />

                  <div className="mt-m flex justify-end">
                    <Link
                      href="/influencer/forgot-password"
                      className="
                        text-right font-[Inter] text-[12px] font-normal leading-[16px]
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
                  className="w-full rounded-m mt-xl"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Continue"}
                </Button>

                <p className="cg-auth-helper">
                  Don’t Have an Account?{" "}
                  <Link
                    href={influencerSignupHref}
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

export default function InfluencerLoginPage() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-background text-foreground" />
        }
      >
        <InfluencerLoginContent />
      </React.Suspense>
    </GoogleReCaptchaProvider>
  );
}
