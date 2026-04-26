"use client";

import { create } from "zustand";
import { Product } from "@/types";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

// ✅ FIX: Replaced Set<string> with string[] for productIds.
//
// Zustand 5 uses shallow equality checks on state slices. A JavaScript Set
// is compared by reference, not by contents — so `new Set(prev)` always
// produces a new reference and triggers a re-render even when the contents
// are identical. This causes unnecessary re-renders of every component that
// subscribes to productIds (header wishlist count, product cards, etc.).
//
// Using a plain string[] and a helper function to check membership is
// equivalent in performance and works correctly with Zustand 5's diffing.

export interface WishlistItem {
  id: string;
  productId: string;
  wishlistId: string;
  createdAt: string;
  product: Product;
}

interface WishlistStore {
  items: WishlistItem[];
  productIds: string[];      // ← was Set<string>
  itemCount: number;
  isLoading: boolean;

  fetchWishlist: () => Promise<void>;
  toggleItem: (productId: string) => Promise<"added" | "removed">;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  productIds: [],
  itemCount: 0,
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet<{
        success: boolean;
        data: {
          items: WishlistItem[];
          productIds: string[];
          itemCount: number;
        };
      }>("/wishlist");
      const { items, productIds, itemCount } = res.data;
      set({
        items: items ?? [],
        productIds: productIds ?? [],
        itemCount: itemCount ?? 0,
      });
    } catch {
      set({ items: [], productIds: [], itemCount: 0 });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleItem: async (productId: string) => {
    const prevIds = get().productIds;
    const prevItems = get().items;
    const isIn = prevIds.includes(productId);

    // Optimistic update
    const nextIds = isIn
      ? prevIds.filter((id) => id !== productId)
      : [...prevIds, productId];
    set({ productIds: nextIds, itemCount: nextIds.length });

    try {
      const res = await apiPost<{
        success: boolean;
        data: {
          action: "added" | "removed";
          productIds: string[];
          itemCount: number;
        };
      }>(`/wishlist/${productId}`);

      const { action, productIds, itemCount } = res.data;
      set({ productIds: productIds ?? nextIds, itemCount });

      if (action === "added") {
        // Non-blocking fetch for full item data
        apiGet<{
          success: boolean;
          data: { items: WishlistItem[]; productIds: string[]; itemCount: number };
        }>("/wishlist")
          .then((r) => set({ items: r.data.items ?? [] }))
          .catch(() => {});
      } else {
        set({ items: prevItems.filter((i) => i.productId !== productId) });
      }

      return action;
    } catch {
      // Revert on failure
      set({ productIds: prevIds, itemCount: prevIds.length, items: prevItems });
      return isIn ? "removed" : "added";
    }
  },

  removeItem: async (productId: string) => {
    const prevIds = get().productIds;
    const prevItems = get().items;
    const nextIds = prevIds.filter((id) => id !== productId);
    set({
      productIds: nextIds,
      itemCount: nextIds.length,
      items: prevItems.filter((i) => i.productId !== productId),
    });
    try {
      await apiDelete(`/wishlist/${productId}`);
    } catch {
      set({ productIds: prevIds, itemCount: prevIds.length, items: prevItems });
    }
  },

  clearWishlist: async () => {
    const prev = {
      items: get().items,
      productIds: get().productIds,
      itemCount: get().itemCount,
    };
    set({ items: [], productIds: [], itemCount: 0 });
    try {
      await apiDelete("/wishlist");
    } catch {
      set(prev);
    }
  },

  isInWishlist: (productId: string) => get().productIds.includes(productId),
}));

// Selectors
export const useWishlistCount = () => useWishlistStore((s) => s.itemCount);
export const useWishlistIds = () => useWishlistStore((s) => s.productIds);
