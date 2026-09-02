import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * Single shared HTTP client.
 *
 * - `baseURL` already includes `/api` (see NEXT_PUBLIC_Backend_URL), so call
 *   sites use paths like `/auth/user`, `/billing/invoices`.
 * - Auth is cookie-based (httpOnly access + refresh). On a 401 we transparently
 *   hit `/auth/refresh` once and replay the original request. A failed refresh
 *   emits `auth:expired` for the app shell to react to (redirect to /login).
 */

const RAW_BASE =
  process.env.NEXT_PUBLIC_Backend_URL?.replace(/\/+$/, "") ?? "http://localhost:8080/api";

export const API_BASE_URL = RAW_BASE;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
});

// ─── 401 → refresh → retry ──────────────────────────────────────────────────
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<unknown> | null = null;

const isAuthPath = (url?: string) =>
  !!url && (url.includes("/auth/refresh") || url.includes("/auth/login") || url.includes("/auth/logout"));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthPath(original.url)
    ) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? api.post("/auth/refresh");
        await refreshPromise;
        refreshPromise = null;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:expired"));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Small helpers ─────────────────────────────────────────────────────────
export interface ApiErrorShape {
  message: string;
  status?: number;
  /** Machine-readable error code from the API (e.g. "ROUND_TIME_UP"). */
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

export function toApiError(err: unknown): ApiErrorShape {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; code?: string; errors?: ApiErrorShape["errors"] }
      | undefined;
    return {
      message: data?.message ?? err.message ?? "Something went wrong",
      status: err.response?.status,
      code: data?.code,
      errors: data?.errors,
    };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Something went wrong" };
}

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const res = await api.request<T>(config);
  return res.data;
};

export const API = {
  login: "/auth/login",
  users: "/users",
  courses: "/courses",
};
