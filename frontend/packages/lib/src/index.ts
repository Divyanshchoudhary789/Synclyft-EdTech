// Runtime + hooks
export { api, API, API_BASE_URL, apiRequest, toApiError } from "./api/api";
export type { ApiErrorShape } from "./api/api";
export * from "./utils";
export { useAuthStore } from "./store/auth";
export type { User as AuthUser } from "./store/auth";
export { useInterviewStore } from "./store/interview";
export { ThemeProvider, useTheme, themeInitScript } from "./theme";

// Domain types (mock-era shapes; superseded incrementally by real API contracts)
export * as Types from "./api/types";
