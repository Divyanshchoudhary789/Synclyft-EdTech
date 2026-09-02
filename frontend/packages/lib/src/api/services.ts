import { api } from "./api";
import type {
  ApiEnvelope,
  DashboardPayload,
  ProgressPayload,
  AnalyticsDashboardPayload,
  StudentProfile,
  AppNotification,
  Paginated,
  StudentPlan,
  SubscriptionSummary,
  Invoice,
  InterviewSession,
} from "./models";

const unwrap = <T>(d: { data: ApiEnvelope<T> }): T => d.data.data;

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authService = {
  me: () => api.get("/auth/user").then((r) => r.data.user ?? r.data),
  logout: () => api.post("/auth/logout", {}).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),
};

// ─── Student profile / dashboard ───────────────────────────────────────────
export const studentService = {
  dashboard: () => api.get<ApiEnvelope<DashboardPayload>>("/profile/dashboard").then(unwrap),
  progress: () => api.get<ApiEnvelope<ProgressPayload>>("/profile/progress").then(unwrap),
  analyticsDashboard: (days = 90) =>
    api
      .get<ApiEnvelope<AnalyticsDashboardPayload>>("/profile/analytics/dashboard", { params: { days } })
      .then(unwrap),
  getProfile: () =>
    api.get<{ success: boolean; data?: StudentProfile; profile?: StudentProfile }>("/profile/get-profile").then(
      (r) => r.data.data ?? r.data.profile ?? (r.data as unknown as StudentProfile)
    ),
  updateProfile: (form: FormData) =>
    api
      .put("/profile/update/profile", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),
  updateProfilePicture: (image: File) => {
    const fd = new FormData();
    fd.append("image", image);
    return api
      .put("/profile/update/profile-picture", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
  addProfileDetails: (form: FormData) =>
    api
      .post("/profile/add/profile-details", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),
  // coding platform verification
  initiatePlatform: (platform: string, username: string) =>
    api.post("/profile/initiate", { platform, username }).then((r) => r.data),
  verifyPlatform: (platform: string) => api.post("/profile/verify", { platform }).then((r) => r.data),
  syncPlatform: (platform: string) => api.post("/profile/sync", { platform }).then((r) => r.data),
  // batch + campaigns assigned by the student's college
  myBatch: () => api.get("/profile/batch/me").then((r) => r.data.data ?? r.data),
  campaigns: (params: Record<string, unknown> = {}) =>
    api.get("/profile/campaigns", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return {
        batch: (d.batch ?? null) as Record<string, unknown> | null,
        campaigns: (Array.isArray(d) ? d : d.campaigns ?? []) as Record<string, unknown>[],
      };
    }),
  campaign: (id: string) => api.get(`/profile/campaigns/${id}`).then((r) => r.data.data ?? r.data),
  // seat-gated performance report
  performanceReport: () => api.get("/profile/reports/dashboard").then((r) => r.data.data ?? r.data),
};

// ─── Notifications ─────────────────────────────────────────────────────────
const pickList = <T>(p: Paginated<T>): T[] => p.data ?? p.notifications ?? p.items ?? [];

export const notificationService = {
  list: (params: { page?: number; limit?: number; status?: string } = {}) =>
    api.get<Paginated<AppNotification> & { data?: AppNotification[]; pagination?: { page: number; total: number; pages?: number; totalPages?: number } }>("/notifications", { params }).then((r) => ({
      items: pickList<AppNotification>(r.data),
      total: r.data.total ?? r.data.pagination?.total ?? 0,
      page: r.data.page ?? r.data.pagination?.page ?? 1,
      totalPages: r.data.totalPages ?? r.data.pagination?.totalPages ?? r.data.pagination?.pages ?? 1,
    })),
  unreadCount: () =>
    api.get<{ count?: number; data?: { count: number }; unreadCount?: number }>("/notifications/unread-count").then(
      (r) => r.data.count ?? r.data.data?.count ?? r.data.unreadCount ?? 0
    ),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}).then((r) => r.data),
  markAllRead: () => api.patch("/notifications/read-all", {}).then((r) => r.data),
  archive: (id: string) => api.patch(`/notifications/${id}/archive`, {}).then((r) => r.data),
  remove: (id: string) => api.delete(`/notifications/${id}/delete`).then((r) => r.data),
  getPreferences: () => api.get("/notifications/preferences").then((r) => r.data),
  updatePreferences: (body: Record<string, unknown>) =>
    api.put("/notifications/update-preferences", body).then((r) => r.data),
};

