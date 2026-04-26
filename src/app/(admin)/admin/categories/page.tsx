"use client";
// frontend/src/app/(admin)/admin/categories/page.tsx

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Category } from "@/types";
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    isActive: true,
  });
  // ✅ Separate media states for the regular image and SVG icon
  const [imageMedia, setImageMedia] = useState<MediaItem[]>([]);
  const [svgMedia, setSvgMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/categories");
      setCategories(res.data.categories);
    } catch {
      toast("Failed to load categories", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      parentId: "",
      isActive: true,
    });
    setImageMedia([]);
    setSvgMedia([]);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parentId: cat.parentId || "",
      isActive: cat.isActive,
    });
    setImageMedia(
      cat.image ? [{ url: cat.image, type: "image" as const }] : [],
    );
    setSvgMedia(
      cat.svgIcon ? [{ url: cat.svgIcon, type: "image" as const }] : [],
    );
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        parentId: form.parentId || undefined,
        image: imageMedia[0]?.url || undefined,
        svgIcon: svgMedia[0]?.url || undefined,
      };
      if (editItem) {
        await apiPut(`/categories/${editItem.id}`, payload);
        toast("Category updated", "success");
      } else {
        await apiPost("/categories", payload);
        toast("Category created", "success");
      }
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiDelete(`/categories/${id}`);
      toast("Deleted", "success");
      fetchCategories();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const topLevel = categories.filter((c) => !c.parentId);
  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? "Edit Category" : "New Category"}
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            {/* Name */}
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

            {/* Slug */}
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

            {/* Parent */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Parent Category
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="">None (top-level)</option>
                {topLevel
                  .filter((c) => !editItem || c.id !== editItem.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Active */}
            <div className="flex items-end gap-2">
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

            {/* Description */}
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

            {/* ✅ Category Image uploader (JPG/PNG/WebP — shown in the header bar) */}
            <div className="sm:col-span-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Category Image
              </p>
              <p className="text-[11px] text-gray-400 mb-3">
                Shown in the storefront category bar. Use a square image (80×80
                px+). JPG, PNG or WebP.
              </p>
              <DragDropMediaUploader
                value={imageMedia}
                onChange={setImageMedia}
                maxFiles={1}
                folder="categories"
                accept="image"
                label=""
                helperText="PNG, JPG, WebP — square recommended"
              />
            </div>

            {/* ✅ SVG Icon uploader (supports CSS colour-change on hover) */}
            <div className="sm:col-span-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                SVG Icon{" "}
                <span className="text-brand-600 font-normal">
                  (for hover colour effects)
                </span>
              </p>
              <p className="text-[11px] text-gray-400 mb-3">
                Upload an SVG icon. The storefront will apply a brand-colour
                tint on hover automatically via CSS filter. If both an image and
                SVG are set, the SVG takes priority in the header.
              </p>
              <DragDropMediaUploader
                value={svgMedia}
                onChange={setSvgMedia}
                maxFiles={1}
                folder="categories/svg"
                accept="image"
                label=""
                helperText="SVG files only — upload as image"
              />
            </div>

            {/* Actions */}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase w-14">
                Image
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                Slug
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                Parent
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                Products
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={7} />
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="No categories yet" />
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const thumb = cat.svgIcon || cat.image;
                return (
                  <tr
                    key={cat.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Thumbnail preview */}
                    <td className="px-4 py-3">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={cat.name}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-lg object-contain border border-gray-100 bg-gray-50"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                          {cat.icon || "📦"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {cat.parent?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {cat._count?.products ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
