"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, UserCog } from "lucide-react";
import { User } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-emerald-100 text-emerald-700",
  STAFF: "bg-purple-100 text-purple-700",
  SALES: "bg-blue-100 text-blue-700",
  ACCOUNTANT: "bg-teal-100 text-teal-700",
  CUSTOMER: "bg-gray-100 text-gray-600",
};

// Mirrors backend/src/utils/roleHierarchy.ts — lower number = more senior.
// Keep these in sync if the hierarchy ever changes.
const ROLE_RANK: Record<string, number> = {
  ADMIN: 0,
  MANAGER: 1,
  STAFF: 2,
  ACCOUNTANT: 3,
  SALES: 3,
  CUSTOMER: 4,
};
const ALL_ROLES = Object.keys(ROLE_RANK);

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const currentRole = currentUser?.role || "";
  const currentRank = ROLE_RANK[currentRole] ?? 99;
  const isAdmin = currentRole === "ADMIN";

  // Roles this actor is allowed to see at all — peers and anything below
  // them in the hierarchy. Mirrors the backend's rolesAbove() exclusion.
  const visibleRoles = isAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => ROLE_RANK[r] >= currentRank);

  // Roles this actor is allowed to ASSIGN to someone (strictly below their
  // own rank) — ADMIN can assign anything, including ADMIN itself.
  const assignableRoles = isAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => ROLE_RANK[r] > currentRank);

  // Only ADMIN/MANAGER mint brand-new accounts — STAFF's capability is
  // promoting/demoting EXISTING customers (backend also enforces this).
  const canCreate = isAdmin || currentRole === "MANAGER";
  const canDelete = isAdmin;
  const canEditTarget = (target: User) =>
    isAdmin || ROLE_RANK[target.role] > currentRank;

  const defaultNewRole =
    assignableRoles.find((r) => r !== "CUSTOMER") || assignableRoles[0] || "";

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: defaultNewRole,
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // ── Staff-tier table (everyone visible except plain customers) ──────────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch each visible non-customer role separately and merge, since the
      // API may not support comma-separated role values. Visibility itself
      // is also enforced server-side — this just avoids requesting roles we
      // already know we can't see.
      const roleQueries = visibleRoles.filter((r) => r !== "CUSTOMER");
      const results = await Promise.all(
        roleQueries.map((role) =>
          apiGet<any>("/users", { role, limit: "100" }),
        ),
      );
      const merged = results.flatMap((r) => r.data.users || []);
      const unique = merged.filter(
        (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i,
      );
      setUsers(unique);
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Customer lookup (search by name/email, then upgrade their role) ─────
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<User[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const searchCustomers = async () => {
    if (!customerSearch.trim()) return;
    setSearchingCustomers(true);
    setSearchedOnce(true);
    try {
      const res = await apiGet<any>("/users", {
        role: "CUSTOMER",
        search: customerSearch.trim(),
        limit: "20",
      });
      setCustomerResults(res.data.users || []);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSearchingCustomers(false);
    }
  };

  const openNew = () => {
    setEditItem(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      role: defaultNewRole,
      password: "",
    });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    if (!canEditTarget(u)) {
      toast("You don't have permission to modify this account", "error");
      return;
    }
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
        toast(
          form.role !== editItem.role
            ? `${editItem.name} is now ${form.role}`
            : "User updated",
          "success",
        );
        // Reflect the change immediately wherever this user is showing.
        setUsers((prev) =>
          prev
            .map((u) =>
              u.id === editItem.id ? { ...u, ...form, role: form.role as User["role"] } : u,
            )
            // If they were demoted to CUSTOMER (or promoted out of
            // visibility), drop them from the staff-tier table.
            .filter((u) => visibleRoles.includes(u.role) && u.role !== "CUSTOMER"),
        );
        setCustomerResults((prev) =>
          prev.filter((u) => u.id !== editItem.id),
        );
      } else {
        await apiPost("/users", {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          password: form.password,
        });
        toast("User created", "success");
        fetchUsers();
      }
      setShowForm(false);
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

  const renderRoleOptions = () =>
    assignableRoles.map((r) => (
      <option key={r} value={r}>
        {r.charAt(0) + r.slice(1).toLowerCase()}
      </option>
    ));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAdmin
              ? "Full access — all roles"
              : `Signed in as ${currentRole.charAt(0) + currentRole.slice(1).toLowerCase()} — you can only manage roles below your own`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editItem ? `Edit ${editItem.name}` : "New Staff User"}
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
                disabled={!!editItem}
                className={
                  inputCls + (editItem ? " bg-gray-50 text-gray-400" : "")
                }
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
                disabled={!!editItem}
                className={
                  inputCls + (editItem ? " bg-gray-50 text-gray-400" : "")
                }
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
                {renderRoleOptions()}
              </select>
              {editItem && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Only roles below your own are selectable.
                </p>
              )}
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

      {/* ── Customer lookup — find any customer and upgrade their role ──── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserCog className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">
            Find a customer to upgrade
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCustomers()}
              placeholder="Search by name or email…"
              className={inputCls + " pl-9"}
            />
          </div>
          <button
            onClick={searchCustomers}
            disabled={searchingCustomers || !customerSearch.trim()}
            className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {searchingCustomers ? "Searching…" : "Search"}
          </button>
        </div>

        {searchedOnce && !searchingCustomers && (
          <div className="mt-4 divide-y divide-gray-50">
            {customerResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">
                No matching customers found.
              </p>
            ) : (
              customerResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {u.name}
                      </p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(u)}
                    className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                  >
                    Upgrade role
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Staff-tier accounts (peers and below, per role hierarchy) ──── */}
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
                      {canEditTarget(u) && (
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
