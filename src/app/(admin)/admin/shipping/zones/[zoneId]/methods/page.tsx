"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Package,
  DollarSign,
  Weight,
  Store,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";

interface ShippingMethod {
  id: string;
  name: string;
  type: "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP";
  flatRateCost?: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  isActive: boolean;
  storeAddress?: any;
  weightRates?: Array<{
    id: string;
    minWeight: number;
    maxWeight: number | null;
    cost: number;
  }>;
}

export default function ZoneMethodsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const zoneId = params.zoneId as string;

  const [zone, setZone] = useState<any>(null);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<ShippingMethod | null>(null);
  const [methodType, setMethodType] = useState<
    "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP"
  >("TABLE_RATE");

  const [form, setForm] = useState({
    name: "",
    flatRateCost: 0,
    estimatedMinDays: 2,
    estimatedMaxDays: 4,
    isActive: true,
    weightRates: [
      { minWeight: 0, maxWeight: 5, cost: 2000 },
      { minWeight: 5, maxWeight: 10, cost: 3000 },
      { minWeight: 10, maxWeight: 20, cost: 4500 },
      { minWeight: 20, maxWeight: 50, cost: 7000 },
      { minWeight: 50, maxWeight: null, cost: 10000 },
    ],
    storeAddress: {
      name: "",
      address: "",
      city: "",
      phone: "",
      hours: "Mon-Sat: 9AM-6PM",
    },
  });

  useEffect(() => {
    fetchZoneAndMethods();
  }, [zoneId]);

  const fetchZoneAndMethods = async () => {
    setIsLoading(true);
    try {
      const [zoneRes] = await Promise.all([
        apiGet<any>(`/shipping/zones/${zoneId}`),
      ]);

      // Assuming zone includes methods
      setZone(zoneRes.data.zone);
      setMethods(zoneRes.data.zone.methods || []);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = (type: "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP") => {
    setMethodType(type);
    setEditMethod(null);
    setForm({
      name:
        type === "STORE_PICKUP"
          ? "Store Pickup"
          : type === "FLAT_RATE"
            ? "Flat Rate Delivery"
            : "Weight-Based Delivery",
      flatRateCost: 3000,
      estimatedMinDays: type === "STORE_PICKUP" ? 0 : 2,
      estimatedMaxDays: type === "STORE_PICKUP" ? 0 : 4,
      isActive: true,
      weightRates: [
        { minWeight: 0, maxWeight: 5, cost: 2000 },
        { minWeight: 5, maxWeight: 10, cost: 3000 },
        { minWeight: 10, maxWeight: 20, cost: 4500 },
        { minWeight: 20, maxWeight: 50, cost: 7000 },
        { minWeight: 50, maxWeight: null, cost: 10000 },
      ],
      storeAddress: {
        name: "",
        address: "",
        city: "",
        phone: "",
        hours: "Mon-Sat: 9AM-6PM",
      },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      zoneId,
      name: form.name,
      type: methodType,
      isActive: form.isActive,
      estimatedMinDays: form.estimatedMinDays,
      estimatedMaxDays: form.estimatedMaxDays,
      ...(methodType === "FLAT_RATE" && { flatRateCost: form.flatRateCost }),
      ...(methodType === "TABLE_RATE" && { weightRates: form.weightRates }),
      ...(methodType === "STORE_PICKUP" && { storeAddress: form.storeAddress }),
    };

    try {
      if (editMethod) {
        await apiPut(`/shipping/methods/${editMethod.id}`, payload);
        toast("Method updated", "success");
      } else {
        await apiPost("/shipping/methods", payload);
        toast("Method created", "success");
      }
      setShowModal(false);
      fetchZoneAndMethods();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shipping method?")) return;

    try {
      await apiDelete(`/shipping/methods/${id}`);
      toast("Method deleted", "success");
      fetchZoneAndMethods();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const addWeightBracket = () => {
    const lastBracket = form.weightRates[form.weightRates.length - 1];
    setForm({
      ...form,
      weightRates: [
        ...form.weightRates,
        {
          minWeight: lastBracket.maxWeight || lastBracket.minWeight + 10,
          maxWeight: null,
          cost: lastBracket.cost + 2000,
        },
      ],
    });
  };

  const removeWeightBracket = (index: number) => {
    setForm({
      ...form,
      weightRates: form.weightRates.filter((_, i) => i !== index),
    });
  };

  const updateWeightBracket = (index: number, field: string, value: any) => {
    const updated = [...form.weightRates];
    (updated[index] as any)[field] = value;
    setForm({ ...form, weightRates: updated });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {zone?.name} - Shipping Methods
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure delivery options for this zone
          </p>
        </div>
      </div>

      {/* Add Method Buttons */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={() => openNew("TABLE_RATE")}
          className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-sm transition-all text-left"
        >
          <div className="p-2 bg-blue-50 rounded-lg">
            <Weight className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Table Rate</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Different rates based on weight brackets
            </p>
          </div>
        </button>

        <button
          onClick={() => openNew("FLAT_RATE")}
          className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-sm transition-all text-left"
        >
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Flat Rate</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Single fixed cost for all orders
            </p>
          </div>
        </button>

        <button
          onClick={() => openNew("STORE_PICKUP")}
          className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-sm transition-all text-left"
        >
          <div className="p-2 bg-purple-50 rounded-lg">
            <Store className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Store Pickup</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Free pickup at physical store
            </p>
          </div>
        </button>
      </div>

      {/* Methods List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No shipping methods yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add a method to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {method.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        method.type === "TABLE_RATE"
                          ? "bg-blue-50 text-blue-600"
                          : method.type === "FLAT_RATE"
                            ? "bg-green-50 text-green-600"
                            : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {method.type === "TABLE_RATE"
                        ? "Weight-Based"
                        : method.type === "FLAT_RATE"
                          ? "Flat Rate"
                          : "Store Pickup"}
                    </span>
                    {!method.isActive && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  {method.type === "FLAT_RATE" && (
                    <p className="text-sm text-gray-600">
                      Cost:{" "}
                      <span className="font-semibold">
                        {formatPrice(method.flatRateCost!)}
                      </span>
                    </p>
                  )}

                  {method.type === "TABLE_RATE" && method.weightRates && (
                    <div className="text-xs text-gray-600 space-y-1 mt-2">
                      {method.weightRates.map((rate) => (
                        <div key={rate.id} className="flex items-center gap-2">
                          <span className="text-gray-500">
                            {rate.minWeight}kg -{" "}
                            {rate.maxWeight ? `${rate.maxWeight}kg` : "∞"}:
                          </span>
                          <span className="font-medium">
                            {formatPrice(rate.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {method.type === "STORE_PICKUP" && method.storeAddress && (
                    <div className="text-xs text-gray-600 mt-2">
                      <p>📍 {method.storeAddress.name}</p>
                      <p>
                        {method.storeAddress.address},{" "}
                        {method.storeAddress.city}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Delivery:{" "}
                    {method.estimatedMinDays === 0
                      ? "Same Day"
                      : `${method.estimatedMinDays}-${method.estimatedMaxDays} days`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">
                {editMethod
                  ? "Edit Method"
                  : `New ${methodType === "TABLE_RATE" ? "Table Rate" : methodType === "FLAT_RATE" ? "Flat Rate" : "Store Pickup"} Method`}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Method Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {methodType === "FLAT_RATE" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Shipping Cost *
                  </label>
                  <input
                    type="number"
                    value={form.flatRateCost}
                    onChange={(e) =>
                      setForm({ ...form, flatRateCost: Number(e.target.value) })
                    }
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              {methodType === "TABLE_RATE" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Weight Brackets *
                    </label>
                    <button
                      type="button"
                      onClick={addWeightBracket}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Add Bracket
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.weightRates.map((rate, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rate.minWeight}
                          onChange={(e) =>
                            updateWeightBracket(
                              index,
                              "minWeight",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Min (kg)"
                          className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={rate.maxWeight || ""}
                          onChange={(e) =>
                            updateWeightBracket(
                              index,
                              "maxWeight",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          placeholder="Max (kg)"
                          className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="text-gray-400">=</span>
                        <input
                          type="number"
                          value={rate.cost}
                          onChange={(e) =>
                            updateWeightBracket(
                              index,
                              "cost",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Cost"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                        {form.weightRates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWeightBracket(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {methodType === "STORE_PICKUP" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      value={form.storeAddress.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          storeAddress: {
                            ...form.storeAddress,
                            name: e.target.value,
                          },
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={form.storeAddress.address}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          storeAddress: {
                            ...form.storeAddress,
                            address: e.target.value,
                          },
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={form.storeAddress.city}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            storeAddress: {
                              ...form.storeAddress,
                              city: e.target.value,
                            },
                          })
                        }
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={form.storeAddress.phone}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            storeAddress: {
                              ...form.storeAddress,
                              phone: e.target.value,
                            },
                          })
                        }
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Business Hours
                    </label>
                    <input
                      type="text"
                      value={form.storeAddress.hours}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          storeAddress: {
                            ...form.storeAddress,
                            hours: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                      placeholder="e.g., Mon-Sat: 9AM-6PM"
                    />
                  </div>
                </div>
              )}

              {methodType !== "STORE_PICKUP" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Min Delivery Days
                    </label>
                    <input
                      type="number"
                      value={form.estimatedMinDays}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estimatedMinDays: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Delivery Days
                    </label>
                    <input
                      type="number"
                      value={form.estimatedMaxDays}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estimatedMaxDays: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand-600"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </form>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
              >
                {editMethod ? "Update" : "Create"} Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
