"use client";
// frontend/src/app/(admin)/admin/shipping/zones/[zoneId]/page.tsx
// Zone detail — view zone info, manage all shipping methods for this zone

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Weight,
  DollarSign,
  Store,
  ToggleLeft,
  ToggleRight,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

interface WeightRate {
  id?: string;
  minWeight: number;
  maxWeight: number | null;
  cost: number;
}

interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  type: "TABLE_RATE" | "FLAT_RATE" | "STORE_PICKUP";
  isActive: boolean;
  flatRateCost?: number;
  freeShippingAbove?: number;
  isFreeShipping: boolean;
  applicableToAll: boolean;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  storeAddress?: any;
  weightRates: WeightRate[];
}

interface Zone {
  id: string;
  name: string;
  description?: string;
  states: string[];
  isActive: boolean;
  sortOrder: number;
  methods: ShippingMethod[];
}

const TYPE_META = {
  TABLE_RATE: {
    label: "Weight-Based (Table Rate)",
    color: "bg-blue-50 text-blue-700",
    Icon: Weight,
    desc: "Price changes with package weight",
  },
  FLAT_RATE: {
    label: "Flat Rate",
    color: "bg-green-50 text-green-700",
    Icon: DollarSign,
    desc: "Fixed price regardless of weight",
  },
  STORE_PICKUP: {
    label: "Store Pickup",
    color: "bg-purple-50 text-purple-700",
    Icon: Store,
    desc: "Customer collects from your store",
  },
};

const DEFAULT_WEIGHT_RATES: WeightRate[] = [
  { minWeight: 0, maxWeight: 1, cost: 1000 },
  { minWeight: 1, maxWeight: 5, cost: 1500 },
  { minWeight: 5, maxWeight: 10, cost: 2500 },
  { minWeight: 10, maxWeight: 20, cost: 4000 },
  { minWeight: 20, maxWeight: null, cost: 6000 },
];

