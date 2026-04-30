// frontend/src/app/(admin)/admin/products/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Product, Pagination } from "@/types";
import { apiGet, apiDelete, getApiError } from "@/lib/api";
import { formatPrice, formatNumber } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/loading-spinner";
import { useToast } from "@/store/uiStore";
import { ImportExportModal } from "@/components/admin/products/import-export-modal";
import Image from "next/image";

const stockColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-orange-100 text-orange-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

interface Filters {
  search: string;
  categoryId: string;
  brandId: string;
  status: string;
  stockStatus: string;
  sort: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most Sales" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showImportExport, setShowImportExport] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryId: "",
    brandId: "",
    status: "",
    stockStatus: "",
    sort: "newest",
  });
  const toast = useToast();

  useEffect(() => {
    apiGet<any>("/categories?limit=200")
      .then((r) => setCategories(r.data?.categories || []))
      .catch(() => {});
    apiGet<any>("/brands?limit=200")
      .then((r) => setBrands(r.data?.brands || []))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(
    async (p = page, f = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: any = { page: p, limit: 20, sort: f.sort };
        params.status = f.status || "all"; // "all" bypasses the ACTIVE-only filter
        if (f.search) params.search = f.search;
        if (f.categoryId) params.categoryId = f.categoryId;
        if (f.brandId) params.brandId = f.brandId;
        if (f.stockStatus) params.stockStatus = f.stockStatus;
        const res = await apiGet<any>("/products", params);
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      } catch {
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    },
    [page, filters],
  );

  useEffect(() => {
    fetchProducts(page, filters);
  }, [page]);

  const applyFilter = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    fetchProducts(1, next);
  };

  const clearFilters = () => {
    const reset: Filters = {
      search: "",
      categoryId: "",
      brandId: "",
      status: "",
      stockStatus: "",
      sort: "newest",
    };
    setFilters(reset);
    setPage(1);
    fetchProducts(1, reset);
  };

  const hasActive =
    filters.search ||
    filters.categoryId ||
    filters.brandId ||
    filters.status ||
    filters.stockStatus;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/products/${id}`);
      toast(`"${name}" deleted`, "success");
      fetchProducts(page, filters);
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const sel =
    "px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 bg-white";

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportExport(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import/Export
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilter("search", filters.search);
            }}
            className="relative flex-1 min-w-48"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              placeholder="Search products, SKU…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </form>

          {/* Category */}
          <select
            value={filters.categoryId}
            onChange={(e) => applyFilter("categoryId", e.target.value)}
            className={sel}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand */}
          <select
            value={filters.brandId}
            onChange={(e) => applyFilter("brandId", e.target.value)}
            className={sel}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Product Status */}
          <select
            value={filters.status}
            onChange={(e) => applyFilter("status", e.target.value)}
            className={sel}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>

          {/* Stock Status */}
          <select
            value={filters.stockStatus}
            onChange={(e) => applyFilter("stockStatus", e.target.value)}
            className={sel}
          >
            <option value="">All Stock</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => applyFilter("sort", e.target.value)}
            className={sel}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {hasActive && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {hasActive && pagination && (
          <p className="text-xs text-gray-400">
            {pagination.total} products match your filters
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {[
                  "Product",
                  "SKU",
                  "Price",
                  "Stock",
                  "Status",
                  "Sales",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <ErrorState
                      message={error}
                      retry={() => fetchProducts(page, filters)}
                    />
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={
                        hasActive
                          ? "No products match your filters"
                          : "No products yet"
                      }
                      action={
                        hasActive ? (
                          <button
                            onClick={clearFilters}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <Link
                            href="/admin/products/new"
                            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm"
                          >
                            Add your first product
                          </Link>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={
                            product.images[0] ||
                            "/images/placeholder-product.png"
                          }
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          width={40}
                          height={40}
                        />
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {product.category?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(product.price)}
                      </p>
                      {product.comparePrice && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatPrice(product.comparePrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockColors[product.stockStatus] || "bg-gray-100 text-gray-500"}`}
                      >
                        {product.stockQuantity} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : product.status === "DRAFT"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {formatNumber(product.salesCount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {pagination.total} products total
            </p>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onSuccess={() => fetchProducts(page, filters)}
      />
    </div>
  );
}
