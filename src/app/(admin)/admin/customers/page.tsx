"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Eye, Download } from "lucide-react";
import { User, Pagination } from "@/types";
import { apiGet } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import Image from "next/image";

const segmentColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  REGULAR: "bg-gray-100 text-gray-700",
  VIP: "bg-yellow-100 text-yellow-700",
  WHOLESALE: "bg-purple-100 text-purple-700",
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const toast = useToast();

  const fetch = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20, role: "CUSTOMER" };
      if (search) params.search = search;
      const res = await apiGet<any>("/users", params);
      setCustomers(res.data.users);
      setPagination(res.data.pagination);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiGet<any>("/export/customers");
      // res.data should be a CSV string or trigger download
      const blob = new Blob([res.data || JSON.stringify(customers)], {
        type: "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Customers exported", "success");
    } catch {
      toast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          {pagination && (
            <span className="text-sm text-gray-400">
              {pagination.total.toLocaleString()} total
            </span>
          )}
        </div>

        {/* Export button — ADMIN only */}
        {isAdmin && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetch();
        }}
        className="relative max-w-lg"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
        />
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {[
                  "Customer",
                  "Phone",
                  "Segment",
                  "Orders",
                  "Total Spent",
                  "Joined",
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
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No customers found" />
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <Image
                            src={c.image}
                            alt={c.name}
                            className="w-8 h-8 rounded-full object-cover"
                            width={32}
                            height={32}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.customerSegment && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${segmentColors[c.customerSegment] || ""}`}
                        >
                          {c.customerSegment}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.orderCount}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatPrice(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