// ─── Insights / study plans ────────────────────────────────────────────────
export const insightsService = {
  dashboard: () => api.get("/insights/dashboard").then((r) => r.data.data ?? r.data),
  reports: (params: { page?: number; limit?: number } = {}) =>
    api.get("/insights/reports", { params }).then((r) => r.data.data ?? r.data),
  listStudyPlans: () => api.get("/insights/study-plan").then((r) => r.data.data ?? r.data),
  getStudyPlan: (planId: string) =>
    api.get(`/insights/study-plan/${planId}`).then((r) => r.data.data ?? r.data),
  generateStudyPlan: (body: Record<string, unknown>) =>
    api.post("/insights/study-plan/generate", body).then((r) => r.data.data ?? r.data),
  setStudyPlanStatus: (planId: string, status: string) =>
    api.put(`/insights/study-plan/${planId}/status`, { status }).then((r) => r.data),
};

// ─── Analytics ─────────────────────────────────────────────────────────────
export const analyticsService = {
  interviewSessions: (params: Record<string, unknown> = {}) =>
    api.get("/analytics/interview/sessions", { params }).then((r) => r.data.data ?? r.data),
  sessionInsights: (sessionId: string) =>
    api.get(`/analytics/interview/sessions/${sessionId}/insights`).then((r) => r.data.data ?? r.data),
  studentActivity: (params: Record<string, unknown> = {}) =>
    api.get("/analytics/activity/student", { params }).then((r) => r.data.data ?? r.data),
  proctorStudentReport: (params: Record<string, unknown> = {}) =>
    api.get("/analytics/proctor/student-report", { params }).then((r) => r.data.data ?? r.data),
};

// ─── Resume ────────────────────────────────────────────────────────────────
export const resumeService = {
  history: (params: Record<string, unknown> = {}) =>
    api.get("/resume/history", { params }).then((r) => {
      const d = r.data;
      return {
        items: (Array.isArray(d.resumes) ? d.resumes : d.data ?? []) as Record<string, unknown>[],
        totalPages: d.pagination?.totalPages ?? d.pagination?.pages ?? 1,
        total: d.pagination?.total ?? 0,
      };
    }),
  get: (id: string) => api.get(`/resume/${id}`).then((r) => r.data.resume ?? r.data.data ?? r.data),
  analyses: (params: Record<string, unknown> = {}) =>
    api.get("/resume/analyses", { params }).then((r) => {
      const d = r.data;
      return {
        items: (Array.isArray(d.analyses) ? d.analyses : d.data ?? []) as Record<string, unknown>[],
        totalPages: d.pagination?.totalPages ?? 1,
        total: d.pagination?.total ?? 0,
      };
    }),
  analysis: (id: string) =>
    api.get(`/resume/analyses/${id}`).then((r) => r.data.analysis ?? r.data.data ?? r.data),
  removeAnalysis: (id: string) => api.delete(`/resume/analyses/${id}`).then((r) => r.data),
  save: (body: Record<string, unknown>) => api.post("/resume/save", body).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) => api.post(`/resume/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/resume/${id}`).then((r) => r.data),
  analyze: (file: File, opts: { targetRole: string; experienceLevel: string; targetJD?: string }) => {
    const fd = new FormData();
    fd.append("resume", file);
    fd.append("targetRole", opts.targetRole);
    fd.append("experienceLevel", opts.experienceLevel);
    if (opts.targetJD) fd.append("targetJD", opts.targetJD);
    return api
      .post<{ success: boolean; analysis: import("./models").ResumeAnalysis }>("/resume/analyze", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.analysis);
  },
  optimizeAI: (body: Record<string, unknown>) =>
    api.post("/resume/optimize-ai", body).then((r) => r.data.data ?? r.data),
};

