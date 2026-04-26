"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Truck,
  Plus,
  Package,
  Clock,
} from "lucide-react";
import { Order } from "@/types";
import { apiGet, apiPut, apiPost, getApiError } from "@/lib/api";
import {
  formatPrice,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  getProductImage,
} from "@/lib/utils";
import { PageLoader, ErrorState } from "@/components/shared/loading-spinner";
import { useToast } from "@/store/uiStore";
import Image from "next/image";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const QUICK_PRESETS = [
  { status: "Order Placed", message: "Your order has been received." },
  {
    status: "Packed",
    message: "Your order has been packed and is ready for dispatch.",
  },
  {
    status: "Dispatched",
    message: "Your order has been dispatched from our warehouse.",
  },
  { status: "In Transit", message: "Your package is in transit." },
  {
    status: "Out for Delivery",
    message: "Your package is out for delivery today.",
  },
  {
    status: "Delivered",
    message: "Your order has been delivered. Thank you for shopping with us!",
  },
];

interface TrackingUpdate {
  id: string;
  status: string;
  message: string;
  location?: string;
  timestamp: string;
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    status: "",
    message: "",
    location: "",
  });
  const [addingTracking, setAddingTracking] = useState(false);
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const toast = useToast();

  const loadOrder = () => {
    setIsLoading(true);
    Promise.all([
      apiGet<any>(`/orders/${id}`),
      apiGet<any>(`/orders/${id}/tracking`).catch(() => ({
        data: { order: { trackingUpdates: [] } },
      })),
    ])
      .then(([oRes, tRes]) => {
        const o = oRes.data.order;
        setOrder(o);
        setNewStatus(o.status);
        setTrackingNumber(o.trackingNumber || "");
        setTrackingUrl(o.trackingUrl || "");
        setTrackingUpdates(tRes.data.order?.trackingUpdates || []);
      })
      .catch(() => setError("Order not found"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const updateStatus = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      await apiPut(`/orders/${id}/status`, {
        status: newStatus,
        notes: statusNotes || undefined,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
      });
      toast("Order updated", "success");
      setStatusNotes("");
      loadOrder();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setUpdating(false);
    }
  };

  const addTrackingUpdate = async () => {
    if (!trackingForm.status || !trackingForm.message) {
      toast("Status and message required", "error");
      return;
    }
    setAddingTracking(true);
    try {
      await apiPost(`/orders/${id}/tracking`, trackingForm);
      toast("Tracking event added", "success");
      setTrackingForm({ status: "", message: "", location: "" });
      loadOrder();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setAddingTracking(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (error || !order)
    return (
      <div className="p-6">
        <ErrorState message={error || "Not found"} />
      </div>
    );

  const inp =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-500";

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}
          >
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <Image
                    src={getProductImage(item.product.images)}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                    width={48}
                    height={48}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm line-clamp-1">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      SKU: {item.product.sku} · Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
                <span>Total</span>
                <span className="text-green-700">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Status update */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Update Order Status
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className={inp + " bg-white"}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_LABELS[s] || s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tracking Number
                </label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG12345"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tracking URL
                </label>
                <input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <input
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className={inp}
                />
              </div>
            </div>
            <button
              onClick={updateStatus}
              disabled={updating || newStatus === order.status}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-60"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />} Update
              Order
            </button>
          </div>

          {/* Tracking updates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-600" /> Shipment Tracking
              Events
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Visible to the customer on their order tracking page
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <p className="text-xs font-semibold text-gray-700">
                Add Tracking Event
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Status *
                  </label>
                  <input
                    value={trackingForm.status}
                    onChange={(e) =>
                      setTrackingForm((p) => ({ ...p, status: e.target.value }))
                    }
                    placeholder="e.g. In Transit"
                    className={inp + " text-xs"}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Location
                  </label>
                  <input
                    value={trackingForm.location}
                    onChange={(e) =>
                      setTrackingForm((p) => ({
                        ...p,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g. PH Sorting Hub"
                    className={inp + " text-xs"}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Message *
                  </label>
                  <input
                    value={trackingForm.message}
                    onChange={(e) =>
                      setTrackingForm((p) => ({
                        ...p,
                        message: e.target.value,
                      }))
                    }
                    placeholder="Description shown to customer"
                    className={inp + " text-xs"}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.status}
                    onClick={() =>
                      setTrackingForm((f) => ({
                        ...f,
                        status: p.status,
                        message: p.message,
                      }))
                    }
                    className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded hover:border-green-400 hover:text-green-700 text-gray-600"
                  >
                    {p.status}
                  </button>
                ))}
              </div>
              <button
                onClick={addTrackingUpdate}
                disabled={addingTracking}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {addingTracking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}{" "}
                Add Event
              </button>
            </div>

            {trackingUpdates.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                No events yet
              </div>
            ) : (
              <div className="space-y-4">
                {trackingUpdates.map((u, i) => (
                  <div key={u.id} className="flex gap-3 relative">
                    {i < trackingUpdates.length - 1 && (
                      <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-green-600" : "bg-gray-200"}`}
                    >
                      <Truck
                        className={`w-3.5 h-3.5 ${i === 0 ? "text-white" : "text-gray-500"}`}
                      />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-semibold ${i === 0 ? "text-green-700" : "text-gray-800"}`}
                        >
                          {u.status}
                        </p>
                        <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(u.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {u.message}
                      </p>
                      {u.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {u.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                Status History
              </h2>
              <div className="space-y-3">
                {order.statusHistory.map((h: any) => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {ORDER_STATUS_LABELS[h.status] || h.status}
                      </p>
                      {h.notes && (
                        <p className="text-gray-500 text-xs">{h.notes}</p>
                      )}
                      <p className="text-gray-400 text-xs">
                        {formatDateTime(h.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <p className="font-medium text-gray-900 text-sm">
              {order.customerName}
            </p>
            <p className="text-xs text-gray-500">{order.customerEmail}</p>
            {order.customerPhone && (
              <p className="text-xs text-gray-500">{order.customerPhone}</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              Shipping Address
            </h2>
            <address className="not-italic text-sm text-gray-600 space-y-0.5">
              <p className="font-medium">
                {(order.shippingAddress as any)?.fullName ||
                  `${(order.shippingAddress as any)?.firstName || ""} ${(order.shippingAddress as any)?.lastName || ""}`.trim()}
              </p>
              <p>
                {(order.shippingAddress as any)?.address ||
                  (order.shippingAddress as any)?.addressLine1}
              </p>
              {(order.shippingAddress as any)?.lga && (
                <p>{(order.shippingAddress as any).lga}</p>
              )}
              <p>
                {(order.shippingAddress as any)?.city},{" "}
                {(order.shippingAddress as any)?.state}
              </p>
              <p className="mt-1">{(order.shippingAddress as any)?.phone}</p>
            </address>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
            <div className="text-sm space-y-1">
              <p className="text-gray-600">
                Method:{" "}
                <span className="font-medium text-gray-900">
                  {order.paymentMethod}
                </span>
              </p>
              {order.paymentReference && (
                <p className="text-gray-600">
                  Ref:{" "}
                  <span className="font-mono text-xs">
                    {order.paymentReference}
                  </span>
                </p>
              )}
            </div>
          </div>
          {(order.trackingNumber || order.trackingUrl) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-green-600" /> Tracking
              </h2>
              {order.trackingNumber && (
                <p className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded mb-2">
                  {order.trackingNumber}
                </p>
              )}
              {order.trackingUrl && (
                <Link
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline"
                >
                  Track with carrier →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
