"use client";

import { useState, useEffect } from "react";
import { Package, Clock, Search } from "lucide-react";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import Image from "next/image";

interface InventoryItem {
  id: string; // always the PRODUCT id, even for a variation row
  name: string;
  sku: string;
  barcode?: string;
  images: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus?: string;
  category?: { name: string };
  // Set when this row is a specific preset's OWN dedicated stock rather
  // than the product's shared pool — e.g. "290 G" packs running low while
  // the rest of the product is fine.
  variationId?: string;
  variationLabel?: string;
}

// A product can appear twice (once for its shared pool, once per low/out
// preset) — the row key has to account for that, unlike a plain product id.
const rowKey = (item: InventoryItem) =>
  item.variationId ? `${item.id}::${item.variationId}` : item.id;

const stockColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-orange-100 text-orange-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{
    id: string;
    variationId?: string;
    qty: string;
    reason: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const toast = useToast();

  // Filtered items by search
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.variationLabel && item.variationLabel.toLowerCase().includes(q)) ||
      (item.category?.name && item.category.name.toLowerCase().includes(q))
    );
  });

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/analytics/inventory");
      const low: InventoryItem[] = (res.data.lowStock || []).map((p: any) => ({
        ...p,
        stockStatus: "LOW_STOCK",
      }));
      const out: InventoryItem[] = (res.data.outOfStock || []).map(
        (p: any) => ({
          ...p,
          stockStatus: "OUT_OF_STOCK",
        }),
      );
      const all = [...out, ...low].filter(
        (v, i, a) => a.findIndex((x) => rowKey(x) === rowKey(v)) === i,
      );
      if (filter === "all") setItems(all);
      else if (filter === "low") setItems(low);
      else setItems(out);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiPost<any>("/stock-approvals", {
        productId: editing.id,
        variationId: editing.variationId,
        requestedQty: Number(editing.qty),
        reason: editing.reason || undefined,
        source: "INVENTORY",
      });

      if (res.data?.autoApproved) {
        toast("Stock updated", "success");
      } else {
        toast("Stock change submitted for admin approval", "success");
      }
      setEditing(null);
      fetchItems();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Inventory Management
          </h1>
          {!isAdmin && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Stock changes require admin approval before taking effect
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode, preset…"
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-brand-400 w-52"
            />
          </div>
          {(["all", "low", "out"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === v ? "bg-brand-600 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-300"}`}
            >
              {v === "all" ? "All" : v === "low" ? "Low Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {[
                  "Product",
                  "SKU / Barcode",
                  "Category",
                  "Stock",
                  "Threshold",
                  "Status",
                  "Update",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Package className="w-12 h-12" />}
                      title={search ? "No items match your search" : "No inventory issues"}
                      description={search ? "Try a different name, SKU or barcode" : "All products are well stocked"}
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const key = rowKey(item);
                  const isEditingThis =
                    editing?.id === item.id && editing?.variationId === item.variationId;
                  return (
                  <tr
                    key={key}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={
                            item.images?.[0] ||
                            "/images/placeholder-product.png"
                          }
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-100 shrink-0"
                          width={36}
                          height={36}
                        />
                        <div>
                          <span className="font-medium text-gray-900 line-clamp-1 block">
                            {item.name}
                          </span>
                          {item.variationLabel && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">
                              Preset: {item.variationLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      <p>{item.sku}</p>
                      {item.barcode && (
                        <p className="text-gray-400 mt-0.5">{item.barcode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.category?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isEditingThis ? (
                        <input
                          type="number"
                          min={0}
                          value={editing!.qty}
                          onChange={(e) =>
                            setEditing({ ...editing!, qty: e.target.value })
                          }
                          className="w-20 px-2 py-1 rounded-lg border border-brand-300 text-sm focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`font-semibold ${item.stockQuantity === 0 ? "text-red-600" : item.stockQuantity <= item.lowStockThreshold ? "text-orange-600" : "text-gray-900"}`}
                        >
                          {item.stockQuantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {item.lowStockThreshold}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockColors[item.stockStatus || ""] || "bg-gray-100 text-gray-700"}`}
                      >
                        {item.stockStatus
                          ? item.stockStatus.replace("_", " ")
                          : "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditingThis ? (
                        <div className="space-y-1.5">
                          <input
                            placeholder="Reason (optional)"
                            value={editing!.reason}
                            onChange={(e) =>
                              setEditing({ ...editing!, reason: e.target.value })
                            }
                            className="w-40 px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="px-3 py-1 bg-brand-600 text-white text-xs rounded-lg disabled:opacity-60 flex items-center gap-1"
                            >
                              {saving ? (
                                "…"
                              ) : isAdmin ? (
                                "Save"
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" /> Submit
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="px-3 py-1 border border-gray-200 text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                          {!isAdmin && (
                            <p className="text-[10px] text-amber-600">
                              Will need admin approval
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setEditing({
                              id: item.id,
                              variationId: item.variationId,
                              qty: item.stockQuantity.toString(),
                              reason: "",
                            })
                          }
                          className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:border-brand-300 hover:text-brand-600 transition-colors"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
