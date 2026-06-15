// services/brandApi.ts
import axios from "axios";
import * as Api from "@/lib/api";
import { post as libPost, patch as libPatch } from "@/lib/api";

const BRAND_BASE = "/brand";
const INFLUENCER_BASE = "/influencer";
const LIST_BASE = "/list";
const CAMPAIGN_BASE = "/campaign";
const WALLET_BASE = "/wallet";
const INVITATION_BASE = "/invitation";
const APPLY_BASE = "/apply-campaign";
const MILESTONE_BASE = "/milestone";
const CAMPAIGN_INVITATION_BASE = "/campaign-invitation";
const Apply_Base = "/apply";
const CONTRACT_BASE = "/contract";
const DISPUTE_BASE = "/dispute";
const BRAND_FOLDER_BASE = `${BRAND_BASE}/folder`;
const NEW_INVITATIONS_BASE = "/newinvitations";
/** -------------------------
 *  ✅ Response Unwrap Helpers
 *  ------------------------*/
export type ApiEnvelope<T> =
  | T
  | { data?: T; result?: T; message?: string }
  | { success?: boolean; data?: T; message?: string };

export function unwrap<T>(res: ApiEnvelope<T>): T {
  let x: any = res as any;

  // axios Response -> take .data
  if (
    x &&
    typeof x === "object" &&
    "data" in x &&
    (("status" in x && "headers" in x) || "config" in x)
  ) {
    x = x.data;
  }

  // common wrappers
  if (x && typeof x === "object" && x.result !== undefined) x = x.result;
  if (x && typeof x === "object" && "success" in x && x.data !== undefined) x = x.data;
  if (x && typeof x === "object" && x.data !== undefined) x = x.data;

  return x as T;
}

function unwrapPrefillDoc<TDoc = any>(res: any): TDoc {
  const x = unwrap<any>(res);
  return (x?.prefill ?? x) as TDoc;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    return (
      data?.message ||
      data?.error?.message ||
      data?.error ||
      data?.errors?.[0]?.message ||
      err.response?.statusText ||
      err.message ||
      fallback
    );
  }

  if (err && typeof err === "object") {
    const anyErr: any = err;
    return anyErr?.message || anyErr?.error?.message || fallback;
  }

  if (typeof err === "string") return err;
  return fallback;
}

/** -------------------------
 *  ✅ Request Core (GET/POST only)
 *  ------------------------*/
type HttpMethod = "GET" | "POST" | "PATCH";
type AnyObj = Record<string, any>;

type RequestConfig = {
  params?: AnyObj;
  headers?: AnyObj;
  signal?: AbortSignal;
  [key: string]: any;
};

function resolveClient(): any {
  const mod: any = Api as any;
  return mod?.default ?? mod;
}

