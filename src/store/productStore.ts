// frontend/src/store/productStore.ts
//
// ✅ GLOBAL PRODUCT CACHE
//
// WHY THIS EXISTS:
// Before this store, every component that needed products called the API
// directly (via useProducts hook or inline useEffect). That means:
//   - The home page fetches products
//   - User navigates to /products — fetches again
//   - User goes back home — fetches AGAIN
//   - Each ProductCard section had its own independent fetch
//
// This store solves that by acting as a client-side cache:
//   - Products are fetched once per unique query string
//   - Results are stored in Zustand (in-memory, not persisted)
//   - Any component that calls fetchProducts() with the same query
//     gets the cached result instantly — zero network requests
//   - Cache is busted when the query changes (filters, search, page)
//
// HOW TO USE IT (anywhere in the app):
//
//   import { useProductStore } from "@/store/productStore";
//
//   function MyComponent() {
//     const { products, isLoading, fetchProducts } = useProductStore();
//
//     useEffect(() => {
//       fetchProducts(); // no args = fetch all active products with defaults
//     }, [fetchProducts]);
//
//     // or with filters:
//     useEffect(() => {
//       fetchProducts("categoryId=abc&sort=newest&limit=12");
//     }, [fetchProducts]);
//   }
//
// NOTE: The cache key is the query string. Different query strings = different
// cached results. The store keeps only the LAST fetched result in memory.
// For multi-query caching (e.g. home page + shop page simultaneously), see
// the `cache` map below — it stores all previously fetched queries.

import { create } from "zustand";
import { Product, Pagination } from "@/types";
import { apiGet, getApiError } from "@/lib/api";

interface ProductStoreState {
  // ─── Current result (what the last fetchProducts() returned) ────────────
  products: Product[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  lastQuery: string | null;

  // ─── In-memory cache (query string → result) ─────────────────────────────
  // Keeps results from ALL previous fetches so navigating back is instant.
  cache: Map<string, { products: Product[]; pagination: Pagination }>;

  // ─── Actions ─────────────────────────────────────────────────────────────
  fetchProducts: (query?: string) => Promise<void>;
  invalidate: (query?: string) => void;
  invalidateAll: () => void;
}

export const useProductStore = create<ProductStoreState>((set, get) => ({
  products: [],
  pagination: null,
  isLoading: false,
  error: null,
  lastQuery: null,
  cache: new Map(),

  fetchProducts: async (query = "status=ACTIVE&limit=30") => {
    const { cache, lastQuery } = get();

    // ✅ Cache hit: same query as last time — nothing to do, state already set.
    if (lastQuery === query) return;

    // ✅ Cache hit: different query but we've fetched it before — serve instantly.
    const cached = cache.get(query);
    if (cached) {
      set({
        products: cached.products,
        pagination: cached.pagination,
        lastQuery: query,
        isLoading: false,
        error: null,
      });
      return;
    }

    // ✅ Cache miss: fetch from API.
    set({ isLoading: true, error: null });

    try {
      const res = await apiGet<{
        success: boolean;
        data: { products: Product[]; pagination: Pagination };
      }>(`/products?${query}`);

      const result = {
        products: res.data.products || [],
        pagination: res.data.pagination,
      };

      // Store in cache for future navigations.
      const updatedCache = new Map(cache);
      updatedCache.set(query, result);

      set({
        products: result.products,
        pagination: result.pagination,
        lastQuery: query,
        isLoading: false,
        cache: updatedCache,
      });
    } catch (err) {
      set({
        error: getApiError(err),
        isLoading: false,
      });
    }
  },

  // ✅ Bust cache for a specific query (call after creating/editing a product)
  invalidate: (query?: string) => {
    const { cache } = get();
    const updatedCache = new Map(cache);
    if (query) {
      updatedCache.delete(query);
    } else {
      // Bust current query
      const { lastQuery } = get();
      if (lastQuery) updatedCache.delete(lastQuery);
    }
    set({ cache: updatedCache, lastQuery: null });
  },

  // ✅ Bust entire cache (call after bulk operations or admin changes)
  invalidateAll: () => {
    set({ cache: new Map(), lastQuery: null, products: [], pagination: null });
  },
}));

// ─── Convenience selectors ────────────────────────────────────────────────────

/** Get products from the store without subscribing to loading/error state */
export const useProducts = () => useProductStore((s) => s.products);

/** Get pagination from the store */
export const useProductPagination = () => useProductStore((s) => s.pagination);

/** True while products are being fetched */
export const useProductsLoading = () => useProductStore((s) => s.isLoading);
