"use client";
// frontend/src/app/(admin)/admin/inbox/subscribers/page.tsx

import { useState, useEffect } from "react";
import {
  Users,
  Trash2,
  Download,
  Filter,
  UserCheck,
  UserX,
} from "lucide-react";
import { apiGet, apiDelete, getApiError } from "@/lib/api";
import { useIsAdmin } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { formatDate } from "@/lib/utils";
import {
  EmptyState,
  TableRowSkeleton,
} from "@/components/shared/loading-spinner";

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
  source?: string;
  tags: string[];
  subscribedAt: string;
  unsubscribedAt?: string;
}

export default function AdminSubscribersPage() {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<any>(
        `/subscribers?page=${page}&limit=30${filter !== "" ? `&active=${filter}` : ""}`,
      );
      setSubscribers(res.data.subscribers);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch {
      toast("Failed to load subscribers", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [page, filter]);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from subscriber list?`)) return;
    try {
      await apiDelete(`/subscribers/${id}`);
      toast("Removed", "success");
      fetchSubscribers();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  // CSV export
  const exportCSV = () => {
    const rows = [
      ["Email", "Name", "Status", "Source", "Subscribed At"],
      ...subscribers.map((s) => [
        s.email,
        s.name || "",
        s.isActive ? "Active" : "Unsubscribed",
        s.source || "",
        formatDate(s.subscribedAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const active = subscribers.filter((s) => s.isActive).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Email newsletter list — {total} total
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:border-green-400 hover:text-green-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">
            Unsubscribed
          </p>
          <p className="text-2xl font-bold text-gray-400 mt-1">
            {subscribers.filter((s) => !s.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        {(["", "true", "false"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "" ? "All" : f === "true" ? "Active" : "Unsubscribed"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {["Email", "Name", "Source", "Status", "Subscribed", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={6} />
              ))
            ) : subscribers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No subscribers yet"
                    description="Subscribers will appear here when people sign up"
                    icon={<Users className="w-8 h-8 text-gray-200" />}
                  />
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sub.name || "—"}</td>
                  <td className="px-4 py-3">
                    {sub.source ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {sub.source}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub.isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                        <UserCheck className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                        <UserX className="w-3.5 h-3.5" /> Unsubscribed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(sub.subscribedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(sub.id, sub.email)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "border border-gray-200 text-gray-700 hover:border-green-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