// ─── Subscription ──────────────────────────────────────────────────────────
export interface RazorpayCheckout {
  key: string;
  order_id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  customer_email?: string;
  customer_phone?: string;
  callback_url?: string;
  theme?: { color: string };
}

type PlanMap = Record<string, {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  seats: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}>;

export interface QuotaBucket { limit: number; used: number; remaining: number; unlimited: boolean }
export interface TrialBucket { total: number; used: number }
export interface TrialQuota {
  isActive?: boolean;
  mockInterviews?: TrialBucket;
  studentReports?: TrialBucket;
  aiEvaluation?: TrialBucket;
}
export interface Entitlement {
  source: "individual" | "seat" | "trial" | "pending" | "none";
  active: boolean;
  plan?: { planType: string; status: string; endDate?: string; billingCycle?: string; autoRenew?: boolean; features?: Record<string, boolean>; limits?: Record<string, number> };
  seat?: { organizationName: string; allocatedAt?: string | null; planType: string; endDate?: string; features?: Record<string, boolean>; limits?: Record<string, number> };
  trials?: { mockInterviews?: TrialBucket; studentReports?: TrialBucket; aiEvaluation?: TrialBucket };
  quota?: { mockInterviews: QuotaBucket; studentReports: QuotaBucket };
}

const unwrapPlans = (r: { data: { data?: { plans?: PlanMap }; plans?: PlanMap } }): PlanMap =>
  (r.data?.data?.plans ?? r.data?.plans ?? {}) as PlanMap;

export const subscriptionService = {
  /** Returns the STUDENT_PLANS map keyed by plan code (authenticated student). */
  plans: () => api.get("/subscriptions/self/plans").then(unwrapPlans),
  /** Same catalogue, no auth — for the public pricing page. */
  plansPublic: () => api.get("/subscriptions/plans/public").then(unwrapPlans),
  /** Organisation (college) plan catalogue — BASIC / PRO / ENTERPRISE. */
  orgPlans: () => api.get("/subscriptions/plans/org").then(unwrapPlans),
  current: () =>
    api.get("/subscriptions/self/current").then((r) => {
      const d = r.data?.data ?? r.data ?? {};
      return d as {
        subscription: SubscriptionSummary | null;
        seatManagement: unknown;
        trials: TrialQuota | null;
        entitlement: Entitlement;
      };
    }),
  create: (body: { planId: string; billingCycle?: string; autoRenew?: boolean }) =>
    api.post("/subscriptions/self/create", body).then((r) => {
      const d = r.data?.data ?? r.data;
      return d as { subscription: SubscriptionSummary; billing: unknown; paymentLink: RazorpayCheckout; orderId: string };
    }),
  /** College-admin self-serve subscription create. */
  createOrg: (body: { planId: string; seats: number; billingCycle: string; autoRenew?: boolean }) =>
    api.post("/subscriptions/create", body).then((r) => {
      const d = r.data?.data ?? r.data;
      return d as { subscription: SubscriptionSummary; billing: unknown; paymentLink: RazorpayCheckout; orderId: string };
    }),
  cancel: (body: Record<string, unknown>) => api.put("/subscriptions/cancel", body).then((r) => r.data),
  renew: (body: Record<string, unknown>) => api.post("/subscriptions/renew", body).then((r) => r.data),
};

// ─── Billing ───────────────────────────────────────────────────────────────
export const billingService = {
  invoices: (params: Record<string, unknown> = {}) =>
    api.get("/billing/invoices", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.invoices ?? d.data ?? []) as Invoice[];
    }),
  invoice: (id: string) => api.get(`/billing/invoices/${id}`).then((r) => r.data.data ?? r.data),
  initiatePayment: (body: Record<string, unknown>) =>
    api.post("/billing/initiate-payment", body).then((r) => r.data.data ?? r.data),
  verifyPayment: (body: Record<string, unknown>) =>
    api.post("/billing/verify-payment", body).then((r) => r.data.data ?? r.data),
};

