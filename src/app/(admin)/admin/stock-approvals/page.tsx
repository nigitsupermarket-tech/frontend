"use client";
// frontend/src/app/(admin)/admin/stock-approvals/page.tsx

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  Package,
} from "lucide-react";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Image from "next/image";

interface StockRequest {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  requestedByName: string;
  currentQty: number;
  requestedQty: number;
  reason?: string;
  source: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  product?: { images: string[] };
}

const STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const SOURCE_LABELS: Record<string, string> = {
  INVENTORY: "Inventory Page",
  PRODUCT_UPDATE: "Product Edit",
};

export default function StockApprovalsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actioning, setActioning] = useState<string | null>(null);
  const [bulkActioning, setBulkActioning] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const [filters, setFilters] = useState({
    status: "PENDING",
    source: "",
    search: "",
    page: 1,
  });

  const toast = useToast();
  const { user } = useAuthStore();
  const router = useRouter();

  // Guard — admin only
  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/admin/dashboard");
  }, [user]);

  const fetchRequests = useCallback(
    async (f = filters) => {
      setIsLoading(true);
      try {
        const params: any = { page: f.page, limit: 20 };
        if (f.status) params.status = f.status;
        if (f.source) params.source = f.source;
        if (f.search) params.search = f.search;
        const res = await apiGet<any>("/stock-approvals", params);
        setRequests(res.data.requests);
        setPagination(res.data.pagination);
        setSelected(new Set());
      } catch {
        toast("Failed to load requests", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchRequests(filters);
  }, [filters.page]);

  const applyFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    fetchRequests(next);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pendingIds = requests
      .filter((r) => r.status === "PENDING")
      .map((r) => r.id);
    if (selected.size === pendingIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await apiPost(`/stock-approvals/${id}/approve`, {
        reviewNote: reviewNote || undefined,
      });
      toast("Approved and stock updated", "success");
      setReviewNote("");
      fetchRequests(filters);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await apiPost(`/stock-approvals/${id}/reject`, {
        reviewNote: reviewNote || undefined,
      });
      toast("Request rejected", "success");
      setReviewNote("");
      fetchRequests(filters);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setActioning(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Approve ${selected.size} selected request(s)?`)) return;
    setBulkActioning(true);
    try {
      const res = await apiPost<any>("/stock-approvals/bulk-approve", {
        ids: Array.from(selected),
        reviewNote: reviewNote || undefined,
      });
      toast(res.message || `${selected.size} approved`, "success");
      setReviewNote("");
      fetchRequests(filters);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setBulkActioning(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const allPendingSelected =
    pendingRequests.length > 0 && selected.size === pendingRequests.length;

  const sel =
    "px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500 bg-white";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Stock Approval Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and approve stock changes submitted by staff
          </p>
        </div>
        <button
          onClick={() => fetchRequests(filters)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && applyFilter("search", filters.search)
              }
              placeholder="Search product, SKU, staff…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => applyFilter("status", e.target.value)}
            className={sel}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Source */}
          <select
            value={filters.source}
            onChange={(e) => applyFilter("source", e.target.value)}
            className={sel}
          >
            <option value="">All Sources</option>
            <option value="INVENTORY">Inventory Page</option>
            <option value="PRODUCT_UPDATE">Product Edit</option>
          </select>
        </div>

        {/* Stats row */}
        {pagination && (
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>{pagination.total} total requests</span>
            {filters.status === "PENDING" && pendingRequests.length > 0 && (
              <span className="text-amber-600 font-medium">
                {pendingRequests.length} pending on this page
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {filters.status === "PENDING" && pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-amber-800"
          >
            {allPendingSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allPendingSelected ? "Deselect all" : "Select all pending"}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-amber-700">
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  placeholder="Review note (optional)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-amber-300 rounded-xl focus:outline-none"
                />
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkActioning}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {bulkActioning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Bulk Approve ({selected.size})
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {filters.status === "PENDING" && (
                  <th className="w-10 px-4 py-3"></th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Product
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Staff
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Change
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Reason
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Source
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Date
                </th>
                {filters.status === "PENDING" && (
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({
                      length: filters.status === "PENDING" ? 9 : 7,
                    }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={filters.status === "PENDING" ? 9 : 7}>
                    <div className="py-12 text-center">
                      <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">
                        No requests found
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {filters.status === "PENDING"
                          ? "All stock changes are up to date"
                          : "Try adjusting your filters"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const diff = req.requestedQty - req.currentQty;
                  const isPending = req.status === "PENDING";
                  const isSelected = selected.has(req.id);

                  return (
                    <tr
                      key={req.id}
                      className={`border-b border-gray-50 transition-colors ${isSelected ? "bg-amber-50/50" : "hover:bg-gray-50/30"}`}
                    >
                      {filters.status === "PENDING" && (
                        <td className="px-4 py-3">
                          {isPending && (
                            <button onClick={() => toggleSelect(req.id)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-brand-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300" />
                              )}
                            </button>
                          )}
                        </td>
                      )}

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.product?.images?.[0] && (
                            <Image
                              src={req.product.images[0]}
                              alt={req.productName}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {req.productName}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {req.productSku}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {req.requestedByName}
                      </td>

                      {/* Change */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span className="text-gray-400">
                            {req.currentQty}
                          </span>
                          <span className="text-gray-300 mx-1">→</span>
                          <span className="font-semibold text-gray-900">
                            {req.requestedQty}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px]">
                        <span className="line-clamp-2">
                          {req.reason || "—"}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {SOURCE_LABELS[req.source] || req.source}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}
                        >
                          {req.status === "PENDING" && (
                            <Clock className="w-3 h-3 inline mr-1" />
                          )}
                          {req.status}
                        </span>
                        {req.reviewedByName && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            by {req.reviewedByName}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(req.createdAt)}
                      </td>

                      {/* Actions */}
                      {filters.status === "PENDING" && (
                        <td className="px-4 py-3">
                          {isPending && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={actioning === req.id}
                                title="Approve"
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
                              >
                                {actioning === req.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                disabled={actioning === req.id}
                                title="Reject"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {pagination.total} total · Page {filters.page} of{" "}
              {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= pagination.totalPages}
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
