// frontend/src/hooks/useProducts.ts
//
// ✅ UPDATED: useProducts now reads from the global productStore cache.
//
// All existing call sites (home page sections, featured products, etc.) keep
// working without any changes. The only difference is that fetches are now
// deduplicated — if two components ask for the same query, only one HTTP
// request is made and both get the same cached result.
//
// The individual helpers (useProduct, useFeaturedProducts, useNewArrivals) are
// unchanged — they each have their own API endpoint and don't benefit from the
// same cache key, so they keep their own local state.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Product, Pagination } from "@/types";
import { apiGet, getApiError } from "@/lib/api";
import { useProductStore } from "@/store/productStore";

interface ProductFilters {
  search?: string;
  categoryId?: string;
  brandId?: string | string[]; // ✅ Now accepts array for multi-select
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  tags?: string[];
  sort?: "random" | "newest" | "price_asc" | "price_desc" | "popular" | "name";
  page?: number;
  limit?: number;
}

interface UseProductsReturn {
  products: Product[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ✅ useProducts now delegates to the global cached store.
// - Same interface as before (filters object → products/pagination/isLoading/error/refetch)
// - Results are cached by query string — navigating back is instant
// - brandId accepts string | string[] for multi-brand filtering
export function useProducts(filters: ProductFilters = {}): UseProductsReturn {
  const { products, pagination, isLoading, error, fetchProducts } = useProductStore();

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) return;
      if (key === "brandId" && Array.isArray(value)) {
        if (value.length > 0) params.set("brandId", value.join(","));
      } else if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.join(","));
      } else {
        params.set(key, String(value));
      }
    });
    // Default to active products
    if (!params.has("status")) params.set("status", "ACTIVE");
    return params.toString();
  }, [JSON.stringify(filters)]);

  const query = buildQuery();

  useEffect(() => {
    fetchProducts(query);
  }, [query, fetchProducts]);

  const refetch = useCallback(() => {
    // Invalidate this specific query from cache then re-fetch
    useProductStore.getState().invalidate(query);
    fetchProducts(query);
  }, [query, fetchProducts]);

  return { products, pagination, isLoading, error, refetch };
}

// ─── Single product (not cached — each product has its own endpoint) ──────────
export function useProduct(idOrSlug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) {
      console.warn("[useProduct] ⚠️ No idOrSlug provided, aborting fetch");
      return;
    }
    console.log("[useProduct] 🔵 Fetching product:", idOrSlug);
    setIsLoading(true);
    apiGet<{ success: boolean; data: { product: Product } }>(
      `/products/${idOrSlug}`,
    )
      .then((res) => {
        console.log("[useProduct] ✅ Product received:", res.data.product?.name, "id:", res.data.product?.id);
        setProduct(res.data.product);
      })
      .catch((err) => {
        console.error("[useProduct] ❌ Fetch failed for:", idOrSlug, "| error:", getApiError(err));
        setError(getApiError(err));
      })
      .finally(() => {
        console.log("[useProduct] 🏁 Fetch complete for:", idOrSlug);
        setIsLoading(false);
      });
  }, [idOrSlug]);

  return { product, isLoading, error };
}

// ─── Featured products (own endpoint, own local state) ────────────────────────
export function useFeaturedProducts(limit = 8) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<{ success: boolean; data: { products: Product[] } }>(
      "/products/featured",
    )
      .then((res) => setProducts(res.data.products.slice(0, limit)))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [limit]);

  return { products, isLoading };
}

// ─── New arrivals (own endpoint, own local state) ─────────────────────────────
export function useNewArrivals(limit = 8) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<{ success: boolean; data: { products: Product[] } }>(
      "/products/new-arrivals",
    )
      .then((res) => setProducts(res.data.products.slice(0, limit)))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [limit]);

  return { products, isLoading };
}