// ─── Interview ─────────────────────────────────────────────────────────────
export const interviewService = {
  initialize: (form: FormData) =>
    api
      .post("/interview/initialize", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data ?? r.data),
  /** Server-authoritative session state — powers resume-on-refresh. */
  state: (sessionId: string) =>
    api.get(`/interview/session/${sessionId}/state`).then((r) => (r.data.data ?? r.data) as {
      sessionId: string;
      status: string;
      targetRole: string;
      preferredCodingLanguage: string;
      selectedRounds: string[];
      activeRound: string | null;
      rounds: {
        roundType: string;
        status: "pending" | "active" | "completed";
        endsAt: string | null;
        remainingSeconds: number | null;
        durationSeconds: number | null;
        forceEnded: boolean;
        answeredCount: number;
        servedCount: number;
        providerSessionId: string | null;
        aptitudeTopics: string[];
      }[];
    }),
  terminate: (sessionId: string) =>
    api.post(`/interview/session/${sessionId}/terminate`, {}).then((r) => r.data as { success: boolean; summary?: unknown }),
  submitTechnicalCode: (sessionId: string, body: { questionId: string; code: string; language: string }) =>
    api.post(`/interview/session/${sessionId}/submit-technical`, body).then((r) => r.data),
  initAptitudeBatch: (sessionId: string, topics: string[]) =>
    api
      .post(`/interview/initialize/aptitude-batchSession/${sessionId}`, { topics })
      .then((r) => r.data as { success: boolean; endsAt?: string; durationSeconds?: number; data?: unknown }),
  aptitudeQuestion: (sessionId: string, batchSessionId: string, page: number) =>
    api
      .post(`/interview/aptitude-round-questions/${sessionId}?page=${page}`, { batchSessionId })
      .then((r) => r.data as { success: boolean; question?: Record<string, unknown> }),
  submitAptitude: (sessionId: string, questionId: string, studentAnswer: string) =>
    api
      .post(`/interview/session/${sessionId}/submit-aptitude`, { questionId, studentAnswer })
      .then((r) => r.data as { success: boolean; isCorrect?: boolean; scoreEarned?: number; explanation?: string }),
  codingQuestions: (sessionId: string, page = 1) =>
    api
      .get(`/interview/coding-round-questions/${sessionId}?page=${page}`)
      .then((r) => r.data as { success: boolean; endsAt?: string; durationSeconds?: number; question?: Record<string, unknown> }),
  submitCoding: (sessionId: string, body: { questionId: string; code: string; language: string }) =>
    api.post(`/interview/session/${sessionId}/submit-coding`, body).then((r) => r.data),
  initTechnical: (sessionId: string) =>
    api.post(`/interview/session/${sessionId}/initialize-technical-persona`, {}).then((r) => r.data.data ?? r.data),
  technicalQuestion: (sessionId: string) =>
    api.get(`/interview/technical-round-questions/${sessionId}`).then((r) => r.data.data ?? r.data),
  submitTechnical: (sessionId: string, body: Record<string, unknown>) =>
    api.post(`/interview/session/${sessionId}/submit-technical`, body).then((r) => r.data.data ?? r.data),
  initHr: (sessionId: string) =>
    api.post(`/interview/session/${sessionId}/initialize-hr`, {}).then((r) => r.data.data ?? r.data),
};

