"use client";
// frontend/src/store/cartStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface GuestCartItem {
  productId: string;
  quantity: number; // float for scalable (e.g. 1.5 for 1.5 kg)
  price: number; // pricePerUnit for scalable, product.price for fixed
  name: string;
  image: string;
  sku?: string;
  stockQuantity: number;
  // scalable-specific
  isScalable?: boolean;
  scaleUnit?: string;
  scaleStep?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
}

interface CartStore {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
  isOpen: boolean;
  guestItems: GuestCartItem[];

  fetchCart: () => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    productMeta?: Partial<GuestCartItem>,
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  mergeCart: () => Promise<void>;

  addGuestItem: (item: GuestCartItem) => void;
  updateGuestItem: (productId: string, quantity: number) => void;
  removeGuestItem: (productId: string) => void;
  clearGuestCart: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

// itemCount = number of distinct line items in cart (not sum of quantities)
// This is what the header badge and UI labels should show.
// Summing float quantities (e.g. 3.7 kg + 2 units = 5.7) is meaningless for display.
const calcTotals = (items: CartItem[]) => ({
  subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  itemCount: items.length,
});

const calcGuestTotals = (items: GuestCartItem[]) => ({
  subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  itemCount: items.length,
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
          const { guestItems } = get();
          set({ ...calcGuestTotals(guestItems) });
          return;
        }
        set({ isLoading: true });
        try {
          const res = await apiGet<{
            success: boolean;
            data: {
              items: CartItem[];
              summary: { subtotal: number; itemCount: number };
            };
          }>("/cart");
          const { items, summary } = res.data;
          const cartItems = items || [];
          set({
            items: cartItems,
            subtotal: summary?.subtotal || 0,
            // Use items.length — server summary.itemCount sums float quantities
            // which shows wrong numbers (e.g. 3.7) in the header badge
            itemCount: cartItems.length,
          });
        } catch {
          // Do NOT wipe items on a failed fetch
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, quantity, productMeta) => {
        const isAuth = useAuthStore.getState().isAuthenticated;

        if (!isAuth) {
          const { guestItems } = get();
          const existing = guestItems.find((i) => i.productId === productId);
          if (existing) {
            // For scalable: add float amounts; for fixed: add integers
            const step = existing.scaleStep || 0.1;
            const newQty = existing.isScalable
              ? parseFloat(
                  (
                    Math.round((existing.quantity + quantity) / step) * step
                  ).toFixed(10),
                )
              : existing.quantity + quantity;
            const maxQty =
              existing.maxOrderQty ??
              (existing.isScalable ? existing.stockQuantity : 999);
            const clamped = Math.min(newQty, maxQty);
            const updated = guestItems.map((i) =>
              i.productId === productId ? { ...i, quantity: clamped } : i,
            );
            set({
              guestItems: updated,
              ...calcGuestTotals(updated),
              isOpen: true,
            });
          } else {
            const newItem: GuestCartItem = {
              productId,
              quantity,
              price: productMeta?.price || 0,
              name: productMeta?.name || "Product",
              image: productMeta?.image || "",
              sku: productMeta?.sku,
              stockQuantity: productMeta?.stockQuantity || 999,
              isScalable: productMeta?.isScalable,
              scaleUnit: productMeta?.scaleUnit,
              scaleStep: productMeta?.scaleStep,
              minOrderQty: productMeta?.minOrderQty,
              maxOrderQty: productMeta?.maxOrderQty,
            };
            const updated = [...guestItems, newItem];
            set({
              guestItems: updated,
              ...calcGuestTotals(updated),
              isOpen: true,
            });
          }
          return;
        }

        set({ isLoading: true });
        try {
          const res = await apiPost<{
            success: boolean;
            data: {
              cart: { items: CartItem[] };
              summary: { subtotal: number; itemCount: number };
            };
          }>("/cart", { productId, quantity });
          const { cart, summary } = res.data;
          const cartItems = cart.items || [];
          set({
            items: cartItems,
            subtotal: summary.subtotal,
            itemCount: cartItems.length,
            isOpen: true,
          });
        } catch (err) {
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      addGuestItem: (item) => {
        const { guestItems } = get();
        const existing = guestItems.find((i) => i.productId === item.productId);
        const updated = existing
          ? guestItems.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            )
          : [...guestItems, item];
        set({ guestItems: updated, ...calcGuestTotals(updated), isOpen: true });
      },

      updateGuestItem: (productId, quantity) => {
        const { guestItems } = get();
        const updated =
          quantity <= 0
            ? guestItems.filter((i) => i.productId !== productId)
            : guestItems.map((i) =>
                i.productId === productId ? { ...i, quantity } : i,
              );
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
          get().updateGuestItem(itemId, quantity);
          return;
        }

        // Optimistic update
        const prevItems = get().items;
        const optimistic = prevItems.map((i) =>
          i.id === itemId ? { ...i, quantity } : i,
        );
        set({ items: optimistic, ...calcTotals(optimistic) });

        try {
          await apiPut(`/cart/${itemId}`, { quantity });
        } catch (err: any) {
          if (err?.response?.status === 404) {
            await get().fetchCart();
          } else {
            set({ items: prevItems, ...calcTotals(prevItems) });
          }
          throw err;
        }
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
        } catch (err: any) {
          if (err?.response?.status === 404) {
            // already gone — keep optimistic removal
          } else {
            set({ items: prevItems, ...calcTotals(prevItems) });
          }
        }
      },

      clearCart: async () => {
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (!isAuth) {
          get().clearGuestCart();
          return;
        }
        set({ items: [], subtotal: 0, itemCount: 0 });
        try {
          await apiDelete("/cart");
        } catch {}
      },

      mergeCart: async () => {
        const { guestItems } = get();
        try {
          await apiPost("/cart/merge");
        } catch {}
        if (guestItems.length > 0) {
          for (const guestItem of guestItems) {
            try {
              await apiPost("/cart", {
                productId: guestItem.productId,
                quantity: guestItem.quantity,
              });
            } catch {}
          }
          set({ guestItems: [] });
        }
        await get().fetchCart();
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "nigitriple-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestItems: state.guestItems }),
    },
  ),
);

export const useCartItems = () => useCartStore((s) => s.items);
export const useGuestCartItems = () => useCartStore((s) => s.guestItems);
export const useCartCount = () => useCartStore((s) => s.itemCount);
export const useCartSubtotal = () => useCartStore((s) => s.subtotal);
export const useCartOpen = () => useCartStore((s) => s.isOpen);
