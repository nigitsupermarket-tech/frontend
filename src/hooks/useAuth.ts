// frontend/src/hooks/useAuth.ts
"use client";

import { useAuthStore } from "@/store/authStore";
import { getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { LoginPayload, RegisterPayload } from "@/types";
import axios from "axios";

export function useAuth() {
  const store = useAuthStore();
  const toast = useToast();
  const mergeCart = useCartStore((s) => s.mergeCart);

  const login = async (payload: LoginPayload, redirectTo = "/") => {
    console.log("[useAuth] login() called | redirectTo=", redirectTo);
    try {
      await store.login(payload);
      console.log("[useAuth] store.login() done | isAuthenticated=", useAuthStore.getState().isAuthenticated);

      await mergeCart();
      console.log("[useAuth] mergeCart() done");

      toast("Welcome back!", "success");

      console.log("[useAuth] Navigating to:", redirectTo);
      // Full navigation so the (customer) layout gets a fresh mount
      // and its useEffect re-runs cleanly on the new page
      window.location.href = redirectTo;
    } catch (error) {
      console.log("[useAuth] login() FAILED:", error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const msg: string = error.response?.data?.message ?? "";
        const isVerifyError = msg.toLowerCase().includes("verify your email");
        if (status !== 400 && !isVerifyError) {
          toast(getApiError(error), "error");
        }
      } else {
        toast(getApiError(error), "error");
      }
      throw error;
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      await store.register(payload);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 400) {
        toast(getApiError(error), "error");
      }
      throw error;
    }
  };

  const logout = async () => {
    console.log("[useAuth] logout()");
    await store.logout();
    toast("Logged out successfully", "default");
    window.location.href = "/";
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    isAdmin: store.user?.role === "ADMIN",
    isStaffOrAdmin: store.user?.role === "ADMIN" || store.user?.role === "STAFF",
    login,
    register,
    logout,
  };
}
