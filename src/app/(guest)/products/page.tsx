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
        {/* Min thumb */}
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
        {/* Max thumb */}
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

// ─── Main content ─────────────────────────────────────────────────────────────
function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ✅ FIX 3: Use global cached product store instead of local state.
  // Products are fetched once and reused across all pages.
  const {
    products,
    pagination,
    isLoading: storeLoading,
    fetchProducts,
  } = useProductStore();

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [maxPrice, setMaxPrice] = useState(500000);
  const [priceOpen, setPriceOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);

  // Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    searchParams.get("categoryId") || "",
  );

  // ✅ FIX 2: Multi-select brand — store as string[] instead of single string.
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(() => {
    const param = searchParams.get("brandId");
    return param ? param.split(",").filter(Boolean) : [];
  });

  const [selectedSort, setSelectedSort] = useState(
    searchParams.get("sort") || "default",
  );
  const [selectedLimit, setSelectedLimit] = useState(
    Number(searchParams.get("limit")) || 30,
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [isOnPromotion, setIsOnPromotion] = useState(
    searchParams.get("isOnPromotion") === "true",
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1,
  );
  const [pageTitle, setPageTitle] = useState("All Products");

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
    // ✅ FIX 2: Join multiple brand IDs with comma for the API query.
    if (selectedBrandIds.length > 0)
      params.set("brandId", selectedBrandIds.join(","));
    if (selectedSort && selectedSort !== "default")
      params.set("sort", selectedSort);
    if (selectedLimit !== 30) params.set("limit", String(selectedLimit));
    if (search) params.set("search", search);
    if (isOnPromotion) params.set("isOnPromotion", "true");
    if (currentPage > 1) params.set("page", String(currentPage));
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
    if (priceRange[1] < maxPrice) params.set("maxPrice", String(priceRange[1]));
    params.set("status", "ACTIVE");
    return params.toString();
  }, [
    selectedCategoryId,
    selectedBrandIds,
    selectedSort,
    selectedLimit,
    search,
    isOnPromotion,
    currentPage,
    priceRange,
    maxPrice,
  ]);

  // Load categories + brands (these are light lists, not products)
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
      .then((res) => {
        setBrands(res.data.brands || []);
      })
      .catch(() => {});
  }, []);

  // Page title
  useEffect(() => {
    if (!selectedCategoryId) {
      setPageTitle(isOnPromotion ? "Promotions" : "All Products");
      return;
    }
    const find = (cats: CategoryWithChildren[]): string | null => {
      for (const c of cats) {
        if (c.id === selectedCategoryId) return c.name;
        if (c.children?.length) {
          const f = find(c.children);
          if (f) return f;
        }
      }
      return null;
    };
    const name = find(categories);
    if (name) setPageTitle(name);
  }, [selectedCategoryId, categories, isOnPromotion]);

  // ✅ FIX 3: Fetch via global store so results are cached.
  useEffect(() => {
    fetchProducts(buildQuery());
  }, [buildQuery, fetchProducts]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectCategory = (id: string) => {
    setSelectedCategoryId(id);
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  // ✅ FIX 2: Toggle brand in/out of the selectedBrandIds array.
  const toggleBrand = (id: string) => {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
    setCurrentPage(1);
  };

  const clearBrands = () => {
    setSelectedBrandIds([]);
    setCurrentPage(1);
  };

  const renderCategoryItem = (cat: CategoryWithChildren, depth = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = selectedCategoryId === cat.id;
    return (
      <div key={cat.id}>
        <button
          onClick={() => {
            if (hasChildren) toggleCategory(cat.id);
            selectCategory(cat.id);
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
              !selectedCategoryId
                ? "text-green-700"
                : "text-gray-700 hover:text-green-700",
            )}
          >
            <ChevronRight className="w-3 h-3" />
            All Products
          </button>
          <button
            onClick={() => {
              setIsOnPromotion(true);
              setSelectedCategoryId("");
              setCurrentPage(1);
            }}
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
              max={maxPrice}
              value={priceRange}
              onChange={(v) => {
                setPriceRange(v);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ✅ FIX 2: Multi-select brand filter with checkboxes */}
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
              {selectedBrandIds.length > 0 && (
                <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedBrandIds.length}
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
              {selectedBrandIds.length > 0 && (
                <button
                  onClick={clearBrands}
                  className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium mb-2 px-1"
                >
                  Clear all brands
                </button>
              )}
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {brands.map((brand) => {
                  const isSelected = selectedBrandIds.includes(brand.id);
                  return (
                    <button
                      key={brand.id}
                      onClick={() => toggleBrand(brand.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 py-1.5 px-1 text-sm transition-colors rounded",
                        isSelected
                          ? "text-green-700 font-semibold"
                          : "text-gray-700 hover:text-green-700",
                      )}
                    >
                      {/* Checkbox indicator */}
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

  // ✅ FIX 2: Active filters now handles multiple brands.
  const selectedBrandNames = selectedBrandIds
    .map((id) => brands.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const activeFilters = [
    isOnPromotion && {
      label: "Promotions",
      clear: () => setIsOnPromotion(false),
    },
    selectedBrandIds.length > 0 && {
      label: `Brand: ${selectedBrandNames}`,
      clear: clearBrands,
    },
    search && { label: `"${search}"`, clear: () => setSearch("") },
    (priceRange[0] > 0 || priceRange[1] < maxPrice) && {
      label: `₦${priceRange[0].toLocaleString()} – ₦${priceRange[1].toLocaleString()}`,
      clear: () => setPriceRange([0, maxPrice]),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const isLoadingProducts = storeLoading || loading;

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
                {selectedBrandIds.length > 0 && (
                  <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {selectedBrandIds.length}
                  </span>
                )}
              </button>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:border-green-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
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
                    onChange={(e) => setSelectedSort(e.target.value)}
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
                    onChange={(e) => setSelectedLimit(Number(e.target.value))}
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
            {isLoadingProducts ? (
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
                  onChange={setCurrentPage}
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
