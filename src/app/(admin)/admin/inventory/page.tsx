"use client";

import { useState, useEffect } from "react";
import { Package, Clock } from "lucide-react";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import Image from "next/image";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  images: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus?: string;
  category?: { name: string };
}

const stockColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-orange-100 text-orange-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [editing, setEditing] = useState<{
    id: string;
    qty: string;
    reason: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const toast = useToast();

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
        (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
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
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          {(
            [
              ["all", "All"],
              ["low", "Low Stock"],
              ["out", "Out of Stock"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === v ? "bg-brand-600 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-300"}`}
            >
              {l}
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
                  "SKU",
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Package className="w-12 h-12" />}
                      title="No inventory issues"
                      description="All products are well stocked"
                    />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
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
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.category?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {editing?.id === item.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editing.qty}
                          onChange={(e) =>
                            setEditing({ ...editing, qty: e.target.value })
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
                      {editing?.id === item.id ? (
                        <div className="space-y-1.5">
                          <input
                            placeholder="Reason (optional)"
                            value={editing.reason}
                            onChange={(e) =>
                              setEditing({ ...editing, reason: e.target.value })
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
