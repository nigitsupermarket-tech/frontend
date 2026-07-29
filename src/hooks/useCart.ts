"use client";
// frontend/src/hooks/useCart.ts

import { useCartStore } from "@/store/cartStore";
import { useToast } from "@/store/uiStore";
import { getApiError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ProductMeta {
  price: number; // pricePerUnit for scalable, product.price for fixed, variation.price for a variation
  name: string;
  image?: string;
  sku?: string;
  stockQuantity?: number;
  // scalable metadata — must be passed for scalable products
  isScalable?: boolean;
  scaleUnit?: string;
  scaleStep?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  // structured variation — set when adding a specific preset (e.g. "500g Pack")
  variationId?: string;
  variationLabel?: string;
}

function friendlyCartError(error: unknown): string {
  const msg = getApiError(error);
  if (
    msg.includes("out of stock") ||
    msg.includes("available") ||
    msg.includes("unavailable") ||
    msg.includes("already have all") ||
    msg.includes("can be added")
  ) {
    return msg;
  }
  if (
    msg.toLowerCase().includes("timeout") ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("server")
  ) {
    return "Connection issue — please try again";
  }
  if (
    msg.toLowerCase().includes("conflict") ||
    msg.toLowerCase().includes("already exists") ||
    msg.toLowerCase().includes("duplicate")
  ) {
    return "Cart sync issue — please refresh the page";
  }
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
              // Pass scalable metadata through so drawer/cart page renders correctly
              isScalable: meta.isScalable,
              scaleUnit: meta.scaleUnit,
              scaleStep: meta.scaleStep,
              minOrderQty: meta.minOrderQty,
              maxOrderQty: meta.maxOrderQty,
              // Structured variation — needed both for guest-cart display and
              // to reach the backend on the authenticated add-to-cart call.
              variationId: meta.variationId,
              variationLabel: meta.variationLabel,
            }
          : undefined,
      );
      toast("Added to cart", "success");
    } catch (error) {
      toast(friendlyCartError(error), "error");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    // Allow float quantities for scalable products — only skip true removal (< minQty handled upstream)
    if (quantity <= 0) return;
    try {
      await store.updateItem(itemId, quantity);
    } catch (error) {
      const msg = getApiError(error);
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

  // Derive display items — guest uses local GuestCartItem, auth uses server CartItem
  const displayItems = isAuthenticated
    ? store.items
    : store.guestItems.map((g) => ({
        // Composite id so multiple variations of the same product don't
        // collide when updating/removing a single line (see cartStore.ts).
        id: g.variationId ? `${g.productId}::${g.variationId}` : g.productId,
        cartId: "",
        productId: g.productId,
        quantity: g.quantity,
        price: g.price,
        variationId: g.variationId,
        variationLabel: g.variationLabel,
        // Expose scalable fields directly on item (for guest path)
        isScalable: g.isScalable,
        scaleUnit: g.scaleUnit,
        scaleStep: g.scaleStep,
        minOrderQty: g.minOrderQty,
        maxOrderQty: g.maxOrderQty,
        product: {
          id: g.productId,
          name: g.name,
          slug: "",
          images: g.image ? [g.image] : [],
          price: g.price,
          pricePerUnit: g.isScalable ? g.price : undefined,
          isScalable: g.isScalable,
          scaleUnit: g.scaleUnit,
          scaleStep: g.scaleStep,
          minOrderQty: g.minOrderQty,
          maxOrderQty: g.maxOrderQty,
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
