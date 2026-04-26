// frontend/src/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true, // ✅ Sends httpOnly cookies (refresh token) automatically
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor ───────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Auth redirect ─────────────────────────────────────────────────────────
function redirectToLogin() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  const current = window.location.pathname;
  if (!current.startsWith("/login")) {
    window.location.href = "/login";
  }
}

// ─── Response interceptor ──────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _skipAuthRedirect?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url ?? "";
      const isAuthMe = url.includes("/auth/me");
      const isRefreshEndpoint = url.includes("/auth/refresh-token");
      const isSilentRefresh = url.includes("/auth/silent-refresh");
      const skipIntercept =
        originalRequest._skipAuthRedirect ||
        isAuthMe ||
        isRefreshEndpoint ||
        isSilentRefresh;

      if (skipIntercept) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true },
        );

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // ✅ SESSION PERSISTENCE: Update the Zustand store so the in-memory
        // accessToken stays in sync after a silent refresh. Without this, the
        // store's accessToken goes stale and persisted state is wrong on next boot.
        if (typeof window !== "undefined") {
          import("@/store/authStore").then(({ useAuthStore }) => {
            useAuthStore.getState().setAccessToken(newAccessToken);
          });
        }

        refreshQueue.forEach((cb) => cb(newAccessToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        refreshQueue = [];

        import("@/store/authStore").then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
        redirectToLogin();

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Typed request helpers ─────────────────────────────────────────────────
export const apiGet = async <T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> => {
  const { data } = await api.get<T>(url, { params });
  return data;
};

export const apiPost = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await api.post<T>(url, body);
  return data;
};

export const apiPut = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await api.put<T>(url, body);
  return data;
};

export const apiPatch = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await api.patch<T>(url, body);
  return data;
};

export const apiDelete = async <T>(url: string, body?: unknown): Promise<T> => {
  const { data } = await api.delete<T>(url, body ? { data: body } : undefined);
  return data;
};

export const apiUpload = async <T>(
  url: string,
  formData: FormData,
): Promise<T> => {
  const { data } = await api.post<T>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors
        .map((err: any) => `${err.field}: ${err.message}`)
        .join(", ");
    }
    return data?.message || error.message || "An error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
};

export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.errors && Array.isArray(data.errors)) {
      const fieldErrors: Record<string, string> = {};
      data.errors.forEach((err: any) => {
        if (err.field) fieldErrors[err.field] = err.message;
      });
      return fieldErrors;
    }
  }
  return {};
};

export default api;
