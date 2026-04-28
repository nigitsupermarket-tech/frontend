"use client";
// frontend/src/app/(admin)/admin/shipping/ready/page.tsx
// Dispatch queue: confirmed orders waiting to be shipped

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Truck,
  Search,
  X,
  MapPin,
  Scale,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { apiGet, apiPost, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface ReadyOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: any;
  shippingMethodName?: string;
  shippingType?: string;
  shippingCost: number;
  total: number;
  confirmedAt?: string;
  createdAt: string;
  items: Array<{
    quantity: number;
    productName: string;
    productSku: string;
    netWeight?: string;
  }>;
}

export default function ReadyForShipmentPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ReadyOrder | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
      });
      const res = await apiGet<any>(`/shipping/ready?${params}`);
      setOrders(res.data.orders || []);
      setPagination(res.data.pagination);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/shipping"
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
            <Link href="/admin/shipping" className="hover:text-brand-600">
              Shipping
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Ready to Ship</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orders Ready for Shipment
          </h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} order{pagination.total !== 1 ? "s" : ""}{" "}
              waiting to be dispatched
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order or customer…"
          className="pl-9 pr-4 py-2.5 w-full text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-36 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">
            No orders ready for shipment
          </p>
          <p className="text-sm mt-1">
            Confirm orders first to see them in the dispatch queue
          </p>
          <Link
            href="/admin/orders"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50"
          >
            View Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const addr = order.shippingAddress as any;
            const waitHours = Math.round(
              (Date.now() -
                new Date(order.confirmedAt || order.createdAt).getTime()) /
                (1000 * 60 * 60),
            );

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-5 hover:shadow-sm transition-all ${
                  waitHours > 48
                    ? "border-orange-300 bg-orange-50/30"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-base font-bold text-gray-900 hover:text-brand-600"
                      >
                        {order.orderNumber}
                      </Link>
                      {waitHours > 48 && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">
                          {Math.floor(waitHours / 24)}d waiting
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {waitHours < 24
                          ? `${waitHours}h ago`
                          : `${Math.floor(waitHours / 24)}d ago`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Customer: </span>
                        <span className="font-medium text-gray-800">
                          {order.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {[addr?.address, addr?.city, addr?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {order.items.map((item, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded-lg"
                        >
                          {item.quantity}× {item.productName}
                          {item.netWeight && ` (${item.netWeight})`}
                        </span>
                      ))}
                    </div>

                    {/* Method */}
                    {order.shippingMethodName && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <Truck className="w-3.5 h-3.5" />
                        {order.shippingMethodName}
                        <span className="text-gray-300">·</span>
                        {formatPrice(order.shippingCost)}
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-gray-400">Order total</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDispatchModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                      Dispatch
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page === pagination.totalPages}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedOrder && (
        <DispatchModal
          order={selectedOrder}
          onClose={() => {
            setShowDispatchModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowDispatchModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}

// ── Dispatch Modal ────────────────────────────────────────────────────────────

function DispatchModal({
  order,
  onClose,
  onSuccess,
}: {
  order: ReadyOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDelivery: "",
    weight: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  // Auto-calculate estimated delivery based on shipping type
  const autoEta = () => {
    const days =
      order.shippingType === "STORE_PICKUP"
        ? 1
        : order.shippingMethodName?.toLowerCase().includes("express")
          ? 2
          : order.shippingMethodName?.toLowerCase().includes("ph metro") ||
              order.shippingMethodName?.toLowerCase().includes("port harcourt")
            ? 1
            : 5;
    const d = new Date();
    d.setDate(d.getDate() + days);
    setForm((f) => ({
      ...f,
      estimatedDelivery: d.toISOString().split("T")[0],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiPost("/shipping/shipments", {
        orderId: order.id,
        carrier: form.carrier || undefined,
        trackingNumber: form.trackingNumber || undefined,
        trackingUrl: form.trackingUrl || undefined,
        estimatedDelivery: form.estimatedDelivery || undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        notes: form.notes || undefined,
      });
      toast(`${order.orderNumber} dispatched successfully!`, "success");
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const addr = order.shippingAddress as any;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">
            Dispatch Order — {order.orderNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deliver to</span>
              <span className="font-medium text-right max-w-[60%]">
                {[addr?.address, addr?.city, addr?.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
            {order.shippingMethodName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">{order.shippingMethodName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-medium">{order.items.length} items</span>
            </div>
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <select
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select carrier (optional)</option>
              <option>In-house Rider</option>
              <option>GIG Logistics</option>
              <option>DHL Nigeria</option>
              <option>FedEx Nigeria</option>
              <option>Red Star Express</option>
              <option>NIPOST</option>
              <option>Courier Plus</option>
              <option>ACE Courier</option>
              <option>Other</option>
            </select>
          </div>

          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Number
            </label>
            <p className="text-xs text-gray-400 mb-1.5">
              Leave blank to auto-generate one
            </p>
            <input
              value={form.trackingNumber}
              onChange={(e) =>
                setForm({ ...form, trackingNumber: e.target.value })
              }
              placeholder="Auto-generated if blank"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Tracking URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier Tracking URL (optional)
            </label>
            <input
              value={form.trackingUrl}
              onChange={(e) =>
                setForm({ ...form, trackingUrl: e.target.value })
              }
              placeholder="https://track.carrier.com/…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Estimated Delivery */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Estimated Delivery Date
              </label>
              <button
                type="button"
                onClick={autoEta}
                className="text-xs text-brand-600 hover:underline"
              >
                Auto-estimate
              </button>
            </div>
            <input
              type="date"
              value={form.estimatedDelivery}
              onChange={(e) =>
                setForm({ ...form, estimatedDelivery: e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Package Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Package Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="e.g. 2.5"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Any dispatch notes"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            {loading ? "Dispatching…" : "Confirm Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}
