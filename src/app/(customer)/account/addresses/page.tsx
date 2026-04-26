//frontend/src/app/(customer)/account/addresses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Star, ChevronLeft } from "lucide-react";
import { Address } from "@/types";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { NIGERIAN_STATES } from "@/lib/utils";

const emptyForm = {
  label: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  isDefault: false,
};

export default function AddressesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // ✅ NEW API: /api/v1/addresses
      const res = await apiGet<{
        success: boolean;
        data: { addresses: Address[] };
      }>("/addresses");
      setAddresses(res.data.addresses);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [user]);

  const openNew = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditItem(addr);
    setForm({
      label: addr.label || "",
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone,
      address: addr.address,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode || "",
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: form.label || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        country: "Nigeria",
        postalCode: form.postalCode || undefined,
        isDefault: form.isDefault,
      };

      if (editItem) {
        // ✅ NEW API: PUT /api/v1/addresses/:id
        await apiPut(`/addresses/${editItem.id}`, payload);
        toast("Address updated successfully", "success");
      } else {
        // ✅ NEW API: POST /api/v1/addresses
        await apiPost("/addresses", payload);
        toast("Address added successfully", "success");
      }

      setShowForm(false);
      fetchAddresses();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      // ✅ NEW API: DELETE /api/v1/addresses/:id
      await apiDelete(`/addresses/${id}`);
      toast("Address deleted successfully", "success");
      fetchAddresses();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // ✅ NEW API: PUT /api/v1/addresses/:id/set-default
      await apiPut(`/addresses/${id}/set-default`, {});
      toast("Default address updated", "success");
      fetchAddresses();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const f = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors";

  return (
    <div className="container py-10 max-w-2xl space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Saved Addresses
        </h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">
            {editItem ? "Edit Address" : "New Address"}
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            {/* Label */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Label (e.g. Home, Office)
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => f("label", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>

            {/* First Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => f("firstName", e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => f("lastName", e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {/* Phone */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => f("phone", e.target.value)}
                required
                className={inputCls}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            {/* Address Line 1 */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => f("address", e.target.value)}
                required
                className={inputCls}
                placeholder="House number and street name"
              />
            </div>

            {/* Address Line 2 */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={form.addressLine2}
                onChange={(e) => f("addressLine2", e.target.value)}
                className={inputCls}
                placeholder="Apartment, suite, unit, etc. (optional)"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                City *
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => f("city", e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                State *
              </label>
              <select
                value={form.state}
                onChange={(e) => f("state", e.target.value)}
                required
                className={inputCls + " bg-white"}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Postal Code */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => f("postalCode", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>

            {/* Default Checkbox */}
            <div className="sm:col-span-2 flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => f("isDefault", e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Set as default address
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {saving
                  ? "Saving…"
                  : editItem
                    ? "Update Address"
                    : "Save Address"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 mb-4">No saved addresses yet.</p>
          <button
            onClick={openNew}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl border p-5 transition-all ${
                addr.isDefault
                  ? "border-brand-200 shadow-sm"
                  : "border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-900">
                      {addr.firstName} {addr.lastName}
                    </p>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs font-medium rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Default
                      </span>
                    )}
                    {addr.label && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {addr.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {addr.address}
                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {addr.city}, {addr.state}
                  </p>
                  {addr.postalCode && (
                    <p className="text-sm text-gray-500">{addr.postalCode}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