export default function ZoneDetailPage() {
  const toast = useToast();
  const params = useParams();
  const zoneId = params.zoneId as string;

  const [zone, setZone] = useState<Zone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editMethod, setEditMethod] = useState<ShippingMethod | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchZone();
  }, [zoneId]);

  const fetchZone = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>(`/shipping/zones/${zoneId}`);
      setZone(res.data.zone);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMethod = async (method: ShippingMethod) => {
    try {
      await apiPut(`/shipping/methods/${method.id}`, {
        isActive: !method.isActive,
      });
      toast(
        `${method.name} ${!method.isActive ? "activated" : "deactivated"}`,
        "success",
      );
      fetchZone();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleDeleteMethod = async (method: ShippingMethod) => {
    if (!confirm(`Delete "${method.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/shipping/methods/${method.id}`);
      toast("Method deleted", "success");
      fetchZone();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="p-6 text-center text-gray-400 py-20">
        Zone not found.{" "}
        <Link href="/admin/shipping/zones" className="text-brand-600 underline">
          Back to zones
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/shipping/zones"
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 mt-0.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-0.5">
            <Link href="/admin/shipping" className="hover:text-brand-600">
              Shipping
            </Link>{" "}
            /{" "}
            <Link href="/admin/shipping/zones" className="hover:text-brand-600">
              Zones
            </Link>{" "}
            / <span className="text-gray-900">{zone.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
          {zone.description && (
            <p className="text-sm text-gray-500 mt-1">{zone.description}</p>
          )}
        </div>
        <button
          onClick={() => {
            setEditMethod(null);
            setShowMethodForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Method
        </button>
      </div>

      {/* Zone Coverage */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Coverage ({zone.states.length} areas)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {zone.states.map((s) => {
            const parts = s.split("::");
            return (
              <span
                key={s}
                className="px-2.5 py-0.5 bg-white border border-gray-200 text-xs text-gray-700 rounded-lg"
              >
                {parts.length > 1 ? `${parts[1]} (${parts[0]})` : s}
              </span>
            );
          })}
        </div>
      </div>

      {/* Methods */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Shipping Methods ({zone.methods.length})
        </h2>

        {zone.methods.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
            <Weight className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-gray-600">No methods yet</p>
            <p className="text-sm mt-1">Add a delivery method for this zone</p>
            <button
              onClick={() => setShowMethodForm(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50"
            >
              Add first method
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {zone.methods.map((method) => {
              const meta = TYPE_META[method.type];
              const isExpanded = expandedMethod === method.id;

              return (
                <div
                  key={method.id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                    method.isActive
                      ? "border-gray-100"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  {/* Method Header */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleMethod(method)}
                      className="flex-shrink-0"
                    >
                      {method.isActive ? (
                        <ToggleRight className="w-7 h-7 text-brand-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-300" />
                      )}
                    </button>

                    {/* Icon + Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {method.name}
                        </span>
                        {!method.isActive && (
                          <span className="text-xs text-gray-400">
                            (inactive)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        {method.type === "FLAT_RATE" &&
                          method.flatRateCost !== undefined && (
                            <span>{formatPrice(method.flatRateCost)}</span>
                          )}
                        {method.type === "TABLE_RATE" && (
                          <span>
                            {method.weightRates.length} weight brackets ·{" "}
                            {method.weightRates[0]
                              ? `${formatPrice(method.weightRates[0].cost)} – ${formatPrice(method.weightRates[method.weightRates.length - 1]?.cost ?? 0)}`
                              : ""}
                          </span>
                        )}
                        {method.type === "STORE_PICKUP" && (
                          <span>Free pickup</span>
                        )}
                        {method.freeShippingAbove && (
                          <span className="text-green-600">
                            Free above {formatPrice(method.freeShippingAbove)}
                          </span>
                        )}
                        {method.estimatedMinDays !== undefined &&
                          method.estimatedMaxDays !== undefined && (
                            <span>
                              {method.estimatedMinDays === 0 &&
                              method.estimatedMaxDays === 0
                                ? "Same day"
                                : method.estimatedMinDays ===
                                    method.estimatedMaxDays
                                  ? `${method.estimatedMinDays} day${method.estimatedMinDays !== 1 ? "s" : ""}`
                                  : `${method.estimatedMinDays}–${method.estimatedMaxDays} days`}
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {method.type === "TABLE_RATE" &&
                        method.weightRates.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedMethod(isExpanded ? null : method.id)
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      <button
                        onClick={() => {
                          setEditMethod(method);
                          setShowMethodForm(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method)}
                        className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weight Rates Table (expanded) */}
                  {isExpanded && method.type === "TABLE_RATE" && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Weight Rate Table
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase tracking-wide">
                            <th className="text-left pb-1.5 font-medium">
                              Min Weight
                            </th>
                            <th className="text-left pb-1.5 font-medium">
                              Max Weight
                            </th>
                            <th className="text-right pb-1.5 font-medium">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/60">
                          {method.weightRates.map((rate, i) => (
                            <tr key={i}>
                              <td className="py-1.5 text-gray-700">
                                {rate.minWeight} kg
                              </td>
                              <td className="py-1.5 text-gray-700">
                                {rate.maxWeight != null
                                  ? `${rate.maxWeight} kg`
                                  : "No limit"}
                              </td>
                              <td className="py-1.5 text-right font-semibold text-gray-900">
                                {formatPrice(rate.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Store Address (if pickup) */}
                  {method.type === "STORE_PICKUP" && method.storeAddress && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-0.5">
                      <p className="font-semibold text-gray-800">
                        {method.storeAddress.name}
                      </p>
                      <p>{method.storeAddress.address}</p>
                      <p>
                        {method.storeAddress.city} · {method.storeAddress.phone}
                      </p>
                      <p className="text-gray-400">
                        {method.storeAddress.hours}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Method Form Modal */}
      {showMethodForm && (
        <MethodFormModal
          zoneId={zone.id}
          zoneName={zone.name}
          existingMethod={editMethod}
          onClose={() => {
            setShowMethodForm(false);
            setEditMethod(null);
          }}
          onSuccess={() => {
            setShowMethodForm(false);
            setEditMethod(null);
            fetchZone();
          }}
        />
      )}
    </div>
  );
}

// ── Method Form Modal ─────────────────────────────────────────────────────────

function MethodFormModal({
  zoneId,
  zoneName,
  existingMethod,
  onClose,
  onSuccess,
}: {
  zoneId: string;
  zoneName: string;
  existingMethod: ShippingMethod | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const isEditing = !!existingMethod;

  const [form, setForm] = useState({
    name: existingMethod?.name || "",
    description: existingMethod?.description || "",
    type: (existingMethod?.type || "TABLE_RATE") as
      | "TABLE_RATE"
      | "FLAT_RATE"
      | "STORE_PICKUP",
    isActive: existingMethod?.isActive ?? true,
    flatRateCost: existingMethod?.flatRateCost?.toString() || "",
    freeShippingAbove: existingMethod?.freeShippingAbove?.toString() || "",
    isFreeShipping: existingMethod?.isFreeShipping ?? false,
    estimatedMinDays: existingMethod?.estimatedMinDays?.toString() || "1",
    estimatedMaxDays: existingMethod?.estimatedMaxDays?.toString() || "3",
    storeAddress: existingMethod?.storeAddress || {
      name: "",
      address: "",
      city: "Port Harcourt",
      phone: "",
      hours: "Mon–Sat: 8am–7pm",
    },
  });

  const [weightRates, setWeightRates] = useState<WeightRate[]>(
    existingMethod?.weightRates?.length
      ? existingMethod.weightRates
      : DEFAULT_WEIGHT_RATES,
  );
  const [loading, setLoading] = useState(false);

  const addWeightRate = () => {
    const last = weightRates[weightRates.length - 1];
    const newMin = last ? (last.maxWeight ?? last.minWeight + 10) : 0;
    setWeightRates([
      ...weightRates.map((r, i) => {
        if (i === weightRates.length - 1 && r.maxWeight === null) {
          return { ...r, maxWeight: newMin };
        }
        return r;
      }),
      { minWeight: newMin, maxWeight: null, cost: 0 },
    ]);
  };

  const removeWeightRate = (index: number) => {
    setWeightRates(weightRates.filter((_, i) => i !== index));
  };

  const updateWeightRate = (
    index: number,
    field: keyof WeightRate,
    value: string,
  ) => {
    const updated = [...weightRates];
    if (field === "maxWeight") {
      updated[index] = {
        ...updated[index],
        maxWeight: value === "" || value === "∞" ? null : parseFloat(value),
      };
    } else if (field === "cost" || field === "minWeight") {
      updated[index] = {
        ...updated[index],
        [field]: parseFloat(value) || 0,
      };
    }
    setWeightRates(updated);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast("Method name is required", "error");
      return;
    }
    if (form.type === "FLAT_RATE" && !form.flatRateCost) {
      toast("Flat rate cost is required", "error");
      return;
    }
    if (form.type === "TABLE_RATE" && weightRates.length === 0) {
      toast("Add at least one weight bracket", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        isActive: form.isActive,
        isFreeShipping: form.isFreeShipping,
        estimatedMinDays: parseInt(form.estimatedMinDays) || 0,
        estimatedMaxDays: parseInt(form.estimatedMaxDays) || 0,
        ...(form.freeShippingAbove && {
          freeShippingAbove: parseFloat(form.freeShippingAbove),
        }),
        ...(form.type === "FLAT_RATE" && {
          flatRateCost: parseFloat(form.flatRateCost),
        }),
        ...(form.type === "TABLE_RATE" && { weightRates }),
        ...(form.type === "STORE_PICKUP" && {
          storeAddress: form.storeAddress,
        }),
      };

      if (isEditing && existingMethod) {
        await apiPut(`/shipping/methods/${existingMethod.id}`, payload);
        toast("Method updated", "success");
      } else {
        await apiPost("/shipping/methods", { ...payload, zoneId });
        toast("Method created", "success");
      }
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditing ? "Edit" : "Add"} Shipping Method
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Zone: {zoneName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Method Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                Object.entries(TYPE_META) as [
                  keyof typeof TYPE_META,
                  (typeof TYPE_META)[keyof typeof TYPE_META],
                ][]
              ).map(([type, meta]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    form.type === type
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <meta.Icon className="w-5 h-5" />
                  <span>{meta.label.split(" ").slice(0, 2).join(" ")}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {TYPE_META[form.type].desc}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Standard Delivery (PH Metro)"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Short description shown at checkout"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Delivery estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Days
              </label>
              <input
                type="number"
                min="0"
                value={form.estimatedMinDays}
                onChange={(e) =>
                  setForm({ ...form, estimatedMinDays: e.target.value })
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Days
              </label>
              <input
                type="number"
                min="0"
                value={form.estimatedMaxDays}
                onChange={(e) =>
                  setForm({ ...form, estimatedMaxDays: e.target.value })
                }
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Flat Rate specific */}
          {form.type === "FLAT_RATE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flat Rate Cost (₦) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={form.flatRateCost}
                onChange={(e) =>
                  setForm({ ...form, flatRateCost: e.target.value })
                }
                placeholder="e.g. 2500"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Table Rate — weight brackets */}
          {form.type === "TABLE_RATE" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Weight Rate Table *
                </label>
                <button
                  type="button"
                  onClick={addWeightRate}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add bracket
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                        Min (kg)
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                        Max (kg)
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                        Cost (₦)
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weightRates.map((rate, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={rate.minWeight}
                            onChange={(e) =>
                              updateWeightRate(i, "minWeight", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={rate.maxWeight ?? ""}
                            onChange={(e) =>
                              updateWeightRate(i, "maxWeight", e.target.value)
                            }
                            placeholder="∞"
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={rate.cost}
                            onChange={(e) =>
                              updateWeightRate(i, "cost", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {weightRates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWeightRate(i)}
                              className="p-1 text-red-300 hover:text-red-500 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Leave Max empty for the final bracket (no upper limit)
              </p>
            </div>
          )}

          {/* Store Pickup specific */}
          {form.type === "STORE_PICKUP" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Pickup Location *
              </label>
              {[
                {
                  key: "name",
                  label: "Store Name",
                  placeholder: "NigiTriple PH Store",
                },
                {
                  key: "address",
                  label: "Address",
                  placeholder: "5 Rumuola Road, Rumuola",
                },
                { key: "city", label: "City", placeholder: "Port Harcourt" },
                {
                  key: "phone",
                  label: "Phone",
                  placeholder: "+234 801 234 5678",
                },
                {
                  key: "hours",
                  label: "Hours",
                  placeholder: "Mon–Sat: 8am–7pm",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    {field.label}
                  </label>
                  <input
                    value={(form.storeAddress as any)[field.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        storeAddress: {
                          ...form.storeAddress,
                          [field.key]: e.target.value,
                        },
                      })
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Free Shipping Threshold */}
          {form.type !== "STORE_PICKUP" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Free Shipping Above (₦)
              </label>
              <p className="text-xs text-gray-400 mb-1.5">
                Order total above this amount ships free. Leave blank to
                disable.
              </p>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.freeShippingAbove}
                onChange={(e) =>
                  setForm({ ...form, freeShippingAbove: e.target.value })
                }
                placeholder="e.g. 50000"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Saving…" : isEditing ? "Save Changes" : "Create Method"}
          </button>
        </div>
      </div>
    </div>
  );
}