function cleanParams(params?: AnyObj) {
  if (!params) return undefined;
  const out: AnyObj = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function apiRequest<T>(
  method: HttpMethod,
  url: string,
  options: { data?: any; params?: AnyObj; config?: RequestConfig } = {}
): Promise<T> {
  const client = resolveClient();
  const params = cleanParams(options.params);
  const config = options.config ?? {};

  if (typeof client?.request === "function") {
    const res = await client.request({
      method,
      url,
      params,
      data: options.data,
      ...config,
    });
    return unwrap<T>(res as any);
  }

  const methodFn = client?.[method.toLowerCase()];
  if (typeof methodFn === "function") {
    if (method === "GET") {
      const res = await methodFn(url, { params, ...config });
      return unwrap<T>(res as any);
    } else {
      const res = await methodFn(url, options.data, { params, ...config });
      return unwrap<T>(res as any);
    }
  }

  throw new Error("No compatible API client found in @/lib/api (expected request/get/post methods).");
}

async function apiGet<T>(path: string, params?: AnyObj, config?: RequestConfig) {
  return apiRequest<T>("GET", path, { params, config });
}

async function apiPost<T>(path: string, body?: any, config?: RequestConfig) {
  // Prefer your existing lib post() if present
  if (typeof libPost === "function") {
    const res = await (libPost as any)(path, body, config);
    return unwrap<T>(res as any);
  }
  return apiRequest<T>("POST", path, { data: body, config });
}

async function apiPatch<T>(path: string, body?: any, config?: RequestConfig) {
  // Prefer your existing lib patch() if present
  if (typeof libPatch === "function") {
    const res = await (libPatch as any)(path, body, config);
    return unwrap<T>(res as any);
  }
  return apiRequest<T>("PATCH", path, { data: body, config });
}


/** -------------------------
 *  ✅ AUTH + SIGNUP
 *  ------------------------*/
export type BrandOnboardingRoute =
  | "brandAlias"
  | "page1"
  | "page2"
  | "page3"
  | "campaign"
  | "homepage";

export type BrandAuthResponse = {
  message: string;
  brandId: string;
  token: string;

  email?: string;
  brandName?: string;
  name?: string;

  isNewBrand?: boolean;
  route?: BrandOnboardingRoute;

  onboarding?: {
    page1Done?: boolean;
    page2Done?: boolean;
    page3Done?: boolean;
  };

  page1?: any[];
  page2?: any[];
  page3?: any[];

  ispage1Skip?: boolean;
  ispage2Skip?: boolean;
  ispage3Skip?: boolean;
  isProfilePicSkip?: boolean;
};

export async function apiSendSignupOtp(input: {
  brandName: string;
  name: string;
  email: string;
  companySize: string;
  industry: string;
  password: string;
}) {
  return apiPost<{ message: string; email: string }>(
    `${BRAND_BASE}/send-otp-signup`,
    input
  );
}

export async function apiVerifyOtpSignup(input: { email: string; otp: string }) {
  return apiPost<BrandAuthResponse>(
    `${BRAND_BASE}/verify-otp-signup`,
    input
  );
}

export async function apiSignInBrand(email: string, password: string) {
  return apiPost<BrandAuthResponse>(`${BRAND_BASE}/signin`, {
    email,
    password,
  });
}

export async function apiGoogleSignInBrand(idToken: string) {
  const cleanedToken = String(idToken || "").trim();

  if (!cleanedToken) {
    throw new Error("Firebase idToken is required.");
  }

  return apiPost<BrandAuthResponse>(`${BRAND_BASE}/google-auth`, {
    idToken: cleanedToken,
  });
}


/** -------------------------
 *  ✅ ONBOARDING
 *  ------------------------*/
export type QA = { question: string; answers: string[] };

export async function apiSaveBrandOnboarding(payload: {
  page1?: QA[];
  page2?: QA[];
  page3?: QA[];
  ispage1Skip?: boolean;
  ispage2Skip?: boolean;
  ispage3Skip?: boolean;
  proxyEmail?: string;
  profilePic?: string;
  isProfilePicSkip?: boolean;
}) {
  return apiPost<{ message: string; brandId: string }>(`${BRAND_BASE}/save-brand-onboarding`, payload);
}

/** -------------------------
 *  ✅ FORGOT PASSWORD
 *  ------------------------*/
export async function apiSendOtpForgot(email: string) {
  return apiPost<{ message: string; email: string }>(`${BRAND_BASE}/send-otp-forgot`, { email });
}

export async function apiVerifyOtpForgot(email: string, otp: string) {
  return apiPost<{ message: string; resetToken: string }>(`${BRAND_BASE}/verify-otp-forgot`, {
    email,
    otp,
  });
}

export async function apiUpdatePasswordWithResetToken(resetToken: string, newPassword: string) {
  return apiPost<{ message: string }>(
    `${BRAND_BASE}/update-password`,
    { newPassword },
    { headers: { Authorization: `Bearer ${resetToken}` } }
  );
}

/** -------------------------
 *  ✅ LIST APIs (BASE: /list)
 *  ------------------------*/
export type ListQuery = { limit?: number; search?: string };

export type CountryRow = {
  _id?: string;
  id?: string;
  countryNameEn?: string;
  flag?: string;
  countryCode?: string;
  iso2?: string;
  iso3?: string;
  timeZone?: string;
  timezone?: string;
  timezones?: string[];
};

export type TierRow = { _id?: string; category?: string; value?: any; sortOrder?: number };
export type HashtagRow = { _id?: string; tag?: string };
export type GoalRow = { _id?: string; goal?: string };
export type AgeRow = { _id?: string; range?: string };
export type FormatRow = { _id?: string; format?: string };
export type LangRow = { _id?: string; code?: string; name?: string };

export async function apiListCountries(params: ListQuery = {}) {
  return apiGet<CountryRow[]>(`${LIST_BASE}/countries`, params);
}
export async function apiListInfluencerTiers(params: ListQuery = {}) {
  return apiGet<TierRow[]>(`${LIST_BASE}/influencer-tiers`, params);
}
export async function apiListPreferredHashtags(params: ListQuery = {}) {
  return apiGet<HashtagRow[]>(`${LIST_BASE}/preferred-hashtags`, params);
}
export async function apiListProductServiceGoals(params: ListQuery = {}) {
  return apiGet<GoalRow[]>(`${LIST_BASE}/product-service-goals`, params);
}
export async function apiListAgeRanges(params: ListQuery = {}) {
  return apiGet<AgeRow[]>(`${LIST_BASE}/age-ranges`, params);
}
export async function apiListContentFormats(params: ListQuery = {}) {
  return apiGet<FormatRow[]>(`${LIST_BASE}/content-formats`, params);
}
export async function apiListContentLanguages(params: ListQuery = {}) {
  return apiGet<LangRow[]>(`${LIST_BASE}/content-languages`, params);
}


/** -------------------------
 *  ✅ CATEGORY APIs
 *  ------------------------*/
export type CategoryDoc = {
  _id: string;
  name: string;
  subcategories?: Array<{ _id: string; name: string; tags?: any[] }>;
};

export type SubcategoryRow = {
  _id: string;
  name: string;
  tags?: any[];
  categoryId: string;
  categoryName: string;
};

export async function apiGetCategories(search?: string) {
  return apiGet<CategoryDoc[]>(`${CAMPAIGN_BASE}/category`, { search });
}

export async function apiGetSubcategories(params: { categoryId?: string; search?: string }) {
  return apiGet<SubcategoryRow[]>(`${CAMPAIGN_BASE}/subcategory`, params);
}

export type CategorySearchRow = {
  category: { id: string; name: string };
  subcategory: { id: string; name: string } | null;
};

export async function apiSearchCategories(input: { search: string; page?: number; limit?: number }) {
  const search = input.search ?? "";
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;

  const cats = await apiGet<CategoryDoc[]>(`${CAMPAIGN_BASE}/category`, { search });
  const subs = await apiGet<SubcategoryRow[]>(`${CAMPAIGN_BASE}/subcategory`, { search });

  const rows: CategorySearchRow[] = [
    ...cats.map((c) => ({
      category: { id: String(c._id), name: String(c.name ?? "") },
      subcategory: null,
    })),
    ...subs.map((s) => ({
      category: { id: String(s.categoryId), name: String(s.categoryName ?? "") },
      subcategory: { id: String(s._id), name: String(s.name ?? "") },
    })),
  ];

  const seen = new Set<string>();
  const uniq = rows.filter((r) => {
    const key = `${r.category.id}::${r.subcategory?.id ?? "null"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const start = (page - 1) * limit;
  return uniq.slice(start, start + limit);
}

export async function apiGetSubcategoriesByCategoryId(categoryId: string) {
  const subs = await apiGet<SubcategoryRow[]>(`${CAMPAIGN_BASE}/subcategory`, { categoryId });
  return {
    categoryId,
    categoryName: subs?.[0]?.categoryName ?? "",
    subcategories: subs.map((s) => ({ _id: s._id, name: s.name, tags: s.tags ?? [] })),
  };
}

/** ✅ CATEGORY GET-ALL (your custom endpoint) */
export async function apiGetAllCategories() {
  return apiGet<CategoryDoc[]>(`/category/categories`);
}

/** -------------------------
 *  ✅ CAMPAIGN APIs
 *  ------------------------*/
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "archived";

/** Your controller returns enriched docs; keep it flexible */
export type EnrichedCampaignDoc = any;

/** ✅ Dashboard/List Summary Row (NEW) */
export type TimeMeta = {
  unit: "minutes" | "hours" | "days" | "expired" | null;
  value: number | null;
  text: string | null;
};

export type CampaignRowSummary = {
  campaignId: string;
  campaignTitle: string;
  status: CampaignStatus;

  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  startAt: string | null;
  endAt: string | null;

  category: { id: string; name: string } | null;

  numberOfInfluencers: number | null;
  campaignBudget: number;

  contractsCount: number;
  acceptedContracts: number;
  assignedContracts: number;

  startIn: TimeMeta;
  expireIn: TimeMeta;

  productImages: any[];

  byAi: 0 | 1;
  isActive: 0 | 1;
  isDraft: 0 | 1;
};


export type CreateCampaignManualPayload = {
  brandId: string;

  campaignTitle?: string;
  description?: string;
  campaignType?: string;

  categoryId?: string;
  subcategoryIds?: string[] | string;

  productImages?: any[];
  productLink?: string;

  campaignGoals?: string[] | string;
  influencerTierIds?: string[] | string;
  contentFormats?: string[] | string;
  contentLanguageIds?: string[] | string;

  targetCountryIds?: string[] | string;
  targetAgeRanges?: string[] | string;
  preferredHashtags?: string[] | string;

  minFollowers?: number;
  maxFollowers?: number;

  numberOfInfluencers?: number;

  campaignBudget?: number;
  paymentType?: string;

  additionalNotes?: string;

  scheduledAt?: string;
  startAt?: string;
  endAt?: string;
  campaignTimezone?: string;
  timezone?: string;
  tz?: string;
  status?: CampaignStatus;
};

export async function apiCampaignCreate(payload: CreateCampaignManualPayload) {
  const res = await apiPost<any>(`${CAMPAIGN_BASE}/create`, payload);
  return (res?.doc ?? res) as EnrichedCampaignDoc;
}

/** -------- AI Prefill -------- */
export type PrefillCampaignAIPayload = {
  brandId: string;

  description: string;
  campaignPrompt?: string;

  productLink?: string;
  productImages?: Array<
    | string
    | {
      dataUrl?: string;
      url?: string;
      imageUrl?: string;
      s3Url?: string;
      location?: string;
      Location?: string;
      secure_url?: string;
      src?: string;
      path?: string;
      name?: string;
      type?: string;
      contentType?: string;
      originalSize?: number;
      size?: number;
      key?: string;
    }
  >;

  saveDraft?: boolean;
  campaignTimezone?: string;
  timezone?: string;
  tz?: string;
};

export async function apiCampaignPrefillAI(payload: PrefillCampaignAIPayload) {
  const finalPayload = {
    ...payload,
    saveDraft: payload.saveDraft ?? false,
  };

  const res = await apiPost<any>(`${CAMPAIGN_BASE}/create-ai`, finalPayload);

  const x = unwrap<any>(res);

  const prefill = x?.prefill ?? x?.data?.prefill ?? x;
  const prefillDetails =
    x?.prefillDetails ??
    x?.data?.prefillDetails ??
    x?.details ??
    prefill?.details ??
    null;

  const savedDraft = x?.savedDraft ?? x?.data?.savedDraft ?? null;

  return {
    ...prefill,

    // keep these because CreateByAIScreen currently reads res.prefill / res.prefillDetails
    prefill,
    prefillDetails,

    categoryName: prefill?.categoryName ?? prefillDetails?.category?.name ?? "",
    details: prefillDetails,
    savedDraft,
  } as EnrichedCampaignDoc;
}

export async function apiCampaignCreateAI(payload: PrefillCampaignAIPayload) {
  return apiCampaignPrefillAI(payload);
}

/** -------- List / Get -------- */
export type ListCampaignsPayload = {
  brandId: string;

  page?: number;
  limit?: number;
  search?: string;

  status?: CampaignStatus;
  byAi?: 0 | 1;

  campaignType?: string;

  categoryId?: string;
  categoryIds?: string[];

  subcategoryId?: string;
  subcategoryIds?: string[];

  dateField?: "createdAt" | "updatedAt" | "startAt" | "endAt" | "publishedAt";
  datePreset?:
  | "today"
  | "last7days"
  | "last30days"
  | "thisweek"
  | "thismonth"
  | "launchingSoon";

  dateFrom?: string;
  dateTo?: string;

  sortBy?:
  | "createdAt"
  | "updatedAt"
  | "startAt"
  | "endAt"
  | "publishedAt"
  | "campaignTitle"
  | "campaignBudget"
  | "numberOfInfluencers"
  | "status";

  sortOrder?: "asc" | "desc";
};


export async function apiCampaignGetDrafts(payload: ListCampaignsPayload) {
  return apiPost<{ items: EnrichedCampaignDoc[]; meta: any }>(`${CAMPAIGN_BASE}/get-drafts`, payload);
}

export async function apiCampaignGetByBrand(payload: ListCampaignsPayload) {
  return apiPost<{ items: CampaignRowSummary[]; meta: any }>(
    `${CAMPAIGN_BASE}/get-by-brand`,
    payload
  );
}

export async function apiCampaignGetById(payload: { campaignId: string; brandId?: string }) {
  return apiPost<EnrichedCampaignDoc>(`${CAMPAIGN_BASE}/get-by-id`, payload);
}

export async function apiCampaignGetById2(campaignId: string) {
  return apiGet<EnrichedCampaignDoc>(
    `${CAMPAIGN_BASE}/get-by-id/${encodeURIComponent(campaignId)}`
  );
}

export type EditDraftPayload = {
  brandId: string;
  campaignId: string;

  campaignTitle?: string;
  description?: string;
  campaignType?: string;

  categoryId?: string;
  subcategoryIds?: string[] | string;

  productImages?: any[];
  productLink?: string;

  campaignGoals?: string[] | string;
  influencerTierIds?: string[] | string;
  contentFormats?: string[] | string;
  contentLanguageIds?: string[] | string;

  targetCountryIds?: string[] | string;
  targetAgeRanges?: string[] | string;
  preferredHashtags?: string[] | string;

  numberOfInfluencers?: number;

  campaignBudget?: number;
  paymentType?: string;

  additionalNotes?: string;
  scheduledAt?: string;
  startAt?: string;
  endAt?: string;
  campaignTimezone?: string;
  timezone?: string;
  tz?: string;

  status?: CampaignStatus;
};
export async function apiCampaignEditDraft(payload: EditDraftPayload) {
  return apiPost<EnrichedCampaignDoc>(`${CAMPAIGN_BASE}/edit-draft`, payload);
}

export type EditActivePayload = {
  brandId: string;
  campaignId: string;

  campaignTitle?: string;
  description?: string;
  campaignType?: string;

  categoryId?: string;
  subcategoryIds?: string[] | string;

  productImages?: any[];

  campaignGoals?: string[] | string;
  influencerTierIds?: string[] | string;
  contentFormats?: string[] | string;

  paymentType?: string;
  campaignBudget?: number;

  startAt?: string;
  endAt?: string;

  targetCountryIds?: string[] | string;
  targetAgeRanges?: string[] | string;

  numberOfInfluencers?: number;
};

export async function apiCampaignEditActive(payload: EditActivePayload) {
  return apiPost<EnrichedCampaignDoc>(`${CAMPAIGN_BASE}/active/edit`, payload);
}

/** -------- Actions -------- */
export async function apiCampaignPause(payload: { campaignId: string; brandId?: string }) {
  return apiPost<EnrichedCampaignDoc>(`${CAMPAIGN_BASE}/pause`, payload);
}

export type DeleteCampaignByCampaignIdResponse = {
  message: string;
  deleted: {
    campaignId: string;
    campaignTitle: string;
    status: string;
    hadContracts: boolean;
  };
};

export async function apiCampaignDelete(payload: { brandId: string; campaignId: string }) {
  return apiPost<DeleteCampaignByCampaignIdResponse>(`${CAMPAIGN_BASE}/delete`, payload);
}

/** -------------------------
 *  ✅ TIMEZONE API
 *  ------------------------*/
export type GetTimezonesByCountriesPayload = {
  targetCountryIds?: string[] | string;
  targetCountryCodes?: string[] | string;
  current?: {
    ip?: string;
    countryCode?: string;
    countryName?: string;
    timezone?: string;
  };
};

export type TimezoneItem = {
  timezone: string;
  isValid: boolean;
  nowLocal: string | null;
  offsetMinutes: number | null;
  offsetMinutesFromCurrent: number | null;
};

export type TimezonesTargetCountry = {
  id: string;
  countryCode?: string;
  countryNameEn?: string;
  countryNameLocal?: string;
  region?: string;
  flag?: string;
  timezones: TimezoneItem[];
};
export type TimezoneTarget = {
  id: string;
  countryCode: string;
  countryName: string;
  callingCode?: string;
  flag?: string;
  timezones: Array<{
    timezone: string;
    isValid?: boolean;
    nowLocal?: string;
    offsetMinutes?: number;
    offsetMinutesFromCurrent?: number;
  }>;
  timezoneMeta?: {
    selected?: string;
    selectedBy?: string;
    availableCount?: number;
  };
};

export type GetTimezonesByCountriesResponse = {
  success: boolean;
  data: {
    current: {
      timezone: string;
      nowLocal: string;
      nowUtc: string;
    };
    targets: TimezoneTarget[];
    meta?: {
      requested?: {
        ids?: number;
        codes?: number;
      };
      resolved?: {
        countries?: number;
      };
      invalid?: {
        countryIds?: string[];
        countryCodes?: string[];
      };
    };
  };
  requestId?: string;
};

export async function apiGetTimezonesByCountries(payload: GetTimezonesByCountriesPayload) {
  return apiPost<GetTimezonesByCountriesResponse>(`/timezone/by-countries`, payload);
}

export type ViewCampaignByBrandPayload = {
  brandId: string;
  campaignId: string;
};

export async function apiCampaignViewByBrand(payload: ViewCampaignByBrandPayload) {
  const res = await apiPost<{ doc: any }>(`${CAMPAIGN_BASE}/view-campaign-brand`, payload);
  return (res?.doc ?? res) as EnrichedCampaignDoc;
}

/** -------------------------
 *  ✅ WALLET APIs
 *  ------------------------*/
export type WalletFreezeRow = {
  brandId: string;
  campaignId: string;
  influencerId?: string;
  freezeAmount: number;
};

export type RecommendedInfluencerRow = {
  influencerId: string;
  name: string;
};

export type RecommendedInfluencersResponse = {
  items: RecommendedInfluencerRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function apiCampaignRecommendedInfluencers(payload: {
  brandId: string;
  campaignId: string;
  page?: number;
  limit?: number;
}) {
  return apiPost<RecommendedInfluencersResponse>(`${CAMPAIGN_BASE}/recommended-influencers`, {
    brandId: payload.brandId,
    campaignId: payload.campaignId,
    page: payload.page ?? 1,
    limit: payload.limit ?? 20,
  });
}

export type UpdateCampaignStatusPayload = {
  brandId: string;
  campaignId: string;
  status: "draft" | "scheduled" | "active" | "paused" | "completed" | "archived";
};

export type UpdateCampaignStatusResponse = {
  message: string;
};

export async function apiCampaignUpdateStatus(payload: UpdateCampaignStatusPayload) {
  return apiPost<UpdateCampaignStatusResponse>(`${CAMPAIGN_BASE}/update-status`, payload);
}

export type InviteInfluencerPayload = {
  brandId: string;
  campaignId: string;
  influencerId: string;
  modashId?: string;
};

export type InviteInfluencerResponse = {
  message: string;
  doc: any;
};

export async function apiCampaignInviteInfluencer(payload: InviteInfluencerPayload) {
  return apiPost<InviteInfluencerResponse>(`${CAMPAIGN_BASE}/invite`, payload);
}

export type InvitedInfluencerRow = {
  inviteId: string;
  status: "invited" | "accepted" | "declined" | "cancelled";
  invitedAt: string | null;
  modashId: string | null;
  influencer: any | null;
};

export type GetInvitationListByCampaignPayload = {
  brandId: string;
  campaignId: string;
  page?: number;
  limit?: number;
};

export type GetInvitationListByCampaignResponse = {
  items: InvitedInfluencerRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function apiGetInvitationListByCampaign(payload: GetInvitationListByCampaignPayload) {
  return apiPost<GetInvitationListByCampaignResponse>(`${INVITATION_BASE}/list`, {
    brandId: payload.brandId,
    campaignId: payload.campaignId,
    page: payload.page ?? 1,
    limit: payload.limit ?? 20,
  });
}

export type ApplicantStatus = "applied" | "shortlisted" | "undecided" | "active" | "rejected";

export type ApplyCampaignPayload = {
  influencerId: string;
  campaignId: string;
};

export type ApplyCampaignResponse = {
  message: string;
  campaignId: string;
  campaignTitle: string;
  totalApplicants: number;
  contractsDone: number;
  numberOfInfluencers: number;
};

export async function apiApplyToCampaign(payload: ApplyCampaignPayload) {
  return apiPost<ApplyCampaignResponse>(`${APPLY_BASE}/apply`, payload);
}

export type GetApplicantsByCampaignPayload = {
  campaignId: string;
  status?: ApplicantStatus;
};

export type ApplicantRow = {
  influencerId: string;
  influencerName: string;
  appliedAt: string;

  status?: ApplicantStatus;
  statusUpdatedAt?: string;
};

export type GetApplicantsByCampaignResponse = {
  campaignId: string;
  campaignTitle: string;
  status: ApplicantStatus | null;
  applicants: ApplicantRow[];
  totalApplicants: number;
};

export async function apiGetApplicantsByCampaign(payload: GetApplicantsByCampaignPayload) {
  return apiPost<GetApplicantsByCampaignResponse>(`${APPLY_BASE}/applicants`, payload);
}

export type UpdateApplicantStatusPayload = {
  campaignId: string;
  influencerId: string;
  status: ApplicantStatus;
};

export type UpdateApplicantStatusResponse = {
  message: string;
  campaignId: string;
  influencerId: string;
  status: ApplicantStatus;
};

export async function apiUpdateApplicantStatus(payload: UpdateApplicantStatusPayload) {
  return apiPost<UpdateApplicantStatusResponse>(`${APPLY_BASE}/status/update`, payload);
}

export type GetCampaignForEditPayload = ViewCampaignByBrandPayload;

export type UpdateCampaignManualPayload = EditDraftPayload & {
  productImages?: any[];
};

export async function apiCampaignUpdateManual(payload: UpdateCampaignManualPayload) {
  const res = await apiPost<any>(`${CAMPAIGN_BASE}/update-manual`, payload);
  return (res?.doc ?? res?.data ?? res) as EnrichedCampaignDoc;
}

/** -------------------------
 *  ✅ MILESTONE APIs
 *  ------------------------*/
export type MilestoneDeliverableLink = {
  linkId?: string;
  label?: string;
  url: string;
};

export type MilestoneRevision = {
  revisionId: string;
  deliverableId: string;
  issueName: string;
  revisionType: "free" | "paid";
  revisionBudget: number;
  deliveryName: string;
  issueDeliverableLink: string;
  notes?: string;
  attachments?: any[];
  submissionDate?: string | null;
  status: "pending" | "submitted" | "approved" | "revision" | string;

  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedRole?: string;
  approvalId?: string;
  comments?: string;

  raisedByRole?: "Brand" | "Influencer" | "Admin" | string;
  raisedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateMilestoneDeliverablePayload = {
  deliverableName: string;
  deliveries: string[];
  aspectRatio?: string;
  quantity: number;
};

export type CreateMilestoneAttachmentPayload = {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  key?: string;
};

export type CreateMilestonePayload = {
  brandId: string;
  influencerId: string;
  campaignId: string;

  // Optional because admin-created milestones do not use contract.
  contractId?: string;

  // Admin-created milestone fields
  adminId?: string;
  source?: "brand" | "admin";
  createdByRole?: "brand" | "admin";
  createdByModel?: "Brand" | "Master" | "Admin";
  campaignName?: string;

  milestoneTitle: string;
  milestoneBudget: number;

  // kept for backward compatibility because backend release logic uses amount
  amount?: number;

  milestoneDescription?: string;

  attachments?: CreateMilestoneAttachmentPayload[] | any[];
  productImages?: CreateMilestoneAttachmentPayload[] | any[];
  references?: CreateMilestoneAttachmentPayload[] | any[];

  deliverables: CreateMilestoneDeliverablePayload[];
  submissionLink?: string;

  startDate?: string;
  endDate?: string;
  graceDays?: number;

  needDraftFirst?: boolean;
  draftDate?: string;
};

export type CreateMilestoneResponse = {
  message: string;
  milestoneId: string;
  milestoneHistoryId?: string;
  totalAmount: number;

  campaignName?: string;
  source?: "brand" | "admin";
  createdByRole?: "brand" | "admin";
  adminId?: string;

  influencerBudget?: number | null;
  usedInfluencerBudget?: number | null;
  remainingInfluencerBudget?: number | null;

  entry: {
    milestoneHistoryId: string;
    influencerId: string;
    campaignId: string;
    contractId?: string;

    adminId?: string;
    createdByRole?: "brand" | "admin";
    createdByModel?: "Brand" | "Master" | "Admin";

    milestoneTitle: string;
    milestoneDescription: string;

    milestoneBudget?: number;
    amount: number;

    attachments?: any[];
    deliverables?: Array<{
      deliverableId: string;
      deliverableName: string;
      deliveries: string[];
      aspectRatio?: string;
      quantity: number;
      deliverableLinks?: MilestoneDeliverableLink[];
      submittedAt?: string | null;
      status?: "pending" | "submitted" | "approved" | "revision" | string;
      revisions?: MilestoneRevision[];
    }>;

    startDate?: string | null;
    endDate?: string | null;
    graceDays?: number;
    submissionLink?: string;
    needDraftFirst?: boolean;
    draftDate?: string | null;

    released: boolean;
    payoutStatus: "pending" | "initiated" | "paid";
    createdAt: string;
  };

  wallet: {
    walletBalance: number;
    frozenBalance: number;
  };

  campaignWallet?: {
    campaignId: string;
    totalFrozenAmount: number;
    currentFrozenAmount: number;
    totalAllocatedAmount: number;
    totalReleasedAmount: number;
    availableToAllocate: number;
    influencerAllocations: any[];
  };

  contractStatus: string | null;
  milestonesCreatedAt: string | null;
};

export async function apiCreateMilestone(payload: CreateMilestonePayload) {
  const isAdminMilestone =
    payload.source === "admin" ||
    payload.createdByRole === "admin" ||
    Boolean(payload.adminId);

  return apiPost<CreateMilestoneResponse>(`${MILESTONE_BASE}/create`, {
    brandId: payload.brandId,
    influencerId: payload.influencerId,
    campaignId: payload.campaignId,

    // Brand flow sends contractId. Admin flow sends empty contractId.
    contractId: isAdminMilestone ? "" : payload.contractId || "",

    // Admin flow fields
    adminId: isAdminMilestone ? payload.adminId || "" : "",
    source: isAdminMilestone ? "admin" : "brand",
    createdByRole: isAdminMilestone ? "admin" : "brand",
    createdByModel: isAdminMilestone
      ? payload.createdByModel || "Master"
      : "Brand",

    milestoneTitle: payload.milestoneTitle,
    milestoneBudget: payload.milestoneBudget,
    amount: payload.amount ?? payload.milestoneBudget,

    milestoneDescription: payload.milestoneDescription ?? "",

    attachments: payload.attachments ?? [],
    productImages: payload.productImages ?? [],
    references: payload.references ?? [],

    deliverables: payload.deliverables ?? [],
    submissionLink: payload.submissionLink ?? "",

    startDate: payload.startDate ?? "",
    endDate: payload.endDate ?? "",
    graceDays: payload.graceDays ?? 0,

    needDraftFirst: Boolean(payload.needDraftFirst),
    draftDate: payload.draftDate ?? "",
  });
}

export type MilestoneRow = {
  _id?: string;
  milestoneHistoryId: string;
  influencerId: string;
  campaignId: string;
  milestoneTitle: string;
  amount: number;
  milestoneDescription: string;
  released: boolean;
  releasedAt?: string | null;
  payoutStatus: "pending" | "initiated" | "paid";
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  brandId: string;
  milestoneId: string;
};

export type BrandWalletSnapshot = {
  walletBalance: number;
  frozenBalance: number;
};

export type GetMilestonesByBrandPayload = {
  brandId: string;
};

export type GetMilestonesByBrandResponse = {
  message: string;
  wallet: BrandWalletSnapshot;
  totalAmount: number;
  milestones: MilestoneRow[];
};

export async function apiGetMilestonesByBrand(payload: GetMilestonesByBrandPayload) {
  return apiPost<GetMilestonesByBrandResponse>(`${MILESTONE_BASE}/byBrand`, {
    brandId: payload.brandId,
  });
}

export type GetMilestoneWalletBalancePayload = {
  brandId: string;
};

export type GetMilestoneWalletBalanceResponse = {
  message: string;
  brandId: string;
  walletBalance: number;
  frozenBalance: number;
};

export async function apiGetMilestoneWalletBalance(
  payload: GetMilestoneWalletBalancePayload
) {
  return apiPost<GetMilestoneWalletBalanceResponse>(`${MILESTONE_BASE}/balance`, {
    brandId: payload.brandId,
  });
}

export type ReleaseMilestonePayload = {
  milestoneId: string;
  milestoneHistoryId: string;
};

export type ReleaseMilestoneResponse = {
  message: string;
  releasedAmount: number;
  payoutStatus: "initiated" | "paid" | "pending";
  wallet: BrandWalletSnapshot;
};

export async function apiReleaseMilestone(payload: ReleaseMilestonePayload) {
  return apiPost<ReleaseMilestoneResponse>(`${MILESTONE_BASE}/release`, {
    milestoneId: payload.milestoneId,
    milestoneHistoryId: payload.milestoneHistoryId,
  });
}


export type CampaignMilestoneRow = {
  _id?: string;
  milestoneHistoryId: string;
  influencerId: string;
  influencerName?: string | null;
  campaignId: string;
  milestoneTitle: string;
  amount: number;
  milestoneDescription: string;
  released: boolean;
  releasedAt?: string | null;
  payoutStatus: "pending" | "initiated" | "paid";
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  brandId: string;
  milestoneId: string;
};

export type GetMilestonesByCampaignPayload = {
  campaignId: string;
  brandId?: string;
};

export type GetMilestonesByCampaignResponse = {
  message: string;
  milestones: CampaignMilestoneRow[];
};

export async function apiGetMilestonesByCampaign(
  payload: GetMilestonesByCampaignPayload
) {
  const res = await apiPost<GetMilestonesByCampaignResponse>(
    `${MILESTONE_BASE}/byCampaign`,
    {
      campaignId: payload.campaignId,
      brandId: payload.brandId,
    }
  );

  return {
    ...res,
    milestones: (res?.milestones || []).filter(
      (item) => !payload.brandId || String(item.brandId) === String(payload.brandId)
    ),
  };
}

export type EditMilestonePayload = {
  milestoneId: string;
  milestoneHistoryId: string;

  milestoneTitle: string;
  milestoneBudget: number;
  amount?: number;
  milestoneDescription?: string;

  attachments?: any[];
  productImages?: any[];
  references?: any[];

  deliverables: CreateMilestoneDeliverablePayload[];

  submissionLink?: string;
  startDate?: string;
  endDate?: string;
  graceDays?: number;
  needDraftFirst?: boolean;
  draftDate?: string;
};

export async function apiEditMilestone(payload: EditMilestonePayload) {
  return apiPost(`${MILESTONE_BASE}/edit`, {
    milestoneId: payload.milestoneId,
    milestoneHistoryId: payload.milestoneHistoryId,

    milestoneTitle: payload.milestoneTitle,
    milestoneBudget: payload.milestoneBudget,
    amount: payload.amount ?? payload.milestoneBudget,

    milestoneDescription: payload.milestoneDescription ?? "",

    attachments: payload.attachments ?? [],
    productImages: payload.productImages ?? [],
    references: payload.references ?? [],

    deliverables: payload.deliverables ?? [],

    // Submission link is separate.
    submissionLink: payload.submissionLink ?? "",

    startDate: payload.startDate ?? "",
    endDate: payload.endDate ?? "",
    graceDays: payload.graceDays ?? 0,

    needDraftFirst: Boolean(payload.needDraftFirst),
    draftDate: payload.draftDate ?? "",
  });
}

export type GetAllDeliverablesByMilestonePayload = {
  milestoneId: string;
  milestoneHistoryId: string;
};

export type MilestoneDeliverableRow = {
  deliverableId: string;

  milestoneId: string;
  milestoneHistoryId: string;

  brandId?: string;
  influencerId?: string;
  campaignId?: string;

  milestoneTitle?: string;

  deliverableName: string;
  title?: string;

  deliveries: string[];
  aspectRatio?: string;
  quantity: number;

  deliverableLinks: MilestoneDeliverableLink[];
  url: MilestoneDeliverableLink[];

  status: "pending" | "submitted" | "approved" | "revision" | string;
  submittedAt?: string | null;

  comments?: string;
  approvedRole?: string;
  approvalId?: string;
  approvedAt?: string | null;
  revisionRequestedAt?: string | null;

  revisions?: MilestoneRevision[];

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GetAllDeliverablesByMilestoneResponse = {
  success: boolean;
  message: string;
  total: number;
  count: number;
  data: MilestoneDeliverableRow[];
  filters: {
    milestoneId: string;
    milestoneHistoryId: string;
  };
};

export async function apiGetAllDeliverablesByMilestone(
  payload: GetAllDeliverablesByMilestonePayload
) {
  return apiPost<GetAllDeliverablesByMilestoneResponse>(
    `${MILESTONE_BASE}/getAllDeliverables`,
    {
      milestoneId: payload.milestoneId,
      milestoneHistoryId: payload.milestoneHistoryId,
    }
  );
}

export type ApprovedRole = "Brand" | "Admin";

export type ApproveDeliverablePayload = {
  deliverableId: string;
  milestoneId?: string;
  milestoneHistoryId?: string;
  comments?: string;
  approvedRole?: ApprovedRole;
  approvalId?: string;
};

export type ApproveDeliverableResponse = {
  success: boolean;
  message: string;
  milestoneId: string;
  milestoneHistoryId: string;
  deliverableId: string;
  deliverable: MilestoneDeliverableRow;
};

export async function apiApproveDeliverable(
  payload: ApproveDeliverablePayload
) {
  const deliverableId = String(payload.deliverableId || "").trim();
  const milestoneId = String(payload.milestoneId || "").trim();
  const milestoneHistoryId = String(payload.milestoneHistoryId || "").trim();

  if (!deliverableId) {
    throw new Error("deliverableId is required");
  }

  return apiPost<ApproveDeliverableResponse>(
    `${MILESTONE_BASE}/approveDeliverable`,
    {
      deliverableId,
      milestoneId,
      milestoneHistoryId,
      comments: payload.comments ?? "",
      approvedRole: payload.approvedRole ?? "Brand",
      approvalId: payload.approvalId ?? "",
    }
  );
}


export type GetAllCampaignsParams = {
  brandId?: string;
  page?: number;
  limit?: number;
};

export type GetAllCampaignsRow = {
  _id?: string;
  id?: string;
  campaignId?: string;
  campaignTitle?: string;
  title?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GetAllCampaignsResponse = {
  data: GetAllCampaignsRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export async function apiGetAllCampaigns(params: GetAllCampaignsParams = {}) {
  const res = await apiGet<any>(`${CAMPAIGN_BASE}/getAll`, {
    brandId: params.brandId,
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  });

  if (Array.isArray(res)) {
    return {
      data: res,
      pagination: {
        total: res.length,
        page: params.page ?? 1,
        limit: params.limit ?? 100,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    } as GetAllCampaignsResponse;
  }

  return res as GetAllCampaignsResponse;
}

export type CreateCampaignInvitationPayload = {
  brandId: string;
  influencerId: string;
  campaignIds: string[];
  handle?: string;
  modashUserId?: string;
  emailTo?: string;
};

export type CampaignInvitationRow = {
  _id?: string;
  brandId: string;
  campaignId: string;
  influencerId: string;
  status?: string;
  sentAt?: string;
  failedAt?: string | null;
  failReason?: string | null;
  handle?: string;
  modashUserId?: string;
  emailTo?: string | null;
  [key: string]: any;
};

export type CreateCampaignInvitationResponse = {
  status: "success" | "error";
  message: string;
  requestedCampaigns?: number;
  created?: number;
  missingCampaignIds?: string[];
  invitations?: CampaignInvitationRow[];
};

export async function apiCreateCampaignInvitation(
  payload: CreateCampaignInvitationPayload
) {
  return apiPost<CreateCampaignInvitationResponse>(`${CAMPAIGN_INVITATION_BASE}/create`, payload);
}


/** -------- Campaign Invitation List by Brand (NEW) -------- */
export type GetCampaignInvitationsByBrandParams = {
  brandId: string;
  page?: number;
  limit?: number;
  status?: string;
  influencerId?: string;
};

export type CampaignInvitationListResponse = {
  status: "success" | "error";
  page: number;
  limit: number;
  total: number;
  pages: number;
  brandId: string;
  invitations: CampaignInvitationRow[];
};

export async function apiGetCampaignInvitationsByBrand(
  params: GetCampaignInvitationsByBrandParams
) {
  const { brandId, page = 1, limit = 25, status, influencerId } = params;

  return apiGet<CampaignInvitationListResponse>(
    `${CAMPAIGN_INVITATION_BASE}/brand/${brandId}`,
    {
      page,
      limit,
      status,
      influencerId,
    }
  );
}

/** -------- Campaign History -------- */
export type CampaignHistoryTimelineState = "none" | "running" | "expired";

export type CampaignHistorySortBy =
  | "createdAt"
  | "budget"
  | "applicantCount"
  | "campaignStatus"
  | "statusUpdatedAt"
  | "productOrServiceName"
  | "isActive";

export type CampaignHistorySortOrder = "asc" | "desc";

export type CampaignHistoryPayload = {
  brandId: string;

  page?: number;
  limit?: number;
  search?: string;
  sortBy?: CampaignHistorySortBy;
  sortOrder?: CampaignHistorySortOrder;
  includeDescription?: 0 | 1;

  campaignStatus?: "open" | "paused";
  timelineState?: CampaignHistoryTimelineState;
  goal?: string;
  minBudget?: number | string;
  maxBudget?: number | string;

  campaignType?: string;
  creatorStatus?: "all" | "invited" | "applied" | "approved";
  categoryIds?: string[];
  aiCreated?: boolean | 0 | 1 | "true" | "false";

  quickFilter?:
  | "recently_edited"
  | "launching_soon"
  | "today"
  | "this_week"
  | "this_month";

  allDatesOption?:
  | "all"
  | "last_7"
  | "last_15"
  | "last_30"
  | "last_90"
  | "last_365"
  | "last_month"
  | "last_quarter";

  startDate?: string;
  endDate?: string;
};

export type CampaignHistoryRow = EnrichedCampaignDoc & {
  computedIsActive?: boolean;
  timelineState?: CampaignHistoryTimelineState;
  hasTimeline?: boolean;
  influencerWorking?: boolean;
};

export type CampaignHistoryResponse = {
  data: CampaignHistoryRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function apiCampaignHistory(payload: CampaignHistoryPayload) {
  const client = resolveClient();

  if (typeof client?.request === "function") {
    const res = await client.request({
      method: "POST",
      url: `${CAMPAIGN_BASE}/history`,
      data: payload,
    });
    return res?.data as CampaignHistoryResponse;
  }

  if (typeof client?.post === "function") {
    const res = await client.post(`${CAMPAIGN_BASE}/history`, payload);
    return res?.data as CampaignHistoryResponse;
  }

  throw new Error("No compatible API client found in @/lib/api");
}



/** -------- Applicant List By Campaign (NEW) -------- */

export type ApplyListSortField =
  | "name"
  | "primaryPlatform"
  | "category"
  | "audienceSize"
  | "handle"
  | "createdAt";

export type ApplicantDecisionFilter = 0 | 1 | boolean | "0" | "1" | "true" | "false";

export type GetListByCampaignPayload = {
  campaignId: string;
  page?: number;
  limit?: number;
  search?: string;
  sortField?: ApplyListSortField;
  createdPage?: boolean | "true" | "false";
  sortOrder?: 0 | 1; // 0 = asc, 1 = desc
  filterStatus?: "all" | "applied" | "active" | "shortlisted" | "undecided" | "rejected" | "invited" | "completed";
  // new applicant decision filters
  isShortlisted?: ApplicantDecisionFilter;
  isUndicided?: ApplicantDecisionFilter;
  isRejected?: ApplicantDecisionFilter;
};

export type CampaignApplicantInfluencerRow = {
  influencerId: string;
  name: string;
  handle: string | null;
  category: string | null;
  audienceSize: number;
  createdAt: string | null;

  // applicant decision flags
  isShortlisted: 0 | 1;
  isUndicided: 0 | 1;
  isRejected: 0 | 1;

  // approval / contract flags
  isAssigned: 0 | 1;
  isContracted: 0 | 1;
  contractId: string | null;
  feeAmount: number;
  isAccepted: 0 | 1;

  // contract rejection (separate from applicant rejection)
  isContractRejected?: 0 | 1;
  rejectedReason: string;
};

export type GetListByCampaignResponse = {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  applicantCount: number;
  isContracted: 0 | 1;
  contractId: string | null;
  influencers: CampaignApplicantInfluencerRow[];
};

export async function apiGetListByCampaign(
  payload: GetListByCampaignPayload
) {
  return apiPost<GetListByCampaignResponse>(
    `${Apply_Base}/list`,
    {
      campaignId: payload.campaignId,
      page: payload.page ?? 1,
      limit: payload.limit ?? 10,
      search: payload.search,
      sortField: payload.sortField,
      filterStatus: payload.filterStatus,
      createdPage: payload.createdPage,
      sortOrder: payload.sortOrder ?? 0,
      isShortlisted: payload.isShortlisted,
      isUndicided: payload.isUndicided,
      isRejected: payload.isRejected,
    }
  );
}

export type ApplicantDecisionField =
  | "isShortlisted"
  | "isUndicided"
  | "isRejected";

export type SetApplicantDecisionStatusPayload = {
  campaignId: string;
  influencerId: string;
  field: ApplicantDecisionField;
};

export type SetApplicantDecisionStatusResponse = {
  message: string;
  applicant: {
    influencerId: string;
    name: string;
    isShortlisted: 0 | 1;
    isUndicided: 0 | 1;
    isRejected: 0 | 1;
  };
};

export async function apiSetApplicantDecisionStatus(
  payload: SetApplicantDecisionStatusPayload
) {
  return apiPost<SetApplicantDecisionStatusResponse>(
    `${Apply_Base}/update-status`,
    {
      campaignId: payload.campaignId,
      influencerId: payload.influencerId,
      field: payload.field,
    }
  );
}

/** -------- Campaign Invitations By Brand + Campaign (NEW) -------- */

export type CampaignInvitationIncludeFlag = 0 | 1 | boolean | "0" | "1";

export type CampaignInvitationByCampaignRow = {
  invitationId: string;
  brandId: string | null;
  brandName?: string | null;

  influencerId: string | null;
  influencerName?: string | null;
  influencerEmail?: string | null;

  campaignId: string | null;
  campaignTitle?: string | null;

  handle: string | null;
  status: string | null;

  modashUserId: string | null;
  createdByAdminId: string | null;

  createdAt: string;
  updatedAt: string;
};

export type GetCampaignInvitationsByCampaignPayload = {
  campaignId?: string;

  brandId: string;
  status?: string;
  handle?: string;

  page?: number;
  limit?: number;

  includeCampaign?: CampaignInvitationIncludeFlag;
  includeNames?: CampaignInvitationIncludeFlag;
};

export type GetCampaignInvitationsByCampaignResponse = {
  status: "success" | "error";
  page: number;
  limit: number;
  total: number;
  pages: number;

  requested: number;
  returned: number;
  missingCampaignIds: string[];

  invitations: CampaignInvitationByCampaignRow[];
};

function toIncludeFlag(value: CampaignInvitationIncludeFlag | undefined, fallback: 0 | 1 = 1) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export async function apiGetCampaignInvitationsByCampaign(
  payload: GetCampaignInvitationsByCampaignPayload
) {
  const campaignId = String(payload.campaignId || "").trim();
  const brandId = String(payload.brandId || "").trim();

  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  if (!brandId) {
    throw new Error("brandId is required");
  }

  return apiPost<GetCampaignInvitationsByCampaignResponse>(
    `${CAMPAIGN_INVITATION_BASE}/get-invitations`,
    {
      campaignId,
      brandId,

      status: payload.status,
      handle: payload.handle,

      page: payload.page ?? 1,
      limit: payload.limit ?? 25,

      includeCampaign: toIncludeFlag(payload.includeCampaign, 1),
      includeNames: toIncludeFlag(payload.includeNames, 1),
    }
  );
}



export type GetCampaignInvitationsByBrandAndCampaignPayload = {
  brandId: string;
  campaignId: string;
  status?: string;
  influencerId?: string;
  handle?: string;
};

export type GetCampaignInvitationsByBrandAndCampaignResponse = {
  status: "success" | "error";
  total: number;
  brandId: string;
  campaignId: string;
  invitations: CampaignInvitationRow[];
};

export async function apiGetCampaignInvitationsByBrandAndCampaign(
  payload: GetCampaignInvitationsByBrandAndCampaignPayload
) {
  return apiPost<GetCampaignInvitationsByBrandAndCampaignResponse>(
    `${CAMPAIGN_INVITATION_BASE}/get-invitations`,
    {
      brandId: payload.brandId,
      campaignId: payload.campaignId,
      status: payload.status,
      influencerId: payload.influencerId,
      handle: payload.handle,
    }
  );
}

export type BrandLiteFeature = {
  key?: string | null;
  value?: string | number | null;
  limit?: number | null;
  used?: number | null;
  note?: string | null;
  resetsEvery?: string | null;
  resetsAt?: string | null;
};

export type BrandLiteSubscription = {
  brandPlanId?: string | null;
  brandPlanName?: string | null;
  plan?: string | null;
  status?: string | null;
  features?: BrandLiteFeature[] | null;
};

export type BrandLiteResponse = {
  subscription: BrandLiteSubscription | null;
  brandId: string;
  name: string;
  proxyEmail: string;
  profilePic: string;
  subscriptionDetails: BrandLiteSubscription | null;
};

export async function apiGetBrandLite(brandId: string) {
  return apiGet<BrandLiteResponse>(`${BRAND_BASE}/lite`, { brandId });
}

export type BrandProfileResponse = {
  _id: string;
  brandId: string;
  brandName?: string;
  name?: string;
  email?: string;
  companySize?: string;
  industry?: string;

  page1?: Array<{ question: string; answers: string[] }>;
  page2?: Array<{ question: string; answers: string[] }>;
  page3?: Array<{ question: string; answers: string[] }>;

  ispage1Skip?: boolean;
  ispage2Skip?: boolean;
  ispage3Skip?: boolean;

  proxyEmail?: string;
  profilePic?: string;
  isProfilePicSkip?: boolean;

  subscription?: any;
  subscriptionDetails?: any;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: any;
};

export async function apiGetBrandProfile(brandId: string) {
  return apiPost<BrandProfileResponse>(`${BRAND_BASE}/profile`, {
    brandId,
  });
}

export async function apigetSignatureExistance(brandId: string) {
  console.log("called apigetSignatureExistance")
  return apiGet(`${CONTRACT_BASE}/signature/${brandId}`)
}


export async function apipostSignatureUpload(payload: {
  brandId: string;
  signature: File;
}) {
  const formData = new FormData();
  formData.append("brandId", payload.brandId);
  formData.append("signature", payload.signature);

  return apiPost(`${CONTRACT_BASE}/upload`, formData);
}

export async function apiGetManageContractInfo(contractId: string) {
  return apiGet(`${CONTRACT_BASE}/manage/${contractId}`)
}

export type GetContractDetailsResponse = {
  success?: boolean;
  message?: string;
  contract: any;
};

export async function apiGetContractDetails(contractId: string) {
  const id = String(contractId || "").trim();

  if (!id) {
    throw new Error("contractId is required");
  }

  const res = await apiGet<GetContractDetailsResponse>(
    `${CONTRACT_BASE}/get-contract-details/${encodeURIComponent(id)}`
  );

  return (res?.contract ?? res) as any;
}

export type ViewContractPdfPayload = {
  contractId: string;
};

export async function apiViewContractPdf(payload: ViewContractPdfPayload) {
  const contractId = String(payload.contractId || "").trim();

  if (!contractId) {
    throw new Error("contractId is required");
  }

  return apiGet<Blob>(
    `${CONTRACT_BASE}/preview`,
    { contractId },
    {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    }
  );
}

// Add these types and functions near the bottom of services/brandApi.t

export type UpdateBrandProfilePayload = {
  brandId: string;
  brandName?: string;
  companySize?: string;
  brandType?: string;
  profilePic?: string;
};

export type UpdateBrandProfileResponse = {
  message: string;
  brandId: string;
};


export async function apiUpdateBrandProfile(payload: UpdateBrandProfilePayload) {
  return apiPost<UpdateBrandProfileResponse>(`${BRAND_BASE}/profile/update`, payload);
}


export type AcceptedAdminCreatedInfluencerRow = {
  invitationId: string;
  influencerId: string | null;
  influencerName: string | null;
  influencerEmail: string | null;
  modashUserId: string | null;
  handle: string | null;
  status: string;
  brandId: string | null;
  brandName: string | null;
  campaignId: string | null;
  campaignTitle?: string | null;
  description?: string | null;
  campaignBudget?: number | null;
  budget?: number | null;
  influencerBudget?: number | null;
  minFollowers?: number | null;
  maxFollowers?: number | null;
  targetCountry?: string | null;
  paymentType?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetAcceptedAdminCreatedInfluencersByCampaignPayload = {
  campaignId: string;
  brandId?: string;
  page?: number;
  limit?: number;
  includeCampaign?: 0 | 1 | boolean;
  includeNames?: 0 | 1 | boolean;
};

export type GetAcceptedAdminCreatedInfluencersByCampaignResponse = {
  status: "success" | "error";
  page: number;
  limit: number;
  total: number;
  pages: number;
  campaignId: string;
  filters: {
    status: "accepted";
    createdByAdmin: true;
    brandId?: string;
  };
  influencers: AcceptedAdminCreatedInfluencerRow[];
};

export async function apiGetAcceptedAdminCreatedInfluencersByCampaign(
  params: GetAcceptedAdminCreatedInfluencersByCampaignPayload
) {
  return apiGet<GetAcceptedAdminCreatedInfluencersByCampaignResponse>(
    `${CAMPAIGN_INVITATION_BASE}/accepted-admin-created-influencers`,
    {
      campaignId: params.campaignId,
      brandId: params.brandId,
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      includeCampaign:
        typeof params.includeCampaign === "boolean"
          ? params.includeCampaign
            ? 1
            : 0
          : (params.includeCampaign ?? 1),
      includeNames:
        typeof params.includeNames === "boolean"
          ? params.includeNames
            ? 1
            : 0
          : (params.includeNames ?? 1),
    }
  );
}



export type GetMilestonesByInfluencerAndCampaignPayload = {
  influencerId: string;
  campaignId: string;
  brandId?: string;
};

export type GetMilestonesByInfluencerAndCampaignResponse = {
  message: string;
  milestones: MilestoneRow[];
};

export async function apiGetMilestonesByInfluencerAndCampaign(
  payload: GetMilestonesByInfluencerAndCampaignPayload
) {
  return apiPost<GetMilestonesByInfluencerAndCampaignResponse>(
    `${MILESTONE_BASE}/getMilestome`,
    {
      influencerId: payload.influencerId,
      campaignId: payload.campaignId,
      brandId: payload.brandId,
    }
  );
}


/** -------- Public Campaign Share APIs -------- */

export type EnableCampaignSharePayload = {
  brandId: string;
  campaignId: string;
};

export type EnableCampaignShareResponse = {
  message: string;
  shareUrl: string;
  publicShareToken: string;
  isPublic: boolean;
};

export async function apiEnableCampaignShare(
  payload: EnableCampaignSharePayload
) {
  return apiPost<EnableCampaignShareResponse>(
    `${CAMPAIGN_BASE}/share/enable`,
    {
      brandId: payload.brandId,
      campaignId: payload.campaignId,
    }
  );
}

export type DisableCampaignSharePayload = {
  brandId: string;
  campaignId: string;
};

export type DisableCampaignShareResponse = {
  message: string;
  isPublic: boolean;
};

export async function apiDisableCampaignShare(
  payload: DisableCampaignSharePayload
) {
  return apiPost<DisableCampaignShareResponse>(
    `${CAMPAIGN_BASE}/share/disable`,
    {
      brandId: payload.brandId,
      campaignId: payload.campaignId,
    }
  );
}

export type PublicCampaignDoc = {
  _id: string;
  campaignTitle: string;
  description?: string;
  campaignType?: string;

  campaignBudget?: number;
  budget?: number;
  paymentType?: string;

  targetCountryIds?: string[];
  targetAgeRanges?: string[];

  productImages?: any[];
  productLink?: string;
  videoLink?: string;

  additionalNotes?: string;

  startAt?: string | null;
  endAt?: string | null;
  status?: string;

  brandName?: string;

  categoryId?: string | null;
  subcategoryIds?: string[];

  contentFormats?: string[];
  contentLanguageIds?: string[];
  preferredHashtags?: string[];
  campaignGoals?: string[];
};

export type GetPublicCampaignResponse = {
  doc: PublicCampaignDoc;
};

export async function apiGetPublicCampaign(token: string) {
  return apiGet<GetPublicCampaignResponse>(
    `${CAMPAIGN_BASE}/public/${encodeURIComponent(token)}`
  );
}

export type CampaignInfluencerAllocationRow = {
  influencerId: string;
  amount: number;
  releasedAmount: number;
  pendingAmount: number;
  status?: "allocated" | "partially_released" | "released" | string;
  allocatedAt?: string;
  lastAllocatedAt?: string;
};

export type CampaignFreezeRow = {
  brandId: string;
  campaignId: string;

  totalFrozenAmount: number;
  currentFrozenAmount: number;
  totalAllocatedAmount: number;
  totalReleasedAmount: number;
  availableToAllocate: number;

  status?: "active" | "fully_allocated" | "released" | string;

  influencerAllocations: CampaignInfluencerAllocationRow[];

  createdAt?: string;
  updatedAt?: string;
};

export type BrandWalletResponse = {
  brandId: string;
  walletBalance: number;
  frozenBalance: number;
  freezes: CampaignFreezeRow[];
};

export async function apiGetBrandWallet(params: { brandId: string }) {
  const brandId = String(params.brandId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  return apiGet<BrandWalletResponse>(`${WALLET_BASE}`, {
    brandId,
  });
}

export type BrandWalletTopupPayload = {
  brandId: string;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
};

export type BrandWalletTopupResponse = {
  message: string;
  brandId: string;
  amount: number;
  currency: string;
  sessionId: string;
  checkoutUrl?: string;
};

export async function apiBrandWalletTopup(payload: BrandWalletTopupPayload) {
  const brandId = String(payload.brandId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  return apiPost<BrandWalletTopupResponse>(`${WALLET_BASE}/topup`, {
    brandId,
    amount: payload.amount,
    currency: payload.currency ?? "usd",
    successUrl: payload.successUrl,
    cancelUrl: payload.cancelUrl,
  });
}

export type ConfirmBrandWalletTopupPayload = {
  brandId: string;
  sessionId: string;
};

export type ConfirmBrandWalletTopupResponse = {
  message: string;
  brandId: string;
  addedAmount: number;
  walletBalance: number;
  frozenBalance: number;
};

export async function apiConfirmBrandWalletTopup(
  payload: ConfirmBrandWalletTopupPayload
) {
  const brandId = String(payload.brandId || "").trim();
  const sessionId = String(payload.sessionId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  return apiPost<ConfirmBrandWalletTopupResponse>(
    `${WALLET_BASE}/topup/confirm`,
    {
      brandId,
      sessionId,
    }
  );
}

export type FreezeAmountForCampaignPayload = {
  brandId: string;
  campaignId: string;
  amount: number;
  note?: string;
};

export type FreezeAmountForCampaignResponse = {
  message: string;
  brandId: string;
  campaignId: string;
  frozenAmount: number;
  walletBalance: number;
  frozenBalance: number;
  campaignFreeze: CampaignFreezeRow;
};

export async function apiFreezeAmountForCampaign(
  payload: FreezeAmountForCampaignPayload
) {
  const brandId = String(payload.brandId || "").trim();
  const campaignId = String(payload.campaignId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  return apiPost<FreezeAmountForCampaignResponse>(
    `${WALLET_BASE}/freeze-campaign`,
    {
      brandId,
      campaignId,
      amount: payload.amount,
      note: payload.note ?? "",
    }
  );
}

export type AllocateToInfluencerPayload = {
  brandId: string;
  campaignId: string;
  influencerId: string;
  amount?: number;
  note?: string;
};

export type AllocateToInfluencerResponse = {
  message: string;
  brandId: string;
  campaignId: string;
  influencerId: string;
  allocatedAmount: number;
  walletBalance: number;
  frozenBalance: number;
  campaignFreeze: CampaignFreezeRow;
  influencerAllocation: CampaignInfluencerAllocationRow;
};

export async function apiAllocateToInfluencer(
  payload: AllocateToInfluencerPayload
) {
  const brandId = String(payload.brandId || "").trim();
  const campaignId = String(payload.campaignId || "").trim();
  const influencerId = String(payload.influencerId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  if (!influencerId) {
    throw new Error("influencerId is required");
  }

  const body: Record<string, any> = {
    brandId,
    campaignId,
    influencerId,
    note: payload.note ?? "",
  };

  if (payload.amount !== undefined) {
    body.amount = payload.amount;
  }

  return apiPost<AllocateToInfluencerResponse>(
    `${WALLET_BASE}/allocate-to-influencer`,
    body
  );
}

export type WithdrawBrandWalletPayload = {
  brandId: string;
  amount: number;
  currency?: string;
  method?: "manual" | "bank" | "upi" | "stripe" | "razorpayx" | string;
  transactionId?: string;
  note?: string;
};

export type WithdrawBrandWalletResponse = {
  message: string;
  brandId: string;
  withdrawnAmount: number;
  walletBalance: number;
  frozenBalance: number;
};

export async function apiWithdrawBrandWalletAmount(
  payload: WithdrawBrandWalletPayload
) {
  const brandId = String(payload.brandId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("amount must be greater than 0");
  }

  return apiPost<WithdrawBrandWalletResponse>(`${WALLET_BASE}/withdraw`, {
    brandId,
    amount: payload.amount,
    currency: payload.currency ?? "usd",
    method: payload.method ?? "manual",
    transactionId: payload.transactionId ?? "",
    note: payload.note ?? "",
  });
}

export type FrozenInfluencerSummary = {
  influencerId: string;
  amount: number;
  releasedAmount: number;
  pendingAmount: number;
  status?: "allocated" | "partially_released" | "released" | string;
};

export type FrozenAmountResponse = {
  brandId: string;
  campaignId: string;

  walletBalance: number;
  frozenBalance: number;

  totalFrozenAmount: number;
  currentFrozenAmount: number;
  totalAllocatedAmount: number;
  totalReleasedAmount: number;
  availableToAllocate: number;

  influencer: FrozenInfluencerSummary | null;
};

export async function apiGetFrozenAmountForCampaign(params: {
  brandId: string;
  campaignId: string;
  influencerId?: string;
}) {
  const brandId = String(params.brandId || "").trim();
  const campaignId = String(params.campaignId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  return apiGet<FrozenAmountResponse>(`${WALLET_BASE}/freeze-amount`, {
    brandId,
    campaignId,
    influencerId: params.influencerId,
  });
}

export type WalletTopupHistoryPayload = {
  brandId: string;
};

export type WalletTopupItem = {
  amount: number;
  currency?: string;
  status?: "success" | "pending" | "failed" | string;
  source?: "stripe" | "admin_manual" | string;

  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paymentIntentId?: string | null;

  walletBalanceBefore?: number;
  walletBalanceAfter?: number;

  note?: string;
  addedByAdminId?: string | null;
  addedByAdminEmail?: string | null;

  createdAt?: string;

  [key: string]: any;
};

export type WalletTopupHistoryResponse = {
  brandId: string;
  wallettopup: WalletTopupItem[];
};

export async function apiGetWalletTopupHistory(
  payload: WalletTopupHistoryPayload
) {
  const brandId = String(payload.brandId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  return apiGet<WalletTopupHistoryResponse>(`${WALLET_BASE}/topupHistory`, {
    brandId,
  });
}

export type FreezeHistoryItem = {
  brandId: string;
  campaignId: string;
  amount: number;

  walletBalanceBefore: number;
  walletBalanceAfter: number;

  frozenBalanceBefore: number;
  frozenBalanceAfter: number;

  campaignFrozenBefore: number;
  campaignFrozenAfter: number;

  note?: string;
  createdAt?: string;

  [key: string]: any;
};

export type AllocationHistoryItem = {
  brandId: string;
  campaignId: string;
  influencerId: string;
  amount: number;

  availableToAllocateBefore: number;
  availableToAllocateAfter: number;

  influencerAllocatedBefore: number;
  influencerAllocatedAfter: number;

  note?: string;
  createdAt?: string;

  [key: string]: any;
};

export type WithdrawHistoryItem = {
  brandId: string;
  amount: number;
  currency?: string;
  status?: "success" | "pending" | "failed" | string;
  method?: "manual" | "bank" | "upi" | "stripe" | "razorpayx" | string;
  transactionId?: string | null;

  walletBalanceBefore?: number;
  walletBalanceAfter?: number;

  note?: string;
  createdAt?: string;

  [key: string]: any;
};

export type WalletTransactionItem = {
  type: "topup" | "campaign_freeze" | "influencer_allocation" | "withdraw";
  amount: number;
  currency?: string;
  status?: string;
  campaignId?: string;
  influencerId?: string;
  createdAt?: string;
  raw: any;
};

export type BrandWalletHistoryResponse = {
  brandId: string;
  topups: WalletTopupItem[];
  freezeHistories: FreezeHistoryItem[];
  allocationHistories: AllocationHistoryItem[];
  withdrawHistories: WithdrawHistoryItem[];
  transactions: WalletTransactionItem[];
};

export async function apiGetBrandWalletHistory(payload: { brandId: string }) {
  const brandId = String(payload.brandId || "").trim();

  if (!brandId) {
    throw new Error("brandId is required");
  }

  return apiGet<BrandWalletHistoryResponse>(`${WALLET_BASE}/history`, {
    brandId,
  });
}


export async function apiUploadImages(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return apiPost<any>(`${CAMPAIGN_BASE}/upload-image`, formData);
}

export async function apiDisputeCreate(payload: {
  brandId: string;
  campaignId: string;
  influencerId: string;
  reason?: string;
  subject?: string;
  description?: string;
  issueType?: string[];
  otherIssueDescription?: string;
  attachments?: File[];
}) {
  const {
    brandId,
    campaignId,
    influencerId,
    reason = "",
    subject,
    description,
    issueType = ["other"],
    otherIssueDescription = "",
    attachments = [],
  } = payload;

  const form = new FormData();

  form.append("brandId", brandId);
  form.append("campaignId", campaignId);
  form.append("influencerId", influencerId);
  form.append("subject", String(subject || reason || "Dispute").trim());
  form.append("description", String(description || reason || "").trim());
  form.append(
    "issueType",
    JSON.stringify(issueType.length > 0 ? issueType : ["other"])
  );
  form.append(
    "otherIssueDescription",
    issueType.includes("other") ? String(otherIssueDescription || "").trim() : ""
  );

  attachments.forEach((file) => {
    form.append("attachments", file);
  });

  return apiPost<any>(`${DISPUTE_BASE}/brand/create`, form);
}

export async function apiRevokeDispute(payload: {
  disputeId: string | null;
  brandId: string | null;
}) {
  const { disputeId, brandId } = payload;

  return apiPatch(`${DISPUTE_BASE}/brand/disputes/${disputeId}/revoke`, {
    brandId,
  });
}

export async function apiEditDispute(payload: {
  disputeId: string;
  brandId: string | null | undefined;
  subject: string;
  description: string;
  issueType: string[];
  otherIssueDescription?: string;
  attachments?: File[];
  removedAttachmentUrls?: string[];
}) {
  const {
    disputeId,
    brandId,
    subject,
    description,
    issueType,
    otherIssueDescription = "",
    attachments = [],
    removedAttachmentUrls = [],
  } = payload;

  const resolvedBrandId = String(brandId || "").trim();

  if (!resolvedBrandId) {
    throw new Error("Missing brand ID. Please log in again to edit this dispute.");
  }

  const normalizedIssueType = issueType.length > 0 ? issueType : ["other"];

  const form = new FormData();

  form.append("brandId", resolvedBrandId);
  form.append("subject", subject.trim());
  form.append("description", description.trim());
  form.append("issueType", JSON.stringify(normalizedIssueType));
  form.append(
    "otherIssueDescription",
    normalizedIssueType.includes("other")
      ? String(otherIssueDescription || "").trim()
      : ""
  );

  attachments.forEach((file) => {
    form.append("attachments", file);
  });

  if (removedAttachmentUrls.length > 0) {
    form.append("removedAttachmentUrls", JSON.stringify(removedAttachmentUrls));
  }

  return apiPatch(`${DISPUTE_BASE}/brand/disputes/${disputeId}/edit`, form);
}

export async function apiAdminEditCampaign(payload: any) {
  return apiPost(`/admin/campaign/edit`, payload);
}

export async function apiFetchCampaignPitchFolder(campaignId: string) {
  return apiGet(`/pitch-folders/campaign/${campaignId}`);
}

export type InfluencerDetails = {
  _id?: string;
  id?: string;

  name?: string;
  creatorName?: string;
  email?: string;
  phone?: string;

  countryId?: string;
  country?: any;

  languageIds?: string[];
  categoryIds?: string[];

  profilePic?: string;
  bio?: string;

  page1?: any[];
  page2?: QA[];
  page3?: QA[];

  onboarding?: {
    page1Done?: boolean;
    page2Done?: boolean;
    page3Done?: boolean;
  };

  socialProfiles?: any;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: any;
};

export type GetInfluencerByIdResponse = {
  influencer: InfluencerDetails;
};

export async function apiGetInfluencerById(influencerId: string) {
  const id = String(influencerId || "").trim();

  if (!id) {
    throw new Error("influencerId is required");
  }

  return apiGet<GetInfluencerByIdResponse>(
    `${INFLUENCER_BASE}/getById`,
    {
      _id: id,
    }
  );
}


export type InfluencerMatchScoreCriteria = {
  key: string;
  label: string;
  weight: number;
  score: number;
  campaignValues?: string[];
  influencerValues?: string[];
};

export type InfluencerMatchScoreBreakdownItem = {
  label: string;
  weight: number;
  score: number;
  weightedScore: number;
  campaignValues?: string[];
  influencerValues?: string[];
};

export type InfluencerMatchScoreResponse = {
  matchScore: number;
  matchPercent: string;
  label: "High" | "Good" | "Average" | "Low" | string;
  breakdown?: Record<string, InfluencerMatchScoreBreakdownItem>;
  criteria?: InfluencerMatchScoreCriteria[];
  matched?: {
    category?: string[];
    subcategory?: string[];
  };
  source?: {
    campaign?: {
      id?: string;
      campaignTitle?: string;
      categoryId?: string;
      subcategoryIds?: string[];
      categoryNames?: string[];
      subcategoryNames?: string[];
    };
    influencer?: {
      id?: string;
      influencerId?: string;
      name?: string;
      handle?: string;
      categoryNames?: string[];
      subcategoryNames?: string[];
      interests?: string[];
      followers?: number;
      engagementRate?: string;
    };
  };
};

export type GetInfluencerMatchScorePayload = {
  campaignId: string;
  influencerId: string;
};

export async function apiGetInfluencerMatchScore(
  payload: GetInfluencerMatchScorePayload
) {
  const campaignId = String(payload.campaignId || "").trim();
  const influencerId = String(payload.influencerId || "").trim();

  if (!campaignId) {
    throw new Error("campaignId is required");
  }

  if (!influencerId) {
    throw new Error("influencerId is required");
  }

  return apiPost<InfluencerMatchScoreResponse>(
    `${CAMPAIGN_BASE}/influencer-match-score`,
    {
      campaignId,
      influencerId,
    }
  );
}


export type AddRevisionAttachmentPayload = {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  key?: string;
};

export type AddRevisionPayload = {
  milestoneId: string;
  milestoneHistoryId: string;
  deliverableId: string;

  issueName: string;
  revisionType: "free" | "paid";
  revisionBudget?: number;

  deliveryName: string;
  issueDeliverableLink: string;
  notes?: string;

  attachments?: AddRevisionAttachmentPayload[] | any[];
  productImages?: AddRevisionAttachmentPayload[] | any[];
  references?: AddRevisionAttachmentPayload[] | any[];

  submissionDate: string;
  raisedByRole?: "Brand" | "Influencer" | "Admin";
};

export type AddRevisionResponse = {
  success: boolean;
  message: string;

  milestoneId: string;
  milestoneHistoryId: string;
  deliverableId: string;

  revision: MilestoneRevision;

  deliverable: {
    deliverableId: string;
    deliverableName: string;
    status: string;
    revisionRequestedAt: string;
    comments: string;
  };

  budget?: {
    influencerBudget: number;
    usedMilestoneBudget: number;
    usedPaidRevisionBudget: number;
    totalUsedBudget: number;
    remainingBudget: number;
  };
};

export async function apiAddRevision(payload: AddRevisionPayload) {
  const milestoneId = String(payload.milestoneId || "").trim();
  const milestoneHistoryId = String(payload.milestoneHistoryId || "").trim();
  const deliverableId = String(payload.deliverableId || "").trim();

  const issueName = String(payload.issueName || "").trim();
  const revisionType = String(payload.revisionType || "free").toLowerCase() as
    | "free"
    | "paid";

  const deliveryName = String(payload.deliveryName || "").trim();
  const issueDeliverableLink = String(payload.issueDeliverableLink || "").trim();
  const submissionDate = String(payload.submissionDate || "").trim();

  if (!milestoneId) {
    throw new Error("milestoneId is required");
  }

  if (!milestoneHistoryId) {
    throw new Error("milestoneHistoryId is required");
  }

  if (!deliverableId) {
    throw new Error("deliverableId is required");
  }

  if (!issueName) {
    throw new Error("issueName is required");
  }

  if (!["free", "paid"].includes(revisionType)) {
    throw new Error("revisionType must be free or paid");
  }

  if (revisionType === "paid") {
    const revisionBudget = Number(payload.revisionBudget || 0);

    if (!Number.isFinite(revisionBudget) || revisionBudget <= 0) {
      throw new Error("revisionBudget is required when revisionType is paid");
    }
  }

  if (!deliveryName) {
    throw new Error("deliveryName is required");
  }

  if (!issueDeliverableLink) {
    throw new Error("issueDeliverableLink is required");
  }

  if (!submissionDate) {
    throw new Error("submissionDate is required");
  }

  return apiPost<AddRevisionResponse>(`${MILESTONE_BASE}/addRevision`, {
    milestoneId,
    milestoneHistoryId,
    deliverableId,

    issueName,
    revisionType,
    revisionBudget:
      revisionType === "paid" ? Number(payload.revisionBudget || 0) : 0,

    deliveryName,
    issueDeliverableLink,
    notes: payload.notes ?? "",

    attachments: payload.attachments ?? [],
    productImages: payload.productImages ?? [],
    references: payload.references ?? [],

    submissionDate,
    raisedByRole: payload.raisedByRole ?? "Brand",
  });
}

/** -------------------------
 *  ✅ CREATOR HUB PAGE APIs
 *  ------------------------*/
export type BrandCreatorFolderItem = {
  _id?: string;
  id?: string;
  profileKey?: string;
  influencerId?: string;
  creatorId?: string;
  userId?: string;
  modashId?: string;
  name?: string;
  fullname?: string;
  username?: string;
  handle?: string;
  email?: string;
  provider?: string;
  country?: string;
  language?: string;
  location?: string;
  categories?: string[];
  niche?: string[];
  followers?: number | string | null;
  engagements?: number | null;
  engagementRate?: number | null;
  averageViews?: number | null;
  primaryLink?: string;
  profileUrl?: string;
  url?: string;
  links?: string[];
  picture?: string;
  avatarUrl?: string;
  profileImage?: string;
  status?: string;
  source?: Record<string, any>;
  raw?: any;
  addedAt?: string;
  updatedAt?: string;
};

export type BrandCreatorFolder = {
  _id?: string;
  id?: string;
  brandId?: string;
  brandName?: string;
  title?: string;
  name?: string;
  slug?: string;
  description?: string;
  type?: "folder" | "bookmark" | "good_fit" | string;
  creatorTier?: string;
  linkedCampaign?: any | null;
  assignedCampaign?: any | null;
  items?: BrandCreatorFolderItem[];
  itemCount?: number;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

export type BrandFolderListParams = {
  type?: "all" | "folder" | "bookmark" | "good_fit" | string;
  includeItems?: boolean;
  _t?: string | number;
  [key: string]: any;
};

export type BrandFolderListResponse = {
  totalCount?: number;
  folderCount?: number;
  bookmarkCount?: number;
  goodFitCount?: number;
  folders?: BrandCreatorFolder[];
  groups?: {
    folders?: BrandCreatorFolder[];
    bookmarks?: BrandCreatorFolder[];
    goodFit?: BrandCreatorFolder[];
  };
};

export async function apiBrandFolderList(params: BrandFolderListParams = {}) {
  return apiGet<BrandFolderListResponse>(`${BRAND_FOLDER_BASE}/list`, {
    type: params.type ?? "all",
    includeItems: params.includeItems ?? true,
    ...params,
  });
}

export type CreateBrandFolderPayload = {
  title: string;
  name?: string;
  description?: string;
  type?: "folder" | "bookmark" | "good_fit" | string;
  folderType?: string;
  kind?: string;
  campaignId?: string;
  linkedCampaignId?: string;
  creatorTier?: string;
  tier?: string;
  [key: string]: any;
};

export type CreateBrandFolderResponse = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  linkedCampaign?: any;
  [key: string]: any;
};

export async function apiBrandFolderCreate(payload: CreateBrandFolderPayload) {
  return apiPost<CreateBrandFolderResponse>(`${BRAND_FOLDER_BASE}/create`, payload);
}

export type NewInvitationStatus = "invited" | "available" | string;

export type NewInvitationRow = {
  invitationId: string;
  brandId: string;
  handle: string;
  status: NewInvitationStatus;
  campaignId?: string | null;
  campaignName?: string | null;
  missingEmailId?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
};

export type NewInvitationsListPayload = {
  brandId: string;
  page?: number;
  limit?: number;
  status?: string;
  [key: string]: any;
};

export type NewInvitationsListResponse = {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  data: NewInvitationRow[];
};

export async function apiNewInvitationsList(payload: NewInvitationsListPayload) {
  const { page, limit, status, ...rest } = payload;

  return apiPost<NewInvitationsListResponse>(`${NEW_INVITATIONS_BASE}/list`, {
    ...rest,
    page: page ?? 1,
    limit: limit ?? 100,
    status: status ?? "all",
  });
}

export type CreateNewInvitationPayload = {
  handle: string;
  brandId: string;
  status: "invited" | "available";
  campaignId?: string;
  campaignTitle?: string;
  [key: string]: any;
};

export type CreateNewInvitationResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  status?: "saved" | "exists" | "error" | string;
  data?: any;
};

export async function apiNewInvitationCreate(payload: CreateNewInvitationPayload) {
  const client = resolveClient();

  if (typeof client?.post === "function") {
    const res = await client.post(`${NEW_INVITATIONS_BASE}/create`, payload);
    const body = res?.data ?? res;

    return {
      ...body,
      success: body?.success ?? true,
      message: body?.message || "Invitation created successfully.",
      status:
        body?.status ||
        body?.data?.status ||
        (body?.success === false ? "error" : "saved"),
      data: body?.data ?? body,
    } as CreateNewInvitationResponse;
  }

  const body: any = await apiPost<any>(`${NEW_INVITATIONS_BASE}/create`, payload);

  return {
    ...body,
    success: body?.success ?? true,
    message: body?.message || "Invitation created successfully.",
    status:
      body?.status ||
      body?.data?.status ||
      (body?.success === false ? "error" : "saved"),
    data: body?.data ?? body,
  } as CreateNewInvitationResponse;
}

export type NonFullManagedCampaignsParams = {
  brandId: string;
  page?: number;
  limit?: number;
  _t?: string | number;
  [key: string]: any;
};

export type NonFullManagedCampaignsResponse = {
  success?: boolean;
  message?: string;
  data?: any;
  campaigns?: any[];
  items?: any[];
};

export async function apiGetNonFullManagedCampaigns(
  params: NonFullManagedCampaignsParams
) {
  const { page, limit, ...rest } = params;

  return apiGet<NonFullManagedCampaignsResponse>(
    `${CAMPAIGN_BASE}/getNonFullManagedCampaigns`,
    {
      ...rest,
      page: page ?? 1,
      limit: limit ?? 500,
    }
  );
}



export type FollowUpNewInvitationPayload = CreateNewInvitationPayload & {
  invitationId?: string;
  emailTemplate?: {
    subject?: string;
    textBody?: string;
    htmlBody?: string;
    attachments?: any[];
  };
  [key: string]: any;
};

export async function apiNewInvitationFollowUp(
  payload: FollowUpNewInvitationPayload
) {
  const client = resolveClient();

  if (typeof client?.post === "function") {
    const res = await client.post(`${NEW_INVITATIONS_BASE}/followup`, payload);
    const body = res?.data ?? res;

    return {
      ...body,
      success: body?.success ?? body?.status === "success",
      message: body?.message || "Follow-up sent successfully.",
      status:
        body?.status ||
        body?.data?.status ||
        (body?.success === false ? "error" : "success"),
      data: body?.data ?? body,
    } as CreateNewInvitationResponse;
  }

  const body: any = await apiPost<any>(
    `${NEW_INVITATIONS_BASE}/followup`,
    payload
  );

  return {
    ...body,
    success: body?.success ?? body?.status === "success",
    message: body?.message || "Follow-up sent successfully.",
    status:
      body?.status ||
      body?.data?.status ||
      (body?.success === false ? "error" : "success"),
    data: body?.data ?? body,
  } as CreateNewInvitationResponse;
}