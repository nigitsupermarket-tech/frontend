"use client";
// frontend/src/app/(admin)/admin/shipping/shipments/page.tsx
// Manage active shipments — create, track, update status

import { useState, useEffect, useCallback, Suspense } from "react";
import {
  Truck,
  Search,
  Plus,
  Package,
  CheckCircle,
  Zap,
  MapPin,
  Clock,
  ExternalLink,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { apiGet, apiPost, apiPut, getApiError } from "@/lib/api";
import { useToast } from "@/store/uiStore";
import { formatPrice, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Shipment {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: any;
  shippingMethodName?: string;
  shippingType?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  total: number;
  shippingCost: number;
  isPickup: boolean;
  trackingUpdates: Array<{ status: string; timestamp: string }>;
  items: Array<{ quantity: number; productName: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { value: "ALL", label: "All Shipments", icon: Truck },
  { value: "SHIPPED", label: "In Transit", icon: Truck },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Zap },
  { value: "DELIVERED", label: "Delivered", icon: CheckCircle },
];

const STATUS_STYLE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  SHIPPED: { label: "In Transit", color: "text-blue-700", bg: "bg-blue-50" },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
  DELIVERED: { label: "Delivered", color: "text-green-700", bg: "bg-green-50" },
  CONFIRMED: {
    label: "Ready to Ship",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
};

// ── Reads searchParams — must live inside <Suspense> ─────────────────────────
function ShipmentsPageInner() {
  const searchParams = useSearchParams();
  return (
    <ShipmentsContent initialStatus={searchParams.get("status") || "ALL"} />
  );
}

// ── Default export: wraps the inner component in Suspense ────────────────────
export default function ShipmentsPage() {
  return (
    <Suspense fallback={<ShipmentsSkeleton />}>
      <ShipmentsPageInner />
    </Suspense>
  );
}

// ── Skeleton shown while Suspense resolves ───────────────────────────────────
function ShipmentsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-10 w-96 bg-gray-100 rounded-xl animate-pulse" />
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <Truck className="w-8 h-8 mx-auto mb-2 animate-pulse opacity-30" />
        <p className="text-gray-400">Loading shipments…</p>
      </div>
    </div>
  );
}

