"use client";

import { useState, useEffect } from "react";
import { Star, Check, X } from "lucide-react";
import { Review } from "@/types";
import { apiGet, apiPut, apiDelete, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatDateTime } from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
} from "@/components/shared/loading-spinner";
import Image from "next/image";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const toast = useToast();

  const fetch = async () => {
    setIsLoading(true);
    try {
      const url = filter === "pending" ? "/reviews/pending" : "/reviews";
      const res = await apiGet<any>(url);
      setReviews(res.data.reviews);
    } catch {
      toast("Failed to load", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [filter]);

  const approve = async (id: string) => {
    try {
      await apiPut(`/reviews/${id}/approve`, {});
      toast("Review approved", "success");
      fetch();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await apiDelete(`/reviews/${id}`);
      toast("Deleted", "success");
      fetch();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Product Reviews</h1>
        <div className="flex gap-2">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? "bg-brand-600 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-300"}`}
            >
              {f === "pending" ? "Pending Approval" : "All Reviews"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {["Customer", "Rating", "Comment", "Date", "Verified", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase"
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
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title={
                      filter === "pending"
                        ? "No pending reviews"
                        : "No reviews yet"
                    }
                  />
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.user?.image ? (
                        <Image
                          src={r.user.image}
                          className="w-7 h-7 rounded-full object-cover"
                          alt=""
                          width={28}
                          height={28}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                          {r.user?.name?.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {r.user?.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < r.rating ? "fill-gold-400 text-gold-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="line-clamp-2 text-xs">
                      {r.comment || (
                        <span className="italic text-gray-400">No comment</span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {r.isVerified ? (
                      <span className="text-green-600 text-xs font-medium">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!r.isApproved && (
                        <button
                          onClick={() => approve(r.id)}
                          title="Approve"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
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
