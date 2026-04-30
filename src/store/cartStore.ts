"use client";
// frontend/src/store/cartStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface GuestCartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  sku?: string;
  stockQuantity: number;
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
          set({
            items: items || [],
            subtotal: summary?.subtotal || 0,
            itemCount: summary?.itemCount || 0,
          });
        } catch {
          // Do NOT wipe items on a failed fetch — keep whatever is currently
          // in the store. A failed GET /cart should never blank the cart UI.
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
            const updated = guestItems.map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
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
          set({
            items: cart.items,
            subtotal: summary.subtotal,
            itemCount: summary.itemCount,
            isOpen: true,
          });
        } catch (err) {
          // Re-throw so useCart.addToCart can catch and show the toast
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

        // Optimistic update — update locally first, sync server in background
        const prevItems = get().items;
        const optimistic = prevItems.map((i) =>
          i.id === itemId ? { ...i, quantity } : i,
        );
        set({ items: optimistic, ...calcTotals(optimistic) });

        try {
          await apiPut(`/cart/${itemId}`, { quantity });
          // Optimistic update is already applied — no need to re-fetch.
          // Re-fetching risks wiping the cart if the GET arrives before the
          // PUT commits, or if there's a brief auth/network hiccup.
        } catch (err: any) {
          if (err?.response?.status === 404) {
            // Stale item ID — refresh to get current server state
            await get().fetchCart();
          } else {
            // Real error — revert the optimistic update
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

        // Optimistic removal — remove from UI immediately, no rollback on 404
        const prevItems = get().items;
        const newItems = prevItems.filter((i) => i.id !== itemId);
        set({ items: newItems, ...calcTotals(newItems) });

        try {
          await apiDelete(`/cart/${itemId}`);
          // Optimistic removal is already applied — only re-fetch if needed
        } catch (err: any) {
          if (err?.response?.status === 404) {
            // Already gone — optimistic removal was correct, keep it
          } else {
            // Real error — restore the item
            set({ items: prevItems, ...calcTotals(prevItems) });
          }
        }
        // Re-fetch only to sync fresh IDs (e.g. after a 404 stale-ID case above).
        // We skip this on success because the optimistic state is already correct
        // and a re-fetch risks a brief empty-cart flash if GET is slow.
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