// ── All the real page logic lives here ───────────────────────────────────────
function ShipmentsContent({ initialStatus }: { initialStatus: string }) {
  const toast = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(activeTab !== "ALL" && { status: activeTab }),
      });
      const res = await apiGet<any>(`/shipping/shipments?${params}`);
      setShipments(res.data.shipments || []);
      setPagination(res.data.pagination);
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, activeTab]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab]);

  const handleMarkOutForDelivery = async (shipment: Shipment) => {
    if (!confirm(`Mark "${shipment.orderNumber}" as Out for Delivery?`)) return;
    try {
      await apiPut(`/shipping/shipments/${shipment.id}/out-for-delivery`, {});
      toast("Marked as Out for Delivery", "success");
      fetchShipments();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  const handleMarkDelivered = async (shipment: Shipment) => {
    if (!confirm(`Mark "${shipment.orderNumber}" as Delivered?`)) return;
    try {
      await apiPut(`/shipping/shipments/${shipment.id}/delivered`, {});
      toast("Marked as Delivered", "success");
      fetchShipments();
    } catch (err) {
      toast(getApiError(err), "error");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/shipping" className="hover:text-brand-600">
              Shipping
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Shipments</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        </div>
        <Link
          href="/admin/shipping/ready"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Shipment
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order, tracking, customer…"
          className="pl-9 pr-4 py-2.5 w-full text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <Truck className="w-8 h-8 mx-auto mb-2 animate-pulse opacity-40" />
            <p>Loading shipments…</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No shipments found</p>
            <p className="text-sm mt-1">
              {activeTab !== "ALL"
                ? "Try a different filter"
                : "Dispatch confirmed orders to see them here"}
            </p>
            <Link
              href="/admin/shipping/ready"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50"
            >
              <Truck className="w-4 h-4" />
              Dispatch Orders
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Order
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Customer / Destination
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Tracking
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      ETA
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shipments.map((s) => {
                    const addr = s.shippingAddress as any;
                    const cfg = STATUS_STYLE[s.status] || {
                      label: s.status,
                      color: "text-gray-700",
                      bg: "bg-gray-50",
                    };
                    const latestEvent = s.trackingUpdates?.[0];

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <Link
                            href={`/admin/orders/${s.id}`}
                            className="font-semibold text-gray-900 hover:text-brand-600"
                          >
                            {s.orderNumber}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {s.items
                              ?.slice(0, 2)
                              .map((i) => `${i.quantity}× ${i.productName}`)
                              .join(", ")}
                            {(s.items?.length || 0) > 2 &&
                              ` +${s.items.length - 2} more`}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-gray-900">
                            {s.customerName}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {[addr?.city, addr?.state]
                              .filter(Boolean)
                              .join(", ") || "Nigeria"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          {latestEvent && (
                            <p className="text-xs text-gray-400 mt-1 max-w-[160px] truncate">
                              {latestEvent.status}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {s.trackingNumber ? (
                            <div>
                              <p className="font-mono text-xs text-gray-700">
                                {s.trackingNumber}
                              </p>
                              {s.trackingUrl && (
                                <a
                                  href={s.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-0.5"
                                >
                                  Track <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {s.deliveredAt ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              {new Date(s.deliveredAt).toLocaleDateString(
                                "en-NG",
                                { day: "numeric", month: "short" },
                              )}
                            </div>
                          ) : s.estimatedDelivery ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {new Date(s.estimatedDelivery).toLocaleDateString(
                                "en-NG",
                                { day: "numeric", month: "short" },
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedShipment(s);
                                setShowTrackingModal(true);
                              }}
                              title="Update tracking info"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShipment(s);
                                setShowEventModal(true);
                              }}
                              title="Add tracking event"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                            </button>
                            {s.status === "SHIPPED" && (
                              <button
                                onClick={() => handleMarkOutForDelivery(s)}
                                title="Mark out for delivery"
                                className="px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                              >
                                Out for delivery
                              </button>
                            )}
                            {["SHIPPED", "OUT_FOR_DELIVERY"].includes(
                              s.status,
                            ) && (
                              <button
                                onClick={() => handleMarkDelivered(s)}
                                title="Mark as delivered"
                                className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                              >
                                Delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page === pagination.totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showTrackingModal && selectedShipment && (
        <UpdateTrackingModal
          shipment={selectedShipment}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedShipment(null);
          }}
          onSuccess={() => {
            setShowTrackingModal(false);
            setSelectedShipment(null);
            fetchShipments();
          }}
        />
      )}
      {showEventModal && selectedShipment && (
        <AddTrackingEventModal
          shipment={selectedShipment}
          onClose={() => {
            setShowEventModal(false);
            setSelectedShipment(null);
          }}
          onSuccess={() => {
            setShowEventModal(false);
            setSelectedShipment(null);
            fetchShipments();
          }}
        />
      )}
    </div>
  );
}

// ── Update Tracking Modal ─────────────────────────────────────────────────────

function UpdateTrackingModal({
  shipment,
  onClose,
  onSuccess,
}: {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    trackingNumber: shipment.trackingNumber || "",
    trackingUrl: shipment.trackingUrl || "",
    carrier: "",
    estimatedDelivery: shipment.estimatedDelivery
      ? new Date(shipment.estimatedDelivery).toISOString().split("T")[0]
      : "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiPut(`/shipping/orders/${shipment.id}/tracking`, form);
      toast("Tracking updated", "success");
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Update Tracking Info</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Order: <strong>{shipment.orderNumber}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Number
            </label>
            <input
              value={form.trackingNumber}
              onChange={(e) =>
                setForm({ ...form, trackingNumber: e.target.value })
              }
              placeholder="e.g. NGT12345678"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <select
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select carrier</option>
              <option>DHL Nigeria</option>
              <option>FedEx</option>
              <option>GIG Logistics</option>
              <option>Red Star Express</option>
              <option>NIPOST</option>
              <option>Courier Plus</option>
              <option>ACE Courier</option>
              <option>In-house Rider</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tracking URL
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Delivery
            </label>
            <input
              type="date"
              value={form.estimatedDelivery}
              onChange={(e) =>
                setForm({ ...form, estimatedDelivery: e.target.value })
              }
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this update"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Tracking Event Modal ──────────────────────────────────────────────────

const QUICK_EVENTS = [
  {
    status: "Shipment Dispatched",
    message: "Your order has been dispatched from our facility",
  },
  { status: "In Transit", message: "Your order is on its way to you" },
  {
    status: "Arrived at Hub",
    message: "Your order has arrived at the delivery hub",
  },
  {
    status: "Out for Delivery",
    message: "Your order is out for delivery today",
  },
  {
    status: "Delivery Attempted",
    message: "Delivery was attempted. We will try again",
  },
  {
    status: "Delivered",
    message: "Your order has been delivered successfully",
  },
];

function AddTrackingEventModal({
  shipment,
  onClose,
  onSuccess,
}: {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ status: "", message: "", location: "" });
  const [loading, setLoading] = useState(false);

  const handleQuickFill = (event: (typeof QUICK_EVENTS)[0]) => {
    setForm({ ...form, status: event.status, message: event.message });
  };

  const handleSubmit = async () => {
    if (!form.status || !form.message) {
      toast("Status and message are required", "error");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/shipping/tracking/events", {
        orderId: shipment.id,
        ...form,
      });
      toast("Tracking event added", "success");
      onSuccess();
    } catch (err) {
      toast(getApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">Add Tracking Event</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Order: <strong>{shipment.orderNumber}</strong> ·{" "}
            {shipment.customerName}
          </p>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Quick Events
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_EVENTS.map((ev) => (
                <button
                  key={ev.status}
                  onClick={() => handleQuickFill(ev)}
                  className={`text-left px-3 py-2 rounded-xl text-xs border transition-all ${
                    form.status === ev.status
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  {ev.status}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              placeholder="e.g. In Transit, Out for Delivery"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={2}
              placeholder="Message shown to customer"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (optional)
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Dispatch Hub, Port Harcourt"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="flex-1 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Adding…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
