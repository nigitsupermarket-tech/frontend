//frontend/src/app/(admin)/admin/brands/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Brand } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import { generateSlug } from "@/lib/utils";
import { DragDropMediaUploader } from "@/components/shared/drag-drop-media-uploader";
import Image from "next/image";

interface MediaItem {
  url: string;
  publicId?: string;
  type: "image" | "video";
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Brand | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });
  // ✅ FIX 1: logo is now a MediaItem array, not a raw URL string
  const [logoMedia, setLogoMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/brands");
      setBrands(res.data.brands);
    } catch {
      toast("Failed to load brands", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: "", slug: "", description: "", isActive: true });
    setLogoMedia([]);
    setShowForm(true);
  };

  const openEdit = (b: Brand) => {
    setEditItem(b);
    setForm({
      name: b.name,
      slug: b.slug,
      description: b.description || "",
      isActive: b.isActive,
    });
    // Pre-populate the uploader with the existing logo if present
    setLogoMedia(b.logo ? [{ url: b.logo, type: "image" as const }] : []);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        // ✅ Pull the URL from the first uploaded media item
        logo: logoMedia[0]?.url || undefined,
        isActive: form.isActive,
      };
      if (editItem) {
        await apiPut(`/brands/${editItem.id}`, payload);
        toast("Brand updated", "success");
      } else {
        await apiPost("/brands", payload);
        toast("Brand created", "success");
      }
      setShowForm(false);
      fetchBrands();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete brand "${name}"?`)) return;
    try {
      await apiDelete(`/brands/${id}`);
      toast("Deleted", "success");
      fetchBrands();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Brands</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? "Edit Brand" : "New Brand"}
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })
                }
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
                className={inputCls + " font-mono"}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={inputCls}
              />
            </div>

            {/* ✅ FIX 1: Replaced URL text input with the proper uploader */}
            <div className="sm:col-span-2">
              <DragDropMediaUploader
                value={logoMedia}
                onChange={setLogoMedia}
                maxFiles={1}
                folder="brands"
                accept="image"
                label="Brand Logo"
                helperText="Upload a logo image (PNG or SVG with transparent background works best)"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {["Logo", "Name", "Slug", "Products", "Status", ""].map((h) => (
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
                <TableRowSkeleton key={i} cols={6} />
              ))
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="No brands yet" />
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    {b.logo ? (
                      <Image
                        src={b.logo}
                        alt={b.name}
                        className="w-9 h-9 rounded-lg object-contain border border-gray-100"
                        width={36}
                        height={36}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {b.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {b.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b._count?.products ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
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
  );
}
