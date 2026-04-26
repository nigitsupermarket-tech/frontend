"use client";

// frontend/src/app/(admin)/admin/promotions/page.tsx
// Manage "Promotions of the Week" — mark products as promoted, set dates

import { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  Loader2,
  X,
  CheckCircle,
  Calendar,
  Package,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[];
  isOnPromotion: boolean;
  promotionEndsAt?: string;
  status: string;
  category?: { name: string };
  brand?: { name: string };
  stockQuantity: number;
}

export default function PromotionsPage() {
  const toast = useToast();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalResults, setModalResults] = useState<Product[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [promoEndsAt, setPromoEndsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const fetchPromoProducts = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>(
        `/products?isOnPromotion=true&limit=50&status=ACTIVE`,
      );
      setPromoProducts(res.data.products || []);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoProducts();
  }, []);

  // Search products in modal
  useEffect(() => {
    if (!modalSearch.trim()) {
      setModalResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setModalLoading(true);
      try {
        const res = await apiGet<any>(
          `/products?search=${encodeURIComponent(modalSearch)}&status=ACTIVE&limit=10`,
        );
        setModalResults(res.data.products || []);
      } catch {
        setModalResults([]);
      } finally {
        setModalLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [modalSearch]);

  const togglePromotion = async (
    productId: string,
    isOnPromotion: boolean,
    endsAt?: string,
  ) => {
    setSaving(productId);
    try {
      await apiPut(`/products/${productId}`, {
        isOnPromotion,
        promotionEndsAt:
          isOnPromotion && endsAt ? new Date(endsAt).toISOString() : null,
      });
      toast(
        isOnPromotion
          ? "Product added to promotions!"
          : "Product removed from promotions",
        "success",
      );
      await fetchPromoProducts();
      setShowAddModal(false);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(null);
    }
  };

  const filtered = promoProducts.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            Promotions of the Week
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Products shown in the "Promotions of the Week" section on the
            homepage
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPromoProducts}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product to Promo
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Tag className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">How it works</p>
          <p>
            Products marked as "On Promotion" appear in the{" "}
            <strong>Promotions of the Week</strong> section on the homepage and
            in the shop under the Promotions filter. Set an end date to
            automatically remove the promotion when it expires. The product's
            price is unchanged — update the <strong>Compare Price</strong> field
            to show a discount badge.
          </p>
        </div>
      </div>

      {/* Current promo products */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="font-semibold text-gray-900 text-sm">
            Currently Promoted ({promoProducts.length})
          </span>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 border border-gray-300 text-xs focus:outline-none focus:border-amber-500 rounded"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <Tag className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p>No products in promotions yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-amber-600 hover:underline text-sm font-medium"
            >
              Add your first promoted product →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
              >
                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {product.images?.[0] && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.sku}
                    {product.category && ` · ${product.category.name}`}
                    {product.brand && ` · ${product.brand.name}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Stock: {product.stockQuantity}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {product.promotionEndsAt && (
                    <div className="flex items-center gap-1 text-xs text-amber-700 mb-1">
                      <Calendar className="w-3 h-3" />
                      Ends{" "}
                      {new Date(product.promotionEndsAt).toLocaleDateString(
                        "en-NG",
                        {
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => togglePromotion(product.id, false)}
                    disabled={saving === product.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {saving === product.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">
                Add Product to Promotions
              </h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Promo end date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Promotion Ends (optional)
                </label>
                <input
                  type="date"
                  value={promoEndsAt}
                  onChange={(e) => setPromoEndsAt(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 rounded"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank for indefinite promotion
                </p>
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Search Product
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or SKU..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-amber-500 rounded"
                  />
                  {modalLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                {modalResults.length === 0 && modalSearch && !modalLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No products found
                  </div>
                ) : modalResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    Type to search products...
                  </div>
                ) : (
                  modalResults.map((product) => {
                    const alreadyPromo = product.isOnPromotion;
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          alreadyPromo ? "bg-amber-50" : "hover:bg-gray-50",
                        )}
                      >
                        <div className="w-9 h-9 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {product.sku} · {formatPrice(product.price)}
                          </p>
                        </div>
                        {alreadyPromo ? (
                          <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            In Promo
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              togglePromotion(product.id, true, promoEndsAt)
                            }
                            disabled={saving === product.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-bold rounded disabled:opacity-50"
                          >
                            {saving === product.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
