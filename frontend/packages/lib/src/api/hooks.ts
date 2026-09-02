"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentService,
  notificationService,
  subscriptionService,
  billingService,
  insightsService,
  resumeService,
  analyticsService,
} from "./services";

export const qk = {
  dashboard: ["student", "dashboard"] as const,
  progress: ["student", "progress"] as const,
  analytics: (days: number) => ["student", "analytics", days] as const,
  profile: ["student", "profile"] as const,
  notifications: (status?: string) => ["notifications", status ?? "all"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  plans: ["subscription", "plans"] as const,
  currentSub: ["subscription", "current"] as const,
  invoices: ["billing", "invoices"] as const,
  studyPlans: ["insights", "study-plans"] as const,
  insightsDashboard: ["insights", "dashboard"] as const,
  resumeHistory: ["resume", "history"] as const,
};

// ─── Student ───────────────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({ queryKey: qk.dashboard, queryFn: studentService.dashboard });

export const useProgress = () =>
  useQuery({ queryKey: qk.progress, queryFn: studentService.progress });

export const useAnalyticsDashboard = (days = 90) =>
  useQuery({ queryKey: qk.analytics(days), queryFn: () => studentService.analyticsDashboard(days) });

export const useStudentProfile = () =>
  useQuery({ queryKey: qk.profile, queryFn: studentService.getProfile });

// ─── Notifications ─────────────────────────────────────────────────────────
export const useNotifications = (status?: string) =>
  useQuery({
    queryKey: qk.notifications(status),
    queryFn: () => notificationService.list({ status, limit: 30 }),
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: qk.unreadCount,
    queryFn: notificationService.unreadCount,
    refetchInterval: 60_000,
  });

export const useNotificationActions = () => {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return {
    markRead: useMutation({ mutationFn: notificationService.markRead, onSuccess: invalidate }),
    markAllRead: useMutation({ mutationFn: notificationService.markAllRead, onSuccess: invalidate }),
    archive: useMutation({ mutationFn: notificationService.archive, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: notificationService.remove, onSuccess: invalidate }),
  };
};

// ─── Subscription / billing ────────────────────────────────────────────────
export const usePlans = () => useQuery({ queryKey: qk.plans, queryFn: subscriptionService.plans });
export const usePublicPlans = () =>
  useQuery({ queryKey: ["subscription", "plans", "public"], queryFn: subscriptionService.plansPublic, staleTime: 5 * 60_000 });
export const usePublicOrgPlans = () =>
  useQuery({ queryKey: ["subscription", "plans", "org"], queryFn: subscriptionService.orgPlans, staleTime: 5 * 60_000 });
export const useCurrentSubscription = () =>
  useQuery({ queryKey: qk.currentSub, queryFn: subscriptionService.current });
export const useInvoices = () => useQuery({ queryKey: qk.invoices, queryFn: () => billingService.invoices() });

// ─── Insights ──────────────────────────────────────────────────────────────
export const useInsightsDashboard = () =>
  useQuery({ queryKey: qk.insightsDashboard, queryFn: insightsService.dashboard });
export const useStudyPlans = () =>
  useQuery({ queryKey: qk.studyPlans, queryFn: insightsService.listStudyPlans });

// ─── Resume ────────────────────────────────────────────────────────────────
export const useResumeHistory = () =>
  useQuery({ queryKey: qk.resumeHistory, queryFn: resumeService.history });
export const useResumeAnalyses = (page = 1) =>
  useQuery({ queryKey: ["resume", "analyses", page], queryFn: () => resumeService.analyses({ page }) });

// ─── Interview history ─────────────────────────────────────────────────────
export const useInterviewHistory = (limit = 20) =>
  useQuery({
    queryKey: ["interview", "history", limit],
    queryFn: () => analyticsService.interviewSessions({ limit }),
  });

// ─── Study plans ───────────────────────────────────────────────────────────
export const useStudyPlanList = () =>
  useQuery({ queryKey: ["insights", "study-plans"], queryFn: insightsService.listStudyPlans });
export const useStudyPlan = (planId: string | null) =>
  useQuery({ queryKey: ["insights", "study-plan", planId], queryFn: () => insightsService.getStudyPlan(planId as string), enabled: !!planId });

// ─── Student campaigns ─────────────────────────────────────────────────────
export const useStudentCampaigns = () =>
  useQuery({ queryKey: ["student", "campaigns"], queryFn: () => studentService.campaigns() });
