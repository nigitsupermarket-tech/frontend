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
  CheckCircle,
  Building2,
  ImageIcon,
  Printer,
  Send,
  Bell,
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
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
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
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [addingTracking, setAddingTracking] = useState(false);
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const toast = useToast();
  const { user } = useAuth();
  // ACCOUNTANT has view-only access to orders — no status updates,
  // tracking events, or payment confirmation.
  const canProcess = user?.role !== "ACCOUNTANT";
  const { settings } = useSettings();
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [notifying, setNotifying] = useState(false);

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

  const handleConfirmBankTransfer = async () => {
    if (!order) return;
    if (!confirm("Confirm that you have received this bank transfer payment?"))
      return;
    setConfirmingPayment(true);
    try {
      await apiPost("/payment/bank-transfer/confirm", { orderId: order.id });
      toast("Payment confirmed. Order is now CONFIRMED.", "success");
      loadOrder(); // refresh
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setConfirmingPayment(false);
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

  const sendInvoice = async () => {
    if (!order) return;
    setSendingInvoice(true);
    try {
      await apiPost(`/orders/${id}/send-invoice`, {});
      toast("Invoice sent to customer", "success");
      loadOrder();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setSendingInvoice(false);
    }
  };

  const notifyCustomer = async () => {
    if (!order) return;
    setNotifying(true);
    try {
      await apiPost(`/orders/${id}/notify-status`, {});
      toast("Customer notified", "success");
      loadOrder();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setNotifying(false);
    }
  };

  // ── Print invoice using an iframe — same technique AND same 80mm
  // receipt paper size as the POS printer (see pos/page.tsx), so both
  // print jobs come out on identical stock. The "ONLINE ORDER" badge in
  // the markup below is what tells the two apart at a glance. Opens the
  // browser print dialog, which staff can "Save as PDF" from. ──────────────
  const printInvoice = () => {
    const el = document.getElementById("invoice-content");
    if (!el) return;

    const existing = document.getElementById("order-invoice-print-frame");
    if (existing) existing.remove();

    const html = `
      <!DOCTYPE html><html><head>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px;
               width: 72mm; margin: 0 auto; padding: 4mm 2mm; line-height: 1.5;
               color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .text-center, .center { text-align: center; }
        .font-bold, .bold, b, strong { font-weight: 900; }
        .text-gray-400, .text-gray-500, .text-gray-600 { color: #000; }
        .border-t { border-top: 1px dashed #000; margin: 3mm 0; }
        .border-dashed { border-style: dashed; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .space-y-1 > * { margin-bottom: 1mm; }
        .text-base { font-size: 13px; font-weight: 700; }
        .text-2xl, .text-xl { font-size: 15px; font-weight: 900; }
        .text-xs { font-size: 11px; }
        .my-2, .mb-3, .mt-3 { margin: 2mm 0; }
        .pt-1, .pt-2 { padding-top: 1mm; }
        * { letter-spacing: 0.01em; }
        /* ── Online-order badge — visually distinguishes this from a POS
           in-store receipt at a glance ── */
        .online-badge { display: inline-block; border: 1px solid #000; padding: 1mm 3mm;
                        font-weight: 900; letter-spacing: 0.1em; margin: 1mm 0; }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.id = "order-invoice-print-frame";
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:80mm;height:297mm;border:none;";

    const cleanup = () => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (_) {
        /* ignore */
      }
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {
        /* ignore */
      }
    };

    iframe.onload = () => {
      setTimeout(() => {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          return;
        }
        win.focus();
        win.addEventListener("afterprint", cleanup, { once: true });
        win.print();
        setTimeout(cleanup, 30_000);
      }, 300);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
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
        <div className="flex gap-2 items-center">
          <button
            onClick={printInvoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" /> Print Invoice
          </button>
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
            {!canProcess ? (
              <p className="text-xs text-gray-400 italic">
                Your role has view-only access to orders. Contact an admin,
                manager, or staff member to update this order.
              </p>
            ) : (
              <>
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
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Update Order
                </button>
              </>
            )}
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

            {canProcess && (
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
                        setTrackingForm((p) => ({
                          ...p,
                          status: e.target.value,
                        }))
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
            )}

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
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" /> Payment
            </h2>
            <div className="text-sm space-y-1.5">
              <p className="text-gray-600">
                Method:{" "}
                <span className="font-medium text-gray-900">
                  {order.paymentMethod === "BANK_TRANSFER"
                    ? "Bank Transfer"
                    : order.paymentMethod}
                </span>
              </p>
              <p className="text-gray-600">
                Status:{" "}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}
                >
                  {order.paymentStatus === "AWAITING_PROOF"
                    ? "Awaiting Review"
                    : order.paymentStatus}
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
              {order.paidAt && (
                <p className="text-gray-600">
                  Paid at:{" "}
                  <span className="font-medium text-gray-900">
                    {formatDateTime(order.paidAt)}
                  </span>
                </p>
              )}
            </div>

            {/* ── Proof of payment — only for bank transfer orders ── */}
            {order.paymentMethod === "BANK_TRANSFER" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {(order as any).proofOfPaymentUrl ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-green-600" />
                      Customer Proof of Payment
                    </p>
                    <a
                      href={(order as any).proofOfPaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-gray-200 mb-3 hover:opacity-90 transition-opacity"
                    >
                      <Image
                        src={(order as any).proofOfPaymentUrl}
                        alt="Proof of payment"
                        width={300}
                        height={200}
                        className="w-full object-cover max-h-48"
                      />
                    </a>
                    {(order as any).proofSubmittedAt && (
                      <p className="text-xs text-gray-400 mb-3">
                        Submitted:{" "}
                        {formatDateTime((order as any).proofSubmittedAt)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-3">
                    No proof of payment uploaded yet.
                  </p>
                )}

                {/* Confirm button — only show if not yet paid, and never to view-only roles */}
                {order.paymentStatus !== "PAID" && canProcess && (
                  <button
                    onClick={handleConfirmBankTransfer}
                    disabled={confirmingPayment}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {confirmingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Confirm Payment
                        Received
                      </>
                    )}
                  </button>
                )}

                {order.paymentStatus === "PAID" && (
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Payment confirmed
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer notifications — manual invoice/status-email triggers.
              Auto-sends still happen in the background if a super admin has
              turned that on in Settings → Notifications. */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-600" /> Customer Notifications
            </h2>
            <div className="text-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-gray-700 font-medium">Invoice email</p>
                  <p className="text-xs text-gray-400">
                    {order.invoiceEmailSent
                      ? "Sent to customer"
                      : "Not sent yet"}
                  </p>
                </div>
                {canProcess && (
                  <button
                    onClick={sendInvoice}
                    disabled={sendingInvoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                  >
                    {sendingInvoice ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {order.invoiceEmailSent ? "Resend" : "Send"}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-gray-700 font-medium">Status update</p>
                  <p className="text-xs text-gray-400">
                    {order.lastStatusEmailAt
                      ? `Last notified ${formatDateTime(order.lastStatusEmailAt)}`
                      : "Customer not notified yet"}
                  </p>
                </div>
                {canProcess && (
                  <button
                    onClick={notifyCustomer}
                    disabled={notifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0"
                  >
                    {notifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                    Notify
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 pt-1">
                Automatic sending is controlled by a super admin under Settings
                → Notifications.
              </p>
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

      {/* Hidden invoice markup — read by printInvoice() via innerHTML.
          Same 80mm receipt paper size as the POS printer, with an
          "ONLINE ORDER" badge so the two are never confused at a glance. */}
      <div id="invoice-content" className="hidden font-mono text-xs">
        <div className="text-center mb-3">
          <p className="font-bold text-base">
            {settings?.siteName || "NigitTriple Supermarket"}
          </p>
          {settings?.address && (
            <p className="text-gray-500">{settings.address}</p>
          )}
          {settings?.phone && (
            <p className="text-gray-500">Tel: {settings.phone}</p>
          )}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <span className="online-badge">ONLINE ORDER</span>
          <p className="text-gray-600 mt-1">Order #{order.orderNumber}</p>
          <p className="text-gray-600">{formatDateTime(order.createdAt)}</p>
          <p className="text-gray-600">Customer: {order.customerName}</p>
          {order.customerPhone && (
            <p className="text-gray-600">Phone: {order.customerPhone}</p>
          )}
          <div className="border-t border-dashed border-gray-300 my-2" />
        </div>

        <div className="space-y-1 mb-3">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.product.name} x{item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <p className="text-gray-600">
          Payment:{" "}
          {order.paymentMethod === "BANK_TRANSFER"
            ? "Bank Transfer"
            : order.paymentMethod}{" "}
          ({order.paymentStatus})
        </p>
        <p className="text-gray-600">
          Status: {ORDER_STATUS_LABELS[order.status] || order.status}
        </p>
        {!order.isPickup && (
          <>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <p className="text-gray-600 font-bold">Ship to:</p>
            <p className="text-gray-600">
              {(order.shippingAddress as any)?.fullName ||
                `${(order.shippingAddress as any)?.firstName || ""} ${(order.shippingAddress as any)?.lastName || ""}`.trim()}
            </p>
            <p className="text-gray-600">
              {(order.shippingAddress as any)?.address ||
                (order.shippingAddress as any)?.addressLine1}
            </p>
            <p className="text-gray-600">
              {(order.shippingAddress as any)?.city},{" "}
              {(order.shippingAddress as any)?.state}
            </p>
          </>
        )}

        <div className="border-t border-dashed border-gray-300 my-2" />
        <p className="text-center text-gray-500 mt-2">
          Thank you for shopping with us!
        </p>
      </div>
    </div>
  );
}