// ─── College admin (officer app) ──────────────────────────────────────────
export const collegeAdminService = {
  dashboard: () => api.get("/college-admin/dashboard").then((r) => r.data.data ?? r.data),
  analyticsDashboard: (days = 30) =>
    api.get("/college-admin/analytics/dashboard", { params: { days } }).then((r) => r.data.data ?? r.data),
  studentsWithAnalytics: () =>
    api.get("/college-admin/analytics/students").then((r) => r.data.data ?? r.data),
  students: (params: { page?: number; limit?: number; search?: string; sort?: string; band?: string; branch?: string; graduationYear?: number } = {}) =>
    api.get("/college-admin/students", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return {
        items: (Array.isArray(d) ? d : d.students ?? d.data ?? []) as Record<string, unknown>[],
        total: r.data.pagination?.total ?? d.total ?? 0,
        totalPages: r.data.pagination?.pages ?? r.data.pagination?.totalPages ?? d.totalPages ?? 1,
        page: r.data.pagination?.page ?? params.page ?? 1,
      };
    }),
  studentDetails: (id: string) =>
    api.get(`/college-admin/students/${id}`).then((r) => r.data.data ?? r.data),
  batches: (params: { page?: number; limit?: number } = {}) =>
    api.get("/college-admin/batches", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.batches ?? d.data ?? []) as Record<string, unknown>[];
    }),
  batch: (id: string) => api.get(`/college-admin/batches/${id}`).then((r) => r.data.data ?? r.data),
  createBatch: (body: Record<string, unknown>) =>
    api.post("/college-admin/batches", body).then((r) => r.data),
  updateBatch: (id: string, body: Record<string, unknown>) =>
    api.patch(`/college-admin/batches/${id}`, body).then((r) => r.data),
  archiveBatch: (id: string) => api.patch(`/college-admin/batches/${id}/archive`, {}).then((r) => r.data),
  deleteBatch: (id: string) => api.delete(`/college-admin/batches/${id}`).then((r) => r.data),
  addStudentsToBatch: (id: string, studentIds: string[]) =>
    api.post(`/college-admin/batches/${id}/students`, { studentIds }).then((r) => r.data),
  removeStudentsFromBatch: (id: string, studentIds: string[]) =>
    api.delete(`/college-admin/batches/${id}/students`, { data: { studentIds } }).then((r) => r.data),
  seatSummary: () => api.get("/college-admin/seats/summary").then((r) => r.data.data ?? r.data),
  allocateSeat: (studentId: string) =>
    api.post("/college-admin/seats/allocate", { studentId }).then((r) => r.data),
  releaseSeat: (studentId: string) =>
    api.post("/college-admin/seats/release", { studentId }).then((r) => r.data),
  campaigns: () => api.get("/college-admin/campaigns").then((r) => {
    const d = r.data.data ?? r.data;
    return (Array.isArray(d) ? d : d.campaigns ?? d.data ?? []) as Record<string, unknown>[];
  }),
  createCampaign: (body: Record<string, unknown>) =>
    api.post("/college-admin/campaigns", body).then((r) => r.data),
  updateCampaign: (id: string, body: Record<string, unknown>) =>
    api.patch(`/college-admin/campaigns/${id}`, body).then((r) => r.data),
  assignCampaignToBatches: (campaignId: string, batchIds: string[], deadline?: string) =>
    api.post("/college-admin/campaigns/assign-to-batches", { campaignId, batchIds, deadline }).then((r) => r.data),
  campaignResults: (id: string) =>
    api.get(`/college-admin/campaigns/${id}/results`).then((r) => r.data.data ?? r.data),
  campaignAssignments: (id: string) =>
    api.get(`/college-admin/campaigns/${id}/assignments`).then((r) => r.data.data ?? r.data),
  revokeCampaignAssignment: (campaignId: string, batchId: string) =>
    api.patch(`/college-admin/campaigns/${campaignId}/assignments/${batchId}/revoke`, {}).then((r) => r.data),
  batchCampaigns: (batchId: string) =>
    api.get(`/college-admin/batches/${batchId}/campaigns`).then((r) => r.data.data ?? r.data),
  organization: () => api.get("/college-admin/organization/me").then((r) => r.data.data ?? r.data),
  updateOrganization: (body: Record<string, unknown>) =>
    api.put("/college-admin/update/organization/me", body).then((r) => r.data),
  reportsDashboard: (params: Record<string, unknown> = {}) =>
    api.get("/college-admin/reports/dashboard", { params }).then((r) => r.data.data ?? r.data),
  universityInsights: (params: Record<string, unknown> = {}) =>
    api.get("/college-admin/insights/university-level", { params }).then((r) => r.data.data ?? r.data),
  askInsights: (question: string) =>
    api.post("/college-admin/insights/ask", { question }).then((r) => (r.data.data ?? r.data) as { question: string; answer: string }),
  topCandidates: (params: Record<string, unknown> = {}) =>
    api.get("/college-admin/insights/top-candidates", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.data ?? []) as Record<string, unknown>[];
    }),
  decliningStudents: (params: Record<string, unknown> = {}) =>
    api.get("/college-admin/insights/declining-students", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.students ?? d.data ?? []) as Record<string, unknown>[];
    }),
  workshopRecommendations: () =>
    api.get("/college-admin/insights/workshop-recommendations").then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.recommendations ?? d.data ?? []) as Record<string, unknown>[];
    }),
  sendBulkNotification: (body: Record<string, unknown>) =>
    api.post("/college-admin/notifications/send-bulk", body).then((r) => r.data),
};

