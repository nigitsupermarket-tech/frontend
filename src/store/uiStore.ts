"use client";

import { create } from "zustand";

type ToastVariant = "default" | "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface UIStore {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismissToast: (id: string) => void;

  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;

  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  quickViewProductId: string | null;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;

  confirmDialog: {
    open: boolean;
    title: string;
    description: string;
    onConfirm: (() => void) | null;
  };
  openConfirm: (
    title: string,
    description: string,
    onConfirm: () => void,
  ) => void;
  closeConfirm: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  toasts: [],
  toast: (message, variant = "default", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }));
    setTimeout(() => get().dismissToast(id), duration);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  mobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),

  quickViewProductId: null,
  openQuickView: (productId) => set({ quickViewProductId: productId }),
  closeQuickView: () => set({ quickViewProductId: null }),

  confirmDialog: { open: false, title: "", description: "", onConfirm: null },
  openConfirm: (title, description, onConfirm) =>
    set({ confirmDialog: { open: true, title, description, onConfirm } }),
  closeConfirm: () =>
    set({
      confirmDialog: {
        open: false,
        title: "",
        description: "",
        onConfirm: null,
      },
    }),
}));

// ─── ToastHelper ────────────────────────────────────────────────────────────
// Returns a callable that also has .error() / .success() / .warning() methods.
// Usage: const toast = useToast(); toast.error("msg"); toast.success("msg");
// Also supports: toast("msg", "error") — the original signature still works.

export interface ToastHelper {
  (message: string, variant?: ToastVariant, duration?: number): void;
  error: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

export const useToast = (): ToastHelper => {
  const raw = useUIStore((s) => s.toast);
  const fn = (message: string, variant?: ToastVariant, duration?: number) =>
    raw(message, variant, duration);
  fn.error = (message: string, duration?: number) =>
    raw(message, "error", duration);
  fn.success = (message: string, duration?: number) =>
    raw(message, "success", duration);
  fn.warning = (message: string, duration?: number) =>
    raw(message, "warning", duration);
  fn.info = (message: string, duration?: number) =>
    raw(message, "default", duration);
  return fn as ToastHelper;
};

export const useToasts = () => useUIStore((s) => s.toasts);
export const useDismissToast = () => useUIStore((s) => s.dismissToast);
