"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Discount, DiscountType } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";

const defaultForm = {
  code: "",
  name: "",
  type: "PERCENTAGE" as DiscountType,
  value: 0,
  minOrderAmount: "",
  usageLimit: "",
  isActive: true,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Discount | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const fetch = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/discounts");
      setDiscounts(res.data.discounts);
    } catch {
      toast("Failed to load discounts", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm(defaultForm);
    setShowForm(true);
  };
  const openEdit = (d: Discount) => {
    setEditItem(d);
    setForm({
      code: d.code,
      name: d.name,
      type: d.type as any,
      value: d.value as any,
      minOrderAmount: d.minOrderAmount?.toString() || "",
      usageLimit: d.usageLimit?.toString() || "",
      isActive: d.isActive,
      startDate: d.startDate.split("T")[0],
      endDate: d.endDate ? d.endDate.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount
          ? Number(form.minOrderAmount)
          : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        endDate: form.endDate || undefined,
      };
      if (editItem) {
        await apiPut(`/discounts/${editItem.id}`, payload);
        toast("Updated", "success");
      } else {
        await apiPost("/discounts", payload);
        toast("Created", "success");
      }
      setShowForm(false);
      fetch();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete discount "${code}"?`)) return;
    try {
      await apiDelete(`/discounts/${id}`);
      toast("Deleted", "success");
      fetch();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const f = (key: string, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Discounts & Coupons</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Discount
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? "Edit Discount" : "New Discount"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { key: "code", label: "Code (uppercase)", type: "text" },
              { key: "name", label: "Display Name", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}
                </label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => f(key, e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 uppercase"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => f("type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₦)</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
              </select>
            </div>
            {form.type !== "FREE_SHIPPING" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Value {form.type === "PERCENTAGE" ? "(%)" : "(₦)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) => f("value", e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Min Order Amount (₦)
              </label>
              <input
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => f("minOrderAmount", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(e) => f("usageLimit", e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => f("startDate", e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => f("endDate", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => f("isActive", e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active
                </span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : editItem ? "Update" : "Create"}
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

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {[
                  "Code",
                  "Name",
                  "Type",
                  "Value",
                  "Usage",
                  "Expires",
                  "Status",
                  "",
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={8} />
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No discounts yet" />
                  </td>
                </tr>
              ) : (
                discounts.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs tracking-wider">
                      {d.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {d.type === "PERCENTAGE"
                        ? `${d.value}%`
                        : d.type === "FREE_SHIPPING"
                          ? "Free"
                          : formatPrice(d.value)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.usageCount}/{d.usageLimit ?? "∞"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.endDate ? formatDate(d.endDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id, d.code)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
      </div>
    </div>
  );
}
