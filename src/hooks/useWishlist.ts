"use client";

import { useWishlistStore } from "@/store/wishlistStore";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { getApiError } from "@/lib/api";

export function useWishlist() {
  const store = useWishlistStore();
  const toast = useToast();
  const { isAuthenticated } = useAuthStore();

  const toggleWishlist = async (productId: string, productName?: string) => {
    if (!isAuthenticated) {
      toast("Please sign in to save items to your wishlist", "default");
      return;
    }
    try {
      const action = await store.toggleItem(productId);
      if (action === "added") {
        toast(
          productName
            ? `"${productName}" saved to wishlist`
            : "Added to wishlist",
          "success",
        );
      } else {
        toast("Removed from wishlist", "default");
      }
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await store.removeItem(productId);
      toast("Removed from wishlist", "default");
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  const clearWishlist = async () => {
    try {
      await store.clearWishlist();
      toast("Wishlist cleared", "default");
    } catch (error) {
      toast(getApiError(error), "error");
    }
  };

  return {
    items: store.items,
    productIds: store.productIds,
    itemCount: store.itemCount,
    isLoading: store.isLoading,
    isInWishlist: store.isInWishlist,
    fetchWishlist: store.fetchWishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
  };
}
