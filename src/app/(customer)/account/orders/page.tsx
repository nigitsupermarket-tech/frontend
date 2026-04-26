//frontend/src/app/(customer)/account/orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ArrowRight, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Order, Pagination } from "@/types";
import { apiGet } from "@/lib/api";
import {
  formatPrice,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/utils";
import {
  TableRowSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/loading-spinner";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    apiGet<any>("/orders", { page, limit: 10 })
      .then((res) => {
        setOrders(res.data.orders);
        setPagination(res.data.pagination);
      })
      .catch(() => setError("Failed to load orders"))
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div className="container py-10 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">
        Order History
      </h1>

      {error ? (
        <ErrorState message={error} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-14 h-14" />}
          title="No orders yet"
          description="Your orders will appear here once you make a purchase."
          action={
            <Link
              href="/products"
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium"
            >
              Start Shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {order.items?.length || 0} item(s)
                </p>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-brand-700">
                    {formatPrice(order.total)}
                  </span>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
                  >
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-40 hover:border-brand-300 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
