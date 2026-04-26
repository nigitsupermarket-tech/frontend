"use client";
// frontend/src/store/cartStore.ts
//
// GUEST CART STRATEGY
// ───────────────────
// Problem: calling POST /api/v1/cart for guests hit a race condition on the
// unique index of `carts.sessionId` (fixed in the backend too), and caused
// confusing "C: C already exists" errors in the toast.
//
// New approach:
//   - GUEST (not logged in): cart items live ONLY in Zustand + localStorage.
//     Zero API calls. Fast, offline-friendly, no DB race conditions.
//   - LOGGED IN: cart syncs with the backend as before.
//   - On LOGIN: guest items from localStorage are sent to POST /api/v1/cart/merge
//     which adds them on top of any existing server-side cart, then clears localStorage.
//
// The `isGuest` flag in the store controls which path each action takes.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface GuestCartItem {
  productId: string;
  quantity: number;
  price: number;
  // Enough display info to show the cart drawer without an API fetch
  name: string;
  image: string;
  sku?: string;
  stockQuantity: number;
}

interface CartStore {
  // Authenticated cart (from backend)
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
  isOpen: boolean;

  // Guest cart (localStorage only)
  guestItems: GuestCartItem[];

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number, productMeta?: Partial<GuestCartItem>) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeCart: () => Promise<void>;

  // Guest-specific
  addGuestItem: (item: GuestCartItem) => void;
  updateGuestItem: (productId: string, quantity: number) => void;
  removeGuestItem: (productId: string) => void;
  clearGuestCart: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const calcTotals = (items: CartItem[]) => ({
  subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  itemCount: items.reduce((s, i) => s + i.quantity, 0),
});

const calcGuestTotals = (items: GuestCartItem[]) => ({
  subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  itemCount: items.reduce((s, i) => s + i.quantity, 0),
});

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      itemCount: 0,
      isLoading: false,
      isOpen: false,
      guestItems: [],

      fetchCart: async () => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (!isAuth) {
          // For guest, derive totals from guestItems
          const { guestItems } = get();
          const totals = calcGuestTotals(guestItems);
          set({ subtotal: totals.subtotal, itemCount: totals.itemCount });
          return;
        }

        set({ isLoading: true });
        try {
          const res = await apiGet<{
            success: boolean;
            data: { items: CartItem[]; summary: { subtotal: number; itemCount: number } };
          }>("/cart");
          const { items, summary } = res.data;
          set({ items: items || [], subtotal: summary?.subtotal || 0, itemCount: summary?.itemCount || 0 });
        } catch {
          set({ items: [], subtotal: 0, itemCount: 0 });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantity, productMeta) => {
        const isAuth = useAuthStore.getState().isAuthenticated;

        if (!isAuth) {
          // ── GUEST: store locally, never call the API ──────────────────────
          const { guestItems } = get();
          const existing = guestItems.find((i) => i.productId === productId);

          if (existing) {
            const updated = guestItems.map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            );
            const totals = calcGuestTotals(updated);
            set({ guestItems: updated, ...totals, isOpen: true });
          } else {
            // productMeta must be supplied by the caller for guest mode
            const newItem: GuestCartItem = {
              productId,
              quantity,
              price: productMeta?.price || 0,
              name: productMeta?.name || "Product",
              image: productMeta?.image || "",
              sku: productMeta?.sku,
              stockQuantity: productMeta?.stockQuantity || 999,
            };
            const updated = [...guestItems, newItem];
            const totals = calcGuestTotals(updated);
            set({ guestItems: updated, ...totals, isOpen: true });
          }
          return;
        }

        // ── AUTHENTICATED: call the API ───────────────────────────────────
        set({ isLoading: true });
        try {
          const res = await apiPost<{
            success: boolean;
            data: { cart: { items: CartItem[] }; summary: { subtotal: number; itemCount: number } };
          }>("/cart", { productId, quantity });

          const { cart, summary } = res.data;
          set({ items: cart.items, subtotal: summary.subtotal, itemCount: summary.itemCount, isOpen: true });
        } finally {
          set({ isLoading: false });
        }
      },

      addGuestItem: (item) => {
        const { guestItems } = get();
        const existing = guestItems.find((i) => i.productId === item.productId);
        const updated = existing
          ? guestItems.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i)
          : [...guestItems, item];
        set({ guestItems: updated, ...calcGuestTotals(updated), isOpen: true });
      },

      updateGuestItem: (productId, quantity) => {
        const { guestItems } = get();
        const updated = quantity <= 0
          ? guestItems.filter((i) => i.productId !== productId)
          : guestItems.map((i) => i.productId === productId ? { ...i, quantity } : i);
        set({ guestItems: updated, ...calcGuestTotals(updated) });
      },

      removeGuestItem: (productId) => {
        const { guestItems } = get();
        const updated = guestItems.filter((i) => i.productId !== productId);
        set({ guestItems: updated, ...calcGuestTotals(updated) });
      },

      clearGuestCart: () => {
        set({ guestItems: [], subtotal: 0, itemCount: 0 });
      },

      updateItem: async (itemId, quantity) => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (!isAuth) {
          // For guest, itemId is actually productId in guest mode
          get().updateGuestItem(itemId, quantity);
          return;
        }
        set({ isLoading: true });
        try {
          await apiPut(`/cart/${itemId}`, { quantity });
          await get().fetchCart();
        } finally { set({ isLoading: false }); }
      },

      removeItem: async (itemId) => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (!isAuth) {
          get().removeGuestItem(itemId);
          return;
        }
        const prevItems = get().items;
        const newItems = prevItems.filter((i) => i.id !== itemId);
        set({ items: newItems, ...calcTotals(newItems) });
        try {
          await apiDelete(`/cart/${itemId}`);
          await get().fetchCart();
        } catch {
          set({ items: prevItems, ...calcTotals(prevItems) });
        }
      },

      clearCart: async () => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (!isAuth) { get().clearGuestCart(); return; }
        const prevItems = get().items;
        set({ items: [], subtotal: 0, itemCount: 0 });
        try { await apiDelete("/cart"); }
        catch { set({ items: prevItems, ...calcTotals(prevItems) }); }
      },

      // Called after successful login — pushes guest items to the server cart
      mergeCart: async () => {
        const { guestItems } = get();

        // First call the server merge endpoint (merges session cookie cart)
        try { await apiPost("/cart/merge"); } catch {}

        // Then push any localStorage guest items to the server cart
        if (guestItems.length > 0) {
          for (const guestItem of guestItems) {
            try {
              await apiPost("/cart", {
                productId: guestItem.productId,
                quantity: guestItem.quantity,
              });
            } catch {}
          }
          // Clear guest items after merge
          set({ guestItems: [] });
        }

        // Fetch the final merged cart from server
        await get().fetchCart();
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "nigitriple-cart",
      storage: createJSONStorage(() => localStorage),
      // Only persist guest items — authenticated cart is always fetched fresh
      partialize: (state) => ({ guestItems: state.guestItems }),
    },
  ),
);

// Selectors
export const useCartItems = () => useCartStore((s) => s.items);
export const useGuestCartItems = () => useCartStore((s) => s.guestItems);
export const useCartCount = () => useCartStore((s) => s.itemCount);
export const useCartSubtotal = () => useCartStore((s) => s.subtotal);
export const useCartOpen = () => useCartStore((s) => s.isOpen);
