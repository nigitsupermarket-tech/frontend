//frontend/src/app/(admin)/admin/blog/categories/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import { generateSlug } from "@/lib/utils";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: { posts: number };
}

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BlogCategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>("/blog/categories");
      setCategories(res.data.categories || []);
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
    setForm({ name: "", slug: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (c: BlogCategory) => {
    setEditItem(c);
    setForm({ name: c.name, slug: c.slug, description: c.description || "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast("Name and slug are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
      };
      if (editItem) {
        await apiPut(`/blog/categories/${editItem.id}`, payload);
        toast("Category updated", "success");
      } else {
        await apiPost("/blog/categories", payload);
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

  const handleDelete = async (cat: BlogCategory) => {
    if ((cat._count?.posts ?? 0) > 0) {
      toast(
        `Cannot delete "${cat.name}" — it has ${cat._count!.posts} post(s). Reassign them first.`,
        "error",
      );
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await apiDelete(`/blog/categories/${cat.id}`);
      toast("Category deleted", "success");
      fetchCategories();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Blog Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage categories used to organise blog posts
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? "Edit Category" : "New Category"}
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
                    slug: editItem ? form.slug : generateSlug(e.target.value),
                  })
                }
                required
                placeholder="e.g. Business Tips"
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
                placeholder="business-tips"
                className={inputCls + " font-mono"}
              />
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
                placeholder="Optional short description"
                className={inputCls}
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
              {["Category", "Slug", "Posts", ""].map((h) => (
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
              Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={4} />
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    title="No categories yet"
                    description="Create your first blog category to start organising posts"
                    icon={<Tag className="w-8 h-8 text-gray-300" />}
                  />
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900">
                        {cat.name}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-400 mt-0.5 ml-5 truncate max-w-xs">
                        {cat.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        (cat._count?.posts ?? 0) > 0
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {cat._count?.posts ?? 0} posts
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
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={
                          (cat._count?.posts ?? 0) > 0
                            ? "Reassign posts before deleting"
                            : "Delete"
                        }
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
