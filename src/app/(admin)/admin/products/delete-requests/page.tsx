"use client";
// frontend/src/app/(admin)/admin/products/delete-requests/page.tsx
//
// Admin-only queue of product hard-delete requests submitted by non-admin
// staff (STAFF/MANAGER). Hard-deleting a product is restricted to admins —
// everyone else has to request approval from this queue instead of being
// able to delete directly (see product.controller.ts requestProductDelete /
// approveProductDeleteRequest / rejectProductDeleteRequest).

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { apiGet, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/utils";

interface RelatedRecords {
  reviews: number;
  orderItems: number;
  posOrderItems: number;
  cartItems: number;
  wishlistItems: number;
  inventoryLogs: number;
  stockApprovals: number;
  variations: number;
  hasOrderHistory: boolean;
}

interface DeleteRequest {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  requestedByName: string;
  requestedByRole: string;
  reason: string;
  relatedRecords?: RelatedRecords | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

const STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const RELATED_LABELS: Record<keyof RelatedRecords, string> = {
  reviews: "Reviews",
  orderItems: "Order line items",
  posOrderItems: "POS order line items",
  cartItems: "Cart items",
  wishlistItems: "Wishlist items",
  inventoryLogs: "Inventory logs",
  stockApprovals: "Stock approvals",
  variations: "Variations",
  hasOrderHistory: "",
};

function RelatedRecordsSummary({ r }: { r?: RelatedRecords | null }) {
  if (!r) return null;
  const rows = (Object.keys(RELATED_LABELS) as (keyof RelatedRecords)[])
    .filter((k) => k !== "hasOrderHistory")
    .map((k) => [RELATED_LABELS[k], Number(r[k] || 0)] as [string, number])
    .filter(([, count]) => count > 0);

  if (rows.length === 0) {
    return (
      <p className="text-xs text-green-700 mt-2">
        No related records at time of request.
      </p>
    );
  }

  return (
    <div className="mt-2 text-xs text-gray-700">
      <p className="font-semibold text-gray-500 mb-1">Related records</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map(([label, count]) => (
          <li key={label} className="flex justify-between">
            <span>{label}</span>
            <span className="font-semibold">{count}</span>
          </li>
        ))}
      </ul>
      {r.hasOrderHistory && (
        <p className="text-red-700 font-medium mt-1.5">
          ⚠️ Has order history — those records will lose their live product
          link but keep their own name/SKU snapshot.
        </p>
      )}
    </div>
  );
}

export default function ProductDeleteRequestsPage() {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);

  const toast = useToast();
  const { user } = useAuthStore();
  const router = useRouter();

  // Admin-exclusive — everyone else gets bounced back to the dashboard.
  const canView = user?.role === "ADMIN";

  useEffect(() => {
    if (user && !canView) router.replace("/admin/dashboard");
  }, [user]);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const res = await apiGet<any>("/products/delete-requests", params);
      setRequests(res.data.requests);
      setPagination(res.data.pagination);
    } catch {
      toast("Failed to load delete requests", "error");
    } finally {
      setIsLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    if (canView) fetchRequests();
  }, [canView, fetchRequests]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await apiPut(`/products/delete-requests/${id}/approve`, {
        reviewNote: noteDrafts[id] || undefined,
      });
      toast("Delete request approved — product permanently deleted", "success");
      fetchRequests();
      window.dispatchEvent(new Event("pending-counts:refresh"));
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await apiPut(`/products/delete-requests/${id}/reject`, {
        reviewNote: noteDrafts[id] || undefined,
      });
      toast("Delete request rejected", "success");
      fetchRequests();
      window.dispatchEvent(new Event("pending-counts:refresh"));
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setActioning(null);
    }
  };

  if (!canView) return null;

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Product Delete Requests
          </h1>
          <p className="text-sm text-gray-500">
            Staff/manager requests to permanently delete a product — review
            the related records, then approve or reject.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests()}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((s) => (
          <button
            key={s || "ALL"}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              status === s
                ? "bg-gray-900 text-white border-gray-900"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No {status ? status.toLowerCase() : ""} delete requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/products/${r.productId}`}
                    className="font-semibold text-gray-900 hover:underline"
                  >
                    {r.productName}
                  </Link>
                  <p className="text-xs text-gray-500">
                    SKU {r.productSku} · Requested by{" "}
                    <span className="font-medium">{r.requestedByName}</span>{" "}
                    ({r.requestedByRole}) · {formatDate(r.createdAt)}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}
                >
                  {r.status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Reason given
                </p>
                <p className="text-gray-800">{r.reason}</p>
                <RelatedRecordsSummary r={r.relatedRecords} />
              </div>

              {r.status === "PENDING" ? (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="Optional note to the requester..."
                    value={noteDrafts[r.id] || ""}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    className="w-full border border-gray-200 px-3 py-2 text-sm rounded-lg focus:outline-none focus:border-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actioning === r.id}
                      onClick={() => handleApprove(r.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actioning === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve &amp; Delete
                    </button>
                    <button
                      type="button"
                      disabled={actioning === r.id}
                      onClick={() => handleReject(r.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-300 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <Clock className="w-3.5 h-3.5" />
                  Reviewed by {r.reviewedByName || "—"} on{" "}
                  {r.reviewedAt ? formatDate(r.reviewedAt) : "—"}
                  {r.reviewNote && (
                    <span className="italic">— &ldquo;{r.reviewNote}&rdquo;</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
