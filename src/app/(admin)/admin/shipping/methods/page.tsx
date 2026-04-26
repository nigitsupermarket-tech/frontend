"use client";
// frontend/src/app/(admin)/admin/shipping/methods/page.tsx

import { useState, useEffect } from "react";
import {
  Truck,
  DollarSign,
  Weight,
  Store,
  Trash2,
  ChevronRight,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { apiGet, apiDelete, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface ShippingMethod {
  id: string;
  name: string;
  type: "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP";
  isActive: boolean;
  flatRateCost?: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  storeAddress?: { name: string; address: string; city: string };
  weightRates?: Array<{
    minWeight: number;
    maxWeight: number | null;
    cost: number;
  }>;
  zone: { id: string; name: string; states: string[] };
}

const TYPE_META = {
  TABLE_RATE: {
    label: "Weight-Based",
    color: "bg-blue-50 text-blue-600",
    Icon: Weight,
  },
  FLAT_RATE: {
    label: "Flat Rate",
    color: "bg-green-50 text-green-600",
    Icon: DollarSign,
  },
  STORE_PICKUP: {
    label: "Store Pickup",
    color: "bg-purple-50 text-purple-600",
    Icon: Store,
  },
};

export default function ShippingMethodsPage() {
  const toast = useToast();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP"
  >("ALL");

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/shipping/methods");
      setMethods(res.data.methods || []);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (method: ShippingMethod) => {
    try {
      await apiPut(`/shipping/methods/${method.id}`, {
        isActive: !method.isActive,
      });
      toast(`${method.isActive ? "Deactivated" : "Activated"}`, "success");
      fetchMethods();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleDelete = async (method: ShippingMethod) => {
    if (!confirm(`Delete "${method.name}"?`)) return;
    try {
      await apiDelete(`/shipping/methods/${method.id}`);
      toast("Deleted", "success");
      fetchMethods();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const filtered =
    filter === "ALL" ? methods : methods.filter((m) => m.type === filter);
  const byZone: Record<
    string,
    { zoneName: string; zoneId: string; methods: ShippingMethod[] }
  > = {};
  filtered.forEach((m) => {
    if (!byZone[m.zone.id])
      byZone[m.zone.id] = {
        zoneName: m.zone.name,
        zoneId: m.zone.id,
        methods: [],
      };
    byZone[m.zone.id].methods.push(m);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Methods</h1>
          <p className="text-sm text-gray-500 mt-1">
            All delivery options across all zones
          </p>
        </div>
        <Link
          href="/admin/shipping/zones"
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Add Method
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["ALL", "FLAT_RATE", "TABLE_RATE", "STORE_PICKUP"] as const).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}
            >
              {f === "ALL"
                ? `All (${methods.length})`
                : TYPE_META[f].label +
                  ` (${methods.filter((m) => m.type === f).length})`}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Truck className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">No shipping methods yet.</p>
          <Link
            href="/admin/shipping/zones"
            className="mt-3 inline-block text-green-600 hover:underline text-sm font-medium"
          >
            Go to Zones to add methods →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byZone).map(
            ([zoneId, { zoneName, methods: zoneMethods }]) => (
              <div key={zoneId}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    {zoneName}
                  </h2>
                  <span className="text-xs text-gray-400">
                    {zoneMethods.length} method(s)
                  </span>
                  <Link
                    href={`/admin/shipping/zones/${zoneId}/methods`}
                    className="ml-auto flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {zoneMethods.map((method) => {
                    const meta = TYPE_META[method.type];
                    const Icon = meta.Icon;
                    return (
                      <div
                        key={method.id}
                        className={`bg-white rounded-2xl border p-5 ${method.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`p-2 rounded-xl ${meta.color} shrink-0`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">
                                  {method.name}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                                >
                                  {meta.label}
                                </span>
                                {!method.isActive && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {method.type === "FLAT_RATE" && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Cost:{" "}
                                  <strong>
                                    {formatPrice(method.flatRateCost!)}
                                  </strong>
                                </p>
                              )}
                              {method.type === "TABLE_RATE" &&
                                method.weightRates && (
                                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-4">
                                    {method.weightRates.map((r, i) => (
                                      <span key={i}>
                                        {r.minWeight}–{r.maxWeight ?? "∞"}kg:{" "}
                                        <strong>{formatPrice(r.cost)}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              {method.type === "STORE_PICKUP" &&
                                method.storeAddress && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    📍 {method.storeAddress.name},{" "}
                                    {method.storeAddress.city}
                                  </p>
                                )}
                              {method.estimatedMinDays !== undefined &&
                                method.estimatedMinDays > 0 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {method.estimatedMinDays}–
                                    {method.estimatedMaxDays} days
                                  </p>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleActive(method)}
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"
                              title={
                                method.isActive ? "Deactivate" : "Activate"
                              }
                            >
                              {method.isActive ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(method)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
