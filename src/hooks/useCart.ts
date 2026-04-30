"use client";
// frontend/src/hooks/useCart.ts

import { useCartStore } from "@/store/cartStore";
import { useToast } from "@/store/uiStore";
import { getApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ProductMeta {
  price: number;
  name: string;
  image?: string;
  sku?: string;
  stockQuantity?: number;
}

// Map raw API error messages to user-friendly equivalents
function friendlyCartError(error: unknown): string {
  const msg = getApiError(error);

  // Already user-friendly messages from our backend — pass through
  if (
    msg.includes("out of stock") ||
    msg.includes("available") ||
    msg.includes("unavailable") ||
    msg.includes("already have all") ||
    msg.includes("can be added")
  ) {
    return msg;
  }

  // Network / timeout
  if (
    msg.toLowerCase().includes("timeout") ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("server")
  ) {
    return "Connection issue — please try again";
  }

  // Cart conflict (the "c already exists" type errors are now caught server-side
  // but handle any that slip through)
  if (
    msg.toLowerCase().includes("conflict") ||
    msg.toLowerCase().includes("already exists") ||
    msg.toLowerCase().includes("duplicate")
  ) {
    return "Cart sync issue — please refresh the page";
  }

  // Generic fallback
  return msg || "Could not update cart — please try again";
}

export function useCart() {
  const store = useCartStore();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const addToCart = async (
    productId: string,
    quantity = 1,
    meta?: ProductMeta,
  ) => {
    try {
      await store.addItem(
        productId,
        quantity,
        meta
          ? {
              price: meta.price,
              name: meta.name,
              image: meta.image || "",
              sku: meta.sku,
              stockQuantity: meta.stockQuantity,
            }
          : undefined,
      );
      toast("Added to cart", "success");
    } catch (error) {
      toast(friendlyCartError(error), "error");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    try {
      await store.updateItem(itemId, quantity);
    } catch (error) {
      const msg = getApiError(error);
      // 404 on update = stale item ID, trigger a re-fetch silently
      if (msg.includes("not found") || msg.includes("404")) {
        await store.fetchCart().catch(() => {});
      } else {
        toast(friendlyCartError(error), "error");
      }
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await store.removeItem(itemId);
      toast("Item removed", "default");
    } catch (error) {
      const msg = getApiError(error);
      if (msg.includes("not found") || msg.includes("404")) {
        // Item already gone — silently re-fetch to sync state
        await store.fetchCart().catch(() => {});
      } else {
        toast(friendlyCartError(error), "error");
      }
    }
  };

  const clearCart = async () => {
    try {
      await store.clearCart();
    } catch (error) {
      toast(friendlyCartError(error), "error");
    }
  };

  // Derive display items — for guest show guestItems, for auth show items
  const displayItems = isAuthenticated
    ? store.items
    : store.guestItems.map((g) => ({
        id: g.productId,
        cartId: "",
        productId: g.productId,
        quantity: g.quantity,
        price: g.price,
        product: {
          id: g.productId,
          name: g.name,
          slug: "",
          images: g.image ? [g.image] : [],
          price: g.price,
          stockQuantity: g.stockQuantity,
          status: "ACTIVE" as const,
          sku: g.sku || "",
        },
      }));

  return {
    items: displayItems,
    subtotal: store.subtotal,
    itemCount: store.itemCount,
    isLoading: store.isLoading,
    isOpen: store.isOpen,
    isGuest: !isAuthenticated,
    guestItems: store.guestItems,
    openCart: store.openCart,
    closeCart: store.closeCart,
    toggleCart: store.toggleCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart: store.fetchCart,
  };
}
