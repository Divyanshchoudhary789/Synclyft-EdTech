// Runtime + hooks
export { api, API, API_BASE_URL, apiRequest, toApiError } from "./api/api";
export type { ApiErrorShape } from "./api/api";
export * from "./utils";
export { useAuthStore } from "./store/auth";
export type { User as AuthUser } from "./store/auth";
export { useInterviewStore } from "./store/interview";
export { ThemeProvider, useTheme, themeInitScript } from "./theme";

// Backend response models + service functions + React Query hooks
export * from "./api/models";
export * as services from "./api/services";
export {
  authService,
  studentService,
  notificationService,
  insightsService,
  analyticsService,
  resumeService,
  subscriptionService,
  billingService,
  interviewService,
  collegeAdminService,
  superAdminService,
} from "./api/services";

// Legacy mock-era type shapes (superseded incrementally)
export * as Types from "./api/types";
