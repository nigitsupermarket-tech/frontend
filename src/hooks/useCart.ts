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

export function useCart() {
  const store = useCartStore();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // addToCart accepts optional product metadata needed for guest display
  const addToCart = async (productId: string, quantity = 1, meta?: ProductMeta) => {
    try {
      await store.addItem(productId, quantity, meta ? {
        price: meta.price,
        name: meta.name,
        image: meta.image || "",
        sku: meta.sku,
        stockQuantity: meta.stockQuantity,
      } : undefined);
      toast("Added to cart", "success");
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    try {
      await store.updateItem(itemId, quantity);
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await store.removeItem(itemId);
      toast("Item removed", "default");
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  const clearCart = async () => {
    try {
      await store.clearCart();
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  // Derive display items — for guest show guestItems, for auth show items
  const displayItems = isAuthenticated
    ? store.items
    : store.guestItems.map((g) => ({
        id: g.productId, // use productId as id for guest items
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
