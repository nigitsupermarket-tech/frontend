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
  Package,
  AlertTriangle,
} from "lucide-react";
import { Product, Pagination } from "@/types";
import { apiGet, apiDelete, apiPost, getApiError } from "@/lib/api";
import { formatPrice, formatNumber } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/loading-spinner";
import { useToast } from "@/store/uiStore";
import { ImportExportModal } from "@/components/admin/products/import-export-modal";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";

const stockColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-orange-100 text-orange-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

// Same 3-way model the status filter dropdown uses — DISCONTINUED is
// labeled "Archived" and ACTIVE is labeled "Published" everywhere a
// product's status is shown, so the filter and the badge always agree.
// OUT_OF_STOCK is a real ProductStatus value too, but it's driven by
// stock level rather than an editorial choice, so it's left showing its
// own plain label here instead of folding it into one of the three.
const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Published",
  DRAFT: "Draft",
  DISCONTINUED: "Archived",
  OUT_OF_STOCK: "Out of Stock",
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

  // Quick-stock modal for non-admin roles
  const [quickStock, setQuickStock] = useState<{
    product: Product;
    qty: string;
    reason: string;
  } | null>(null);
  const [savingStock, setSavingStock] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  // ADMIN hard-deletes directly; STAFF and MANAGER must submit a request
  // for an admin to approve (see /admin/products/delete-requests).
  const canDeleteDirect = isAdmin;
  const canRequestDelete = user?.role === "STAFF" || user?.role === "MANAGER";
  const canOpenDeleteFlow = canDeleteDirect || canRequestDelete;
  const toast = useToast();

  // Warning dialog state for hard delete / delete-request
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [relatedRecords, setRelatedRecords] = useState<Record<
    string,
    number | boolean
  > | null>(null);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Products with a pending stock-update approval — cross-referenced by
  // id to show a "Stock update pending approval" badge per row. Product
  // deletion status doesn't need a separate fetch: it comes back directly
  // on each product as `pendingDeleteRequest` since this page passes
  // includeFrozen=true below (an admin/staff management view, unlike the
  // storefront or POS, needs to see frozen products, not just hide them).
  const [pendingStockProductIds, setPendingStockProductIds] = useState<
    Set<string>
  >(new Set());

  const fetchPendingStockProductIds = useCallback(() => {
    apiGet<any>("/stock-approvals/pending-product-ids")
      .then((r) => setPendingStockProductIds(new Set(r.data?.productIds || [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<any>("/categories?limit=200")
      .then((r) => setCategories(r.data?.categories || []))
      .catch(() => {});
    apiGet<any>("/brands?limit=200")
      .then((r) => setBrands(r.data?.brands || []))
      .catch(() => {});
    fetchPendingStockProductIds();
    // Same "some other page just approved/rejected something" signal the
    // sidebar badges already listen for — see stock-approvals/page.tsx
    // and delete-requests/page.tsx, which both dispatch this.
    window.addEventListener("pending-counts:refresh", fetchPendingStockProductIds);
    return () =>
      window.removeEventListener(
        "pending-counts:refresh",
        fetchPendingStockProductIds,
      );
  }, [fetchPendingStockProductIds]);

  const fetchProducts = useCallback(
    async (p = page, f = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: any = {
          page: p,
          limit: 20,
          sort: f.sort,
          // This is the admin management list — unlike the storefront or
          // POS, it needs to SEE a product currently frozen by a pending
          // delete request (with a label), not have it silently excluded.
          includeFrozen: "true",
        };
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

  // Opens the warning dialog for a given product (does not delete yet) —
  // also pulls the related-records summary so the dialog can show exactly
  // what a hard delete would take down, before anyone confirms anything.
  const requestDelete = async (product: Product) => {
    if (!canOpenDeleteFlow) {
      toast("Only staff, managers, and admins can delete products", "error");
      return;
    }
    setDeleteTarget(product);
    setDeleteReason("");
    setRelatedRecords(null);
    setLoadingRelated(true);
    try {
      const res = await apiGet<any>(`/products/${product.id}/related-records`);
      setRelatedRecords(res.data.relatedRecords);
    } catch {
      // Non-fatal — the dialog still works without the summary, it just
      // won't show the related-record breakdown.
    } finally {
      setLoadingRelated(false);
    }
  };

  // Confirmed from the warning dialog — ADMIN performs the actual hard
  // delete immediately; STAFF/MANAGER submit a request for admin approval.
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (canRequestDelete && !canDeleteDirect && !deleteReason.trim()) {
      toast("A reason is required to request a deletion", "error");
      return;
    }
    setIsDeleting(true);
    try {
      if (canDeleteDirect) {
        await apiDelete(`/products/${deleteTarget.id}`);
        toast(`"${deleteTarget.name}" permanently deleted`, "success");
      } else {
        await apiPost(`/products/${deleteTarget.id}/delete-request`, {
          reason: deleteReason.trim(),
        });
        toast(
          `Delete request for "${deleteTarget.name}" submitted — awaiting admin approval`,
          "success",
        );
      }
      setDeleteTarget(null);
      fetchProducts(page, filters);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const submitQuickStock = async () => {
    if (!quickStock) return;
    setSavingStock(true);
    try {
      const res = await apiPost<any>("/stock-approvals", {
        productId: quickStock.product.id,
        requestedQty: Number(quickStock.qty),
        reason:
          quickStock.reason || `Quick stock update by ${user?.name || "staff"}`,
        source: "PRODUCT_LIST",
      });
      if (res.data?.autoApproved) {
        toast("Stock updated", "success");
      } else {
        toast("Stock change request submitted for admin approval", "success");
      }
      setQuickStock(null);
      fetchProducts(page, filters);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSavingStock(false);
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
            className={`flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors ${user?.role === "SALES" ? "hidden" : ""}`}
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
              placeholder="Search name, SKU, barcode…"
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
            <option value="ACTIVE">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="DISCONTINUED">Archived</option>
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
                  "SKU / Barcode",
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
                            className={`px-4 py-2 bg-brand-600 text-white rounded-xl text-sm ${user?.role === "SALES" ? "hidden" : ""}`}
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
                            "/images/placeholder-product.svg"
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
                          {(pendingStockProductIds.has(product.id) ||
                            product.pendingDeleteRequest) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pendingStockProductIds.has(product.id) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                                  Stock update pending approval
                                </span>
                              )}
                              {product.pendingDeleteRequest && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                                  Deletion pending approval
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      <p>{product.sku}</p>
                      {product.barcode && (
                        <p className="text-gray-400 mt-0.5">
                          {product.barcode}
                        </p>
                      )}
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
                        {product.stockQuantity}{" "}
                        {product.isScalable
                          ? product.scaleUnit || "unit"
                          : "units"}
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
                        {PRODUCT_STATUS_LABELS[product.status] || product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {formatNumber(product.salesCount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Non-admin: quick stock button */}
                        {!isAdmin && (
                          <button
                            onClick={() =>
                              setQuickStock({
                                product,
                                qty: String(product.stockQuantity),
                                reason: "",
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Update Stock"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {/* Only ADMIN and MANAGER can see/perform hard delete */}
                        {canOpenDeleteFlow &&
                          (product.pendingDeleteRequest ? (
                            <span
                              className="p-1.5 text-gray-300 cursor-not-allowed"
                              title="A delete request is already pending admin approval"
                            >
                              <Trash2 className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => requestDelete(product)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ))}
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

      {/* Hard Delete Warning Dialog — ADMIN deletes directly; STAFF/MANAGER
          submit a request for admin approval instead. */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-50 shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">
                  {canDeleteDirect ? "Delete product?" : "Request deletion?"}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {canDeleteDirect ? (
                    <>
                      This will permanently delete{" "}
                      <span className="font-medium text-gray-700">
                        &ldquo;{deleteTarget.name}&rdquo;
                      </span>{" "}
                      and all of its images. This action cannot be undone.
                    </>
                  ) : (
                    <>
                      This submits a request to permanently delete{" "}
                      <span className="font-medium text-gray-700">
                        &ldquo;{deleteTarget.name}&rdquo;
                      </span>{" "}
                      — an admin must review and approve it before anything
                      is actually removed.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              ⚠️ Hard delete: the product record is removed completely — it
              cannot be recovered or restored.
            </div>

            {/* Related-records summary — what stakeholders should see
                before this goes any further. */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 space-y-1.5">
              <p className="font-semibold text-gray-800">Related records</p>
              {loadingRelated ? (
                <p className="text-gray-400">Checking related records…</p>
              ) : relatedRecords ? (
                (() => {
                  // Declared separately (not chained straight into
                  // .filter()) so each literal is contextually typed as a
                  // [string, number] tuple — chaining .filter() directly
                  // onto the array literal makes TS infer the untyped
                  // elements as the wider `(string | number)[]` and then
                  // reject the result against the tuple-array annotation.
                  const allRows: [string, number][] = [
                    ["Order line items", Number(relatedRecords.orderItems || 0)],
                    ["POS order line items", Number(relatedRecords.posOrderItems || 0)],
                    ["Reviews", Number(relatedRecords.reviews || 0)],
                    ["Cart items", Number(relatedRecords.cartItems || 0)],
                    ["Wishlist items", Number(relatedRecords.wishlistItems || 0)],
                    ["Inventory logs", Number(relatedRecords.inventoryLogs || 0)],
                    ["Stock approvals", Number(relatedRecords.stockApprovals || 0)],
                    ["Variations", Number(relatedRecords.variations || 0)],
                  ];
                  const rows = allRows.filter(([, count]) => count > 0);
                  if (rows.length === 0) {
                    return (
                      <p className="text-green-700">
                        No related records — safe to delete.
                      </p>
                    );
                  }
                  return (
                    <>
                      <ul className="space-y-0.5">
                        {rows.map(([label, count]) => (
                          <li key={label} className="flex justify-between">
                            <span>{label}</span>
                            <span className="font-semibold">{count}</span>
                          </li>
                        ))}
                      </ul>
                      {relatedRecords.hasOrderHistory && (
                        <p className="text-red-700 font-medium pt-1">
                          ⚠️ This product has order history — those records
                          keep their own name/SKU snapshot but will no longer
                          link to a live product.
                        </p>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="text-gray-400">Unavailable</p>
              )}
            </div>

            {/* Reason — required for STAFF/MANAGER requests, not shown for
                a direct admin delete. */}
            {!canDeleteDirect && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for deletion (required)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  placeholder="Why should this product be permanently deleted?"
                  className="w-full border border-gray-200 px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting
                  ? canDeleteDirect
                    ? "Deleting…"
                    : "Submitting…"
                  : canDeleteDirect
                    ? "Delete Permanently"
                    : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stock Update Modal (Staff / Sales) */}
      {quickStock && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Update Stock</h2>
              <button onClick={() => setQuickStock(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {quickStock.product.name}
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              ⚠️ This request will be sent to admin for approval before the
              stock is updated.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Stock Quantity
              </label>
              <input
                type="number"
                min={0}
                value={quickStock.qty}
                onChange={(e) =>
                  setQuickStock({ ...quickStock, qty: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Current: {quickStock.product.stockQuantity}{" "}
                {quickStock.product.isScalable
                  ? quickStock.product.scaleUnit || "unit"
                  : "units"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason (optional)
              </label>
              <input
                type="text"
                value={quickStock.reason}
                onChange={(e) =>
                  setQuickStock({ ...quickStock, reason: e.target.value })
                }
                placeholder="e.g. Received new delivery"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setQuickStock(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitQuickStock}
                disabled={savingStock}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
              >
                {savingStock ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
