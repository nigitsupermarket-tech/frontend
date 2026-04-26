// frontend/src/app/(admin)/admin/products/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Download, Upload } from "lucide-react";
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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showImportExport, setShowImportExport] = useState(false);
  const toast = useToast();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await apiGet<any>("/products", params);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch {
      setError("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/products/${id}`);
      toast(`"${name}" deleted`, "success");
      fetchProducts();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportExport(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import/Export
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, SKU…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
        />
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Product
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  SKU
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Price
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Stock
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                  Sales
                </th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <ErrorState message={error} retry={fetchProducts} />
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
                      title="No products yet"
                      action={
                        <Link
                          href="/admin/products/new"
                          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm"
                        >
                          Add your first product
                        </Link>
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
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockColors[product.stockStatus] || ""}`}
                      >
                        {product.stockQuantity} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* ✅ FIXED: Changed INACTIVE to DRAFT and OUT_OF_STOCK */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : product.status === "DRAFT"
                              ? "bg-gray-100 text-gray-600"
                              : product.status === "OUT_OF_STOCK"
                                ? "bg-red-100 text-red-600"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
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
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Previous
              </button>
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

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
