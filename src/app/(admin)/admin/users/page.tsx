"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { User } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDate } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  STAFF: "bg-purple-100 text-purple-700",
  SALES: "bg-blue-100 text-blue-700",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch ADMIN and STAFF users separately and merge, since the API
      // may not support comma-separated role values
      const [adminRes, staffRes, salesRes] = await Promise.all([
        apiGet<any>("/users", { role: "ADMIN", limit: "100" }),
        apiGet<any>("/users", { role: "STAFF", limit: "100" }),
        apiGet<any>("/users", { role: "SALES", limit: "100" }),
      ]);
      const merged = [
        ...(adminRes.data.users || []),
        ...(staffRes.data.users || []),
        ...(salesRes.data.users || []),
      ];
      // Deduplicate by id
      const unique = merged.filter(
        (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i,
      );
      setUsers(unique);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: "", email: "", phone: "", role: "STAFF", password: "" });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditItem(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      password: "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await apiPut(`/users/${editItem.id}`, {
          name: form.name,
          phone: form.phone || undefined,
          role: form.role,
        });
        toast("User updated", "success");
      } else {
        await apiPost("/users", {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          password: form.password,
        });
        toast("User created", "success");
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/users/${id}`);
      toast("User removed", "success");
      fetchUsers();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Staff & Admin Users</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? "Edit User" : "New Staff User"}
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Full Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={inputCls}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={!!editItem}
                className={
                  inputCls + (editItem ? " bg-gray-50 text-gray-400" : "")
                }
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls + " bg-white"}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
                <option value="SALES">Sales Manager</option>
              </select>
            </div>
            {!editItem && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className={inputCls}
                  placeholder="Min 8 characters"
                  minLength={8}
                />
              </div>
            )}
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
              {["User", "Role", "Phone", "Joined", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="No staff users found" />
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        roleColors[u.role] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
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