// ─── Super admin (admin app) ──────────────────────────────────────────────
const listFrom = (raw: unknown, ...keys: string[]): Record<string, unknown>[] => {
  const r = raw as Record<string, unknown>;
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  const d = (r?.data ?? r) as Record<string, unknown>;
  if (Array.isArray(d)) return d as unknown as Record<string, unknown>[];
  for (const k of [...keys, "data", "items"]) if (Array.isArray(d?.[k])) return d[k] as Record<string, unknown>[];
  return [];
};

export const superAdminService = {
  pendingApprovals: () =>
    api.get("/super-admin/pending-approvals").then((r) => listFrom(r.data, "pendingAdmins", "pending", "admins", "colleges")),
  approveCollege: (id: string) =>
    api.patch(`/super-admin/approve-college-admin/${id}`, {}).then((r) => r.data),
  rejectCollege: (id: string, reason?: string) =>
    api.patch(`/super-admin/reject-college-admin/${id}`, {}, { params: reason ? { reason } : {} }).then((r) => r.data),
  overview: () => api.get("/super-admin/overview").then((r) => r.data.data ?? r.data),
  analyticsOverview: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/analytics/overview", { params }).then((r) => r.data.data ?? r.data),
  riskTrend: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/analytics/risk-trend", { params }).then((r) => {
      const d = r.data.data ?? r.data;
      return (Array.isArray(d) ? d : d.data ?? []) as Record<string, unknown>[];
    }),
  violationAnalytics: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/analytics/violations", { params }).then((r) => r.data.data ?? r.data),
  interviewHeatmap: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/analytics/interview-heatmap", { params }).then((r) => r.data.data ?? r.data),
  organizations: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/organizations", { params }).then((r) => listFrom(r.data, "organizations", "orgs")),
  students: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/students", { params }).then((r) => ({
      items: listFrom(r.data, "students"),
      total: r.data.pagination?.total ?? 0,
      pages: r.data.pagination?.pages ?? 1,
      page: r.data.pagination?.page ?? 1,
    })),
  updateUserStatus: (userId: string, status: string) =>
    api.patch(`/super-admin/users/${userId}/status`, { status }).then((r) => r.data),
  auditLogs: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/audit-logs", { params }).then((r) => listFrom(r.data, "auditLogs", "logs")),
  auditSummary: (params: Record<string, unknown> = {}) =>
    api.get("/super-admin/audit-logs/summary", { params }).then((r) => r.data.data ?? r.data),
  allSubscriptions: (params: Record<string, unknown> = {}) =>
    api.get("/subscriptions/all", { params }).then((r) => listFrom(r.data, "subscriptions")),
  subscriptionStats: () => api.get("/subscriptions/stats").then((r) => r.data.data ?? r.data),
};

export type { InterviewSession };
