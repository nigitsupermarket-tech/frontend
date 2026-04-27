"use client";

// frontend/src/app/(guest)/products/page.tsx

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  X,
  Filter,
  Check,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Category, Brand } from "@/types";
import { ProductCard } from "@/components/customer/product-card";
import { cn } from "@/lib/utils";
import { useProductStore } from "@/store/productStore";
import Link from "next/link";

interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

// ─── Smart Pagination ─────────────────────────────────────────────────────────
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;

  const pages: (number | "...")[] = [];
  const add = (n: number) => {
    if (n < 1 || n > total) return;
    if (pages[pages.length - 1] === n) return;
    if (
      pages.length > 0 &&
      pages[pages.length - 1] !== "..." &&
      (pages[pages.length - 1] as number) < n - 1
    )
      pages.push("...");
    pages.push(n);
  };
  add(1);
  for (let i = current - 2; i <= current + 2; i++) add(i);
  add(total);

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="px-3 h-9 text-sm font-medium border border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`e${i}`}
            className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              "w-9 h-9 text-sm font-medium border transition-colors rounded-sm",
              p === current
                ? "bg-green-600 border-green-600 text-white"
                : "border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-700",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="px-3 h-9 text-sm font-medium border border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
      >
        Next →
      </button>
    </div>
  );
}

// ─── Price range slider ───────────────────────────────────────────────────────
function PriceSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const rangeRef = useRef<HTMLDivElement>(null);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
        <span>₦{value[0].toLocaleString()}</span>
        <span>₦{value[1].toLocaleString()}</span>
      </div>
      <div
        ref={rangeRef}
        className="relative h-1.5 bg-gray-200 rounded-full mx-1"
      >
        <div
          className="absolute h-full bg-green-600 rounded-full"
          style={{
            left: `${pct(value[0])}%`,
            right: `${100 - pct(value[1])}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v < value[1]) onChange([v, value[1]]);
          }}
          className="absolute inset-0 w-full opacity-0 h-full cursor-pointer"
          style={{ zIndex: value[0] > max - (max - min) * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > value[0]) onChange([value[0], v]);
          }}
          className="absolute inset-0 w-full opacity-0 h-full cursor-pointer"
          style={{ zIndex: 4 }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-green-600 rounded-full -top-[5px] -translate-x-1/2 shadow-sm"
          style={{ left: `${pct(value[0])}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-green-600 rounded-full -top-[5px] -translate-x-1/2 shadow-sm"
          style={{ left: `${pct(value[1])}%` }}
        />
      </div>
    </div>
  );
}

