"use client";

// frontend/src/store/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, LoginPayload, RegisterPayload } from "@/types";
import { apiPost, apiGet } from "@/lib/api";
import { useWishlistStore } from "@/store/wishlistStore";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<void>;
  /**
   * ✅ SESSION PERSISTENCE: Called once on app boot.
   * Hits GET /auth/silent-refresh — the server reads the 30-day httpOnly
   * refresh cookie and, if valid, issues new tokens and returns the user.
   * This is a zero-flicker session restore: the user is already "logged in"
   * before the first render completes.
   */
  silentRefresh: () => Promise<boolean>;
}

// ── Cookie sync helper ────────────────────────────────────────────────────────
// The Next.js middleware reads the `sbw-auth` cookie to decide whether to
// redirect unauthenticated users. But Zustand persist writes to localStorage,
// which the middleware can't access. We mirror a small auth snapshot to a
// cookie so the middleware always has accurate data.
function syncAuthCookie(isAuthenticated: boolean, user: User | null) {
  if (typeof document === "undefined") return;
  if (isAuthenticated && user) {
    const payload = JSON.stringify({
      isAuthenticated: true,
      user: { id: user.id, role: user.role },
    });
    // 30-day cookie — matches the refresh token window
    const expires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toUTCString();
    document.cookie = `sbw-auth=${encodeURIComponent(payload)}; path=/; expires=${expires}; SameSite=Strict`;
  } else {
    // Clear it
    document.cookie = "sbw-auth=; path=/; max-age=0; SameSite=Strict";
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      // ── Login ────────────────────────────────────────────────────────────
      login: async (payload) => {
        set({ isLoading: true });
        try {
          const res = await apiPost<{
            success: boolean;
            data: { user: User; accessToken: string; refreshToken: string };
          }>("/auth/login", payload);

          const { user, accessToken, refreshToken } = res.data;

          // Keep localStorage for the axios interceptor (it reads from there)
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);

          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          syncAuthCookie(true, user);

          useWishlistStore.getState().fetchWishlist();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // ── Register ─────────────────────────────────────────────────────────
      register: async (payload) => {
        set({ isLoading: true });
        try {
          await apiPost("/auth/register", payload);
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Logout ───────────────────────────────────────────────────────────
      logout: async () => {
        try {
          await apiPost("/auth/logout");
        } catch {}
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, accessToken: null, isAuthenticated: false });
        syncAuthCookie(false, null);

        useWishlistStore.setState({ items: [], productIds: [], itemCount: 0 });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
        syncAuthCookie(true, user);
      },

      // ✅ Used by the axios interceptor to update the store after a token refresh
      setAccessToken: (token) => {
        set({ accessToken: token });
        localStorage.setItem("accessToken", token);
      },

      // ── Refresh User ─────────────────────────────────────────────────────
      refreshUser: async () => {
        try {
          const res = await apiGet<{ success: boolean; data: { user: User } }>(
            "/auth/me",
          );
          set({ user: res.data.user, isAuthenticated: true });
          syncAuthCookie(true, res.data.user);
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
          syncAuthCookie(false, null);
        }
      },

      // ── Silent Refresh (app boot) ─────────────────────────────────────────
      /**
       * ✅ SESSION PERSISTENCE: The primary session-restore mechanism.
       *
       * Flow:
       *   1. On app mount, call silentRefresh().
       *   2. Server reads the 30-day httpOnly refresh cookie.
       *   3. If valid → returns user + new tokens → store & localStorage updated.
       *   4. If invalid/missing → returns 401 → user is logged out cleanly.
       *
       * Returns true if session was restored, false if the user must log in.
       */
      silentRefresh: async () => {
        try {
          const res = await apiGet<{
            success: boolean;
            data: { user: User; accessToken: string; refreshToken: string };
          }>("/auth/silent-refresh");

          const { user, accessToken, refreshToken } = res.data;

          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);

          set({ user, accessToken, isAuthenticated: true });
          syncAuthCookie(true, user);

          return true;
        } catch {
          // Don't clear if we already have a valid persisted state —
          // a network blip during silent-refresh shouldn't log the user out.
          const current = get();
          if (!current.isAuthenticated) {
            set({ user: null, accessToken: null, isAuthenticated: false });
            syncAuthCookie(false, null);
          }
          return false;
        }
      },

      // ── Check Auth (legacy — now supplementary) ────────────────────────
      /**
       * Secondary auth check using the access token in localStorage.
       * Used as a fallback when silentRefresh already ran and we just want
       * to verify the access token is still good.
       */
      checkAuth: async () => {
        const token = localStorage.getItem("accessToken");
        const currentState = get();

        if (!token) {
          set({ user: null, accessToken: null, isAuthenticated: false });
          syncAuthCookie(false, null);
          return;
        }

        const wasAuthenticated = currentState.isAuthenticated;

        try {
          const res = await apiGet<{ success: boolean; data: { user: User } }>(
            "/auth/me",
          );
          set({
            user: res.data.user,
            accessToken: token,
            isAuthenticated: true,
          });
          syncAuthCookie(true, res.data.user);

          if (!wasAuthenticated) {
            useWishlistStore.getState().fetchWishlist();
          }
        } catch (err: any) {
          const status = err?.response?.status;

          if (status === 401) {
            // Access token is dead — try a silent refresh before giving up
            const restored = await get().silentRefresh();
            if (!restored) {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              set({ user: null, accessToken: null, isAuthenticated: false });
              syncAuthCookie(false, null);
            }
          }
          // Network errors: preserve state silently
        }
      },
    }),
    {
      name: "sbw-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Sync cookie whenever Zustand persist rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncAuthCookie(state.isAuthenticated, state.user);
        }
      },
    },
  ),
);

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsAdmin = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "ADMIN";
};
export const useIsStaffOrAdmin = () => {
  const user = useAuthStore((s) => s.user);
  return user?.role === "ADMIN" || user?.role === "STAFF";
};