// ─── Build URL helper ─────────────────────────────────────────────────────────
function buildUrl(filters: {
  categorySlug?: string;
  brandSlugs?: string[];
  sort?: string;
  limit?: number;
  search?: string;
  isOnPromotion?: boolean;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  maxPriceCap?: number;
}) {
  const p = new URLSearchParams();
  if (filters.categorySlug) p.set("categorySlug", filters.categorySlug);
  if (filters.brandSlugs?.length)
    p.set("brandSlug", filters.brandSlugs.join(","));
  if (filters.sort && filters.sort !== "default") p.set("sort", filters.sort);
  if (filters.limit && filters.limit !== 30)
    p.set("limit", String(filters.limit));
  if (filters.search) p.set("search", filters.search);
  if (filters.isOnPromotion) p.set("isOnPromotion", "true");
  if (filters.page && filters.page > 1) p.set("page", String(filters.page));
  if (filters.minPrice && filters.minPrice > 0)
    p.set("minPrice", String(filters.minPrice));
  if (
    filters.maxPrice !== undefined &&
    filters.maxPriceCap !== undefined &&
    filters.maxPrice < filters.maxPriceCap
  )
    p.set("maxPrice", String(filters.maxPrice));
  const qs = p.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

// ─── Main content ─────────────────────────────────────────────────────────────
function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    products,
    pagination,
    isLoading: storeLoading,
    fetchProducts,
  } = useProductStore();

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  // Price slider local state — synced from URL on mount and URL changes
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const MAX_PRICE = 500000;
  const [priceOpen, setPriceOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);

  // ── Read ALL filter values directly from searchParams ─────────────────────
  // No state copies — always fresh from the URL. Every filter interaction
  // calls router.push() which updates searchParams which triggers re-render.
  const categorySlug =
    searchParams.get("categorySlug") || searchParams.get("categoryId") || "";
  const brandSlugs = (() => {
    const p =
      searchParams.get("brandSlug") || searchParams.get("brandId") || "";
    return p ? p.split(",").filter(Boolean) : [];
  })();
  const selectedSort = searchParams.get("sort") || "default";
  const selectedLimit = Number(searchParams.get("limit")) || 30;
  const searchValue = searchParams.get("search") || "";
  const isOnPromotion = searchParams.get("isOnPromotion") === "true";
  const currentPage = Number(searchParams.get("page")) || 1;
  const urlMinPrice = Number(searchParams.get("minPrice")) || 0;
  const urlMaxPrice = Number(searchParams.get("maxPrice")) || MAX_PRICE;

  // Sync price slider with URL
  useEffect(() => {
    setPriceRange([urlMinPrice, urlMaxPrice]);
  }, [urlMinPrice, urlMaxPrice]);

  // ── Fetch products whenever searchParams changes ───────────────────────────
  // Query is built directly here — no stale closure risk.
  useEffect(() => {
    const p = new URLSearchParams();
    if (categorySlug) p.set("categorySlug", categorySlug);
    if (brandSlugs.length) p.set("brandSlug", brandSlugs.join(","));
    if (selectedSort && selectedSort !== "default") p.set("sort", selectedSort);
    p.set("limit", String(selectedLimit));
    if (searchValue) p.set("search", searchValue);
    if (isOnPromotion) p.set("isOnPromotion", "true");
    if (currentPage > 1) p.set("page", String(currentPage));
    if (urlMinPrice > 0) p.set("minPrice", String(urlMinPrice));
    if (urlMaxPrice < MAX_PRICE) p.set("maxPrice", String(urlMaxPrice));
    p.set("status", "ACTIVE");
    fetchProducts(p.toString());
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load categories + brands once ─────────────────────────────────────────
  useEffect(() => {
    apiGet<any>("/categories?isActive=true").then((res) => {
      const all: any[] = res.data.categories || [];
      const roots: CategoryWithChildren[] = [];
      const map: Record<string, CategoryWithChildren> = {};
      all.forEach((c) => (map[c.id] = { ...c, children: [] }));
      all.forEach((c) => {
        if (c.parentId && map[c.parentId])
          map[c.parentId].children!.push(map[c.id]);
        else if (!c.parentId) roots.push(map[c.id]);
      });
      setCategories(roots);
    });
    apiGet<any>("/brands?isActive=true&limit=100")
      .then((res) => setBrands(res.data.brands || []))
      .catch(() => {});
  }, []);

  // ── Page title (derived — no state) ──────────────────────────────────────
  const pageTitle = (() => {
    if (!categorySlug) return isOnPromotion ? "Promotions" : "All Products";
    const find = (cats: CategoryWithChildren[]): string | null => {
      for (const c of cats) {
        if (c.slug === categorySlug || c.id === categorySlug) return c.name;
        if (c.children?.length) {
          const f = find(c.children);
          if (f) return f;
        }
      }
      return null;
    };
    return find(categories) || "Products";
  })();

  // ── Current filters snapshot for buildUrl ─────────────────────────────────
  const current = {
    categorySlug,
    brandSlugs,
    sort: selectedSort,
    limit: selectedLimit,
    search: searchValue,
    isOnPromotion,
    page: currentPage,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    maxPriceCap: MAX_PRICE,
  };

  const navigate = (overrides: Partial<typeof current>) =>
    router.push(buildUrl({ ...current, ...overrides }));

  const selectCategory = (slug: string) => {
    router.push(buildUrl({ ...current, categorySlug: slug, page: 1 }));
    setSidebarOpen(false);
  };

  const toggleBrand = (slug: string) => {
    const next = brandSlugs.includes(slug)
      ? brandSlugs.filter((b) => b !== slug)
      : [...brandSlugs, slug];
    navigate({ brandSlugs: next, page: 1 });
  };

  const clearBrands = () => navigate({ brandSlugs: [], page: 1 });

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCategoryItem = (cat: CategoryWithChildren, depth = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = categorySlug === cat.slug || categorySlug === cat.id;
    return (
      <div key={cat.id}>
        <button
          onClick={() => {
            if (hasChildren) toggleCategory(cat.id);
            selectCategory(cat.slug);
          }}
          className={cn(
            "w-full flex items-center justify-between py-1.5 text-sm transition-colors",
            depth === 0 ? "font-medium" : "text-gray-600 pl-3",
            isSelected
              ? "text-green-700 font-semibold"
              : "text-gray-700 hover:text-green-700",
          )}
        >
          <span>
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </span>
          {hasChildren && (
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="pl-2 border-l border-gray-200 ml-2">
            {cat.children!.map((child) => renderCategoryItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── Active filter chips ────────────────────────────────────────────────────
  const selectedBrandNames = brandSlugs
    .map((slug) => brands.find((b) => b.slug === slug)?.name)
    .filter(Boolean)
    .join(", ");

  // Resolve category name for the active filter chip
  const activeCategoryName = (() => {
    if (!categorySlug) return null;
    const find = (cats: CategoryWithChildren[]): string | null => {
      for (const c of cats) {
        if (c.slug === categorySlug || c.id === categorySlug) return c.name;
        if (c.children?.length) {
          const f = find(c.children);
          if (f) return f;
        }
      }
      return null;
    };
    return find(categories) || categorySlug;
  })();

  const activeFilters = [
    categorySlug &&
      activeCategoryName && {
        label: `Category: ${activeCategoryName}`,
        clear: () => navigate({ categorySlug: "", page: 1 }),
      },
    isOnPromotion && {
      label: "Promotions",
      clear: () => navigate({ isOnPromotion: false, page: 1 }),
    },
    brandSlugs.length > 0 && {
      label: `Brand: ${selectedBrandNames}`,
      clear: clearBrands,
    },
    searchValue && {
      label: `"${searchValue}"`,
      clear: () => navigate({ search: "", page: 1 }),
    },
    (priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && {
      label: `₦${priceRange[0].toLocaleString()} – ₦${priceRange[1].toLocaleString()}`,
      clear: () => {
        setPriceRange([0, MAX_PRICE]);
        navigate({ minPrice: 0, maxPrice: MAX_PRICE, page: 1 });
      },
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 space-y-3">
      {/* Categories */}
      <div className="bg-white border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">
            Categories
          </h3>
        </div>
        <div className="p-3 space-y-0.5">
          <button
            onClick={() => selectCategory("")}
            className={cn(
              "w-full text-left py-1.5 text-sm font-medium transition-colors flex items-center gap-2",
              !categorySlug
                ? "text-green-700"
                : "text-gray-700 hover:text-green-700",
            )}
          >
            <ChevronRight className="w-3 h-3" />
            All Products
          </button>
          <button
            onClick={() =>
              navigate({ isOnPromotion: true, categorySlug: "", page: 1 })
            }
            className={cn(
              "w-full text-left py-1.5 text-sm font-medium transition-colors flex items-center gap-2",
              isOnPromotion
                ? "text-amber-600"
                : "text-gray-700 hover:text-amber-600",
            )}
          >
            🏷️ Promotions
          </button>
          <div className="border-t border-gray-100 my-2" />
          {categories.map((cat) => renderCategoryItem(cat))}
        </div>
      </div>

      {/* Price filter */}
      <div className="bg-white border border-gray-200">
        <button
          onClick={() => setPriceOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200"
        >
          <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">
            Price
          </h3>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              priceOpen && "rotate-180",
            )}
          />
        </button>
        {priceOpen && (
          <div className="p-4">
            <PriceSlider
              min={0}
              max={MAX_PRICE}
              value={priceRange}
              onChange={(v) => {
                setPriceRange(v);
                navigate({ minPrice: v[0], maxPrice: v[1], page: 1 });
              }}
            />
          </div>
        )}
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div className="bg-white border border-gray-200">
          <button
            onClick={() => setBrandOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">
                Brand
              </h3>
              {brandSlugs.length > 0 && (
                <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {brandSlugs.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-500 transition-transform",
                brandOpen && "rotate-180",
              )}
            />
          </button>
          {brandOpen && (
            <div className="p-3">
              {brandSlugs.length > 0 && (
                <button
                  onClick={clearBrands}
                  className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium mb-2 px-1"
                >
                  Clear all brands
                </button>
              )}
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {brands.map((brand) => {
                  const isSelected = brandSlugs.includes(brand.slug);
                  return (
                    <button
                      key={brand.id}
                      onClick={() => toggleBrand(brand.slug)}
                      className={cn(
                        "w-full flex items-center gap-2.5 py-1.5 px-1 text-sm transition-colors rounded",
                        isSelected
                          ? "text-green-700 font-semibold"
                          : "text-gray-700 hover:text-green-700",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 flex-shrink-0 border rounded flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-green-600 border-green-600"
                            : "border-gray-300 bg-white",
                        )}
                      >
                        {isSelected && (
                          <Check
                            className="w-2.5 h-2.5 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      {brand.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-green-700">
            HOME
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800 font-medium uppercase">
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide mb-6">
          {pageTitle}
        </h1>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                Filters
                {brandSlugs.length > 0 && (
                  <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {brandSlugs.length}
                  </span>
                )}
              </button>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  defaultValue={searchValue}
                  key={searchValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      navigate({
                        search: (e.target as HTMLInputElement).value,
                        page: 1,
                      });
                  }}
                  onBlur={(e) => navigate({ search: e.target.value, page: 1 })}
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:border-green-500"
                />
                {searchValue && (
                  <button
                    onClick={() => navigate({ search: "", page: 1 })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">sort:</span>
                  <select
                    value={selectedSort}
                    onChange={(e) =>
                      navigate({ sort: e.target.value, page: 1 })
                    }
                    className="text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                  >
                    <option value="default">Default</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A-Z</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Show:</span>
                  <select
                    value={selectedLimit}
                    onChange={(e) =>
                      navigate({ limit: Number(e.target.value), page: 1 })
                    }
                    className="text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-green-500 bg-white"
                  >
                    <option value={12}>12</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeFilters.map(({ label, clear }) => (
                  <button
                    key={label}
                    onClick={clear}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200 hover:bg-green-100"
                  >
                    {label} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            {storeLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-200">
                <p className="text-gray-500 text-sm">
                  No products found. Try a different filter.
                </p>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-3">
                  Showing {products.length} of {pagination?.total ?? 0} products
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination
                  current={currentPage}
                  total={pagination?.totalPages ?? 1}
                  onChange={(p) => navigate({ page: p })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <span className="font-bold text-gray-900">Filters</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
